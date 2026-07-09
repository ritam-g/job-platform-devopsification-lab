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


export {
    getMessages,
    updateMessage,
    getUnreadCount
}