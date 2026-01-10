import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Calendar, Activity } from 'lucide-react';
import { LabTrend, LabResult, LOINCCode } from '@/types/laboratory';
import { format, subDays, subMonths } from 'date-fns';

interface LabTrendVisualizationProps {
  patientId: string;
  loincCode: string;
  loincDetails?: LOINCCode;
  results: LabResult[];
  onPeriodChange?: (period: string) => void;
}

export const LabTrendVisualization: React.FC<LabTrendVisualizationProps> = ({
  patientId,
  loincCode,
  loincDetails,
  results,
  onPeriodChange
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'24h' | '7d' | '30d' | '90d'>('30d');
  const [trendData, setTrendData] = useState<any[]>([]);
  const [trendAnalysis, setTrendAnalysis] = useState<LabTrend | null>(null);
  const [referenceRanges, setReferenceRanges] = useState<{low: number, high: number} | null>(null);

  const periods = [
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' }
  ];

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'increasing': return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'decreasing': return <TrendingDown className="h-4 w-4 text-blue-500" />;
      case 'stable': return <Minus className="h-4 w-4 text-green-500" />;
      case 'volatile': return <Activity className="h-4 w-4 text-orange-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'increasing': return 'bg-red-100 text-red-800';
      case 'decreasing': return 'bg-blue-100 text-blue-800';
      case 'stable': return 'bg-green-100 text-green-800';
      case 'volatile': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSignificanceColor = (significance: string) => {
    switch (significance) {
      case 'significant': return 'bg-red-100 text-red-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'minimal': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const parseReferenceRange = (range?: string) => {
    if (!range) return null;
    
    // Parse ranges like "13.8-17.2" or "<0.01" or ">20.0"
    const rangeMatch = range.match(/(\d+\.?\d*)-(\d+\.?\d*)/);
    if (rangeMatch) {
      return {
        low: parseFloat(rangeMatch[1]),
        high: parseFloat(rangeMatch[2])
      };
    }
    
    return null;
  };

  const filterResultsByPeriod = (results: LabResult[], period: string) => {
    const now = new Date();
    let cutoffDate: Date;
    
    switch (period) {
      case '24h':
        cutoffDate = subDays(now, 1);
        break;
      case '7d':
        cutoffDate = subDays(now, 7);
        break;
      case '30d':
        cutoffDate = subDays(now, 30);
        break;
      case '90d':
        cutoffDate = subDays(now, 90);
        break;
      default:
        cutoffDate = subDays(now, 30);
    }
    
    return results.filter(result => 
      new Date(result.performed_at) >= cutoffDate &&
      result.result_numeric !== null &&
      result.result_numeric !== undefined
    );
  };

  const calculateTrend = (data: any[]) => {
    if (data.length < 2) return null;
    
    // Simple linear regression for trend calculation
    const n = data.length;
    const sumX = data.reduce((sum, _, index) => sum + index, 0);
    const sumY = data.reduce((sum, point) => sum + point.value, 0);
    const sumXY = data.reduce((sum, point, index) => sum + (index * point.value), 0);
    const sumXX = data.reduce((sum, _, index) => sum + (index * index), 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const variance = data.reduce((sum, point) => {
      const mean = sumY / n;
      return sum + Math.pow(point.value - mean, 2);
    }, 0) / n;
    
    let direction: string;
    let significance: string;
    
    // Determine trend direction
    if (Math.abs(slope) < 0.1) {
      direction = 'stable';
    } else if (slope > 0) {
      direction = 'increasing';
    } else {
      direction = 'decreasing';
    }
    
    // Determine volatility
    if (variance > (sumY / n) * 0.2) {
      direction = 'volatile';
    }
    
    // Determine significance
    if (Math.abs(slope) > 1.0) {
      significance = 'significant';
    } else if (Math.abs(slope) > 0.3) {
      significance = 'moderate';
    } else {
      significance = 'minimal';
    }
    
    return {
      id: 'calculated',
      patient_id: patientId,
      loinc_code: loincCode,
      trend_period: selectedPeriod,
      trend_direction: direction,
      trend_significance: significance,
      calculated_at: new Date().toISOString(),
      trend_data: {
        values: data,
        slope,
        variance,
        correlation: 0.8 // Simplified
      },
      hospital_id: 'current',
      created_at: new Date().toISOString()
    } as LabTrend;
  };

  const prepareChartData = () => {
    const filteredResults = filterResultsByPeriod(results, selectedPeriod);
    
    const chartData = filteredResults
      .sort((a, b) => new Date(a.performed_at).getTime() - new Date(b.performed_at).getTime())
      .map((result, index) => ({
        date: format(new Date(result.performed_at), selectedPeriod === '24h' ? 'HH:mm' : 'MMM dd'),
        value: result.result_numeric,
        unit: result.result_unit,
        abnormalFlag: result.abnormal_flag,
        criticalFlag: result.critical_flag,
        fullDate: result.performed_at,
        index
      }));
    
    setTrendData(chartData);
    
    // Calculate trend analysis
    const trend = calculateTrend(chartData);
    setTrendAnalysis(trend);
    
    // Set reference ranges
    if (loincDetails?.reference_range) {
      const ranges = Object.values(loincDetails.reference_range);
      const range = parseReferenceRange(ranges[0]);
      setReferenceRanges(range);
    }
  };

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period as '24h' | '7d' | '30d' | '90d');
    onPeriodChange?.(period);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-medium">{format(new Date(data.fullDate), 'MMM dd, yyyy HH:mm')}</p>
          <p className="text-lg font-bold text-blue-600">
            {data.value} {data.unit}
          </p>
          {data.abnormalFlag && (
            <Badge variant="outline" className="text-xs mt-1">
              {data.abnormalFlag}
            </Badge>
          )}
          {data.criticalFlag && (
            <Badge variant="destructive" className="text-xs mt-1">
              Critical
            </Badge>
          )}
        </div>
      );
    }
    return null;
  };

  useEffect(() => {
    prepareChartData();
  }, [results, selectedPeriod, loincCode]);

  if (results.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">No lab results available for trending</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Lab Trend Analysis
            {loincDetails && (
              <Badge variant="outline">{loincDetails.component}</Badge>
            )}
          </CardTitle>
          
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periods.map((period) => (
                <SelectItem key={period.value} value={period.value}>
                  {period.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Trend Summary */}
        {trendAnalysis && (
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                {getTrendIcon(trendAnalysis.trend_direction)}
                <span className="font-medium">Direction</span>
              </div>
              <Badge className={getTrendColor(trendAnalysis.trend_direction)}>
                {trendAnalysis.trend_direction.toUpperCase()}
              </Badge>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Significance</span>
              </div>
              <Badge className={getSignificanceColor(trendAnalysis.trend_significance)}>
                {trendAnalysis.trend_significance.toUpperCase()}
              </Badge>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Data Points</span>
              </div>
              <Badge variant="outline">
                {trendData.length} results
              </Badge>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                domain={['dataMin - 10%', 'dataMax + 10%']}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Reference Range Lines */}
              {referenceRanges && (
                <>
                  <ReferenceLine 
                    y={referenceRanges.low} 
                    stroke="#10b981" 
                    strokeDasharray="5 5"
                    label={{ value: "Low Normal", position: "insideTopRight" }}
                  />
                  <ReferenceLine 
                    y={referenceRanges.high} 
                    stroke="#10b981" 
                    strokeDasharray="5 5"
                    label={{ value: "High Normal", position: "insideBottomRight" }}
                  />
                </>
              )}
              
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#2563eb" 
                strokeWidth={2}
                dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Latest Values Summary */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div>
            <h4 className="font-medium text-sm mb-2">Latest Result</h4>
            {trendData.length > 0 && (
              <div className="text-lg font-bold text-blue-600">
                {trendData[trendData.length - 1].value} {trendData[trendData.length - 1].unit}
                {trendData[trendData.length - 1].criticalFlag && (
                  <Badge variant="destructive" className="ml-2 text-xs">Critical</Badge>
                )}
              </div>
            )}
          </div>
          
          <div>
            <h4 className="font-medium text-sm mb-2">Reference Range</h4>
            {loincDetails?.reference_range && (
              <div className="text-sm text-gray-600">
                {Object.entries(loincDetails.reference_range).map(([key, value]) => (
                  <div key={key}>
                    {key}: {value} {loincDetails.units}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};