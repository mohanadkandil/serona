import 'polyfills';
import AudioRecorder from 'components/AudioRecorder';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import './global.css';

export default function App() {
  return (
    <View className="flex-1 bg-white">
      <AudioRecorder />
      <StatusBar style="dark" />
    </View>
  );
}
