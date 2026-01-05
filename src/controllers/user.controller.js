import { getAllUsers, getPaymentsByUser } from "../config/firebase.js";
import { getPaymentStatus } from "../services/mercadopago.service.js";

export async function listUsers(req, res) {
    try {
        const users = await getAllUsers();
        
        const usersWithPaymentCount = await Promise.all(
            users.map(async (user) => {
                const payments = await getPaymentsByUser(user.id_usuario);
                const pendingCount = payments.filter(p => p.status === "pendente").length;
                
                return {
                    id_usuario: user.id_usuario,
                    nome: user.nome,
                    ativo: user.ativo,
                    pending_payments: pendingCount
                };
            })
        );

        res.json(usersWithPaymentCount);
    } catch (error) {
        console.error("Erro ao listar usuários:", error);
        res.status(500).json({ error: error.message });
    }
}

export async function getUserPayments(req, res) {
    try {
        const { userId } = req.params;
        const payments = await getPaymentsByUser(userId);
        
        const pendingPayments = payments.filter(p => p.status === "pendente");
        const paidPayments = payments.filter(p => p.status === "pago");
        const previousPayments = paidPayments.slice(0, 6);
        
        res.json({
            pending: pendingPayments,
            previousPayments: previousPayments
        });
    } catch (error) {
        console.error("Erro ao buscar pagamentos:", error);
        res.status(500).json({ error: error.message });
    }
}

export async function getPaymentQRCode(req, res) {
    try {
        const { mercadoPagoId } = req.params;
        const paymentData = await getPaymentStatus(mercadoPagoId);
        
        res.json({
            qr_code: paymentData.qr_code,
            qr_code_base64: paymentData.qr_code_base64,
            status: paymentData.status
        });
    } catch (error) {
        console.error("Erro ao buscar QR Code:", error);
        res.status(500).json({ error: error.message });
    }
}
