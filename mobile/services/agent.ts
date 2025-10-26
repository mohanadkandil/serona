// API Service to connect to web backend streaming endpoint
// This connects the mobile app to the web app's /api/agent/stream endpoint

export type ClassificationData = {
  type: 'RESEARCH_AGENT' | 'NORMAL';
  complexity: 'simple' | 'complex';
  urgency: 'routine' | 'urgent' | 'critical';
  primaryConcern: string;
  reasoning: string;
};

export type ProgressEvent = {
  step: string;
};

export type AgentEventHandlers = {
  onProgress?: (data: ProgressEvent) => void;
  onClassification?: (data: ClassificationData) => void;
  onPatientInsights?: (data: { text: string }) => void;
  onMedicalAnalysis?: (data: { text: string }) => void;
  onResearchData?: (data: { report: string; metadata: any }) => void;
  onEnhancedAnalysis?: (data: { text: string }) => void;
  onDone?: () => void;
  onError?: (error: { message: string }) => void;
};

/**
 * Streams medical analysis from the web backend
 * @param transcription - The patient transcription to analyze
 * @param handlers - Event handlers for different stages of analysis
 * @param apiUrl - Base URL of the web backend (default: from env or http://localhost:3000)
 */
export async function streamMedicalAnalysis(
  transcription: string,
  handlers: AgentEventHandlers,
  apiUrl?: string
): Promise<void> {
  const baseUrl = apiUrl || process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
  try {
    console.log('Connecting to:', `${baseUrl}/api/agent/stream`);
    const response = await fetch(`${baseUrl}/api/agent/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transcription }),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    if (!response.body) {
      console.error('Response body is null');
      throw new Error('Response body is null');
    }

    console.log('Starting to read stream...');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('event:')) {
          const event = line.substring(6).trim();
          const nextLine = lines[lines.indexOf(line) + 1];

          if (nextLine && nextLine.startsWith('data:')) {
            const dataStr = nextLine.substring(5).trim();

            try {
              const data = JSON.parse(dataStr);

              switch (event) {
                case 'progress':
                  handlers.onProgress?.(data);
                  break;
                case 'classification':
                  handlers.onClassification?.(data);
                  break;
                case 'patientInsights':
                  handlers.onPatientInsights?.(data);
                  break;
                case 'medicalAnalysis':
                  handlers.onMedicalAnalysis?.(data);
                  break;
                case 'researchData':
                  handlers.onResearchData?.(data);
                  break;
                case 'enhancedAnalysis':
                  handlers.onEnhancedAnalysis?.(data);
                  break;
                case 'done':
                  handlers.onDone?.();
                  break;
                case 'error':
                  handlers.onError?.(data);
                  break;
              }
            } catch (parseError) {
              console.error('Failed to parse SSE data:', parseError);
            }
          }
        }
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    handlers.onError?.({ message: errorMessage });
    throw error;
  }
}
