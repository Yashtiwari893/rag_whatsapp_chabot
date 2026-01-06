import Groq from "groq-sdk";
import { supabase } from "../supabaseClient"; // ✅ correct relative path

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

/* -----------------------------------
 * TYPES
 * ----------------------------------- */
export type BusinessCardData = {
  name: string;
  phone: string;
  email: string;
  company: string;
  designation: string;
  address: string;
};

export type BusinessCardResult = {
  success: boolean;
  data?: BusinessCardData;
  rawText?: string;
  error?: string;
};

/* -----------------------------------
 * MAIN OCR FUNCTION
 * ----------------------------------- */
export async function processBusinessCard(
  imageUrl: string,
  fromNumber: string
): Promise<BusinessCardResult> {
  try {
    console.log("🪪 Starting OCR for:", imageUrl);

    /* -----------------------------------
     * 1️⃣ OCR + STRUCTURING (VISION MODEL)
     * ----------------------------------- */
    const completion = await groq.chat.completions.create({
      model: "llama-3.2-90b-vision-preview",
      temperature: 0,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content: `
You are an expert business card reader.

TASK:
- Read the business card image
- Extract contact details
- Return STRICT JSON only

JSON FORMAT:
{
  "name": "",
  "phone": "",
  "email": "",
  "company": "",
  "designation": "",
  "address": ""
}

RULES:
- Phone must include country code if visible
- If field not found, return empty string
- NO explanations
- NO markdown
- ONLY pure JSON
          `.trim(),
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
    });

    const rawResponse = completion.choices[0]?.message?.content;

    if (!rawResponse) {
      console.error("❌ Empty OCR response");
      return { success: false, error: "Empty OCR response" };
    }

    console.log("📄 OCR Raw Response:", rawResponse);

    /* -----------------------------------
     * 2️⃣ SAFE JSON PARSE
     * ----------------------------------- */
    let structuredData: BusinessCardData;

    try {
      structuredData = JSON.parse(rawResponse);
    } catch (err) {
      console.error("❌ JSON parse failed:", err);
      return {
        success: false,
        error: "OCR returned invalid JSON",
        rawText: rawResponse,
      };
    }

    /* -----------------------------------
     * 3️⃣ BASIC DATA NORMALIZATION
     * ----------------------------------- */
    structuredData = {
      name: structuredData.name || "",
      phone: structuredData.phone || "",
      email: structuredData.email || "",
      company: structuredData.company || "",
      designation: structuredData.designation || "",
      address: structuredData.address || "",
    };

    /* -----------------------------------
     * 4️⃣ STORE SESSION IN DB
     * ----------------------------------- */
    const { error: dbError } = await supabase
      .from("card_scan_sessions")
      .insert([
        {
          from_number: fromNumber,
          image_url: imageUrl,
          raw_text: rawResponse,
          structured_data: structuredData,
          status: "pending", // ⏳ confirmation phase
        },
      ]);

    if (dbError) {
      console.error("❌ DB insert failed:", dbError);
      return {
        success: false,
        error: "Failed to save scan session",
      };
    }

    console.log("✅ OCR + DB save successful");

    return {
      success: true,
      data: structuredData,
      rawText: rawResponse,
    };
  } catch (error) {
    console.error("🔥 Business Card OCR Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "OCR failed",
    };
  }
}
