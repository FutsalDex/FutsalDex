
import {genkit, type GenkitConfig} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Construct the configuration with the API key
const genkitConfig: GenkitConfig = {
  plugins: [
    googleAI({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    }),
  ],
};

// Initialize Genkit with the explicit configuration
export const ai = genkit(genkitConfig);
