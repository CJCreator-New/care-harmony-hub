import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Save,
  X,
  Plus,
  Trash2,
  Paperclip,
  MessageSquare,
  Play,
  Code,
  Clock
} from 'lucide-react';
import { TestCase, TestStatus, TestPriority, Note, Attachment } from '../../../types/testing';
import { useTesting } from '../../../contexts/TestingContext';

interface TestDetailsPanelProps {
  testCase: TestCase | null;
  isOpen: boolean;
  onClose: () => void;
}

const statusOptions: { value: TestStatus; label: string }[] = [
  { value: 'Not Started', label: 'Not Started' },
  { value: 'In Progress', label: 'In Progress' },
  { value: 'Passed', label: 'Passed' },
  { value: 'Failed', label: 'Failed' },
  { value: 'Blocked', label: 'Blocked' },
  { value: 'N/A', label: 'N/A' },
];

const priorityOptions: { value: TestPriority; label: string }[] = [
  { value: 'Critical', label: 'Critical' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
];

export default function TestDetailsPanel({ testCase, isOpen, onClose }: TestDetailsPanelProps) {
  const { updateTestCase } = useTesting();
  const [editedTestCase, setEditedTestCase] = useState<TestCase | null>(null);
  const [newNote, setNewNote] = useState('');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (testCase) {
      setEditedTestCase({ ...testCase });
      setIsDirty(false);
    }
  }, [testCase]);

  if (!editedTestCase) return null;

  const handleSave = () => {
    if (editedTestCase) {
      updateTestCase(editedTestCase);
      setIsDirty(false);
    }
  };

  const handleFieldChange = (field: keyof TestCase, value: any) => {
    setEditedTestCase(prev => prev ? { ...prev, [field]: value } : null);
    setIsDirty(true);
  };

  const handleStepsChange = (index: number, value: string) => {
    const newSteps = [...editedTestCase.steps];
    newSteps[index] = value;
    handleFieldChange('steps', newSteps);
  };

  const addStep = () => {
    handleFieldChange('steps', [...editedTestCase.steps, '']);
  };

  const removeStep = (index: number) => {
    const newSteps = editedTestCase.steps.filter((_, i) => i !== index);
    handleFieldChange('steps', newSteps);
  };

  const addNote = () => {
    if (newNote.trim()) {
      const note: Note = {
        id: Date.now().toString(),
        content: newNote.trim(),
        timestamp: new Date(),
        author: 'Current User', // TODO: Get from auth context
      };
      handleFieldChange('notes', [...editedTestCase.notes, note]);
      setNewNote('');
    }
  };

  const getStatusColor = (status: TestStatus) => {
    const colors = {
      'Not Started': 'bg-gray-100 text-gray-800',
      'In Progress': 'bg-yellow-100 text-yellow-800',
      'Passed': 'bg-green-100 text-green-800',
      'Failed': 'bg-red-100 text-red-800',
      'Blocked': 'bg-orange-100 text-orange-800',
      'N/A': 'bg-gray-50 text-gray-600',
    };
    return colors[status];
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Test Case Details</span>
            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(editedTestCase.status)}>
                {editedTestCase.status}
              </Badge>
              <Badge variant="outline">
                {editedTestCase.priority}
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Test Name</Label>
                    <Input
                      id="name"
                      value={editedTestCase.name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="assignee">Assignee</Label>
                    <Input
                      id="assignee"
                      value={editedTestCase.assignee || ''}
                      onChange={(e) => handleFieldChange('assignee', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={editedTestCase.description}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Status</Label>
                    <Select
                      value={editedTestCase.status}
                      onValueChange={(value: TestStatus) => handleFieldChange('status', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select
                      value={editedTestCase.priority}
                      onValueChange={(value: TestPriority) => handleFieldChange('priority', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {priorityOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Test Steps */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  Test Steps
                  <Button onClick={addStep} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Step
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {editedTestCase.steps.map((step, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground min-w-[24px]">
                      {index + 1}.
                    </span>
                    <Input
                      value={step}
                      onChange={(e) => handleStepsChange(index, e.target.value)}
                      placeholder={`Step ${index + 1}`}
                      className="flex-1"
                    />
                    <Button
                      onClick={() => removeStep(index)}
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Expected vs Actual Results */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Expected Result</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={editedTestCase.expectedResult}
                    onChange={(e) => handleFieldChange('expectedResult', e.target.value)}
                    rows={4}
                    placeholder="Describe the expected outcome..."
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Actual Result</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={editedTestCase.actualResult}
                    onChange={(e) => handleFieldChange('actualResult', e.target.value)}
                    rows={4}
                    placeholder="Describe what actually happened..."
                  />
                </CardContent>
              </Card>
            </div>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  Notes & Comments
                  <div className="flex gap-2">
                    <Input
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a note..."
                      onKeyPress={(e) => e.key === 'Enter' && addNote()}
                    />
                    <Button onClick={addNote} size="sm">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-32">
                  <div className="space-y-3">
                    {editedTestCase.notes.map((note) => (
                      <div key={note.id} className="border-l-2 border-muted pl-3">
                        <div className="text-sm text-muted-foreground">
                          {note.author} • {note.timestamp.toLocaleString()}
                        </div>
                        <div className="text-sm">{note.content}</div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Automation */}
            {editedTestCase.automationEnabled && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Automation Script</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Code className="h-4 w-4 mr-2" />
                        Generate Script
                      </Button>
                      <Button variant="outline" size="sm">
                        <Play className="h-4 w-4 mr-2" />
                        Run Test
                      </Button>
                    </div>
                    {editedTestCase.automationScript && (
                      <Textarea
                        value={editedTestCase.automationScript}
                        readOnly
                        rows={10}
                        className="font-mono text-sm"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Attachments */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  Attachments
                  <Button variant="outline" size="sm">
                    <Paperclip className="h-4 w-4 mr-2" />
                    Add Attachment
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editedTestCase.attachments.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    No attachments yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {editedTestCase.attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <Paperclip className="h-4 w-4" />
                          <span className="text-sm">{attachment.name}</span>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Last updated: {editedTestCase.lastUpdated.toLocaleString()}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!isDirty}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}