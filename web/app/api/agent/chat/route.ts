export const runtime = 'edge';
export const maxDuration = 120; // Allow up to 2 minutes for research

import { openai } from '@ai-sdk/openai';
import { generateObject, generateText } from "ai";
import { z } from 'zod';

export async function POST(req: Request) {
    // the full transcription of the patient data
    const { transcription } = await req.json();

    // TODO: PII check (later)

    console.log("🤖 Starting agentic medical analysis workflow...");

    // ============================================================================
    // AGENT 1: TRIAGE & CLASSIFICATION AGENT
    // ============================================================================
    console.log("📋 [Agent 1/4] Triage & Classification...");

    const { object: classification } = await generateObject({
        model: openai('gpt-4o'),
        schema: z.object({
          reasoning: z.string().describe('Brief explanation for the classification decision'),
          type: z.enum(['RESEARCH_AGENT', 'NORMAL']).describe('RESEARCH_AGENT if rare/complex case needing research, otherwise NORMAL'),
          complexity: z.enum(['simple', 'complex']).describe('simple for routine cases, complex for multi-system or unclear cases'),
          urgency: z.enum(['routine', 'urgent', 'critical']).describe('urgency level based on symptoms'),
          primaryConcern: z.string().describe('main medical concern identified'),
        }),
        system: `You are a medical triage and classification AI agent. Your job is to rapidly analyze medical transcripts and classify them for appropriate routing.

Return a JSON object with:
- reasoning: string explaining your decision
- type: "RESEARCH_AGENT" or "NORMAL"
- complexity: "simple" or "complex"
- urgency: "routine", "urgent", or "critical"
- primaryConcern: brief statement of main medical issue`,
        prompt: `Classify this medical transcript:

"${transcription}"

Guidelines:
- RESEARCH_AGENT: rare conditions, complex drug interactions, unusual presentations, need for latest guidelines
- NORMAL: routine visits, common conditions, standard treatments
- simple: single issue, clear diagnosis
- complex: multiple issues, uncertain diagnosis, complex case
- urgency: consider symptom severity, duration, and potential complications`,
      });

    console.log(`✅ Classification complete: ${classification.type} | ${classification.complexity} | ${classification.urgency}`);


    // ============================================================================
    // PARALLEL EXECUTION: Fast agents (Patient Insights + Initial Analysis)
    // ============================================================================
    console.log("⚡ [Agents 2-3/4] Running parallel analysis (Patient Insights + Medical Analysis)...");

    const [patientInsightsResult, initialAnalysisResult] = await Promise.all([
      // AGENT 2: PATIENT COMMUNICATION ANALYST
      generateText({
        model: openai('gpt-4o'),
        system: `You are a patient communication analyst specializing in understanding what patients are truly expressing during medical consultations. Analyze the patient's statements and extract deep insights beyond the surface-level medical facts.

Output your analysis in well-formatted markdown with clear sections, bullet points, and emphasis where appropriate.`,
        prompt: `Analyze the patient's communication from this medical transcript and provide deep psychological and social insights.

# TRANSCRIPT
${transcription}

# ANALYSIS REQUIREMENTS

Provide your analysis in markdown format with these sections:

## 🎯 Primary Concerns
- **Stated Concern**: What they explicitly said
- **Underlying Concern**: What they're actually worried about
- **Severity**: How distressed are they? (Mild/Moderate/Severe)

## 💭 Emotional & Mental State
- Mood indicators and stress levels
- Coping mechanisms observed
- 🚨 Mental health red flags (if any)

## 🗣️ Communication Patterns
- How clearly they express themselves
- Signs of minimization or catastrophizing
- Topics they seem hesitant about

## 📚 Health Literacy
- Understanding of their condition
- Medical terminology use
- Dangerous misconceptions (if any)

## 🏠 Social Context
- Work/family situation
- Support system
- Financial or practical concerns
- Daily life impact

## 🚧 Barriers to Care
List any obstacles: transportation, costs, trust issues, cognitive barriers

## 🎯 Patient Goals & Expectations
What are they hoping for? What matters most to them?

## ⚠️ Critical Patient Needs
Flag urgent psychological/social needs with 🚨

## 💡 Actionable Recommendations
- Communication adjustments for provider
- Referrals needed (social work, mental health, financial counseling)
- Care plan accommodations to improve adherence

## 📝 Key Patient Quotes
> "Revealing quote from patient"

**Why this matters**: Significance

Use markdown formatting: **bold** for emphasis, bullet points, emojis for visual organization, and > for quotes.`,
      }),

      // AGENT 3: MEDICAL ANALYSIS AGENT (Initial - without research)
      generateText({
        model: classification.complexity === 'simple' ? openai('gpt-4o-mini') : openai('gpt-4o'),
        system: `You are an expert medical analysis AI. Provide detailed, structured analysis of medical conversations.

Output in well-formatted markdown with clear hierarchy, bullet points, and emphasis.

Your analysis should include:
1. **SESSION SUMMARY** - Brief overview and primary complaints
2. **CRITICAL FINDINGS** 🚨 - Flag severe symptoms, dangerous vitals, medication issues
3. **KEY MEDICAL INSIGHTS** - Diagnosis, symptoms, treatment plan, medications, follow-ups
4. **CARE QUALITY NOTES** - Documentation completeness, patient education, guideline adherence

IMPORTANT GUIDELINES:
- Be empathetic and non-judgmental
- Consider health equity and social determinants
- Don't make demographic assumptions unless stated
- Focus on patient-centered care
- Respect patient autonomy`,
        prompt: `Analyze this medical conversation and provide comprehensive medical insights in markdown format:

# TRANSCRIPTION
"${transcription}"

# CLASSIFICATION CONTEXT
- **Type**: ${classification.type}
- **Complexity**: ${classification.complexity}
- **Urgency**: ${classification.urgency}
- **Primary Concern**: ${classification.primaryConcern}
- **Reasoning**: ${classification.reasoning}

Provide structured analysis with markdown formatting:

## 📋 Session Summary
Brief overview and chief complaints

## 🚨 Critical Findings
Flag anything requiring immediate attention with **[CRITICAL]** markers

## 🔍 Key Medical Insights
### Symptoms
- List with details

### Diagnoses
- Confirmed or suspected conditions

### Medications & Treatments
- Current medications
- New prescriptions
- Treatment plan

### Follow-up Actions
- Next steps
- Referrals
- Tests ordered

## 📊 Vital Signs & Measurements
Document any vitals mentioned

## ⚠️ Concerns & Red Flags
Medical concerns to monitor

## 📝 Care Quality Notes
- Documentation completeness
- Patient education provided
- Guideline adherence

Use **bold**, bullet points, and emojis for clear organization.`,
      })
    ]);

    console.log("✅ Parallel analysis complete");

    // ============================================================================
    // AGENT 4: DEEP MEDICAL RESEARCH AGENT (Recursive - only for complex cases)
    // ============================================================================
    let researchData = null;
    let enhancedAnalysis = null;
    let researchMetadata = null;

//     if (classification.type === 'RESEARCH_AGENT') {
//       console.log("🔬 [Agent 4/4] Deep Medical Research Agent - Starting recursive research...");

//       const exaApiKey = process.env.EXA_API_KEY;

//       if (!exaApiKey) {
//         console.warn("⚠️ EXA_API_KEY not configured, skipping research");
//       } else {
//         try {
//           // Import the deep research agent
//           const { deepMedicalResearch, generateMedicalReport } = await import('@/ai/agents/medical-deep-research');

//           // Prepare research prompt
//           const researchPrompt = `Medical Case Analysis:

// PRIMARY CONCERN: ${classification.primaryConcern}
// URGENCY: ${classification.urgency}
// COMPLEXITY: ${classification.complexity}

// CLINICAL CONTEXT:
// ${classification.reasoning}

// PATIENT PRESENTATION:
// ${transcription.slice(0, 1000)}...

// Research Focus:
// 1. Latest clinical guidelines for ${classification.primaryConcern}
// 2. Evidence-based treatment protocols and best practices
// 3. Drug interactions, contraindications, and safety considerations
// 4. Specialist recommendations and referral criteria
// 5. Rare condition considerations if applicable
// 6. Patient safety and quality of care guidelines`;

//           // Determine depth and breadth based on complexity and urgency
//           const depth = classification.complexity === 'complex' ? 2 : 1;
//           const breadth = classification.urgency === 'critical' ? 5 : 3;

//           console.log(`📊 Research parameters: depth=${depth}, breadth=${breadth}`);

//           // Run deep medical research with progress logging
//           const research = await deepMedicalResearch(
//             researchPrompt,
//             depth,
//             breadth,
//             undefined,
//             (status) => console.log(`   ${status}`)
//           );

//           console.log(`✅ Research complete: ${research.learnings.length} learnings, ${research.sources.length} sources`);

//           // Generate comprehensive medical report
//           console.log("📝 Generating medical research report...");
//           const reportResult = await generateMedicalReport(researchPrompt, research);

//           researchData = reportResult.report;
//           researchMetadata = reportResult.metadata;

//           console.log(`✅ Report generated: "${reportResult.title}"`);

//           // Generate enhanced analysis integrating research with initial findings
//           console.log("📚 Integrating research findings with clinical analysis...");
//           const { text: enhanced } = await generateText({
//             model: openai('gpt-4o'),
//             system: `You are an expert medical research analyst. Integrate research findings with clinical analysis to provide evidence-based recommendations.

// Output in well-formatted markdown with proper medical citations.`,
//             prompt: `Create an enhanced medical analysis by integrating the research findings with the initial clinical assessment.

// # INITIAL MEDICAL ANALYSIS
// ${initialAnalysisResult.text}

// # COMPREHENSIVE RESEARCH REPORT
// ${researchData}

// # YOUR TASK
// Create a **Research-Enhanced Clinical Analysis** section in markdown that:

// ## 🔬 Research-Enhanced Insights

// ### Critical Research Findings
// Highlight the most relevant research findings for this specific case with ⚠️ for safety-critical information

// ### Evidence-Based Recommendations
// Provide specific, actionable recommendations backed by the research:
// - Treatment modifications or optimizations
// - Additional tests or referrals
// - Medication adjustments
// - Patient monitoring protocols

// ### Comparison with Current Care
// How does the current approach align with latest evidence-based guidelines? Any gaps or optimization opportunities?

// ### Clinical Decision Support
// Specific guidance for the healthcare provider based on research:
// - Key considerations for this patient
// - Red flags to monitor
// - Follow-up recommendations

// ### Additional Resources
// Relevant guidelines, protocols, or specialist consultations

// Use **bold** for emphasis, bullet points for clarity, ⚠️ for critical information, and include inline citations [like this](url).`,
//           });

//           enhancedAnalysis = enhanced;
//           console.log("✅ Enhanced analysis complete");

//         } catch (error) {
//           console.error("❌ Deep medical research error:", error);
//         }
//       }
//     }

    // ============================================================================
    // RETURN RESULTS
    // ============================================================================
    console.log("🎉 Agentic workflow complete!");

    return Response.json({
      // Agent 1: Classification
      classification: {
        type: classification.type,
        complexity: classification.complexity,
        urgency: classification.urgency,
        primaryConcern: classification.primaryConcern,
        reasoning: classification.reasoning,
      },

      // Agent 2: Patient Insights (with markdown formatting)
      patientInsights: patientInsightsResult.text,

      // Agent 3: Medical Analysis (with markdown formatting)
      medicalAnalysis: initialAnalysisResult.text,

      // Agent 4: Deep Medical Research (if applicable)
      ...(researchData && {
        researchIncluded: true,
        researchData: researchData,
      }),
      ...(researchMetadata && {
        researchMetadata: researchMetadata,
      }),
      ...(enhancedAnalysis && {
        enhancedAnalysis: enhancedAnalysis,
      }),

      // Legacy field for backward compatibility
      response: initialAnalysisResult.text,
    });
}