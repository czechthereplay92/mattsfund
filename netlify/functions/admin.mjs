import { getStore } from "@netlify/blobs";

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

export default async (req) => {
  const store = getStore("fund-data");
  const settings = (await store.get("settings", { type: "json" })) || {};

  if (req.method === "GET") {
    const url = new URL(req.url);
    const password = url.searchParams.get("password") || "";
    if (!settings.adminPassword) {
      return json({ ok: true, needsSetup: true });
    }
    if (password !== settings.adminPassword) {
      return json({ ok: false, error: "Wrong password." }, 401);
    }
    return json({
      ok: true,
      settings: {
        webhookUrl: settings.webhookUrl || "",
        cashapp: settings.cashapp || "",
        venmo: settings.venmo || "",
        paypal: settings.paypal || ""
      }
    });
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return json({ ok: false, error: "Bad request body." }, 400);
    }
    const { password, action } = body;

    if (action === "set-password") {
      if (settings.adminPassword) {
        return json({ ok: false, error: "A password is already set." }, 400);
      }
      if (!password) {
        return json({ ok: false, error: "Password can't be empty." }, 400);
      }
      settings.adminPassword = password;
      await store.setJSON("settings", settings);
      return json({ ok: true });
    }

    if (!settings.adminPassword || password !== settings.adminPassword) {
      return json({ ok: false, error: "Wrong password." }, 401);
    }

    if (action === "check") {
      return json({ ok: true });
    }

    if (action === "update-settings") {
      const { webhookUrl, cashapp, venmo, paypal } = body;
      Object.assign(settings, {
        webhookUrl: webhookUrl || "",
        cashapp: cashapp || "",
        venmo: venmo || "",
        paypal: paypal || ""
      });
      await store.setJSON("settings", settings);
      return json({ ok: true });
    }

    return json({ ok: false, error: "Unknown action." }, 400);
  }

  return json({ ok: false, error: "Method not allowed" }, 405);
};

export const config = { path: "/api/admin" };
