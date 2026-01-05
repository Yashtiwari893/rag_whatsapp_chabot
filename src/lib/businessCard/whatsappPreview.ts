import { BusinessCardData } from "./cardTypes";

export function buildCardPreviewMessage(
    data: BusinessCardData
): string {
    return `
✅ *Business card scanned successfully* 😊

Here’s what I found:

👤 *Name:* ${data.name || "—"}
📞 *Phone:* ${data.phone || "—"}
📧 *Email:* ${data.email || "—"}
🏢 *Company:* ${data.company || "—"}
💼 *Designation:* ${data.designation || "—"}
📍 *Address:* ${data.address || "—"}

Please reply:
✅ *YES* – Save contact  
✏️ *EDIT field* – Correct (example: EDIT phone)  
❌ *NO* – Discard
`.trim();
}
