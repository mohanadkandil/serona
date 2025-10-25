import * as FileSystem from 'expo-file-system';

const DEEPGRAM_API_KEY = process.env.EXPO_PUBLIC_DEEPGRAM_API_KEY || '';

export async function transcribeAudio(audioUri: string): Promise<string> {
  if (!DEEPGRAM_API_KEY) {
    throw new Error(
      'Deepgram API key not found. Please set EXPO_PUBLIC_DEEPGRAM_API_KEY in your .env file'
    );
  }

  try {
    // Read the audio file as base64
    const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to binary for upload
    const response = await fetch(
      'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true',
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${DEEPGRAM_API_KEY}`,
          'Content-Type': 'audio/wav',
        },
        body: base64ToBlob(audioBase64, 'audio/wav'),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Deepgram API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    // Extract transcript from Deepgram response
    const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript;

    if (!transcript) {
      throw new Error('No transcript found in response');
    }

    return transcript;
  } catch (error) {
    console.error('Transcription error:', error);
    throw error;
  }
}

// Helper function to convert base64 to Blob
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}
