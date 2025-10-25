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
    const { transcriptions } = await req.json();
    
    if (!transcriptions || transcriptions.length === 0) {
      return new Response(
        JSON.stringify({ 
          condition: "General Medical Care",
          clinics: []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Combine all transcriptions for analysis
    const combinedText = transcriptions.join('\n\n');

    const systemPrompt = `You are a medical specialist assistant. Analyze patient conversations and provide comprehensive next steps including specialist clinics, medications, and other recommendations.

IMPORTANT: Suggest clinics that are geographically relevant to the patient's location. If the patient is in Germany (mentioned in appointments), prioritize German clinics, especially in Bavaria/Munich area.

Provide:
1. Condition: Primary medical condition identified
2. Clinics: 3-4 relevant specialized clinics with:
   - name: Full clinic/hospital name (use real, well-known clinics when possible)
   - location: City, State/Region
   - country: Country (match patient's region when possible)
   - specialization: Their specific area of expertise related to the condition
   - successRate: A realistic metric (e.g., "95% patient satisfaction")
   - contact: Realistic phone number format for that country
   - website: Realistic website URL
   - expertise: Array of 3 specific areas they excel in
3. Medications: 3-5 commonly prescribed medications for this condition with:
   - name, type (e.g., "NSAID", "Muscle Relaxant"), dosage (typical range), purpose, sideEffects (array of 2-3 common ones)
4. Additional Steps: 3-4 other recommendations with:
   - title, description, priority ("high", "medium", "low"), category (e.g., "Lifestyle", "Follow-up Test", "Diet")

Return ONLY a JSON object in this exact format:
{
  "condition": "Primary medical condition identified",
  "clinics": [array of clinic objects],
  "medications": [array of medication objects],
  "additionalSteps": [array of additional recommendation objects]
}`;

    console.log('Calling Lovable AI to analyze clinics...');

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
          { role: 'user', content: `Analyze these patient conversations and provide comprehensive next steps including clinics, medications, and other recommendations:\n\n${combinedText}` }
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
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from AI response');
    }

    const analysisResult = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify(analysisResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-clinics:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        condition: "General Medical Care",
        clinics: []
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});