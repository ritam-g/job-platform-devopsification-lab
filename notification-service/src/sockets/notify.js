import jwt from "jsonwebtoken";
import cookie from "cookie";
import { Notification } from "../models/notification.model.js";
import { createMessage, markMessageDelivered, markMessagesSeen } from "../utils/chatServiceClient.js";

// TEMPORARY dual-auth extractor — cookie (existing notification flow)
// OR bearer token (existing chat flow). Remove bearer fallback once
// frontend migrates fully to cookie-based socket auth.
const extractToken = (socket) => {
    const cookieHeader = socket.handshake.headers.cookie;
    if (cookieHeader) {
        const cookies = cookie.parse(cookieHeader);
        if (cookies.accessToken) return cookies.accessToken;
    }

    if (socket.handshake.auth?.token) {
        return socket.handshake.auth.token; // TEMP: bearer fallback
    }

    return null;
};

export const notificationSocketHandler = (io) => {
    io.use((socket, next) => {
        try {
            const token = extractToken(socket);

            if (!token) {
                return next(new Error("Access token missing"));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.data = { user: decoded };
            next();
        } catch (error) {
            console.log("Verify JWT error: ", error);
            next(new Error("Invalid or expired token"));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.data.user?._id?.toString();

        if (!userId) {
            return socket.disconnect();
        }

        socket.join(userId);
        console.log(`User-${userId} connected via socket`);

        // ---------------- CHAT EVENTS ----------------
        socket.on('sendMessage', async ({ receiverId, message }) => {
            try {
                if (!receiverId || !message) {
                    return socket.emit('error', 'Invalid message payload');
                }

                const newMsg = await createMessage({ senderId: userId, receiverId, message });

                io.to(userId).emit('newMessage', newMsg);
                io.to(receiverId.toString()).emit('newMessage', newMsg);

                // Notification created directly — no RabbitMQ round-trip needed
                // since this service already owns the Notification model.
                const notification = await Notification.create({
                    userId: receiverId,
                    message: `New message from user-${userId}`,
                    type: "info",
                    metadata: { senderId: userId, receiverId, messageId: newMsg._id },
                });
                io.to(receiverId.toString()).emit('newNotification', notification);
            } catch (error) {
                console.log("sendMessage error:", error);
                socket.emit('error', 'Failed to send message');
            }
        });

        socket.on('messageDelivered', async (messageId) => {
            try {
                const updated = await markMessageDelivered(messageId);
                if (updated?.senderId) {
                    io.to(updated.senderId.toString()).emit('messageStatusUpdate', {
                        messageId,
                        status: 'delivered',
                    });
                }
            } catch (error) {
                console.log('messageDelivered error:', error);
                socket.emit('error', 'Failed to mark message as delivered');
            }
        });

        socket.on('messageSeen', async ({ messageIds }) => {
            try {
                const updatedMessages = await markMessagesSeen(messageIds, userId);
                for (const msg of updatedMessages) {
                    io.to(msg.senderId.toString()).emit('messageSeenUpdate', {
                        messageId: msg._id,
                    });
                }
            } catch (error) {
                console.log('messageSeen error:', error);
                socket.emit('error', 'Failed to mark message as seen');
            }
        });

        socket.on('typing', ({ toUserId }) => {
            io.to(toUserId.toString()).emit('typing', { from: userId });
        });

        socket.on('stopTyping', ({ toUserId }) => {
            io.to(toUserId.toString()).emit('stopTyping', { from: userId });
        });

        // ---------------- DISCONNECT ----------------
        socket.on('disconnect', () => {
            console.log(`User-${userId} disconnected`);
        });
    });
};