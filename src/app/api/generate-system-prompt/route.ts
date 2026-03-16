import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { supabase } from "@/lib/supabaseClient";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { intent, phone_number } = body;

        if (!intent || !phone_number) {
            return NextResponse.json(
                { error: "Intent and phone_number are required" },
                { status: 400 }
            );
        }

        console.log("Generating system prompt for intent:", intent);

        const completion = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            temperature: 0.6,
            max_tokens: 500,
            messages: [
                {
                    role: "system",
                    content: `
You are a senior Conversational AI system prompt designer.

Your task is to generate a SYSTEM PROMPT for a WhatsApp chatbot.

STRICT BEHAVIOR RULES:

1. Language Mirroring (Very Important)
- The chatbot MUST reply in the SAME language and style as the user.
- Hindi → Hindi
- English → English
- Hinglish → Hinglish
- Mixed / broken language → reply naturally in the same way
- Do NOT mention language detection.

2. Human-like Conversation
- Replies must sound natural, warm, and human.
- Professional but friendly tone.
- Light emojis allowed (😊 👍), never overuse.
- WhatsApp-style short and clear messages.
- No robotic or scripted responses.

3. Knowledge Boundary Rule
- Answer only from available information.
- NEVER mention words like:
  "document", "documents", "data source", "dataset", "knowledge base", "training data".

4. Fallback Rule (Critical)
If an exact answer is NOT available:
- Politely say the information is not available right now.
- Offer help with something else.
- Be human and respectful.
- Do NOT explain why data is missing.

Fallback examples:
- Hinglish: "Is topic pe abhi exact info available nahi hai 😊 Aap kuch aur pooch sakte ho."
- Hindi: "Is vishay par abhi jaankari uplabdh nahi hai 😊 Aap koi aur sawaal pooch sakte hain."
- English: "I don’t have the right information on this yet 😊 Feel free to ask something else."

5. Personalization
- If user name is known, use it naturally.
- Example: "Hi Rahul 😊", "Thanks for reaching out, Ayesha!"

Generate ONLY the system prompt text.
No explanation, no formatting.
Keep it under 250 words.
                    `.trim(),
                },
                {
                    role: "user",
                    content: `
Create a system prompt for a WhatsApp chatbot with this intent:

"${intent}"
                    `.trim(),
                },
            ],
        });

        const systemPrompt = completion.choices[0]?.message?.content?.trim();

        if (!systemPrompt) {
            console.error("❌ Groq returned no content");
            throw new Error("LLM failed to generate content. Please check your Groq API quota or model availability.");
        }

        console.log("✅ Generated system prompt successfully");

        // Check if phone number already exists
        const { data: existingMappings, error: fetchError } = await supabase
            .from("phone_document_mapping")
            .select("*")
            .eq("phone_number", phone_number);

        if (fetchError) {
            console.error("❌ Supabase fetch error:", fetchError);
            throw new Error(`Database fetch failed: ${fetchError.message}`);
        }

        if (existingMappings && existingMappings.length > 0) {
            console.log("📝 Updating existing mapping...");
            const { error: updateError } = await supabase
                .from("phone_document_mapping")
                .update({
                    intent,
                    system_prompt: systemPrompt,
                })
                .eq("phone_number", phone_number);

            if (updateError) {
                console.error("❌ Supabase update error:", updateError);
                throw new Error(`Database update failed: ${updateError.message}. Did you run the migration?`);
            }
        } else {
            console.log("➕ Inserting new mapping...");
            const { error: insertError } = await supabase
                .from("phone_document_mapping")
                .insert({
                    phone_number,
                    intent,
                    system_prompt: systemPrompt,
                    file_id: null, // This requires file_id to be nullable in DB
                });

            if (insertError) {
                console.error("❌ Supabase insert error:", insertError);
                throw new Error(`Database insert failed: ${insertError.message}. Check if file_id is nullable.`);
            }
        }

        return NextResponse.json({
            success: true,
            system_prompt: systemPrompt,
            intent,
        });

    } catch (error: any) {
        console.error("🔥 SYSTEM PROMPT API ERROR:", error);

        return NextResponse.json(
            {
                success: false,
                error: error.message || "An unexpected error occurred",
                details: error.hint || undefined
            },
            { status: 500 }
        );
    }
}
