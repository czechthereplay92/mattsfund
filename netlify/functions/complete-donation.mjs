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
  const { password, id } = body;

  const settings = (await store.get("settings", { type: "json" })) || {};
  if (!settings.adminPassword || password !== settings.adminPassword) {
    return json({ ok: false, error: "Unauthorized." }, 401);
  }

  const donations = (await store.get("donations", { type: "json" })) || [];
  const donation = donations.find((d) => d.id === id);
  if (!donation) return json({ ok: false, error: "Donation not found." }, 404);
  if (donation.status === "completed") {
    return json({ ok: true, discord: { ok: false, reason: "Already marked complete." } });
  }

  donation.status = "completed";
  donation.completedAt = Date.now();
  await store.setJSON("donations", donations);

  let discordResult = { ok: false, reason: "No webhook set." };
  if (settings.webhookUrl) {
    const content = `💰 **$${Number(donation.amount).toFixed(2)}** donated by **${donation.username}** to help out the community — drop a reaction below to say thanks! 🙏`;
    try {
      const resp = await fetch(settings.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
      });
      if (resp.ok) {
        discordResult = { ok: true };
      } else {
        const text = await resp.text().catch(() => "");
        discordResult = {
          ok: false,
          reason: `Discord responded ${resp.status} ${resp.statusText}${text ? " — " + text.slice(0, 200) : ""}`
        };
      }
    } catch (e) {
      discordResult = { ok: false, reason: `Request failed: ${e.message}` };
    }
  }

  return json({ ok: true, discord: discordResult });
};

export const config = { path: "/api/complete-donation" };
