/**
 * Lazy-Loaded Chart Components
 * 
 * Dynamically imports Recharts only when charts are rendered,
 * reducing initial bundle size by ~600KB.
 * 
 * @module LazyChart
 * @version 1.0.0
 */

import { Suspense, lazy, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

// Loading fallback component
const ChartLoader = () => (
  <div className="flex items-center justify-center h-64 w-full bg-gray-50 rounded-lg">
    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
  </div>
);

// Dynamically import Recharts components
const RechartsModule = lazy(() => import('./RechartsBundle'));

interface ChartProps {
  data: any[];
  width?: number | string;
  height?: number | string;
  [key: string]: any;
}

/**
 * Lazy-loaded Line Chart
 * Only loads Recharts when rendered
 */
export function LazyLineChart(props: ChartProps) {
  return (
    <Suspense fallback={<ChartLoader />}>
      <RechartsModule type="line" {...props} />
    </Suspense>
  );
}

/**
 * Lazy-loaded Bar Chart
 * Only loads Recharts when rendered
 */
export function LazyBarChart(props: ChartProps) {
  return (
    <Suspense fallback={<ChartLoader />}>
      <RechartsModule type="bar" {...props} />
    </Suspense>
  );
}

/**
 * Lazy-loaded Pie Chart
 * Only loads Recharts when rendered
 */
export function LazyPieChart(props: ChartProps) {
  return (
    <Suspense fallback={<ChartLoader />}>
      <RechartsModule type="pie" {...props} />
    </Suspense>
  );
}

/**
 * Lazy-loaded Area Chart
 * Only loads Recharts when rendered
 */
export function LazyAreaChart(props: ChartProps) {
  return (
    <Suspense fallback={<ChartLoader />}>
      <RechartsModule type="area" {...props} />
    </Suspense>
  );
}

/**
 * Lazy-loaded Composed Chart
 * Only loads Recharts when rendered
 */
export function LazyComposedChart(props: ChartProps) {
  return (
    <Suspense fallback={<ChartLoader />}>
      <RechartsModule type="composed" {...props} />
    </Suspense>
  );
}

export default {
  LineChart: LazyLineChart,
  BarChart: LazyBarChart,
  PieChart: LazyPieChart,
  AreaChart: LazyAreaChart,
  ComposedChart: LazyComposedChart
};
