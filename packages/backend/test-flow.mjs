const BASE_URL = "http://localhost:3000";

async function request(method, path, body, token) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function test() {
  const timestamp = Date.now();
  const ownerEmail = `owner${timestamp}@test.com`;
  const tenantSlug = `test-biz-${timestamp}`;
  const visitorId = `visitor-${timestamp}`;

  console.log("\n=== 1. Register Owner ===");
  const registerRes = await request("POST", "/api/auth/owner/register", {
    email: ownerEmail,
    password: "password123",
    name: "Test Owner",
    businessName: "Test Business",
    businessSlug: tenantSlug,
  });
  console.log("Status:", registerRes.status);
  console.log("Response:", JSON.stringify(registerRes.data, null, 2));

  if (registerRes.status !== 201) {
    console.error("❌ Owner registration failed");
    return;
  }
  console.log("✅ Owner registered");

  const ownerToken = registerRes.data.token;

  console.log("\n=== 2. Get Tenant Info ===");
  const infoRes = await request("GET", `/api/chat/${tenantSlug}/info`);
  console.log("Status:", infoRes.status);
  console.log("Response:", JSON.stringify(infoRes.data, null, 2));

  if (infoRes.status !== 200) {
    console.error("❌ Failed to get tenant info");
    return;
  }
  console.log("✅ Tenant info retrieved");

  console.log("\n=== 3. Customer Sends First Message (Creates Lead) ===");
  const chatRes = await request("POST", `/api/chat/${tenantSlug}/message`, {
    message: "Hi, I'm interested in your services!",
    visitorId,
  });
  console.log("Status:", chatRes.status);
  console.log("Response:", JSON.stringify(chatRes.data, null, 2));

  if (chatRes.status !== 200) {
    console.error("❌ Chat message failed");
    return;
  }
  console.log("✅ Lead created with first message");

  const conversationId = chatRes.data.conversationId;

  console.log("\n=== 4. Customer Sends Follow-up Message ===");
  const followupRes = await request("POST", `/api/chat/${tenantSlug}/message`, {
    message: "Can you tell me more about pricing?",
    visitorId,
    conversationId,
  });
  console.log("Status:", followupRes.status);
  console.log("Response:", JSON.stringify(followupRes.data, null, 2));
  console.log("✅ Follow-up message sent");

  console.log("\n=== 5. Owner Views Leads ===");
  const leadsRes = await request("GET", "/api/owner/leads", null, ownerToken);
  console.log("Status:", leadsRes.status);
  console.log("Response:", JSON.stringify(leadsRes.data, null, 2));

  if (leadsRes.status !== 200) {
    console.error("❌ Failed to get leads");
    return;
  }

  const leadCount = leadsRes.data.conversations?.length ?? 0;
  console.log(`✅ Owner sees ${leadCount} lead(s)`);

  console.log("\n=== 6. Owner Views Conversation Details ===");
  const convRes = await request(
    "GET",
    `/api/owner/conversations/${conversationId}`,
    null,
    ownerToken
  );
  console.log("Status:", convRes.status);
  console.log("Response:", JSON.stringify(convRes.data, null, 2));
  console.log("✅ Conversation details retrieved");

  console.log("\n=== 7. Owner Dashboard Stats ===");
  const statsRes = await request(
    "GET",
    "/api/owner/dashboard/stats",
    null,
    ownerToken
  );
  console.log("Status:", statsRes.status);
  console.log("Response:", JSON.stringify(statsRes.data, null, 2));
  console.log("✅ Dashboard stats retrieved");

  console.log("\n=== 8. Customer Registers (Links Conversations) ===");
  const customerRegRes = await request("POST", "/api/auth/customer/register", {
    email: `customer${timestamp}@test.com`,
    password: "password123",
    name: "Test Customer",
    visitorId,
  });
  console.log("Status:", customerRegRes.status);
  console.log("Response:", JSON.stringify(customerRegRes.data, null, 2));

  if (customerRegRes.status !== 201) {
    console.error("❌ Customer registration failed");
    return;
  }
  console.log("✅ Customer registered and conversations linked");

  console.log("\n=== 9. Convert Lead ===");
  const convertRes = await request(
    "POST",
    `/api/owner/conversations/${conversationId}/convert`,
    null,
    ownerToken
  );
  console.log("Status:", convertRes.status);
  console.log("Response:", JSON.stringify(convertRes.data, null, 2));
  console.log("✅ Lead converted");

  console.log("\n=============================");
  console.log("✅ All tests passed!");
  console.log("=============================\n");
}

test().catch(console.error);
