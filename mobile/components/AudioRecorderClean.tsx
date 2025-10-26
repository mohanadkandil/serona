import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Animated } from 'react-native';
import { Audio } from 'expo-av';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { transcribeAudio } from '../services/deepgram';
import { runMedicalAnalysis, ClassificationData } from '../services/agentNative';

export default function AudioRecorderClean() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string>('');
  const [recordingTime, setRecordingTime] = useState(0);

  // AI Analysis States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [researchSteps, setResearchSteps] = useState<string[]>([]);
  const [classification, setClassification] = useState<ClassificationData | null>(null);
  const [patientInsights, setPatientInsights] = useState<string>('');
  const [medicalAnalysis, setMedicalAnalysis] = useState<string>('');

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
      setError(`Failed to start recording: ${err instanceof Error ? err.message : 'Unknown error'}`);
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

      console.log('Starting medical analysis...');

      await runMedicalAnalysis(transcript, {
        onProgress: (data) => {
          console.log('Progress:', data.step);
          setResearchSteps((prev) => [...prev, data.step]);
        },
        onClassification: (data) => {
          console.log('Classification:', data);
          setClassification(data);
        },
        onPatientInsights: (data) => {
          console.log('Patient insights received');
          setPatientInsights(data.text);
        },
        onMedicalAnalysis: (data) => {
          console.log('Medical analysis received');
          setMedicalAnalysis(data.text);
        },
        onDone: () => {
          console.log('Analysis complete');
          setIsAnalyzing(false);
        },
        onError: (error) => {
          console.error('Analysis error:', error);
          setError(`Analysis failed: ${error.message}`);
          setIsAnalyzing(false);
        },
      });
    } catch (err) {
      console.error('Fatal error in analyzeMedical:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to analyze: ${errorMsg}`);
      setIsAnalyzing(false);
    }
  };

  return (
    <View className="flex-1 bg-white">
      <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
        {/* Recording Interface */}
        {!transcript && !isTranscribing && (
          <View className="flex-1 items-center justify-center px-6">
            {/* Header - Only show when not recording */}
            {!isRecording && (
              <View className="absolute top-20 items-center">
                <Text className="text-5xl font-thin tracking-wide text-gray-800" style={{ fontWeight: '200' }}>
                  Hey Dr.
                </Text>
              </View>
            )}

            <View className="items-center">
              {/* Timer - Positioned absolutely to not affect layout */}
              {isRecording && (
                <View className="absolute top-0 items-center" style={{ top: -180 }}>
                  <Text className="text-7xl font-extralight tracking-tight text-gray-900">
                    {formatTime(recordingTime)}
                  </Text>
                  <Text className="mt-4 text-sm font-medium tracking-widest text-purple-600" style={{ letterSpacing: 3 }}>
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
                    <View
                      className="rounded-xl bg-white"
                      style={{ width: 44, height: 44 }}
                    />
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
          <View className="items-center px-6 pt-20">
            <ActivityIndicator size="large" color="#8b5cf6" />
            <Text className="mt-4 text-base text-gray-600">Transcribing your note...</Text>
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
                <View className="mb-4 flex-row items-center border-b border-gray-100 pb-3">
                  <MaterialCommunityIcons name="file-document-outline" size={22} color="#8b5cf6" />
                  <Text className="ml-3 text-base font-semibold text-gray-900">
                    Session Transcript
                  </Text>
                </View>
                <Text className="text-[15px] leading-6 text-gray-700" style={{ lineHeight: 22 }}>
                  {transcript}
                </Text>
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
            {isAnalyzing && researchSteps.length > 0 && (
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
                    <Text className="ml-3 text-base font-semibold text-gray-900">Analysis Progress</Text>
                  </View>
                  <View
                    className="rounded-md px-2.5 py-1"
                    style={{ backgroundColor: '#f3f4f6' }}>
                    <Text className="text-xs font-medium text-gray-600">
                      {researchSteps.filter((s) => s.includes('✅')).length}/{researchSteps.length}
                    </Text>
                  </View>
                </View>
                {researchSteps.slice(-3).map((step, index) => (
                  <View key={index} className="mb-3 flex-row items-start gap-3">
                    {step.includes('✅') ? (
                      <View
                        className="mt-0.5 h-5 w-5 items-center justify-center rounded-md"
                        style={{ backgroundColor: '#8b5cf6' }}>
                        <MaterialCommunityIcons name="check" size={14} color="#fff" />
                      </View>
                    ) : (
                      <View className="mt-0.5">
                        <ActivityIndicator size="small" color="#8b5cf6" />
                      </View>
                    )}
                    <Text className="flex-1 text-[15px] leading-5 text-gray-700">
                      {step.replace(/[✅🏥📋🔄💭🔍]/g, '').trim()}
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
                  <View className="mb-4 flex-row items-start border-l-2 pl-3" style={{ borderLeftColor: '#14b8a6' }}>
                    <View className="flex-1">
                      <Text className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">
                        Complexity
                      </Text>
                      <Text className="text-[15px] font-medium text-gray-900">
                        {classification.complexity === 'complex' ? 'Complex Case' : 'Routine Case'}
                      </Text>
                    </View>
                  </View>
                  <View className="mb-4 flex-row items-start border-l-2 pl-3" style={{ borderLeftColor: '#8b5cf6' }}>
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
                  <View className="flex-row items-start border-l-2 pl-3" style={{ borderLeftColor: '#6366f1' }}>
                    <View className="flex-1">
                      <Text className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500">
                        Primary Concern
                      </Text>
                      <Text className="text-[15px] font-medium text-gray-900">{classification.primaryConcern}</Text>
                    </View>
                  </View>
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
          </View>
        )}
      </ScrollView>
    </View>
  );
}
