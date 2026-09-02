import { getStore } from "@netlify/blobs";

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

export default async (req) => {
  if (req.method !== "POST") return json({ ok: false, error: "Method not allowed" }, 405);

  const store = getStore("fund-data");
  let body;
  try {
    body = await req.json();
  } catch (e) {
    return json({ ok: false, error: "Bad request body." }, 400);
  }
  const { password, webhookUrl } = body;

  const settings = (await store.get("settings", { type: "json" })) || {};
  if (!settings.adminPassword || password !== settings.adminPassword) {
    return json({ ok: false, error: "Unauthorized." }, 401);
  }

  if (!webhookUrl) return json({ ok: false, reason: "No webhook URL provided." });

  try {
    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "👋 Test message from the You'll Be Alright Fund admin panel." })
    });
    if (resp.ok) return json({ ok: true });
    const text = await resp.text().catch(() => "");
    return json({
      ok: false,
      reason: `Discord responded ${resp.status} ${resp.statusText}${text ? " — " + text.slice(0, 200) : ""}`
    });
  } catch (e) {
    return json({ ok: false, reason: `Request failed: ${e.message}` });
  }
};

export const config = { path: "/api/test-webhook" };
