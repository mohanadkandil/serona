(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push(["chunks/[root-of-the-server]__0f3afc4d._.js",
"[externals]/node:buffer [external] (node:buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:buffer", () => require("node:buffer"));

module.exports = mod;
}),
"[externals]/node:async_hooks [external] (node:async_hooks, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("node:async_hooks", () => require("node:async_hooks"));

module.exports = mod;
}),
"[project]/web/serona/web/app/api/agent/chat/route.ts [app-edge-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST,
    "runtime",
    ()=>runtime
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$serona$2f$web$2f$node_modules$2f40$ai$2d$sdk$2f$openai$2f$dist$2f$index$2e$mjs__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/web/serona/web/node_modules/@ai-sdk/openai/dist/index.mjs [app-edge-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$serona$2f$web$2f$node_modules$2f$ai$2f$dist$2f$index$2e$mjs__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/web/serona/web/node_modules/ai/dist/index.mjs [app-edge-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$serona$2f$web$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/web/serona/web/node_modules/zod/v3/external.js [app-edge-route] (ecmascript) <export * as z>");
const runtime = 'edge';
;
;
;
async function POST(req) {
    const model = (0, __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$serona$2f$web$2f$node_modules$2f40$ai$2d$sdk$2f$openai$2f$dist$2f$index$2e$mjs__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["openai"])('gpt-4o');
    // the full transcription of the patient data
    const { transcription } = await req.json();
    // TODO: PII check (later)
    // Step 1: Classification prompt
    const { object: classification } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$serona$2f$web$2f$node_modules$2f$ai$2f$dist$2f$index$2e$mjs__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["generateObject"])({
        model,
        schema: __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$serona$2f$web$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
            reasoning: __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$serona$2f$web$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().describe('Brief explanation for the classification decision'),
            type: __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$serona$2f$web$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
                'RESEARCH_AGENT',
                'NORMAL'
            ]).describe('RESEARCH_AGENT if rare/complex case needing research, otherwise NORMAL'),
            complexity: __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$serona$2f$web$2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
                'simple',
                'complex'
            ]).describe('simple for routine cases, complex for multi-system or unclear cases')
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
- complex: multiple issues, uncertain diagnosis, complex case`
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
                        'Authorization': `Bearer ${exaApiKey}`
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

Focus on providing actionable, evidence-based medical information.`
                    })
                });
                const research = await researchResponse.json();
                researchId = research.researchId;
                console.log("🔬 Research task created:", researchId);
                // Poll for completion (with timeout)
                const maxPolls = 30; // 30 seconds max
                let polls = 0;
                while(polls < maxPolls){
                    await new Promise((resolve)=>setTimeout(resolve, 1000)); // Wait 1 second
                    const statusResponse = await fetch(`https://api.exa.ai/research/v1/${researchId}`, {
                        headers: {
                            'Authorization': `Bearer ${exaApiKey}`
                        }
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
    const analysisPrompt = researchData ? `Analyze this medical conversation using the research findings below:

TRANSCRIPTION:
"${transcription}"

RESEARCH FINDINGS:
${researchData}

Provide a comprehensive analysis incorporating the research findings with sections: Symptoms, Diagnoses, Medications, Follow-up Actions, Concerns, Research-Based Recommendations.` : `Analyze this medical conversation transcription:\n\n"${transcription}"\n\nProvide analysis with sections: Symptoms, Diagnoses, Medications, Follow-up Actions, Concerns.`;
    const { text: response } = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$serona$2f$web$2f$node_modules$2f$ai$2f$dist$2f$index$2e$mjs__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["generateText"])({
        model: classification.complexity === 'simple' ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$serona$2f$web$2f$node_modules$2f40$ai$2d$sdk$2f$openai$2f$dist$2f$index$2e$mjs__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["openai"])('gpt-4o-mini') : (0, __TURBOPACK__imported__module__$5b$project$5d2f$web$2f$serona$2f$web$2f$node_modules$2f40$ai$2d$sdk$2f$openai$2f$dist$2f$index$2e$mjs__$5b$app$2d$edge$2d$route$5d$__$28$ecmascript$29$__["openai"])('gpt-4o'),
        system: classification.type === 'RESEARCH_AGENT' ? `You are an expert medical research analyst. Provide detailed analysis of complex medical cases with research-backed insights.

Your analysis should include:
1. SESSION SUMMARY - Brief overview and primary complaints
2. CRITICAL FINDINGS - Flag severe symptoms, dangerous vitals, medication issues (format: **[CRITICAL - IMMEDIATE ACTION REQUIRED]** with urgency level)
3. KEY MEDICAL INSIGHTS - Diagnosis, symptoms, treatment plan, medications, follow-ups
4. RESEARCH-BASED RECOMMENDATIONS - Evidence-based recommendations from latest medical literature
5. CARE QUALITY NOTES - Documentation completeness, patient education, guideline adherence` : `You are a medical AI assistant analyzing patient-doctor conversations.

Your role is to:
1. Extract key medical information and symptoms
2. Identify diagnoses or conditions discussed
3. Note any medications or treatments mentioned
4. Highlight follow-up actions or next steps
5. Flag any urgent concerns

Provide a structured, clear analysis that's helpful for medical record keeping.`,
        prompt: analysisPrompt
    });
    console.log("🚀 ~ POST ~ class type:", classification.type);
    console.log("🚀 ~ POST ~ response length:", response.length);
    return Response.json({
        response,
        classification,
        ...researchId && {
            researchId
        },
        ...researchData && {
            researchIncluded: true,
            researchData: researchData
        }
    });
}
}),
]);

//# sourceMappingURL=%5Broot-of-the-server%5D__0f3afc4d._.js.map