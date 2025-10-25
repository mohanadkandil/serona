import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, User, Edit2, Save, X, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { z } from 'zod';
import { toast } from 'sonner';

interface Recording {
  id: string;
  date: string;
  transcription: string;
  keyPoints: string[];
  isVerified?: boolean;
}

const transcriptionSchema = z.object({
  transcription: z.string()
    .trim()
    .min(10, { message: "Transcription must be at least 10 characters" })
    .max(5000, { message: "Transcription must be less than 5000 characters" }),
  keyPoints: z.array(z.string().trim().max(500, { message: "Key point must be less than 500 characters" }))
    .min(1, { message: "At least one key point is required" })
});

interface PatientDataCardProps {
  patientName: string;
  recordings: Recording[];
  onUpdateRecording?: (id: string, updates: Partial<Recording>) => void;
}

const PatientDataCard = ({ patientName, recordings, onUpdateRecording }: PatientDataCardProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedTranscription, setEditedTranscription] = useState('');
  const [editedKeyPoints, setEditedKeyPoints] = useState('');

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleEdit = (recording: Recording) => {
    setEditingId(recording.id);
    setEditedTranscription(recording.transcription);
    setEditedKeyPoints(recording.keyPoints.join('\n'));
  };

  const handleSave = (id: string) => {
    try {
      const keyPointsArray = editedKeyPoints
        .split('\n')
        .map(point => point.trim())
        .filter(point => point.length > 0);

      const validation = transcriptionSchema.safeParse({
        transcription: editedTranscription,
        keyPoints: keyPointsArray
      });

      if (!validation.success) {
        const errors = validation.error.errors.map(e => e.message).join(', ');
        toast.error(`Validation failed: ${errors}`);
        return;
      }

      onUpdateRecording?.(id, {
        transcription: editedTranscription,
        keyPoints: keyPointsArray
      });

      setEditingId(null);
      toast.success('Recording updated successfully');
    } catch (error) {
      toast.error('Failed to update recording');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditedTranscription('');
    setEditedKeyPoints('');
  };

  const handleVerify = (id: string, currentVerified?: boolean) => {
    onUpdateRecording?.(id, { isVerified: !currentVerified });
    toast.success(currentVerified ? 'Verification removed' : 'Recording verified');
  };

  return (
    <Card className="shadow-[var(--shadow-card)] border-border bg-card">
      <CardHeader className="border-b border-border bg-gradient-to-r from-primary/5 to-accent/5">
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          {patientName}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {recordings.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No recordings yet for this patient
          </p>
        ) : (
          <div className="space-y-4">
            {recordings.map((recording) => (
              <div
                key={recording.id}
                className={cn(
                  'p-4 rounded-lg border border-border bg-gradient-to-br from-background to-muted/20',
                  'hover:shadow-[var(--shadow-card)] transition-all duration-200',
                  recording.isVerified && 'border-primary/50 bg-primary/5'
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">
                      {formatDate(recording.date)}
                    </span>
                    {recording.isVerified && (
                      <Badge variant="default" className="ml-2 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  
                  {editingId !== recording.id && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(recording)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`verify-${recording.id}`}
                          checked={recording.isVerified || false}
                          onCheckedChange={() => handleVerify(recording.id, recording.isVerified)}
                        />
                        <label
                          htmlFor={`verify-${recording.id}`}
                          className="text-sm text-muted-foreground cursor-pointer"
                        >
                          Verified
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                {editingId === recording.id ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-semibold text-foreground mb-2 block">
                        Key Points (one per line):
                      </label>
                      <Textarea
                        value={editedKeyPoints}
                        onChange={(e) => setEditedKeyPoints(e.target.value)}
                        className="min-h-[120px]"
                        placeholder="Enter key points, one per line"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-semibold text-foreground mb-2 block">
                        Transcription:
                      </label>
                      <Textarea
                        value={editedTranscription}
                        onChange={(e) => setEditedTranscription(e.target.value)}
                        className="min-h-[150px]"
                        placeholder="Enter transcription"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleSave(recording.id)}
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Save className="h-4 w-4" />
                        Save
                      </Button>
                      <Button
                        onClick={handleCancel}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {recording.keyPoints.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1">
                          <FileText className="h-4 w-4 text-accent" />
                          Key Information:
                        </p>
                        <ul className="space-y-1">
                          {recording.keyPoints.map((point, i) => (
                            <li
                              key={i}
                              className="text-sm text-muted-foreground pl-4 border-l-2 border-accent/50"
                            >
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded border border-border/50">
                      <p>{recording.transcription}</p>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PatientDataCard;
