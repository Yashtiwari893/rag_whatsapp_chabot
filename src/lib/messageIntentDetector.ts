type WhatsAppPayload = {
  content?: {
    contentType?: "text" | "media";
    text?: string;
    media?: {
      type?: string;
      url?: string;
    };
  };
};

export type MessageIntent =
  | "CARD_SCAN"
  | "VOICE_COMMAND"
  | "TEXT_COMMAND"
  | "UNKNOWN";

export function detectMessageIntent(
  payload: WhatsAppPayload
): MessageIntent {
  const contentType = payload.content?.contentType;

  // 📸 Image (Business Card)
  if (
    contentType === "media" &&
    payload.content?.media?.type?.startsWith("image")
  ) {
    return "CARD_SCAN";
  }

  // 🎤 Voice note
  if (
    contentType === "media" &&
    (payload.content?.media?.type === "audio" ||
      payload.content?.media?.type === "voice")
  ) {
    return "VOICE_COMMAND";
  }

  // 💬 Normal text
  if (contentType === "text") {
    return "TEXT_COMMAND";
  }

  return "UNKNOWN";
}
