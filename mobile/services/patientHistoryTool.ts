import { tool } from 'ai';
import { z } from 'zod';
// Use REST API client instead of Weaviate client (React Native compatible)
import { searchPatientHistory } from './weaviateRESTClient';

/**
 * Format search results for AI agent consumption
 */
function formatSearchResults(results: any[]): string {
  if (results.length === 0) {
    return 'No relevant patient history found.';
  }

  const formatted = results.map((session, index) => {
    const lines: string[] = [];

    lines.push(`\n${index + 1}. [${session.sessionType.toUpperCase()}] ${session.date}`);
    lines.push(`   Doctor: ${session.doctorName} (${session.doctorSpecialty})`);

    if (session.chiefComplaint) {
      lines.push(`   Chief Complaint: ${session.chiefComplaint}`);
    }

    if (session.diagnosisCodes && session.diagnosisCodes.length > 0) {
      lines.push(`   Diagnoses: ${session.diagnosisCodes.join(', ')}`);
    }

    if (session.medications && session.medications.length > 0) {
      lines.push(`   Medications: ${session.medications.join(', ')}`);
    }

    // Add a preview of the content (first 200 chars)
    if (session.content) {
      const preview = session.content.substring(0, 200).replace(/\n/g, ' ');
      lines.push(`   Summary: ${preview}...`);
    }

    return lines.join('\n');
  });

  return `Found ${results.length} relevant session(s) in patient history:\n${formatted.join('\n')}`;
}

/**
 * Create the patient history search tool for AI agents
 *
 * This tool allows AI agents (Research & Insights) to search patient medical history
 * during analysis to provide context-aware recommendations.
 */
export function createPatientHistoryTool(patientId: string) {
  return tool({
    description: `Search patient medical history for relevant past sessions, diagnoses, treatments, medications, imaging results, or doctor notes.

Use this tool when you need historical context about:
- Previous diagnoses or medical conditions
- Past treatments and their outcomes
- Medication history
- Imaging results (MRI, X-ray, etc.)
- Similar symptoms in the past
- Treatment effectiveness
- Specialist consultations

The search uses semantic similarity to find relevant sessions even if the exact words don't match.`,

    parameters: z.object({
      query: z.string().describe(
        'What to search for in patient history. Be specific. Examples: "back pain treatments", "MRI results lumbar spine", "medications for diabetes", "physiotherapy outcomes"'
      ),
      limit: z.number()
        .optional()
        .default(5)
        .describe('Maximum number of results to return (default: 5, max: 10)'),
    }),

    execute: async ({ query, limit }) => {
      try {
        console.log(`🔍 AI searching patient history: "${query}" (limit: ${limit})`);

        // Ensure limit is reasonable
        const safeLimit = Math.min(limit || 5, 10);

        // Search using semantic search (REST API client)
        const results = await searchPatientHistory(query, patientId, safeLimit);

        // Format for AI consumption
        const formattedResults = formatSearchResults(results);

        console.log(`✅ Found ${results.length} relevant sessions`);

        return formattedResults;
      } catch (error) {
        console.error('Error searching patient history:', error);
        return 'Error: Unable to search patient history at this time.';
      }
    },
  });
}

/**
 * Format tool results for UI display
 * This creates a user-friendly summary of what the AI found
 */
export function formatToolResultForUI(toolCall: any): {
  query: string;
  resultCount: number;
  sessions: Array<{
    date: string;
    type: string;
    doctor: string;
    summary: string;
  }>;
} {
  const query = toolCall.args?.query || '';
  const result = toolCall.result || '';

  // Parse the result to extract session info
  const sessions: Array<{
    date: string;
    type: string;
    doctor: string;
    summary: string;
  }> = [];

  // Extract session blocks from result
  const sessionBlocks = result.split('\n\n').filter((block: string) =>
    block.trim().startsWith('1.') ||
    block.trim().match(/^\d+\./)
  );

  sessionBlocks.forEach((block: string) => {
    const lines = block.split('\n');
    const firstLine = lines[0];

    // Extract date and type from first line: "1. [APPOINTMENT] 2023-04-15"
    const typeMatch = firstLine.match(/\[(.*?)\]/);
    const dateMatch = firstLine.match(/\d{4}-\d{2}-\d{2}/);

    // Extract doctor from second line: "   Doctor: Dr. Name (Specialty)"
    const doctorLine = lines.find(l => l.includes('Doctor:'));
    const doctorMatch = doctorLine?.match(/Doctor:\s*(.+)/);

    // Extract summary from content
    const summaryLine = lines.find(l => l.includes('Summary:') || l.includes('Chief Complaint:'));
    const summaryMatch = summaryLine?.match(/(?:Summary|Chief Complaint):\s*(.+)/);

    if (typeMatch && dateMatch) {
      sessions.push({
        date: dateMatch[0],
        type: typeMatch[1].toLowerCase(),
        doctor: doctorMatch?.[1] || 'Unknown',
        summary: summaryMatch?.[1] || 'No summary available',
      });
    }
  });

  return {
    query,
    resultCount: sessions.length,
    sessions,
  };
}
