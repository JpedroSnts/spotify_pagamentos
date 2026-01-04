import { Router } from "express";
import { listUsers, getUserPayments, getPaymentQRCode } from "../controllers/user.controller.js";

const router = Router();

router.get("/users", listUsers);
router.get("/users/:userId/payments", getUserPayments);
router.get("/payment/:mercadoPagoId/qrcode", getPaymentQRCode);

export default router;
