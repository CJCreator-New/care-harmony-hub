import { useQuery } from '@tanstack/react-query';

export interface EquipmentError {
  id: string;
  code: string;
  message: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high';
}

export interface LabEquipment {
  id: string;
  name: string;
  model: string;
  type: 'hematology' | 'chemistry' | 'immunoassay' | 'urinalysis' | 'microbiology';
  status: 'online' | 'offline' | 'maintenance' | 'error';
  lastCalibration: string;
  nextMaintenanceDue: string;
  utilizationRate: number; // 0-100
  temperature?: number;
  qcStatus: 'passed' | 'failed' | 'pending';
  errorLog: EquipmentError[];
  predictedFailureProbability: number; // 0-100
  predictedFailureDate?: string;
  healthScore: number; // 0-100
}

const MOCK_EQUIPMENT: LabEquipment[] = [
  {
    id: 'eq-1',
    name: 'Hematology Analyzer X200',
    model: 'Sysmex XN-1000',
    type: 'hematology',
    status: 'online',
    lastCalibration: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    nextMaintenanceDue: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // 15 days
    utilizationRate: 85,
    temperature: 24.5,
    qcStatus: 'passed',
    errorLog: [],
    predictedFailureProbability: 5,
    healthScore: 98
  },
  {
    id: 'eq-2',
    name: 'Isotope Immunoassay System',
    model: 'Cobas e 411',
    type: 'immunoassay',
    status: 'online',
    lastCalibration: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    nextMaintenanceDue: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
    utilizationRate: 92,
    temperature: 22.1,
    qcStatus: 'passed',
    errorLog: [],
    predictedFailureProbability: 12,
    healthScore: 88
  },
  {
    id: 'eq-3',
    name: 'Clinical Chemistry Analyzer',
    model: 'Beckman Coulter AU480',
    type: 'chemistry',
    status: 'maintenance',
    lastCalibration: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    nextMaintenanceDue: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Overdue
    utilizationRate: 0,
    temperature: 23.0,
    qcStatus: 'failed',
    errorLog: [
      { id: 'err-1', code: 'E-204', message: 'Reagent probe obstruction', timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), severity: 'high' }
    ],
    predictedFailureProbability: 85,
    predictedFailureDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    healthScore: 45
  },
  {
    id: 'eq-4',
    name: 'Urinalysis H-800',
    model: 'Dirui H-800',
    type: 'urinalysis',
    status: 'online',
    lastCalibration: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    nextMaintenanceDue: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    utilizationRate: 45,
    qcStatus: 'passed',
    errorLog: [],
    predictedFailureProbability: 2,
    healthScore: 99
  }
];

export function usePredictiveMaintenance(equipmentId?: string) {
  return useQuery({
    queryKey: ['lab-equipment', equipmentId],
    queryFn: async () => {
      // Simulate API latency
      await new Promise(resolve => setTimeout(resolve, 800));
      
      if (equipmentId) {
        return MOCK_EQUIPMENT.find(e => e.id === equipmentId);
      }
      
      return MOCK_EQUIPMENT;
    }
  });
}
