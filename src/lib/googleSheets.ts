import { google } from "googleapis";

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

export async function pushToGoogleSheet(data: any) {
  const sheets = google.sheets({ version: "v4", auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID!,
    range: "Sheet1!A1",
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        data.name,
        data.phone,
        data.email,
        data.company,
        data.designation,
        data.address,
        new Date().toISOString(),
      ]],
    },
  });
}
