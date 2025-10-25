import { openai } from '@ai-sdk/openai';
import {streamText, UIMessage, convertToModelMessages, generateObject, generateText} from "ai";
import { z } from 'zod';



export async function POST(req: Request) {
    const model = "openai/gpt-4o"

    // the full transcription of the patient data
    const { transcription } = await req.json();


    // TODO: PII check (later)

    // classification prompt
    const { object: classification } = await generateObject({
        model,
        schema: z.object({
          reasoning: z.string(),
          type: z.enum(['RESEARCH_AGENT', 'NORMAL']),
          complexity: z.enum(['simple', 'complex']),
        }),
        prompt: `Classify this customer query:
        ${transcription}
    
        You are a medical transcription analyst. Analyze the following patient-provider session transcript and provide a structured assessment.

# TRANSCRIPT
{transcription}

# YOUR TASK
Provide a comprehensive analysis following this exact structure:

## 1. SESSION SUMMARY
- Brief overview of the visit (2-3 sentences)
- Primary complaints/concerns discussed
- Patient demographics mentioned (age, relevant medical history)

## 2. CRITICAL FINDINGS 
Identify and flag ANY of the following as CRITICAL:
- Severe symptoms requiring immediate attention (chest pain, difficulty breathing, severe bleeding, suicidal ideation, etc.)
- Dangerous vital signs or test results
- Medication interactions or contraindications
- Symptoms suggesting emergency conditions (stroke, heart attack, anaphylaxis, etc.)
- Mental health crisis indicators
- Any mention of harm to self or others

Format: **[CRITICAL - IMMEDIATE ACTION REQUIRED]** followed by specific finding and urgency level (EMERGENT/URGENT/PRIORITY)

## 3. KEY MEDICAL INSIGHTS
- Diagnosis mentioned or suspected
- Symptoms and their severity
- Treatment plan discussed
- Medications prescribed or adjusted
- Follow-up appointments scheduled
- Patient concerns or questions

## 4. ITEMS REQUIRING RESEARCH
List specific medical terms, conditions, medications, or procedures that need additional investigation:
- Rare conditions mentioned
- Unfamiliar medications or dosages
- Complex drug interactions
- Unusual symptom combinations
- Latest treatment protocols needed
- Specific medical guidelines referenced


## 5. NEXT ACTIONS FOR ROUTING
Specify which specialized agents should be invoked:
- RESEARCH_AGENT: If rare conditions, complex cases, or latest medical guidelines needed
- NORMAL: like no research is needed
## 6. CARE QUALITY NOTES
- Documentation completeness
- Patient understanding/education provided
- Adherence to clinical guidelines
- Communication effectiveness`,
      });
    
    // Router/orchestrator

    const { text: response } = await generateText({
        model:
          classification.complexity === 'simple'
            ? 'openai/gpt-4o-mini'
            : 'openai/o4-mini',
        system: {
          general:
            'You are an expert customer service agent handling general inquiries.',
          refund:
            'You are a customer service agent specializing in refund requests. Follow company policy and collect necessary information.',
          technical:
            'You are a technical support specialist with deep product knowledge. Focus on clear step-by-step troubleshooting.',
        }[classification.type],
        prompt: transcription,
      });

      console.log("🚀 ~ POST ~ classification:", classification)
      return {response, classification}


    // Research Agent

    // Agent to check the output
    

}