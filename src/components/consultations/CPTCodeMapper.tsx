import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, X } from 'lucide-react';
import { CPTCode } from '@/types/soap';
import { useCPTCodes } from '@/hooks/useCPTCodes';

interface CPTCodeMapperProps {
  selectedCodes: string[];
  onChange: (codes: string[]) => void;
  diagnosisCode?: string;
}

export const CPTCodeMapper: React.FC<CPTCodeMapperProps> = ({ 
  selectedCodes, 
  onChange, 
  diagnosisCode 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { cptCodes, loading, searchCPTCodes } = useCPTCodes();

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchCPTCodes(searchTerm);
    }
  }, [searchTerm, searchCPTCodes]);

  const filteredCodes = searchTerm.length >= 2 ? cptCodes : cptCodes.slice(0, 20); // Show first 20 if no search

  const handleAddCode = (code: string) => {
    if (!selectedCodes.includes(code)) {
      onChange([...selectedCodes, code]);
    }
  };

  const handleRemoveCode = (code: string) => {
    onChange(selectedCodes.filter(c => c !== code));
  };

  const getSelectedCodeDetails = (code: string) => {
    return cptCodes.find(c => c.code === code);
  };

  const totalFee = selectedCodes.reduce((sum, code) => {
    const cptCode = getSelectedCodeDetails(code);
    return sum + (cptCode?.base_fee || 0);
  }, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          CPT Code Selection
          {selectedCodes.length > 0 && (
            <Badge variant="secondary">
              Total: ${totalFee.toFixed(2)}
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Select appropriate CPT codes for billing based on the diagnosis and procedures performed.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selected Codes */}
        {selectedCodes.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Selected Codes</h4>
            <div className="flex flex-wrap gap-2">
              {selectedCodes.map(code => {
                const details = getSelectedCodeDetails(code);
                return (
                  <Badge key={code} variant="default" className="flex items-center gap-1">
                    {code} - ${details?.base_fee?.toFixed(2)}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleRemoveCode(code)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search CPT codes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Available Codes */}
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {loading ? (
            <p className="text-center text-muted-foreground">Loading CPT codes...</p>
          ) : filteredCodes.length > 0 ? (
            filteredCodes.map(code => (
              <div
                key={code.code}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{code.code}</Badge>
                    <Badge variant="secondary">{code.category}</Badge>
                  </div>
                  <p className="text-sm mt-1">{code.description}</p>
                  <p className="text-xs text-muted-foreground">
                    Base fee: ${code.base_fee?.toFixed(2)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAddCode(code.code)}
                  disabled={selectedCodes.includes(code.code)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              {searchTerm.length >= 2 ? (
                <p>No CPT codes found for "{searchTerm}"</p>
              ) : (
                <p>Type at least 2 characters to search CPT codes</p>
              )}
            </div>
          )}
        </div>

        {diagnosisCode && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Tip:</strong> For diagnosis {diagnosisCode}, consider E&M codes (99213-99215) 
              plus any procedure-specific codes.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};