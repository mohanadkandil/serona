// Lazy imports to avoid loading in React Native environment
let weaviate: any = null;
let WeaviateClient: any = null;
let ApiKey: any = null;
let OpenAI: any = null;

async function loadDependencies() {
  if (!weaviate) {
    // These imports will only happen when actually needed (server-side or scripts)
    const weaviateModule = await import('weaviate-ts-client');
    weaviate = weaviateModule.default;
    WeaviateClient = weaviateModule.WeaviateClient;
    ApiKey = weaviateModule.ApiKey;

    const openaiModule = await import('openai');
    OpenAI = openaiModule.default;
  }
}

// Initialize OpenAI for embeddings
async function getOpenAIClient() {
  await loadDependencies();
  const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not found in environment variables');
  }
  return new OpenAI({ apiKey });
}

// Initialize Weaviate client
let client: any = null;

export async function getWeaviateClient() {
  await loadDependencies();

  if (!client) {
    const scheme = process.env.EXPO_PUBLIC_WEAVIATE_SCHEME || 'https';
    const host = process.env.EXPO_PUBLIC_WEAVIATE_HOST;
    const apiKey = process.env.EXPO_PUBLIC_WEAVIATE_API_KEY;

    if (!host) {
      throw new Error('Weaviate host not found in environment variables');
    }

    console.log(`Connecting to Weaviate at ${scheme}://${host}`);

    client = weaviate.client({
      scheme,
      host,
      apiKey: apiKey ? new ApiKey(apiKey) : undefined,
    });
  }
  return client;
}

// Define the schema for patient session chunks
export async function createPatientSessionSchema() {
  const client = await getWeaviateClient();

  const schemaConfig = {
    class: 'PatientSession',
    description: 'Medical session records including appointments, scans, and doctor comments',
    vectorizer: 'none', // We'll provide our own vectors using OpenAI embeddings
    vectorIndexType: 'hnsw',
    vectorIndexConfig: {
      distance: 'cosine',
    },
    properties: [
      {
        name: 'patientId',
        dataType: ['text'],
        description: 'Unique patient identifier',
      },
      {
        name: 'sessionId',
        dataType: ['text'],
        description: 'Unique session/appointment/scan ID',
      },
      {
        name: 'sessionType',
        dataType: ['text'],
        description: 'Type of session: appointment, scan, or comment',
      },
      {
        name: 'date',
        dataType: ['text'],
        description: 'Date of the session',
      },
      {
        name: 'content',
        dataType: ['text'],
        description: 'Full text content of the session for embedding and retrieval',
      },
      {
        name: 'chiefComplaint',
        dataType: ['text'],
        description: 'Main complaint or reason for visit',
      },
      {
        name: 'diagnosisCodes',
        dataType: ['text[]'],
        description: 'ICD codes for diagnoses',
      },
      {
        name: 'doctorName',
        dataType: ['text'],
        description: 'Name of the attending physician',
      },
      {
        name: 'doctorSpecialty',
        dataType: ['text'],
        description: 'Medical specialty of the doctor',
      },
      {
        name: 'facilityName',
        dataType: ['text'],
        description: 'Name of the medical facility',
      },
      {
        name: 'medications',
        dataType: ['text[]'],
        description: 'List of medications prescribed or discussed',
      },
      {
        name: 'tags',
        dataType: ['text[]'],
        description: 'Tags for categorization and filtering',
      },
      {
        name: 'rawData',
        dataType: ['text'],
        description: 'Original JSON data for reference',
      },
    ],
  };

  try {
    // Check if class already exists
    const exists = await client.schema.classGetter().withClassName('PatientSession').do();
    if (exists) {
      console.log('PatientSession schema already exists');
      return;
    }
  } catch (error) {
    // Class doesn't exist, create it
  }

  await client.schema.classCreator().withClass(schemaConfig).do();
  console.log('PatientSession schema created successfully');
}

// Generate embeddings using OpenAI
async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAIClient();
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small', // More cost-effective
    input: text,
  });
  return response.data[0].embedding;
}

// Chunk appointment data
function createAppointmentChunk(patientId: string, appointment: any): any {
  const content = `
Date: ${appointment.date}
Type: ${appointment.type}
Doctor: ${appointment.doctor.name} (${appointment.doctor.specialty})
Facility: ${appointment.facility.name}
Chief Complaint: ${appointment.chief_complaint}

Clinical Notes:
Subjective: ${appointment.clinical_notes.subjective}
Objective: ${appointment.clinical_notes.objective}
Assessment: ${appointment.clinical_notes.assessment}
Plan: ${appointment.clinical_notes.plan}

${appointment.prescriptions?.length > 0 ? `Prescriptions: ${appointment.prescriptions.map((p: any) => `${p.medication} ${p.dosage} ${p.frequency}`).join(', ')}` : ''}
${appointment.referral_to ? `Referral: ${appointment.referral_to}` : ''}
  `.trim();

  return {
    patientId,
    sessionId: appointment.appointment_id,
    sessionType: 'appointment',
    date: appointment.date,
    content,
    chiefComplaint: appointment.chief_complaint || '',
    diagnosisCodes: appointment.diagnosis_codes || [],
    doctorName: appointment.doctor.name,
    doctorSpecialty: appointment.doctor.specialty,
    facilityName: appointment.facility.name,
    medications: appointment.prescriptions?.map((p: any) => p.medication) || [],
    tags: [appointment.type, appointment.doctor.specialty],
    rawData: JSON.stringify(appointment),
  };
}

// Chunk scan data
function createScanChunk(patientId: string, scan: any): any {
  const content = `
Date: ${scan.date}
Scan Type: ${scan.scan_type}
Body Region: ${scan.body_region}
Radiologist: ${scan.radiologist.name}
Facility: ${scan.facility.name}

Indication: ${scan.indication}
Technique: ${scan.technique}

Findings:
${scan.findings.join('\n')}

Impression: ${scan.impression}
Recommendation: ${scan.recommendation}
  `.trim();

  return {
    patientId,
    sessionId: scan.scan_id,
    sessionType: 'scan',
    date: scan.date,
    content,
    chiefComplaint: scan.indication || '',
    diagnosisCodes: [],
    doctorName: scan.radiologist.name,
    doctorSpecialty: scan.radiologist.specialty,
    facilityName: scan.facility.name,
    medications: [],
    tags: [scan.scan_type, scan.body_region, 'imaging'],
    rawData: JSON.stringify(scan),
  };
}

// Chunk doctor comment data
function createCommentChunk(patientId: string, comment: any): any {
  const content = `
Date: ${comment.date}
Doctor: ${comment.doctor.name} (${comment.doctor.specialty})
Comment Type: ${comment.comment_type}
${comment.priority === 'high' || comment.is_critical ? 'PRIORITY: HIGH' : ''}

${comment.content}

Tags: ${comment.tags.join(', ')}
  `.trim();

  return {
    patientId,
    sessionId: comment.comment_id,
    sessionType: 'comment',
    date: comment.date,
    content,
    chiefComplaint: '',
    diagnosisCodes: [],
    doctorName: comment.doctor.name,
    doctorSpecialty: comment.doctor.specialty,
    facilityName: comment.doctor.facility || '',
    medications: [],
    tags: [...comment.tags, comment.comment_type],
    rawData: JSON.stringify(comment),
  };
}

// Index patient data into Weaviate
export async function indexPatientData(patientData: any) {
  const client = await getWeaviateClient();
  await createPatientSessionSchema();

  const chunks: any[] = [];

  // Process appointments
  if (patientData.appointments) {
    for (const appointment of patientData.appointments) {
      chunks.push(createAppointmentChunk(patientData.patient_id, appointment));
    }
  }

  // Process scans
  if (patientData.scans) {
    for (const scan of patientData.scans) {
      chunks.push(createScanChunk(patientData.patient_id, scan));
    }
  }

  // Process doctor comments
  if (patientData.doctor_comments) {
    for (const comment of patientData.doctor_comments) {
      chunks.push(createCommentChunk(patientData.patient_id, comment));
    }
  }

  // Index each chunk with embeddings
  console.log(`Indexing ${chunks.length} chunks...`);

  for (const chunk of chunks) {
    try {
      // Generate embedding for the content
      const embedding = await generateEmbedding(chunk.content);

      // Store in Weaviate
      await client.data
        .creator()
        .withClassName('PatientSession')
        .withProperties(chunk)
        .withVector(embedding)
        .do();

      console.log(`Indexed ${chunk.sessionType}: ${chunk.sessionId}`);
    } catch (error) {
      console.error(`Error indexing ${chunk.sessionId}:`, error);
    }
  }

  console.log('Patient data indexing complete!');
}

// Search patient history using semantic search
export async function searchPatientHistory(
  query: string,
  patientId?: string,
  limit: number = 5
): Promise<any[]> {
  const client = await getWeaviateClient();

  // Generate embedding for the query
  const queryEmbedding = await generateEmbedding(query);

  // Build the query
  let weaviateQuery = client.graphql
    .get()
    .withClassName('PatientSession')
    .withFields('patientId sessionId sessionType date content chiefComplaint diagnosisCodes doctorName doctorSpecialty facilityName medications tags')
    .withNearVector({
      vector: queryEmbedding,
    })
    .withLimit(limit);

  // Filter by patient ID if provided
  if (patientId) {
    weaviateQuery = weaviateQuery.withWhere({
      path: ['patientId'],
      operator: 'Equal',
      valueText: patientId,
    });
  }

  const result = await weaviateQuery.do();

  return result.data.Get.PatientSession || [];
}

// Get full patient context for current session
export async function getPatientContext(
  patientId: string,
  currentQuery: string,
  limit: number = 10
): Promise<string> {
  const relevantSessions = await searchPatientHistory(currentQuery, patientId, limit);

  if (relevantSessions.length === 0) {
    return 'No relevant patient history found.';
  }

  const context = relevantSessions
    .map((session: any, index: number) => {
      return `
--- Session ${index + 1} (${session.sessionType} - ${session.date}) ---
Doctor: ${session.doctorName} (${session.doctorSpecialty})
${session.chiefComplaint ? `Chief Complaint: ${session.chiefComplaint}` : ''}

${session.content}
`;
    })
    .join('\n\n');

  return context;
}

// Add new session from recording
export async function addNewSessionFromRecording(
  patientId: string,
  transcript: string,
  analysis: any,
  date: string = new Date().toISOString().split('T')[0]
) {
  const client = await getWeaviateClient();

  const sessionId = `REC-${Date.now()}`;

  const content = `
Date: ${date}
Type: Voice Recorded Session
Session Transcript: ${transcript}

AI Analysis:
${analysis.medicalAnalysis || 'No analysis available'}

Patient Insights:
${analysis.patientInsights || 'No insights available'}

Classification:
- Complexity: ${analysis.classification?.complexity || 'Unknown'}
- Urgency: ${analysis.classification?.urgency || 'Unknown'}
- Primary Concern: ${analysis.classification?.primaryConcern || 'Unknown'}
  `.trim();

  const chunk = {
    patientId,
    sessionId,
    sessionType: 'recording',
    date,
    content,
    chiefComplaint: analysis.classification?.primaryConcern || '',
    diagnosisCodes: [],
    doctorName: 'Voice Recording',
    doctorSpecialty: 'AI-Assisted Documentation',
    facilityName: 'Mobile App',
    medications: [],
    tags: ['voice_recording', 'ai_analysis', analysis.classification?.urgency || 'routine'],
    rawData: JSON.stringify({ transcript, analysis }),
  };

  try {
    const embedding = await generateEmbedding(content);

    await client.data
      .creator()
      .withClassName('PatientSession')
      .withProperties(chunk)
      .withVector(embedding)
      .do();

    console.log(`Added new recording session: ${sessionId}`);
    return sessionId;
  } catch (error) {
    console.error('Error adding new session:', error);
    throw error;
  }
}
