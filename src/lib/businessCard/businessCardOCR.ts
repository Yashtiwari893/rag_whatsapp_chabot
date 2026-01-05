import Groq from "groq-sdk";
import { supabase } from "../supabaseClient"; // ✅ FIXED PATH

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

export async function processBusinessCard(
  imageUrl: string,
  fromNumber: string
): Promise<BusinessCardResult> {
  try {
    /* -----------------------------------
     * 1️⃣ OCR + STRUCTURING
     * ----------------------------------- */
    const completion = await groq.chat.completions.create({
      model: "llama-3.2-90b-vision-preview",
      temperature: 0,
      messages: [
        {
          role: "system",
          content: `
You are an expert business card reader.

TASK:
1. Read the business card image
2. Extract contact details
3. Return STRICT JSON only

FIELDS:
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
- NO explanations, ONLY JSON
          `,
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
      return { success: false, error: "Empty OCR response" };
    }

    /* -----------------------------------
     * 2️⃣ SAFE JSON PARSE
     * ----------------------------------- */
    let structuredData;
    try {
      structuredData = JSON.parse(rawResponse);
    } catch {
      return { success: false, error: "Invalid JSON from OCR" };
    }

    /* -----------------------------------
     * 3️⃣ STORE SESSION
     * ----------------------------------- */
    await supabase.from("card_scan_sessions").insert([
      {
        from_number: fromNumber,
        image_url: imageUrl,
        raw_text: rawResponse,
        structured_data: structuredData,
        status: "pending",
      },
    ]);

    return {
      success: true,
      data: structuredData,
      rawText: rawResponse,
    };
  } catch (error) {
    console.error("Business Card OCR Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "OCR failed",
    };
  }
}
