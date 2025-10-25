"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RecordingButtonProps {
  onRecordingComplete: (transcription: string) => void;
}

const RecordingButton = ({ onRecordingComplete }: RecordingButtonProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [transcription, setTranscription] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      // Clear previous results
      setTranscription("");
      setAiAnalysis("");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());

        try {
          toast.info("Transcribing audio...");

          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);

          reader.onloadend = async () => {
            try {
              const base64Audio = reader.result?.toString().split(",")[1];

              if (!base64Audio) {
                throw new Error("Failed to convert audio");
              }

              // Step 1: Transcribe audio
              console.log("Calling transcribe API...");
              const transcribeResponse = await fetch("/api/transcribe", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ audio: base64Audio }),
              });

              const transcribeData = await transcribeResponse.json();

              if (!transcribeResponse.ok) {
                throw new Error(
                  transcribeData.error || "Failed to transcribe audio"
                );
              }

              if (!transcribeData?.transcription) {
                throw new Error("No transcription received");
              }

              const transcriptionText = transcribeData.transcription;
              console.log("Transcription successful:", transcriptionText);
              setTranscription(transcriptionText);
              onRecordingComplete(transcriptionText);
              toast.success("Transcription complete! Analyzing...");

              // Step 2: Analyze with AI
              setIsAnalyzing(true);
              console.log(
                "Calling AI agent with transcription:",
                transcriptionText
              );

              const aiResponse = await fetch("/api/agent/chat", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ transcription: transcriptionText }),
              });

              console.log("AI Response status:", aiResponse.status);

              if (!aiResponse.ok) {
                const errorData = await aiResponse
                  .json()
                  .catch(() => ({ error: "Unknown error" }));
                console.error("AI API Error:", errorData);
                throw new Error(
                  errorData.error || "Failed to analyze transcription"
                );
              }

              const { response } = await aiResponse.json();
              console.log("🚀 AI analysis received:", response);

              setAiAnalysis(response);
              setIsAnalyzing(false);
              toast.success("AI analysis complete!");
            } catch (innerError) {
              console.error("Error processing recording:", innerError);
              toast.error(
                innerError instanceof Error
                  ? innerError.message
                  : "Failed to process recording"
              );
              setIsAnalyzing(false);
            }
          };

          reader.onerror = () => {
            console.error("FileReader error");
            toast.error("Failed to read audio file");
          };
        } catch (error) {
          console.error("Outer error processing recording:", error);
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to process recording"
          );
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      toast.success("Recording started");
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Failed to access microphone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      toast.success("Recording stopped");
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center gap-6">
        <Button
          size="lg"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isAnalyzing}
          className={cn(
            "h-32 w-32 rounded-full transition-all duration-300 flex items-center justify-center",
            isRecording
              ? "bg-[hsl(var(--recording))] hover:bg-[hsl(var(--recording))]/90 shadow-[0_0_40px_hsl(var(--recording)/0.4)] animate-pulse"
              : "bg-primary hover:bg-primary/90 shadow-[var(--shadow-elevated)]"
          )}
        >
          {isRecording ? (
            <Square className="h-12 w-12 text-primary-foreground" />
          ) : (
            <Mic className="h-12 w-12 text-primary-foreground" />
          )}
        </Button>

        {isRecording && (
          <div className="text-2xl font-semibold text-foreground animate-in fade-in">
            {formatDuration(duration)}
          </div>
        )}

        <p className="text-muted-foreground text-center max-w-md">
          {isRecording
            ? "Recording in progress... Click the button to stop"
            : isAnalyzing
            ? "Analyzing with AI..."
            : "Click the microphone to start recording the patient discussion"}
        </p>
      </div>

      {/* Transcription Display */}
      {transcription && (
        <Card className="border-primary/20 bg-card">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Transcription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {transcription}
            </p>
          </CardContent>
        </Card>
      )}

      {/* AI Analysis Display */}
      {(aiAnalysis || isAnalyzing) && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Medical Analysis
              {isAnalyzing && (
                <span className="text-sm font-normal text-muted-foreground">
                  (Analyzing...)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aiAnalysis ? (
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {aiAnalysis}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <span>AI is analyzing the transcription...</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RecordingButton;
