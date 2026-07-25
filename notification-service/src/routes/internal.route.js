import { Router } from "express"
import { internalAuth } from "../middlewares/internalAuth.middleware.js"
import { createNotification } from "../controllers/notification.controller.js"

const router = Router()

router.use(internalAuth)

router.route("/").post(createNotification)

export default router