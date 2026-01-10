import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, TestTube, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { LOINCCode } from '@/types/laboratory';

interface LOINCSearchProps {
  onCodeSelect: (code: LOINCCode) => void;
  selectedCode?: LOINCCode;
  testName?: string;
}

export const LOINCSearch: React.FC<LOINCSearchProps> = ({
  onCodeSelect,
  selectedCode,
  testName
}) => {
  const [searchTerm, setSearchTerm] = useState(testName || '');
  const [searchResults, setSearchResults] = useState<LOINCCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('');

  // Mock LOINC data (in real app, fetch from database)
  const mockLOINCCodes: LOINCCode[] = [
    {
      code: '33747-0',
      component: 'Hemoglobin',
      property: 'MCnc',
      time_aspect: 'Pt',
      system_type: 'Bld',
      scale_type: 'Qn',
      method_type: 'Automated count',
      class: 'HEMATOLOGY/CELL COUNTS',
      reference_range: { male: '13.8-17.2', female: '12.1-15.1' },
      critical_values: { low: '<7.0', high: '>20.0' },
      units: 'g/dL',
      specimen_type: 'Blood',
      created_at: new Date().toISOString()
    },
    {
      code: '6690-2',
      component: 'Leukocytes',
      property: 'NCnc',
      time_aspect: 'Pt',
      system_type: 'Bld',
      scale_type: 'Qn',
      method_type: 'Automated count',
      class: 'HEMATOLOGY/CELL COUNTS',
      reference_range: { normal: '4.5-11.0' },
      critical_values: { low: '<1.0', high: '>50.0' },
      units: '10*3/uL',
      specimen_type: 'Blood',
      created_at: new Date().toISOString()
    },
    {
      code: '2951-2',
      component: 'Sodium',
      property: 'SCnc',
      time_aspect: 'Pt',
      system_type: 'Ser/Plas',
      scale_type: 'Qn',
      method_type: 'Ion selective electrode',
      class: 'CHEMISTRY',
      reference_range: { normal: '136-145' },
      critical_values: { low: '<120', high: '>160' },
      units: 'mmol/L',
      specimen_type: 'Serum',
      created_at: new Date().toISOString()
    },
    {
      code: '33743-4',
      component: 'Troponin T',
      property: 'MCnc',
      time_aspect: 'Pt',
      system_type: 'Ser/Plas',
      scale_type: 'Qn',
      method_type: 'Immunoassay',
      class: 'CHEMISTRY',
      reference_range: { normal: '<0.01' },
      critical_values: { high: '>0.04' },
      units: 'ng/mL',
      specimen_type: 'Serum',
      created_at: new Date().toISOString()
    }
  ];

  const labClasses = [
    'HEMATOLOGY/CELL COUNTS',
    'CHEMISTRY',
    'MICROBIOLOGY',
    'IMMUNOLOGY',
    'MOLECULAR PATHOLOGY',
    'TOXICOLOGY',
    'COAGULATION'
  ];

  const searchLOINCCodes = () => {
    setLoading(true);
    
    // Simulate API call delay
    setTimeout(() => {
      let results = mockLOINCCodes.filter(code => 
        code.component.toLowerCase().includes(searchTerm.toLowerCase()) ||
        code.code.includes(searchTerm) ||
        (code.class && selectedClass && code.class === selectedClass)
      );

      if (selectedClass) {
        results = results.filter(code => code.class === selectedClass);
      }

      setSearchResults(results);
      setLoading(false);
    }, 500);
  };

  const handleCodeSelect = (code: LOINCCode) => {
    onCodeSelect(code);
  };

  const getCriticalityBadge = (code: LOINCCode) => {
    if (code.critical_values?.low || code.critical_values?.high) {
      return <Badge variant="destructive" className="text-xs">Critical Values</Badge>;
    }
    return <Badge variant="secondary" className="text-xs">Standard</Badge>;
  };

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchLOINCCodes();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm, selectedClass]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          LOINC Code Search
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Controls */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Search Test Name or LOINC Code</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Enter test name or LOINC code..."
                className="pl-10"
              />
            </div>
          </div>
          
          <div>
            <Label>Filter by Class</Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="All classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All classes</SelectItem>
                {labClasses.map((labClass) => (
                  <SelectItem key={labClass} value={labClass}>
                    {labClass}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Selected Code Display */}
        {selectedCode && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-green-800">Selected LOINC Code</h4>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Code:</span> {selectedCode.code}
              </div>
              <div>
                <span className="font-medium">Component:</span> {selectedCode.component}
              </div>
              <div>
                <span className="font-medium">Units:</span> {selectedCode.units}
              </div>
              <div>
                <span className="font-medium">Specimen:</span> {selectedCode.specimen_type}
              </div>
            </div>
          </div>
        )}

        {/* Search Results */}
        {loading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-sm text-gray-600 mt-2">Searching LOINC database...</p>
          </div>
        )}

        {searchResults.length > 0 && !loading && (
          <div className="space-y-2">
            <h4 className="font-medium">Search Results ({searchResults.length})</h4>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {searchResults.map((code) => (
                <div
                  key={code.code}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedCode?.code === code.code
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleCodeSelect(code)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{code.component}</span>
                        <Badge variant="outline" className="text-xs">
                          {code.code}
                        </Badge>
                        {getCriticalityBadge(code)}
                      </div>
                      
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="font-medium">Class:</span> {code.class}
                          </div>
                          <div>
                            <span className="font-medium">Units:</span> {code.units}
                          </div>
                          <div>
                            <span className="font-medium">Specimen:</span> {code.specimen_type}
                          </div>
                          <div>
                            <span className="font-medium">Method:</span> {code.method_type}
                          </div>
                        </div>
                      </div>

                      {/* Reference Range */}
                      {code.reference_range && (
                        <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                          <span className="font-medium text-blue-800">Reference Range: </span>
                          {Object.entries(code.reference_range).map(([key, value]) => (
                            <span key={key} className="text-blue-700">
                              {key}: {value} {code.units} 
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Critical Values */}
                      {code.critical_values && (
                        <div className="mt-1 p-2 bg-red-50 rounded text-xs">
                          <div className="flex items-center gap-1 mb-1">
                            <AlertTriangle className="h-3 w-3 text-red-600" />
                            <span className="font-medium text-red-800">Critical Values:</span>
                          </div>
                          {Object.entries(code.critical_values).map(([key, value]) => (
                            <span key={key} className="text-red-700 mr-3">
                              {key}: {value}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <Button
                      size="sm"
                      variant={selectedCode?.code === code.code ? "default" : "outline"}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCodeSelect(code);
                      }}
                    >
                      {selectedCode?.code === code.code ? 'Selected' : 'Select'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {searchTerm.length >= 2 && searchResults.length === 0 && !loading && (
          <div className="text-center py-8">
            <Info className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">No LOINC codes found for "{searchTerm}"</p>
            <p className="text-sm text-gray-500 mt-1">
              Try searching with different terms or check the spelling
            </p>
          </div>
        )}

        {searchTerm.length < 2 && (
          <div className="text-center py-8">
            <TestTube className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600">Enter at least 2 characters to search</p>
            <p className="text-sm text-gray-500 mt-1">
              Search by test name, LOINC code, or filter by class
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};