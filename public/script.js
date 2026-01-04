const API_URL = window.location.origin;

async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/api/users`);
        const users = await response.json();

        document.getElementById("loading").style.display = "none";

        const grid = document.getElementById("users-grid");
        grid.innerHTML = users
            .map(
                (user) => `
                    <div class="user-card" onclick="showUserPayments('${
                        user.id_usuario
                    }', '${user.nome}')">
                        <div class="user-name">
                            ${user.nome}
                        </div>
                        <span class="pending-badge ${
                            user.pending_payments === 0 ? "zero" : ""
                        }">
                            ${user.pending_payments} pendente${
                    user.pending_payments !== 1 ? "s" : ""
                }
                        </span>
                    </div>
                `
            )
            .join("");
    } catch (error) {
        console.error("Erro ao carregar usuários:", error);
        document.getElementById("loading").textContent =
            "Erro ao carregar dados";
    }
}

async function showUserPayments(userId, userName) {
    try {
        const response = await fetch(`${API_URL}/api/users/${userId}/payments`);
        const data = await response.json();

        document.getElementById("modal-title").textContent = userName;

        const pendingDiv = document.getElementById("pending-payments");
        if (data.pending.length === 0) {
            pendingDiv.innerHTML =
                '<div class="no-payments">Nenhum pagamento pendente</div>';
        } else {
            pendingDiv.innerHTML = data.pending
                .map((payment) => {
                    const date = payment.dt_cobranca?.toDate
                        ? payment.dt_cobranca.toDate()
                        : new Date(payment.dt_cobranca._seconds * 1000);

                    return `
                            <div class="payment-item">
                                <div class="payment-info">
                                    <div class="payment-date">
                                        ${date.toLocaleDateString("pt-BR", {
                                            day: "2-digit",
                                            month: "2-digit",
                                            year: "numeric",
                                        })}
                                        <span class="status-badge status-pendente">PENDENTE</span>
                                        ${
                                            payment.id_mercadopago
                                                ? `<button class="view-qr-btn" onclick="showQRCode('${payment.id_mercadopago}')">Ver QR Code</button>`
                                                : ""
                                        }
                                    </div>
                                    <div class="payment-id">ID: ${
                                        payment.id_pagamento
                                    }</div>
                                </div>
                                <div class="payment-amount">
                                    R$ ${(payment.amount || 0)
                                        .toFixed(2)
                                        .replace(".", ",")}
                                </div>
                            </div>
                        `;
                })
                .join("");
        }

        const lastPaidDiv = document.getElementById("last-paid");
        if (!data.lastPaid) {
            lastPaidDiv.innerHTML =
                '<div class="no-payments">Nenhum pagamento realizado ainda</div>';
        } else {
            const payment = data.lastPaid;
            const date = payment.dt_pagamento?.toDate
                ? payment.dt_pagamento.toDate()
                : new Date(payment.dt_pagamento._seconds * 1000);

            lastPaidDiv.innerHTML = `
                        <div class="payment-item">
                            <div class="payment-info">
                                <div class="payment-date">
                                    ${date.toLocaleDateString("pt-BR", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                    })}
                                    <span class="status-badge status-pago">PAGO</span>
                                </div>
                                <div class="payment-id">ID: ${
                                    payment.id_pagamento
                                }</div>
                            </div>
                            <div class="payment-amount">
                                R$ ${(payment.amount || 0)
                                    .toFixed(2)
                                    .replace(".", ",")}
                            </div>
                        </div>
                    `;
        }

        document.getElementById("modal").classList.add("active");
    } catch (error) {
        console.error("Erro ao carregar pagamentos:", error);
        alert("Erro ao carregar pagamentos do usuário");
    }
}

function closeModal() {
    document.getElementById("modal").classList.remove("active");
}

async function showQRCode(mercadoPagoId) {
    try {
        const response = await fetch(
            `${API_URL}/api/payment/${mercadoPagoId}/qrcode`
        );
        const data = await response.json();

        if (data.qr_code_base64) {
            document.getElementById(
                "qrcode-img"
            ).src = `data:image/png;base64,${data.qr_code_base64}`;
            document.getElementById("pix-code").textContent = data.qr_code;
            document.getElementById("qrcode-modal").classList.add("active");
        } else {
            alert("QR Code não disponível para este pagamento");
        }
    } catch (error) {
        console.error("Erro ao carregar QR Code:", error);
        alert("Erro ao carregar QR Code");
    }
}

function closeQRCodeModal() {
    document.getElementById("qrcode-modal").classList.remove("active");
}

function copyPixCode(event) {
    const pixCode = document.getElementById("pix-code").textContent;
    navigator.clipboard
        .writeText(pixCode)
        .then(() => {
            const btn = event.target;
            const originalText = btn.textContent;
            btn.textContent = "✓ Copiado!";
            btn.classList.add("copied");

            setTimeout(() => {
                btn.textContent = originalText;
                btn.classList.remove("copied");
            }, 2000);
        })
        .catch((err) => {
            console.error("Erro ao copiar:", err);
            alert("Erro ao copiar código PIX");
        });
}

document.getElementById("qrcode-modal").addEventListener("click", (e) => {
    if (e.target.id === "qrcode-modal") {
        closeQRCodeModal();
    }
});

document.getElementById("modal").addEventListener("click", (e) => {
    if (e.target.id === "modal") {
        closeModal();
    }
});

loadUsers();