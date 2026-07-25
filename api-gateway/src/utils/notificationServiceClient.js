import axios from "axios"

const notificationServiceApi = axios.create({
    baseURL: process.env.NOTIFICATION_SERVICE_URL, // e.g. http://localhost:5003
    headers: {
        "x-internal-secret": process.env.INTERNAL_SECRET
    }
})

const createNotification = async ({ userId, message, type, metadata }) => {
    try {
        const response = await notificationServiceApi.post("/api/internal/notifications", {
            userId,
            message,
            type,
            metadata
        })
        return response.data.notification   // ✅ unwrap to match RabbitMQ path shape
    } catch (error) {
        console.log("Failed to create notification:", error.message)
        throw error
    }
}

export {
    createNotification
}
