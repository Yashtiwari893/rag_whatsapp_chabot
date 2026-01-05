import Groq from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY!,
});

export async function extractTextFromImage(
    imageUrl: string
): Promise<string> {
    const completion = await groq.chat.completions.create({
        model: "llama-3.2-11b-vision-preview",
        temperature: 0,
        messages: [
            {
                role: "system",
                content:
                    "Extract ALL readable text from this business card image. Return plain text only.",
            },
            {
                role: "user",
                content: [
                    { type: "text", text: "Extract text from this image" },
                    {
                        type: "image_url",
                        image_url: { url: imageUrl },
                    },
                ],
            },
        ],
    });

    const text = completion.choices[0].message.content;

    if (!text) {
        throw new Error("OCR extraction failed");
    }

    return text.trim();
}
