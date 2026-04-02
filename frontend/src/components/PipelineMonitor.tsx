import { CheckCircle2, Loader, XCircle, Circle } from 'lucide-react'
import type { PipelineRun } from '../types'

export function PipelineMonitor({ run }: { run: PipelineRun }) {
  const getStepIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader className="h-5 w-5 animate-spin text-volt" />
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-success" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-error" />
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-warning" />
      default:
        return <Circle className="h-5 w-5 text-muted" />
    }
  }

  return (
    <div className="space-y-3">
      {run.steps.map((step, idx) => (
        <div key={idx} className="flex gap-4 rounded-lg border border-graphite/20 bg-bg-secondary/50 p-4 backdrop-blur-sm">
          <div className="flex-shrink-0 pt-1">
            {getStepIcon(step.status)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-medium capitalize text-text-primary">{step.step}</span>
              <span className="text-xs text-muted">{step.status}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
