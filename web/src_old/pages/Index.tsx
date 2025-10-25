import { useState, useEffect } from 'react';
import RecordingButton from '@/components/RecordingButton';
import SessionDashboard from '@/components/SessionDashboard';
import NextSteps from '@/components/NextSteps';
import Dashboard from '@/components/Dashboard';
import PatientSelector, { Patient } from '@/components/PatientSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Stethoscope, Activity, LayoutDashboard, FileText, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import patientData from '@/data/patient_data.json';

interface Recording {
  id: string;
  date: string;
  transcription: string;
  keyPoints: string[];
  isVerified?: boolean;
}

const STORAGE_KEY = 'medical-assistant-data';

const Index = () => {
  // Load initial data from localStorage
  const loadInitialData = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse stored data:', e);
      }
    }
    
    // Convert imported patient data to app format
    const defaultPatient: Patient = {
      id: patientData.patient_id,
      name: `${patientData.personal_info.first_name} ${patientData.personal_info.last_name}`,
      createdAt: new Date().toISOString(),
    };
    
    // Convert appointments to recordings format
    const recordings: Recording[] = patientData.appointments.map((apt: any) => {
      // Build comprehensive transcription from appointment data
      const transcription = `
Doctor: ${apt.doctor.name} (${apt.doctor.specialty})
Date: ${apt.date} at ${apt.time}
Facility: ${apt.facility.name}, ${apt.facility.address}

Chief Complaint: ${apt.chief_complaint}

Clinical Notes:
Subjective: ${apt.clinical_notes.subjective}
Objective: ${apt.clinical_notes.objective}
Assessment: ${apt.clinical_notes.assessment}
Plan: ${apt.clinical_notes.plan}

${apt.prescriptions?.length > 0 ? 'Prescriptions:\n' + apt.prescriptions.map((rx: any) => 
  `- ${rx.medication} ${rx.dosage}, ${rx.frequency} for ${rx.duration}`
).join('\n') : ''}

${apt.referral_to ? `Referral: ${apt.referral_to}` : ''}
${apt.referred_from ? `Referred from: ${apt.referred_from}` : ''}
      `.trim();

      // Generate key points from the appointment
      const keyPoints: string[] = [
        apt.chief_complaint,
        ...apt.diagnosis_codes.map((code: string) => `Diagnosis: ${code}`),
        apt.clinical_notes.assessment,
        ...apt.prescriptions?.map((rx: any) => `Rx: ${rx.medication} ${rx.dosage}`) || [],
        apt.referral_to ? `Referral: ${apt.referral_to}` : null,
      ].filter(Boolean);

      return {
        id: apt.appointment_id,
        date: new Date(apt.date).toISOString(),
        transcription,
        keyPoints,
        isVerified: true,
      };
    });
    
    return {
      patients: [defaultPatient],
      currentPatientId: defaultPatient.id,
      recordingsByPatient: {
        [defaultPatient.id]: recordings
      }
    };
  };

  const initialData = loadInitialData();
  const [patients, setPatients] = useState<Patient[]>(initialData.patients);
  const [currentPatientId, setCurrentPatientId] = useState<string>(initialData.currentPatientId);
  const [recordingsByPatient, setRecordingsByPatient] = useState<Record<string, Recording[]>>(initialData.recordingsByPatient);
  const [isProcessing, setIsProcessing] = useState(false);

  const currentPatient = patients.find(p => p.id === currentPatientId) || patients[0];
  const recordings = recordingsByPatient[currentPatientId] || [];

  // Save to localStorage whenever data changes
  useEffect(() => {
    const dataToStore = {
      patients,
      currentPatientId,
      recordingsByPatient,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));
  }, [patients, currentPatientId, recordingsByPatient]);

  const handleRecordingComplete = async (transcription: string) => {
    setIsProcessing(true);
    toast.info('Generating key points...');

    try {
      // Create recording with actual transcription from Deepgram
      const mockRecording: Recording = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        transcription: transcription,
        keyPoints: [
          'Key point extraction coming soon',
          'Will use AI to analyze transcription',
          'Identify next steps and actions',
        ]
      };

      setRecordingsByPatient(prev => ({
        ...prev,
        [currentPatientId]: [mockRecording, ...(prev[currentPatientId] || [])]
      }));
      toast.success('Recording processed successfully');
    } catch (error) {
      console.error('Error processing recording:', error);
      toast.error('Failed to process recording');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateRecording = (id: string, updates: Partial<Recording>) => {
    setRecordingsByPatient(prev => ({
      ...prev,
      [currentPatientId]: prev[currentPatientId]?.map(rec => 
        rec.id === id ? { ...rec, ...updates } : rec
      ) || []
    }));
  };

  const handleAcceptSession = (id: string) => {
    handleUpdateRecording(id, { isVerified: true });
    toast.success('Session accepted and verified');
  };

  const handleDenySession = (id: string) => {
    if (confirm('Are you sure you want to deny this session? It will be deleted.')) {
      setRecordingsByPatient(prev => ({
        ...prev,
        [currentPatientId]: prev[currentPatientId]?.filter(rec => rec.id !== id) || []
      }));
      toast.success('Session denied and removed');
    }
  };

  const handleCreatePatient = (patientData: Omit<Patient, 'id' | 'createdAt'>) => {
    const newPatient: Patient = {
      id: Date.now().toString(),
      ...patientData,
      createdAt: new Date().toISOString(),
    };
    setPatients(prev => [...prev, newPatient]);
    setRecordingsByPatient(prev => ({ ...prev, [newPatient.id]: [] }));
    setCurrentPatientId(newPatient.id);
  };

  const handleSelectPatient = (patient: Patient) => {
    setCurrentPatientId(patient.id);
  };

  const handleDeletePatient = (id: string) => {
    setPatients(prev => prev.filter(p => p.id !== id));
    setRecordingsByPatient(prev => {
      const newData = { ...prev };
      delete newData[id];
      return newData;
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20 max-w-sm mx-auto px-2">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 shadow-sm">
        <div className="px-3 py-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
              <Stethoscope className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground">Medical Assistant</h1>
              <p className="text-[10px] text-muted-foreground">Patient discussions</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-2 py-3">
        <Tabs defaultValue="recording" className="w-full">
          {/* Mobile Bottom Navigation */}
          <TabsList className="fixed bottom-0 left-0 right-0 max-w-sm mx-auto z-40 grid w-full grid-cols-4 h-14 rounded-none border-t-2 bg-card/95 backdrop-blur">
            <TabsTrigger value="recording" className="flex flex-col items-center gap-0.5 py-1.5 data-[state=active]:bg-primary/10">
              <Activity className="h-4 w-4" />
              <span className="text-[10px]">Record</span>
            </TabsTrigger>
            <TabsTrigger value="session-dashboard" className="flex flex-col items-center gap-0.5 py-1.5 data-[state=active]:bg-primary/10">
              <FileText className="h-4 w-4" />
              <span className="text-[10px]">Session</span>
            </TabsTrigger>
            <TabsTrigger value="recommendations" className="flex flex-col items-center gap-0.5 py-1.5 data-[state=active]:bg-primary/10">
              <Building2 className="h-4 w-4" />
              <span className="text-[10px]">Next Steps</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex flex-col items-center gap-0.5 py-1.5 data-[state=active]:bg-primary/10">
              <LayoutDashboard className="h-4 w-4" />
              <span className="text-[10px]">Insights</span>
            </TabsTrigger>
          </TabsList>

          {/* Recording Tab */}
          <TabsContent value="recording" className="mt-0">
            <div className="space-y-3">
              <Card className="shadow-lg border-border bg-gradient-to-br from-card to-muted/10">
                <CardHeader className="border-b border-border pb-3 px-4 pt-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="h-4 w-4 text-primary" />
                    Recording Studio
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Patient: <span className="font-medium text-foreground">{currentPatient?.name || 'Unknown Patient'}</span>
                  </p>
                </CardHeader>
                <CardContent className="pt-6 pb-6 px-4">
                  <RecordingButton onRecordingComplete={handleRecordingComplete} />
                  
                  {isProcessing && (
                    <div className="mt-4 text-center">
                      <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
                      <p className="mt-2 text-xs text-muted-foreground">Processing...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Session Dashboard Tab */}
          <TabsContent value="session-dashboard" className="mt-0">
            <SessionDashboard 
              patientName={currentPatient?.name || 'Unknown Patient'}
              recordings={recordings}
              onAcceptSession={handleAcceptSession}
              onDenySession={handleDenySession}
              onUpdateRecording={handleUpdateRecording}
            />
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="mt-0">
            <NextSteps recordings={recordings} />
          </TabsContent>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="mt-0">
            <Dashboard recordings={recordings} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
