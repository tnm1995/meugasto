
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

const KIRVANO_TOKEN = "4f9a8c2e1d5b7f3g9h1j";

// Use explicit types from firebase-functions to avoid clashes with global Request/Response types and resolve property access errors
export const kirvanoWebhook = functions.https.onRequest(async (req: functions.https.Request, res: functions.Response) => {
  // Fix: Property 'method' does not exist on type 'Request'.
  if (req.method !== "POST") {
    // Fix: Property 'status' does not exist on type 'Response'.
    res.status(405).send("Method Not Allowed");
    return;
  }

  // Fix: Property 'query' and 'body' do not exist on type 'Request'.
  const providedToken = req.query.token || req.body.token;
  
  if (providedToken !== KIRVANO_TOKEN) {
      console.warn("Unauthorized access attempt. Invalid Token:", providedToken);
      // Fix: Property 'status' does not exist on type 'Response'.
      res.status(403).send("Forbidden: Invalid Token");
      return;
  }

  try {
    // Fix: Property 'body' does not exist on type 'Request'.
    const data = req.body;
    console.log("Kirvano Webhook Payload:", JSON.stringify(data));

    const status = (data.status || data.transaction_status || "").toUpperCase();
    const email = data.customer?.email || data.email;
    const cpfRaw = data.customer?.cpf || data.cpf || ""; // Tenta capturar CPF do payload
    const cpf = cpfRaw.replace(/\D/g, "");
    const productName = (data.product_name || data.offer_title || "").toLowerCase();

    const approvedStatuses = ["APPROVED", "PAID", "COMPLETED", "AUTHORIZED"];
    
    if (!approvedStatuses.includes(status)) {
        console.log(`Ignored status: ${status}.`);
        // Fix: Property 'status' does not exist on type 'Response'.
        res.status(200).send(`Ignored status: ${status}`);
        return;
    }

    if (!email && !cpf) {
        console.error("No identifier (email or CPF) found in payload");
        // Fix: Property 'status' does not exist on type 'Response'.
        res.status(400).send("User identifier required");
        return;
    }

    const usersRef = db.collection("users");
    let userDoc: admin.firestore.QueryDocumentSnapshot | null = null;

    // 1. Tenta buscar por E-mail
    if (email) {
        const emailSnapshot = await usersRef.where("email", "==", email).limit(1).get();
        if (!emailSnapshot.empty) {
            userDoc = emailSnapshot.docs[0];
        }
    }

    // 2. Se não achou por email, tenta por CPF
    if (!userDoc && cpf) {
        console.log(`User not found by email, searching by CPF: ${cpf}`);
        const cpfSnapshot = await usersRef.where("cpf", "==", cpf).limit(1).get();
        if (!cpfSnapshot.empty) {
            userDoc = cpfSnapshot.docs[0];
        }
    }

    if (!userDoc) {
        console.warn(`User not found in database (Email: ${email}, CPF: ${cpf})`);
        // Fix: Property 'status' does not exist on type 'Response'.
        res.status(200).send("User not found");
        return;
    }

    const userData = userDoc.data();

    let monthsToAdd = 1;
    if (productName.includes("anual") || productName.includes("yearly") || productName.includes("12 meses")) {
        monthsToAdd = 12;
    }

    let currentExpiresAt = userData.subscriptionExpiresAt ? new Date(userData.subscriptionExpiresAt) : new Date();
    const now = new Date();
    
    const currentExpiresAtMidnight = new Date(currentExpiresAt);
    currentExpiresAtMidnight.setHours(0,0,0,0);
    const nowMidnight = new Date(now);
    nowMidnight.setHours(0,0,0,0);

    if (currentExpiresAtMidnight < nowMidnight) {
        currentExpiresAt = now; 
    }

    currentExpiresAt.setMonth(currentExpiresAt.getMonth() + monthsToAdd);
    const newExpiresAtStr = currentExpiresAt.toISOString().split("T")[0];

    await userDoc.ref.update({
        subscriptionExpiresAt: newExpiresAtStr,
        status: "active",
        updatedAt: new Date().toISOString(),
        lastPayment: {
            date: new Date().toISOString(),
            provider: "kirvano",
            amount: data.amount || 0,
            transactionId: data.id || data.transaction_id || "unknown",
            product: productName
        }
    });

    console.log(`SUCCESS: User ${userDoc.id} (${userData.email || 'N/A'}) updated to ${newExpiresAtStr}.`);
    // Fix: Property 'status' does not exist on type 'Response'.
    res.status(200).json({ success: true, message: "Subscription updated", newExpiry: newExpiresAtStr });

  } catch (error) {
    console.error("Critical error in webhook:", error);
    // Fix: Property 'status' does not exist on type 'Response'.
    res.status(500).send("Internal Server Error");
  }
});
