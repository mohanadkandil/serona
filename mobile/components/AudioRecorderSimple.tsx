import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Audio } from 'expo-av';
import { transcribeAudio } from '../services/deepgram';
import { runMedicalAnalysis, ClassificationData } from '../services/agentNative';

export default function AudioRecorderSimple() {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string>('');

  // AI Analysis States
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [researchSteps, setResearchSteps] = useState<string[]>([]);
  const [classification, setClassification] = useState<ClassificationData | null>(null);
  const [patientInsights, setPatientInsights] = useState<string>('');
  const [medicalAnalysis, setMedicalAnalysis] = useState<string>('');
  const [researchData, setResearchData] = useState<string>('');
  const [enhancedAnalysis, setEnhancedAnalysis] = useState<string>('');

  // Test function with sample transcript
  const useSampleTranscript = () => {
    const sampleTranscript = "Patient presents with severe headache for the past 3 days, accompanied by nausea and sensitivity to light. Pain is throbbing, located on the right side of the head. Patient reports this is similar to previous migraine episodes but more intense. Has tried over-the-counter pain relievers with minimal relief. No fever, no recent head trauma. Patient is concerned about frequency of episodes increasing over past 2 months.";
    setTranscript(sampleTranscript);
  };

  const startRecording = async () => {
    try {
      setError('');
      setTranscript('');

      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        setError('Microphone permission is required to record audio');
        return;
      }

      // Set audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
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
      console.log('Stopping recording...');
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      console.log('Recording URI:', uri);

      if (uri) {
        setIsTranscribing(true);
        setError('');
        console.log('Starting transcription...');

        const result = await transcribeAudio(uri);
        console.log('Transcription result:', result);
        setTranscript(result);
        setIsTranscribing(false);
      } else {
        console.log('No URI found');
        setError('Failed to get recording URI');
      }

      setRecording(null);
    } catch (err) {
      console.error('Stop recording error:', err);
      setIsTranscribing(false);
      setError(`Failed to transcribe: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const analyzeMedical = async () => {
    if (!transcript) return;

    try {
      setIsAnalyzing(true);
      setError('');
      setResearchSteps([]);
      setClassification(null);
      setPatientInsights('');
      setMedicalAnalysis('');
      setResearchData('');
      setEnhancedAnalysis('');

      // Run AI analysis natively in the app - no HTTP calls needed!
      await runMedicalAnalysis(transcript, {
        onProgress: (data) => {
          setResearchSteps((prev) => [...prev, data.step]);
        },
        onClassification: (data) => {
          setClassification(data);
        },
        onPatientInsights: (data) => {
          setPatientInsights(data.text);
        },
        onMedicalAnalysis: (data) => {
          setMedicalAnalysis(data.text);
        },
        onDone: () => {
          setIsAnalyzing(false);
        },
        onError: (error) => {
          setError(`Analysis failed: ${error.message}`);
          setIsAnalyzing(false);
        },
      });
    } catch (err) {
      setError(`Failed to analyze: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIsAnalyzing(false);
    }
  };

  return (
    <View className="flex-1 bg-white p-6">
      <View className="mb-8 items-center">
        <Text className="mb-2 text-3xl font-bold text-gray-800">Audio Recorder</Text>
        <Text className="text-gray-600">Record and transcribe with Deepgram</Text>
      </View>

      <View className="mb-8 items-center">
        {isRecording && (
          <View className="mb-4 items-center">
            <View className="mb-2 h-16 w-16 animate-pulse items-center justify-center rounded-full bg-red-500">
              <View className="h-4 w-4 rounded-full bg-white" />
            </View>
            <Text className="font-mono text-2xl text-gray-800">Recording...</Text>
          </View>
        )}

        {!isRecording && !isTranscribing && (
          <TouchableOpacity
            onPress={startRecording}
            className="h-20 w-20 items-center justify-center rounded-full bg-blue-500 shadow-lg active:bg-blue-600">
            <Text className="text-4xl text-white">🎙️</Text>
          </TouchableOpacity>
        )}

        {isRecording && (
          <TouchableOpacity
            onPress={stopRecording}
            className="rounded-full bg-red-500 px-8 py-4 shadow-lg active:bg-red-600">
            <Text className="text-lg font-bold text-white">Stop Recording</Text>
          </TouchableOpacity>
        )}

        {isTranscribing && (
          <View className="items-center">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="mt-2 text-gray-600">Transcribing with Deepgram...</Text>
          </View>
        )}
      </View>

      {error ? (
        <View className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <Text className="font-semibold text-red-800">Error:</Text>
          <Text className="mt-1 text-red-700">{error}</Text>
        </View>
      ) : null}

      {transcript ? (
        <ScrollView className="flex-1">
          <View className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <Text className="mb-2 text-lg font-bold text-gray-800">Transcript:</Text>
            <Text className="text-base leading-6 text-gray-700">{transcript}</Text>
          </View>

          {/* AI Analysis Button */}
          {!isAnalyzing && !medicalAnalysis && (
            <TouchableOpacity
              onPress={analyzeMedical}
              className="mb-4 rounded-lg bg-green-500 px-6 py-4 active:bg-green-600">
              <Text className="text-center text-lg font-bold text-white">
                🏥 Analyze Clinical Data
              </Text>
            </TouchableOpacity>
          )}

          {/* Progress Steps */}
          {isAnalyzing && researchSteps.length > 0 && (
            <View className="mb-4 rounded-lg border border-green-200 bg-white p-4">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-lg font-bold text-gray-800">
                  Clinical Analysis in Progress
                </Text>
                <Text className="text-sm text-gray-600">
                  {researchSteps.filter((s) => s.includes('✅')).length}/{researchSteps.length}{' '}
                  steps
                </Text>
              </View>
              <ScrollView className="max-h-60">
                {researchSteps.map((step, index) => {
                  const isComplete = step.includes('✅');
                  return (
                    <View
                      key={index}
                      className="mb-2 flex-row items-start gap-3 rounded-lg border border-gray-200 p-3">
                      {isComplete ? (
                        <Text className="text-lg text-green-600">✅</Text>
                      ) : (
                        <ActivityIndicator size="small" color="#10b981" />
                      )}
                      <Text
                        className={`flex-1 text-sm ${isComplete ? 'text-gray-700' : 'font-medium text-gray-900'}`}>
                        {step}
                      </Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Classification Card */}
          {classification && (
            <View className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <Text className="mb-2 text-lg font-bold text-gray-800">📋 Case Classification</Text>
              <View className="space-y-2">
                <View className="mb-1 flex-row items-center gap-2">
                  <Text className="font-semibold text-gray-700">Type:</Text>
                  <Text className="text-gray-600">
                    {classification.type === 'RESEARCH_AGENT'
                      ? 'Requires Evidence-Based Research'
                      : 'Standard Clinical Analysis'}
                  </Text>
                </View>
                <View className="mb-1 flex-row items-center gap-2">
                  <Text className="font-semibold text-gray-700">Complexity:</Text>
                  <Text className="text-gray-600">
                    {classification.complexity === 'complex' ? 'Complex Case' : 'Routine Case'}
                  </Text>
                </View>
                <View className="mb-1 flex-row items-center gap-2">
                  <Text className="font-semibold text-gray-700">Urgency:</Text>
                  <Text className="text-gray-600">
                    {classification.urgency === 'critical'
                      ? 'Critical Priority'
                      : classification.urgency === 'urgent'
                        ? 'Urgent Priority'
                        : 'Routine Priority'}
                  </Text>
                </View>
                <View className="mb-1">
                  <Text className="mb-1 font-semibold text-gray-700">Primary Concern:</Text>
                  <Text className="text-gray-600">{classification.primaryConcern}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Patient Communication Insights */}
          {patientInsights && (
            <View className="mb-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
              <Text className="mb-2 text-lg font-bold text-gray-800">
                💭 Patient Communication Insights
              </Text>
              <Text className="text-base leading-6 text-gray-700">{patientInsights}</Text>
            </View>
          )}

          {/* Medical Analysis */}
          {medicalAnalysis && (
            <View className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4">
              <Text className="mb-2 text-lg font-bold text-gray-800">🔍 Clinical Assessment</Text>
              <Text className="text-base leading-6 text-gray-700">{medicalAnalysis}</Text>
            </View>
          )}

          {/* Research Data */}
          {researchData && (
            <View className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <Text className="mb-2 text-lg font-bold text-gray-800">
                🔬 Evidence-Based Research
              </Text>
              <Text className="text-base leading-6 text-gray-700">{researchData}</Text>
            </View>
          )}

          {/* Enhanced Analysis */}
          {enhancedAnalysis && (
            <View className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 p-4">
              <Text className="mb-2 text-lg font-bold text-gray-800">
                📚 Research-Enhanced Analysis
              </Text>
              <Text className="text-base leading-6 text-gray-700">{enhancedAnalysis}</Text>
            </View>
          )}
        </ScrollView>
      ) : null}

      {!isRecording && !transcript && !isTranscribing && (
        <View className="mt-8 items-center">
          <Text className="text-center text-gray-400 mb-4">Tap the microphone to start recording</Text>

          {/* Development Mode Button */}
          <TouchableOpacity
            onPress={useSampleTranscript}
            className="bg-purple-500 px-6 py-3 rounded-lg active:bg-purple-600">
            <Text className="text-white font-bold">🧪 Use Sample Transcript (Testing)</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
