import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Users, DollarSign, Activity, Bed } from 'lucide-react';

const stats = [
  { label: 'Revenue', value: '$124.5K', change: '+12%', up: true, icon: DollarSign },
  { label: 'Patients', value: '2,847', change: '+8%', up: true, icon: Users },
  { label: 'Satisfaction', value: '94%', change: '+3%', up: true, icon: Activity },
  { label: 'Bed Usage', value: '78%', change: '-2%', up: false, icon: Bed },
];

const recentActivity = [
  { action: 'New staff added', user: 'Dr. Emily Chen', time: '2m ago' },
  { action: 'Report generated', user: 'Admin System', time: '15m ago' },
  { action: 'Settings updated', user: 'John Admin', time: '1h ago' },
];

export function AdminMockup() {
  return (
    <div className="h-full flex flex-col bg-background p-3 pt-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">Analytics Dashboard</h3>
          <p className="text-[10px] text-muted-foreground">December 2024 Overview</p>
        </div>
        <Badge variant="secondary" className="text-[9px]">
          Live
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-2">
            <div className="flex items-center justify-between mb-1">
              <stat.icon className="w-3.5 h-3.5 text-muted-foreground" />
              <Badge 
                variant="outline" 
                className={`text-[7px] px-1 py-0 h-3.5 ${stat.up ? 'text-success border-success/30' : 'text-destructive border-destructive/30'}`}
              >
                {stat.up ? <TrendingUp className="w-2 h-2 mr-0.5" /> : <TrendingDown className="w-2 h-2 mr-0.5" />}
                {stat.change}
              </Badge>
            </div>
            <p className="text-base font-bold text-foreground">{stat.value}</p>
            <p className="text-[8px] text-muted-foreground">{stat.label}</p>
          </Card>
        ))}
      </div>

      {/* Mini Chart Placeholder */}
      <Card className="p-2 mb-3">
        <p className="text-[9px] font-medium text-foreground mb-2">Patient Volume (7 Days)</p>
        <div className="flex items-end justify-between h-12 gap-1">
          {[40, 65, 55, 80, 72, 90, 85].map((height, i) => (
            <div 
              key={i} 
              className="flex-1 bg-primary/20 rounded-t"
              style={{ height: `${height}%` }}
            >
              <div 
                className="w-full bg-primary rounded-t transition-all"
                style={{ height: `${height * 0.7}%` }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-1">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
            <span key={i} className="text-[7px] text-muted-foreground flex-1 text-center">{day}</span>
          ))}
        </div>
      </Card>

      {/* Recent Activity */}
      <Card className="flex-1 p-2 bg-muted/30">
        <p className="text-[9px] font-medium text-foreground mb-2">Recent Activity</p>
        <div className="space-y-1.5">
          {recentActivity.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div>
                <p className="text-[9px] text-foreground">{item.action}</p>
                <p className="text-[8px] text-muted-foreground">{item.user}</p>
              </div>
              <span className="text-[8px] text-muted-foreground">{item.time}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
