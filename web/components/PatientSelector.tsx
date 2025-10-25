import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { UserPlus, Users, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

const patientSchema = z.object({
  name: z.string().trim().min(2, { message: "Name must be at least 2 characters" }).max(100, { message: "Name must be less than 100 characters" }),
  dateOfBirth: z.string().optional(),
  medicalId: z.string().trim().max(50, { message: "Medical ID must be less than 50 characters" }).optional(),
});

export interface Patient {
  id: string;
  name: string;
  dateOfBirth?: string;
  medicalId?: string;
  createdAt: string;
}

interface PatientSelectorProps {
  patients: Patient[];
  currentPatient: Patient | null;
  onSelectPatient: (patient: Patient) => void;
  onCreatePatient: (patient: Omit<Patient, 'id' | 'createdAt'>) => void;
  onDeletePatient: (id: string) => void;
}

const PatientSelector = ({
  patients,
  currentPatient,
  onSelectPatient,
  onCreatePatient,
  onDeletePatient,
}: PatientSelectorProps) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: '',
    dateOfBirth: '',
    medicalId: '',
  });

  const handleCreatePatient = () => {
    try {
      const validation = patientSchema.safeParse(newPatient);
      
      if (!validation.success) {
        const errors = validation.error.errors.map(e => e.message).join(', ');
        toast.error(`Validation failed: ${errors}`);
        return;
      }

      onCreatePatient(newPatient);
      setNewPatient({ name: '', dateOfBirth: '', medicalId: '' });
      setIsCreateOpen(false);
      toast.success('Patient created successfully');
    } catch (error) {
      toast.error('Failed to create patient');
    }
  };

  const handleDeletePatient = (id: string) => {
    if (patients.length === 1) {
      toast.error('Cannot delete the only patient');
      return;
    }
    if (currentPatient?.id === id) {
      toast.error('Cannot delete the currently selected patient');
      return;
    }
    onDeletePatient(id);
    toast.success('Patient deleted');
  };

  return (
    <div className="flex items-center gap-2">
      {/* Patient Selector Dropdown */}
      <Select
        value={currentPatient?.id}
        onValueChange={(id) => {
          const patient = patients.find(p => p.id === id);
          if (patient) onSelectPatient(patient);
        }}
      >
        <SelectTrigger className="w-full max-w-[200px] bg-card">
          <SelectValue placeholder="Select patient" />
        </SelectTrigger>
        <SelectContent className="bg-card border-border z-50">
          {patients.map((patient) => (
            <SelectItem key={patient.id} value={patient.id}>
              {patient.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Create Patient Button */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0">
            <UserPlus className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Create New Patient</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="name">Patient Name *</Label>
              <Input
                id="name"
                value={newPatient.name}
                onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                placeholder="John Doe"
                maxLength={100}
              />
            </div>
            <div>
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                value={newPatient.dateOfBirth}
                onChange={(e) => setNewPatient({ ...newPatient, dateOfBirth: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="medicalId">Medical ID</Label>
              <Input
                id="medicalId"
                value={newPatient.medicalId}
                onChange={(e) => setNewPatient({ ...newPatient, medicalId: e.target.value })}
                placeholder="Optional"
                maxLength={50}
              />
            </div>
            <Button onClick={handleCreatePatient} className="w-full">
              Create Patient
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Patients Button */}
      <Dialog open={isManageOpen} onOpenChange={setIsManageOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0">
            <Users className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-card border-border max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Patients</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            {patients.map((patient) => (
              <Card key={patient.id} className="p-3 bg-muted/30">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{patient.name}</p>
                    {patient.dateOfBirth && (
                      <p className="text-xs text-muted-foreground">DOB: {new Date(patient.dateOfBirth).toLocaleDateString()}</p>
                    )}
                    {patient.medicalId && (
                      <p className="text-xs text-muted-foreground">ID: {patient.medicalId}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Created: {new Date(patient.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  {patients.length > 1 && currentPatient?.id !== patient.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeletePatient(patient.id)}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PatientSelector;
