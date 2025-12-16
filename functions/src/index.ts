import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Inicializa o Admin SDK para acessar o Firestore com privilégios totais
admin.initializeApp();
const db = admin.firestore();

// Token de segurança fornecido (Configurar na URL do Webhook na Kirvano: ?token=SEU_TOKEN)
const KIRVANO_TOKEN = "4f9a8c2e1d5b7f3g9h1j";

// Função HTTP que será chamada pelo Webhook da Kirvano
export const kirvanoWebhook = functions.https.onRequest(async (req, res) => {
  // 1. Apenas aceita método POST
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  // 2. Validação de Segurança (Token)
  // O token pode vir na Query URL (?token=...) ou no corpo da requisição
  const providedToken = req.query.token || req.body.token;
  
  if (providedToken !== KIRVANO_TOKEN) {
      console.warn("Tentativa de acesso não autorizado ao webhook. Token inválido:", providedToken);
      res.status(403).send("Forbidden: Invalid Token");
      return;
  }

  try {
    const data = req.body;
    console.log("Kirvano Webhook Payload:", JSON.stringify(data));

    // 3. Extração de dados
    // Tenta pegar o status de vários lugares possíveis do JSON da Kirvano
    const status = (data.status || data.transaction_status || "").toUpperCase();
    const email = data.customer?.email || data.email;
    const productName = (data.product_name || data.offer_title || "").toLowerCase();

    // 4. Verificação de Status
    // Aceitamos status que indicam pagamento bem sucedido
    const approvedStatuses = ["APPROVED", "PAID", "COMPLETED", "AUTHORIZED"];
    
    if (!approvedStatuses.includes(status)) {
        console.log(`Status ignorado: ${status}. Apenas processamos pagamentos aprovados.`);
        // Retornamos 200 para a Kirvano saber que recebemos, mas não processamos pois não é uma venda concluída
        res.status(200).send(`Ignored status: ${status}`);
        return;
    }

    if (!email) {
        console.error("Email não encontrado no payload");
        res.status(400).send("Email required");
        return;
    }

    // 5. Buscar usuário no Firestore pelo E-mail
    const usersRef = db.collection("users");
    const snapshot = await usersRef.where("email", "==", email).limit(1).get();

    if (snapshot.empty) {
        console.warn(`Usuário não encontrado para o email: ${email}`);
        // Se o usuário comprou mas não criou conta ainda, não temos onde liberar.
        // Retornamos 200 para evitar retentativas infinitas do webhook.
        res.status(200).send("User not found in database");
        return;
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    // 6. Calcular nova data de expiração
    let monthsToAdd = 1; // Padrão Mensal
    // Verifica se é plano anual pelo nome do produto
    if (productName.includes("anual") || productName.includes("yearly") || productName.includes("12 meses")) {
        monthsToAdd = 12;
    }

    // Lógica inteligente de data:
    // Se o usuário já tem assinatura ativa no futuro, soma a partir dessa data.
    // Se já venceu ou nunca teve, começa a contar de hoje.
    let currentExpiresAt = userData.subscriptionExpiresAt ? new Date(userData.subscriptionExpiresAt) : new Date();
    const now = new Date();
    
    // Zera horas para comparação de data pura
    const currentExpiresAtMidnight = new Date(currentExpiresAt);
    currentExpiresAtMidnight.setHours(0,0,0,0);
    const nowMidnight = new Date(now);
    nowMidnight.setHours(0,0,0,0);

    // Se a data de expiração atual for anterior a hoje (vencida), começamos de hoje
    if (currentExpiresAtMidnight < nowMidnight) {
        currentExpiresAt = now; 
    }

    // Adiciona os meses
    currentExpiresAt.setMonth(currentExpiresAt.getMonth() + monthsToAdd);
    
    // Formata YYYY-MM-DD
    const newExpiresAtStr = currentExpiresAt.toISOString().split("T")[0];

    // 7. Atualizar no Firestore
    await userDoc.ref.update({
        subscriptionExpiresAt: newExpiresAtStr,
        status: "active", // Garante desbloqueio caso estivesse bloqueado
        role: userData.role || "user", 
        updatedAt: new Date().toISOString(),
        lastPayment: {
            date: new Date().toISOString(),
            provider: "kirvano",
            amount: data.amount || 0,
            transactionId: data.id || data.transaction_id || "unknown",
            product: productName
        }
    });

    console.log(`SUCESSO: Assinatura de ${email} renovada até ${newExpiresAtStr} (+${monthsToAdd} meses).`);
    res.status(200).json({ success: true, message: "Subscription updated", newExpiry: newExpiresAtStr });

  } catch (error) {
    console.error("Erro crítico no webhook:", error);
    res.status(500).send("Internal Server Error");
  }
});