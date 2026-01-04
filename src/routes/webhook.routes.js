import { Router } from "express";
const router = Router();
import { handleWebhook } from "../controllers/webhook.controller.js";

router.post("/", handleWebhook);

export default router;
