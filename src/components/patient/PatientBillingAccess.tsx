import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CreditCard,
  Download,
  Eye,
  Calendar,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Receipt,
  TrendingUp,
  TrendingDown,
  Mail,
  Bell,
  Settings,
  Shield
} from 'lucide-react';
import { usePatientPortal } from '@/hooks/usePatientPortal';
import { paymentService } from '@/utils/paymentService';
import { smsService } from '@/utils/smsService';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface PatientBillingAccessProps {
  patientId: string;
}

export function PatientBillingAccess({ patientId }: PatientBillingAccessProps) {
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [billingPreferences, setBillingPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    autoPay: false,
    paymentMethod: '',
    reminderDays: 7
  });

  const {
    billingData,
    loading,
    error,
    refetch
  } = usePatientPortal();

  // Mock billing data - in real implementation, this would come from the hook
  const mockBillingData = {
    outstandingBalance: 1250.75,
    totalPaid: 8750.25,
    totalBilled: 10001.00,
    nextPaymentDue: '2024-02-15',
    paymentPlan: {
      active: true,
      totalAmount: 1250.75,
      monthlyPayment: 125.08,
      remainingPayments: 10,
      nextPaymentDate: '2024-02-15'
    },
    invoices: [
      {
        id: 'INV-2024-001',
        date: '2024-01-15',
        dueDate: '2024-02-15',
        amount: 450.00,
        paid: 450.00,
        status: 'paid',
        description: 'Consultation and Lab Tests',
        items: [
          { description: 'Initial Consultation', amount: 150.00 },
          { description: 'Blood Tests', amount: 200.00 },
          { description: 'X-Ray', amount: 100.00 }
        ]
      },
      {
        id: 'INV-2024-002',
        date: '2024-01-20',
        dueDate: '2024-02-20',
        amount: 800.75,
        paid: 600.00,
        status: 'partial',
        description: 'Emergency Room Visit',
        items: [
          { description: 'ER Visit', amount: 500.00 },
          { description: 'CT Scan', amount: 300.75 }
        ]
      },
      {
        id: 'INV-2024-003',
        date: '2024-01-25',
        dueDate: '2024-02-25',
        amount: 650.00,
        paid: 0.00,
        status: 'unpaid',
        description: 'Surgery and Follow-up',
        items: [
          { description: 'Surgery', amount: 500.00 },
          { description: 'Follow-up Consultation', amount: 150.00 }
        ]
      }
    ],
    paymentHistory: [
      {
        id: 'PAY-2024-001',
        date: '2024-01-16',
        amount: 450.00,
        method: 'Credit Card',
        status: 'completed',
        invoiceId: 'INV-2024-001'
      },
      {
        id: 'PAY-2024-002',
        date: '2024-01-22',
        amount: 600.00,
        method: 'Insurance',
        status: 'completed',
        invoiceId: 'INV-2024-002'
      }
    ],
    insuranceClaims: [
      {
        id: 'CLM-2024-001',
        date: '2024-01-20',
        amount: 800.75,
        status: 'approved',
        approvedAmount: 600.00,
        deniedAmount: 200.75,
        reason: 'Pre-authorization required for CT scan'
      }
    ]
  };

  const billingDataToUse = billingData || mockBillingData;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'partial': return 'bg-yellow-100 text-yellow-800';
      case 'unpaid': return 'bg-red-100 text-red-800';
      case 'overdue': return 'bg-red-200 text-red-900';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'partial': return <Clock className="w-4 h-4" />;
      case 'unpaid': return <AlertCircle className="w-4 h-4" />;
      case 'overdue': return <AlertCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const handlePayment = async (invoiceId: string, amount: number) => {
    if (!paymentService.isConfigured()) {
      toast.error('Payment service is not configured. Please contact support.');
      return;
    }

    setIsProcessingPayment(true);
    try {
      // Create payment intent
      const result = await paymentService.createPaymentIntent(
        amount,
        'usd',
        invoiceId,
        patientId,
        `Payment for invoice ${invoiceId}`
      );

      if ('error' in result) {
        throw new Error(result.error || 'Failed to create payment intent');
      }

      // In a real implementation, this would redirect to a payment form
      // For now, we'll simulate a successful payment
      toast.success(`Payment of $${amount.toFixed(2)} processed successfully!`);

      // Send SMS notification if enabled
      if (billingPreferences.smsNotifications && smsService.isConfigured()) {
        try {
          // Note: In a real implementation, you'd get the patient's phone number from their profile
          // For now, we'll skip SMS as we don't have the phone number in this context
          console.log('SMS notification would be sent for payment confirmation');
          /*
          await smsService.sendSMS(
            patientPhoneNumber, // Would need to fetch from patient profile
            `Payment of $${amount.toFixed(2)} for invoice ${invoiceId} has been processed successfully.`
          );
          */
        } catch (smsError) {
          console.warn('SMS notification failed:', smsError);
        }
      }

      setPaymentDialogOpen(false);
      refetch(); // Refresh billing data

    } catch (error) {
      console.error('Payment failed:', error);
      toast.error('Payment failed. Please try again or contact support.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const downloadInvoice = (invoice: any) => {
    // In a real implementation, this would generate and download a PDF
    toast.success(`Downloading invoice ${invoice.id}...`);
  };

  const emailInvoice = (invoice: any) => {
    // In a real implementation, this would send the invoice via email
    toast.success(`Invoice ${invoice.id} sent to your email.`);
  };

  const updateBillingPreferences = async () => {
    // In a real implementation, this would update preferences in the database
    toast.success('Billing preferences updated successfully.');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load billing information. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Billing Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Outstanding Balance</p>
                <p className="text-2xl font-bold text-red-600">
                  ${billingDataToUse.outstandingBalance.toFixed(2)}
                </p>
                {(billingDataToUse as any).nextPaymentDue && (
                  <p className="text-xs text-gray-500">
                    Next due: {format(new Date((billingDataToUse as any).nextPaymentDue), 'MMM dd')}
                  </p>
                )}
              </div>
              <DollarSign className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Paid</p>
                <p className="text-2xl font-bold text-green-600">
                  ${billingDataToUse.totalPaid.toFixed(2)}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Billed</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${billingDataToUse.totalBilled.toFixed(2)}
                </p>
              </div>
              <Receipt className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Payment Progress</p>
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round((billingDataToUse.totalPaid / billingDataToUse.totalBilled) * 100)}%
                </p>
                <Progress
                  value={(billingDataToUse.totalPaid / billingDataToUse.totalBilled) * 100}
                  className="mt-2"
                />
              </div>
              <TrendingUp className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Plan Alert */}
      {(billingDataToUse as any).paymentPlan?.active && (
        <Alert>
          <Calendar className="h-4 w-4" />
          <AlertDescription>
            You have an active payment plan. Next payment of ${(billingDataToUse as any).paymentPlan.monthlyPayment.toFixed(2)}
            is due on {format(new Date((billingDataToUse as any).paymentPlan.nextPaymentDate), 'MMMM dd, yyyy')}.
            {(billingDataToUse as any).paymentPlan.remainingPayments} payments remaining.
          </AlertDescription>
        </Alert>
      )}

      {/* Billing Tabs */}
      <Tabs defaultValue="invoices" className="space-y-4">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="insurance">Insurance Claims</TabsTrigger>
          <TabsTrigger value="settings">Billing Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Invoices
              </CardTitle>
              <CardDescription>
                View and manage your medical invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {billingDataToUse.invoices.map((invoice: any) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.id}</TableCell>
                      <TableCell>{format(new Date(invoice.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{format(new Date(invoice.dueDate), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>${invoice.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(invoice.status)}>
                          <span className="flex items-center">
                            {getStatusIcon(invoice.status)}
                            <span className="ml-1 capitalize">{invoice.status}</span>
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedInvoice(invoice)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => downloadInvoice(invoice)}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => emailInvoice(invoice)}
                          >
                            <Mail className="w-4 h-4 mr-1" />
                            Email
                          </Button>
                          {invoice.status !== 'paid' && (
                            <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                              <DialogTrigger asChild>
                                <Button
                                  size="sm"
                                  onClick={() => setSelectedInvoice(invoice)}
                                >
                                  <CreditCard className="w-4 h-4 mr-1" />
                                  Pay
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Make Payment</DialogTitle>
                                  <DialogDescription>
                                    Pay invoice {selectedInvoice?.id} - ${(selectedInvoice?.amount - (selectedInvoice?.paid || 0)).toFixed(2)} due
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div className="p-4 bg-gray-50 rounded-lg">
                                    <h4 className="font-medium mb-2">Invoice Details</h4>
                                    <p className="text-sm text-gray-600">{selectedInvoice?.description}</p>
                                    <p className="text-lg font-bold mt-2">
                                      Amount Due: ${(selectedInvoice?.amount - (selectedInvoice?.paid || 0)).toFixed(2)}
                                    </p>
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor="payment-method">Payment Method</Label>
                                    <Select>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select payment method" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="credit-card">Credit Card</SelectItem>
                                        <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                                        <SelectItem value="paypal">PayPal</SelectItem>
                                        <SelectItem value="insurance">Insurance</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-2">
                                    <Label htmlFor="payment-amount">Payment Amount</Label>
                                    <Input
                                      id="payment-amount"
                                      type="number"
                                      step="0.01"
                                      defaultValue={(selectedInvoice?.amount - (selectedInvoice?.paid || 0)).toFixed(2)}
                                      placeholder="Enter amount"
                                    />
                                  </div>

                                  <div className="flex space-x-2">
                                    <Button
                                      onClick={() => handlePayment(
                                        selectedInvoice?.id,
                                        selectedInvoice?.amount - (selectedInvoice?.paid || 0)
                                      )}
                                      disabled={isProcessingPayment}
                                      className="flex-1"
                                    >
                                      {isProcessingPayment ? 'Processing...' : 'Pay Now'}
                                    </Button>
                                    <Button
                                      variant="outline"
                                      onClick={() => setPaymentDialogOpen(false)}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2" />
                Payment History
              </CardTitle>
              <CardDescription>
                View your payment history and receipts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(billingDataToUse as any).paymentHistory?.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.id}</TableCell>
                      <TableCell>{format(new Date(payment.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>${payment.amount.toFixed(2)}</TableCell>
                      <TableCell>{payment.method}</TableCell>
                      <TableCell>
                        <Badge className={payment.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-1" />
                          Receipt
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insurance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Insurance Claims
              </CardTitle>
              <CardDescription>
                Track your insurance claims and approvals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Claim ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(billingDataToUse as any).insuranceClaims?.map((claim: any) => (
                    <TableRow key={claim.id}>
                      <TableCell className="font-medium">{claim.id}</TableCell>
                      <TableCell>{format(new Date(claim.date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>${claim.amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge className={claim.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                          {claim.status}
                        </Badge>
                      </TableCell>
                      <TableCell>${claim.approvedAmount?.toFixed(2) || '0.00'}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          <Eye className="w-4 h-4 mr-1" />
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Billing Preferences
              </CardTitle>
              <CardDescription>
                Manage your billing notifications and payment preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Email Notifications</Label>
                    <p className="text-sm text-gray-600">
                      Receive billing updates and reminders via email
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={billingPreferences.emailNotifications}
                    onChange={(e) => setBillingPreferences(prev => ({
                      ...prev,
                      emailNotifications: e.target.checked
                    }))}
                    className="rounded"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">SMS Notifications</Label>
                    <p className="text-sm text-gray-600">
                      Receive billing alerts via text message
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={billingPreferences.smsNotifications}
                    onChange={(e) => setBillingPreferences(prev => ({
                      ...prev,
                      smsNotifications: e.target.checked
                    }))}
                    className="rounded"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Auto-Pay</Label>
                    <p className="text-sm text-gray-600">
                      Automatically pay invoices when due
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={billingPreferences.autoPay}
                    onChange={(e) => setBillingPreferences(prev => ({
                      ...prev,
                      autoPay: e.target.checked
                    }))}
                    className="rounded"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reminder-days">Reminder Days Before Due Date</Label>
                  <Select
                    value={billingPreferences.reminderDays.toString()}
                    onValueChange={(value) => setBillingPreferences(prev => ({
                      ...prev,
                      reminderDays: parseInt(value)
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="default-payment-method">Default Payment Method</Label>
                  <Select
                    value={billingPreferences.paymentMethod}
                    onValueChange={(value) => setBillingPreferences(prev => ({
                      ...prev,
                      paymentMethod: value
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select default payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="credit-card">Credit Card</SelectItem>
                      <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="insurance">Insurance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={updateBillingPreferences} className="w-full">
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invoice Details Dialog */}
      {selectedInvoice && !paymentDialogOpen && (
        <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Invoice Details - {selectedInvoice.id}</DialogTitle>
              <DialogDescription>
                {selectedInvoice.description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Invoice Date</label>
                  <p>{format(new Date(selectedInvoice.date), 'MMMM dd, yyyy')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Due Date</label>
                  <p>{format(new Date(selectedInvoice.dueDate), 'MMMM dd, yyyy')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Total Amount</label>
                  <p className="text-lg font-bold">${selectedInvoice.amount.toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Amount Paid</label>
                  <p className="text-lg font-bold text-green-600">${selectedInvoice.paid.toFixed(2)}</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Invoice Items</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInvoice.items.map((item: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">${item.amount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => downloadInvoice(selectedInvoice)}>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                <Button variant="outline" onClick={() => emailInvoice(selectedInvoice)}>
                  <Mail className="w-4 h-4 mr-2" />
                  Email Invoice
                </Button>
                {selectedInvoice.status !== 'paid' && (
                  <Button onClick={() => setPaymentDialogOpen(true)}>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Make Payment
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default PatientBillingAccess;