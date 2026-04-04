import { useQuery } from '@tanstack/react-query'
import { IndianRupee } from 'lucide-react'
import { api } from '../lib/api'
import { useUIStore } from '../store/uiStore'
import type { CostRecord } from '../types'

function fmt(n: number, decimals = 4) {
  return n.toFixed(decimals)
}

function fmtInr(inr: number) {
  if (inr < 0.01) return `₹${(inr * 100).toFixed(4)}p`
  return `₹${inr.toFixed(4)}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
}

function SummaryCard({ label, value, sub, isDarkMode }: { label: string; value: string; sub?: string; isDarkMode: boolean }) {
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-1 ${isDarkMode ? 'border-graphite/40 bg-graphite/10' : 'border-graphite/20 bg-white shadow-sm'}`}>
      <p className="text-xs font-bold text-dim uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-bold text-volt">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  )
}

export default function CostTracker() {
  const isDarkMode = useUIStore((s) => s.isDarkMode)

  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ['cost-summary'],
    queryFn: api.getCostSummary,
    refetchInterval: 30_000,
  })

  const { data: recordsData, isLoading: recLoading } = useQuery({
    queryKey: ['cost-records'],
    queryFn: () => api.getCostRecords(200),
    refetchInterval: 30_000,
  })

  const records = recordsData?.items ?? []
  const isLoading = sumLoading || recLoading

  // Group records by pipeline_run_id
  const byPipeline: Record<string, CostRecord[]> = {}
  for (const r of [...records].reverse()) {
    if (!byPipeline[r.pipeline_run_id]) byPipeline[r.pipeline_run_id] = []
    byPipeline[r.pipeline_run_id].push(r)
  }

  const tableHeader = `text-[10px] font-black uppercase tracking-widest text-dim px-4 py-2 text-left`
  const tableCell = `px-4 py-2 text-sm`
  const rowBorder = `border-t ${isDarkMode ? 'border-graphite/40' : 'border-graphite/20'}`

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <IndianRupee size={24} className="text-volt" />
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-silver' : 'text-ink'}`}>API Cost Tracker</h1>
        </div>
        <p className="text-sm text-muted">All pipeline API costs tracked in real time.</p>
      </div>

      {/* Summary cards */}
      {isLoading ? (
        <div className="text-muted text-sm">Loading...</div>
      ) : summary ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            label="Total Spend (INR)"
            value={`₹${fmt(summary.total_inr, 4)}`}
            sub={`$${fmt(summary.total_usd, 6)} USD`}
            isDarkMode={isDarkMode}
          />
          <SummaryCard
            label="Total API Calls"
            value={String(summary.total_calls)}
            isDarkMode={isDarkMode}
          />
          {Object.entries(summary.by_api).map(([name, s]) => (
            <SummaryCard
              key={name}
              label={name.toUpperCase()}
              value={`₹${fmt(s.cost_inr, 4)}`}
              sub={`${s.calls} calls`}
              isDarkMode={isDarkMode}
            />
          ))}
        </div>
      ) : null}

      {/* By model breakdown */}
      {summary && Object.keys(summary.by_model).length > 0 && (
        <div>
          <h2 className={`text-base font-bold mb-3 ${isDarkMode ? 'text-silver' : 'text-ink'}`}>Cost by Model</h2>
          <div className={`rounded-xl border overflow-hidden ${isDarkMode ? 'border-graphite/40' : 'border-graphite/20'}`}>
            <table className="w-full text-sm">
              <thead className={isDarkMode ? 'bg-graphite/20' : 'bg-stellar/30'}>
                <tr>
                  <th className={tableHeader}>Model</th>
                  <th className={`${tableHeader} text-right`}>Calls</th>
                  <th className={`${tableHeader} text-right`}>Cost (INR)</th>
                  <th className={`${tableHeader} text-right`}>Cost (USD)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary.by_model).map(([model, s]) => (
                  <tr key={model} className={rowBorder}>
                    <td className={`${tableCell} font-mono text-xs ${isDarkMode ? 'text-silver' : 'text-ink'}`}>{model}</td>
                    <td className={`${tableCell} text-right text-muted`}>{s.calls}</td>
                    <td className={`${tableCell} text-right text-volt font-semibold`}>{fmtInr(s.cost_inr)}</td>
                    <td className={`${tableCell} text-right text-muted`}>${fmt(s.cost_usd, 6)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Per-pipeline breakdown */}
      {Object.keys(byPipeline).length > 0 && (
        <div>
          <h2 className={`text-base font-bold mb-3 ${isDarkMode ? 'text-silver' : 'text-ink'}`}>Per Pipeline Run</h2>
          <div className="space-y-3">
            {Object.entries(byPipeline).map(([runId, recs]) => {
              const totalInr = recs.reduce((s, r) => s + r.cost_inr, 0)
              const totalTokens = recs.reduce((s, r) => s + r.total_tokens, 0)
              const firstAt = recs[recs.length - 1]?.at
              return (
                <div key={runId} className={`rounded-xl border ${isDarkMode ? 'border-graphite/40 bg-graphite/10' : 'border-graphite/20 bg-white shadow-sm'}`}>
                  <div className={`flex items-center justify-between px-4 py-3 border-b ${isDarkMode ? 'border-graphite/40' : 'border-graphite/20'}`}>
                    <div>
                      <span className="font-mono text-xs text-dim">{runId}</span>
                      {firstAt && <span className="ml-3 text-xs text-muted">{fmtDate(firstAt)}</span>}
                    </div>
                    <div className="text-right">
                      <span className="text-volt font-semibold">{fmtInr(totalInr)}</span>
                      <span className="ml-3 text-xs text-muted">{totalTokens.toLocaleString()} tokens</span>
                    </div>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <th className={tableHeader}>Step</th>
                        <th className={tableHeader}>API</th>
                        <th className={`${tableHeader} text-right`}>Tokens</th>
                        <th className={`${tableHeader} text-right`}>Cost (INR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recs.map((r) => (
                        <tr key={r.id} className={rowBorder}>
                          <td className={`${tableCell} ${isDarkMode ? 'text-silver' : 'text-ink'}`}>{r.call_type}</td>
                          <td className={`${tableCell} text-muted`}>{r.api} / {r.model}</td>
                          <td className={`${tableCell} text-right text-muted`}>{r.total_tokens.toLocaleString()}</td>
                          <td className={`${tableCell} text-right text-volt font-semibold`}>{fmtInr(r.cost_inr)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Full records table */}
      {records.length > 0 && (
        <div>
          <h2 className={`text-base font-bold mb-3 ${isDarkMode ? 'text-silver' : 'text-ink'}`}>All API Calls</h2>
          <div className={`rounded-xl border overflow-x-auto ${isDarkMode ? 'border-graphite/40' : 'border-graphite/20'}`}>
            <table className="w-full text-xs">
              <thead className={isDarkMode ? 'bg-graphite/20' : 'bg-stellar/30'}>
                <tr>
                  <th className={tableHeader}>Time</th>
                  <th className={tableHeader}>API</th>
                  <th className={tableHeader}>Model</th>
                  <th className={tableHeader}>Step</th>
                  <th className={`${tableHeader} text-right`}>In Tokens</th>
                  <th className={`${tableHeader} text-right`}>Out Tokens</th>
                  <th className={`${tableHeader} text-right`}>Cost (INR)</th>
                </tr>
              </thead>
              <tbody>
                {[...records].reverse().map((r) => (
                  <tr key={r.id} className={`${rowBorder} ${isDarkMode ? 'hover:bg-graphite/10' : 'hover:bg-stellar/20'}`}>
                    <td className={`${tableCell} text-muted`}>{fmtDate(r.at)}</td>
                    <td className={`${tableCell} ${isDarkMode ? 'text-silver' : 'text-ink'}`}>{r.api}</td>
                    <td className={`${tableCell} font-mono ${isDarkMode ? 'text-silver' : 'text-ink'}`}>{r.model}</td>
                    <td className={`${tableCell} ${isDarkMode ? 'text-silver' : 'text-ink'}`}>{r.call_type}</td>
                    <td className={`${tableCell} text-right text-muted`}>{r.prompt_tokens.toLocaleString()}</td>
                    <td className={`${tableCell} text-right text-muted`}>{r.completion_tokens.toLocaleString()}</td>
                    <td className={`${tableCell} text-right text-volt font-semibold`}>{fmtInr(r.cost_inr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {records.length === 0 && !isLoading && (
        <div className="text-center text-muted py-16">
          No cost records yet. Run a pipeline to see costs here.
        </div>
      )}
    </div>
  )
}
