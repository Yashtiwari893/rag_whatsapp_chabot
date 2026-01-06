import axios from "axios";

/* -----------------------------------
 * TYPES (11za RESPONSE)
 * ----------------------------------- */
type ElevenZaMediaResponse = {
  success: boolean;
  data?: {
    base64: string;
  };
  message?: string;
};

/* -----------------------------------
 * DOWNLOAD MEDIA FROM 11za
 * ----------------------------------- */
export async function download11zaMedia(
  mediaUrl: string,
  authToken: string
): Promise<Buffer> {
  console.log("⬇️ Downloading media from 11za:", mediaUrl);

  const res = await axios.get<ElevenZaMediaResponse>(mediaUrl, {
    headers: {
      Authorization: authToken,
    },
  });

  if (!res.data?.success || !res.data?.data?.base64) {
    console.error("❌ Invalid 11za media response:", res.data);
    throw new Error("Failed to download media from 11za");
  }

  // ✅ Base64 → Buffer (SAFE)
  const buffer = Buffer.from(res.data.data.base64, "base64");

  console.log("✅ Media downloaded successfully");

  return buffer;
}
