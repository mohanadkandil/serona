import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { audio } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    const DEEPGRAM_API_KEY = Deno.env.get('DEEPGRAM_API_KEY');
    if (!DEEPGRAM_API_KEY) {
      throw new Error('DEEPGRAM_API_KEY not configured');
    }

    // Convert base64 to binary
    const binaryString = atob(audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    console.log('Sending audio to Deepgram, size:', bytes.length);

    // Send to Deepgram
    const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-2-medical&smart_format=true&punctuate=true&diarize=true', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'audio/webm',
      },
      body: bytes,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Deepgram API error:', response.status, errorText);
      throw new Error(`Deepgram API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Deepgram response:', JSON.stringify(result, null, 2));

    const words = result.results?.channels?.[0]?.alternatives?.[0]?.words || [];
    
    if (words.length === 0) {
      throw new Error('No transcription returned from Deepgram');
    }

    // Extract patient name from first few words (doctor mentions it)
    let patientName = 'Patient';
    const firstWords = words.slice(0, 20).map((w: any) => w.punctuated_word || w.word).join(' ');
    
    // Look for common patterns like "Mr./Mrs./Ms. [Name]" or just capitalize first name
    const namePatterns = [
      /(?:Mr\.?|Mrs\.?|Ms\.?|Miss|Doctor|Dr\.?)\s+([A-Z][a-z]+)/,
      /\b([A-Z][a-z]+)\b/
    ];
    
    for (const pattern of namePatterns) {
      const match = firstWords.match(pattern);
      if (match && match[1]) {
        patientName = match[1];
        break;
      }
    }

    // Format transcription with speaker labels
    let formattedTranscript = '';
    let currentSpeaker = -1;
    let currentSentence = '';

    for (const word of words) {
      const speaker = word.speaker ?? 0;
      
      if (speaker !== currentSpeaker) {
        // Save previous sentence if exists
        if (currentSentence.trim()) {
          formattedTranscript += currentSentence.trim() + '\n\n';
        }
        
        // Start new speaker section
        currentSpeaker = speaker;
        const speakerLabel = speaker === 0 ? 'Doctor' : patientName;
        currentSentence = `${speakerLabel}: ${word.punctuated_word || word.word}`;
      } else {
        currentSentence += ` ${word.punctuated_word || word.word}`;
      }
    }
    
    // Add the last sentence
    if (currentSentence.trim()) {
      formattedTranscript += currentSentence.trim();
    }

    return new Response(
      JSON.stringify({ transcription: formattedTranscript.trim() }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in transcribe-audio:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
