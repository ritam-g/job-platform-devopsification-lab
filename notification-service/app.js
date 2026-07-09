import express from "express"
import cors from "cors"

const app = express()

const corsOptions = {
  origin: process.env.FRONTEND_URL, // your frontend address
  credentials: true, // allow cookies and headers like authorization
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // allowed methods
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"], // allowed headers
};

app.use(cors(corsOptions))
app.use(express.json())

app.get("/", (req, res) => {
  res.send("Notification server is running")
})

import notificationRouter from "./src/routes/notification.route.js"

app.use("/api/notification", notificationRouter)

export default app