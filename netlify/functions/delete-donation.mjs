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
  const index = donations.findIndex((d) => d.id === id);
  if (index === -1) return json({ ok: false, error: "Donation not found." }, 404);

  donations.splice(index, 1);
  await store.setJSON("donations", donations);
  return json({ ok: true });
};

export const config = { path: "/api/delete-donation" };
