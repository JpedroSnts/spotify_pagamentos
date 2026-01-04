import {updatePaymentByMercadoPagoId} from "../config/firebase.js";
import * as mercadoPagoService from "../services/mercadopago.service.js";
import crypto from "crypto";

function validateMercadoPagoRequest(req) {
    const signature = req.headers['x-signature'];
    const requestId = req.headers['x-request-id'];
    
    if (!signature || !requestId) {
        return false;
    }

    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
    if (secret) {
        try {
            const parts = signature.split(',');
            let ts, hash;
            
            parts.forEach(part => {
                const [key, value] = part.split('=');
                if (key.trim() === 'ts') ts = value;
                if (key.trim() === 'v1') hash = value;
            });

            if (!ts || !hash) return false;

            const dataId = req.query['data.id'] || req.body?.data?.id || '';
            const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
            
            const hmac = crypto
                .createHmac('sha256', secret)
                .update(manifest)
                .digest('hex');

            return hmac === hash;
        } catch (error) {
            console.error('Erro ao validar signature:', error);
            return false;
        }
    }

    return true;
}

export async function handleWebhook(req, res) {
    try {
        if (!validateMercadoPagoRequest(req)) {
            console.warn('Tentativa de acesso não autorizado ao webhook');
            return res.status(401).send('Unauthorized');
        }

        res.status(200).send("OK");

        const { type, data } = req.body;

        if (type === "payment" || req.query.topic === "payment") {
            const paymentId = data?.id || req.query["data.id"];

            if (!paymentId) {
                console.error("ID do pagamento não encontrado no webhook");
                return;
            }
            
            const paymentStatus = await mercadoPagoService.getPaymentStatus(
                paymentId
            );

            if (paymentStatus.status === "approved") {
                await updatePaymentByMercadoPagoId(paymentId, {
                    status: "pago",
                    dt_pagamento: new Date(),
                });
            }
        }
    } catch (error) {
        console.error("Erro ao processar webhook:", error);
    }
}