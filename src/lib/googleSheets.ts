export async function pushToGoogleSheet(data: {
  name: string;
  phone: string;
  email: string;
  company: string;
  designation: string;
  address: string;
  source?: string;
}) {
  const SHEET_WEBHOOK = process.env.GOOGLE_SHEET_WEBHOOK!;

  const res = await fetch(SHEET_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...data,
      source: data.source || "WhatsApp",
    }),
  });

  const json = await res.json();

  if (!json.success) {
    throw new Error("Google Sheet update failed");
  }

  return true;
}
