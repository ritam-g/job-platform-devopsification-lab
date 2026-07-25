import axios from "axios";

const notificationServiceApi = axios.create({
    baseURL: "http://localhost:5006/api/notification",
    headers: { "x-internal-secret": process.env.INTERNAL_SERVICE_SECRET },
    timeout: 5000,
});

export const createNotification = async ({ userId, message, type, metadata }) => {
    const { data } = await notificationServiceApi.post("/internal/create", {
        userId,
        message,
        type,
        metadata
    });
    return data.data;
};