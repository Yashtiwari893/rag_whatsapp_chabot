import { supabase } from "@/lib/supabaseClient";

export async function handleConfirmationReply(
    fromNumber: string,
    userText: string
): Promise<"confirmed" | "rejected" | "edit" | null> {
    const normalized = userText.toLowerCase().trim();

    if (normalized === "yes") return "confirmed";
    if (normalized === "no") return "rejected";
    if (normalized.startsWith("edit")) return "edit";

    return null;
}
