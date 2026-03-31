import { CheckCircle2, Loader, XCircle, SkipForward, Circle } from 'lucide-react'
import type { PipelineRun, PipelineStep } from '../types'

export function PipelineMonitor({ run }: { run: PipelineRun }) {
  const getStepIcon = (step: PipelineStep) => {
    switch (step.status) {
      case 'running':
        return <Loader className="h-5 w-5 animate-spin text-volt" />
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-success" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-error" />
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-warning" />
      case 'skipped':
        return <SkipForward className="h-5 w-5 text-muted" />
      default:
        return <Circle className="h-5 w-5 text-muted" />
    }
  }

  const formatDuration = (startTime: string, endTime: string) => {
    const ms = new Date(endTime).getTime() - new Date(startTime).getTime()
    if (ms < 1000) return `${Math.round(ms)}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  const getDurationForStep = (step: PipelineStep, nextStep?: PipelineStep) => {
    if (step.duration) return `${step.duration}ms`
    if (nextStep && step.status === 'completed') {
      return formatDuration(step.at, nextStep.at)
    }
    if (step.status === 'running') {
      return formatDuration(step.at, new Date().toISOString())
    }
    return undefined
  }

  return (
    <div className="space-y-3">
      {run.steps.map((step, idx) => {
        const nextStep = run.steps[idx + 1]
        const duration = getDurationForStep(step, nextStep)

        return (
          <div key={idx} className="flex gap-4 rounded-lg border border-graphite/20 bg-bg-secondary/50 p-4 backdrop-blur-sm">
            <div className="flex-shrink-0 pt-1">
              {getStepIcon(step)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-medium capitalize text-text-primary">{step.step}</span>
                {duration && <span className="text-xs text-muted">{duration}</span>}
              </div>
              {step.count !== undefined && (
                <p className="text-sm text-muted">{step.count} {step.count === 1 ? 'item' : 'items'} processed</p>
              )}
              {step.selected && step.selected.length > 0 && (
                <p className="text-sm text-muted">{step.selected.length} article(s) selected</p>
              )}
              {step.error && (
                <p className="text-sm text-error mt-2">Error: {step.error}</p>
              )}
              {step.reason && (
                <p className="text-sm text-muted italic">{step.reason}</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
