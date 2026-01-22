import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine,
  ResponsiveContainer 
} from 'recharts';
import { AlertCircle, CheckCircle, FileText, Settings } from 'lucide-react';
import { format, subDays } from 'date-fns';

// Mock Data Generation for Levey-Jennings Chart
const generateQCData = (mean: number, sd: number, points: number) => {
  return Array.from({ length: points }).map((_, i) => {
    const date = format(subDays(new Date(), points - i), 'MM/dd');
    // Random value normally distributed around mean (mostly)
    const factor = (Math.random() + Math.random() + Math.random() + Math.random() + Math.random() + Math.random()) - 3; // Approx normal distribution
    const value = mean + (factor * sd * 0.8); 
    
    // Inject a random outlier or shift specifically for demo
    const isOutlier = i === points - 3;
    const finalValue = isOutlier ? mean + (3.5 * sd) : value;

    return {
      date,
      value: Number(finalValue.toFixed(2)),
      mean,
      sd,
      ucl: mean + (2 * sd),
      lcl: mean - (2 * sd),
      ucl3: mean + (3 * sd),
      lcl3: mean - (3 * sd),
    };
  });
};

const TESTS = [
  { id: '1', name: 'Glucose Level 1', mean: 98, sd: 2.5 },
  { id: '2', name: 'Glucose Level 2', mean: 245, sd: 5.0 },
  { id: '3', name: 'Potassium Level 1', mean: 4.0, sd: 0.1 },
  { id: '4', name: 'TSH Control', mean: 1.5, sd: 0.15 },
];

export function QCDashboard() {
  const [selectedTest, setSelectedTest] = useState(TESTS[0].id);
  const currentTest = TESTS.find(t => t.id === selectedTest) || TESTS[0];
  
  const data = generateQCData(currentTest.mean, currentTest.sd, 30);
  const latestPoint = data[data.length - 1];
  
  // Basic Westgard rule check (mock)
  const violation = Math.abs(latestPoint.value - currentTest.mean) > (3 * currentTest.sd) ? "1:3s Violation" : null;
  const status = violation ? 'rejected' : 'accepted';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold tracking-tight">Quality Control Dashboard</h2>
           <p className="text-muted-foreground">Monitor test accuracy and precision using Levey-Jennings charts.</p>
        </div>
        <div className="flex items-center gap-2">
           <Select value={selectedTest} onValueChange={setSelectedTest}>
             <SelectTrigger className="w-[200px]">
               <SelectValue />
             </SelectTrigger>
             <SelectContent>
               {TESTS.map(t => (
                 <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
               ))}
             </SelectContent>
           </Select>
           <Button variant="outline" size="icon"><Settings className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="md:col-span-3">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Levey-Jennings Chart</CardTitle>
                <CardDescription>Last 30 days performance</CardDescription>
              </div>
              <Badge variant={status === 'accepted' ? 'outline' : 'destructive'} className="gap-1">
                {status === 'accepted' ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                {status === 'accepted' ? 'Control In Range' : 'Control Failed'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis domain={['auto', 'auto']} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    labelStyle={{ fontWeight: 'bold' }}
                    formatter={(value: number) => [value, 'Control Value']}
                  />
                  
                  {/* Mean Line */}
                  <ReferenceLine y={currentTest.mean} stroke="#2563eb" strokeWidth={2} label="Mean" />
                  
                  {/* +2 SD */}
                  <ReferenceLine y={currentTest.mean + (2 * currentTest.sd)} stroke="#10b981" strokeDasharray="5 5" label="+2SD" />
                  <ReferenceLine y={currentTest.mean - (2 * currentTest.sd)} stroke="#10b981" strokeDasharray="5 5" label="-2SD" />
                  
                  {/* +3 SD */}
                  <ReferenceLine y={currentTest.mean + (3 * currentTest.sd)} stroke="#ef4444" strokeDasharray="3 3" label="+3SD" />
                  <ReferenceLine y={currentTest.mean - (3 * currentTest.sd)} stroke="#ef4444" strokeDasharray="3 3" label="-3SD" />

                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#0f172a" 
                    strokeWidth={2}
                    dot={(props) => {
                       const { cx, cy, payload } = props;
                       const isViolation = Math.abs(payload.value - payload.mean) > (3 * payload.sd);
                       return (
                         <circle 
                           cx={cx} 
                           cy={cy} 
                           r={isViolation ? 6 : 4} 
                           fill={isViolation ? "#ef4444" : "#0f172a"} 
                           stroke="none"
                         />
                       );
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="h-full">
           <CardHeader>
             <CardTitle className="text-base">Statistics</CardTitle>
           </CardHeader>
           <CardContent className="space-y-6">
             <div className="space-y-1">
               <span className="text-xs text-muted-foreground uppercase tracking-wider">Target Mean</span>
               <div className="text-2xl font-bold">{currentTest.mean}</div>
               <span className="text-xs text-muted-foreground">mg/dL</span>
             </div>
             
             <div className="space-y-1">
               <span className="text-xs text-muted-foreground uppercase tracking-wider">Calc. Mean (Current)</span>
               <div className="text-2xl font-bold">{(data.reduce((a, b) => a + b.value, 0) / data.length).toFixed(2)}</div>
               <div className="flex items-center text-xs text-green-600">
                  <span className="mr-1">Bias:</span> 0.2%
               </div>
             </div>

             <div className="space-y-1">
               <span className="text-xs text-muted-foreground uppercase tracking-wider">Target SD</span>
               <div className="text-2xl font-bold">{currentTest.sd}</div>
             </div>

             <div className="pt-4 border-t">
               <h4 className="font-semibold text-sm mb-2">Westgard Violations</h4>
               {violation ? (
                 <div className="bg-red-50 text-red-700 p-2 rounded text-sm flex items-center gap-2">
                   <AlertTriangle className="h-3 w-3" />
                   {violation} - Run Rejected
                 </div>
               ) : (
                 <div className="bg-green-50 text-green-700 p-2 rounded text-sm flex items-center gap-2">
                   <CheckCircle className="h-3 w-3" />
                   No Violations
                 </div>
               )}
               <Button variant="outline" className="w-full mt-4 text-xs gap-2">
                 <FileText className="h-3 w-3" />
                 Download QC Report
               </Button>
             </div>
           </CardContent>
        </Card>
      </div>
    </div>
  );
}
