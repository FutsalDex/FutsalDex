
/**
 * @fileOverview Initializes and configures the Genkit AI instance.
 * This file centralizes the Genkit setup to be imported by other parts of the AI system.
 */
import {genkit, type Genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

let aiInstance: Genkit | null = null;

/**
 * Returns a cached, lazily-initialized instance of the Genkit AI object.
 * This can help prevent initialization conflicts in server environments by
 * ensuring the AI plugins are only initialized when first needed.
 * @returns {Genkit} The Genkit instance.
 */
export function initializeGenkit(): Genkit {
  if (aiInstance) {
    return aiInstance;
  }

  aiInstance = genkit({
    plugins: [googleAI()],
  });

  return aiInstance;
}
