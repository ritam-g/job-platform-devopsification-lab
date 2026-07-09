import express from "express"
import cors from "cors"

const app = express()

app.use(express.json())
const corsOptions = {
  origin: process.env.FRONTEND_URL, // your frontend address
  credentials: true, // allow cookies and headers like authorization
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"], // allowed methods
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"], // allowed headers
};

app.use(cors(corsOptions))

app.get("/", (req, res) => {
  res.send("Interview service is running")
})

import interviewRouter from "./src/routes/interview.routes.js"

app.use("/api/interview", interviewRouter)

export default app