'use client';

import { useState, useEffect } from 'react';
import RecordingButton from '@/components/RecordingButton';
import SessionDashboard from '@/components/SessionDashboard';
import NextSteps from '@/components/NextSteps';
import Dashboard from '@/components/Dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Stethoscope, Activity, LayoutDashboard, FileText, Building2 } from 'lucide-react';
import { toast } from 'sonner';

interface Recording {
  id: string;
  date: string;
  transcription: string;
  keyPoints: string[];
  isVerified?: boolean;
}

interface Patient {
  id: string;
  name: string;
  createdAt: string;
}

const STORAGE_KEY = 'medical-assistant-data';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [currentPatientId, setCurrentPatientId] = useState<string>('');
  const [recordingsByPatient, setRecordingsByPatient] = useState<Record<string, Recording[]>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Initialize data after mount to avoid hydration issues
  useEffect(() => {
    setMounted(true);

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setPatients(data.patients || []);
        setCurrentPatientId(data.currentPatientId || '');
        setRecordingsByPatient(data.recordingsByPatient || {});
        return;
      } catch (e) {
        console.error('Failed to parse stored data:', e);
      }
    }

    // Default patient if no data
    const defaultPatient: Patient = {
      id: Date.now().toString(),
      name: 'Demo Patient',
      createdAt: new Date().toISOString(),
    };

    setPatients([defaultPatient]);
    setCurrentPatientId(defaultPatient.id);
    setRecordingsByPatient({ [defaultPatient.id]: [] });
  }, []);

  const currentPatient = patients.find(p => p.id === currentPatientId) || patients[0];
  const recordings = recordingsByPatient[currentPatientId] || [];

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (!mounted) return;

    const dataToStore = {
      patients,
      currentPatientId,
      recordingsByPatient,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));
  }, [mounted, patients, currentPatientId, recordingsByPatient]);

  const handleRecordingComplete = async (transcription: string) => {
    setIsProcessing(true);
    toast.info('Processing recording...');

    try {
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

  if (!mounted) {
    return null;
  }

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
}
