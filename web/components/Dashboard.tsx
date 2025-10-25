import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, TrendingUp, Calendar, UserCheck } from 'lucide-react';

interface Recording {
  id: string;
  date: string;
  transcription: string;
  keyPoints: string[];
}

interface DashboardProps {
  recordings: Recording[];
}

const Dashboard = ({ recordings }: DashboardProps) => {
  // Extract urgent items
  const urgentItems = recordings.flatMap(r => 
    r.keyPoints.filter(point => 
      point.toLowerCase().includes('urgent') || 
      point.toLowerCase().includes('concern')
    ).map(point => ({ point, date: r.date }))
  );

  // Extract next steps
  const nextSteps = recordings.flatMap(r => 
    r.keyPoints.filter(point => 
      point.toLowerCase().includes('next') || 
      point.toLowerCase().includes('recommend')
    ).map(point => ({ point, date: r.date }))
  );

  // Timeline of major events
  const majorEvents = recordings.map(r => ({
    date: r.date,
    summary: r.transcription.split('.')[0] + '.',
    keyPoints: r.keyPoints.slice(0, 2)
  }));

  return (
    <div className="space-y-6">
      {/* Alert Section */}
      <Card className="shadow-[var(--shadow-elevated)] border-destructive/50 bg-gradient-to-br from-destructive/5 to-destructive/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Urgent Actions Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          {urgentItems.length > 0 ? (
            <div className="space-y-3">
              {urgentItems.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-card border border-destructive/20">
                  <Badge variant="destructive" className="mt-0.5">Urgent</Badge>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{item.point}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(item.date).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No urgent items at this time</p>
          )}
        </CardContent>
      </Card>

      {/* Next Steps Section */}
      <Card className="shadow-[var(--shadow-card)] border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Recommended Next Steps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {nextSteps.slice(0, 5).map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="h-2 w-2 rounded-full bg-primary mt-2" />
                <div className="flex-1">
                  <p className="text-sm text-foreground">{item.point}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Noted on {new Date(item.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Timeline Section */}
      <Card className="shadow-[var(--shadow-card)] border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" />
            Patient Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {majorEvents.map((event, idx) => (
              <div key={idx} className="relative pl-6 pb-4 border-l-2 border-border last:border-l-0 last:pb-0">
                <div className="absolute left-0 top-0 -translate-x-1/2 h-4 w-4 rounded-full bg-primary border-4 border-background" />
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {new Date(event.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                  <p className="text-sm text-foreground">{event.summary}</p>
                  {event.keyPoints.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {event.keyPoints.map((point, pointIdx) => (
                        <Badge key={pointIdx} variant="secondary" className="text-xs">
                          {point}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card className="shadow-[var(--shadow-card)] border-border bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{recordings.length}</p>
                <p className="text-sm text-muted-foreground">Total Visits</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-[var(--shadow-card)] border-border bg-gradient-to-br from-accent/5 to-accent/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {recordings.reduce((acc, r) => acc + r.keyPoints.length, 0)}
                </p>
                <p className="text-sm text-muted-foreground">Key Points</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-[var(--shadow-card)] border-border bg-gradient-to-br from-destructive/5 to-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{urgentItems.length}</p>
                <p className="text-sm text-muted-foreground">Urgent Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
