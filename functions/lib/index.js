"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kirvanoWebhook = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Inicializa o Admin SDK para acessar o Firestore com privilégios totais
admin.initializeApp();
const db = admin.firestore();
// Token de segurança fornecido (Configurar na URL do Webhook na Kirvano: ?token=SEU_TOKEN)
const KIRVANO_TOKEN = "4f9a8c2e1d5b7f3g9h1j";
// Função HTTP que será chamada pelo Webhook da Kirvano
exports.kirvanoWebhook = functions.https.onRequest(async (req, res) => {
    var _a, _b, _c, _d;
    // 1. LOG DE ENTRADA
    console.log("--- NOVA REQUISIÇÃO RECEBIDA ---");
    try {
        console.log("Body Preview:", JSON.stringify(req.body).substring(0, 200) + "...");
    }
    catch (e) {
        console.log("Body: Não foi possível converter para string.");
    }
    // 2. Validações Básicas
    if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
    }
    const providedToken = req.query.token || req.body.token;
    if (providedToken !== KIRVANO_TOKEN) {
        console.error("ERRO: Token inválido.");
        res.status(403).send("Forbidden");
        return;
    }
    try {
        const data = req.body;
        const status = (data.status || data.transaction_status || "").toUpperCase();
        const email = ((_a = data.customer) === null || _a === void 0 ? void 0 : _a.email) || data.email;
        // Extração e Limpeza do CPF
        const rawCpf = ((_b = data.customer) === null || _b === void 0 ? void 0 : _b.cpf) || ((_d = (_c = data.customer) === null || _c === void 0 ? void 0 : _c.document) === null || _d === void 0 ? void 0 : _d.number) || "";
        const cleanCpf = rawCpf.replace(/\D/g, ""); // Remove tudo que não é número
        const productName = (data.product_name || data.offer_title || "").toLowerCase();
        // 3. Verifica Status
        const approvedStatuses = ["APPROVED", "PAID", "COMPLETED", "AUTHORIZED"];
        if (!approvedStatuses.includes(status)) {
            console.log(`Status ignorado: ${status}`);
            res.status(200).send(`Ignored status: ${status}`);
            return;
        }
        // Validação: Precisamos do CPF ou Email para trabalhar
        if (!cleanCpf && !email) {
            console.error("Dados insuficientes: CPF e Email ausentes.");
            res.status(400).send("CPF or Email required");
            return;
        }
        // 4. Lógica de Data (Comum para Usuário Existente e Novo)
        let monthsToAdd = 1;
        if (productName.includes("anual") || productName.includes("yearly") || productName.includes("12 meses")) {
            monthsToAdd = 12;
        }
        // Objeto de transação para histórico
        const paymentRecord = {
            date: new Date().toISOString(),
            provider: "kirvano",
            amount: data.amount || 0,
            transactionId: data.id || data.transaction_id || "unknown",
            product: productName
        };
        // 5. Buscar usuário no Firestore
        // PRIORIDADE: Busca por CPF.
        let userDoc = null;
        let userRef = null;
        if (cleanCpf) {
            console.log(`Buscando usuário por CPF: ${cleanCpf}`);
            const usersByCpf = await db.collection("users").where("cpf", "==", cleanCpf).limit(1).get();
            if (!usersByCpf.empty) {
                userDoc = usersByCpf.docs[0];
                userRef = userDoc.ref;
            }
        }
        // FALLBACK: Se não achar por CPF (ou não tiver CPF), tenta por Email
        if (!userDoc && email) {
            console.log(`Usuário não achado por CPF (ou CPF vazio). Tentando por Email: ${email}`);
            const usersByEmail = await db.collection("users").where("email", "==", email).limit(1).get();
            if (!usersByEmail.empty) {
                userDoc = usersByEmail.docs[0];
                userRef = userDoc.ref;
            }
        }
        if (!userDoc) {
            // --- CENÁRIO: USUÁRIO NÃO EXISTE (Comprou antes de criar conta) ---
            const docKey = cleanCpf || email;
            console.warn(`Usuário não encontrado. Salvando em pending_subscriptions com chave: ${docKey}`);
            // Calcula validade a partir de HOJE
            const now = new Date();
            now.setMonth(now.getMonth() + monthsToAdd);
            const newExpiresAtStr = now.toISOString().split("T")[0];
            // Salva na coleção temporária
            await db.collection('pending_subscriptions').doc(docKey).set({
                cpf: cleanCpf,
                email: email,
                subscriptionExpiresAt: newExpiresAtStr,
                role: 'user',
                status: 'active',
                createdAt: new Date().toISOString(),
                lastPayment: paymentRecord
            });
            res.status(200).send("User not found, saved to pending_subscriptions");
            return;
        }
        // --- CENÁRIO: USUÁRIO EXISTE ---
        const userData = userDoc.data();
        let currentExpiresAt = userData.subscriptionExpiresAt ? new Date(userData.subscriptionExpiresAt) : new Date();
        const now = new Date();
        // Lógica de soma de data
        const currentExpiresAtMidnight = new Date(currentExpiresAt);
        currentExpiresAtMidnight.setHours(0, 0, 0, 0);
        const nowMidnight = new Date(now);
        nowMidnight.setHours(0, 0, 0, 0);
        if (currentExpiresAtMidnight < nowMidnight) {
            currentExpiresAt = now;
        }
        currentExpiresAt.setMonth(currentExpiresAt.getMonth() + monthsToAdd);
        const newExpiresAtStr = currentExpiresAt.toISOString().split("T")[0];
        // Atualiza usuário existente
        await userRef.update(Object.assign(Object.assign({ subscriptionExpiresAt: newExpiresAtStr, status: "active", role: userData.role || "user", updatedAt: new Date().toISOString() }, (cleanCpf && !userData.cpf ? { cpf: cleanCpf } : {})), { lastPayment: paymentRecord }));
        // *** NOVO: Salva no histórico (Subcoleção) ***
        await userRef.collection('subscription_history').add(paymentRecord);
        console.log(`SUCESSO: Assinatura de ${userDoc.id} renovada até ${newExpiresAtStr}`);
        res.status(200).json({ success: true, message: "Subscription updated" });
    }
    catch (error) {
        console.error("ERRO CRÍTICO:", error);
        res.status(500).send("Internal Server Error");
    }
});
//# sourceMappingURL=index.js.map