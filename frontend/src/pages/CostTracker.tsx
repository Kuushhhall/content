import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { CostRecord } from '../types'

function fmt(n: number, decimals = 4) {
  return n.toFixed(decimals)
}

function fmtInr(inr: number) {
  if (inr < 0.01) return `₹${(inr * 100).toFixed(4)}p` // paise
  return `₹${inr.toFixed(4)}`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col gap-1">
      <p className="text-xs text-muted uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-volt">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  )
}

export default function CostTracker() {
  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ['cost-summary'],
    queryFn: api.getCostSummary,
    refetchInterval: 30_000,
  })

  const { data: records = [], isLoading: recLoading } = useQuery({
    queryKey: ['cost-records'],
    queryFn: () => api.getCostRecords(200),
    refetchInterval: 30_000,
  })

  const isLoading = sumLoading || recLoading

  // Group records by pipeline_run_id for per-pipeline breakdown
  const byPipeline: Record<string, CostRecord[]> = {}
  for (const r of [...records].reverse()) {
    if (!byPipeline[r.pipeline_run_id]) byPipeline[r.pipeline_run_id] = []
    byPipeline[r.pipeline_run_id].push(r)
  }

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">API Cost Tracker</h1>
        <p className="text-sm text-muted mt-1">All pipeline API costs tracked in real time.</p>
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
          />
          <SummaryCard
            label="Total API Calls"
            value={String(summary.total_calls)}
          />
          {Object.entries(summary.by_api).map(([name, s]) => (
            <SummaryCard
              key={name}
              label={name.toUpperCase()}
              value={`₹${fmt(s.cost_inr, 4)}`}
              sub={`${s.calls} calls`}
            />
          ))}
        </div>
      ) : null}

      {/* By model breakdown */}
      {summary && Object.keys(summary.by_model).length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Cost by Model</h2>
          <div className="rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-muted uppercase text-xs">
                <tr>
                  <th className="px-4 py-2 text-left">Model</th>
                  <th className="px-4 py-2 text-right">Calls</th>
                  <th className="px-4 py-2 text-right">Cost (INR)</th>
                  <th className="px-4 py-2 text-right">Cost (USD)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(summary.by_model).map(([model, s]) => (
                  <tr key={model} className="border-t border-white/5">
                    <td className="px-4 py-2 font-mono text-xs">{model}</td>
                    <td className="px-4 py-2 text-right">{s.calls}</td>
                    <td className="px-4 py-2 text-right text-volt">{fmtInr(s.cost_inr)}</td>
                    <td className="px-4 py-2 text-right text-muted">${fmt(s.cost_usd, 6)}</td>
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
          <h2 className="text-lg font-semibold mb-3">Per Pipeline Run</h2>
          <div className="space-y-3">
            {Object.entries(byPipeline).map(([runId, recs]) => {
              const totalInr = recs.reduce((s, r) => s + r.cost_inr, 0)
              const totalTokens = recs.reduce((s, r) => s + r.total_tokens, 0)
              const firstAt = recs[recs.length - 1]?.at
              return (
                <div key={runId} className="rounded-xl border border-white/10 bg-white/5">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <div>
                      <span className="font-mono text-xs text-muted">{runId}</span>
                      {firstAt && <span className="ml-3 text-xs text-muted">{fmtDate(firstAt)}</span>}
                    </div>
                    <div className="text-right">
                      <span className="text-volt font-semibold">{fmtInr(totalInr)}</span>
                      <span className="ml-3 text-xs text-muted">{totalTokens.toLocaleString()} tokens</span>
                    </div>
                  </div>
                  <table className="w-full text-xs">
                    <thead className="text-muted uppercase">
                      <tr>
                        <th className="px-4 py-1 text-left">Step</th>
                        <th className="px-4 py-1 text-left">API</th>
                        <th className="px-4 py-1 text-right">Tokens</th>
                        <th className="px-4 py-1 text-right">Cost (INR)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recs.map((r) => (
                        <tr key={r.id} className="border-t border-white/5">
                          <td className="px-4 py-1">{r.call_type}</td>
                          <td className="px-4 py-1 text-muted">{r.api} / {r.model}</td>
                          <td className="px-4 py-1 text-right">{r.total_tokens.toLocaleString()}</td>
                          <td className="px-4 py-1 text-right text-volt">{fmtInr(r.cost_inr)}</td>
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
          <h2 className="text-lg font-semibold mb-3">All API Calls</h2>
          <div className="rounded-xl border border-white/10 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-white/5 text-muted uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Time</th>
                  <th className="px-3 py-2 text-left">API</th>
                  <th className="px-3 py-2 text-left">Model</th>
                  <th className="px-3 py-2 text-left">Step</th>
                  <th className="px-3 py-2 text-right">In Tokens</th>
                  <th className="px-3 py-2 text-right">Out Tokens</th>
                  <th className="px-3 py-2 text-right">Cost (INR)</th>
                </tr>
              </thead>
              <tbody>
                {[...records].reverse().map((r) => (
                  <tr key={r.id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="px-3 py-1 text-muted">{fmtDate(r.at)}</td>
                    <td className="px-3 py-1">{r.api}</td>
                    <td className="px-3 py-1 font-mono">{r.model}</td>
                    <td className="px-3 py-1">{r.call_type}</td>
                    <td className="px-3 py-1 text-right">{r.prompt_tokens.toLocaleString()}</td>
                    <td className="px-3 py-1 text-right">{r.completion_tokens.toLocaleString()}</td>
                    <td className="px-3 py-1 text-right text-volt font-semibold">{fmtInr(r.cost_inr)}</td>
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
