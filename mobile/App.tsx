import 'polyfills';
import AudioRecorderClean from 'components/AudioRecorderClean';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';

import './global.css';

export default function App() {
  return (
    <View className="flex-1 bg-white">
      <AudioRecorderClean />
      <StatusBar style="dark" />
    </View>
  );
}
