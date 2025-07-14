import type { Genkit } from 'genkit';
import { initializeGenkit } from './init';

/**
 * Returns a cached, lazily-initialized instance of the Genkit AI object.
 * This function acts as a proxy to the main initialization logic,
 * ensuring it's only called when absolutely necessary.
 * @returns {Genkit} The Genkit instance.
 */
export function getGenkitAi(): Genkit {
    return initializeGenkit();
}
