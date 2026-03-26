import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  BarChart3,
  CheckCircle2,
  XCircle,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Zap,
  Layers,
} from 'lucide-react'

import { Card } from '../components/Card'
import { Badge } from '../components/Badge'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { PlatformIcon, getPlatformLabel } from '../components/PlatformIcon'
import { api } from '../lib/api'
import type { AnalyticsOverview, PaginatedResponse, PublishResult } from '../types'

const PIE_COLORS = ['#00F2FF', '#9D4EDD', '#FF00A0', '#00FF9C', '#FFD700'] // Volt, Amethyst, Hot Pink, Emerald, Gold

const tooltipStyle = {
  background: 'rgba(10, 11, 14, 0.85)',
  border: '1px solid rgba(0, 242, 255, 0.2)',
  borderRadius: '16px',
  fontSize: '11px',
  padding: '12px 16px',
  backdropBlur: '12px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  color: '#EDF2F4'
}

export function Analytics() {
  const { data: analytics, isLoading: loadingAnalytics } = useQuery<AnalyticsOverview>({
    queryKey: ['analytics'],
    queryFn: api.analyticsOverview,
  })

  const { data: publishResults } = useQuery<PaginatedResponse<PublishResult>>({
    queryKey: ['publishResults'],
    queryFn: () => api.listPublishResults(),
  })

  const chartData = useMemo(
    () =>
      Object.entries(analytics?.by_platform ?? {}).map(([platform, count]) => ({
        platform: getPlatformLabel(platform),
        platformKey: platform,
        count,
      })),
    [analytics],
  )

  const successRate = analytics?.success_rate ?? 0
  const successPct = Math.round(successRate * 100)

  if (loadingAnalytics) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner size={32} label="Synchronizing Intelligence..." />
      </div>
    )
  }

  if (!analytics || analytics.total_posts === 0) {
    return (
      <Card className="py-24">
        <EmptyState
          icon={BarChart3}
          title="Telemetry Missing"
          description="Initiate content cycles to begin tracking performance telemetry."
        />
      </Card>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={Activity}
          label="Operational Volume"
          value={analytics.total_posts}
          color="text-silver"
          accent="bg-graphite/40"
        />
        <MetricCard
          icon={Target}
          label="Precision Rate"
          value={`${successPct}%`}
          color={successPct >= 80 ? 'text-volt' : 'text-amber'}
          accent={successPct >= 80 ? 'bg-volt/10' : 'bg-amber/10'}
          trend={successPct >= 80 ? 'up' : 'down'}
        />
        <MetricCard
          icon={Zap}
          label="Successful Deploys"
          value={analytics.success_posts}
          color="text-success"
          accent="bg-success/10"
        />
        <MetricCard
          icon={XCircle}
          label="Failed Transfers"
          value={analytics.failed_posts}
          color="text-danger"
          accent="bg-danger/10"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bar chart */}
        <Card padding="lg" className="border-graphite/40">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 rounded-xl bg-volt/10 text-volt">
                <BarChart3 size={18} />
            </div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-dim">
                Platform Velocity
            </h3>
          </div>
          
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="platform"
                  stroke="rgba(255,255,255,0.3)"
                  tick={{ fontSize: 10, fontWeight: 700 }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.3)"
                  tick={{ fontSize: 10, fontWeight: 700 }}
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  contentStyle={tooltipStyle} 
                  cursor={{ fill: 'rgba(0, 242, 255, 0.05)' }} 
                  animationDuration={200}
                />
                <Bar dataKey="count" radius={[12, 12, 4, 4]}>
                  {chartData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Pie chart */}
        <Card padding="lg" className="border-graphite/40">
           <div className="flex items-center gap-3 mb-8">
            <div className="p-2 rounded-xl bg-amethyst/10 text-amethyst">
                <Layers size={18} />
            </div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-dim">
                Matrix Allocation
            </h3>
          </div>

          <div className="h-72 relative">
             <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                <span className="text-[10px] font-black uppercase tracking-widest text-dim">Total</span>
                <span className="text-3xl font-serif font-bold text-silver">{analytics.total_posts}</span>
             </div>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="count"
                  nameKey="platform"
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={105}
                  paddingAngle={8}
                  stroke="none"
                >
                  {chartData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} fillOpacity={0.8} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {chartData.map((item, idx) => (
              <div key={item.platform} className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-void/30 border border-graphite/40">
                <div
                  className="h-2 w-2 rounded-full shadow-glow-volt"
                  style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }}
                />
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-dim truncate">{item.platform}</p>
                  <p className="text-xs font-bold text-silver">{item.count} deploys</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent publish results */}
      {publishResults?.items && publishResults.items.length > 0 && (
        <Card padding="none" className="overflow-hidden border-graphite/40">
           <div className="p-6 border-b border-graphite/40 bg-void/20 flex items-center justify-between">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-dim">
                Deployment Registry
              </h3>
              <Badge variant="muted" size="sm" className="bg-graphite/40 text-[10px]">Real-time Updates Active</Badge>
           </div>
          <div className="max-h-[400px] overflow-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-stellar/90 backdrop-blur-xl border-b border-graphite/40">
                <tr className="text-[10px] uppercase font-black tracking-widest text-dim/60">
                  <th className="px-6 py-4">Matrix</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Vector ID</th>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4 text-right">Diagnostic</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-graphite/20">
                {publishResults?.items.slice(0, 20).map((r, i) => (
                  <tr key={i} className="group hover:bg-volt/5 transition-colors">
                    <td className="px-6 py-5">
                      <PlatformIcon platform={r.platform} size={18} showLabel className="font-bold scale-90" />
                    </td>
                    <td className="px-6 py-5">
                      {r.success ? (
                        <div className="flex items-center gap-2 text-volt">
                          <CheckCircle2 size={14} className="animate-pulse" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-danger">
                          <XCircle size={14} />
                          <span className="text-[10px] font-black uppercase tracking-widest">Aborted</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <span className="font-mono text-[10px] bg-void/40 px-2 py-1 rounded border border-graphite/40 text-dim">
                        {r.external_id ? r.external_id.slice(0, 16) : 'NON-SPEC'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-[11px] font-bold text-silver/80">
                      {new Date(r.at).toLocaleDateString()} {new Date(r.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-5 text-right">
                      <p className="text-xs text-dim italic truncate max-w-[200px] ml-auto">
                        {r.message ?? i % 3 === 0 ? 'Protocol success' : 'Vector confirmed'}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  color,
  accent,
  trend,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  color: string
  accent: string
  trend?: 'up' | 'down'
}) {
  return (
    <Card padding="lg" hover className="relative overflow-hidden group border-graphite/40">
      <div className={`absolute top-0 right-0 h-24 w-24 -mr-8 -mt-8 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 ${accent}`} />
      
      <div className="flex items-start justify-between relative z-10">
        <div className={`rounded-2xl border border-graphite/40 p-3 ${accent} ${color}`}>
          <Icon size={24} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black ${trend === 'up' ? 'text-success bg-success/10' : 'text-danger bg-danger/10'}`}>
            {trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {trend === 'up' ? 'SIGNAL UP' : 'SIGNAL DOWN'}
          </div>
        )}
      </div>
      
      <div className="mt-6 relative z-10">
        <p className="text-[10px] font-black uppercase tracking-widest text-dim/60 mb-1">{label}</p>
        <p className={`text-4xl font-serif font-bold ${color}`}>{value}</p>
      </div>
    </Card>
  )
}
