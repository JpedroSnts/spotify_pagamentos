import { getPendingPayments, deletePayment, getUserById, insertPayment } from "./firebase.js";
import { cancelPayment, createPixPayment } from "../services/mercadopago.service.js";
import { sendEmail } from "./email.js";

export async function reprocessarPagamentosPendentes() {
    const pendentes = await getPendingPayments();

    if (pendentes.length === 0) {
        console.log("✅ Nenhum pagamento pendente encontrado.");
        return { reprocessados: 0, erros: 0 };
    }

    console.log(`🔄 ${pendentes.length} pagamento(s) pendente(s) encontrado(s). Reprocessando...`);

    let reprocessados = 0;
    let erros = 0;

    for (const pagamentoPendente of pendentes) {
        try {
            const user = await getUserById(pagamentoPendente.id_usuario);

            if (!user || !user.ativo) {
                console.log(`⏭️ Usuário ${pagamentoPendente.id_usuario} não encontrado ou inativo. Pulando...`);
                continue;
            }

            // Usuários vitalícios não devem ter pagamentos pendentes
            if (user.vitalicio) {
                console.log(`⏭️ Usuário ${user.nome} é vitalício. Pulando...`);
                continue;
            }

            // 1. Tentar cancelar o pagamento antigo no MercadoPago
            if (pagamentoPendente.id_mercadopago) {
                await cancelPayment(pagamentoPendente.id_mercadopago);
            }

            // 2. Excluir o pagamento pendente do Firebase
            await deletePayment(pagamentoPendente.id_usuario, pagamentoPendente.id_pagamento);
            console.log(`🗑️ Pagamento ${pagamentoPendente.id_pagamento} excluído do Firebase.`);

            // 3. Gerar novo pagamento PIX
            const dt_cobranca = new Date();
            const valor_mensal = parseFloat(process.env.VALOR_MENSAL);

            const payment = await createPixPayment({
                amount: valor_mensal,
                description: `Assinatura Mensal - ${user.nome}`,
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

            const novoPagamento = {
                amount: valor_mensal,
                dt_cobranca,
                dt_pagamento: null,
                status: "pendente",
                id_mercadopago: payment.id,
                created_at: new Date(),
            };

            // 4. Inserir novo pagamento no Firebase
            await insertPayment(user.id_usuario, novoPagamento);

            // 5. Enviar email com novo QR Code
            await sendEmail(
                user.email,
                "Pagamento Mensal Gerado",
                `<body style="margin: 0; padding: 0; background-color: #121212; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #121212;">
                        <tr>
                            <td align="center" style="padding: 20px 0;">
                                <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #121212; max-width: 600px; width: 100%;">
                                    <tr>
                                        <td align="center" style="padding: 20px 0;">
                                            <h2 style="color: #1DB954; margin: 0; font-size: 22px; letter-spacing: 1px;">PAGAMENTOS MENSAIS</h2>
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

            reprocessados++;
            console.log(`✅ Pagamento reprocessado para ${user.nome}`);
        } catch (err) {
            erros++;
            console.error(`❌ Erro ao reprocessar pagamento ${pagamentoPendente.id_pagamento}:`, err);
            sendEmail(
                process.env.ADMIN_EMAIL,
                `Erro ao reprocessar pagamento pendente`,
                `<p>Ocorreu um erro ao reprocessar o pagamento pendente para o usuário ${pagamentoPendente.id_usuario}.</p>
                <strong>Pagamento ID: ${pagamentoPendente.id_pagamento}</strong>
                ${pagamentoPendente.id_mercadopago ? `<br><strong>MercadoPago ID: ${pagamentoPendente.id_mercadopago}</strong>` : ''}
                <pre>${err.message}</pre>
                `
            );
        }
    }

    console.log(`🏁 Reprocessamento finalizado: ${reprocessados} reprocessado(s), ${erros} erro(s).`);
    return { reprocessados, erros };
}
