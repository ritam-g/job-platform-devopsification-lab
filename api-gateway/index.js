import "./src/config/env.js";

import http from "http";
import { Server } from "socket.io";
import app from "./app.js";
import connectDb from "./src/db/index.js";
import { setIO } from "./src/sockets/socketInstance.js";
import { gatewaySocketHandler } from "./src/sockets/gatewaySocket.js";

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL,
        credentials: true
    }
});

connectDb()
.then(() => {
    // Socket handler DB connect hone ke BAAD hi register hota hai —
    // taaki auth ke waqt User.findById() query safe rahe
    setIO(io);
    gatewaySocketHandler(io);

    server.listen(process.env.PORT || 5000, () => {
        console.log(`Api-gateway is running on port ${process.env.PORT}`);
    });
})
.catch((error) => {
    console.log("DB connection failed, server not started: ", error);
});

io.on("connect_error", (err) => {
    console.log("Socket connect_error:", err.message);
});