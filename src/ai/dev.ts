
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    // When running in a Firebase environment, Genkit can automatically
    // use the environment's service account credentials.
    // We don't need to specify an API key here.
    googleAI(),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
