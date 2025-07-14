import {genkit, type Genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// A "cached" instance of the Genkit AI object.
// This is a server-side module, so this variable will be preserved
// across function invocations in the same container.
let aiInstance: Genkit | null = null;

/**
 * Returns a cached, lazily-initialized instance of the Genkit AI object.
 * This can help prevent initialization conflicts in server environments by
 * ensuring the AI plugins are only initialized when first needed.
 * @returns {Genkit} The Genkit instance.
 */
export function getGenkitAi(): Genkit {
    if (aiInstance) {
        return aiInstance;
    }
    
    aiInstance = genkit({
        plugins: [googleAI()],
    });

    return aiInstance;
}
