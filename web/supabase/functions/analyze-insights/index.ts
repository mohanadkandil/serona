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
    const { transcription } = await req.json();
    
    if (!transcription) {
      throw new Error('No transcription provided');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const systemPrompt = `You are a medical insights assistant. Analyze the patient-doctor conversation and provide 3-5 concise, actionable insights.

Focus on:
- Urgency and priority of issues
- Follow-up actions needed
- Specialist referrals required
- Treatment compliance concerns
- Risk factors or complications

Return ONLY a JSON array of strings with clear, professional medical insights. DO NOT use emojis.
Format: ["insight 1", "insight 2", "insight 3"]

Example format:
["Patient reports constant pain affecting daily life. Prioritize pain management and follow-up.", "Schedule follow-up in 2 weeks to assess treatment effectiveness.", "Referral to orthopedist planned if symptoms persist."]`;

    console.log('Calling Lovable AI to analyze insights...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this conversation and provide insights:\n\n${transcription}` }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const result = await response.json();
    const aiResponse = result.choices[0].message.content;
    
    console.log('AI Response:', aiResponse);

    // Parse the JSON response
    const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from AI response');
    }

    const insights = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify({ insights }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-insights:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        insights: ['✓ Analysis unavailable']
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});