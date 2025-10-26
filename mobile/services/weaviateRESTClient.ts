/**
 * Weaviate REST API Client
 * React Native compatible - uses fetch instead of Weaviate SDK
 */

const WEAVIATE_SCHEME = process.env.EXPO_PUBLIC_WEAVIATE_SCHEME || 'https';
const WEAVIATE_HOST = process.env.EXPO_PUBLIC_WEAVIATE_HOST || '';
const WEAVIATE_API_KEY = process.env.EXPO_PUBLIC_WEAVIATE_API_KEY || '';

const WEAVIATE_URL = `${WEAVIATE_SCHEME}://${WEAVIATE_HOST}`;

export interface PatientSession {
  sessionType: string;
  date: string;
  doctorName: string;
  doctorSpecialty: string;
  chiefComplaint?: string;
  content: string;
}

/**
 * Get patient context with similar sessions using REST API
 */
export async function getPatientContextWithSessions(
  patientId: string,
  currentSessionContent: string,
  limit: number = 3
): Promise<PatientSession[]> {
  try {
    const response = await fetch(`${WEAVIATE_URL}/v1/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WEAVIATE_API_KEY}`,
      },
      body: JSON.stringify({
        query: `
          {
            Get {
              PatientSession(
                nearText: {
                  concepts: ["${currentSessionContent}"]
                }
                where: {
                  path: ["patientId"]
                  operator: Equal
                  valueText: "${patientId}"
                }
                limit: ${limit}
              ) {
                sessionType
                date
                doctorName
                doctorSpecialty
                chiefComplaint
                content
              }
            }
          }
        `,
      }),
    });

    if (!response.ok) {
      throw new Error(`Weaviate API error: ${response.status}`);
    }

    const data = await response.json();
    const sessions = data?.data?.Get?.PatientSession || [];

    return sessions;
  } catch (error) {
    console.error('Error fetching patient context:', error);
    return [];
  }
}

/**
 * Store patient session in Weaviate using REST API
 */
export async function storePatientSession(
  patientId: string,
  sessionData: {
    sessionType: string;
    date: string;
    doctorName: string;
    doctorSpecialty: string;
    chiefComplaint?: string;
    content: string;
  }
): Promise<void> {
  try {
    const response = await fetch(`${WEAVIATE_URL}/v1/objects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WEAVIATE_API_KEY}`,
      },
      body: JSON.stringify({
        class: 'PatientSession',
        properties: {
          patientId,
          ...sessionData,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to store session: ${response.status}`);
    }

    console.log('✅ Patient session stored in Weaviate');
  } catch (error) {
    console.error('Error storing patient session:', error);
    throw error;
  }
}
