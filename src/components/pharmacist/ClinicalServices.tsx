import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useClinicalPharmacy } from '@/hooks/useClinicalPharmacy';
import { useDrugUtilizationReview } from '@/hooks/useDrugUtilizationReview';
import {
  Stethoscope,
  AlertTriangle,
  CheckCircle2,
  Clock,
  FileText,
  TrendingUp,
  Users,
  Pill,
  Target,
  Activity,
} from 'lucide-react';
import { format } from 'date-fns';

interface ClinicalServicesProps {
  className?: string;
}

export function ClinicalServices({ className }: ClinicalServicesProps) {
  const [activeTab, setActiveTab] = useState('interventions');
  const [selectedIntervention, setSelectedIntervention] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const {
    interventions,
    therapyReviews,
    pendingReviews,
    clinicalStats,
    interventionsLoading,
    resolveIntervention,
    resolvingIntervention,
  } = useClinicalPharmacy();

  const {
    durFindings,
    unresolvedFindings,
    durStats,
    runDURAnalysis,
    resolveDURFinding,
    runningAnalysis,
    resolvingFinding,
  } = useDrugUtilizationReview();

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'medium': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default: return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
  };

  const handleResolveIntervention = (id: string) => {
    resolveIntervention({ id, notes: resolutionNotes });
    setSelectedIntervention(null);
    setResolutionNotes('');
  };

  const handleResolveDURFinding = (id: string) => {
    resolveDURFinding({ id });
  };

  const handleRunDURAnalysis = (prescriptionId: string) => {
    runDURAnalysis(prescriptionId);
  };

  return (
    <div className={className}>
      {/* Clinical Pharmacy Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Interventions</CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clinicalStats?.total_interventions || 0}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Therapy Reviews</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clinicalStats?.therapy_reviews || 0}</div>
            <p className="text-xs text-muted-foreground">
              Completed this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DUR Findings</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{durStats?.total_findings || 0}</div>
            <p className="text-xs text-muted-foreground">
              {durStats?.unresolved_findings || 0} unresolved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Savings</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${durStats?.cost_savings || 0}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="interventions">Clinical Interventions</TabsTrigger>
          <TabsTrigger value="reviews">Therapy Reviews</TabsTrigger>
          <TabsTrigger value="dur">Drug Utilization</TabsTrigger>
          <TabsTrigger value="pending">Pending Reviews</TabsTrigger>
        </TabsList>

        {/* Clinical Interventions Tab */}
        <TabsContent value="interventions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5" />
                Clinical Interventions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {interventionsLoading ? (
                <div className="text-center py-4">Loading interventions...</div>
              ) : interventions?.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No clinical interventions found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Medication</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {interventions?.map((intervention) => (
                      <TableRow key={intervention.id}>
                        <TableCell>
                          {intervention.patients?.first_name} {intervention.patients?.last_name}
                        </TableCell>
                        <TableCell>
                          {intervention.prescriptions?.medication_name} {intervention.prescriptions?.dosage}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {intervention.intervention_type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getSeverityColor(intervention.severity)}>
                            {getSeverityIcon(intervention.severity)}
                            <span className="ml-1">{intervention.severity}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={intervention.resolved ? "default" : "secondary"}>
                            {intervention.resolved ? 'Resolved' : 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(intervention.created_at), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          {!intervention.resolved && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedIntervention(intervention.id)}
                                >
                                  Resolve
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Resolve Clinical Intervention</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label htmlFor="notes">Resolution Notes</Label>
                                    <Textarea
                                      id="notes"
                                      placeholder="Describe the resolution..."
                                      value={resolutionNotes}
                                      onChange={(e) => setResolutionNotes(e.target.value)}
                                    />
                                  </div>
                                  <Button
                                    onClick={() => handleResolveIntervention(intervention.id)}
                                    disabled={resolvingIntervention}
                                    className="w-full"
                                  >
                                    {resolvingIntervention ? 'Resolving...' : 'Mark as Resolved'}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Therapy Reviews Tab */}
        <TabsContent value="reviews" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Medication Therapy Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              {therapyReviews?.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No therapy reviews found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Review Type</TableHead>
                      <TableHead>Assessments</TableHead>
                      <TableHead>Recommendations</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {therapyReviews?.map((review) => (
                      <TableRow key={review.id}>
                        <TableCell>
                          {review.patients?.first_name} {review.patients?.last_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {review.review_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {review.effectiveness_evaluated && <Badge variant="secondary" className="text-xs">Effectiveness</Badge>}
                            {review.safety_assessed && <Badge variant="secondary" className="text-xs">Safety</Badge>}
                            {review.adherence_evaluated && <Badge variant="secondary" className="text-xs">Adherence</Badge>}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{review.recommendations?.length || 0} recommendations</span>
                        </TableCell>
                        <TableCell>
                          {format(new Date(review.created_at), 'MMM dd, yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Drug Utilization Review Tab */}
        <TabsContent value="dur" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Drug Utilization Review Findings
              </CardTitle>
            </CardHeader>
            <CardContent>
              {durFindings?.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No DUR findings found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Medication</TableHead>
                      <TableHead>Finding Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {durFindings?.map((finding) => (
                      <TableRow key={finding.id}>
                        <TableCell>
                          {finding.patients?.first_name} {finding.patients?.last_name}
                        </TableCell>
                        <TableCell>
                          {finding.prescriptions?.medication_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {finding.finding_type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getSeverityColor(finding.severity)}>
                            {getSeverityIcon(finding.severity)}
                            <span className="ml-1">{finding.severity}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={finding.resolved ? "default" : "secondary"}>
                            {finding.resolved ? 'Resolved' : 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {!finding.resolved && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResolveDURFinding(finding.id)}
                              disabled={resolvingFinding}
                            >
                              {resolvingFinding ? 'Resolving...' : 'Resolve'}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pending Reviews Tab */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pending Clinical Reviews
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingReviews?.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  No pending reviews
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Medication</TableHead>
                      <TableHead>Dosage</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingReviews?.map((review) => (
                      <TableRow key={review.id}>
                        <TableCell>
                          {review.patients?.first_name} {review.patients?.last_name}
                        </TableCell>
                        <TableCell>{review.medication_name}</TableCell>
                        <TableCell>{review.dosage}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{review.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRunDURAnalysis(review.id)}
                            disabled={runningAnalysis}
                          >
                            {runningAnalysis ? 'Analyzing...' : 'Run DUR'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}