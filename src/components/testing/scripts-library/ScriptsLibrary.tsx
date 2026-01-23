import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Search,
  Filter,
  Code,
  Play,
  Download,
  Edit,
  Trash2,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Tag
} from 'lucide-react';
import { AutomationScript, TestCategoryType, TestExecutionResult } from '../../../types/testing';
import { useTesting } from '../../../contexts/TestingContext';
import TestRunner from '../test-execution/TestRunner';

interface ScriptsLibraryProps {
  scripts: AutomationScript[];
  onScriptSelect?: (script: AutomationScript) => void;
  onScriptEdit?: (script: AutomationScript) => void;
  onScriptDelete?: (scriptId: string) => void;
  onScriptRun?: (script: AutomationScript) => void;
}

const categoryOptions: { value: TestCategoryType; label: string }[] = [
  { value: 'Appointments & Scheduling', label: 'Appointments & Scheduling' },
  { value: 'Billing & Payments', label: 'Billing & Payments' },
  { value: 'Analytics & Reporting', label: 'Analytics & Reporting' },
  { value: 'Care Coordination', label: 'Care Coordination' },
  { value: 'Patient Portal', label: 'Patient Portal' },
  { value: 'Role-Based Access Control', label: 'Role-Based Access Control' },
  { value: 'Laboratory Management', label: 'Laboratory Management' },
  { value: 'Pharmacy Operations', label: 'Pharmacy Operations' },
  { value: 'Telemedicine', label: 'Telemedicine' },
  { value: 'Inventory Management', label: 'Inventory Management' },
  { value: 'Notifications & Messaging', label: 'Notifications & Messaging' },
  { value: 'Security & Compliance', label: 'Security & Compliance' },
  { value: 'Performance & Load Testing', label: 'Performance & Load Testing' },
  { value: 'Accessibility & Usability', label: 'Accessibility & Usability' },
  { value: 'Integration Testing', label: 'Integration Testing' },
];

export default function ScriptsLibrary({
  scripts,
  onScriptSelect,
  onScriptEdit,
  onScriptDelete,
  onScriptRun
}: ScriptsLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TestCategoryType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'category' | 'lastRun' | 'created'>('created');
  const [selectedScript, setSelectedScript] = useState<AutomationScript | null>(null);

  const filteredAndSortedScripts = useMemo(() => {
    let filtered = scripts.filter(script => {
      const matchesSearch = script.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          script.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || script.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'category':
          return a.category.localeCompare(b.category);
        case 'lastRun':
          if (!a.lastRun && !b.lastRun) return 0;
          if (!a.lastRun) return 1;
          if (!b.lastRun) return -1;
          return new Date(b.lastRun).getTime() - new Date(a.lastRun).getTime();
        case 'created':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [scripts, searchTerm, selectedCategory, sortBy]);

  const getLastRunStatus = (script: AutomationScript) => {
    if (!script.lastStatus) return null;

    return script.lastStatus === 'Passed' ? (
      <Badge className="bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3 mr-1" />
        Passed
      </Badge>
    ) : (
      <Badge className="bg-red-100 text-red-800">
        <XCircle className="h-3 w-3 mr-1" />
        Failed
      </Badge>
    );
  };

  const handleDownload = (script: AutomationScript) => {
    const blob = new Blob([script.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${script.name.replace(/\s+/g, '_')}.py`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search scripts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={(value: TestCategoryType | 'all') => setSelectedCategory(value)}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categoryOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(value: 'name' | 'category' | 'lastRun' | 'created') => setSortBy(value)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created">Created Date</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="category">Category</SelectItem>
                <SelectItem value="lastRun">Last Run</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Scripts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAndSortedScripts.map((script) => (
          <Card key={script.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-2">{script.name}</CardTitle>
                  <Badge variant="outline" className="mt-1">
                    <Tag className="h-3 w-3 mr-1" />
                    {script.category}
                  </Badge>
                </div>
                <div className="flex gap-1">
                  {getLastRunStatus(script)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3 w-3" />
                    <span>Created {script.createdAt.toLocaleDateString()}</span>
                  </div>
                  {script.lastRun && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      <span>Last run {script.lastRun.toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <FileText className="h-3 w-3" />
                    <span>v{script.version}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedScript(script)}
                      >
                        <Code className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle>{script.name}</DialogTitle>
                      </DialogHeader>
                      <ScrollArea className="h-96">
                        <pre className="text-sm font-mono bg-muted p-4 rounded-lg overflow-x-auto">
                          <code>{script.code}</code>
                        </pre>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(script)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onScriptRun && onScriptRun(script)}
                    className="bg-blue-50 hover:bg-blue-100 border-blue-200"
                  >
                    <Play className="h-4 w-4" />
                  </Button>

                  {onScriptEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onScriptEdit(script)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}

                  {onScriptDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onScriptDelete(script.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAndSortedScripts.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Code className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No scripts found</h3>
              <p>
                {scripts.length === 0
                  ? "No automation scripts have been generated yet."
                  : "Try adjusting your search or filter criteria."
                }
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold">{scripts.length}</div>
              <div className="text-sm text-muted-foreground">Total Scripts</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {scripts.filter(s => s.lastStatus === 'Passed').length}
              </div>
              <div className="text-sm text-muted-foreground">Passing</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {scripts.filter(s => s.lastStatus === 'Failed').length}
              </div>
              <div className="text-sm text-muted-foreground">Failing</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {new Set(scripts.map(s => s.category)).size}
              </div>
              <div className="text-sm text-muted-foreground">Categories</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}