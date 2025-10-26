export const runtime = 'edge';
export const maxDuration = 120;

import { openai } from '@ai-sdk/openai';
import { generateObject, generateText } from "ai";
import { z } from 'zod';

export async function POST(req: Request) {
    const { transcription } = await req.json();

    // Create a ReadableStream for SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const sendEvent = (event: string, data: any) => {
                const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
                controller.enqueue(encoder.encode(message));
            };

            try {
                sendEvent('progress', { step: '🏥 Initializing Clinical Analysis System' });

                // ============================================================================
                // AGENT 1: TRIAGE & CLASSIFICATION AGENT
                // ============================================================================
                sendEvent('progress', { step: '📋 Step 1: Triaging Case & Determining Priority' });

                const { object: classification } = await generateObject({
                    model: openai('gpt-4o'),
                    schema: z.object({
                        reasoning: z.string(),
                        type: z.enum(['RESEARCH_AGENT', 'NORMAL']),
                        complexity: z.enum(['simple', 'complex']),
                        urgency: z.enum(['routine', 'urgent', 'critical']),
                        primaryConcern: z.string(),
                    }),
                    system: `You are a medical triage and classification AI agent.`,
                    prompt: `Classify this medical transcript: "${transcription}"`
                });

                // Format classification for doctors
                const classificationLabel = classification.type === 'RESEARCH_AGENT'
                    ? 'Requires Evidence-Based Research'
                    : 'Standard Clinical Analysis';

                const complexityLabel = classification.complexity === 'complex'
                    ? 'Complex Case'
                    : 'Routine Case';

                const urgencyLabel = classification.urgency === 'critical'
                    ? 'Critical Priority'
                    : classification.urgency === 'urgent'
                    ? 'Urgent Priority'
                    : 'Routine Priority';

                sendEvent('progress', {
                    step: `✅ Case Classified: ${complexityLabel} • ${urgencyLabel} • ${classificationLabel}`
                });
                sendEvent('classification', classification);

                // ============================================================================
                // PARALLEL EXECUTION: Fast agents
                // ============================================================================
                sendEvent('progress', { step: '🔄 Step 2: Analyzing Patient Communication & Clinical Details' });

                const [patientInsightsResult, initialAnalysisResult] = await Promise.all([
                    generateText({
                        model: openai('gpt-4o'),
                        system: 'You are a patient communication analyst.',
                        prompt: `Analyze patient communication from: "${transcription.slice(0, 1000)}..."`
                    }),
                    generateText({
                        model: openai('gpt-4o'),
                        system: 'You are a medical analysis AI.',
                        prompt: `Analyze this medical case: "${transcription.slice(0, 1000)}..."`
                    })
                ]);

                sendEvent('progress', { step: '✅ Patient Communication Analysis Complete' });
                sendEvent('patientInsights', { text: patientInsightsResult.text });

                sendEvent('progress', { step: '✅ Clinical Assessment Complete' });
                sendEvent('medicalAnalysis', { text: initialAnalysisResult.text });

                // ============================================================================
                // AGENT 4: DEEP MEDICAL RESEARCH
                // ============================================================================
                // if (classification.type === 'RESEARCH_AGENT') {
                //     sendEvent('progress', { step: '🔬 [Agent 4/4] Deep Medical Research Agent - Starting...' });

                //     const { deepMedicalResearch, generateMedicalReport } = await import('@/ai/agents/medical-deep-research');

                //     const researchPrompt = `Medical Case: ${classification.primaryConcern} (${classification.urgency})`;
                //     const depth = classification.complexity === 'complex' ? 2 : 1;
                //     const breadth = classification.urgency === 'critical' ? 5 : 3;

                //     sendEvent('progress', { step: `📊 Research parameters: depth=${depth}, breadth=${breadth}` });

                //     // Run research with progress callbacks
                //     const research = await deepMedicalResearch(
                //         researchPrompt,
                //         depth,
                //         breadth,
                //         undefined,
                //         (status) => sendEvent('progress', { step: `   ${status}` })
                //     );

                //     sendEvent('progress', {
                //         step: `✅ Research complete: ${research.learnings.length} learnings, ${research.sources.length} sources`
                //     });

                //     // Generate report
                //     sendEvent('progress', { step: '📝 Generating medical research report...' });
                //     const reportResult = await generateMedicalReport(researchPrompt, research);

                //     sendEvent('progress', { step: `✅ Report generated: "${reportResult.title}"` });
                //     sendEvent('researchData', {
                //         report: reportResult.report,
                //         metadata: reportResult.metadata
                //     });

                //     // Generate enhanced analysis
                //     sendEvent('progress', { step: '📚 Integrating research findings...' });
                //     const { text: enhanced } = await generateText({
                //         model: openai('gpt-4o'),
                //         system: 'You are an expert medical research analyst.',
                //         prompt: `Integrate research findings with clinical analysis.`
                //     });

                //     sendEvent('progress', { step: '✅ Enhanced analysis complete' });
                //     sendEvent('enhancedAnalysis', { text: enhanced });
                // }

                sendEvent('progress', { step: '✅ Clinical Analysis Complete - Ready for Review' });
                sendEvent('done', {});
                controller.close();

            } catch (error) {
                sendEvent('error', { message: error instanceof Error ? error.message : 'Unknown error' });
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
