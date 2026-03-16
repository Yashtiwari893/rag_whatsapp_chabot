import axios from "axios";

const MISTRAL_API_URL = "https://api.mistral.ai/v1/embeddings";

export async function embedText(text: string, retries = 3): Promise<number[]> {
    const apiKey = process.env.MISTRAL_API_KEY;

    if (!apiKey) {
        throw new Error("MISTRAL_API_KEY is not configured");
    }

    const payload = JSON.stringify({
        model: "mistral-embed",
        input: [text],
    });

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const response = await axios.post(
                MISTRAL_API_URL,
                payload,
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${apiKey}`,
                    },
                }
            );

            const embedding = (response.data as any).data?.[0]?.embedding;
            if (!embedding || !Array.isArray(embedding)) {
                throw new Error("Invalid embedding response from Mistral API");
            }

            return embedding;
        } catch (error: any) {
            const statusCode = error.response?.status;
            
            if (statusCode === 429 && attempt < retries) {
                const waitTime = Math.pow(2, attempt) * 1000;
                console.log(`Rate limit hit. Retrying in ${waitTime / 1000}s...`);
                await new Promise((resolve) => setTimeout(resolve, waitTime));
                continue;
            }

            console.error("Embedding API Error:", error.response?.data || error.message);
            throw error;
        }
    }

    throw new Error("Failed to generate embedding after retries");
}
