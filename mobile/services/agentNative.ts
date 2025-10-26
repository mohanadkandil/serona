// Native AI Agent Service - Runs directly in the mobile app
// No HTTP calls needed - uses Vercel AI SDK directly

import { createOpenAI } from '@ai-sdk/openai';
import { generateObject, generateText } from 'ai';
import { z } from 'zod';

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
  onDone?: () => void;
  onError?: (error: { message: string }) => void;
};

/**
 * Run medical analysis directly in the mobile app
 * No HTTP calls - uses Vercel AI SDK natively
 */
export async function runMedicalAnalysis(
  transcription: string,
  handlers: AgentEventHandlers
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

Provide insights that help doctors understand the whole patient, not just symptoms.`,
        prompt: `Analyze the patient communication patterns and psychosocial factors from this medical transcript:

"${transcription.slice(0, 1000)}${transcription.length > 1000 ? '...' : ''}"

Focus on:
- How the patient describes their condition
- Emotional state and concerns
- Understanding of their health
- Social and environmental factors
- Communication effectiveness`,
      }),

      // Agent 3: Medical Analysis
      generateText({
        model: openai('gpt-4o'),
        system: `You are an expert medical analysis AI with broad clinical knowledge.
Your role is to:
1. Identify key symptoms and signs
2. Generate differential diagnoses
3. Suggest appropriate investigations
4. Recommend treatment approaches
5. Flag red flags or concerning features

Provide thorough, evidence-based clinical analysis.`,
        prompt: `Provide a comprehensive medical analysis of this case:

"${transcription.slice(0, 1000)}${transcription.length > 1000 ? '...' : ''}"

Include:
- Key clinical findings
- Differential diagnoses (most likely first)
- Recommended investigations
- Suggested management approach
- Red flags or urgent considerations`,
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
