import express from "express";
import cors from "cors";

const app = express()

const corsOptions = {
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

app.use(cors(corsOptions))
app.use(express.json())

app.get("/", (req, res) => {
  res.send("Chat server is running")
})

import messageRouter from "./src/routes/message.route.js"
import internalRoute from "./src/routes/internal.route.js"

app.use("/api/chat", messageRouter)
app.use("/api/internal/messages", internalRoute)

export default app