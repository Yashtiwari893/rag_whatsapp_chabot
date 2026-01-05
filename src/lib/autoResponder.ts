import { supabase } from "./supabaseClient";
import { embedText } from "./embeddings";
import { retrieveRelevantChunksFromFiles } from "./retrieval";
import { getFilesForPhoneNumber } from "./phoneMapping";
import { sendWhatsAppMessage } from "./whatsappSender";
import { speechToText } from "./speechToText";
import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY!,
});

export type AutoResponseResult = {
    success: boolean;
    response?: string;
    error?: string;
    noDocuments?: boolean;
    sent?: boolean;
};

/* ---------------- LANGUAGE DETECTION ---------------- */
async function detectLanguage(text: string): Promise<string> {
    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            temperature: 0,
            messages: [
                {
                    role: "system",
                    content:
                        "Detect the language of the text. Reply with ONLY the language name like English, Hindi, Gujarati.",
                },
                { role: "user", content: text },
            ],
        });

        return completion.choices[0].message.content?.toLowerCase() || "english";
    } catch {
        return "english";
    }
}

/* ---------------- WHATSAPP RESPONSE FORMATTER ---------------- */
function formatWhatsAppResponse(text: string): string {
    return text
        .replace(/\n{3,}/g, "\n\n")
        .trim()
        .slice(0, 900);
}

/* ---------------- MAIN AUTO RESPONDER ---------------- */
export async function generateAutoResponse(
    fromNumber: string,
    toNumber: string,
    messageText: string | null,
    messageId: string,
    mediaUrl?: string
): Promise<AutoResponseResult> {
    try {
        /* 1️⃣ Files mapped to this business number */
        const fileIds = await getFilesForPhoneNumber(toNumber);

        if (fileIds.length === 0) {
            return {
                success: false,
                noDocuments: true,
                error: "No data configured for this number",
            };
        }

        /* 2️⃣ Phone configuration */
        const { data: phoneMappings } = await supabase
            .from("phone_document_mapping")
            .select("system_prompt, auth_token, origin")
            .eq("phone_number", toNumber)
            .limit(1);

        if (!phoneMappings || phoneMappings.length === 0) {
            return { success: false, error: "Phone configuration not found" };
        }

        const { system_prompt, auth_token, origin } = phoneMappings[0];

        if (!auth_token || !origin) {
            return { success: false, error: "WhatsApp credentials missing" };
        }

        /* 3️⃣ Normalize user input (TEXT / VOICE) */
        let finalUserText = messageText?.trim() || "";
        let detectedLanguage = "english";

        if (!finalUserText && mediaUrl) {
            const transcript = await speechToText(mediaUrl);
            if (!transcript) {
                return { success: false, error: "Voice transcription failed" };
            }
            finalUserText = transcript.text.trim();
            detectedLanguage =
                transcript.language || (await detectLanguage(finalUserText));
        }

        if (finalUserText) {
            detectedLanguage = await detectLanguage(finalUserText);
        }

        if (!finalUserText) {
            return { success: false, error: "Empty message" };
        }

        /* 4️⃣ Fetch conversation history (last 20) */
        const { data: historyRows } = await supabase
            .from("whatsapp_messages")
            .select("content_text, event_type, sender_name")
            .or(`from_number.eq.${fromNumber},to_number.eq.${fromNumber}`)
            .order("received_at", { ascending: true })
            .limit(20);

        const history = (historyRows || [])
            .filter((m) => m.content_text)
            .map((m) => ({
                role: m.event_type === "MoMessage" ? "user" : "assistant",
                content: m.content_text,
            }));

        const userName =
            historyRows?.find((h) => h.sender_name)?.sender_name || "";

        /* 5️⃣ RAG retrieval */
        const queryEmbedding = await embedText(finalUserText);
        if (!queryEmbedding) {
            return { success: false, error: "Embedding failed" };
        }

        const matches = await retrieveRelevantChunksFromFiles(
            queryEmbedding,
            fileIds,
            5
        );

        const contextText = matches.map((m) => m.chunk).join("\n\n");

        /* 6️⃣ SYSTEM PROMPT (STRICT BEHAVIOR RULES) */
        const systemPrompt = `
${system_prompt || "You are a helpful WhatsApp assistant."}

You are a professional, friendly, human-like WhatsApp assistant.

STRICT RULES (VERY IMPORTANT):
- NEVER mention documents, PDFs, files, sources, uploads, or data origins.
- NEVER explain where your knowledge comes from.
- Replies must feel natural, not robotic or scripted.
- Keep replies short, clear, and WhatsApp-friendly.
- Use light emojis naturally (😊👍). No overuse.
- Always reply in the same language as the user.

USER NAME:
If available, start naturally using the user's name.
Example: "Hi Rahul 😊,"

FALLBACK RULE:
If you don’t have enough information, say politely:
"Mere paas is topic par abhi exact data available nahi hai."
Then ask a helpful follow-up question.

LANGUAGE:
Reply in ${detectedLanguage}.

CONTEXT (use only if helpful):
${contextText || ""}
`;

        /* 7️⃣ LLM GENERATION */
        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            temperature: 0.3,
            max_tokens: 500,
            messages: [
                { role: "system", content: systemPrompt },
                ...history.slice(-10),
                { role: "user", content: finalUserText },
            ],
        });

        let response = completion.choices[0].message.content;

        if (!response) {
            return { success: false, error: "Empty AI response" };
        }

        response = formatWhatsAppResponse(response);

        /* 8️⃣ Send WhatsApp message */
        const sendResult = await sendWhatsAppMessage(
            fromNumber,
            response,
            auth_token,
            origin
        );

        if (!sendResult.success) {
            return { success: false, error: sendResult.error };
        }

        /* 9️⃣ Save AI message */
        await supabase.from("whatsapp_messages").insert([
            {
                message_id: `auto_${messageId}_${Date.now()}`,
                channel: "whatsapp",
                from_number: toNumber,
                to_number: fromNumber,
                received_at: new Date().toISOString(),
                content_type: "text",
                content_text: response,
                sender_name: "AI Assistant",
                event_type: "MtMessage",
                is_in_24_window: true,
                raw_payload: { auto: true },
            },
        ]);

        /* 🔟 Mark original message responded */
        await supabase
            .from("whatsapp_messages")
            .update({
                auto_respond_sent: true,
                response_sent_at: new Date().toISOString(),
            })
            .eq("message_id", messageId);

        return {
            success: true,
            response,
            sent: true,
        };
    } catch (error) {
        console.error("Auto-response error:", error);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}
