import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Search, 
  Plus, 
  Filter, 
  AlertCircle, 
  ArrowUpDown,
  MoreHorizontal,
  Package,
  History,
  TrendingDown
} from 'lucide-react';
import { useMedications, useMedicationStats } from '@/hooks/useMedications';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function InventoryDashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: medications, isLoading } = useMedications();
  const { data: stats } = useMedicationStats();

  const filteredMeds = medications?.filter(med => 
    med.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    med.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Inventory Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-red-200 bg-red-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              Critical Stockouts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">
              {stats?.lowStock || 0}
            </div>
            <p className="text-xs text-red-600 mt-1">Requires immediate reorder</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-yellow-600" />
              Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">8</div>
            <p className="text-xs text-yellow-600 mt-1">Within next 30 days</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <History className="h-4 w-4 text-blue-600" />
              Pending Shipments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">3</div>
            <p className="text-xs text-blue-600 mt-1">Expected this week</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Inventory Management</CardTitle>
              <CardDescription>Monitor and manage medication stock levels</CardDescription>
            </div>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Medication
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search inventory by name, code, or category..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filter
              </Button>
              <Button variant="outline" className="gap-2">
                <ArrowUpDown className="h-4 w-4" />
                Sort
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medication</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Stock Level</TableHead>
                  <TableHead>Unity Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array(5).fill(0).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredMeds?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      No medications found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMeds?.map((med) => (
                    <TableRow key={med.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{med.name}</span>
                          <span className="text-xs text-muted-foreground">{med.code}</span>
                        </div>
                      </TableCell>
                      <TableCell>{med.category}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{med.stock_quantity} {med.unit}</span>
                          <div className="w-24 h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                            <div 
                              className={`h-full ${med.stock_quantity < 20 ? 'bg-red-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(100, (med.stock_quantity / (med.reorder_level || 100)) * 50)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>${med.unit_price?.toFixed(2)}</TableCell>
                      <TableCell>
                        {med.stock_quantity < (med.reorder_level || 10) ? (
                          <Badge variant="destructive">Low Stock</Badge>
                        ) : (
                          <Badge variant="success">In Stock</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            <DropdownMenuItem>Edit Stock</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">Mark as Discontinued</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
