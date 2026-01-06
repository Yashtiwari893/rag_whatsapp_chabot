import axios from "axios";

export async function download11zaMedia(mediaUrl: string): Promise<Buffer> {
  console.log("⬇️ Downloading media from 11za:", mediaUrl);

  const res = await axios.post(
    "https://api.11za.in/apis/media/get",
    { mediaUrl },
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_11ZA_AUTH_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.data?.success || !res.data?.data?.base64) {
    throw new Error("Failed to download media from 11za");
  }

  return Buffer.from(res.data.data.base64, "base64");
}
