import jwt from "jsonwebtoken";
import cookie from "cookie";
import { User } from "../models/user.model.js";
import { createMessage, markMessageDelivered, markMessagesSeen  } from "../utils/chatServiceClient.js";
import { createNotification } from "../utils/notificationServiceClient.js";

// TEMPORARY dual-auth — cookie preferred, bearer fallback until frontend
// fully migrates to cookie-based socket auth. Remove bearer branch later.
const extractToken = (socket) => {
    const cookieHeader = socket.handshake.headers.cookie;
    if (cookieHeader) {
        const cookies = cookie.parse(cookieHeader);
        if (cookies.accessToken) return cookies.accessToken;
    }
    if (socket.handshake.auth?.token) {
        return socket.handshake.auth.token; // TEMP
    }
    return null;
};

export const gatewaySocketHandler = (io) => {
    io.use(async (socket, next) => {
        try {
            const token = extractToken(socket);
            if (!token) return next(new Error("Unauthorized: token missing"));

            const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            const user = await User.findById(decoded?._id).select("-password -refreshToken");

            if (!user) return next(new Error("Unauthorized: invalid user"));

            socket.data = { user };
            next();
        } catch (error) {
            console.log("Socket auth error:", error);
            next(new Error("Unauthorized: invalid or expired token"));
        }
    });

    io.on("connection", (socket) => {
        const userId = socket.data.user._id.toString();
        socket.join(userId);
        console.log(`User-${userId} connected via gateway socket`);

        // ---------------- CHAT EVENTS ----------------
        socket.on("sendMessage", async ({ receiverId, message }) => {
        try {
            if (!receiverId || !message) {
                return socket.emit("error", "Invalid message payload");
            }

            // Step 1: Message save karo chat-service mein
            const newMsg = await createMessage({ senderId: userId, receiverId, message });

            // Step 2: Dono users ko real-time "newMessage" emit karo
            io.to(userId).emit("newMessage", newMsg);
            io.to(receiverId.toString()).emit("newMessage", newMsg);

            // Step 3: Receiver ke liye notification banao
            // 🆕 notification-service ko call karo — wo DB mein save karega
            const notification = await createNotification({
                userId: receiverId,          // jisko notification milegi
                message: `New message from user-${userId}`,
                type: "info",
                metadata: {
                    senderId: userId,
                    receiverId,
                    messageId: newMsg._id
                }
            });

            // Step 4: Receiver ko real-time notification bhi push karo
            // 🆕 Same socket connection se — alag connection ki zaroorat nahi
            io.to(receiverId.toString()).emit("newNotification", notification);

        } catch (error) {
            console.log("sendMessage error:", error);
            socket.emit("error", "Failed to send message");
        }
        });

        socket.on("messageDelivered", async (messageId) => {
            try {
                const updated = await markMessageDelivered(messageId);
                if (updated?.senderId) {
                    io.to(updated.senderId.toString()).emit("messageStatusUpdate", {
                        messageId,
                        status: "delivered",
                    });
                }
            } catch (error) {
                console.log("messageDelivered error:", error);
                socket.emit("error", "Failed to mark message as delivered");
            }
        });

        socket.on("messageSeen", async ({ messageIds }) => {
            try {
                const updatedMessages = await markMessagesSeen(messageIds, userId);
                for (const msg of updatedMessages) {
                    io.to(msg.senderId.toString()).emit("messageSeenUpdate", {
                        messageId: msg._id,
                    });
                }
            } catch (error) {
                console.log("messageSeen error:", error);
                socket.emit("error", "Failed to mark message as seen");
            }
        });

        socket.on("typing", ({ toUserId }) => {
            io.to(toUserId.toString()).emit("typing", { from: userId });
        });

        socket.on("stopTyping", ({ toUserId }) => {
            io.to(toUserId.toString()).emit("stopTyping", { from: userId });
        });

        socket.on("disconnect", () => {
            console.log(`User-${userId} disconnected`);
        });
    });
};