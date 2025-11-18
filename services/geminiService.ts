
import { GoogleGenAI, Modality, Type } from "@google/genai";

// Cache the GoogleGenAI instance to avoid re-initializing
let ai: GoogleGenAI | null = null;

/**
 * Returns a cached instance of the GoogleGenAI client.
 * Initializes the client on the first call.
 * Throws an error if the API key is not available.
 */
const getAiClient = (): GoogleGenAI => {
    if (!ai) {
        if (!process.env.API_KEY) {
            // This error will now be caught by the calling function's try/catch block
            // instead of crashing the app on load.
            throw new Error("API_KEY environment variable not set");
        }
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
};


export type GenerationMode = 'both' | 'original' | 'coloring';

// Helper to generate the initial colored image
const generateOriginalImage = async (prompt: string): Promise<string> => {
    console.log("Generating original image...");
    const colorImagePrompt = `A vibrant, full-color image of: ${prompt}`;

    const response = await getAiClient().models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [{ text: colorImagePrompt }],
        },
        config: {
            responseModalities: [Modality.IMAGE],
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
const generateColoringPageFromImage = async (imageBase64: string): Promise<string> => {
    console.log("Generating coloring page from image...");
    const coloringPagePrompt = "Transform the provided image into a simple coloring book page with a clean, easy-to-color style. Use bold, solid, black lines. The final image must be strictly black and white, with no colors, shading, or gray tones. Focus on creating clear outlines and open spaces perfect for coloring.";

    const response = await getAiClient().models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: imageBase64, mimeType: 'image/png' } },
                { text: coloringPagePrompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
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
const generateColoringPageFromPrompt = async (prompt: string): Promise<string> => {
    console.log("Generating coloring page directly from prompt...");
    const coloringPagePrompt = `A coloring book page of: ${prompt}. Use a clean, easy-to-color style with bold, solid, black lines. The final image must be strictly black and white, with no colors, shading, or gray tones. Focus on creating clear outlines and open spaces perfect for coloring.`;

    const response = await getAiClient().models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [{ text: coloringPagePrompt }],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const imagePart = response.candidates?.[0]?.content?.parts?.find(part => 'inlineData' in part);

    if (!imagePart || !('inlineData' in imagePart) || !imagePart.inlineData?.data) {
        console.error("Invalid response structure for coloring page from prompt:", JSON.stringify(response, null, 2));
        throw new Error("Failed to generate coloring page from prompt. The model did not return valid image data.");
    }
    
    return imagePart.inlineData.data;
};


export const generateColoringBookImages = async (prompt: string, mode: GenerationMode): Promise<{ originalImage: string | null, coloringPageImage: string | null }> => {
    try {
        if (mode === 'original') {
            const originalImageBase64 = await generateOriginalImage(prompt);
            return { originalImage: originalImageBase64, coloringPageImage: null };
        }

        if (mode === 'coloring') {
            const coloringPageBase64 = await generateColoringPageFromPrompt(prompt);
            return { originalImage: null, coloringPageImage: coloringPageBase64 };
        }

        if (mode === 'both') {
            const originalImageBase64 = await generateOriginalImage(prompt);
            const coloringPageBase64 = await generateColoringPageFromImage(originalImageBase64);
            return {
                originalImage: originalImageBase64,
                coloringPageImage: coloringPageBase64,
            };
        }

        // Fallback for exhaustive check, though typescript should prevent this.
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
