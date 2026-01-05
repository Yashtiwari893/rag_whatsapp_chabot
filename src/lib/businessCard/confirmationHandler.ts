import { supabase } from "@/lib/supabaseClient";

export type ConfirmationDecision =
    | "confirmed"
    | "rejected"
    | { type: "edit"; editField: string; newValue: string }
    | null;

export async function handleConfirmationReply(
    message: string,
    _mode?: string
): Promise<ConfirmationDecision> {
    const text = message.toLowerCase().trim();

    if (["yes", "y", "save", "ok"].includes(text)) return "confirmed";

    if (["no", "n", "reject", "cancel"].includes(text)) return "rejected";

    // parse: "edit <field> <new value...>"
    if (text.startsWith("edit")) {
        const parts = text.split(" ");
        if (parts.length >= 3) {
            const editField = parts[1];
            const newValue = message.slice(message.indexOf(editField) + editField.length).trim();
            return { type: "edit", editField, newValue };
        }
    }

    return null;
}
