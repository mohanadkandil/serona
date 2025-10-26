import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import InCallManager from 'react-native-incall-manager';
import {
  mediaDevices,
  RTCPeerConnection,
  MediaStream,
  RTCView,
} from 'react-native-webrtc';
import { getOpenAIEphemeralToken } from '../services/openaiToken';

interface RealtimeSessionProps {
  onTranscript?: (text: string) => void;
  onAnalysis?: (analysis: any) => void;
}

export default function RealtimeSession({ onTranscript, onAnalysis }: RealtimeSessionProps) {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [transcript, setTranscript] = useState('');
  const [assistantResponse, setAssistantResponse] = useState('');
  const [backendStatus, setBackendStatus] = useState<string>('');

  // Test backend connectivity
  async function testBackend() {
    const url = process.env.EXPO_PUBLIC_BACKEND_URL;
    console.log('Testing backend at:', url);
    setBackendStatus('Testing...');
    try {
      const response = await fetch(`${url}/api/openai/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Backend connected!', data);
        setBackendStatus('✅ Backend reachable!');
        alert(`Success! Backend is reachable at:\n${url}\n\nToken received: ${data.client_secret?.value?.substring(0, 20)}...`);
      } else {
        console.error('Backend error:', response.status);
        setBackendStatus(`❌ Error: ${response.status}`);
        alert(`Backend error: ${response.status}\n${await response.text()}`);
      }
    } catch (error) {
      console.error('❌ Cannot reach backend:', error);
      const msg = error instanceof Error ? error.message : 'Unknown';
      setBackendStatus(`❌ Cannot reach backend`);
      alert(`Cannot connect to backend at:\n${url}\n\nError: ${msg}\n\nMake sure:\n1. Backend is running\n2. iPhone and Mac on same WiFi\n3. URL is correct`);
    }
  }
  const [dataChannel, setDataChannel] = useState<null | ReturnType<
    RTCPeerConnection['createDataChannel']
  >>(null);
  const peerConnection = useRef<null | RTCPeerConnection>(null);
  const [localMediaStream, setLocalMediaStream] = useState<null | MediaStream>(null);
  const remoteMediaStream = useRef<MediaStream>(new MediaStream());

  async function startSession() {
    console.log('🎙️ Starting real-time session...');
    try {
      // Get OpenAI ephemeral key from your backend
      console.log('🔑 Requesting ephemeral token...');
      const EPHEMERAL_KEY = await getOpenAIEphemeralToken();
      console.log('✅ Token received');

      // Enable audio
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });

      // Start InCallManager and force speaker
      InCallManager.start({ media: 'audio' });
      InCallManager.setForceSpeakerphoneOn(true);

      // Create a peer connection
      const pc = new RTCPeerConnection();

      // Set up event listeners
      pc.addEventListener('connectionstatechange', (e) => {
        console.log('Connection state:', pc.connectionState);
      });

      pc.addEventListener('track', (event) => {
        if (event.track) remoteMediaStream.current.addTrack(event.track);
      });

      // Add local audio track for microphone input
      const ms = await mediaDevices.getUserMedia({ audio: true });
      setLocalMediaStream(ms);
      pc.addTrack(ms.getTracks()[0]);

      // Set up data channel for sending and receiving events
      const dc = pc.createDataChannel('oai-events');
      setDataChannel(dc);

      // Start the session using the Session Description Protocol (SDP)
      const offer = await pc.createOffer({});
      await pc.setLocalDescription(offer);

      const baseUrl = 'https://api.openai.com/v1/realtime';
      const model = 'gpt-4o-realtime-preview-2024-12-17';
      const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
        method: 'POST',
        body: offer.sdp,
        headers: {
          Authorization: `Bearer ${EPHEMERAL_KEY}`,
          'Content-Type': 'application/sdp',
        },
      });

      const answer = {
        type: 'answer',
        sdp: await sdpResponse.text(),
      };
      await pc.setRemoteDescription(answer);

      peerConnection.current = pc;
    } catch (error) {
      console.error('❌ Failed to start session:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error details:', errorMessage);
      alert(`Failed to start real-time session:\n\n${errorMessage}\n\nMake sure:\n1. Backend is running at ${process.env.EXPO_PUBLIC_BACKEND_URL}\n2. Your iPhone and Mac are on the same WiFi`);
    }
  }

  function stopSession() {
    // Stop InCallManager
    InCallManager.stop();

    if (dataChannel) {
      dataChannel.close();
    }
    if (peerConnection.current) {
      peerConnection.current.close();
    }
    if (localMediaStream) {
      localMediaStream.getTracks().forEach(track => track.stop());
    }

    setIsSessionActive(false);
    setDataChannel(null);
    peerConnection.current = null;
    setLocalMediaStream(null);
  }

  // Configure data channel event listeners
  useEffect(() => {
    function configureSession() {
      console.log('Configuring medical session');
      const event = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: `You are a medical AI assistant helping doctors document patient consultations in real-time.

Your role:
1. Listen to the doctor-patient conversation
2. Extract key medical information: chief complaint, symptoms, history, examination findings
3. Identify urgency levels and any red flags
4. Provide real-time clinical insights and suggestions
5. Help structure the documentation

Guidelines:
- Be concise and relevant
- Use medical terminology appropriately
- Flag critical symptoms immediately
- Assist with differential diagnosis when asked
- Never provide direct patient advice - only assist the doctor
- Maintain professional medical documentation standards

Listen carefully and provide helpful insights as the consultation progresses.`,
          voice: 'alloy',
          input_audio_transcription: { model: 'whisper-1' },
          turn_detection: { type: 'server_vad' },
        },
      };
      dataChannel?.send(JSON.stringify(event));
    }

    if (dataChannel) {
      // Handle incoming messages
      dataChannel.addEventListener('message', async (e: any) => {
        const data = JSON.parse(e.data);
        console.log('Event:', data.type);
        setEvents((prev) => [data, ...prev]);

        // Update transcript from user speech
        if (data.type === 'conversation.item.input_audio_transcription.completed') {
          const userText = data.transcript;
          setTranscript((prev) => prev + '\n[Doctor/Patient]: ' + userText);
          onTranscript?.(userText);
        }

        // Get assistant's audio transcript
        if (data.type === 'response.audio_transcript.done') {
          const assistantText = data.transcript;
          setAssistantResponse(assistantText);
          setTranscript((prev) => prev + '\n[AI Assistant]: ' + assistantText);
        }

        // Handle completed responses
        if (data.type === 'response.done') {
          console.log('Response completed:', data);
        }
      });

      // Set session active when opened
      dataChannel.addEventListener('open', () => {
        setIsSessionActive(true);
        setEvents([]);
        setTranscript('');
        configureSession();
      });

      dataChannel.addEventListener('close', () => {
        console.log('Data channel closed');
      });

      dataChannel.addEventListener('error', (error) => {
        console.error('Data channel error:', error);
      });
    }

    return () => {
      // Cleanup on unmount
      if (isSessionActive) {
        stopSession();
      }
    };
  }, [dataChannel]);

  return (
    <View className="flex-1 bg-gradient-to-b from-purple-50 to-white">
      <ScrollView className="flex-1 px-6 pt-6">
        {/* Header */}
        <View className="mb-6">
          <View className="flex-row items-center">
            <View className="mr-3 rounded-full bg-purple-100 p-3">
              <MaterialCommunityIcons name="microphone-variant" size={28} color="#8b5cf6" />
            </View>
            <View>
              <Text className="text-2xl font-bold text-gray-900">Real-Time Mode</Text>
              <Text className="text-sm text-gray-600">AI-Assisted Documentation</Text>
            </View>
          </View>
        </View>

        {/* Test Backend Button */}
        {!isSessionActive && (
          <TouchableOpacity
            onPress={testBackend}
            className="mb-4 rounded-xl border-2 border-blue-500 bg-blue-50 px-6 py-3">
            <Text className="text-center text-sm font-semibold text-blue-700">
              🔧 Test Backend Connection
            </Text>
            {backendStatus && (
              <Text className="mt-1 text-center text-xs text-blue-600">{backendStatus}</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Session Control */}
        <View className="mb-6">
          {!isSessionActive ? (
            <TouchableOpacity
              onPress={startSession}
              className="rounded-2xl px-8 py-6"
              style={{
                backgroundColor: '#8b5cf6',
                shadowColor: '#8b5cf6',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 4,
              }}>
              <View className="flex-row items-center justify-center">
                <MaterialCommunityIcons name="play-circle" size={24} color="white" />
                <Text className="ml-3 text-lg font-semibold text-white">
                  Start Real-Time Session
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View>
              {/* Active Session Card */}
              <View className="mb-4 rounded-2xl border border-purple-200 bg-purple-50 p-5">
                <View className="mb-3 flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <View className="h-3 w-3 animate-pulse rounded-full bg-red-500" />
                    <Text className="ml-2 font-semibold text-purple-900">Session Active</Text>
                  </View>
                  <View className="rounded-full bg-purple-200 px-3 py-1">
                    <Text className="text-xs font-medium text-purple-800">LIVE</Text>
                  </View>
                </View>
                <Text className="text-sm text-purple-700">
                  AI is listening and providing real-time insights
                </Text>
              </View>

              {/* Stop Button */}
              <TouchableOpacity
                onPress={stopSession}
                className="rounded-2xl border-2 border-red-500 bg-white px-8 py-4">
                <View className="flex-row items-center justify-center">
                  <MaterialCommunityIcons name="stop-circle" size={24} color="#ef4444" />
                  <Text className="ml-3 text-lg font-semibold text-red-500">End Session</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Latest Assistant Response */}
        {assistantResponse && (
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
            <View className="mb-3 flex-row items-center border-b border-gray-100 pb-3">
              <MaterialCommunityIcons name="robot-outline" size={20} color="#8b5cf6" />
              <Text className="ml-3 text-base font-semibold text-gray-900">AI Assistant</Text>
            </View>
            <Text className="text-sm leading-6 text-gray-700">{assistantResponse}</Text>
          </View>
        )}

        {/* Full Transcript */}
        {transcript && (
          <View
            className="mb-5 overflow-hidden rounded-2xl border p-5"
            style={{
              backgroundColor: '#fafafa',
              borderWidth: 1,
              borderColor: '#e5e7eb',
            }}>
            <View className="mb-3 flex-row items-center border-b border-gray-100 pb-3">
              <MaterialCommunityIcons name="text" size={20} color="#6b7280" />
              <Text className="ml-3 text-base font-semibold text-gray-900">
                Session Transcript
              </Text>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              <Text className="text-sm leading-6 text-gray-700" style={{ whiteSpace: 'pre-wrap' }}>
                {transcript}
              </Text>
            </ScrollView>
          </View>
        )}

        {/* Info Card */}
        {!isSessionActive && !transcript && (
          <View className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <View className="mb-2 flex-row items-center">
              <MaterialCommunityIcons name="information" size={20} color="#3b82f6" />
              <Text className="ml-2 font-semibold text-blue-900">How it works</Text>
            </View>
            <Text className="text-sm leading-5 text-blue-800">
              • Start the session to begin real-time AI assistance{'\n'}
              • Speak naturally during patient consultation{'\n'}
              • AI will listen and provide insights in real-time{'\n'}
              • Get suggestions for differential diagnosis{'\n'}
              • Receive structured documentation help{'\n'}
              • End session when consultation is complete
            </Text>
          </View>
        )}

        {/* Hidden audio player */}
        <RTCView stream={remoteMediaStream.current} style={{ height: 0, width: 0 }} />
      </ScrollView>
    </View>
  );
}
