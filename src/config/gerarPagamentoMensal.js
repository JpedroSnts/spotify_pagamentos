import cron from "node-cron";
import { getAllUsers, insertPayment } from "./firebase.js";
import { createPixPayment } from "../services/mercadopago.service.js";
import { sendEmail } from "./email.js";

async function gerarPagamentoParaTodos() {
    const users = await getAllUsers();

    const dt_cobranca = new Date();
    const pagamento = {
        amount: 1.00,
        dt_cobranca,
        dt_pagamento: null,
        status: "pendente",
        created_at: new Date(),
    };
    
    for (const user of users) {
        if (user.ativo) {
            try {
                let payment = null;
                if (!user.vitalicio) {
                    payment = await createPixPayment({
                        amount: pagamento.amount,
                        description: `Assinatura Spotify - ${user.nome}`,
                        payer: {
                            email: "invalidemail123@erro.com",
                            first_name: user.nome.split(" ")[0],
                            last_name: user.nome.split(" ").slice(1).join(" "),
                            identification: {
                                type: "CPF",
                                number: user.cpf,
                            },
                        },
                    });
                    pagamento.id_mercadopago = payment.id;
                }
                if (user.vitalicio) {
                    pagamento.dt_pagamento = new Date();
                    pagamento.status = "pago";
                }
                await insertPayment(user.id_usuario, pagamento);
                if (!user.vitalicio) {
                    await sendEmail(
                        user.email,
                        "Pagamento Mensal Spotify Gerado",
                        `<body style="margin: 0; padding: 0; background-color: #121212; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #121212;">
                                <tr>
                                    <td align="center" style="padding: 20px 0;">
                                        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #121212; max-width: 600px; width: 100%;">
                                            <tr>
                                                <td align="center" style="padding: 20px 0;">
                                                    <img src="https://storage.googleapis.com/pr-newsroom-wp/1/2018/11/Spotify_Logo_RGB_Green.png" alt="Spotify" width="120" style="display: block; border: 0;" />
                                                </td>
                                            </tr>
    
                                            <tr>
                                                <td align="center" style="padding: 0 40px; color: #ffffff;">
                                                    <h1 style="font-size: 24px; margin: 0 0 20px 0; font-weight: bold;">Olá, ${user.nome}</h1>
                                                    <p style="font-size: 16px; margin: 0 0 30px 0; color: #b3b3b3; line-height: 1.5;">
                                                        Um novo pagamento mensal foi gerado para sua assinatura.
                                                    </p>
                                                </td>
                                            </tr>
    
                                            <tr>
                                                <td style="padding: 0 40px;">
                                                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #2a2a2a; border-radius: 8px;">
                                                        <tr>
                                                            <td style="padding: 20px;">
                                                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                                                    <tr>
                                                                        <td style="color: #b3b3b3; font-size: 14px; padding-bottom: 8px;">Data de Cobrança</td>
                                                                    <td align="right" style="color: #ffffff; font-size: 14px; padding-bottom: 8px;">${dt_cobranca.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td style="color: #b3b3b3; font-size: 14px; padding-bottom: 8px;">Status</td>
                                                                        <td align="right" style="color: #FFD700; font-size: 14px; padding-bottom: 8px;">Pendente</td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td colspan="2" style="border-bottom: 1px solid #404040; height: 10px; margin-bottom: 10px;"></td>
                                                                    </tr>
                                                                    <tr>
                                                                        <td style="color: #ffffff; font-size: 16px; font-weight: bold; padding-top: 10px;">Total</td>
                                                                        <td align="right" style="color: #1DB954; font-size: 16px; font-weight: bold; padding-top: 10px;">R$ ${payment.amount.toFixed(2).replace('.', ',')}</td>
                                                                    </tr>
                                                                </table>
                                                            </td>
                                                        </tr>
                                                    </table>
                                                </td>
                                            </tr>
    
                                            <tr>
                                                <td align="center" style="padding: 30px 40px;">
                                                    <p style="color: #ffffff; font-size: 14px; margin-bottom: 15px;">Escaneie para pagar:</p>
                                                    
                                                    <img src="cid:qrcode" alt="QR Code PIX" width="180" style="display: block; margin: 0 auto; border-radius: 4px; border: 4px solid #ffffff;" />
                                                    
                                                    <p style="color: #b3b3b3; font-size: 12px; margin-top: 25px; margin-bottom: 5px;">PIX Copia e Cola:</p>
                                                    <div style="background-color: #000000; padding: 15px; border-radius: 4px; border: 1px dashed #333333; text-align: left;">
                                                        <p style="color: #1DB954; font-family: 'Courier New', Courier, monospace; font-size: 11px; line-height: 1.4; margin: 0; word-break: break-all; word-wrap: break-word;">
                                                            ${payment.qr_code}
                                                        </p>
                                                    </div>
                                                </td>
                                            </tr>
    
                                            <tr>
                                                <td align="center" style="padding: 20px 40px 40px 40px;">
                                                    <p style="color: #686868; font-size: 10px; line-height: 1.5; margin: 0;">
                                                        Enviado para ${user.nome}.<br>
                                                        Spotify AB, Na Relíquia do Jóquei Clube São Vicente, n° 157, SP - Brasil<br>
                                                    </p>
                                                </td>
                                            </tr>
    
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </body>
                        `,
                        [
                            {
                                filename: 'qrcode.png',
                                content: payment.qr_code_base64,
                                encoding: 'base64',
                                cid: 'qrcode'
                            }
                        ]
                    );
                }
            } catch (err) {
                console.error(`❌ Erro ao gerar pagamento para ${user.nome}:`, err);
                sendEmail(
                    process.env.ADMIN_EMAIL,
                    `Erro ao gerar pagamento para ${user.nome}`,
                    `<p>Ocorreu um erro ao gerar o pagamento mensal para o usuário ${user.nome} (${user.email}).</p>
                    ${pagamento.id_mercadopago ? `<strong>Id pagamento: ${pagamento.id_mercadopago}</strong>` : ''}
                    <pre>${err.message}</pre>
                    `
                );
            }
        }
    }
}

export async function inicializarGeracaoMensal() {
    cron.schedule("0 12 29 * *", async () => {
        try {
            await gerarPagamentoParaTodos();
        } catch (err) {
            console.error("❌ Erro ao gerar pagamentos:", err);
        }
    }, {
        timezone: "America/Sao_Paulo"
    });
}