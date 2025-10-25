# Serona Mobile App

Audio recorder with Deepgram transcription for React Native.

## Features

- Record audio sessions
- Real-time recording duration display
- Automatic transcription using Deepgram API
- Clean, modern UI with NativeWind (TailwindCSS)

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Deepgram API:**
   - Get your API key from [Deepgram Console](https://console.deepgram.com/)
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Add your API key to `.env`:
     ```
     EXPO_PUBLIC_DEEPGRAM_API_KEY=your_api_key_here
     ```

3. **Run the app:**
   ```bash
   npm start
   ```

   Then:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app for physical device

## How It Works

1. Tap the microphone icon to start recording
2. See real-time recording duration
3. Tap "Stop Recording" when finished
4. Audio is automatically transcribed using Deepgram
5. View the transcript in the scrollable text area

## Tech Stack

- React Native (Expo)
- expo-audio for recording
- Deepgram API for transcription
- NativeWind (TailwindCSS) for styling
- TypeScript

## Permissions

The app requires microphone permission to record audio. Permission is requested when you first attempt to record.
