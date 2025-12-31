import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Search,
  Package,
  AlertTriangle,
  TrendingDown,
  Pill,
} from "lucide-react";
import { format } from "date-fns";
import {
  useMedications,
  useMedicationStats,
  useCreateMedication,
  useUpdateMedication,
  useMedicationsRealtime,
  Medication,
} from "@/hooks/useMedications";

export default function InventoryPage() {
  useMedicationsRealtime();

  const [searchTerm, setSearchTerm] = useState("");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [adjustModal, setAdjustModal] = useState<{ open: boolean; medication: Medication | null }>({
    open: false,
    medication: null,
  });

  const { data: medications, isLoading } = useMedications();
  const { data: stats } = useMedicationStats();

  const filteredMedications = medications?.filter((med) => {
    const matchesSearch =
      med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      med.generic_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      med.category?.toLowerCase().includes(searchTerm.toLowerCase());

    if (stockFilter === "low") {
      return matchesSearch && med.current_stock <= med.minimum_stock;
    } else if (stockFilter === "out") {
      return matchesSearch && med.current_stock === 0;
    } else if (stockFilter === "expiring") {
      if (!med.expiry_date) return false;
      const expiryDate = new Date(med.expiry_date);
      const thirtyDays = new Date();
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      return matchesSearch && expiryDate <= thirtyDays;
    }

    return matchesSearch;
  });

  const getStockStatus = (med: Medication) => {
    if (med.current_stock === 0) {
      return { label: "Out of Stock", variant: "destructive" as const };
    } else if (med.current_stock <= med.minimum_stock) {
      return { label: "Low Stock", variant: "secondary" as const };
    }
    return { label: "In Stock", variant: "default" as const };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Inventory Management</h1>
            <p className="text-muted-foreground">
              Track medication stock levels and manage inventory
            </p>
          </div>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Medication
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total || 0}</div>
            </CardContent>
          </Card>
          <Card className="border-destructive/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats?.lowStock || 0}</div>
            </CardContent>
          </Card>
          <Card className="border-destructive/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats?.outOfStock || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              <Pill className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.expiringSoon || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by medication name, generic name, or category..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={stockFilter} onValueChange={setStockFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by stock" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="out">Out of Stock</SelectItem>
              <SelectItem value="expiring">Expiring Soon</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Inventory Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medication</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Form / Strength</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Min. Stock</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredMedications?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No medications found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMedications?.map((medication) => {
                    const stockStatus = getStockStatus(medication);
                    const isExpiringSoon = medication.expiry_date && 
                      new Date(medication.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                    return (
                      <TableRow key={medication.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{medication.name}</p>
                            {medication.generic_name && (
                              <p className="text-sm text-muted-foreground">
                                {medication.generic_name}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{medication.category || "-"}</TableCell>
                        <TableCell>
                          {medication.form} {medication.strength}
                        </TableCell>
                        <TableCell className="font-medium">
                          {medication.current_stock} {medication.unit}
                        </TableCell>
                        <TableCell>{medication.minimum_stock}</TableCell>
                        <TableCell>
                          {medication.expiry_date ? (
                            <span className={isExpiringSoon ? "text-destructive font-medium" : ""}>
                              {format(new Date(medication.expiry_date), "MMM d, yyyy")}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={stockStatus.variant}>{stockStatus.label}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAdjustModal({ open: true, medication })}
                          >
                            Adjust Stock
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <AddMedicationModal open={isAddModalOpen} onOpenChange={setIsAddModalOpen} />
      <AdjustStockModal
        open={adjustModal.open}
        onOpenChange={(open) => setAdjustModal({ open, medication: adjustModal.medication })}
        medication={adjustModal.medication}
      />
    </DashboardLayout>
  );
}

function AddMedicationModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [formData, setFormData] = useState({
    name: "",
    generic_name: "",
    category: "",
    form: "",
    strength: "",
    unit: "units",
    current_stock: 0,
    minimum_stock: 10,
    expiry_date: "",
    batch_number: "",
    manufacturer: "",
    unit_price: 0,
  });

  const createMedication = useCreateMedication();

  const handleSubmit = () => {
    if (!formData.name) return;

    createMedication.mutate(
      {
        name: formData.name,
        generic_name: formData.generic_name || null,
        category: formData.category || null,
        form: formData.form || null,
        strength: formData.strength || null,
        unit: formData.unit,
        current_stock: formData.current_stock,
        minimum_stock: formData.minimum_stock,
        expiry_date: formData.expiry_date || null,
        batch_number: formData.batch_number || null,
        manufacturer: formData.manufacturer || null,
        unit_price: formData.unit_price || null,
        is_active: true,
      },
      {
        onSuccess: () => {
          setFormData({
            name: "",
            generic_name: "",
            category: "",
            form: "",
            strength: "",
            unit: "units",
            current_stock: 0,
            minimum_stock: 10,
            expiry_date: "",
            batch_number: "",
            manufacturer: "",
            unit_price: 0,
          });
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Medication</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Medication Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Generic Name</Label>
              <Input
                value={formData.generic_name}
                onChange={(e) => setFormData({ ...formData, generic_name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="antibiotic">Antibiotic</SelectItem>
                  <SelectItem value="analgesic">Analgesic</SelectItem>
                  <SelectItem value="antihypertensive">Antihypertensive</SelectItem>
                  <SelectItem value="antidiabetic">Antidiabetic</SelectItem>
                  <SelectItem value="antihistamine">Antihistamine</SelectItem>
                  <SelectItem value="vitamin">Vitamin/Supplement</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Form</Label>
              <Select
                value={formData.form}
                onValueChange={(value) => setFormData({ ...formData, form: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select form" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tablet">Tablet</SelectItem>
                  <SelectItem value="capsule">Capsule</SelectItem>
                  <SelectItem value="syrup">Syrup</SelectItem>
                  <SelectItem value="injection">Injection</SelectItem>
                  <SelectItem value="cream">Cream/Ointment</SelectItem>
                  <SelectItem value="drops">Drops</SelectItem>
                  <SelectItem value="inhaler">Inhaler</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Strength</Label>
              <Input
                value={formData.strength}
                onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                placeholder="e.g., 500mg"
              />
            </div>
            <div className="space-y-2">
              <Label>Unit</Label>
              <Select
                value={formData.unit}
                onValueChange={(value) => setFormData({ ...formData, unit: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="units">Units</SelectItem>
                  <SelectItem value="tablets">Tablets</SelectItem>
                  <SelectItem value="capsules">Capsules</SelectItem>
                  <SelectItem value="ml">Milliliters (ml)</SelectItem>
                  <SelectItem value="bottles">Bottles</SelectItem>
                  <SelectItem value="vials">Vials</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Initial Stock</Label>
              <Input
                type="number"
                min="0"
                value={formData.current_stock}
                onChange={(e) =>
                  setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Minimum Stock Level</Label>
              <Input
                type="number"
                min="1"
                value={formData.minimum_stock}
                onChange={(e) =>
                  setFormData({ ...formData, minimum_stock: parseInt(e.target.value) || 10 })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Expiry Date</Label>
              <Input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Batch Number</Label>
              <Input
                value={formData.batch_number}
                onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Manufacturer</Label>
              <Input
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Unit Price ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.unit_price || ""}
                onChange={(e) =>
                  setFormData({ ...formData, unit_price: parseFloat(e.target.value) || 0 })
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createMedication.isPending || !formData.name}>
            {createMedication.isPending ? "Adding..." : "Add Medication"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdjustStockModal({
  open,
  onOpenChange,
  medication,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medication: Medication | null;
}) {
  const [adjustmentType, setAdjustmentType] = useState<"add" | "remove" | "set">("add");
  const [quantity, setQuantity] = useState("");

  const updateMedication = useUpdateMedication();

  const handleSubmit = () => {
    if (!medication || !quantity) return;

    const qty = parseInt(quantity);
    if (isNaN(qty)) return;

    let newStock = medication.current_stock;
    if (adjustmentType === "add") {
      newStock += qty;
    } else if (adjustmentType === "remove") {
      newStock = Math.max(0, newStock - qty);
    } else {
      newStock = qty;
    }

    updateMedication.mutate(
      { id: medication.id, current_stock: newStock },
      {
        onSuccess: () => {
          setQuantity("");
          setAdjustmentType("add");
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust Stock</DialogTitle>
        </DialogHeader>

        {medication && (
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">{medication.name}</p>
              <p className="text-sm text-muted-foreground">
                Current Stock: {medication.current_stock} {medication.unit}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Adjustment Type</Label>
              <Select
                value={adjustmentType}
                onValueChange={(value) => setAdjustmentType(value as "add" | "remove" | "set")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add Stock</SelectItem>
                  <SelectItem value="remove">Remove Stock</SelectItem>
                  <SelectItem value="set">Set Stock Level</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={adjustmentType === "set" ? "New stock level" : "Quantity to adjust"}
              />
            </div>

            {quantity && !isNaN(parseInt(quantity)) && (
              <div className="p-3 bg-primary/10 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">New Stock Level</p>
                <p className="text-2xl font-bold">
                  {adjustmentType === "add"
                    ? medication.current_stock + parseInt(quantity)
                    : adjustmentType === "remove"
                    ? Math.max(0, medication.current_stock - parseInt(quantity))
                    : parseInt(quantity)}{" "}
                  {medication.unit}
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={updateMedication.isPending || !quantity}>
            {updateMedication.isPending ? "Updating..." : "Update Stock"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
