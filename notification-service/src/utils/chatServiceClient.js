import axios from "axios";

const chatServiceApi = axios.create({
    baseURL: `${process.env.CHAT_SERVICE_URL}/api/internal/messages`,
    headers: {
        "x-internal-secret": process.env.INTERNAL_SERVICE_SECRET,
    },
    timeout: 5000,
});

export const createMessage = async ({ senderId, receiverId, message }) => {
    const { data } = await chatServiceApi.post("/", { senderId, receiverId, message });
    return data.data;
};

export const markMessageDelivered = async (messageId) => {
    const { data } = await chatServiceApi.put(`/${messageId}/delivered`);
    return data.data;
};

export const markMessagesSeen = async (messageIds, receiverId) => {
    const { data } = await chatServiceApi.put(`/seen`, { messageIds, receiverId });
    return data.data;
};