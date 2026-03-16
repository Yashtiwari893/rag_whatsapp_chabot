import { EdgeTTS } from "edge-tts-universal";

/**
 * FREE & High-Quality Text to Speech using Microsoft Edge TTS
 * No API Key required, no usage limits.
 */
export async function textToSpeech(text: string, language: string = "english"): Promise<Buffer> {
  try {
    console.log(`🔊 Converting text to speech (${language}) using Edge TTS...`);
    
    // Clean text (remove markdown-like symbols that might sound weird)
    const cleanText = text.replace(/[*_#]/g, "").trim();
    
    // Voice selection based on language
    const langMap: Record<string, string> = {
      english: "en-US-AriaNeural",
      hindi: "hi-IN-SwaraNeural",
      gujarati: "gu-IN-SwaraNeural",
    };

    const voice = langMap[language.toLowerCase()] || "en-US-AriaNeural";

    // Initialize EdgeTTS with text and voice
    const tts = new EdgeTTS(cleanText, voice);
    
    // Synthesize returns a Promise<SynthesisResult>
    const result = await tts.synthesize();
    
    console.log("✅ Edge TTS synthesis successful");
    
    // result.audio is a Blob in Node.js/Browser
    const arrayBuffer = await result.audio.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error: any) {
    console.error("❌ Edge TTS Error:", error.message);
    throw new Error(`Failed to convert text to speech: ${error.message}`);
  }
}
