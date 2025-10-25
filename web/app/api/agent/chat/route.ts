export const runtime = 'edge';

import { openai } from '@ai-sdk/openai';
import { generateObject, generateText } from "ai";
import { z } from 'zod';

export async function POST(req: Request) {
    const model = openai('gpt-4o');

    // the full transcription of the patient data
    const { transcription } = await req.json();

    // TODO: PII check (later)

    // Step 1: Classification prompt
    const { object: classification } = await generateObject({
        model,
        schema: z.object({
          reasoning: z.string().describe('Brief explanation for the classification decision'),
          type: z.enum(['RESEARCH_AGENT', 'NORMAL']).describe('RESEARCH_AGENT if rare/complex case needing research, otherwise NORMAL'),
          complexity: z.enum(['simple', 'complex']).describe('simple for routine cases, complex for multi-system or unclear cases'),
        }),
        system: `You are a medical classification AI. Your job is to analyze medical transcripts and classify them into categories.

Return a JSON object with:
- reasoning: string explaining your decision
- type: "RESEARCH_AGENT" or "NORMAL"
- complexity: "simple" or "complex"`,
        prompt: `Classify this medical transcript:

"${transcription}"

Guidelines:
- RESEARCH_AGENT: rare conditions, complex drug interactions, unusual presentations, need for latest guidelines
- NORMAL: routine visits, common conditions, standard treatments
- simple: single issue, clear diagnosis
- complex: multiple issues, uncertain diagnosis, complex case`,
      });


    // Step 2: If RESEARCH_AGENT, create Exa research task
    let researchId = null;
    let researchData = null;

    if (classification.type === 'RESEARCH_AGENT') {
      console.log("🔬 Creating Exa research task for complex medical case...");

      const exaApiKey = process.env.EXA_API_KEY;

      if (!exaApiKey) {
        console.warn("⚠️ EXA_API_KEY not configured, skipping research");
      } else {
        try {
          // Create research task
          const researchResponse = await fetch('https://api.exa.ai/research/v1', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${exaApiKey}`,
            },
            body: JSON.stringify({
              model: classification.complexity === 'complex' ? 'exa-research-pro' : 'exa-research',
              instructions: `Research the following medical case for latest treatment protocols, rare conditions, and evidence-based recommendations:

Transcription: "${transcription}"

Classification reasoning: ${classification.reasoning}

Please research:
1. Latest clinical guidelines for mentioned conditions
2. Current treatment protocols and best practices
3. Drug interactions and contraindications
4. Specialist recommendations
5. Evidence-based recommendations from medical literature

Focus on providing actionable, evidence-based medical information.`,
            }),
          });

          const research = await researchResponse.json();
          researchId = research.researchId;

          console.log("🔬 Research task created:", researchId);

          // Poll for completion (with timeout)
          const maxPolls = 30; // 30 seconds max
          let polls = 0;

          while (polls < maxPolls) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

            const statusResponse = await fetch(`https://api.exa.ai/research/v1/${researchId}`, {
              headers: {
                'Authorization': `Bearer ${exaApiKey}`,
              },
            });

            const status = await statusResponse.json();

            if (status.status === 'completed') {
              researchData = status.output.content;
              console.log("✅ Research completed");
              break;
            } else if (status.status === 'failed') {
              console.error("❌ Research failed:", status.error);
              break;
            }

            polls++;
          }
        } catch (error) {
          console.error("❌ Exa research error:", error);
        }
      }
    }

    // Step 3: Generate medical analysis (with research if available)
    const analysisPrompt = researchData
      ? `Analyze this medical conversation using the research findings below:

TRANSCRIPTION:
"${transcription}"

RESEARCH FINDINGS:
${researchData}

Provide a comprehensive analysis incorporating the research findings with sections: Symptoms, Diagnoses, Medications, Follow-up Actions, Concerns, Research-Based Recommendations.`
      : `Analyze this medical conversation transcription:\n\n"${transcription}"\n\nProvide analysis with sections: Symptoms, Diagnoses, Medications, Follow-up Actions, Concerns.`;

    const { text: response } = await generateText({
        model: classification.complexity === 'simple' ? openai('gpt-4o-mini') : openai('gpt-4o'),
        system: classification.type === 'RESEARCH_AGENT'
          ? `You are an expert medical research analyst. Provide detailed analysis of complex medical cases with research-backed insights.

Your analysis should include:
1. SESSION SUMMARY - Brief overview and primary complaints
2. CRITICAL FINDINGS - Flag severe symptoms, dangerous vitals, medication issues (format: **[CRITICAL - IMMEDIATE ACTION REQUIRED]** with urgency level)
3. KEY MEDICAL INSIGHTS - Diagnosis, symptoms, treatment plan, medications, follow-ups
4. RESEARCH-BASED RECOMMENDATIONS - Evidence-based recommendations from latest medical literature
5. CARE QUALITY NOTES - Documentation completeness, patient education, guideline adherence`
          : `You are a medical AI assistant analyzing patient-doctor conversations.

Your role is to:
1. Extract key medical information and symptoms
2. Identify diagnoses or conditions discussed
3. Note any medications or treatments mentioned
4. Highlight follow-up actions or next steps
5. Flag any urgent concerns

Provide a structured, clear analysis that's helpful for medical record keeping.

IMPORTANT GUIDELINES:
- Be empathetic and non-judgmental in your analysis
- Consider health equity and social determinants of health
- Don't make assumptions about race, ethnicity, or socioeconomic status unless explicitly stated
- Focus on what helps provide better, more patient-centered care
- Respect patient autonomy and values even if different from medical recommendations
- Consider trauma-informed care principles`,
        prompt: analysisPrompt,
      });

      console.log("🚀 ~ POST ~ class type:", classification.type);
      console.log("🚀 ~ POST ~ response length:", response.length);

      // Step 4: Generate Patient Insights Analysis
      console.log("🔍 Generating patient insights...");
      const { text: patientInsights } = await generateText({
        model: openai('gpt-4o'),
        system: `You are a patient communication analyst specializing in understanding what patients are truly expressing during medical consultations. Analyze the patient's statements and extract deep insights beyond the surface-level medical facts.`,
        prompt: `You are a patient communication analyst specializing in understanding what patients are truly expressing during medical consultations. Analyze the patient's statements from the following transcript and extract deep insights beyond the surface-level medical facts.

# TRANSCRIPT
${transcription}

# YOUR ANALYSIS TASK

## 1. PATIENT'S PRIMARY CONCERNS
Identify what the patient is MOST worried about (often different from their stated chief complaint):
- **Stated concern**: What they explicitly said
- **Underlying concern**: What they're actually worried about (fear of cancer, impact on daily life, fear of being dismissed, financial concerns, etc.)
- **Concern severity**: How distressed are they? (Mild/Moderate/Severe)

## 2. EMOTIONAL STATE & MENTAL WELLBEING
Analyze the patient's emotional indicators:
- **Mood indicators**: Anxious, depressed, frustrated, fearful, hopeful, resigned
- **Stress levels**: Signs of acute or chronic stress
- **Coping mechanisms**: How are they handling their condition?
- **Mental health red flags**: Hopelessness, isolation, changes in sleep/appetite, substance use, self-harm ideation (FLAG AS CRITICAL)

## 3. COMMUNICATION PATTERNS
- **Clarity**: Articulate or struggling to express?
- **Minimization**: Downplaying symptoms?
- **Catastrophizing**: Expecting the worst?
- **Hesitations**: Uncomfortable topics?

## 4. HEALTH LITERACY & UNDERSTANDING
- **Understanding level**: Do they understand their condition?
- **Medical terminology use**: Accurate or confused?
- **Misconceptions detected**: Any dangerous misunderstandings?

## 5. SOCIAL & LIFESTYLE CONTEXT
- **Work situation**: Job demands, stress
- **Family dynamics**: Support system, caregiving responsibilities
- **Financial concerns**: Insurance worries, medication costs
- **Daily life impact**: How symptoms affect routine, relationships
- **Support system**: Who helps them?

## 6. BARRIERS TO CARE
- **Practical barriers**: Transportation, time off work, childcare
- **Financial barriers**: Cost concerns, insurance issues
- **Trust issues**: Past negative experiences
- **Cognitive barriers**: Memory issues, complexity of instructions

## 7. PATIENT EXPECTATIONS & GOALS
- **Explicit requests**: Tests, referrals, medications
- **Implicit needs**: Reassurance, validation, being heard
- **Treatment preferences**: What are they hoping for/against?
- **Quality of life priorities**: What matters most to them?

## 8. ADHERENCE INDICATORS
- **Past adherence**: Mentions of not finishing medications
- **Motivation level**: Eager to improve vs. resigned
- **Support for adherence**: Family help, routine

## 9. ACTIONABLE PATIENT INSIGHTS

**CRITICAL PATIENT NEEDS** (Immediate attention required):
- List urgent psychological/social needs

**COMMUNICATION RECOMMENDATIONS**:
- How should the provider adjust their communication?
- What reassurance does this patient need?

**CARE PLAN ADJUSTMENTS**:
- What accommodations would improve adherence?
- What referrals (social work, mental health, financial counseling) might help?

**RED FLAGS FOR ESCALATION** 🚨:
- Mental health crisis indicators
- Signs of abuse, neglect, or unsafe home environment
- Non-adherence risks with dangerous consequences

## 10. DIRECT PATIENT QUOTES
Extract revealing statements:
> "Direct quote from patient"
**Significance**: Why this matters

# IMPORTANT GUIDELINES
- Be empathetic and non-judgmental
- Consider health equity and social determinants of health
- Don't make assumptions about demographics unless explicitly stated
- Focus on patient-centered care
- Respect patient autonomy
- Consider trauma-informed care principles

Provide your analysis in clear sections with specific examples. Flag anything CRITICAL in bold with 🚨 emoji.`,
      });

      console.log("✅ Patient insights generated");

      return Response.json({
        response,
        classification,
        patientInsights,
        ...(researchId && { researchId }),
        ...(researchData && {
          researchIncluded: true,
          researchData: researchData
        }),
      });
}