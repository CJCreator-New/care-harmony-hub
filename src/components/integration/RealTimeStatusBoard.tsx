import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, Users, Bed, AlertTriangle, CheckCircle, Timer } from 'lucide-react';
import { PatientStatusBoard, ResourceAvailability, WorkflowQueue, DepartmentMetrics } from '@/types/integration';

interface StatusBoardProps {
  hospitalId: string;
}

export const RealTimeStatusBoard: React.FC<StatusBoardProps> = ({ hospitalId }) => {
  const [patients, setPatients] = useState<PatientStatusBoard[]>([]);
  const [resources, setResources] = useState<ResourceAvailability[]>([]);
  const [queues, setQueues] = useState<WorkflowQueue[]>([]);
  const [metrics, setMetrics] = useState<DepartmentMetrics[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 80) return 'bg-red-100 text-red-800';
    if (priority >= 60) return 'bg-orange-100 text-orange-800';
    if (priority >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const formatWaitTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const filteredPatients = patients.filter(patient => 
    (selectedDepartment === 'all' || patient.current_location.includes(selectedDepartment)) &&
    (searchTerm === '' || 
     patient.patient.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     patient.patient.mrn.includes(searchTerm))
  );

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Real-Time Status Board</h2>
        <div className="flex gap-4">
          <Input
            placeholder="Search patients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-64"
          />
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="emergency">Emergency</SelectItem>
              <SelectItem value="outpatient">Outpatient</SelectItem>
              <SelectItem value="inpatient">Inpatient</SelectItem>
              <SelectItem value="surgery">Surgery</SelectItem>
              <SelectItem value="lab">Laboratory</SelectItem>
              <SelectItem value="radiology">Radiology</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Department Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.department}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{metric.department}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-600">Patients</span>
                  <span className="font-semibold">{metric.total_patients}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-600">Avg Wait</span>
                  <span className="font-semibold">{formatWaitTime(metric.average_wait_time)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-600">Completion</span>
                  <span className="font-semibold">{metric.completion_rate}%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Patient Status */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Patient Flow ({filteredPatients.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredPatients.map((patient) => (
                  <div key={patient.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{patient.patient.full_name}</span>
                        <Badge variant="outline">{patient.patient.mrn}</Badge>
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {patient.current_location}
                        {patient.staff && ` • ${patient.staff.full_name}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(patient.status)}>
                        {patient.status.replace('_', ' ')}
                      </Badge>
                      {patient.estimated_duration && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Timer className="h-4 w-4" />
                          {patient.estimated_duration}m
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Resource Availability */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bed className="h-5 w-5" />
                Resources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {resources.map((resource) => (
                  <div key={resource.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium text-sm">{resource.resource_name}</div>
                      <div className="text-xs text-gray-600">{resource.resource_type}</div>
                    </div>
                    <Badge 
                      className={
                        resource.status === 'available' ? 'bg-green-100 text-green-800' :
                        resource.status === 'occupied' ? 'bg-red-100 text-red-800' :
                        resource.status === 'maintenance' ? 'bg-orange-100 text-orange-800' :
                        'bg-blue-100 text-blue-800'
                      }
                    >
                      {resource.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Queue Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Department Queues
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {queues.reduce((acc, queue) => {
              const existing = acc.find(q => q.queue_name === queue.queue_name);
              if (existing) {
                existing.count++;
                existing.total_wait += queue.wait_time_minutes;
              } else {
                acc.push({
                  queue_name: queue.queue_name,
                  department: queue.department,
                  count: 1,
                  total_wait: queue.wait_time_minutes,
                  longest_wait: queue.wait_time_minutes
                });
              }
              return acc;
            }, [] as any[]).map((queueSummary) => (
              <div key={queueSummary.queue_name} className="p-4 border rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium">{queueSummary.queue_name}</h4>
                    <p className="text-sm text-gray-600">{queueSummary.department}</p>
                  </div>
                  <Badge className={getPriorityColor(queueSummary.count * 10)}>
                    {queueSummary.count}
                  </Badge>
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Avg Wait:</span>
                    <span>{formatWaitTime(Math.round(queueSummary.total_wait / queueSummary.count))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Longest:</span>
                    <span>{formatWaitTime(queueSummary.longest_wait)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alert Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Active Alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {patients.filter(p => p.status === 'waiting' && 
              new Date().getTime() - new Date(p.created_at).getTime() > 30 * 60 * 1000
            ).map((patient) => (
              <div key={patient.id} className="flex items-center justify-between p-2 bg-yellow-50 border border-yellow-200 rounded">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm">
                    {patient.patient.full_name} waiting over 30 minutes in {patient.current_location}
                  </span>
                </div>
                <Button size="sm" variant="outline">
                  Escalate
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};