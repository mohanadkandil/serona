import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface RecordingButtonProps {
  onRecordingComplete: (transcription: string) => void;
}

const RecordingButton = ({ onRecordingComplete }: RecordingButtonProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        
        // Convert to base64 and send to Deepgram
        try {
          toast.info('Transcribing audio...');
          
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          
          reader.onloadend = async () => {
            try {
              const base64Audio = reader.result?.toString().split(',')[1];
              
              if (!base64Audio) {
                throw new Error('Failed to convert audio');
              }

              console.log('Calling transcribe-audio function...');
              const { data, error } = await supabase.functions.invoke('transcribe-audio', {
                body: { audio: base64Audio }
              });

              console.log('Transcription response:', data, 'Error:', error);

              if (error) {
                console.error('Transcription error:', error);
                throw new Error(error.message || 'Failed to transcribe audio');
              }

              if (!data?.transcription) {
                console.error('No transcription in response:', data);
                throw new Error('No transcription received');
              }

              console.log('Transcription successful:', data.transcription);
              onRecordingComplete(data.transcription);
              toast.success('Audio transcribed successfully');
            } catch (innerError) {
              console.error('Inner error processing recording:', innerError);
              toast.error(innerError instanceof Error ? innerError.message : 'Failed to transcribe audio');
            }
          };
          
          reader.onerror = () => {
            console.error('FileReader error');
            toast.error('Failed to read audio file');
          };
        } catch (error) {
          console.error('Outer error processing recording:', error);
          toast.error(error instanceof Error ? error.message : 'Failed to transcribe audio');
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      toast.success('Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Failed to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      toast.success('Recording stopped');
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center gap-6">
      <Button
        size="lg"
        onClick={isRecording ? stopRecording : startRecording}
        className={cn(
          'h-32 w-32 rounded-full transition-all duration-300 flex items-center justify-center',
          isRecording
            ? 'bg-[hsl(var(--recording))] hover:bg-[hsl(var(--recording))]/90 shadow-[0_0_40px_hsl(var(--recording)/0.4)] animate-pulse'
            : 'bg-primary hover:bg-primary/90 shadow-[var(--shadow-elevated)]'
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
          ? 'Recording in progress... Click the button to stop'
          : 'Click the microphone to start recording the patient discussion'}
      </p>
    </div>
  );
};

export default RecordingButton;
