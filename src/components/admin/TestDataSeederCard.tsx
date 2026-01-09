import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Database, Trash2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { seedTestData, cleanupTestData } from '@/utils/testDataSeeder';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export function TestDataSeederCard() {
  const { hospital } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSeeding, setIsSeeding] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [lastSeedResult, setLastSeedResult] = useState<any>(null);

  const handleSeedData = async () => {
    if (!hospital?.id) {
      toast({
        title: 'Error',
        description: 'No hospital context available',
        variant: 'destructive'
      });
      return;
    }

    setIsSeeding(true);
    try {
      const result = await seedTestData(hospital.id, {
        patientCount: 50,
        appointmentCount: 25,
        staffCount: 12,
        includeToday: true,
        includeThisMonth: true
      });

      setLastSeedResult(result);
      
      // Invalidate all queries to refresh dashboard
      queryClient.invalidateQueries();
      
      toast({
        title: 'Test Data Created',
        description: `Created ${result.patients} patients, ${result.staff} staff, and ${result.appointments} appointments`,
      });
    } catch (error) {
      console.error('Error seeding data:', error);
      toast({
        title: 'Seeding Failed',
        description: error instanceof Error ? error.message : 'Failed to create test data',
        variant: 'destructive'
      });
    } finally {
      setIsSeeding(false);
    }
  };

  const handleCleanup = async () => {
    if (!hospital?.id) return;

    setIsCleaning(true);
    try {
      await cleanupTestData(hospital.id);
      setLastSeedResult(null);
      
      // Invalidate all queries to refresh dashboard
      queryClient.invalidateQueries();
      
      toast({
        title: 'Test Data Cleaned',
        description: 'All test data has been removed',
      });
    } catch (error) {
      console.error('Error cleaning data:', error);
      toast({
        title: 'Cleanup Failed',
        description: error instanceof Error ? error.message : 'Failed to clean test data',
        variant: 'destructive'
      });
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Test Data Seeder
        </CardTitle>
        <CardDescription>
          Generate realistic test data to validate KPIs and dashboard functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {lastSeedResult && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Last Seed Results</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary">{lastSeedResult.patients} Patients</Badge>
              <Badge variant="secondary">{lastSeedResult.staff} Staff</Badge>
              <Badge variant="secondary">{lastSeedResult.appointments} Appointments</Badge>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Button 
            onClick={handleSeedData} 
            disabled={isSeeding || isCleaning}
            className="w-full"
          >
            {isSeeding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Database className="mr-2 h-4 w-4" />
            Seed Test Data
          </Button>
          
          <Button 
            onClick={handleCleanup} 
            disabled={isSeeding || isCleaning}
            variant="outline"
            className="w-full"
          >
            {isCleaning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Trash2 className="mr-2 h-4 w-4" />
            Cleanup Data
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Seed Data:</strong> Creates 50 patients, 12 staff, 25 appointments with proper relationships</p>
          <p><strong>Cleanup:</strong> Removes all test data while preserving real data</p>
          <p><strong>Note:</strong> Dashboard KPIs will update automatically after seeding</p>
        </div>
      </CardContent>
    </Card>
  );
}