import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// A "cached" instance of the Genkit AI object.
// This is a server-side module, so this variable will be preserved
// across function invocations in the same container.
let aiInstance: ReturnType<typeof genkit> | null = null;

/**
 * Returns a cached, lazily-initialized instance of the Genkit AI object.
 * This can help prevent initialization conflicts in server environments by
 * ensuring the AI plugins are only initialized when first needed.
 * @returns {ReturnType<typeof genkit>} The Genkit instance.
 */
export function getGenkitAi() {
    if (aiInstance) {
        return aiInstance;
    }
    
    aiInstance = genkit({
        plugins: [googleAI()],
        model: 'googleai/gemini-2.0-flash',
    });

    return aiInstance;
}
