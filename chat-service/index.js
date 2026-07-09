import app from "./app.js";
import "./src/config/env.js";

import http from "http"
import connectDb from "./src/db/index.js";
import { Server } from "socket.io";
import { chatSocketHandler } from "./src/sockets/chat.js";
import { connectRabbitMQ } from "./src/utils/rabbitmq.js";

const server = http.createServer(app)
const io = new Server(server, {
    cors: { origin: '*' }
})

connectDb()
.then(async() => {
    await connectRabbitMQ()

    server.listen(process.env.PORT || 5005, () => {
        console.log(`Chat server is running on port ${process.env.PORT}`)
    })
})
.catch((error) => {
    console.log("Error: ", error)
})

chatSocketHandler(io)