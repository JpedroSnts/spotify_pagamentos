import { MercadoPagoConfig, Payment } from "mercadopago";
import "dotenv/config";

const client = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
    options: { timeout: 5000 },
});

const payment = new Payment(client);

/**
 * Cria um pagamento PIX e retorna o QR Code
 * @param {Object} paymentData - Dados do pagamento
 * @returns {Promise<Object>} - Dados do pagamento incluindo QR Code
 */
export async function createPixPayment(paymentData) {
    try {
        const body = {
            transaction_amount: paymentData.amount,
            description: paymentData.description,
            payment_method_id: "pix",
            payer: {
                email: paymentData.payer.email,
                first_name: paymentData.payer.first_name,
                last_name: paymentData.payer.last_name,
                identification: {
                    type: paymentData.payer.identification.type,
                    number: paymentData.payer.identification.number,
                },
            }
        };

        const response = await payment.create({ body });

        return {
            id: response.id,
            status: response.status,
            status_detail: response.status_detail,
            qr_code: response.point_of_interaction.transaction_data.qr_code,
            qr_code_base64:
                response.point_of_interaction.transaction_data.qr_code_base64,
            ticket_url:
                response.point_of_interaction.transaction_data.ticket_url,
            amount: response.transaction_amount,
            description: response.description,
            date_created: response.date_created,
            date_of_expiration: response.date_of_expiration,
        };
    } catch (error) {
        console.error("Erro ao criar pagamento PIX:", error);
        throw error;
    }
}

/**
 * Consulta o status de um pagamento e retorna informações completas incluindo QR Code
 * @param {string} paymentId - ID do pagamento
 * @returns {Promise<Object>} - Dados completos do pagamento incluindo QR Code
 */
export async function getPaymentStatus(paymentId) {
    try {
        const response = await payment.get({ id: paymentId });

        const paymentData = {
            id: response.id,
            status: response.status,
            status_detail: response.status_detail,
            transaction_amount: response.transaction_amount,
            description: response.description,
            payment_method_id: response.payment_method_id,
            date_approved: response.date_approved,
            date_created: response.date_created,
            date_of_expiration: response.date_of_expiration,
        };

        if (response.point_of_interaction?.transaction_data) {
            paymentData.qr_code =
                response.point_of_interaction.transaction_data.qr_code;
            paymentData.qr_code_base64 =
                response.point_of_interaction.transaction_data.qr_code_base64;
            paymentData.ticket_url =
                response.point_of_interaction.transaction_data.ticket_url;
        }

        if (response.payer) {
            paymentData.payer = {
                email: response.payer.email,
                first_name: response.payer.first_name,
                last_name: response.payer.last_name,
            };
        }

        return paymentData;
    } catch (error) {
        console.error("Erro ao consultar status do pagamento:", error);
        throw error;
    }
}

/**
 * Tenta cancelar um pagamento pendente no Mercado Pago (best-effort)
 * @param {string|number} paymentId - ID do pagamento no Mercado Pago
 * @returns {Promise<boolean>} - true se cancelou, false se falhou
 */
export async function cancelPayment(paymentId) {
    try {
        await payment.cancel({ id: paymentId });
        console.log(`✅ Pagamento ${paymentId} cancelado no MercadoPago`);
        return true;
    } catch (error) {
        console.warn(`⚠️ Não foi possível cancelar pagamento ${paymentId} no MercadoPago:`, error.message);
        return false;
    }
}