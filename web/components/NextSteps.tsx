"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  MapPin,
  Phone,
  Globe,
  Pill,
  AlertCircle,
  Sparkles,
} from "lucide-react";

interface Clinic {
  name: string;
  location: string;
  country: string;
  specialization: string;
  successRate: string;
  contact: string;
  website: string;
  expertise: string[];
}

interface Medication {
  name: string;
  type: string;
  dosage: string;
  purpose: string;
  sideEffects: string[];
}

interface AdditionalStep {
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  category: string;
}

interface Recording {
  id: string;
  transcription: string;
}

interface NextStepsProps {
  recordings: Recording[];
}

const NextSteps = ({ recordings }: NextStepsProps) => {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [additionalSteps, setAdditionalSteps] = useState<AdditionalStep[]>([]);
  const [condition, setCondition] = useState<string>("");
  const [insights, setInsights] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingInsights, setIsLoadingInsights] = useState(true);
  useEffect(() => {
    // TODO: Implement AI analysis for clinics, medications, and insights
    // For now, just set loading to false since we don't have the backend
    setIsLoading(false);
    setIsLoadingInsights(false);

    // Set placeholder message when we have recordings
    if (recordings && recordings.length > 0) {
      setInsights([
        "✓ AI-powered analysis coming soon",
        "✓ Clinic recommendations will be available after backend setup",
        "✓ Medication suggestions pending",
      ]);
    }
  }, [recordings]);

  if (isLoading || isLoadingInsights) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-lg">
          Analyzing conversation and generating recommendations...
        </span>
      </div>
    );
  }

  if (!recordings || recordings.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        No recordings available. Record a session to see personalized next
        steps.
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "default";
    }
  };

  return (
    <div className="space-y-6">
      {condition && (
        <div className="bg-muted/50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold">Identified Condition</h3>
          <p className="text-muted-foreground">{condition}</p>
        </div>
      )}

      {insights.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">
                Key Insights from Latest Session
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {insights.map((insight, idx) => (
                <li key={idx} className="flex gap-3">
                  <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                  <span className="text-sm leading-relaxed">{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {clinics.length > 0 && (
        <div>
          <h3 className="text-xl font-bold mb-4">
            Recommended Specialist Clinics
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {clinics.map((clinic, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold">
                    {clinic.name}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {clinic.specialization}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm">
                      {clinic.location}, {clinic.country}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm">{clinic.contact}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <a
                      href={clinic.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline break-all"
                    >
                      {clinic.website}
                    </a>
                  </div>

                  <div className="pt-2">
                    <Badge variant="secondary" className="mb-3">
                      {clinic.successRate}
                    </Badge>
                    <div>
                      <p className="text-sm font-semibold mb-2">
                        Areas of Expertise:
                      </p>
                      <ul className="space-y-1.5">
                        {clinic.expertise.map((item, i) => (
                          <li
                            key={i}
                            className="flex gap-2 text-sm text-muted-foreground"
                          >
                            <span className="text-primary">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {medications.length > 0 && (
        <div>
          <h3 className="text-xl font-bold mb-4">
            Commonly Prescribed Medications
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {medications.map((med, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Pill className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div>
                        <h4 className="font-bold text-base">{med.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {med.type}
                        </p>
                      </div>
                      <div className="space-y-1.5 text-sm">
                        <p>
                          <span className="font-semibold">Typical Dosage:</span>{" "}
                          {med.dosage}
                        </p>
                        <p>
                          <span className="font-semibold">Purpose:</span>{" "}
                          {med.purpose}
                        </p>
                        <div>
                          <p className="font-semibold mb-1">
                            Common Side Effects:
                          </p>
                          <ul className="space-y-1">
                            {med.sideEffects.map((effect, i) => (
                              <li
                                key={i}
                                className="flex gap-2 text-muted-foreground"
                              >
                                <span className="text-primary">•</span>
                                <span>{effect}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {additionalSteps.length > 0 && (
        <div>
          <h3 className="text-xl font-bold mb-4">Additional Recommendations</h3>
          <div className="space-y-3">
            {additionalSteps.map((step, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h4 className="font-bold">{step.title}</h4>
                        <Badge
                          variant={getPriorityColor(step.priority)}
                          className="text-xs"
                        >
                          {step.priority}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {step.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {clinics.length === 0 &&
        medications.length === 0 &&
        additionalSteps.length === 0 && (
          <div className="text-center p-8 text-muted-foreground">
            No specific recommendations generated. Please ensure the recording
            contains medical conversation.
          </div>
        )}
    </div>
  );
};

export default NextSteps;
