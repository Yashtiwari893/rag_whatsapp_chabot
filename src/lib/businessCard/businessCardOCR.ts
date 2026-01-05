import Groq from "groq-sdk";
import { supabase } from "./supabaseClient";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

export type BusinessCardResult = {
  success: boolean;
  data?: {
    name: string;
    phone: string;
    email: string;
    company: string;
    designation: string;
    address: string;
  };
  rawText?: string;
  error?: string;
};

/* --------------------------------------------------
 * 🪪 BUSINESS CARD OCR + STRUCTURING (PHASE-2)
 * -------------------------------------------------- */
export async function processBusinessCard(
  imageUrl: string,
  fromNumber: string
): Promise<BusinessCardResult> {
  try {
    /* -----------------------------------
     * 1️⃣ GROQ VISION OCR
     * ----------------------------------- */
    const completion = await groq.chat.completions.create({
      model: "llama-3.2-90b-vision-preview",
      temperature: 0,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content: `
You are an expert business card reader AI.

TASK:
- Read the business card image
- Extract contact details
- Return ONLY valid JSON

OUTPUT FORMAT (STRICT):
{
  "name": "",
  "phone": "",
  "email": "",
  "company": "",
  "designation": "",
  "address": ""
}

RULES:
- If value not found → empty string
- Phone must include country code if visible
- NO markdown
- NO explanation
- ONLY JSON
          `.trim(),
        },
        {
          role: "user",
          content: `Here is the business card image: ${imageUrl}`,
        },
      ],
    });

    const rawResponse = completion.choices[0]?.message?.content;

    if (!rawResponse) {
      return { success: false, error: "Empty OCR response from AI" };
    }

    /* -----------------------------------
     * 2️⃣ SAFE JSON EXTRACTION
     * ----------------------------------- */
    let structuredData: BusinessCardResult["data"];

    try {
      // 🔥 Handle cases where model adds text before/after JSON
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        return {
          success: false,
          error: "No JSON found in OCR response",
        };
      }

      structuredData = JSON.parse(jsonMatch[0]);

      // 🧼 Normalize fields
      structuredData = {
        name: structuredData?.name || "",
        phone: structuredData?.phone || "",
        email: structuredData?.email || "",
        company: structuredData?.company || "",
        designation: structuredData?.designation || "",
        address: structuredData?.address || "",
      };
    } catch (err) {
      console.error("JSON parse failed:", rawResponse);
      return {
        success: false,
        error: "Failed to parse OCR JSON",
      };
    }

    /* -----------------------------------
     * 3️⃣ STORE OCR SESSION (PENDING)
     * ----------------------------------- */
    await supabase.from("card_scan_sessions").insert([
      {
        from_number: fromNumber,
        image_url: imageUrl,
        raw_text: rawResponse,
        extracted_data: structuredData,
        status: "pending",
      },
    ]);

    return {
      success: true,
      data: structuredData,
      rawText: rawResponse,
    };
  } catch (error) {
    console.error("❌ Business Card OCR Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Business card OCR failed",
    };
  }
}
