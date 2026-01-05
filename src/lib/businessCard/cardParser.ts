import Groq from "groq-sdk";
import { BusinessCardData } from "./cardTypes";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY!,
});

export async function parseBusinessCardText(
    rawText: string
): Promise<BusinessCardData> {
    const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        temperature: 0,
        messages: [
            {
                role: "system",
                content: `
You are an AI that extracts contact details from business card text.

Rules:
- Return ONLY valid JSON
- Empty fields = null
- Do NOT guess
- Clean phone numbers and emails

JSON format:
{
  "name": "",
  "phone": "",
  "email": "",
  "company": "",
  "designation": "",
  "address": "",
  "website": ""
}
`,
            },
            {
                role: "user",
                content: rawText,
            },
        ],
    });

    const content = completion.choices[0].message.content;

    if (!content) {
        throw new Error("Card parsing failed");
    }

    return JSON.parse(content);
}
