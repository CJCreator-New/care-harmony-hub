/**
 * RadiologyPage.tsx
 * Comprehensive Diagnostic Imaging & PACS Management Hub
 *
 * Implements:
 * - Modality worklists (X-Ray, CT, MRI, Ultrasound, Mammography)
 * - Technician Pre-Scan Safety Gates (Pregnancy, eGFR contrast clearance, MRI checklist)
 * - Interactive DICOM / PACS Viewer Viewport integration
 * - Two-Stage ACR Reporting (Preliminary Wet Read vs Finalized Digital Signature)
 * - Critical Radiologic Findings (Panic Read) 30-Minute SLA Alert Banner
 */

import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Scan,
  Plus,
  Search,
  Eye,
  FileText,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  PhoneCall,
  Activity,
} from 'lucide-react';
import { format } from 'date-fns';
import { useRadiologyOrders, RadiologyOrder } from '@/hooks/useRadiologyOrders';
import { ImagingModality, evaluateCriticalAlertSla } from '@/lib/clinical/radiologyWorkflowRules';
import { CreateImagingOrderModal } from '@/components/radiology/CreateImagingOrderModal';
import { PreScanSafetyModal } from '@/components/radiology/PreScanSafetyModal';
import { DicomViewerModal } from '@/components/radiology/DicomViewerModal';
import { RadiologyReportingModal } from '@/components/radiology/RadiologyReportingModal';
import { usePermissions } from '@/lib/hooks';

export default function RadiologyPage() {
  const permissions = usePermissions();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModality, setSelectedModality] = useState<ImagingModality | 'all'>('all');

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [safetyModal, setSafetyModal] = useState<{ open: boolean; order: RadiologyOrder | null }>({
    open: false,
    order: null,
  });
  const [viewerModal, setViewerModal] = useState<{ open: boolean; order: RadiologyOrder | null }>({
    open: false,
    order: null,
  });
  const [reportingModal, setReportingModal] = useState<{
    open: boolean;
    order: RadiologyOrder | null;
  }>({
    open: false,
    order: null,
  });

  const { orders, isLoading, criticalPendingCount } = useRadiologyOrders(selectedModality);

  const filteredOrders = orders.filter((order) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      order.test_name.toLowerCase().includes(term) ||
      order.patient?.first_name.toLowerCase().includes(term) ||
      order.patient?.last_name.toLowerCase().includes(term) ||
      order.patient?.mrn.toLowerCase().includes(term) ||
      (order.specimen_barcode && order.specimen_barcode.toLowerCase().includes(term));
    return matchesSearch;
  });

  // Critical unacknowledged alerts
  const criticalUnnotifiedOrders = orders.filter((o) => o.is_critical && !o.critical_notified_at);

  // Status stats
  const awaitingScanCount = orders.filter((o) => o.status === 'ordered').length;
  const inProgressCount = orders.filter((o) => o.status === 'in_progress').length;
  const preliminaryCount = orders.filter(
    (o) => o.metadata?.preliminaryRead && o.status !== 'completed'
  ).length;
  const finalizedCount = orders.filter((o) => o.status === 'completed').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Scan className="h-6 w-6 text-primary" />
              Radiology & Diagnostic Imaging (PACS)
            </h1>
            <p className="text-sm text-muted-foreground">
              Modality worklists, interactive DICOM viewer, technician safety clearance, and ACR
              reports
            </p>
          </div>
          <Button onClick={() => setIsCreateModalOpen(true)} className="bg-primary text-white">
            <Plus className="mr-1.5 h-4 w-4" />
            Order Imaging Study
          </Button>
        </div>

        {/* Critical Panic Read Closed-Loop Alert Banner */}
        {criticalUnnotifiedOrders.length > 0 && (
          <div className="bg-destructive/15 border-2 border-destructive rounded-xl p-4 text-destructive space-y-2 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShieldAlert className="h-5 w-5 text-destructive" />
                <span>CRITICAL RADIOLOGY FINDING REQUIRING IMMEDIATE PHYSICIAN READ-BACK</span>
              </div>
              <Badge variant="destructive" className="uppercase text-xs font-mono">
                {criticalUnnotifiedOrders.length} Urgent Notification Pending
              </Badge>
            </div>
            {criticalUnnotifiedOrders.map((alertOrder) => {
              const sla = evaluateCriticalAlertSla(alertOrder.ordered_at);
              return (
                <div
                  key={alertOrder.id}
                  className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-destructive/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="font-bold text-foreground">
                      {alertOrder.patient?.first_name} {alertOrder.patient?.last_name} (
                      {alertOrder.patient?.mrn})
                    </span>
                    <span className="mx-2 text-muted-foreground">•</span>
                    <span className="font-semibold text-destructive">{alertOrder.test_name}</span>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Indication:{' '}
                      {alertOrder.metadata?.clinicalIndication || 'Emergency acute finding'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={sla.badgeVariant} className="text-[10px]">
                      {sla.statusLabel}
                    </Badge>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs"
                      onClick={() => setReportingModal({ open: true, order: alertOrder })}
                    >
                      <PhoneCall className="h-3.5 w-3.5 mr-1" />
                      Document Read-Back
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Worklist Metrics */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Awaiting Pre-Scan Gate
              </CardTitle>
              <ShieldCheck className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{awaitingScanCount}</div>
              <p className="text-[11px] text-muted-foreground">Ready for technician clearance</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                In Scanning / Modality
              </CardTitle>
              <Activity className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {inProgressCount}
              </div>
              <p className="text-[11px] text-muted-foreground">Acquiring image series</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Preliminary Wet Reads
              </CardTitle>
              <Clock className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {preliminaryCount}
              </div>
              <p className="text-[11px] text-muted-foreground">Awaiting final sign-off</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Finalized Reports
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {finalizedCount}
              </div>
              <p className="text-[11px] text-muted-foreground">Signed & archived in PACS</p>
            </CardContent>
          </Card>
        </div>

        {/* Modality Filter & Search Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Tabs
            value={selectedModality}
            onValueChange={(val: any) => setSelectedModality(val)}
            className="w-full sm:w-auto"
          >
            <TabsList className="grid grid-cols-3 sm:flex">
              <TabsTrigger value="all">All Modalities</TabsTrigger>
              <TabsTrigger value="xray">X-Ray</TabsTrigger>
              <TabsTrigger value="ct">CT Scan</TabsTrigger>
              <TabsTrigger value="mri">MRI</TabsTrigger>
              <TabsTrigger value="ultrasound">Ultrasound</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by patient, MRN, accession..."
              className="pl-9 h-9 text-xs"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Modality Worklist Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Accession #</TableHead>
                  <TableHead>Patient</TableHead>
                  <TableHead>Modality & Study</TableHead>
                  <TableHead>Contrast</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Findings / Impression</TableHead>
                  <TableHead className="text-right">Diagnostic Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground text-xs"
                    >
                      No imaging studies found for selected filter
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => {
                    const isFinalized = order.status === 'completed';
                    const hasPrelim = !!order.metadata?.preliminaryRead;
                    const isUrgent = order.priority === 'urgent' || order.priority === 'high';

                    return (
                      <TableRow
                        key={order.id}
                        className={order.is_critical ? 'bg-destructive/5' : ''}
                      >
                        <TableCell className="font-mono text-xs font-semibold">
                          {order.specimen_barcode || 'ACC-PENDING'}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-xs">
                              {order.patient?.first_name} {order.patient?.last_name}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {order.patient?.mrn}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-semibold text-xs">{order.test_name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {format(new Date(order.ordered_at), 'dd MMM yyyy, HH:mm')}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] capitalize font-mono">
                            {order.metadata?.contrastProtocol?.replace('_', ' ') || 'Plain'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={isUrgent ? 'destructive' : 'secondary'}
                            className="text-[10px] uppercase font-bold"
                          >
                            {order.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {isFinalized ? (
                            <Badge
                              variant="default"
                              className="bg-green-600 text-white text-[10px]"
                            >
                              Finalized
                            </Badge>
                          ) : hasPrelim ? (
                            <Badge
                              variant="secondary"
                              className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 text-[10px]"
                            >
                              Prelim Read
                            </Badge>
                          ) : order.status === 'in_progress' ? (
                            <Badge
                              variant="outline"
                              className="border-blue-400 text-blue-600 text-[10px]"
                            >
                              Scanning
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              Ordered
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[200px]">
                          {order.results?.impression ? (
                            <p
                              className="text-xs truncate font-medium text-foreground"
                              title={order.results.impression}
                            >
                              {order.results.impression}
                            </p>
                          ) : order.metadata?.preliminaryRead?.impression ? (
                            <p
                              className="text-xs truncate text-purple-700 dark:text-purple-300 italic"
                              title={order.metadata.preliminaryRead.impression}
                            >
                              [Prelim] {order.metadata.preliminaryRead.impression}
                            </p>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Unread</span>
                          )}
                          {order.is_critical && (
                            <span className="text-[10px] text-destructive font-bold flex items-center gap-0.5 mt-0.5">
                              <ShieldAlert className="h-3 w-3" /> Panic Alert
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Pre-Scan Safety Button for Technicians */}
                            {order.status === 'ordered' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2 text-xs border-amber-400/50 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                                onClick={() => setSafetyModal({ open: true, order })}
                                title="Perform Pre-Scan Safety Check"
                              >
                                <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                                Safety Gate
                              </Button>
                            )}

                            {/* Interactive DICOM / PACS Viewer */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs bg-slate-950 text-cyan-300 border-slate-700 hover:bg-slate-900"
                              onClick={() => setViewerModal({ open: true, order })}
                              title="Open Diagnostic DICOM Viewport"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1 text-cyan-400" />
                              PACS
                            </Button>

                            {/* Report Workspace */}
                            <Button
                              size="sm"
                              variant={isFinalized ? 'ghost' : 'default'}
                              className="h-7 px-2 text-xs"
                              onClick={() => setReportingModal({ open: true, order })}
                              title={
                                isFinalized ? 'View Final Report' : 'Write / Sign Diagnostic Report'
                              }
                            >
                              <FileText className="h-3.5 w-3.5 mr-1" />
                              {isFinalized ? 'View Report' : hasPrelim ? 'Finalize' : 'Report'}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Modals */}
      <CreateImagingOrderModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />

      <PreScanSafetyModal
        open={safetyModal.open}
        onOpenChange={(open) => setSafetyModal({ open, order: safetyModal.order })}
        order={safetyModal.order}
      />

      <DicomViewerModal
        open={viewerModal.open}
        onOpenChange={(open) => setViewerModal({ open, order: viewerModal.order })}
        order={viewerModal.order}
      />

      <RadiologyReportingModal
        open={reportingModal.open}
        onOpenChange={(open) => setReportingModal({ open, order: reportingModal.order })}
        order={reportingModal.order}
      />
    </DashboardLayout>
  );
}
