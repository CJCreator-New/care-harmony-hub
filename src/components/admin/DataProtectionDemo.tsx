import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHIPAACompliance } from '@/hooks/useDataProtection';
import { Shield, Eye, EyeOff, Lock, Unlock } from 'lucide-react';

export function DataProtectionDemo() {
  const {
    encryptPHI,
    decryptPHI,
    prepareSecureLog,
    validateCompliance,
    isEncrypting,
    isDecrypting,
    phiFields
  } = useHIPAACompliance();

  // Sample patient data with PHI
  const [sampleData, setSampleData] = useState({
    id: 'patient-123',
    firstName: 'John',
    lastName: 'Doe',
    ssn: '123-45-6789',
    medical_record_number: 'MRN-2024-001',
    insurance_id: 'INS-ABC-123456',
    date_of_birth: '1980-01-15',
    phone: '+1-555-0123',
    email: 'john.doe@email.com',
    address: '123 Main St, Anytown, USA',
    diagnosis: 'Hypertension',
    medications: 'Lisinopril 10mg daily',
    allergies: 'Penicillin'
  });

  const [encryptedData, setEncryptedData] = useState<any>(null);
  const [decryptedData, setDecryptedData] = useState<any>(null);
  const [maskedData, setMaskedData] = useState<any>(null);
  const [complianceCheck, setComplianceCheck] = useState<any>(null);

  const handleEncrypt = async () => {
    try {
      const result = await encryptPHI(sampleData);
      setEncryptedData(result.data);
      setDecryptedData(null);
    } catch (error) {
      console.error('Encryption failed:', error);
    }
  };

  const handleDecrypt = async () => {
    if (!encryptedData) return;

    try {
      const result = await decryptPHI(encryptedData, encryptedData._metadata || {});
      setDecryptedData(result);
    } catch (error) {
      console.error('Decryption failed:', error);
    }
  };

  const handleMaskData = () => {
    const masked = prepareSecureLog(sampleData);
    setMaskedData(masked);
  };

  const handleComplianceCheck = () => {
    const check = validateCompliance(sampleData);
    setComplianceCheck(check);
  };

  const renderDataObject = (data: any, title: string) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="text-sm bg-muted p-4 rounded-md overflow-auto max-h-96">
          {JSON.stringify(data, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Data Protection & HIPAA Compliance Demo
          </CardTitle>
          <CardDescription>
            Demonstrate field-level encryption, data masking, and compliance validation for PHI data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <Label className="text-sm font-medium">PHI Fields Detected</Label>
              <div className="flex flex-wrap gap-1 mt-2">
                {phiFields.map(field => (
                  <Badge key={field} variant="secondary" className="text-xs">
                    {field}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium">Sample Patient Data</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Contains sensitive PHI that requires protection
              </p>
            </div>
          </div>

          <Tabs defaultValue="original" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="original">Original</TabsTrigger>
              <TabsTrigger value="encrypted">Encrypted</TabsTrigger>
              <TabsTrigger value="decrypted">Decrypted</TabsTrigger>
              <TabsTrigger value="masked">Masked</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
            </TabsList>

            <TabsContent value="original" className="space-y-4">
              {renderDataObject(sampleData, "Original Patient Data")}

              <div className="flex gap-2">
                <Button onClick={handleEncrypt} disabled={isEncrypting}>
                  <Lock className="h-4 w-4 mr-2" />
                  {isEncrypting ? 'Encrypting...' : 'Encrypt PHI Fields'}
                </Button>
                <Button onClick={handleMaskData} variant="outline">
                  <EyeOff className="h-4 w-4 mr-2" />
                  Mask for Logging
                </Button>
                <Button onClick={handleComplianceCheck} variant="outline">
                  <Shield className="h-4 w-4 mr-2" />
                  Check Compliance
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="encrypted" className="space-y-4">
              {encryptedData ? (
                <>
                  {renderDataObject(encryptedData, "Encrypted Patient Data")}
                  <Alert>
                    <Lock className="h-4 w-4" />
                    <AlertDescription>
                      PHI fields are encrypted with AES-GCM. Only authorized users can decrypt this data.
                    </AlertDescription>
                  </Alert>
                  <Button onClick={handleDecrypt} disabled={isDecrypting}>
                    <Unlock className="h-4 w-4 mr-2" />
                    {isDecrypting ? 'Decrypting...' : 'Decrypt Data'}
                  </Button>
                </>
              ) : (
                <Alert>
                  <AlertDescription>
                    Click "Encrypt PHI Fields" to see encrypted data.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="decrypted" className="space-y-4">
              {decryptedData ? (
                <>
                  {renderDataObject(decryptedData, "Decrypted Patient Data")}
                  <Alert>
                    <Unlock className="h-4 w-4" />
                    <AlertDescription>
                      Data has been successfully decrypted and restored to original form.
                    </AlertDescription>
                  </Alert>
                </>
              ) : (
                <Alert>
                  <AlertDescription>
                    Encrypt data first, then decrypt to see the restored original data.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="masked" className="space-y-4">
              {maskedData ? (
                <>
                  {renderDataObject(maskedData, "Masked Data for Logging")}
                  <Alert>
                    <EyeOff className="h-4 w-4" />
                    <AlertDescription>
                      Sensitive fields are masked for secure logging and display. Original data remains encrypted.
                    </AlertDescription>
                  </Alert>
                </>
              ) : (
                <Alert>
                  <AlertDescription>
                    Click "Mask for Logging" to see how data appears in logs.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            <TabsContent value="compliance" className="space-y-4">
              {complianceCheck ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      HIPAA Compliance Check
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Badge variant={complianceCheck.isCompliant ? "default" : "destructive"}>
                          {complianceCheck.isCompliant ? "Compliant" : "Non-Compliant"}
                        </Badge>
                      </div>

                      {complianceCheck.issues.length > 0 && (
                        <div>
                          <Label className="text-sm font-medium text-destructive">Issues Found:</Label>
                          <ul className="list-disc list-inside mt-2 space-y-1">
                            {complianceCheck.issues.map((issue: string, index: number) => (
                              <li key={index} className="text-sm text-destructive">{issue}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {complianceCheck.isCompliant && (
                        <Alert>
                          <Shield className="h-4 w-4" />
                          <AlertDescription>
                            All PHI data is properly encrypted and compliant with HIPAA requirements.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Alert>
                  <AlertDescription>
                    Click "Check Compliance" to validate HIPAA compliance.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}