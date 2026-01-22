import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity, Thermometer, Droplets, HeartPulse } from 'lucide-react';

interface VitalsData {
  date: string;
  bp_systolic: number;
  bp_diastolic: number;
  pulse: number;
  temperature: number;
  oxygen_saturation: number;
}

interface Props {
  data?: VitalsData[];
}

export function VitalsTrendChart({ data }: Props) {
  // Mock data if none provided
  const chartData = useMemo(() => {
    if (data && data.length > 0) return data;
    
    return [
      { date: 'May 10', bp_systolic: 120, bp_diastolic: 80, pulse: 72, temperature: 98.6, oxygen_saturation: 98 },
      { date: 'May 12', bp_systolic: 125, bp_diastolic: 82, pulse: 75, temperature: 99.1, oxygen_saturation: 97 },
      { date: 'May 15', bp_systolic: 118, bp_diastolic: 78, pulse: 70, temperature: 98.4, oxygen_saturation: 99 },
      { date: 'May 18', bp_systolic: 122, bp_diastolic: 80, pulse: 74, temperature: 98.6, oxygen_saturation: 98 },
      { date: 'Today', bp_systolic: 121, bp_diastolic: 81, pulse: 73, temperature: 98.5, oxygen_saturation: 98 },
    ];
  }, [data]);

  return (
    <Card className="col-span-1 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-red-500" />
            <CardTitle className="text-sm">Vitals & Biometric Trends</CardTitle>
          </div>
          <div className="flex gap-2">
            <HeartPulse className="h-4 w-4 text-primary" title="BP & Pulse" />
            <Thermometer className="h-4 w-4 text-orange-500" title="Temperature" />
            <Droplets className="h-4 w-4 text-blue-500" title="SpO2" />
          </div>
        </div>
        <CardDescription className="text-[10px]">Historical tracking of physiological indicators.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px] w-full mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                tick={{ fill: '#888' }} 
              />
              <YAxis 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                tick={{ fill: '#888' }}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '10px' }}
                cursor={{ stroke: '#e0e0e0', strokeWidth: 1 }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '15px' }} />
              
              <Line 
                type="monotone" 
                dataKey="bp_systolic" 
                name="Systolic" 
                stroke="#ef4444" 
                strokeWidth={2}
                dot={{ r: 3, fill: '#ef4444' }}
                activeDot={{ r: 5 }}
              />
              <Line 
                type="monotone" 
                dataKey="pulse" 
                name="Pulse" 
                stroke="#0ea5e9" 
                strokeWidth={2}
                dot={{ r: 3, fill: '#0ea5e9' }}
                activeDot={{ r: 5 }}
              />
              
              {/* Reference line for normal systolic */}
              <ReferenceLine y={120} stroke="#ef4444" strokeDasharray="3 3" opacity={0.3} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Quick Stats Footer */}
        <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-border">
          <div className="flex flex-col items-center">
            <span className="text-[9px] uppercase text-muted-foreground uppercase">Avg BP</span>
            <span className="text-xs font-bold">121/80</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[9px] uppercase text-muted-foreground uppercase">Avg Pulse</span>
            <span className="text-xs font-bold">73 bpm</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[9px] uppercase text-muted-foreground uppercase">Stability</span>
            <Badge variant="success" className="text-[8px] h-3 px-1">High</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
