/**
 * OpenAI Realtime API Token Service
 *
 * IMPORTANT: You need to set up a backend endpoint to generate ephemeral tokens
 * Never expose your OpenAI API key in the client-side code!
 *
 * Example backend (Node.js/Express):
 *
 * app.post('/api/openai/token', async (req, res) => {
 *   const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
 *     method: 'POST',
 *     headers: {
 *       'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
 *       'Content-Type': 'application/json',
 *     },
 *     body: JSON.stringify({
 *       model: 'gpt-4o-realtime-preview-2024-12-17',
 *       voice: 'alloy',
 *     }),
 *   });
 *   const data = await response.json();
 *   res.json(data);
 * });
 */

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

export async function getOpenAIEphemeralToken(): Promise<string> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/openai/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get token: ${response.statusText}`);
    }

    const data = await response.json();
    return data.client_secret.value;
  } catch (error) {
    console.error('Error getting OpenAI token:', error);
    throw new Error('Failed to initialize real-time session. Please check your backend configuration.');
  }
}
