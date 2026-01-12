import { useState, useEffect } from 'react';

interface CareProtocol {
  id: string;
  name: string;
  category: string;
  tasks: CareTask[];
}

interface CareTask {
  id: string;
  description: string;
  completed: boolean;
  required: boolean;
  frequency?: string;
}

export function useCareProtocols(patientCondition?: string) {
  const [protocols, setProtocols] = useState<CareProtocol[]>([]);

  useEffect(() => {
    // Load protocols based on patient condition
    const defaultProtocols: CareProtocol[] = [
      {
        id: 'admission',
        name: 'Patient Admission',
        category: 'general',
        tasks: [
          { id: '1', description: 'Verify patient identity', completed: false, required: true },
          { id: '2', description: 'Check vital signs', completed: false, required: true },
          { id: '3', description: 'Review allergies', completed: false, required: true },
          { id: '4', description: 'Document current medications', completed: false, required: true },
          { id: '5', description: 'Assess pain level', completed: false, required: true },
        ],
      },
      {
        id: 'medication',
        name: 'Medication Administration',
        category: 'medication',
        tasks: [
          { id: '1', description: 'Verify patient identity (2 identifiers)', completed: false, required: true },
          { id: '2', description: 'Check medication order', completed: false, required: true },
          { id: '3', description: 'Verify dosage and route', completed: false, required: true },
          { id: '4', description: 'Check for allergies', completed: false, required: true },
          { id: '5', description: 'Document administration', completed: false, required: true },
        ],
      },
    ];

    setProtocols(defaultProtocols);
  }, [patientCondition]);

  const updateTask = (protocolId: string, taskId: string, completed: boolean) => {
    setProtocols(prev =>
      prev.map(protocol =>
        protocol.id === protocolId
          ? {
              ...protocol,
              tasks: protocol.tasks.map(task =>
                task.id === taskId ? { ...task, completed } : task
              ),
            }
          : protocol
      )
    );
  };

  const getComplianceRate = (protocolId: string) => {
    const protocol = protocols.find(p => p.id === protocolId);
    if (!protocol) return 0;
    const completed = protocol.tasks.filter(t => t.completed).length;
    return (completed / protocol.tasks.length) * 100;
  };

  return { protocols, updateTask, getComplianceRate };
}
