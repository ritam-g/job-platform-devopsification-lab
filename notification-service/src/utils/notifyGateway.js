import axios from "axios";

const gatewayApi = axios.create({
    baseURL: process.env.API_GATEWAY_URL, // e.g. http://localhost:5000
    headers: { "x-internal-secret": process.env.INTERNAL_SERVICE_SECRET },
    timeout: 5000,
});

export const notifyGateway = async ({ userId, event, payload }) => {
    try {
        await gatewayApi.post("/internal/emit", { userId, event, payload });
    } catch (error) {
        console.log("Gateway push failed:", error.message);
        // fail silently — notification already saved in DB, real-time push
        // failure shouldn't crash the consumer or block the queue ack
    }
};