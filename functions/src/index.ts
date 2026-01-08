
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// Token de segurança fornecido pelo usuário
const PAYMENT_TOKEN = "4f9a8c2e1d5b7f3g9h1j";

/**
 * Webhook genérico de processamento de pagamentos
 */
export const paymentWebhook = functions.https.onRequest(async (req: any, res: any) => {
  // Permite GET para testes simples de navegador e POST para o webhook real
  if (req.method !== "POST" && req.method !== "GET") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const providedToken = req.query.token || req.body.token;
  
  if (providedToken !== PAYMENT_TOKEN) {
      console.warn("Unauthorized access attempt. Invalid Token:", providedToken);
      res.status(403).send("Forbidden: Invalid Token");
      return;
  }

  // Se for GET, retorna apenas um OK para validar que a URL está acessível
  if (req.method === "GET") {
      res.status(200).send("Webhook endpoint is active.");
      return;
  }

  try {
    const data = req.body;
    console.log("Payment Webhook Payload:", JSON.stringify(data));

    const status = (data.status || data.transaction_status || "").toUpperCase();
    
    // Tratamento de dados do cliente - Padronização crucial
    const email = (data.customer?.email || data.email || "").trim().toLowerCase();
    const cpfRaw = data.customer?.cpf || data.cpf || ""; 
    const cpf = cpfRaw.replace(/\D/g, ""); // Remove tudo que não for número
    
    const productName = (data.product_name || data.offer_title || "").toLowerCase();

    // Status considerados como Pagamento Aprovado
    const approvedStatuses = ["APPROVED", "PAID", "COMPLETED", "AUTHORIZED"];
    
    if (!approvedStatuses.includes(status)) {
        console.log(`Ignored status: ${status}. Only APPROVED transactions are processed.`);
        res.status(200).send(`Ignored status: ${status}`);
        return;
    }

    if (!email && !cpf) {
        console.error("No identifier (email or CPF) found in payload");
        res.status(400).send("User identifier required");
        return;
    }

    // Calcula a nova data de expiração
    let monthsToAdd = 1;
    if (productName.includes("anual") || productName.includes("yearly") || productName.includes("12 meses")) {
        monthsToAdd = 12;
    }

    const now = new Date();
    const newExpiresAt = new Date(now);
    newExpiresAt.setMonth(newExpiresAt.getMonth() + monthsToAdd);
    const newExpiresAtStr = newExpiresAt.toISOString().split("T")[0];

    const paymentInfo = {
        date: new Date().toISOString(),
        provider: "external_gateway",
        amount: data.amount || 0,
        transactionId: data.id || data.transaction_id || "unknown",
        product: productName
    };

    console.log(`Processing subscription for Email: ${email}, CPF: ${cpf}. Adding ${monthsToAdd} months.`);

    // --- ESTRATÉGIA DE APROVISIONAMENTO ---
    
    const usersRef = db.collection("users");
    let userDoc: admin.firestore.QueryDocumentSnapshot | null = null;

    // 1. Prioridade: Tenta encontrar o usuário pelo E-mail
    if (email) {
        const emailSnapshot = await usersRef.where("email", "==", email).limit(1).get();
        if (!emailSnapshot.empty) {
            userDoc = emailSnapshot.docs[0];
            console.log(`User found by Email: ${email}`);
        }
    }

    // 2. Fallback: Se não achou por email, tenta pelo CPF
    if (!userDoc && cpf) {
        const cpfSnapshot = await usersRef.where("cpf", "==", cpf).limit(1).get();
        if (!cpfSnapshot.empty) {
            userDoc = cpfSnapshot.docs[0];
            console.log(`User found by CPF: ${cpf}`);
        }
    }

    if (userDoc) {
        // --- CENÁRIO A: Usuário já tem conta (Atualização) ---
        
        let currentExpiresAt = userDoc.data().subscriptionExpiresAt ? new Date(userDoc.data().subscriptionExpiresAt) : new Date();
        const nowMidnight = new Date();
        nowMidnight.setHours(0,0,0,0);
        
        // Se a assinatura antiga já venceu, a nova começa a contar de hoje.
        // Se ainda está válida, soma o tempo ao final da atual.
        if (currentExpiresAt < nowMidnight) {
            currentExpiresAt = now;
        }

        const updatedExpiresAt = new Date(currentExpiresAt);
        updatedExpiresAt.setMonth(updatedExpiresAt.getMonth() + monthsToAdd);
        
        await userDoc.ref.update({
            subscriptionExpiresAt: updatedExpiresAt.toISOString().split("T")[0],
            status: "active",
            updatedAt: new Date().toISOString(),
            lastPayment: paymentInfo,
            // Garante que o CPF esteja salvo no perfil se ainda não estiver
            ...(cpf ? { cpf: cpf } : {})
        });

        console.log(`SUCCESS: User ${userDoc.id} subscription updated.`);
        res.status(200).json({ success: true, message: "User subscription updated" });

    } else {
        // --- CENÁRIO B: Usuário NÃO tem conta (Assinatura Pendente) ---
        // Salva em 'pending_subscriptions' indexado pelo CPF para fácil resgate no cadastro
        
        if (cpf) {
            console.log(`User not found. Creating pending subscription for CPF: ${cpf}`);
            // Usamos o CPF como ID do documento para garantir unicidade e busca O(1)
            await db.collection("pending_subscriptions").doc(cpf).set({
                cpf: cpf,
                email: email || null,
                subscriptionExpiresAt: newExpiresAtStr,
                createdAt: new Date().toISOString(),
                lastPayment: paymentInfo
            });
            res.status(200).json({ success: true, message: "Pending subscription stored. User needs to register." });
        } else {
            console.warn(`User not found and NO CPF provided in payload. Cannot create pending subscription link.`);
            res.status(200).send("User not found and no CPF to link");
        }
    }

  } catch (error) {
    console.error("Critical error in webhook:", error);
    res.status(500).send("Internal Server Error");
  }
});
