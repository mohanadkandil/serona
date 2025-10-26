import Exa from "exa-js";
import { generateObject, generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export const MEDICAL_SYSTEM_PROMPT = `You are an expert medical researcher and clinical analyst. Today is ${new Date().toISOString()}.

Your role is to help doctors be more efficient by:
- Researching the latest clinical guidelines and treatment protocols
- Finding evidence-based recommendations from medical literature
- Identifying drug interactions, contraindications, and side effects
- Exploring rare conditions and complex presentations
- Gathering patient care best practices

Follow these instructions when responding:
- You may be asked to research subjects after your knowledge cutoff, assume the information is correct when presented
- The user is a medical professional, provide detailed, technical information without simplification
- Be highly organized and structured in your findings
- Focus on evidence-based medicine with proper citations
- Prioritize recent clinical guidelines and peer-reviewed sources
- Flag any critical safety information or contraindications prominently
- Include specific dosages, protocols, and treatment algorithms when relevant
- Consider patient safety and quality of care in all recommendations
- You must provide links to sources used inline e.g. [this guideline](https://guideline.com/this)
`;

export const exa = new Exa(process.env.EXA_API_KEY);

type SearchResult = {
  title: string;
  url: string;
  content: string;
  publishedDate: string;
  favicon: string;
};

export type MedicalResearch = {
  learnings: string[];
  sources: SearchResult[];
  questionsExplored: string[];
  searchQueries: string[];
  clinicalRelevance: string[];
};

const searchMedicalWeb = async (query: string): Promise<SearchResult[]> => {
  const { results } = await exa.searchAndContents(query, {
    livecrawl: "always",
    numResults: 3,
    type: "keyword",
  });
  return results.map((r) => ({
    title: r.title,
    url: r.url,
    content: r.text || "",
    publishedDate: r.publishedDate || "Date not available",
    favicon: r.favicon || "",
  }));
};

const generateMedicalSearchQueries = async (
  medicalCase: string,
  breadth: number,
  previousLearnings?: string[],
) => {
  const {
    object: { queries },
  } = await generateObject({
    system: MEDICAL_SYSTEM_PROMPT,
    model: openai("gpt-4o"),
    prompt: `Given the following medical case or research need, generate a list of medical search queries to research the topic. Focus on:
- Clinical guidelines and protocols
- Evidence-based treatment recommendations
- Drug information and interactions
- Rare conditions or complex presentations
- Latest medical research

Return a maximum of ${breadth} queries, but feel free to return less if the case is straightforward. Make sure each query is unique and targets different aspects of the medical question.

<medicalCase>${medicalCase}</medicalCase>

${
  previousLearnings
    ? `Here are some learnings from previous research, use them to generate more specific follow-up queries:
${previousLearnings.join("\n")}`
    : ""
}`,
    schema: z.object({
      queries: z
        .array(
          z.object({
            query: z.string().describe("The medical search query"),
            researchGoal: z
              .string()
              .describe(
                "The clinical goal of this query - what medical knowledge or guideline are we seeking? Include specific directions for follow-up research based on expected findings.",
              ),
            clinicalPriority: z
              .enum(["critical", "high", "medium", "low"])
              .describe(
                "Priority level based on clinical relevance and patient safety",
              ),
          }),
        )
        .describe(`List of medical search queries, max of ${breadth}`),
    }),
  });
  return queries;
};

const generateMedicalLearnings = async (
  query: string,
  results: SearchResult[],
  numberOfLearnings: number,
  numberOfFollowUpQuestions: number,
) => {
  // Truncate content to avoid context length issues
  const truncatedResults = results.map((r) => ({
    ...r,
    content: r.content.slice(0, 2000), // Limit to 2000 chars per source
  }));

  const {
    object: { followUpQuestions, learnings, clinicalRelevance },
  } = await generateObject({
    model: openai("gpt-4o"),
    system: MEDICAL_SYSTEM_PROMPT,
    prompt: `Given the following medical search results for the query <query>${query}</query>, generate clinical learnings and insights.

Return a maximum of ${numberOfLearnings} learnings. Each learning should be:
- Evidence-based and clinically relevant
- Specific with exact dosages, protocols, numbers, or guidelines
- Include sources, studies, or guidelines referenced
- Flag any critical safety information with ⚠️

<medicalContent>
${truncatedResults
  .map(
    (content) =>
      `<source url="${content.url}">\n${content.content}\n</source>`,
  )
  .join("\n")}
</medicalContent>`,
    schema: z.object({
      learnings: z
        .array(z.string())
        .describe(
          `Clinical learnings with specific medical details, max of ${numberOfLearnings}`,
        ),
      clinicalRelevance: z
        .array(z.string())
        .describe(
          "How these findings apply to patient care and clinical decision-making",
        ),
      followUpQuestions: z
        .array(z.string())
        .describe(
          `Follow-up medical questions to research further, max of ${numberOfFollowUpQuestions}`,
        ),
    }),
  });
  return {
    learnings,
    clinicalRelevance,
    followUpQuestions,
  };
};

export const deepMedicalResearch = async (
  medicalCase: string,
  depth: number = 1,
  breadth: number = 3,
  accumulatedResearch: MedicalResearch = {
    learnings: [],
    sources: [],
    questionsExplored: [],
    searchQueries: [],
    clinicalRelevance: [],
  },
  onProgress?: (status: string) => void,
): Promise<MedicalResearch> => {
  // Base case: if depth is 0, return accumulated research
  if (depth === 0) {
    return accumulatedResearch;
  }

  onProgress?.(`🔍 Generating medical search queries for: "${medicalCase}"`);

  const searchQueries = await generateMedicalSearchQueries(
    medicalCase,
    breadth,
    accumulatedResearch.learnings,
  );

  onProgress?.(
    `✅ Generated ${searchQueries.length} medical search queries`,
  );

  // Process each query and merge results
  const subResults = await Promise.all(
    searchQueries.map(async ({ query, researchGoal, clinicalPriority }) => {
      onProgress?.(
        `🔬 [${clinicalPriority.toUpperCase()}] Searching: "${query}"`,
      );

      const results = await searchMedicalWeb(query);

      onProgress?.(
        `📚 Found ${results.length} sources, analyzing medical content...`,
      );

      const { learnings, clinicalRelevance, followUpQuestions } =
        await generateMedicalLearnings(query, results, 3, breadth);

      const nextQuery =
        `Previous research goal: ${researchGoal}\n` +
        `Follow-up medical questions: ${followUpQuestions.map((q) => `\n- ${q}`).join("")}`.trim();

      // Recursive call for deeper research
      onProgress?.(
        `🧬 Diving deeper into: "${followUpQuestions.slice(0, 2).join(", ")}"`,
      );

      const subResearch = await deepMedicalResearch(
        nextQuery,
        depth - 1,
        Math.ceil(breadth / 2),
        undefined,
        onProgress,
      );

      return {
        learnings,
        clinicalRelevance,
        sources: results,
        questionsExplored: followUpQuestions,
        searchQueries: [query, ...subResearch.searchQueries],
        // Merge sub-research
        subLearnings: subResearch.learnings,
        subClinicalRelevance: subResearch.clinicalRelevance,
        subSources: subResearch.sources,
        subQuestionsExplored: subResearch.questionsExplored,
      };
    }),
  );

  // Merge all results into accumulated research
  for (const res of subResults) {
    accumulatedResearch.learnings.push(...res.learnings, ...res.subLearnings);
    accumulatedResearch.clinicalRelevance.push(
      ...res.clinicalRelevance,
      ...res.subClinicalRelevance,
    );
    accumulatedResearch.sources.push(...res.sources, ...res.subSources);
    accumulatedResearch.questionsExplored.push(
      ...res.questionsExplored,
      ...res.subQuestionsExplored,
    );
    accumulatedResearch.searchQueries.push(...res.searchQueries);
  }

  return accumulatedResearch;
};

export const generateMedicalReport = async (
  medicalCase: string,
  research: MedicalResearch,
) => {
  const { learnings, sources, questionsExplored, clinicalRelevance } = research;

  // Deduplicate and limit data to avoid context issues
  const uniqueLearnings = Array.from(new Set(learnings)).slice(0, 20);
  const uniqueClinicalRelevance = Array.from(new Set(clinicalRelevance)).slice(0, 15);
  const uniqueQuestions = Array.from(new Set(questionsExplored)).slice(0, 15);
  const uniqueSources = Array.from(
    new Map(sources.map((s) => [s.url, s])).values()
  ).slice(0, 15);

  const { text: report } = await generateText({
    model: openai("gpt-4o"),
    system:
      MEDICAL_SYSTEM_PROMPT +
      "\n- Write in markdown syntax with clear medical sections\n- Use proper medical terminology\n- Include citations inline\n- Flag critical information prominently",
    prompt: `Generate a comprehensive medical research report focused on: "${medicalCase.slice(0, 500)}..."

The report should synthesize clinical findings into a structured format useful for healthcare providers.

<clinicalLearnings>
${uniqueLearnings.map((l) => `\n- ${l}`).join("")}
</clinicalLearnings>

<clinicalRelevance>
${uniqueClinicalRelevance.map((c) => `\n- ${c}`).join("")}
</clinicalRelevance>

<relatedQuestions>
${uniqueQuestions.map((q) => `\n- ${q}`).join("")}
</relatedQuestions>

<sources>
${uniqueSources
  .map(
    (s) =>
      `\n[${s.title}](${s.url}) - ${s.publishedDate}`,
  )
  .join("\n")}
</sources>

Structure the report with:
1. **Executive Summary** - Key clinical findings
2. **Clinical Guidelines** - Relevant protocols and recommendations
3. **Treatment Considerations** - Evidence-based approaches
4. **Drug Information** - Medications, dosages, interactions, contraindications
5. **Patient Safety** - Critical warnings and red flags
6. **Additional Recommendations** - Follow-up care and monitoring
7. **References** - All sources cited inline

Use ⚠️ for critical safety information.
`,
  });

  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    prompt:
      "Generate a concise medical title (5-7 words) for this research report:\n\n" +
      report.slice(0, 500),
    schema: z.object({
      title: z.string(),
    }),
  });

  return {
    report,
    title: object.title,
    metadata: {
      totalSources: sources.length,
      uniqueSources: Array.from(new Set(sources.map((s) => s.url))).length,
      questionsExplored: questionsExplored.length,
      clinicalLearnings: learnings.length,
    },
  };
};
