import { extractTextFromImage } from "./ocrExtractor";
import { parseBusinessCardText } from "./cardParser";
import { CardScanResult } from "./cardTypes";

export async function processBusinessCard(
    imageUrl: string
): Promise<CardScanResult> {
    try {
        const rawText = await extractTextFromImage(imageUrl);

        const structuredData = await parseBusinessCardText(rawText);

        return {
            success: true,
            rawText,
            data: structuredData,
        };
    } catch (err) {
        return {
            success: false,
            error: err instanceof Error ? err.message : "Card scan failed",
        };
    }
}
