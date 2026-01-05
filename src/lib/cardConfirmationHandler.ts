import { supabase } from "./supabaseClient";

export type ConfirmationDecision =
  | "confirmed"
  | "cancelled"
  | { editField: string; newValue: string }
  | null;

export async function handleConfirmationReply(
  fromNumber: string,
  message: string
): Promise<ConfirmationDecision> {
  const text = message.toLowerCase().trim();

  if (["yes", "save", "ok"].includes(text)) {
    return "confirmed";
  }

  if (["no", "cancel"].includes(text)) {
    return "cancelled";
  }

  // ✏️ edit email john@gmail.com
  if (text.startsWith("edit")) {
    const parts = text.split(" ");
    if (parts.length >= 3) {
      return {
        editField: parts[1],
        newValue: parts.slice(2).join(" "),
      };
    }
  }

  return null;
}
