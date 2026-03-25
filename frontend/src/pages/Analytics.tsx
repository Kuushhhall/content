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
  TrendingUp,
  CheckCircle2,
  XCircle,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'

import { Card } from '../components/Card'
import { EmptyState } from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { PlatformIcon, getPlatformLabel } from '../components/PlatformIcon'
import { api } from '../lib/api'
import type { AnalyticsOverview, PublishResult } from '../types'

const PIE_COLORS = ['#b9893b', '#60a5fa', '#f87171', '#a78bfa', '#34d399']

const tooltipStyle = {
  background: '#141a2e',
  border: '1px solid #2a3457',
  borderRadius: '12px',
  fontSize: '12px',
  padding: '8px 12px',
}

export function Analytics() {
  const { data: analytics, isLoading: loadingAnalytics } = useQuery<AnalyticsOverview>({
    queryKey: ['analytics'],
    queryFn: api.analyticsOverview,
  })

  const { data: publishResults } = useQuery<PublishResult[]>({
    queryKey: ['publishResults'],
    queryFn: api.listPublishResults,
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
      <div className="flex items-center justify-center py-20">
        <Spinner size={24} label="Loading analytics..." />
      </div>
    )
  }

  if (!analytics || analytics.total_posts === 0) {
    return (
      <Card>
        <EmptyState
          icon={BarChart3}
          title="No analytics yet"
          description="Publish some content and analytics will appear here. Start by generating and publishing a draft."
        />
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          icon={Activity}
          label="Total Posts"
          value={analytics.total_posts}
          color="text-cream"
        />
        <MetricCard
          icon={TrendingUp}
          label="Success Rate"
          value={`${successPct}%`}
          color={successPct >= 80 ? 'text-success' : successPct >= 50 ? 'text-amber' : 'text-danger'}
          trend={successPct >= 80 ? 'up' : 'down'}
        />
        <MetricCard
          icon={CheckCircle2}
          label="Successful"
          value={analytics.success_posts}
          color="text-success"
        />
        <MetricCard
          icon={XCircle}
          label="Failed"
          value={analytics.failed_posts}
          color="text-danger"
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Bar chart */}
        <Card>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-dim">
            Posts by Platform
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2642" vertical={false} />
                <XAxis
                  dataKey="platform"
                  stroke="#6b7599"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="#6b7599"
                  tick={{ fontSize: 11 }}
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(185,137,59,0.05)' }} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {chartData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Pie chart */}
        <Card>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-dim">
            Platform Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="count"
                  nameKey="platform"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  stroke="none"
                >
                  {chartData.map((_, idx) => (
                    <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Legend */}
          <div className="mt-3 flex flex-wrap justify-center gap-3">
            {chartData.map((item, idx) => (
              <div key={item.platform} className="flex items-center gap-1.5 text-xs text-muted">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }}
                />
                <PlatformIcon platform={item.platformKey} size={12} />
                <span>{item.platform}</span>
                <span className="font-semibold text-cream">({item.count})</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent publish results */}
      {publishResults && publishResults.length > 0 && (
        <Card>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-dim">
            Recent Publish Results
          </h3>
          <div className="max-h-[300px] overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stroke/30 text-left text-xs uppercase tracking-wider text-muted-dim">
                  <th className="pb-3 pr-4">Platform</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3 pr-4">External ID</th>
                  <th className="pb-3 pr-4">Time</th>
                  <th className="pb-3">Message</th>
                </tr>
              </thead>
              <tbody>
                {publishResults.slice(0, 20).map((r, i) => (
                  <tr key={i} className="border-b border-stroke/15 last:border-0">
                    <td className="py-2.5 pr-4">
                      <PlatformIcon platform={r.platform} size={14} showLabel />
                    </td>
                    <td className="py-2.5 pr-4">
                      {r.success ? (
                        <span className="flex items-center gap-1 text-success">
                          <CheckCircle2 size={14} /> Success
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-danger">
                          <XCircle size={14} /> Failed
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 font-mono text-xs text-muted">
                      {r.external_id ? r.external_id.slice(0, 20) + '...' : '—'}
                    </td>
                    <td className="py-2.5 pr-4 text-xs text-muted">
                      {new Date(r.at).toLocaleString()}
                    </td>
                    <td className="py-2.5 text-xs text-muted">
                      {r.message ?? '—'}
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
  trend,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  color: string
  trend?: 'up' | 'down'
}) {
  return (
    <Card padding="md" hover>
      <div className="flex items-start justify-between">
        <div className="rounded-xl border border-stroke/30 bg-ink/40 p-2.5">
          <Icon size={18} className={color} />
        </div>
        {trend && (
          <span className={trend === 'up' ? 'text-success' : 'text-danger'}>
            {trend === 'up' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          </span>
        )}
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wider text-muted-dim">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
    </Card>
  )
}
