import React, { useState, useCallback } from 'react';
import { generateColoringBookImages, GenerationMode, getTrendingNiches } from './services/geminiService';
import ImageCard from './components/ImageCard';
import Loader from './components/Loader';

const examplePrompts = [
    {
        title: "Baby Fox in Flowers",
        prompt: "Cute baby fox sitting among simple flowers and butterflies, bold thick outlines, clear shapes, easy for kids, with small fun details like mushrooms and leaves."
    },
    {
        title: "Smiling Dinosaur in Jungle",
        prompt: "Friendly cartoon dinosaur surrounded by simple trees, clouds, and leaves, bold outlines, easy shapes, small details like tiny rocks and flowers."
    }
];

/**
 * Parses a string to find multiple prompts in a specific format (e.g., numbered list with quotes).
 * @param text The text from the textarea.
 * @returns An array of prompts if multiple are found, otherwise an empty array.
 */
const parseMultiPrompts = (text: string): string[] => {
  // Regex to find numbered list items with quoted prompts (handles “...” and "...").
  const regex = /\d+\.\s*.*[\r\n]+[“"]([^”"]+)[”"]/g;
  const prompts: string[] = [];
  const matches = Array.from(text.matchAll(regex));

  for (const match of matches) {
    if (match[1]) {
      prompts.push(match[1].trim());
    }
  }
  return prompts;
};


const App: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('A friendly cartoon dragon sitting in a field of flowers');
  const [numberOfImages, setNumberOfImages] = useState<number>(1);
  const [generationMode, setGenerationMode] = useState<GenerationMode>('both');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<{ original: string | null; coloring: string | null }[]>([]);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  
  const [trendingNiches, setTrendingNiches] = useState<string[]>([]);
  const [isFetchingNiches, setIsFetchingNiches] = useState<boolean>(false);
  const [nicheError, setNicheError] = useState<string | null>(null);


  const handleGenerate = useCallback(async (event: React.FormEvent) => {
    event.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setGeneratedImages([]);

    const individualPrompts = parseMultiPrompts(prompt);
    const promptsToGenerate = individualPrompts.length > 0 
      ? individualPrompts 
      : Array(numberOfImages).fill(prompt.trim());
    
    const totalToGenerate = promptsToGenerate.length;
    setGenerationProgress({ current: 0, total: totalToGenerate });

    try {
        const results = [];
        for (let i = 0; i < totalToGenerate; i++) {
            setGenerationProgress({ current: i + 1, total: totalToGenerate });
            const currentPrompt = promptsToGenerate[i];
            const { originalImage, coloringPageImage } = await generateColoringBookImages(currentPrompt, generationMode);
            const newImagePair = {
                original: originalImage ? `data:image/png;base64,${originalImage}` : null,
                coloring: coloringPageImage ? `data:image/png;base64,${coloringPageImage}` : null,
            };
            results.push(newImagePair);
            setGeneratedImages([...results]); // Update state incrementally
        }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, isLoading, generationMode, numberOfImages]);

  const handleDownloadAll = useCallback(() => {
    if (generatedImages.length === 0) return;

    const downloadImage = (url: string, filename: string) => {
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    try {
        generatedImages.forEach(({ original, coloring }, index) => {
            const fileIndex = generatedImages.length > 1 ? `-${index + 1}` : '';
            
            if (original) {
                downloadImage(original, `original-image${fileIndex}.png`);
            }
            if (coloring) {
                downloadImage(coloring, `coloring-page${fileIndex}.png`);
            }
        });
    } catch (err) {
        setError("Failed to download images. Please try again.");
        console.error("Failed to download images:", err);
    }
  }, [generatedImages]);

  const handleFetchNiches = useCallback(async () => {
    setIsFetchingNiches(true);
    setNicheError(null);
    setTrendingNiches([]);
    try {
        const niches = await getTrendingNiches();
        setTrendingNiches(niches);
    } catch (err) {
        setNicheError(err instanceof Error ? err.message : 'Could not fetch niches.');
    } finally {
        setIsFetchingNiches(false);
    }
  }, []);

  const handleNicheClick = (niche: string) => {
    setPrompt(`A coloring book page of: ${niche}, with intricate patterns and beautiful details. Use a clean, easy-to-color style with bold, solid, black lines. The final image must be strictly black and white.`);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 dark:bg-gray-900 dark:text-gray-200 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500">
            AI Coloring Book Generator
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">
            Turn your ideas into beautiful images and their coloring-book counterparts.
          </p>
        </header>

        <main>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg mb-8">
            <form onSubmit={handleGenerate}>
              <div className="flex flex-col md:flex-row gap-4">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., A majestic lion with a crown of stars"
                  className="flex-grow p-4 bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-300 resize-none"
                  rows={5}
                  disabled={isLoading}
                  aria-label="Image generation prompt"
                />
                <div className="flex flex-col gap-4 items-center md:items-end">
                    <div className="flex items-center gap-2">
                        <label htmlFor="num-images" className="font-bold text-sm">Images:</label>
                        <input
                            type="number"
                            id="num-images"
                            value={numberOfImages}
                            onChange={(e) => setNumberOfImages(Math.max(1, Math.min(5, parseInt(e.target.value, 10) || 1)))}
                            min="1"
                            max="5"
                            aria-label="Number of images to generate"
                            className="w-20 p-2 text-center bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-300"
                            disabled={isLoading}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading || !prompt.trim()}
                        className="w-full px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {isLoading ? 'Generating...' : 'Generate'}
                    </button>
                </div>
              </div>
               <fieldset className="mt-4">
                  <legend className="sr-only">Generation Options</legend>
                  <div className="flex flex-wrap justify-center gap-x-6 gap-y-2" role="radiogroup">
                      <div className="flex items-center">
                          <input id="mode-both" name="generation-mode" type="radio" value="both" checked={generationMode === 'both'} onChange={() => setGenerationMode('both')} className="h-4 w-4 text-purple-600 border-gray-300 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600" />
                          <label htmlFor="mode-both" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Original & Coloring Page</label>
                      </div>
                      <div className="flex items-center">
                          <input id="mode-original" name="generation-mode" type="radio" value="original" checked={generationMode === 'original'} onChange={() => setGenerationMode('original')} className="h-4 w-4 text-purple-600 border-gray-300 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600" />
                          <label htmlFor="mode-original" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Original Only</label>
                      </div>
                      <div className="flex items-center">
                          <input id="mode-coloring" name="generation-mode" type="radio" value="coloring" checked={generationMode === 'coloring'} onChange={() => setGenerationMode('coloring')} className="h-4 w-4 text-purple-600 border-gray-300 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600" />
                          <label htmlFor="mode-coloring" className="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Coloring Page Only</label>
                      </div>
                  </div>
              </fieldset>
            </form>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg mb-8">
            <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-gray-200">Prompt Inspiration</h3>
            
            <div className="mb-6">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Discover popular themes to spark your creativity.</p>
                <button
                    onClick={handleFetchNiches}
                    disabled={isFetchingNiches || isLoading}
                    className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-teal-400 to-blue-500 rounded-full hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isFetchingNiches ? 'Fetching...' : 'Get Trending Niches'}
                </button>
                {nicheError && <p className="text-sm text-red-500 mt-2">{nicheError}</p>}
                {trendingNiches.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2" aria-live="polite">
                        {trendingNiches.map((niche, index) => (
                            <button
                                key={index}
                                onClick={() => handleNicheClick(niche)}
                                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-200 dark:bg-gray-700 dark:text-gray-200 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                            >
                                {niche}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <hr className="my-6 border-gray-200 dark:border-gray-700" />

            <h4 className="text-md font-bold mb-4 text-gray-800 dark:text-gray-200">Or try a pre-made prompt format:</h4>
            <div className="space-y-4">
                {examplePrompts.map((p, index) => (
                    <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <p className="font-bold text-gray-900 dark:text-gray-100">{index + 1}. {p.title}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">“{p.prompt}”</p>
                        <button 
                            onClick={() => setPrompt(`${examplePrompts[0].title}\n“${examplePrompts[0].prompt}”\n\n${examplePrompts[1].title}\n“${examplePrompts[1].prompt}”`)}
                            disabled={isLoading}
                            className="mt-3 px-4 py-1.5 text-sm font-semibold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/50 rounded-full hover:bg-purple-200 dark:hover:bg-purple-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Use this multi-prompt format
                        </button>
                    </div>
                ))}
            </div>
          </div>


          {isLoading && <Loader progress={generationProgress} />}

          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg shadow-md" role="alert">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}

          {generatedImages.length > 0 && !isLoading && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {generatedImages.map((imagePair, index) => (
                      <React.Fragment key={index}>
                          {imagePair.original && (
                              <ImageCard
                                  imageUrl={imagePair.original}
                                  title={`Original Image ${generatedImages.length > 1 ? `#${index + 1}` : ''}`}
                                  altText={`AI generated original image ${index + 1} with color`}
                              />
                          )}
                          {imagePair.coloring && (
                              <ImageCard
                                  imageUrl={imagePair.coloring}
                                  title={`Coloring Page ${generatedImages.length > 1 ? `#${index + 1}` : ''}`}
                                  altText={`AI generated coloring page ${index + 1} in black and white`}
                              />
                          )}
                      </React.Fragment>
                  ))}
              </div>
              <div className="text-center">
                 <button
                    onClick={handleDownloadAll}
                    className="mt-4 px-8 py-4 bg-gradient-to-r from-green-400 to-blue-500 text-white font-bold rounded-xl shadow-md hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300"
                  >
                    Download All Images
                  </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;