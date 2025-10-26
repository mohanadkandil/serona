import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Animated,
  TextInput,
} from 'react-native';
import { Audio } from 'expo-av';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { transcribeAudio } from '../services/deepgram';
import { runMedicalAnalysis, ClassificationData } from '../services/agentNative';
import { initDatabase, saveSessionReport } from '../services/database';
import PastReports from './PastReports';
import RealtimeSession from './RealtimeSession';
import { OpenAIRealtimeWebSocketSession } from '../services/openaiRealtimeWebSocket';

export default function AudioRecorderClean() {
  // Initialize database on component mount
  useEffect(() => {
    initDatabase().catch(console.error);
  }, []);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string>('');
  const [recordingTime, setRecordingTime] = useState(0);
  const [showPastReports, setShowPastReports] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [pendingSessionData, setPendingSessionData] = useState<any>(null);
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [mode, setMode] = useState<'recording' | 'realtime'>('recording');

  // Animated question states
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const questionOpacity = useState(new Animated.Value(1))[0];
  const questionScale = useState(new Animated.Value(1))[0];
  const questionTranslateY = useState(new Animated.Value(0))[0];

  const questions = [
    "What is this session about?",
    "What brings the patient in today?",
    "Ready to document the consultation?",
    "Start recording when ready...",
  ];

  // Rotate questions with slide + scale animation
  useEffect(() => {
    if (!isRecording && !transcript) {
      const interval = setInterval(() => {
        // Slide up and fade out
        Animated.parallel([
          Animated.timing(questionOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(questionTranslateY, {
            toValue: -30,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(questionScale, {
            toValue: 0.9,
            duration: 500,
            useNativeDriver: true,
          }),
        ]).start(() => {
          // Change question
          setCurrentQuestionIndex((prev) => (prev + 1) % questions.length);

          // Reset position below
          questionTranslateY.setValue(30);

          // Slide in from below with scale
          Animated.parallel([
            Animated.timing(questionOpacity, {
              toValue: 1,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.spring(questionTranslateY, {
              toValue: 0,
              friction: 8,
              tension: 40,
              useNativeDriver: true,
            }),
            Animated.spring(questionScale, {
              toValue: 1,
              friction: 8,
              tension: 40,
              useNativeDriver: true,
            }),
          ]).start();
        });
      }, 3500); // Change every 3.5 seconds

      return () => clearInterval(interval);
    }
  }, [isRecording, transcript]);

  // AI Analysis States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [researchSteps, setResearchSteps] = useState<string[]>([]);
  const [classification, setClassification] = useState<ClassificationData | null>(null);
  const [patientInsights, setPatientInsights] = useState<string>('');
  const [medicalAnalysis, setMedicalAnalysis] = useState<string>('');
  const [patientHistory, setPatientHistory] = useState<
    Array<{
      sessionType: string;
      date: string;
      doctorName: string;
      doctorSpecialty: string;
      chiefComplaint?: string;
      content: string;
    }>
  >([]);

  // Pulse animations for multiple circles
  const pulse1 = useState(new Animated.Value(1))[0];
  const pulse2 = useState(new Animated.Value(1))[0];
  const pulse3 = useState(new Animated.Value(1))[0];
  const opacity1 = useState(new Animated.Value(0.3))[0];
  const opacity2 = useState(new Animated.Value(0.25))[0];
  const opacity3 = useState(new Animated.Value(0.2))[0];

  // Button animation
  const buttonScale = useState(new Animated.Value(1))[0];
  const buttonGlow = useState(new Animated.Value(0))[0];

  // Idle breathing animation
  const idleBreath = useState(new Animated.Value(1))[0];
  const idleOpacity = useState(new Animated.Value(0.5))[0];

  // Card animations
  const cardScale = useState(new Animated.Value(0))[0];
  const cardOpacity = useState(new Animated.Value(0))[0];

  // Idle breathing effect
  useEffect(() => {
    if (!isRecording && !transcript) {
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(idleBreath, {
              toValue: 1.15,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(idleOpacity, {
              toValue: 0.8,
              duration: 2000,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(idleBreath, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(idleOpacity, {
              toValue: 0.5,
              duration: 2000,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    }
  }, [isRecording, transcript]);

  useEffect(() => {
    if (isRecording) {
      // Start pulse animations with different timings
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse1, {
            toValue: 1.4,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(pulse1, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse2, {
            toValue: 1.5,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(pulse2, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse3, {
            toValue: 1.6,
            duration: 3000,
            useNativeDriver: true,
          }),
          Animated.timing(pulse3, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Fade animations
      Animated.loop(
        Animated.sequence([
          Animated.timing(opacity1, {
            toValue: 0.1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(opacity1, {
            toValue: 0.3,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Start timer
      const interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      return () => clearInterval(interval);
    } else {
      pulse1.setValue(1);
      pulse2.setValue(1);
      pulse3.setValue(1);
      opacity1.setValue(0.3);
      opacity2.setValue(0.25);
      opacity3.setValue(0.2);
      setRecordingTime(0);
    }
  }, [isRecording]);

  // Button pulse effect
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(buttonGlow, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(buttonGlow, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Animate cards when transcript appears
  useEffect(() => {
    if (transcript) {
      cardScale.setValue(0);
      cardOpacity.setValue(0);
      Animated.spring(cardScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [transcript]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      setError('');
      setTranscript('');

      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('Microphone permission is required');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
    } catch (err) {
      setError(
        `Failed to start recording: ${err instanceof Error ? err.message : 'Unknown error'}`
      );
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    try {
      setIsRecording(false);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (uri) {
        setIsTranscribing(true);
        setError('');

        const result = await transcribeAudio(uri);
        setTranscript(result);
        setIsTranscribing(false);
      } else {
        setError('Failed to get recording');
      }

      setRecording(null);
    } catch (err) {
      setIsTranscribing(false);
      setError(`Failed to transcribe: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const handleSaveSession = async () => {
    if (!pendingSessionData) return;

    try {
      const sessionId = await saveSessionReport(pendingSessionData);
      console.log('✅ Session saved to database, ID:', sessionId);
      setShowSaveDialog(false);
      setPendingSessionData(null);
    } catch (err) {
      console.error('❌ Failed to save session to database:', err);
      setError('Failed to save session');
    }
  };

  const handleDontSave = () => {
    console.log('ℹ️  Session not saved (user declined)');
    setShowSaveDialog(false);
    setPendingSessionData(null);
  };

  const analyzeMedical = async () => {
    if (!transcript) return;

    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      setIsAnalyzing(true);
      setError('');
      setResearchSteps([]);
      setClassification(null);
      setPatientInsights('');
      setMedicalAnalysis('');
      setPatientHistory([]);

      console.log('Starting medical analysis...');

      // Variables to capture data as it comes in from the agent
      let capturedClassification: ClassificationData | null = null;
      let capturedPatientInsights = '';
      let capturedMedicalAnalysis = '';
      let capturedResearchSteps: string[] = [];
      let capturedPatientHistory: any[] = [];

      await runMedicalAnalysis(
        transcript,
        {
          onProgress: (data) => {
            console.log('Progress:', data.step);
            setResearchSteps((prev) => [...prev, data.step]);
            capturedResearchSteps.push(data.step);
          },
          onClassification: (data) => {
            console.log('Classification:', data);
            setClassification(data);
            capturedClassification = data;
          },
          onPatientInsights: (data) => {
            console.log('Patient insights received');
            setPatientInsights(data.text);
            capturedPatientInsights = data.text;
          },
          onMedicalAnalysis: (data) => {
            console.log('Medical analysis received');
            setMedicalAnalysis(data.text);
            capturedMedicalAnalysis = data.text;
          },
          onPatientHistory: (data) => {
            console.log('Patient history received:', data.sessions.length, 'sessions');
            setPatientHistory(data.sessions);
            capturedPatientHistory = data.sessions;
          },
          onToolCall: (data) => {
            console.log('Tool call:', data);
            // Tool usage is already shown via onProgress
          },
          onDone: async () => {
            console.log('Analysis complete');
            setIsAnalyzing(false);

            // Prepare session data and show save dialog using captured values
            const sessionData = {
              date: new Date().toLocaleDateString(),
              transcript,
              classification: capturedClassification?.type || '',
              severity: capturedClassification?.urgency || '',
              chiefComplaint: capturedClassification?.primaryConcern || '',
              medicalAnalysis: capturedMedicalAnalysis,
              patientInsights: capturedPatientInsights,
              researchSteps: JSON.stringify(capturedResearchSteps),
              patientHistory: JSON.stringify(capturedPatientHistory),
              createdAt: new Date().toISOString(),
            };

            console.log('📊 Session data prepared:', {
              hasTranscript: !!sessionData.transcript,
              classification: sessionData.classification,
              severity: sessionData.severity,
              chiefComplaint: sessionData.chiefComplaint,
              hasMedicalAnalysis: !!sessionData.medicalAnalysis,
              hasPatientInsights: !!sessionData.patientInsights,
              researchStepsCount: capturedResearchSteps.length,
              historyCount: capturedPatientHistory.length,
            });

            setPendingSessionData(sessionData);

            // Show save confirmation dialog
            setShowSaveDialog(true);
          },
          onError: (error) => {
            console.error('Analysis error:', error);
            setError(`Analysis failed: ${error.message}`);
            setIsAnalyzing(false);
          },
        },
        {
          // Hardcoded patient ID for now
          patientId: 'P-2024-001',
        }
      );
    } catch (err) {
      console.error('Fatal error in analyzeMedical:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to analyze: ${errorMsg}`);
      setIsAnalyzing(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Mode Toggle - Fixed at top */}
      <View className="border-b border-gray-200 bg-white px-6 pb-4 pt-12">
        <View className="flex-row rounded-xl bg-gray-100 p-1">
          <TouchableOpacity
            onPress={() => setMode('recording')}
            className={`flex-1 rounded-lg py-3 ${
              mode === 'recording' ? 'bg-purple-600' : 'bg-transparent'
            }`}
            style={{
              shadowColor: mode === 'recording' ? '#8b5cf6' : 'transparent',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: mode === 'recording' ? 2 : 0,
            }}>
            <View className="flex-row items-center justify-center">
              <MaterialCommunityIcons
                name="microphone"
                size={18}
                color={mode === 'recording' ? 'white' : '#6b7280'}
              />
              <Text
                className={`ml-2 text-sm font-semibold ${
                  mode === 'recording' ? 'text-white' : 'text-gray-600'
                }`}>
                Recording
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setMode('realtime')}
            className={`flex-1 rounded-lg py-3 ${
              mode === 'realtime' ? 'bg-purple-600' : 'bg-transparent'
            }`}
            style={{
              shadowColor: mode === 'realtime' ? '#8b5cf6' : 'transparent',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: mode === 'realtime' ? 2 : 0,
            }}>
            <View className="flex-row items-center justify-center">
              <MaterialCommunityIcons
                name="radio-tower"
                size={18}
                color={mode === 'realtime' ? 'white' : '#6b7280'}
              />
              <Text
                className={`ml-2 text-sm font-semibold ${
                  mode === 'realtime' ? 'text-white' : 'text-gray-600'
                }`}>
                Real-Time
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Conditional rendering based on mode */}
      {mode === 'realtime' ? (
        <RealtimeSession />
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
          {/* Recording Interface */}
          {!transcript && !isTranscribing && (
          <View className="flex-1 items-center justify-center px-6">
            {/* Animated Question - Only show when not recording */}
            {!isRecording && (
              <Animated.View
                className="absolute items-center px-10"
                style={{
                  top: 100,
                  opacity: questionOpacity,
                  transform: [
                    { translateY: questionTranslateY },
                    { scale: questionScale },
                  ],
                }}
              >
                <Text
                  className="text-center text-[28px] font-normal tracking-tight text-gray-800"
                  style={{ fontWeight: '400', lineHeight: 38 }}>
                  {questions[currentQuestionIndex]}
                </Text>
              </Animated.View>
            )}

            <View className="items-center">
              {/* Timer - Positioned absolutely to not affect layout */}
              {isRecording && (
                <View className="absolute top-0 items-center" style={{ top: -180 }}>
                  <Text className="text-7xl font-extralight tracking-tight text-gray-900">
                    {formatTime(recordingTime)}
                  </Text>
                  <Text
                    className="mt-4 text-sm font-medium tracking-widest text-purple-600"
                    style={{ letterSpacing: 3 }}>
                    RECORDING
                  </Text>
                </View>
              )}

              {/* Pulse Circle */}
              <View className="relative items-center justify-center">
                {isRecording && (
                  <>
                    {/* Outermost pulse - Teal */}
                    <Animated.View
                      style={{
                        position: 'absolute',
                        width: 340,
                        height: 340,
                        borderRadius: 170,
                        backgroundColor: 'rgba(20, 184, 166, 0.1)',
                        transform: [{ scale: pulse3 }],
                        opacity: opacity3,
                      }}
                    />
                    {/* Middle pulse - Purple */}
                    <Animated.View
                      style={{
                        position: 'absolute',
                        width: 280,
                        height: 280,
                        borderRadius: 140,
                        backgroundColor: 'rgba(139, 92, 246, 0.13)',
                        transform: [{ scale: pulse2 }],
                        opacity: opacity2,
                      }}
                    />
                    {/* Inner pulse - Indigo */}
                    <Animated.View
                      style={{
                        position: 'absolute',
                        width: 220,
                        height: 220,
                        borderRadius: 110,
                        backgroundColor: 'rgba(99, 102, 241, 0.18)',
                        transform: [{ scale: pulse1 }],
                        opacity: opacity1,
                      }}
                    />
                  </>
                )}

                {!isRecording && (
                  <>
                    {/* Breathing ambient glow for idle state */}
                    <Animated.View
                      style={{
                        position: 'absolute',
                        width: 260,
                        height: 260,
                        borderRadius: 130,
                        backgroundColor: 'rgba(139, 92, 246, 0.08)',
                        transform: [{ scale: idleBreath }],
                        opacity: idleOpacity,
                      }}
                    />
                    <Animated.View
                      style={{
                        position: 'absolute',
                        width: 200,
                        height: 200,
                        borderRadius: 100,
                        backgroundColor: 'rgba(139, 92, 246, 0.12)',
                        transform: [{ scale: idleBreath }],
                        opacity: idleOpacity,
                      }}
                    />
                  </>
                )}

                {/* Record Button */}
                <TouchableOpacity
                  onPress={isRecording ? stopRecording : startRecording}
                  activeOpacity={0.85}
                  className="items-center justify-center rounded-full"
                  style={{
                    width: 140,
                    height: 140,
                    backgroundColor: isRecording ? '#8b5cf6' : '#faf5ff',
                    shadowColor: '#8b5cf6',
                    shadowOffset: { width: 0, height: 12 },
                    shadowOpacity: isRecording ? 0.4 : 0.2,
                    shadowRadius: 20,
                    elevation: 10,
                  }}>
                  {isRecording ? (
                    <View className="rounded-xl bg-white" style={{ width: 44, height: 44 }} />
                  ) : (
                    <View
                      className="rounded-full"
                      style={{
                        width: 70,
                        height: 70,
                        backgroundColor: '#8b5cf6',
                      }}
                    />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Transcribing State */}
        {isTranscribing && (
          <View className="items-center justify-center px-6" style={{ marginTop: 120 }}>
            {/* Animated pulse circle */}
            <View className="relative items-center justify-center">
              <Animated.View
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: 'rgba(139, 92, 246, 0.1)',
                  position: 'absolute',
                  transform: [{ scale: pulse1 }],
                  opacity: opacity1,
                }}
              />
              <Animated.View
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 45,
                  backgroundColor: 'rgba(139, 92, 246, 0.15)',
                  position: 'absolute',
                  transform: [{ scale: pulse2 }],
                  opacity: opacity2,
                }}
              />
              <View
                className="items-center justify-center rounded-full bg-purple-100"
                style={{ width: 70, height: 70 }}>
                <MaterialCommunityIcons name="text-recognition" size={32} color="#8b5cf6" />
              </View>
            </View>

            <Text className="mt-8 text-xl font-semibold text-gray-900">
              Processing Audio...
            </Text>
            <Text className="mt-2 text-center text-sm text-gray-500">
              Converting your recording to text
            </Text>

            <View className="mt-6 flex-row items-center">
              <View className="h-1 w-1 rounded-full bg-purple-400" />
              <View className="mx-1 h-1 w-1 rounded-full bg-purple-400" />
              <View className="h-1 w-1 rounded-full bg-purple-400" />
            </View>
          </View>
        )}

        {/* Error Display */}
        {error ? (
          <View className="mx-6 mb-4 rounded-xl bg-red-50 p-4">
            <Text className="text-sm font-medium text-red-900">Error</Text>
            <Text className="mt-1 text-sm text-red-700">{error}</Text>
          </View>
        ) : null}

        {/* Transcript & Analysis */}
        {transcript && (
          <View className="px-6 pt-6">
            {/* Transcript */}
            <Animated.View
              style={{
                transform: [{ scale: cardScale }],
                opacity: cardOpacity,
              }}>
              <View
                className="mb-5 overflow-hidden rounded-2xl border p-5"
                style={{
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                  elevation: 3,
                }}>
                <View className="mb-4 flex-row items-center justify-between border-b border-gray-100 pb-3">
                  <View className="flex-row items-center">
                    <MaterialCommunityIcons name="file-document-outline" size={22} color="#8b5cf6" />
                    <Text className="ml-3 text-base font-semibold text-gray-900">
                      Session Transcript
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setIsEditingTranscript(!isEditingTranscript)}>
                    <MaterialCommunityIcons
                      name={isEditingTranscript ? 'check-circle' : 'pencil'}
                      size={20}
                      color={isEditingTranscript ? '#10b981' : '#8b5cf6'}
                    />
                  </TouchableOpacity>
                </View>
                {isEditingTranscript ? (
                  <TextInput
                    value={transcript}
                    onChangeText={setTranscript}
                    multiline
                    className="rounded-lg border border-purple-200 bg-purple-50 p-3 text-[15px] leading-6 text-gray-900"
                    style={{ minHeight: 100, lineHeight: 22 }}
                    placeholder="Edit your transcript here..."
                  />
                ) : (
                  <Text className="text-[15px] leading-6 text-gray-700" style={{ lineHeight: 22 }}>
                    {transcript}
                  </Text>
                )}
              </View>
            </Animated.View>

            {/* Analyze Button */}
            {!isAnalyzing && !medicalAnalysis && (
              <Animated.View
                style={{
                  transform: [{ scale: buttonScale }],
                  opacity: buttonGlow.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  }),
                }}>
                <TouchableOpacity
                  onPress={analyzeMedical}
                  activeOpacity={0.8}
                  className="mb-6 w-full rounded-2xl px-8 py-5"
                  style={{
                    backgroundColor: '#8b5cf6',
                    shadowColor: '#8b5cf6',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.4,
                    shadowRadius: 16,
                    elevation: 8,
                  }}>
                  <Text className="text-center text-base font-semibold text-white">
                    Analyze Clinical Data
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}

            {/* Progress */}
            {researchSteps.length > 0 && (
              <View
                className="mb-5 overflow-hidden rounded-2xl border p-5"
                style={{
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                  elevation: 3,
                }}>
                <View className="mb-4 flex-row items-center justify-between border-b border-gray-100 pb-3">
                  <View className="flex-row items-center">
                    <MaterialCommunityIcons name="chart-line" size={22} color="#8b5cf6" />
                    <Text className="ml-3 text-base font-semibold text-gray-900">
                      Analysis Progress
                    </Text>
                  </View>
                  <View className="rounded-md px-2.5 py-1" style={{ backgroundColor: isAnalyzing ? '#f3f4f6' : '#dcfce7' }}>
                    <Text className="text-xs font-medium" style={{ color: isAnalyzing ? '#4b5563' : '#16a34a' }}>
                      {isAnalyzing ? `${researchSteps.filter((s) => s.includes('✅')).length}/${researchSteps.length}` : 'Complete'}
                    </Text>
                  </View>
                </View>
                {researchSteps.map((step, index) => (
                  <View key={index} className="mb-3 flex-row items-start gap-3 last:mb-0">
                    {step.includes('✅') ? (
                      <View
                        className="mt-0.5 h-5 w-5 items-center justify-center rounded-md"
                        style={{ backgroundColor: '#8b5cf6' }}>
                        <MaterialCommunityIcons name="check" size={14} color="#fff" />
                      </View>
                    ) : step.includes('⚠️') ? (
                      <View
                        className="mt-0.5 h-5 w-5 items-center justify-center rounded-md"
                        style={{ backgroundColor: '#f59e0b' }}>
                        <MaterialCommunityIcons name="alert" size={14} color="#fff" />
                      </View>
                    ) : (
                      <View className="mt-0.5">
                        <ActivityIndicator size="small" color="#8b5cf6" />
                      </View>
                    )}
                    <Text className="flex-1 text-[15px] leading-5 text-gray-700">
                      {step.replace(/[✅🏥📋🔄💭🔍⚠️]/g, '').trim()}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Classification */}
            {classification && (
              <View
                className="mb-5 overflow-hidden rounded-2xl border p-5"
                style={{
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                  elevation: 3,
                }}>
                <View className="mb-4 flex-row items-center border-b border-gray-100 pb-3">
                  <FontAwesome5 name="hospital" size={20} color="#14b8a6" />
                  <Text className="ml-3 text-base font-semibold text-gray-900">
                    Case Classification
                  </Text>
                </View>
                <View>
                  <View
                    className="mb-4 flex-row items-start border-l-2 pl-3"
                    style={{ borderLeftColor: '#14b8a6' }}>
                    <View className="flex-1">
                      <Text className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">
                        Complexity
                      </Text>
                      <Text className="text-[15px] font-medium text-gray-900">
                        {classification.complexity === 'complex' ? 'Complex Case' : 'Routine Case'}
                      </Text>
                    </View>
                  </View>
                  <View
                    className="mb-4 flex-row items-start border-l-2 pl-3"
                    style={{ borderLeftColor: '#8b5cf6' }}>
                    <View className="flex-1">
                      <Text className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">
                        Urgency
                      </Text>
                      <Text className="text-[15px] font-medium text-gray-900">
                        {classification.urgency === 'critical'
                          ? 'Critical Priority'
                          : classification.urgency === 'urgent'
                            ? 'Urgent Priority'
                            : 'Routine Priority'}
                      </Text>
                    </View>
                  </View>
                  <View
                    className="flex-row items-start border-l-2 pl-3"
                    style={{ borderLeftColor: '#6366f1' }}>
                    <View className="flex-1">
                      <Text className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">
                        Primary Concern
                      </Text>
                      <Text className="text-[15px] font-medium text-gray-900">
                        {classification.primaryConcern}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* Similar Cases (Patient History) */}
            {patientHistory.length > 0 && (
              <View
                className="mb-5 overflow-hidden rounded-2xl border p-5"
                style={{
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                  elevation: 3,
                }}>
                <View className="mb-4 flex-row items-center border-b border-gray-100 pb-3">
                  <MaterialCommunityIcons name="history" size={22} color="#14b8a6" />
                  <Text className="ml-3 text-base font-semibold text-gray-900">
                    Similar Cases
                  </Text>
                  <View className="ml-auto rounded-full bg-teal-50 px-2.5 py-0.5">
                    <Text className="text-xs font-semibold text-teal-700">
                      {patientHistory.length} {patientHistory.length === 1 ? 'session' : 'sessions'}
                    </Text>
                  </View>
                </View>

                <View>
                  {patientHistory.map((session, index) => (
                    <View
                      key={index}
                      className="mb-3 rounded-xl border border-gray-100 p-3"
                      style={{
                        backgroundColor: '#f9fafb',
                      }}>
                      <View className="mb-2 flex-row items-center justify-between">
                        <View className="flex-row items-center">
                          <View className="rounded-full bg-teal-100 px-2 py-0.5">
                            <Text className="text-xs font-medium text-teal-700">
                              {session.sessionType.toUpperCase()}
                            </Text>
                          </View>
                          <Text className="ml-2 text-xs font-medium text-gray-500">
                            {session.date}
                          </Text>
                        </View>
                      </View>

                      <Text className="mb-1 text-sm font-medium text-gray-900">
                        Dr. {session.doctorName}
                      </Text>
                      <Text className="mb-2 text-xs text-gray-500">
                        {session.doctorSpecialty}
                      </Text>

                      {session.chiefComplaint && (
                        <Text className="mb-2 text-sm font-medium text-gray-700">
                          {session.chiefComplaint}
                        </Text>
                      )}

                      <Text
                        className="text-xs leading-5 text-gray-600"
                        numberOfLines={3}
                        style={{ lineHeight: 18 }}>
                        {session.content.substring(0, 150)}...
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Patient Insights */}
            {patientInsights && (
              <View
                className="mb-5 overflow-hidden rounded-2xl border p-5"
                style={{
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                  elevation: 3,
                }}>
                <View className="mb-4 flex-row items-center border-b border-gray-100 pb-3">
                  <Ionicons name="chatbubbles-outline" size={22} color="#a855f7" />
                  <Text className="ml-3 text-base font-semibold text-gray-900">
                    Patient Communication Insights
                  </Text>
                </View>
                <Text className="text-[15px] leading-6 text-gray-700" style={{ lineHeight: 22 }}>
                  {patientInsights}
                </Text>
              </View>
            )}

            {/* Medical Analysis */}
            {medicalAnalysis && (
              <View
                className="mb-5 overflow-hidden rounded-2xl border p-5"
                style={{
                  backgroundColor: '#ffffff',
                  borderWidth: 1,
                  borderColor: '#e5e7eb',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.06,
                  shadowRadius: 8,
                  elevation: 3,
                }}>
                <View className="mb-4 flex-row items-center border-b border-gray-100 pb-3">
                  <FontAwesome5 name="stethoscope" size={20} color="#6366f1" />
                  <Text className="ml-3 text-base font-semibold text-gray-900">
                    Clinical Assessment
                  </Text>
                </View>
                <Text className="text-[15px] leading-6 text-gray-700" style={{ lineHeight: 22 }}>
                  {medicalAnalysis}
                </Text>
              </View>
            )}

            {/* Save Session Confirmation Box */}
            {showSaveDialog && pendingSessionData && (
              <View
                className="mb-5 overflow-hidden rounded-2xl border p-5"
                style={{
                  backgroundColor: '#faf5ff',
                  borderWidth: 1,
                  borderColor: '#e9d5ff',
                  shadowColor: '#9333EA',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.08,
                  shadowRadius: 8,
                  elevation: 3,
                }}>
                {/* Header */}
                <View className="mb-4 flex-row items-center border-b border-purple-100 pb-3">
                  <MaterialCommunityIcons name="content-save-outline" size={20} color="#9333EA" />
                  <Text className="ml-3 text-base font-semibold text-gray-900">
                    Save Session Report?
                  </Text>
                </View>

                <Text className="mb-4 text-sm leading-5 text-gray-600">
                  Would you like to save this session analysis to your past reports?
                </Text>

                {/* Session Details Preview */}
                {pendingSessionData.chiefComplaint && (
                  <View className="mb-4 rounded-xl bg-white p-3">
                    <Text className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Chief Complaint
                    </Text>
                    <Text className="text-sm font-medium text-gray-900">
                      {pendingSessionData.chiefComplaint}
                    </Text>
                  </View>
                )}

                {/* Classification & Severity Badges */}
                <View className="mb-5 flex-row items-center">
                  {pendingSessionData.classification && (
                    <View className="mr-2 rounded-full bg-purple-200 px-3 py-1">
                      <Text className="text-xs font-medium text-purple-800">
                        {pendingSessionData.classification}
                      </Text>
                    </View>
                  )}
                  {pendingSessionData.severity && (
                    <View className="rounded-full bg-orange-200 px-3 py-1">
                      <Text className="text-xs font-medium text-orange-800">
                        {pendingSessionData.severity}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Action Buttons */}
                <View className="flex-row">
                  <TouchableOpacity
                    onPress={handleDontSave}
                    className="mr-2 flex-1 rounded-xl border border-gray-300 bg-white px-6 py-3"
                    style={{
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 2,
                      elevation: 1,
                    }}>
                    <Text className="text-center text-sm font-semibold text-gray-700">
                      Don't Save
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSaveSession}
                    className="ml-2 flex-1 rounded-xl px-6 py-3"
                    style={{
                      backgroundColor: '#9333EA',
                      shadowColor: '#9333EA',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.3,
                      shadowRadius: 8,
                      elevation: 4,
                    }}>
                    <Text className="text-center text-sm font-semibold text-white">
                      Save Report
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}
        </ScrollView>
      )}

      {/* Past Reports Button - Fixed at bottom - Only show in recording mode */}
      {mode === 'recording' && !isRecording && !isTranscribing && (
        <View className="bg-white px-6 pb-8 pt-2">
          <TouchableOpacity
            onPress={() => setShowPastReports(true)}
            className="flex-row items-center justify-center py-3">
            <MaterialCommunityIcons
              name="clipboard-text-clock-outline"
              size={18}
              color="#9CA3AF"
            />
            <Text className="ml-2 text-sm font-medium text-gray-500">Past Reports</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Past Reports Modal */}
      <PastReports visible={showPastReports} onClose={() => setShowPastReports(false)} />
    </View>
  );
}
