import { useContext } from 'react'
import { TooltipCtx } from '../App'
import Tooltip from './Tooltip'

export default function ControlBar({
  onAction, loading,
  autoplay, onToggleAutoplay,
  autoplaySpeedIdx, onCycleSpeed, autoplaySpeeds = [],
}) {
  const tooltipsEnabled = useContext(TooltipCtx)
  const handleReset = () => {
    if (window.confirm('Reset all state to initial? This cannot be undone.')) {
      onAction('/api/action/reset')
    }
  }

  const speedEntry = autoplaySpeeds[autoplaySpeedIdx] ?? { label: '×1 Slow', tip: '' }

  return (
    <div className="flex flex-wrap items-center gap-2">

      {/* Autoplay controls */}
      <button
        onClick={onToggleAutoplay}
        disabled={loading}
        className={`px-2.5 py-1 rounded text-xs font-semibold border transition-colors disabled:opacity-40
          ${autoplay
            ? 'border-col-amber/60 text-col-amber hover:bg-col-amber/10'
            : 'border-col-green/60 text-col-green hover:bg-col-green/10'}`}
      >
        {autoplay ? '⏸ Pause' : '▶ Play'}
      </button>

      <Tooltip text={speedEntry.tip} enabled={tooltipsEnabled}>
        <button
          onClick={onCycleSpeed}
          className="px-2.5 py-1 rounded text-xs border border-border text-text-lo hover:text-text-hi transition-colors"
        >
          {speedEntry.label}
        </button>
      </Tooltip>

      {loading && (
        <span className="text-xs text-text-dim animate-pulse">Processing...</span>
      )}

      {/* Reset — right-aligned, guarded by confirm */}
      <div className="ml-auto">
        <button
          onClick={handleReset}
          disabled={loading}
          className="px-3 py-1 border border-border text-text-dim hover:text-col-red hover:border-col-red/50
            rounded text-xs font-semibold transition-colors disabled:opacity-40"
        >
          Reset
        </button>
      </div>
    </div>
  )
}
