import admin from "firebase-admin";

let serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore();

export async function insertPayment(userId, data) {
    const ref = db
        .collection("usuarios")
        .doc(userId)
        .collection("pagamentos")
        .doc();

    const payload = {
        dt_cobranca: data.dt_cobranca ?? null,
        dt_pagamento: data.dt_pagamento ?? null,
        id_mercadopago: data.id_mercadopago ?? null,
        status: data.status ?? "pendente",
        amount: data.amount ?? null,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
    };

    await ref.set(payload);

    return { id_pagamento: ref.id, ...payload };
}

export async function getPaymentsByUser(userId) {
    const snapshot = await db
        .collection("usuarios")
        .doc(userId)
        .collection("pagamentos")
        .orderBy("dt_cobranca", "desc")
        .get();

    return snapshot.docs.map((doc) => ({
        id_pagamento: doc.id,
        ...doc.data(),
    }));
}

export async function updatePayment(userId, paymentId, data) {
    const ref = db
        .collection("usuarios")
        .doc(userId)
        .collection("pagamentos")
        .doc(paymentId);

    await ref.update({
        ...data,
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { id_pagamento: paymentId, ...data };
}

export async function getAllUsers() {
    const snapshot = await db
        .collection("usuarios")
        .where("ativo", "==", true)
        .get();

    return snapshot.docs.map((doc) => ({
        id_usuario: doc.id,
        ...doc.data(),
    }));
}

export async function getPaymentByMercadoPagoId(mercadoPagoId) {
    const snapshot = await db
        .collectionGroup("pagamentos")
        .where("id_mercadopago", "==", Number(mercadoPagoId))
        .limit(1)
        .get();

    if (snapshot.empty) {
        return null;
    }

    const doc = snapshot.docs[0];
    const userId = doc.ref.parent.parent.id;

    return {
        id_pagamento: doc.id,
        id_usuario: userId,
        ...doc.data(),
    };
}

export async function updatePaymentByMercadoPagoId(mercadoPagoId, data) {
    const payment = await getPaymentByMercadoPagoId(mercadoPagoId);
    
    if (!payment) {
        throw new Error(`Pagamento com id_mercadopago ${mercadoPagoId} não encontrado`);
    }

    await updatePayment(payment.id_usuario, payment.id_pagamento, data);

    return {
        id_pagamento: payment.id_pagamento,
        id_usuario: payment.id_usuario,
        ...data,
    };
}
