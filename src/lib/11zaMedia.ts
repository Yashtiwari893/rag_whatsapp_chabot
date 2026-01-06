import axios from "axios";

/**
 * Expected response from 11za media API
 */
type ElevenZaMediaResponse = {
  success: boolean;
  data?: {
    base64?: string;
  };
};

export async function download11zaMedia(mediaUrl: string): Promise<Buffer> {
  console.log("⬇️ Downloading media from 11za:", mediaUrl);

  const res = await axios.get<ElevenZaMediaResponse>(mediaUrl, {
    timeout: 15000,
  });

  // ✅ SAFE TYPE CHECK
  if (!res.data.success || !res.data.data?.base64) {
    console.error("❌ Invalid 11za media response:", res.data);
    throw new Error("Failed to download media from 11za");
  }

  // Convert base64 → Buffer
  return Buffer.from(res.data.data.base64, "base64");
}
