import { getIO } from "../sockets/socketInstance.js";

// Called by other services (e.g. notification-service after creating
// a notification from a RabbitMQ event) to push data to a connected user.
export const emitToUser = (req, res) => {
    try {
        const { userId, event, payload } = req.body;

        if (!userId || !event) {
            return res.status(400).json({ message: "userId and event are required" });
        }

        const io = getIO();
        io.to(userId.toString()).emit(event, payload);

        return res.status(200).json({ message: "Emitted successfully" });
    } catch (error) {
        console.log("emitToUser error:", error);
        return res.status(500).json({ error: error.message });
    }
};