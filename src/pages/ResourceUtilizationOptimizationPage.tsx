import React from 'react';
import { ResourceUtilizationOptimizationEngine } from '@/components/ai/ResourceUtilizationOptimizationEngine';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Shield, TrendingUp, Users, Bed, Activity, BarChart3, Target, Zap } from 'lucide-react';

const ResourceUtilizationOptimizationPage: React.FC = () => {
  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Target className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold tracking-tight">Resource Utilization Optimization</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Advanced AI-powered optimization system for hospital resource allocation, staffing, and operational efficiency
        </p>
        <div className="flex items-center justify-center gap-4">
          <Badge variant="secondary" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Cost Reduction
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Operational Excellence
          </Badge>
          <Badge variant="secondary" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Real-time Optimization
          </Badge>
        </div>
      </div>

      {/* Operational Impact Notice */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4" />
        <AlertTitle className="text-blue-800">Operational Excellence Initiative</AlertTitle>
        <AlertDescription className="text-blue-700">
          This AI system optimizes resource utilization to achieve 10% reduction in operational waste while maintaining quality of care. All recommendations are validated against clinical safety standards and operational constraints.
        </AlertDescription>
      </Alert>

      {/* Feature Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="text-center">
            <Bed className="h-12 w-12 mx-auto mb-4 text-primary" />
            <CardTitle>Bed Management</CardTitle>
            <CardDescription>
              AI-optimized bed allocation and capacity planning for maximum utilization and patient flow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2">
              <li>• Real-time occupancy optimization</li>
              <li>• Predictive capacity planning</li>
              <li>• Transfer coordination</li>
              <li>• Discharge planning integration</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
            <CardTitle>Staffing Optimization</CardTitle>
            <CardDescription>
              Dynamic staffing recommendations based on patient acuity, workload patterns, and operational needs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2">
              <li>• Shift optimization algorithms</li>
              <li>• Skill mix optimization</li>
              <li>• Overtime reduction</li>
              <li>• Training resource allocation</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="text-center">
            <Activity className="h-12 w-12 mx-auto mb-4 text-primary" />
            <CardTitle>Equipment Utilization</CardTitle>
            <CardDescription>
              Smart equipment allocation and maintenance scheduling for optimal operational efficiency
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="text-sm space-y-2">
              <li>• Equipment utilization tracking</li>
              <li>• Preventive maintenance scheduling</li>
              <li>• Procurement recommendations</li>
              <li>• Equipment sharing optimization</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Technical Specifications */}
      <Card>
        <CardHeader>
          <CardTitle>Technical Specifications</CardTitle>
          <CardDescription>
            Optimization algorithms and performance characteristics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3">Optimization Algorithms</h4>
              <ul className="text-sm space-y-1">
                <li>• Linear Programming for resource allocation</li>
                <li>• Queuing Theory for patient flow modeling</li>
                <li>• Machine Learning for demand forecasting</li>
                <li>• Genetic Algorithms for scheduling optimization</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3">Performance Metrics</h4>
              <ul className="text-sm space-y-1">
                <li>• Resource Utilization: &gt; 85% target</li>
                <li>• Cost Reduction: 10% minimum</li>
                <li>• Patient Satisfaction: &gt; 4.0/5.0</li>
                <li>• Wait Time Reduction: &gt; 30%</li>
              </ul>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="font-semibold mb-3">Key Optimization Factors</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <strong>Patient Factors:</strong>
                <ul className="mt-1 space-y-1">
                  <li>• Acuity levels</li>
                  <li>• Length of stay predictions</li>
                  <li>• Treatment requirements</li>
                  <li>• Discharge readiness</li>
                </ul>
              </div>
              <div>
                <strong>Operational Factors:</strong>
                <ul className="mt-1 space-y-1">
                  <li>• Staff availability</li>
                  <li>• Equipment status</li>
                  <li>• Facility capacity</li>
                  <li>• Regulatory requirements</li>
                </ul>
              </div>
              <div>
                <strong>Economic Factors:</strong>
                <ul className="mt-1 space-y-1">
                  <li>• Cost per patient day</li>
                  <li>• Overtime expenses</li>
                  <li>• Equipment depreciation</li>
                  <li>• Revenue optimization</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Engine Component */}
      <ResourceUtilizationOptimizationEngine />

      {/* Implementation Guidelines */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Guidelines</CardTitle>
          <CardDescription>
            Best practices for implementing resource optimization recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3 text-green-700">✅ Recommended Actions</h4>
              <ul className="text-sm space-y-2">
                <li>• Start with pilot departments (Emergency, ICU)</li>
                <li>• Implement gradual changes with monitoring</li>
                <li>• Train staff on new workflows</li>
                <li>• Establish feedback loops for continuous improvement</li>
                <li>• Monitor key performance indicators</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-red-700">⚠️ Critical Considerations</h4>
              <ul className="text-sm space-y-2">
                <li>• Never compromise patient safety</li>
                <li>• Maintain clinical quality standards</li>
                <li>• Consider staff burnout and morale</li>
                <li>• Account for regulatory compliance</li>
                <li>• Plan for system failures and contingencies</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer Notice */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertTitle>Data Security & Compliance</AlertTitle>
        <AlertDescription>
          Resource optimization analysis uses aggregated, anonymized operational data only. Individual patient information is never used for optimization algorithms. All recommendations are generated and stored in compliance with healthcare regulations and data protection standards.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default ResourceUtilizationOptimizationPage;