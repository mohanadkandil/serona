// Native AI Agent Service - Runs directly in the mobile app
// No HTTP calls needed - uses Vercel AI SDK directly

import { createOpenAI } from '@ai-sdk/openai';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import { createPatientHistoryTool, formatToolResultForUI } from './patientHistoryTool';
// Use REST API client instead of Weaviate client (React Native compatible)
import { getPatientContextWithSessions } from './weaviateRESTClient';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';

export type ClassificationData = {
  type: 'RESEARCH_AGENT' | 'NORMAL';
  complexity: 'simple' | 'complex';
  urgency: 'routine' | 'urgent' | 'critical';
  primaryConcern: string;
  reasoning: string;
};

export type AgentEventHandlers = {
  onProgress?: (data: { step: string }) => void;
  onClassification?: (data: ClassificationData) => void;
  onPatientInsights?: (data: { text: string }) => void;
  onMedicalAnalysis?: (data: { text: string }) => void;
  onPatientHistory?: (data: { sessions: any[] }) => void;
  onToolCall?: (data: { toolName: string; args: any; result?: any }) => void;
  onDone?: () => void;
  onError?: (error: { message: string }) => void;
};

/**
 * Run medical analysis directly in the mobile app
 * No HTTP calls - uses Vercel AI SDK natively
 */
export async function runMedicalAnalysis(
  transcription: string,
  handlers: AgentEventHandlers,
  options?: {
    patientId?: string;
  }
): Promise<void> {
  if (!OPENAI_API_KEY) {
    handlers.onError?.({ message: 'OpenAI API key not found' });
    return;
  }

  try {
    // Configure OpenAI with API key
    const openai = createOpenAI({
      apiKey: OPENAI_API_KEY,
    });

    handlers.onProgress?.({ step: '🏥 Initializing Clinical Analysis System' });

    // ============================================================================
    // AUTOMATIC PATIENT HISTORY RETRIEVAL
    // ============================================================================
    let patientHistoryContext = '';

    if (options?.patientId) {
      try {
        handlers.onProgress?.({ step: '🔍 Retrieving relevant patient medical history...' });

        // Get top 5 most relevant sessions based on current transcript
        // Using REST API client (React Native compatible)
        const sessions = await getPatientContextWithSessions(
          options.patientId,
          transcription,
          5 // top 5 relevant sessions
        );

        // Format sessions as context string
        if (sessions && sessions.length > 0) {
          patientHistoryContext = sessions.map((s, idx) =>
            `Session ${idx + 1} (${s.date}):\n${s.content}`
          ).join('\n\n');

          // Send sessions to UI for display
          handlers.onPatientHistory?.({ sessions });

          handlers.onProgress?.({
            step: `✅ Retrieved ${sessions.length} relevant session(s) from patient history`
          });

          console.log(`📚 Patient history context loaded (${sessions.length} sessions)`);
        } else {
          handlers.onProgress?.({
            step: `ℹ️  No previous sessions found for this patient`
          });
        }
      } catch (error) {
        console.error('Error retrieving patient history:', error);
        handlers.onProgress?.({ step: '⚠️  Could not retrieve patient history - continuing without context' });
      }
    }

    // ============================================================================
    // AGENT 1: TRIAGE & CLASSIFICATION AGENT
    // ============================================================================
    handlers.onProgress?.({ step: '📋 Step 1: Triaging Case & Determining Priority' });

    const { object: classification } = await generateObject({
      model: openai('gpt-4o'),
      schema: z.object({
        reasoning: z.string(),
        type: z.enum(['RESEARCH_AGENT', 'NORMAL']),
        complexity: z.enum(['simple', 'complex']),
        urgency: z.enum(['routine', 'urgent', 'critical']),
        primaryConcern: z.string(),
      }),
      system: `You are a medical triage and classification AI agent. Your role is to:
1. Assess the complexity of the medical case (simple vs complex)
2. Determine the urgency level (routine, urgent, critical)
3. Identify if deep medical research is needed
4. Extract the primary medical concern

Be concise and precise in your classification.`,
      prompt: `Classify this medical transcript and determine the appropriate analysis pathway:

"${transcription}"

Analyze:
- Complexity: Does this require specialist knowledge or is it straightforward?
- Urgency: What is the time-sensitivity?
- Research Need: Would evidence-based research improve the analysis?
- Primary Concern: What is the main medical issue?`,
    });

    const classificationLabel =
      classification.type === 'RESEARCH_AGENT'
        ? 'Requires Evidence-Based Research'
        : 'Standard Clinical Analysis';

    const complexityLabel =
      classification.complexity === 'complex' ? 'Complex Case' : 'Routine Case';

    const urgencyLabel =
      classification.urgency === 'critical'
        ? 'Critical Priority'
        : classification.urgency === 'urgent'
          ? 'Urgent Priority'
          : 'Routine Priority';

    handlers.onProgress?.({
      step: `✅ Case Classified: ${complexityLabel} • ${urgencyLabel} • ${classificationLabel}`,
    });
    handlers.onClassification?.(classification);

    // ============================================================================
    // PARALLEL EXECUTION: Fast agents
    // ============================================================================
    handlers.onProgress?.({
      step: '🔄 Step 2: Analyzing Patient Communication & Clinical Details',
    });

    const [patientInsightsResult, initialAnalysisResult] = await Promise.all([
      // Agent 2: Patient Communication Analysis
      generateText({
        model: openai('gpt-4o'),
        system: `You are a patient communication and psychological analyst specializing in healthcare.
Your role is to:
1. Analyze how the patient communicates their symptoms
2. Identify psychological and emotional factors
3. Assess health literacy and communication patterns
4. Note any social determinants of health
5. Identify potential barriers to care

${patientHistoryContext ? `You have access to the patient's medical history below. Use this to identify patterns in communication, track changes in emotional state over time, and provide context-aware insights.` : ''}

Provide insights that help doctors understand the whole patient, not just symptoms.`,
        prompt: `${patientHistoryContext ? `PATIENT MEDICAL HISTORY:
${patientHistoryContext}

---

` : ''}Analyze the patient communication patterns and psychosocial factors from this medical transcript:

"${transcription.slice(0, 1000)}${transcription.length > 1000 ? '...' : ''}"

Focus on:
- How the patient describes their condition${patientHistoryContext ? ' (compare to past communication patterns)' : ''}
- Emotional state and concerns
- Understanding of their health
- Social and environmental factors
- Communication effectiveness${patientHistoryContext ? '\n- Changes or patterns over time based on medical history' : ''}`,
      }),

      // Agent 3: Medical Analysis (with patient history context)
      generateText({
        model: openai('gpt-4o'),
        system: `You are an expert medical analysis AI with broad clinical knowledge.
Your role is to:
1. Identify key symptoms and signs
2. Generate differential diagnoses
3. Suggest appropriate investigations
4. Recommend treatment approaches
5. Flag red flags or concerning features

${patientHistoryContext ? `IMPORTANT: You have been provided with the patient's relevant medical history.
Use this historical context to:
- Compare current presentation with past similar episodes
- Identify patterns or recurring issues
- Note what treatments worked or didn't work before
- Consider progression or resolution of previous conditions
- Provide more personalized recommendations based on patient's history

Incorporate historical context throughout your analysis.` : ''}

Provide thorough, evidence-based clinical analysis.`,
        prompt: `${patientHistoryContext ? `PATIENT MEDICAL HISTORY (Most Relevant Sessions):
${patientHistoryContext}

═══════════════════════════════════════════

` : ''}CURRENT SESSION TRANSCRIPT:
"${transcription.slice(0, 1000)}${transcription.length > 1000 ? '...' : ''}"

Provide a comprehensive medical analysis including:
- Key clinical findings
- Differential diagnoses (most likely first)${patientHistoryContext ? '\n- How current symptoms compare to past presentations' : ''}
- Recommended investigations${patientHistoryContext ? ' (considering what has been done before)' : ''}
- Suggested management approach${patientHistoryContext ? ' (considering past treatment responses)' : ''}
- Red flags or urgent considerations${patientHistoryContext ? '\n- Relevant patterns from medical history' : ''}`,
      }),
    ]);

    handlers.onProgress?.({ step: '✅ Patient Communication Analysis Complete' });
    handlers.onPatientInsights?.({ text: patientInsightsResult.text });

    handlers.onProgress?.({ step: '✅ Clinical Assessment Complete' });
    handlers.onMedicalAnalysis?.({ text: initialAnalysisResult.text });

    handlers.onProgress?.({ step: '✅ Clinical Analysis Complete - Ready for Review' });
    handlers.onDone?.();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Native agent error:', error);
    handlers.onError?.({ message: errorMessage });
  }
}
