import { getStore } from "@netlify/blobs";

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function makeId() {
  return "d_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

export default async (req) => {
  const store = getStore("fund-data");

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return json({ ok: false, error: "Bad request body." }, 400);
    }
    const { username, amount, method } = body;
    const num = Number(amount);
    if (!username || !method || !amount || isNaN(num) || num <= 0) {
      return json({ ok: false, error: "Missing or invalid fields." }, 400);
    }
    if (num > 500) {
      return json({ ok: false, error: "We can't accept more than $500.00 per contribution." }, 400);
    }
    const donations = (await store.get("donations", { type: "json" })) || [];
    const donation = {
      id: makeId(),
      username: String(username).slice(0, 60),
      amount: num,
      method: String(method).slice(0, 30),
      status: "pending",
      createdAt: Date.now()
    };
    donations.push(donation);
    await store.setJSON("donations", donations);
    return json({ ok: true, donation });
  }

  if (req.method === "GET") {
    const url = new URL(req.url);
    const password = url.searchParams.get("password") || "";
    const settings = (await store.get("settings", { type: "json" })) || {};
    if (!settings.adminPassword || password !== settings.adminPassword) {
      return json({ ok: false, error: "Unauthorized." }, 401);
    }
    const donations = (await store.get("donations", { type: "json" })) || [];
    return json({ ok: true, donations });
  }

  return json({ ok: false, error: "Method not allowed" }, 405);
};

export const config = { path: "/api/donations" };
