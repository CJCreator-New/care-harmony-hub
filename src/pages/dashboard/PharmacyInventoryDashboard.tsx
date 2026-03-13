import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCountUp } from '@/hooks/useCountUp';
import { Package, AlertTriangle, TrendingDown, Search, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

// ── Data hook ─────────────────────────────────────────────────────────────────

interface InventoryItem {
  id: string;
  name: string;
  category: string | null;
  quantity_in_stock: number;
  reorder_level: number;
  unit_price: number;
  expiry_date: string | null;
  supplier: string | null;
  hospital_id: string;
}

function usePharmacyInventory() {
  const { hospital } = useAuth();

  return useQuery({
    queryKey: ['pharmacy-inventory-dashboard', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) {
        console.warn('[PharmacyInventoryDashboard] Hospital context not loaded');
        return [];
      }

      const { data, error } = await supabase
        .from('inventory')
        .select('id, name, category, quantity_in_stock, reorder_level, unit_price, expiry_date, supplier, hospital_id')
        .eq('hospital_id', hospital.id)
        .order('quantity_in_stock', { ascending: true });

      if (error) throw error;
      return (data ?? []) as InventoryItem[];
    },
    enabled: !!hospital?.id,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getStockStatus(item: InventoryItem): 'out' | 'critical' | 'low' | 'ok' {
  if (item.quantity_in_stock <= 0) return 'out';
  if (item.quantity_in_stock <= item.reorder_level * 0.5) return 'critical';
  if (item.quantity_in_stock <= item.reorder_level) return 'low';
  return 'ok';
}

const STATUS_META = {
  out:      { label: 'Out of Stock', classes: 'bg-destructive/10 text-destructive border-destructive/20' },
  critical: { label: 'Critical',     classes: 'bg-orange-100 text-orange-700 border-orange-200' },
  low:      { label: 'Low Stock',    classes: 'bg-warning/10 text-warning-700 border-warning/20' },
  ok:       { label: 'In Stock',     classes: 'bg-success/10 text-success-700 border-success/20' },
};

function StockBadge({ status }: { status: ReturnType<typeof getStockStatus> }) {
  const meta = STATUS_META[status];
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${meta.classes}`}>
      {meta.label}
    </span>
  );
}

function KPIStat({ label, value, icon: Icon, variant = 'default' }: {
  label: string; value: number; icon: React.ElementType;
  variant?: 'default' | 'warning' | 'critical';
}) {
  const animated = useCountUp(value, { duration: 700 });
  const variantClass = variant === 'critical' ? 'cs-stat-card cs-critical' :
                       variant === 'warning'  ? 'cs-stat-card border-warning-200' : 'cs-stat-card';
  return (
    <div className={`${variantClass} p-4 rounded-lg`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="text-3xl font-display font-bold animate-stat-pop">{animated}</div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function PharmacyInventoryDashboard() {
  const [search, setSearch] = useState('');
  const { data: items = [], isLoading, refetch, isRefetching } = usePharmacyInventory();

  const today = new Date().toISOString().split('T')[0];
  const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const outOfStock     = items.filter(i => getStockStatus(i) === 'out');
  const criticalItems  = items.filter(i => getStockStatus(i) === 'critical');
  const lowItems       = items.filter(i => getStockStatus(i) === 'low');
  const expiringItems  = items.filter(i => i.expiry_date && i.expiry_date <= thirtyDays && i.expiry_date >= today);

  const filtered = items.filter(i =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.category ?? '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="cs-gradient-mesh min-h-screen p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display text-foreground">Pharmacy Inventory</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {items.length} products ·{' '}
            Last updated {format(new Date(), 'HH:mm')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isRefetching}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* KPI Row */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-shimmer" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 cs-stagger-children">
          <KPIStat label="Total Items"        value={items.length}      icon={Package} />
          <KPIStat label="Out of Stock"       value={outOfStock.length} icon={AlertTriangle} variant={outOfStock.length ? 'critical' : 'default'} />
          <KPIStat label="Low / Critical"     value={criticalItems.length + lowItems.length} icon={TrendingDown} variant={criticalItems.length ? 'warning' : 'default'} />
          <KPIStat label="Expiring (30 days)" value={expiringItems.length} icon={AlertTriangle} variant={expiringItems.length ? 'warning' : 'default'} />
        </div>
      )}

      {/* Alert banners */}
      {outOfStock.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive flex items-center gap-2 animate-fade-up">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            <strong>{outOfStock.length} item{outOfStock.length > 1 ? 's' : ''} out of stock:</strong>{' '}
            {outOfStock.slice(0, 3).map(i => i.name).join(', ')}
            {outOfStock.length > 3 && ` +${outOfStock.length - 3} more`}
          </span>
        </div>
      )}

      {/* Inventory table */}
      <Card className="cs-card-1">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">Inventory</CardTitle>
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-8 h-8 text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-10 rounded bg-muted animate-shimmer" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left p-3 text-xs uppercase tracking-wide text-muted-foreground font-medium">Name</th>
                    <th className="text-left p-3 text-xs uppercase tracking-wide text-muted-foreground font-medium">Category</th>
                    <th className="text-right p-3 text-xs uppercase tracking-wide text-muted-foreground font-medium">In Stock</th>
                    <th className="text-right p-3 text-xs uppercase tracking-wide text-muted-foreground font-medium">Reorder At</th>
                    <th className="text-left p-3 text-xs uppercase tracking-wide text-muted-foreground font-medium">Expiry</th>
                    <th className="text-left p-3 text-xs uppercase tracking-wide text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="cs-stagger-children">
                  {filtered.map((item) => {
                    const status = getStockStatus(item);
                    const expiring = item.expiry_date && item.expiry_date <= thirtyDays;
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                      >
                        <td className="p-3 font-medium">{item.name}</td>
                        <td className="p-3 text-muted-foreground">{item.category ?? '—'}</td>
                        <td className={`p-3 text-right font-mono font-semibold ${status === 'out' ? 'text-destructive' : status === 'critical' ? 'text-orange-600' : ''}`}>
                          {item.quantity_in_stock}
                        </td>
                        <td className="p-3 text-right font-mono text-muted-foreground">
                          {item.reorder_level}
                        </td>
                        <td className={`p-3 text-sm ${expiring ? 'text-warning-700 font-medium' : 'text-muted-foreground'}`}>
                          {item.expiry_date ? format(new Date(item.expiry_date), 'MMM d, yyyy') : '—'}
                        </td>
                        <td className="p-3">
                          <StockBadge status={status} />
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                        No items match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
