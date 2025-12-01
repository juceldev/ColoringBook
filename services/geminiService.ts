
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { AspectRatio, Resolution } from "../types";

// Cache the GoogleGenAI instance to avoid re-initializing
let ai: GoogleGenAI | null = null;

/**
 * Returns a cached instance of the GoogleGenAI client.
 * Initializes the client on the first call.
 * Throws an error if the API key is not available.
 * 
 * Re-initializes if a key update is detected/requested via external state changes
 * (handled by creating a new instance when needed in the flow).
 */
const getAiClient = (): GoogleGenAI => {
    // If apiKey is selected via window.aistudio, we might need to refresh the client
    // But typically process.env.API_KEY is updated. 
    // For safety in this specific "Pro" flow, we often re-instantiate if needed, 
    // but the singleton pattern is usually fine if process.env.API_KEY is stable.
    // However, to support the dynamic key selection flow for Pro models properly:
    if (!ai) {
         if (!process.env.API_KEY) {
            throw new Error("API_KEY environment variable not set");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
};

// Reset client to force re-reading API key (useful after user selects a paid key)
export const resetAiClient = () => {
    ai = null;
};


export type GenerationMode = 'both' | 'original' | 'coloring';

interface GenerationConfig {
    aspectRatio: AspectRatio;
    resolution?: Resolution; // Optional/Legacy as we now use Nano Banana exclusively
}

const getModelName = () => {
    // Explicitly use the "Nano Banana" model (gemini-2.5-flash-image)
    return 'gemini-2.5-flash-image';
};

const getImageConfig = (config: GenerationConfig) => {
    const baseConfig: any = {
        aspectRatio: config.aspectRatio,
    };
    
    // gemini-2.5-flash-image does NOT support imageSize '2K'/'4K'.
    // We strictly use the base config supported by Nano Banana.
    
    return baseConfig;
};

// Helper to generate the initial colored image
const generateOriginalImage = async (prompt: string, config: GenerationConfig): Promise<string> => {
    console.log(`Generating original image (${config.aspectRatio}) with Nano Banana...`);
    const colorImagePrompt = `Create a masterpiece, high-quality, vibrant, full-color illustration of: ${prompt}. Use rich, vivid colors and a polished, professional digital art style. Ensure the image is sharp, clear, highly detailed, and visually stunning.`;
    
    const model = getModelName();
    const imageConfig = getImageConfig(config);

    const response = await getAiClient().models.generateContent({
        model: model,
        contents: {
            parts: [{ text: colorImagePrompt }],
        },
        config: {
            responseModalities: [Modality.IMAGE],
            imageConfig: imageConfig,
        },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => 'inlineData' in part);

    if (!imagePart || !('inlineData' in imagePart) || !imagePart.inlineData?.data) {
        console.error("Invalid response structure for original image:", JSON.stringify(response, null, 2));
        throw new Error("Failed to generate original image. The model did not return valid image data.");
    }
    
    return imagePart.inlineData.data;
};

// Helper to generate a coloring page from a base image
const generateColoringPageFromImage = async (imageBase64: string, config: GenerationConfig): Promise<string> => {
    console.log("Generating coloring page from image with Nano Banana...");
    const coloringPagePrompt = "Create a strictly black and white line art version of this image for a coloring book. Use ONLY black lines on a white background. Do NOT use any color, shading, grayscale, or gradients. The style must be clean, bold vector art with clear outlines suitable for coloring. Focus on the structural lines of the subject.";

    const model = getModelName();
    const imageConfig = getImageConfig(config);

    const response = await getAiClient().models.generateContent({
        model: model,
        contents: {
            parts: [
                { inlineData: { data: imageBase64, mimeType: 'image/png' } },
                { text: coloringPagePrompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
            imageConfig: imageConfig,
        },
    });

    const coloringPagePart = response.candidates?.[0]?.content?.parts?.find(part => 'inlineData' in part);

    if (!coloringPagePart || !('inlineData' in coloringPagePart) || !coloringPagePart.inlineData?.data) {
        console.error("Invalid response structure for coloring page:", JSON.stringify(response, null, 2));
        throw new Error("Failed to generate coloring page. The model did not return valid image data.");
    }

    return coloringPagePart.inlineData.data;
};

// Helper to generate a coloring page directly from a text prompt
const generateColoringPageFromPrompt = async (prompt: string, config: GenerationConfig): Promise<string> => {
    console.log(`Generating coloring page directly from prompt (${config.aspectRatio}) with Nano Banana...`);
    const coloringPagePrompt = `Generate a black and white coloring book page of: ${prompt}. The image must be strictly LINE ART ONLY. Use only black outlines on a pure white background. Absolutely NO colors, NO grayscale, NO shading, and NO filled areas. The lines should be clean, bold, and continuous. Create a high-contrast vector style illustration.`;

    const model = getModelName();
    const imageConfig = getImageConfig(config);

    const response = await getAiClient().models.generateContent({
        model: model,
        contents: {
            parts: [{ text: coloringPagePrompt }],
        },
        config: {
            responseModalities: [Modality.IMAGE],
            imageConfig: imageConfig,
        },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => 'inlineData' in part);

    if (!imagePart || !('inlineData' in imagePart) || !imagePart.inlineData?.data) {
        console.error("Invalid response structure for coloring page from prompt:", JSON.stringify(response, null, 2));
        throw new Error("Failed to generate coloring page from prompt. The model did not return valid image data.");
    }
    
    return imagePart.inlineData.data;
};


export const generateColoringBookImages = async (
    prompt: string, 
    mode: GenerationMode,
    config: GenerationConfig = { aspectRatio: '1:1', resolution: 'standard' }
): Promise<{ originalImage: string | null, coloringPageImage: string | null }> => {
    try {
        if (mode === 'original') {
            const originalImageBase64 = await generateOriginalImage(prompt, config);
            return { originalImage: originalImageBase64, coloringPageImage: null };
        }

        if (mode === 'coloring') {
            const coloringPageBase64 = await generateColoringPageFromPrompt(prompt, config);
            return { originalImage: null, coloringPageImage: coloringPageBase64 };
        }

        if (mode === 'both') {
            const originalImageBase64 = await generateOriginalImage(prompt, config);
            const coloringPageBase64 = await generateColoringPageFromImage(originalImageBase64, config);
            return {
                originalImage: originalImageBase64,
                coloringPageImage: coloringPageBase64,
            };
        }

        throw new Error(`Invalid generation mode provided: ${mode}`);

    } catch (error) {
        console.error("Error in Gemini service:", error);
        if (error instanceof Error) {
           throw new Error(`Failed to generate images: ${error.message}`);
        }
        throw new Error("An unknown error occurred during image generation.");
    }
};

export const getTrendingNiches = async (): Promise<string[]> => {
    try {
        console.log("Fetching trending niches...");
        const prompt = "What are 5 current trending and popular niches for coloring books for adults and kids? Provide just the list of niche names in a JSON object with a key 'niches'.";
        
        const response = await getAiClient().models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        niches: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.STRING,
                                description: "A popular coloring book niche theme."
                            }
                        }
                    }
                }
            }
        });

        const jsonString = response.text.trim();
        const parsed = JSON.parse(jsonString);

        if (parsed && Array.isArray(parsed.niches)) {
            return parsed.niches;
        } else {
            console.error("Failed to parse niches from response:", jsonString);
            throw new Error("Could not parse the list of trending niches from the AI response.");
        }

    } catch (error) {
        console.error("Error fetching trending niches:", error);
        if (error instanceof Error) {
            throw new Error(`Failed to fetch trending niches: ${error.message}`);
        }
        throw new Error("An unknown error occurred while fetching trending niches.");
    }
};
