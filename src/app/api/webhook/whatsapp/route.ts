import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";
import { speechToText } from "@/lib/speechToText";
import { processBusinessCard } from "@/lib/businessCard/businessCardOCR";
import { handleConfirmationReply } from "@/lib/businessCard/confirmationHandler";
import { buildCardPreviewMessage } from "@/lib/businessCard/whatsappPreview";
import { sendWhatsAppMessage } from "@/lib/whatsappSender";

/* -----------------------------------
 * TYPES
 * ----------------------------------- */
type EditDecision = {
  type: "edit";
  editField: string;
  newValue: string;
};

type ConfirmationDecision =
  | "confirmed"
  | "rejected"
  | EditDecision
  | null;

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    console.log("📩 Webhook Received");

    if (!payload?.messageId || !payload?.from || !payload?.to) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    /* --------------------------------------------------
     * 1️⃣ FETCH WHATSAPP CONFIG (11za)
     * -------------------------------------------------- */
    const { data: phoneConfig } = await supabase
      .from("phone_document_mapping")
      .select("auth_token, origin")
      .eq("phone_number", payload.to)
      .single();

    if (!phoneConfig) {
      console.error("❌ WhatsApp config missing");
      return NextResponse.json({ success: false });
    }

    const { auth_token, origin } = phoneConfig;

    /* --------------------------------------------------
     * 2️⃣ SAVE RAW MESSAGE (SAFE)
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
     * 3️⃣ NORMALIZE MESSAGE
     * -------------------------------------------------- */
    let finalText: string | null = null;
    let mediaUrl: string | null = null;
    let isImage = false;

    if (payload.content?.contentType === "text") {
      finalText = payload.content.text?.trim() || null;
    }

    if (payload.content?.contentType === "media") {
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
     * 4️⃣ IMAGE → OCR PIPELINE
     * -------------------------------------------------- */
    if (isImage && mediaUrl) {
      console.log("🪪 Image received → OCR");

      const scan = await processBusinessCard(mediaUrl, payload.from);

      if (!scan.success || !scan.data) {
        await sendWhatsAppMessage(
          payload.from,
          "❌ Card read nahi ho paya. Please clear image bheje.",
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

      return NextResponse.json({ success: true, routed: "ocr_preview" });
    }

    /* --------------------------------------------------
     * 5️⃣ CONFIRMATION / EDIT HANDLER
     * -------------------------------------------------- */
    if (finalText) {
      const decision = (await handleConfirmationReply(
        finalText,
        "auto"
      )) as ConfirmationDecision;

      if (!decision) {
        return NextResponse.json({ success: true });
      }

      const { data: session } = await supabase
        .from("card_scan_sessions")
        .select("*")
        .eq("from_number", payload.from)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!session) {
        return NextResponse.json({ success: true });
      }

      // ✅ CONFIRM
      if (decision === "confirmed") {
        await supabase
          .from("card_scan_sessions")
          .update({ status: "confirmed" })
          .eq("id", session.id);

        await sendWhatsAppMessage(
          payload.from,
          "✅ Card saved successfully!",
          auth_token,
          origin
        );

        return NextResponse.json({ success: true });
      }

      // ❌ REJECT
      if (decision === "rejected") {
        await supabase
          .from("card_scan_sessions")
          .update({ status: "cancelled" })
          .eq("id", session.id);

        await sendWhatsAppMessage(
          payload.from,
          "❌ Scan cancelled.",
          auth_token,
          origin
        );

        return NextResponse.json({ success: true });
      }

      // ✏️ EDIT
      if (typeof decision === "object" && decision.type === "edit") {
        const updatedData = {
          ...session.structured_data,
          [decision.editField]: decision.newValue,
        };

        await supabase
          .from("card_scan_sessions")
          .update({ structured_data: updatedData })
          .eq("id", session.id);

        const preview = buildCardPreviewMessage(updatedData);

        await sendWhatsAppMessage(
          payload.from,
          preview,
          auth_token,
          origin
        );

        return NextResponse.json({ success: true });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("🔥 WEBHOOK ERROR:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
