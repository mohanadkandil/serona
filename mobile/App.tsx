import 'polyfills';
import AudioRecorderSimple from 'components/AudioRecorderSimple';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native';

import './global.css';

export default function App() {
  return (
    <SafeAreaView className="flex-1">
      <AudioRecorderSimple />
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}
