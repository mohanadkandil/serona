import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, XCircle, Calendar, Pencil, Save, X } from 'lucide-react';

interface Recording {
  id: string;
  date: string;
  transcription: string;
  keyPoints: string[];
  isVerified?: boolean;
}

interface SessionDashboardProps {
  patientName: string;
  recordings: Recording[];
  onAcceptSession?: (id: string) => void;
  onDenySession?: (id: string) => void;
  onUpdateRecording?: (id: string, updates: Partial<Recording>) => void;
}

const SessionDashboard = ({ 
  patientName, 
  recordings, 
  onAcceptSession, 
  onDenySession,
  onUpdateRecording
}: SessionDashboardProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState('');

  const handleStartEdit = (recording: Recording) => {
    setEditingId(recording.id);
    setEditedText(recording.transcription);
  };

  const handleSaveEdit = (id: string) => {
    if (onUpdateRecording && editedText.trim()) {
      onUpdateRecording(id, { transcription: editedText.trim() });
      setEditingId(null);
      setEditedText('');
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditedText('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-3">
      {recordings.length === 0 ? (
        <Card className="shadow-md border-border">
          <CardContent className="pt-6 pb-6 text-center">
            <p className="text-sm text-muted-foreground">No sessions recorded yet for {patientName}</p>
          </CardContent>
        </Card>
      ) : (
        recordings.map((recording) => (
          <Card 
            key={recording.id} 
            className={`shadow-md border-border ${
              recording.isVerified 
                ? 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30' 
                : 'bg-card'
            }`}
          >
            <CardHeader className="pb-3 px-4 pt-4 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-foreground">
                    {formatDate(recording.date)}
                  </span>
                </div>
                {recording.isVerified && (
                  <Badge variant="default" className="text-[10px] flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Accepted
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="px-4 py-4 space-y-4">
              {/* Summary of Session */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-foreground">Summary of Session</h3>
                  {editingId !== recording.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartEdit(recording)}
                      className="h-7 px-2 text-xs"
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
                {editingId === recording.id ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      className="text-xs min-h-[100px]"
                      placeholder="Edit session notes..."
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleSaveEdit(recording.id)}
                        size="sm"
                        className="flex-1 h-8 text-xs"
                      >
                        <Save className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                      <Button
                        onClick={handleCancelEdit}
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                    {recording.transcription}
                  </p>
                )}
              </div>

              {/* Accept/Deny Actions */}
              {!recording.isVerified && (
                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => onAcceptSession?.(recording.id)}
                    className="flex-1 h-9 text-xs flex items-center gap-1"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Accept
                  </Button>
                  <Button
                    onClick={() => onDenySession?.(recording.id)}
                    variant="destructive"
                    className="flex-1 h-9 text-xs flex items-center gap-1"
                  >
                    <XCircle className="h-4 w-4" />
                    Deny
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default SessionDashboard;