import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { speechToText } from "@/lib/speechToText";
import { generateAutoResponse } from "@/lib/autoResponder";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    console.log("📩 Webhook Received");

    if (!payload?.messageId || !payload?.from || !payload?.to) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    /* --------------------------------------------------
     * 1️⃣ SAVE RAW MESSAGE (SAFE)
     * -------------------------------------------------- */
    await supabase.from("whatsapp_messages").insert([
      {
        message_id: payload.messageId,
        channel: payload.channel,
        from_number: payload.from,
        to_number: payload.to,
        received_at: payload.receivedAt,
        content_type: payload.content?.contentType,
        content_text: payload.content?.text || null,
        sender_name: payload.whatsapp?.senderName || null,
        event_type: payload.event,
        raw_payload: payload,
      },
    ]);

    if (payload.event !== "MoMessage") {
      return NextResponse.json({ success: true });
    }

    /* --------------------------------------------------
     * 2️⃣ NORMALIZE MESSAGE (Handle Text & Voice)
     * -------------------------------------------------- */
    let finalText: string | null = null;
    let mediaUrl: string | null = null;

    if (payload.content?.contentType === "text") {
      finalText = payload.content.text?.trim() || null;
    }

    if (payload.content?.contentType === "media") {
      mediaUrl = payload.content.media?.url || null;

      // Handle Voice Messages
      if (
        payload.content.media?.type === "voice" ||
        payload.content.media?.type === "audio"
      ) {
        console.log("🎤 Voice message detected, starting STT...");
        const stt = await speechToText(mediaUrl!);
        finalText = stt?.text?.trim() || null;
        console.log("📝 Transcription result:", finalText);
      }
    }

    /* --------------------------------------------------
     * 3️⃣ ROUTE TO RAG AUTO-RESPONDER
     * -------------------------------------------------- */
    console.log("🤖 Routing to RAG Auto-Responder");
    const result = await generateAutoResponse(
      payload.from,
      payload.to,
      finalText || payload.content?.text || null,
      payload.messageId,
      mediaUrl || undefined
    );

    return NextResponse.json({ 
      success: true, 
      responded: result.success,
      error: result.error 
    });

  } catch (err) {
    console.error("🔥 WEBHOOK ERROR:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
