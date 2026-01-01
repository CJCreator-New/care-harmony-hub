import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus,
  Search,
  Building2,
  Package,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  Truck,
} from 'lucide-react';
import { format } from 'date-fns';
import {
  useSuppliers,
  useCreateSupplier,
  usePurchaseOrders,
  useUpdatePurchaseOrderStatus,
} from '@/hooks/useSuppliers';
import { CreatePurchaseOrderModal } from '@/components/suppliers/CreatePurchaseOrderModal';

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="h-3 w-3" /> },
  ordered: { label: 'Ordered', color: 'bg-blue-100 text-blue-800', icon: <Package className="h-3 w-3" /> },
  shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-800', icon: <Truck className="h-3 w-3" /> },
  received: { label: 'Received', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="h-3 w-3" /> },
};

export default function SuppliersPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddSupplierOpen, setIsAddSupplierOpen] = useState(false);
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    payment_terms: '',
    notes: '',
  });

  const { data: suppliers, isLoading: suppliersLoading } = useSuppliers();
  const { data: orders, isLoading: ordersLoading } = usePurchaseOrders();
  const createSupplier = useCreateSupplier();
  const updateOrderStatus = useUpdatePurchaseOrderStatus();

  const filteredSuppliers = suppliers?.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddSupplier = () => {
    if (!newSupplier.name) return;
    createSupplier.mutate(newSupplier, {
      onSuccess: () => {
        setIsAddSupplierOpen(false);
        setNewSupplier({
          name: '',
          contact_person: '',
          email: '',
          phone: '',
          address: '',
          payment_terms: '',
          notes: '',
        });
      },
    });
  };

  const handleStatusUpdate = (orderId: string, newStatus: string) => {
    updateOrderStatus.mutate({ id: orderId, status: newStatus });
  };

  const pendingOrders = orders?.filter((o) => o.status === 'pending').length || 0;
  const totalOrders = orders?.length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Supplier Management</h1>
            <p className="text-muted-foreground">Manage suppliers and purchase orders</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isAddSupplierOpen} onOpenChange={setIsAddSupplierOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Building2 className="mr-2 h-4 w-4" />
                  Add Supplier
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add New Supplier</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Company Name *</Label>
                    <Input
                      value={newSupplier.name}
                      onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                      placeholder="Supplier name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Person</Label>
                    <Input
                      value={newSupplier.contact_person}
                      onChange={(e) => setNewSupplier({ ...newSupplier, contact_person: e.target.value })}
                      placeholder="Contact name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={newSupplier.email}
                        onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                        placeholder="email@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={newSupplier.phone}
                        onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Address</Label>
                    <Textarea
                      value={newSupplier.address}
                      onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                      placeholder="Full address"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Terms</Label>
                    <Input
                      value={newSupplier.payment_terms}
                      onChange={(e) => setNewSupplier({ ...newSupplier, payment_terms: e.target.value })}
                      placeholder="e.g., Net 30"
                    />
                  </div>
                  <Button onClick={handleAddSupplier} className="w-full" disabled={createSupplier.isPending}>
                    {createSupplier.isPending ? 'Adding...' : 'Add Supplier'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button onClick={() => setIsCreateOrderOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Order
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Suppliers</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{suppliers?.length || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingOrders}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalOrders}</div>
            </CardContent>
          </Card>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="suppliers">
          <TabsList>
            <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
            <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="suppliers" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search suppliers..."
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Payment Terms</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {suppliersLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredSuppliers?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No suppliers found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSuppliers?.map((supplier) => (
                        <TableRow key={supplier.id}>
                          <TableCell>
                            <div className="font-medium">{supplier.name}</div>
                            {supplier.address && (
                              <div className="text-sm text-muted-foreground">{supplier.address}</div>
                            )}
                          </TableCell>
                          <TableCell>{supplier.contact_person || '-'}</TableCell>
                          <TableCell>
                            {supplier.email ? (
                              <a href={`mailto:${supplier.email}`} className="flex items-center gap-1 text-primary hover:underline">
                                <Mail className="h-3 w-3" />
                                {supplier.email}
                              </a>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {supplier.phone ? (
                              <span className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {supplier.phone}
                              </span>
                            ) : '-'}
                          </TableCell>
                          <TableCell>{supplier.payment_terms || '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="orders" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordersLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : orders?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No purchase orders found
                        </TableCell>
                      </TableRow>
                    ) : (
                      orders?.map((order) => {
                        const status = ORDER_STATUS_CONFIG[order.status] || ORDER_STATUS_CONFIG.pending;
                        return (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">{order.order_number}</TableCell>
                            <TableCell>{order.supplier?.name || 'Unknown'}</TableCell>
                            <TableCell>{format(new Date(order.ordered_at), 'MMM d, yyyy')}</TableCell>
                            <TableCell>${order.total_amount?.toFixed(2) || '0.00'}</TableCell>
                            <TableCell>
                              <Badge className={`gap-1 ${status.color}`}>
                                {status.icon}
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {order.status === 'pending' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStatusUpdate(order.id, 'ordered')}
                                >
                                  Mark Ordered
                                </Button>
                              )}
                              {order.status === 'ordered' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleStatusUpdate(order.id, 'shipped')}
                                >
                                  Mark Shipped
                                </Button>
                              )}
                              {order.status === 'shipped' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleStatusUpdate(order.id, 'received')}
                                >
                                  Mark Received
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <CreatePurchaseOrderModal open={isCreateOrderOpen} onOpenChange={setIsCreateOrderOpen} />
    </DashboardLayout>
  );
}
