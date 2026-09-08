import { Router } from "express";
import { listUsers, getUserPayments, getPaymentQRCode } from "../controllers/user.controller.js";
import { gerarPagamentoParaTodos } from "../config/gerarPagamentoMensal.js";
import { reprocessarPagamentosPendentes } from "../config/reprocessarPagamentosPendentes.js";

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

// Rota para Vercel Crons - Reprocessar pagamentos pendentes a cada 6 horas
router.get("/reprocessar-pendentes", async (req, res) => {
    try {
        const resultado = await reprocessarPagamentosPendentes();
        res.json({ success: true, ...resultado });
    } catch (err) {
        console.error("❌ Erro ao reprocessar pagamentos pendentes:", err);
        res.status(500).json({ error: err.message });
    }
});

export default router;

