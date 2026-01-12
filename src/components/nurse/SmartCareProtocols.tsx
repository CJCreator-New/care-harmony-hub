import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ClipboardList, AlertTriangle, Clock, CheckCircle } from 'lucide-react';

interface CareProtocol {
  id: string;
  name: string;
  priority: 'high' | 'medium' | 'low';
  estimatedTime: number;
  tasks: CareTask[];
  completionRate: number;
}

interface CareTask {
  id: string;
  description: string;
  isCompleted: boolean;
  isRequired: boolean;
  dueTime?: Date;
  notes?: string;
}

export const SmartCareProtocols = ({ patientId }: { patientId: string }) => {
  const [protocols, setProtocols] = useState<CareProtocol[]>([]);
  const [activeProtocol, setActiveProtocol] = useState<string | null>(null);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    loadPatientProtocols();
    checkForAlerts();
  }, [patientId]);

  const loadPatientProtocols = () => {
    // Mock protocols based on patient condition
    const mockProtocols: CareProtocol[] = [
      {
        id: '1',
        name: 'Post-Operative Care',
        priority: 'high',
        estimatedTime: 45,
        completionRate: 60,
        tasks: [
          {
            id: '1-1',
            description: 'Check vital signs every 15 minutes',
            isCompleted: true,
            isRequired: true,
            dueTime: new Date(Date.now() + 15 * 60000)
          },
          {
            id: '1-2',
            description: 'Monitor surgical site for bleeding',
            isCompleted: true,
            isRequired: true
          },
          {
            id: '1-3',
            description: 'Assess pain level (1-10 scale)',
            isCompleted: false,
            isRequired: true,
            dueTime: new Date(Date.now() + 30 * 60000)
          },
          {
            id: '1-4',
            description: 'Administer prescribed pain medication',
            isCompleted: false,
            isRequired: true
          },
          {
            id: '1-5',
            description: 'Document fluid intake/output',
            isCompleted: false,
            isRequired: false
          }
        ]
      },
      {
        id: '2',
        name: 'Medication Administration',
        priority: 'high',
        estimatedTime: 20,
        completionRate: 80,
        tasks: [
          {
            id: '2-1',
            description: 'Verify patient identity (2 identifiers)',
            isCompleted: true,
            isRequired: true
          },
          {
            id: '2-2',
            description: 'Check medication against MAR',
            isCompleted: true,
            isRequired: true
          },
          {
            id: '2-3',
            description: 'Scan medication barcode',
            isCompleted: false,
            isRequired: true
          },
          {
            id: '2-4',
            description: 'Document administration time',
            isCompleted: false,
            isRequired: true
          }
        ]
      },
      {
        id: '3',
        name: 'Discharge Preparation',
        priority: 'medium',
        estimatedTime: 30,
        completionRate: 25,
        tasks: [
          {
            id: '3-1',
            description: 'Review discharge instructions with patient',
            isCompleted: false,
            isRequired: true
          },
          {
            id: '3-2',
            description: 'Ensure follow-up appointments scheduled',
            isCompleted: false,
            isRequired: true
          },
          {
            id: '3-3',
            description: 'Provide medication reconciliation',
            isCompleted: true,
            isRequired: true
          },
          {
            id: '3-4',
            description: 'Complete discharge checklist',
            isCompleted: false,
            isRequired: true
          }
        ]
      }
    ];

    setProtocols(mockProtocols);
  };

  const checkForAlerts = () => {
    const mockAlerts = [
      {
        id: '1',
        type: 'medication',
        message: 'Pain medication due in 5 minutes',
        priority: 'high',
        time: new Date()
      },
      {
        id: '2',
        type: 'vital_signs',
        message: 'Vital signs check overdue by 10 minutes',
        priority: 'medium',
        time: new Date()
      }
    ];
    setAlerts(mockAlerts);
  };

  const toggleTask = (protocolId: string, taskId: string) => {
    setProtocols(prev => prev.map(protocol => {
      if (protocol.id === protocolId) {
        const updatedTasks = protocol.tasks.map(task => {
          if (task.id === taskId) {
            return { ...task, isCompleted: !task.isCompleted };
          }
          return task;
        });
        
        const completedTasks = updatedTasks.filter(t => t.isCompleted).length;
        const completionRate = (completedTasks / updatedTasks.length) * 100;
        
        return { ...protocol, tasks: updatedTasks, completionRate };
      }
      return protocol;
    }));
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'warning';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  const getOverdueCount = (protocol: CareProtocol) => {
    return protocol.tasks.filter(task => 
      !task.isCompleted && 
      task.dueTime && 
      new Date() > task.dueTime
    ).length;
  };

  return (
    <div className="space-y-6">
      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center text-red-700">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <span className="text-sm">{alert.message}</span>
                  <Badge variant={alert.priority === 'high' ? 'destructive' : 'warning'}>
                    {alert.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Care Protocols */}
      <div className="grid gap-4">
        {protocols.map((protocol) => {
          const overdueCount = getOverdueCount(protocol);
          
          return (
            <Card key={protocol.id} className={activeProtocol === protocol.id ? 'ring-2 ring-blue-500' : ''}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <ClipboardList className="w-5 h-5 mr-2" />
                    {protocol.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={getPriorityColor(protocol.priority)}>
                      {protocol.priority}
                    </Badge>
                    {overdueCount > 0 && (
                      <Badge variant="destructive">
                        {overdueCount} overdue
                      </Badge>
                    )}
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="w-4 h-4 mr-1" />
                      {protocol.estimatedTime}min
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={protocol.completionRate} className="flex-1" />
                  <span className="text-sm font-medium">{protocol.completionRate.toFixed(0)}%</span>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  {protocol.tasks.map((task) => {
                    const isOverdue = task.dueTime && new Date() > task.dueTime && !task.isCompleted;
                    
                    return (
                      <div 
                        key={task.id} 
                        className={`flex items-start gap-3 p-3 rounded border ${
                          isOverdue ? 'border-red-200 bg-red-50' : 'border-gray-200'
                        }`}
                      >
                        <Checkbox
                          checked={task.isCompleted}
                          onCheckedChange={() => toggleTask(protocol.id, task.id)}
                          className="mt-0.5"
                        />
                        
                        <div className="flex-1">
                          <div className={`text-sm ${task.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                            {task.description}
                            {task.isRequired && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                Required
                              </Badge>
                            )}
                          </div>
                          
                          {task.dueTime && (
                            <div className={`text-xs mt-1 ${isOverdue ? 'text-red-600' : 'text-muted-foreground'}`}>
                              Due: {task.dueTime.toLocaleTimeString()}
                              {isOverdue && ' (Overdue)'}
                            </div>
                          )}
                        </div>
                        
                        {task.isCompleted && (
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                        )}
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button
                    variant={activeProtocol === protocol.id ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setActiveProtocol(activeProtocol === protocol.id ? null : protocol.id)}
                  >
                    {activeProtocol === protocol.id ? 'Collapse' : 'Focus'}
                  </Button>
                  
                  <Button variant="outline" size="sm">
                    Add Note
                  </Button>
                  
                  {protocol.completionRate === 100 && (
                    <Button size="sm">
                      Mark Complete
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};