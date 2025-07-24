
import {genkit, type GenkitConfig} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Construct the configuration with the API key from server-side environment variables
const genkitConfig: GenkitConfig = {
  plugins: [
    googleAI({
      apiKey: process.env.GEMINI_API_KEY, // Use the server-side key
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
};

// Initialize Genkit with the explicit configuration
export const ai = genkit(genkitConfig);
