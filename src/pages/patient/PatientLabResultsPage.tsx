import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TestTube2, Calendar, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { usePatientLabResults } from '@/hooks/usePatientPortal';
import { format, parseISO } from 'date-fns';

const statusColors: Record<string, string> = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  collected: 'bg-info/10 text-info border-info/20',
  processing: 'bg-primary/10 text-primary border-primary/20',
  completed: 'bg-success/10 text-success border-success/20',
};

export default function PatientLabResultsPage() {
  const { data: labResults = [], isLoading } = usePatientLabResults();
  const skeletonKeys = ['lab-1', 'lab-2', 'lab-3'];

  const pendingResults = labResults.filter((l) => l.status !== 'completed');
  const completedResults = labResults.filter((l) => l.status === 'completed');

  const LabResultCard = ({ result }: { result: typeof labResults[0] }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-4">
            <div className="p-3 rounded-lg bg-primary/10 shrink-0">
              <TestTube2 className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold">{result.test_name}</h3>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Ordered: {format(parseISO(result.ordered_at), 'MMM d, yyyy')}
                </span>
                {result.completed_at && (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Completed: {format(parseISO(result.completed_at), 'MMM d, yyyy')}
                  </span>
                )}
              </div>
              {result.test_category && (
                <Badge variant="outline" className="mt-2">
                  {result.test_category}
                </Badge>
              )}
            </div>
          </div>
          <Badge className={statusColors[result.status] || statusColors.pending}>
            {result.status}
          </Badge>
        </div>

        {result.status === 'completed' && (result.result_notes || result.normal_range) && (
          <div className="mt-4 p-3 rounded-lg bg-muted/50 border">
            {result.normal_range && (
              <p className="text-sm mb-1">
                <span className="font-medium">Normal Range:</span> {result.normal_range}
              </p>
            )}
            {result.result_notes && (
              <p className="text-sm">
                <span className="font-medium">Notes:</span> {result.result_notes}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Lab Results</h1>
          <p className="text-muted-foreground">View your laboratory test results</p>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All ({labResults.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingResults.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedResults.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            {isLoading ? (
              <div className="space-y-4">
                {skeletonKeys.map((key) => (
                  <Skeleton key={key} className="h-32 w-full" />
                ))}
              </div>
            ) : labResults.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <TestTube2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-1">No lab results</h3>
                  <p className="text-muted-foreground text-center">
                    Your lab test results will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {labResults.map((result) => (
                  <LabResultCard key={result.id} result={result} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="mt-4">
            {pendingResults.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle2 className="h-12 w-12 text-success mb-4" />
                  <h3 className="text-lg font-medium mb-1">All caught up!</h3>
                  <p className="text-muted-foreground text-center">
                    No pending lab results.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingResults.map((result) => (
                  <LabResultCard key={result.id} result={result} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4">
            {completedResults.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-1">No completed results</h3>
                  <p className="text-muted-foreground text-center">
                    Your completed lab results will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {completedResults.map((result) => (
                  <LabResultCard key={result.id} result={result} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
