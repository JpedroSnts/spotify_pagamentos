import { Router } from "express";
import { listUsers, getUserPayments, getPaymentQRCode } from "../controllers/user.controller.js";
import { gerarPagamentoParaTodos } from "../config/gerarPagamentoMensal.js";

const router = Router();

router.get("/users", listUsers);
router.get("/users/:userId/payments", getUserPayments);
router.get("/payment/:mercadoPagoId/qrcode", getPaymentQRCode);

// Rota para Vercel Crons (GET obrigatório - Vercel sempre usa GET)
router.get("/gerar-pagamentos", async (req, res) => {
    try {
        await gerarPagamentoParaTodos();
        res.json({ success: true, message: "Pagamentos gerados com sucesso" });
    } catch (err) {
        console.error("❌ Erro ao gerar pagamentos:", err);
        res.status(500).json({ error: err.message });
    }
});

export default router;
