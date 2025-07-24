
import {genkit, type GenkitConfig} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// When running in a Firebase environment, Genkit can automatically
// use the environment's service account credentials.
// Explicitly providing the apiKey can sometimes cause issues with
// API key restrictions in Google Cloud.
const genkitConfig: GenkitConfig = {
  plugins: [
    googleAI(),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
};

// Initialize Genkit with the explicit configuration
export const ai = genkit(genkitConfig);
