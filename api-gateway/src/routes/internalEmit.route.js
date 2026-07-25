import { Router } from "express";
import { emitToUser } from "../controllers/internalEmit.controller.js";
import { internalAuth } from "../middlewares/internalAuth.middleware.js";

const router = Router();

router.use(internalAuth);
router.post("/", emitToUser);

export default router;