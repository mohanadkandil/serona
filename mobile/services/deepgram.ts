const DEEPGRAM_API_KEY = process.env.EXPO_PUBLIC_DEEPGRAM_API_KEY || '';

export async function transcribeAudio(audioUri: string): Promise<string> {
  if (!DEEPGRAM_API_KEY) {
    throw new Error(
      'Deepgram API key not found. Please set EXPO_PUBLIC_DEEPGRAM_API_KEY in your .env file'
    );
  }

  try {
    // Create FormData and append the audio file
    const formData = new FormData();
    formData.append('file', {
      uri: audioUri,
      type: 'audio/wav',
      name: 'audio.wav',
    } as any);

    // Send to Deepgram API
    const response = await fetch(
      'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true',
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        },
        body: formData,
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
