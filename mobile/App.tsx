import AudioRecorder from 'components/AudioRecorder';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native';

import './global.css';

export default function App() {
  return (
    <SafeAreaView className="flex-1">
      <AudioRecorder />
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}
