/**
 * Recharts Bundle Component
 * 
 * This component bundles all Recharts imports to enable code splitting.
 * It's loaded dynamically by LazyChart components.
 * 
 * @module RechartsBundle
 * @version 1.0.0
 */

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine
} from 'recharts';

interface RechartsBundleProps {
  type: 'line' | 'bar' | 'pie' | 'area' | 'composed';
  data: any[];
  width?: number | string;
  height?: number | string;
  xAxisKey?: string;
  yAxisKey?: string;
  dataKeys?: string[];
  colors?: string[];
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  [key: string]: any;
}

const defaultColors = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function RechartsBundle({
  type,
  data,
  width = '100%',
  height = 300,
  xAxisKey = 'name',
  yAxisKey,
  dataKeys = ['value'],
  colors = defaultColors,
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  ...props
}: RechartsBundleProps) {
  const renderChart = () => {
    const commonProps = {
      data,
      width,
      height,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (type) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey={xAxisKey} />
            <YAxis />
            {showTooltip && <Tooltip />}
            {showLegend && <Legend />}
            {dataKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey={xAxisKey} />
            <YAxis />
            {showTooltip && <Tooltip />}
            {showLegend && <Legend />}
            {dataKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={colors[index % colors.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        );

      case 'pie':
        return (
          <PieChart width={width as number} height={height as number}>
            {showTooltip && <Tooltip />}
            {showLegend && <Legend />}
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey={dataKeys[0]}
              {...props}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
          </PieChart>
        );

      case 'area':
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey={xAxisKey} />
            <YAxis />
            {showTooltip && <Tooltip />}
            {showLegend && <Legend />}
            {dataKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[index % colors.length]}
                fill={colors[index % colors.length]}
                fillOpacity={0.3}
              />
            ))}
          </AreaChart>
        );

      case 'composed':
        return (
          <ComposedChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" />}
            <XAxis dataKey={xAxisKey} />
            <YAxis />
            {showTooltip && <Tooltip />}
            {showLegend && <Legend />}
            {dataKeys.map((key, index) => {
              const color = colors[index % colors.length];
              if (index === 0) {
                return <Bar key={key} dataKey={key} barSize={20} fill={color} />;
              }
              return (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={color}
                  strokeWidth={2}
                />
              );
            })}
          </ComposedChart>
        );

      default:
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No chart data available
          </div>
        );
    }
  };

  return (
    <ResponsiveContainer width={width} height={height}>
      {renderChart()}
    </ResponsiveContainer>
  );
}

// Export individual components for direct use if needed
export {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ReferenceLine
};
