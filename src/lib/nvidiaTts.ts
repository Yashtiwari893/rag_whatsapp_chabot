import axios from "axios";

// NVIDIA Cloud Functions REST Endpoint
const NVIDIA_API_URL = "https://api.nvcf.nvidia.com/v2/nvcf/exec/functions/877104f7-e885-42b9-8de8-f6e4c6303969";

export async function textToSpeech(text: string, language: string = "english"): Promise<Buffer> {
  const apiKey = process.env.NVIDIA_API_KEY;

  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY is not configured in .env");
  }

  // Truncate text if it's too long for TTS (NVIDIA/NVCF often have limits)
  const truncatedText = text.length > 500 ? text.substring(0, 500) + "..." : text;

  console.log(`🔊 Converting text to speech (${language}) using NVIDIA Magpie (NVCF)...`);
  console.log(`📝 Text length: ${text.length}, Truncated length: ${truncatedText.length}`);

  const langMap: Record<string, string> = {
    english: "en-US",
    hindi: "hi-IN",
    gujarati: "gu-IN",
  };

  const languageCode = langMap[language.toLowerCase()] || "en-US";
  
  // Voice selection based on language
  const voice = languageCode === "hi-IN" ? "Magpie-Multilingual.HI-IN.Swarara" : "Magpie-Multilingual.EN-US.Aria";

  try {
    const response = await axios.post(
      NVIDIA_API_URL,
      {
        requestBody: {
          text: truncatedText,
          language_code: languageCode,
          voice: voice,
          encoding: "WAV", // Request WAV format
        }
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "audio/wav",
        },
        responseType: "arraybuffer",
      }
    );

    console.log("✅ NVIDIA TTS Response received");
    return Buffer.from(response.data as ArrayBuffer);
  } catch (error: any) {
    let errorDetail = error.message;
    if (error.response?.data) {
      try {
        const errorString = Buffer.from(error.response.data as ArrayBuffer).toString();
        errorDetail = errorString;
      } catch (e) {
        errorDetail = "Could not parse error response";
      }
    }
    console.error("❌ NVIDIA TTS Error Details:", errorDetail);
    throw new Error(`Failed to convert text to speech: ${errorDetail}`);
  }
}
