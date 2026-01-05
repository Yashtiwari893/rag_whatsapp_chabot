export function buildCardPreviewMessage(data: any): string {
  return `
🪪 *I found these details from the card:*

👤 Name: ${data.name || "-"}
🏢 Company: ${data.company || "-"}
📞 Phone: ${data.phone || "-"}
📧 Email: ${data.email || "-"}
📍 Address: ${data.address || "-"}

👉 Reply with:
✅ *YES* – to save  
✏️ *EDIT email / phone / name* – to change  
❌ *NO* – to cancel
`;
}
