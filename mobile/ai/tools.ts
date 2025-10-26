import Exa from "exa-js";
import { tool as createTool } from "ai";
import { z } from "zod";

export const exa = new Exa(process.env.EXA_API_KEY);

const webSearch = createTool({
  description: "Use this tool to search the web for medical information, clinical guidelines, treatment protocols, and evidence-based research.",
  parameters: z.object({
    query: z
      .string()
      .min(1)
      .max(200)
      .describe(
        "The medical search query - be specific and include medical terms, conditions, treatments, or drug names for better results",
      ),
    limit: z
      .number()
      .min(1)
      .max(10)
      .default(5)
      .describe("The number of results to return"),
  }),
  execute: async ({ query, limit }) => {
    const { results } = await exa.searchAndContents(query, {
      numResults: limit,
      livecrawl: "always",
      type: "keyword",
    });
    // Process and clean the results
    return results.map((result) => ({
      title: result.title,
      url: result.url,
      snippet: result.text?.slice(0, 500) || "", // Limit snippet length for medical content
      domain: new URL(result.url).hostname, // Extract domain for source context
      date: result.publishedDate || "Date not available", // Include publish date when available
      favicon: result.favicon,
    }));
  },
});

export const tools = {
  webSearch,
};
