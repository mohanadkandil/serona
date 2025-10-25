import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useAudioRecorder, RecordingPresets, useAudioRecorderState } from 'expo-audio';
import { transcribeAudio } from '../services/deepgram';

export default function AudioRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const state = useAudioRecorderState(recorder);
  const [transcript, setTranscript] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string>('');

  const startRecording = async () => {
    try {
      setError('');
      setTranscript('');
      const { granted } = await recorder.requestPermissionsAsync();

      if (!granted) {
        setError('Microphone permission is required to record audio');
        return;
      }

      await recorder.prepareToRecordAsync();
      await recorder.record();
    } catch (err) {
      setError(`Failed to start recording: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const stopRecording = async () => {
    try {
      await recorder.stop();

      if (recorder.uri) {
        setIsTranscribing(true);
        setError('');

        const result = await transcribeAudio(recorder.uri);
        setTranscript(result);
        setIsTranscribing(false);
      }
    } catch (err) {
      setIsTranscribing(false);
      setError(`Failed to transcribe: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const formatDuration = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <View className="flex-1 p-6 bg-white">
      <View className="items-center mb-8">
        <Text className="text-3xl font-bold text-gray-800 mb-2">Audio Recorder</Text>
        <Text className="text-gray-600">Record and transcribe with Deepgram</Text>
      </View>

      <View className="items-center mb-8">
        {state.isRecording && (
          <View className="items-center mb-4">
            <View className="w-16 h-16 bg-red-500 rounded-full items-center justify-center mb-2 animate-pulse">
              <View className="w-4 h-4 bg-white rounded-full" />
            </View>
            <Text className="text-2xl font-mono text-gray-800">
              {formatDuration(state.durationMillis)}
            </Text>
          </View>
        )}

        {!state.isRecording && !isTranscribing && (
          <TouchableOpacity
            onPress={startRecording}
            className="bg-blue-500 rounded-full w-20 h-20 items-center justify-center shadow-lg active:bg-blue-600"
          >
            <Text className="text-white text-4xl">🎙️</Text>
          </TouchableOpacity>
        )}

        {state.isRecording && (
          <TouchableOpacity
            onPress={stopRecording}
            className="bg-red-500 px-8 py-4 rounded-full shadow-lg active:bg-red-600"
          >
            <Text className="text-white font-bold text-lg">Stop Recording</Text>
          </TouchableOpacity>
        )}

        {isTranscribing && (
          <View className="items-center">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="text-gray-600 mt-2">Transcribing with Deepgram...</Text>
          </View>
        )}
      </View>

      {error ? (
        <View className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <Text className="text-red-800 font-semibold">Error:</Text>
          <Text className="text-red-700 mt-1">{error}</Text>
        </View>
      ) : null}

      {transcript ? (
        <View className="flex-1 bg-gray-50 rounded-lg p-4 border border-gray-200">
          <Text className="text-lg font-bold text-gray-800 mb-2">Transcript:</Text>
          <ScrollView className="flex-1">
            <Text className="text-gray-700 text-base leading-6">{transcript}</Text>
          </ScrollView>
        </View>
      ) : null}

      {!state.isRecording && !transcript && !isTranscribing && (
        <View className="items-center mt-8">
          <Text className="text-gray-400 text-center">
            Tap the microphone to start recording
          </Text>
        </View>
      )}
    </View>
  );
}
