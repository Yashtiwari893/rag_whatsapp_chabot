import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { generateAutoResponse } from "@/lib/autoResponder";
import { speechToText } from "@/lib/speechToText";
import { processBusinessCard } from "@/lib/businessCard/businessCardOCR";
import { handleConfirmationReply } from "@/lib/businessCard/confirmationHandler";
import { buildCardPreviewMessage } from "@/lib/businessCard/whatsappPreview";
import { sendWhatsAppMessage } from "@/lib/whatsappSender";

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    console.log("📩 Webhook Received:", payload);

    if (!payload.messageId || !payload.from || !payload.to) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    /* --------------------------------------------------
     * 1️⃣ FETCH WHATSAPP CONFIG (CRITICAL FIX)
     * -------------------------------------------------- */
    const { data: phoneConfig } = await supabase
      .from("phone_document_mapping")
      .select("auth_token, origin")
      .eq("phone_number", payload.to)
      .single();

    if (!phoneConfig?.auth_token || !phoneConfig?.origin) {
      console.error("❌ WhatsApp config missing");
      return NextResponse.json({ success: false });
    }

    const { auth_token, origin } = phoneConfig;

    /* --------------------------------------------------
     * 2️⃣ SAVE RAW MESSAGE
     * -------------------------------------------------- */
    const { error } = await supabase.from("whatsapp_messages").insert([
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

    if (error && error.code !== "23505") throw error;

    if (payload.event !== "MoMessage") {
      return NextResponse.json({ success: true });
    }

    /* --------------------------------------------------
     * 3️⃣ MESSAGE NORMALIZATION
     * -------------------------------------------------- */
    let finalText: string | null = null;
    let mediaUrl: string | null = null;
    let isImage = false;

    if (payload.content.contentType === "text") {
      finalText = payload.content.text?.trim() || null;
    }

    if (payload.content.contentType === "media") {
      mediaUrl = payload.content.media?.url || null;

      if (
        payload.content.media?.type === "image" ||
        payload.content.media?.mimeType?.startsWith("image/")
      ) {
        isImage = true;
      }

      if (
        payload.content.media?.type === "voice" ||
        payload.content.media?.type === "audio"
      ) {
        const stt = await speechToText(mediaUrl!);
        finalText = stt?.text?.trim() || null;
      }
    }

    /* --------------------------------------------------
     * 4️⃣ IMAGE → OCR PIPELINE (PHASE-2)
     * -------------------------------------------------- */
    if (isImage && mediaUrl) {
      const scan = await processBusinessCard(mediaUrl, payload.from);

      if (!scan.success || !scan.data) {
        await sendWhatsAppMessage(
          payload.from,
          "❌ Sorry, I couldn’t read this card. Please send a clearer image.",
          auth_token,
          origin
        );
        return NextResponse.json({ success: true });
      }

      const preview = buildCardPreviewMessage(scan.data);

      await sendWhatsAppMessage(
        payload.from,
        preview,
        auth_token,
        origin
      );

      return NextResponse.json({ success: true, routed: "ocr" });
    }

    /* --------------------------------------------------
     * 5️⃣ PHASE-3 CONFIRMATION / EDIT HANDLER
     * -------------------------------------------------- */
    if (finalText) {
      const decision = handleConfirmationReply(finalText);

      if (decision) {
        const { data: session } = await supabase
          .from("card_scan_sessions")
          .select("*")
          .eq("from_number", payload.from)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!session) return NextResponse.json({ success: true });

        // ✅ CONFIRM
        if (decision === "confirmed") {
          await supabase
            .from("card_scan_sessions")
            .update({ status: "confirmed" })
            .eq("id", session.id);

          await sendWhatsAppMessage(
            payload.from,
            "✅ Contact saved successfully! 😊",
            auth_token,
            origin
          );

          return NextResponse.json({ success: true });
        }

        // ❌ CANCEL
        if (decision === "cancelled") {
          await supabase
            .from("card_scan_sessions")
            .update({ status: "cancelled" })
            .eq("id", session.id);

          await sendWhatsAppMessage(
            payload.from,
            "❌ No worries! Scan cancelled.",
            auth_token,
            origin
          );

          return NextResponse.json({ success: true });
        }

        // ✏️ EDIT FLOW
        if (typeof decision === "object") {
          const updated = {
            ...session.structured_data,
            [decision.editField]: decision.newValue,
          };

          await supabase
            .from("card_scan_sessions")
            .update({ structured_data: updated })
            .eq("id", session.id);

          const preview = buildCardPreviewMessage(updated);

          await sendWhatsAppMessage(
            payload.from,
            preview,
            auth_token,
            origin
          );

          return NextResponse.json({ success: true });
        }
      }
    }

    /* --------------------------------------------------
     * 6️⃣ NORMAL CHAT → EXISTING AI BOT
     * -------------------------------------------------- */
    if (finalText) {
      await generateAutoResponse(
        payload.from,
        payload.to,
        finalText,
        payload.messageId
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("WEBHOOK ERROR:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
