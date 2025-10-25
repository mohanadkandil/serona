"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Sparkles, FlaskConical, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface RecordingButtonProps {
  onRecordingComplete: (transcription: string) => void;
}

const RecordingButton = ({ onRecordingComplete }: RecordingButtonProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [transcription, setTranscription] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [classification, setClassification] = useState<any>(null);
  const [researchIncluded, setResearchIncluded] = useState(false);
  const [researchData, setResearchData] = useState<string>("");
  const [manualMode, setManualMode] = useState(false);
  const [manualText, setManualText] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      // Clear previous results
      setTranscription("");
      setAiAnalysis("");
      setClassification(null);
      setResearchIncluded(false);
      setResearchData("");

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

              const data = await aiResponse.json();
              console.log("🚀 AI analysis received:", data);

              setAiAnalysis(data.response);
              setClassification(data.classification);
              setResearchIncluded(data.researchIncluded || false);
              setResearchData(data.researchData || "");
              setIsAnalyzing(false);

              if (data.researchIncluded) {
                toast.success("AI analysis complete with research insights!");
              } else {
                toast.success("AI analysis complete!");
              }
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

  const processManualText = async () => {
    if (!manualText.trim()) {
      toast.error("Please enter some text");
      return;
    }

    try {
      setTranscription(manualText);
      onRecordingComplete(manualText);
      toast.success("Processing manual transcription...");

      // Step 2: Analyze with AI
      setIsAnalyzing(true);

      const aiResponse = await fetch("/api/agent/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transcription: manualText }),
      });

      if (!aiResponse.ok) {
        const errorData = await aiResponse
          .json()
          .catch(() => ({ error: "Unknown error" }));
        console.error("AI API Error:", errorData);
        throw new Error(errorData.error || "Failed to analyze transcription");
      }

      const data = await aiResponse.json();
      console.log("🚀 AI analysis received:", data);

      setAiAnalysis(data.response);
      setClassification(data.classification);
      setResearchIncluded(data.researchIncluded || false);
      setResearchData(data.researchData || "");
      setIsAnalyzing(false);

      if (data.researchIncluded) {
        toast.success("AI analysis complete with research insights!");
      } else {
        toast.success("AI analysis complete!");
      }
    } catch (error) {
      console.error("Error processing manual text:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to process text"
      );
      setIsAnalyzing(false);
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
      {/* Mode Toggle */}
      <div className="flex justify-center gap-2">
        <Button
          variant={!manualMode ? "default" : "outline"}
          size="sm"
          onClick={() => setManualMode(false)}
        >
          <Mic className="h-4 w-4 mr-2" />
          Record Audio
        </Button>
        <Button
          variant={manualMode ? "default" : "outline"}
          size="sm"
          onClick={() => setManualMode(true)}
        >
          <FileText className="h-4 w-4 mr-2" />
          Manual Text
        </Button>
      </div>

      {!manualMode ? (
        /* Audio Recording Mode */
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
      ) : (
        /* Manual Text Mode */
        <div className="flex flex-col gap-4 max-w-2xl mx-auto">
          <Textarea
            placeholder="Paste your medical transcription here..."
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            rows={10}
            className="resize-none"
            disabled={isAnalyzing}
          />
          <Button
            onClick={processManualText}
            disabled={isAnalyzing || !manualText.trim()}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Analyze Transcription
              </>
            )}
          </Button>
        </div>
      )}

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

      {/* Research Data Display */}
      {researchData && (
        <Card className="border-green-600/20 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-green-600" />
              Exa Research Findings
              <Badge variant="default" className="bg-green-600">
                Evidence-Based
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Latest medical literature and clinical guidelines from web research
            </p>
          </CardHeader>
          <CardContent>
            <div className="text-sm leading-relaxed whitespace-pre-wrap bg-white dark:bg-gray-900 p-4 rounded-md border">
              {researchData}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Analysis Display */}
      {(aiAnalysis || isAnalyzing) && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Medical Analysis
                {isAnalyzing && (
                  <span className="text-sm font-normal text-muted-foreground">
                    (Analyzing...)
                  </span>
                )}
              </CardTitle>
              <div className="flex gap-2">
                {classification && (
                  <Badge variant={classification.type === 'RESEARCH_AGENT' ? 'default' : 'secondary'}>
                    {classification.type === 'RESEARCH_AGENT' ? 'Research Mode' : 'Normal Mode'}
                  </Badge>
                )}
                {classification && (
                  <Badge variant={classification.complexity === 'complex' ? 'destructive' : 'outline'}>
                    {classification.complexity}
                  </Badge>
                )}
                {researchIncluded && (
                  <Badge variant="default" className="bg-green-600">
                    <FlaskConical className="h-3 w-3 mr-1" />
                    Research Included
                  </Badge>
                )}
              </div>
            </div>
            {classification?.reasoning && (
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Classification:</strong> {classification.reasoning}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {aiAnalysis ? (
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {aiAnalysis}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <span>
                  {classification?.type === 'RESEARCH_AGENT'
                    ? 'AI is researching and analyzing the transcription...'
                    : 'AI is analyzing the transcription...'}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RecordingButton;
