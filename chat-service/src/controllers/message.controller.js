import { Message } from "../models/message.model.js"


const getMessages = async (req, res) => {
    try {
        const userHeader = req.headers['x-user']

        if (!userHeader) {
            return res.status(400).json({ message: 'User information is missing' })
        }

        const user = JSON.parse(userHeader)

        const userId = user?._id

        if (!userId) {
            return res.status(400).json({ message: "User Id is required" })
        }

        const chatUserId = req.params.id
        const limit = parseInt(req.query.limit)
        const page = parseInt(req.query.page)

        if (!chatUserId) {
            return res.status(400).json({ message: "Chat User Id Id is required" })
        }

        const messages = await Message.find({
            $or: [
                { senderId: userId, receiverId: chatUserId },
                { senderId: chatUserId, receiverId: userId }
            ]
        })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)

        if (!messages) {
            return res.status(400).json({ message: "Messages not found" })
        }

        return res.status(200).json({ message: "Messages retrieved successfully", messages: messages.reverse() })
    } catch (error) {
        console.log("Message retrieve failed:", error)
        return res.status(400).json({ error: error.message })
    }
}

const updateMessage = async (req, res) => {
    try {
        const userHeader = req.headers['x-user']

        if (!userHeader) {
            return res.status(400).json({ message: 'User information is missing' })
        }

        const user = JSON.parse(userHeader)

        const userId = user?._id

        if (!userId) {
            return res.status(400).json({ message: "User Id is required" })
        }

        const chatUserId = req.params.id

        await Message.updateMany(
            { senderId: chatUserId, receiverId: userId, seen: false },
            { $set: { seen: true } }
        )

        res.status(200).json({ message: 'Messages marked as seen' })
    } catch (error) {
        console.log("Message update failed:", error)
        return res.status(400).json({ error: error.message })
    }
}

const getUnreadCount = async (req, res) => {
    try {
        const userHeader = req.headers["x-user"];

        if (!userHeader) {
            return res.status(400).json({ message: "User information is missing" });
        }

        const user = JSON.parse(userHeader);
        const userId = user?._id;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        const unreadCount = await Message.countDocuments({
            receiverId: userId,
            seen: false,
        });

        return res.status(200).json({
            message: "Unread messages count retrieved",
            unread: unreadCount,
        });
    } catch (error) {
        console.log("Unread count fetch failed:", error);
        return res.status(500).json({ error: error.message });
    }
};


const createMessage = async (req, res) => {
    try {
        const { senderId, receiverId, message } = req.body;

        if (!senderId || !receiverId || !message) {
            return res.status(400).json({ message: "senderId, receiverId and message are required" });
        }

        const newMsg = await Message.create({ senderId, receiverId, message });
        return res.status(201).json({ message: "Message created", data: newMsg });
    } catch (error) {
        console.log("Message create failed:", error);
        return res.status(400).json({ error: error.message });
    }
};

const markDelivered = async (req, res) => {
    try {
        const { id } = req.params;
        const updated = await Message.findByIdAndUpdate(id, { delivered: true }, { new: true });

        if (!updated) {
            return res.status(404).json({ message: "Message not found" });
        }

        return res.status(200).json({ message: "Message marked delivered", data: updated });
    } catch (error) {
        console.log("Mark delivered failed:", error);
        return res.status(400).json({ error: error.message });
    }
};

const markSeenBulk = async (req, res) => {
    try {
        const { messageIds, receiverId } = req.body;

        if (!Array.isArray(messageIds) || !messageIds.length) {
            return res.status(400).json({ message: "messageIds array is required" });
        }

        await Message.updateMany(
            { _id: { $in: messageIds }, receiverId },
            { $set: { seen: true } }
        );

        const updatedMessages = await Message.find({ _id: { $in: messageIds } });
        return res.status(200).json({ message: "Messages marked seen", data: updatedMessages });
    } catch (error) {
        console.log("Mark seen failed:", error);
        return res.status(400).json({ error: error.message });
    }
};

export {
    getMessages,
    updateMessage,
    getUnreadCount,
    createMessage,
    markDelivered,
    markSeenBulk
}
