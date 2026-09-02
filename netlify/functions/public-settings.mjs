import { getStore } from "@netlify/blobs";

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

export default async () => {
  const store = getStore("fund-data");
  const settings = (await store.get("settings", { type: "json" })) || {};
  return json({
    cashapp: settings.cashapp || "",
    venmo: settings.venmo || "",
    paypal: settings.paypal || "",
    hasPassword: !!settings.adminPassword
  });
};

export const config = { path: "/api/public-settings" };
