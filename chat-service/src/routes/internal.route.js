import { Router } from "express";
import { createMessage, markDelivered, markSeenBulk } from "../controllers/message.controller.js";
import { internalAuth } from "../middleware/internalAuth.middleware.js";

const router = Router();

router.use(internalAuth);

router.post("/", createMessage);
router.put("/:id/delivered", markDelivered);
router.put("/seen", markSeenBulk);

export default router;