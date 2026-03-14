import { useState, useContext, useRef, useEffect, useCallback } from 'react'
import { TooltipCtx } from '../App'
import Tooltip from './Tooltip'
import { GLOSSARY } from '../tooltips'

const TYPE_COLOR = {
  DCA:    'text-col-blue',
  RECCE:  'text-col-amber',
  'AI/ST': 'text-col-red',
  QRA:    'text-col-green',
  AEW:    'text-text-lo',
}

const TYPE_BG = {
  DCA:    '#7c3aed',
  RECCE:  '#c9a227',
  'AI/ST': '#dc2626',
  QRA:    '#16a34a',
  AEW:    '#3d2050',
}

const OUTCOME_COLORS = {
  success: '#16a34a',
  failure: '#dc2626',
  aborted: '#3d2050',
}


function pad(n) {
  return String(n).padStart(2, '0')
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-surface border border-col-amber/50 rounded-lg p-5 max-w-sm w-full mx-4 space-y-4 shadow-xl">
        <div className="flex items-start gap-3">
          <span className="text-col-amber text-lg flex-shrink-0">⚠</span>
          <p className="text-sm text-text-hi leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-xs border border-border text-text-lo hover:text-text-hi rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 text-xs bg-col-amber text-black font-bold rounded hover:bg-col-amber/80 transition-colors"
          >
            Assign Anyway
          </button>
        </div>
      </div>
    </div>
  )
}

function MissionRow({ mission, selected, onClick, state }) {
  const assigned = mission.assigned_aircraft ?? []
  const tooltipsEnabled = useContext(TooltipCtx)
  const needed   = mission.required_aircraft - assigned.length
  const full     = needed <= 0
  const allAc    = state?.aircraft ?? []

  // Count ready aircraft with matching config (for planning visibility)
  const matchingReady = !mission.outcome
    ? allAc.filter(a => a.status === 'green' && a.configuration === mission.required_config).length
    : 0

  // Status badge label + color
  const outcomeBadge = mission.outcome
    ? { success: '✓ COMPLETE', failure: '✗ FAILED', aborted: '↩ ABORTED' }[mission.outcome] ?? mission.outcome.toUpperCase()
    : full ? '✓ ASSIGNED' : `⚠ NEED ${needed}`
  const outcomeBadgeColor = mission.outcome
    ? mission.outcome === 'success'
      ? 'text-col-green bg-col-green/10'
      : mission.outcome === 'failure'
        ? 'text-col-red bg-col-red/10'
        : 'text-text-dim bg-raised'
    : full ? 'text-col-green bg-col-green/10' : 'text-col-amber bg-col-amber/10'

  return (
    <div
      onClick={onClick}
      className={`bg-surface border rounded p-3 space-y-2 cursor-pointer transition-colors hover:border-col-blue/50
        ${selected ? 'border-col-blue' : full || mission.outcome ? 'border-border' : 'border-col-amber/50'}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-text-hi text-sm">{mission.id}</span>
          <Tooltip text={GLOSSARY[mission.type]} enabled={tooltipsEnabled}>
            <span className={`text-xs font-bold tracking-wider ${TYPE_COLOR[mission.type] ?? 'text-text-lo'}`}>{mission.type}</span>
          </Tooltip>
        </div>
        <div className={`text-xs font-semibold px-1.5 py-0.5 rounded ${outcomeBadgeColor}`}>
          {outcomeBadge}
        </div>
      </div>

      {mission.description && (
        <div className="text-xs text-text-dim">{mission.description}</div>
      )}

      <div className="flex items-center gap-4 text-xs">
        <span className="text-text-lo">
          Dep <span className="text-text-hi font-semibold">{pad(mission.departure_hour)}:00</span>
        </span>
        <span className="text-text-dim">→</span>
        <span className="text-text-lo">
          Ret <span className="text-text-hi font-semibold">{pad(mission.return_hour)}:00</span>
        </span>
        <Tooltip text={GLOSSARY[mission.required_config]} enabled={tooltipsEnabled}>
          <span className="ml-auto text-text-dim">{mission.required_config}</span>
        </Tooltip>
      </div>

      {/* Config-matching aircraft count — only for pending missions */}
      {!mission.outcome && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-text-dim">Ready with config:</span>
          <span className={`font-semibold ${matchingReady >= mission.required_aircraft ? 'text-col-green' : matchingReady > 0 ? 'text-col-amber' : 'text-col-red'}`}>
            {matchingReady} / {mission.required_aircraft}
          </span>
        </div>
      )}

      {/* Outcome result banner */}
      {mission.outcome && (
        <div className={`text-xs font-bold px-2 py-1 rounded text-center border
          ${mission.outcome === 'success'
            ? 'bg-col-green/10 text-col-green border-col-green/30'
            : mission.outcome === 'failure'
              ? 'bg-col-red/10 text-col-red border-col-red/30'
              : 'bg-raised text-text-dim border-border'}`}>
          {mission.outcome === 'success' ? '✓ Mission Success'
            : mission.outcome === 'failure' ? '✗ Mission Failed'
            : '↩ Aborted — RTB ordered'}
        </div>
      )}

      {assigned.length > 0 && !mission.outcome && (
        <div className="flex flex-wrap gap-1">
          {assigned.map(id => (
            <span key={id} className="px-1.5 py-0.5 bg-col-blue/10 border border-col-blue/30 text-col-blue text-xs rounded">
              {id}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MissionsPanel({ state, onAssign }) {
  const missions = state?.ato?.missions ?? []
  const aircraft = state?.aircraft ?? []
  const tooltipsEnabled = useContext(TooltipCtx)

  const [selectedMission, setSelectedMission]   = useState('')
  const [selectedAircraft, setSelectedAircraft] = useState([])
  const [assigning, setAssigning]               = useState(false)
  const [error, setError]                       = useState(null)
  const [confirmModal, setConfirmModal]         = useState(null) // { message, onConfirm }
  const assignFormRef = useRef(null)

  useEffect(() => {
    if (selectedMission) {
      assignFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [selectedMission])

  const selectedMissionObj = missions.find(m => m.id === selectedMission)
  const currentHour = state?.current_hour ?? 0

  // Green aircraft + returning aircraft that will be back before this mission departs
  const greenAircraft = aircraft.filter(a => a.status === 'green')
  const returningAssignable = aircraft.filter(a =>
    a.status === 'returning' &&
    a.return_eta != null &&
    selectedMissionObj &&
    currentHour + a.return_eta < selectedMissionObj.departure_hour
  )
  const assignableAircraft = [...greenAircraft, ...returningAssignable]

  const doAssign = useCallback(async () => {
    setAssigning(true)
    setError(null)
    try {
      await onAssign(selectedMission, selectedAircraft)
      setSelectedAircraft([])
      setSelectedMission('')
    } catch (e) {
      setError(e.message)
    } finally {
      setAssigning(false)
    }
  }, [selectedMission, selectedAircraft, onAssign])

  const handleAssign = () => {
    if (!selectedMission || selectedAircraft.length === 0) return
    if (hasMismatch) {
      setConfirmModal({
        message: `Config mismatch: not all selected aircraft match the required config "${selectedMissionObj.required_config}". They will fly with a −15% success penalty. Proceed anyway?`,
        onConfirm: () => { setConfirmModal(null); doAssign() },
      })
      return
    }
    doAssign()
  }

  const toggleAircraft = (id) => {
    setSelectedAircraft(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const hasMismatch = selectedAircraft.some(id => {
    const ac = assignableAircraft.find(a => a.id === id)
    return ac && selectedMissionObj && ac.configuration !== selectedMissionObj.required_config
  })

  return (
    <div className="space-y-4">
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {/* ATO Coverage summary */}
      {(() => {
        const total    = missions.length
        const covered  = missions.filter(m => (m.assigned_aircraft ?? []).length >= m.required_aircraft || m.outcome).length
        const partial  = missions.filter(m => !m.outcome && (m.assigned_aircraft ?? []).length > 0 && (m.assigned_aircraft ?? []).length < m.required_aircraft).length
        const missing  = missions.filter(m => !m.outcome && (m.assigned_aircraft ?? []).length === 0).length
        const allGood  = covered === total
        return (
          <div className={`border rounded p-3 flex items-center gap-4 ${allGood ? 'bg-col-green/5 border-col-green/30' : 'bg-col-amber/5 border-col-amber/30'}`}>
            <div className="flex-1">
              <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${allGood ? 'text-col-green' : 'text-col-amber'}`}>
                <Tooltip text={GLOSSARY['ATO']} enabled={tooltipsEnabled}>
                  <span>ATO Coverage</span>
                </Tooltip>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="text-col-green">{covered} assigned/complete</span>
                {partial > 0 && <span className="text-col-amber">{partial} partial</span>}
                {missing > 0 && <span className="text-col-red">{missing} unassigned</span>}
              </div>
            </div>
            <div className="flex gap-1">
              {missions.map(m => {
                const assigned = m.assigned_aircraft ?? []
                const full = assigned.length >= m.required_aircraft
                const none = assigned.length === 0
                const color = m.outcome === 'success' ? 'bg-col-green'
                  : m.outcome === 'failure' ? 'bg-col-red'
                  : m.outcome === 'aborted' ? 'bg-raised border border-border'
                  : full ? 'bg-col-green' : none ? 'bg-col-red' : 'bg-col-amber'
                return (
                  <div key={m.id} className="flex flex-col items-center gap-0.5" title={`${m.id} ${m.type}: ${assigned.length}/${m.required_aircraft}${m.outcome ? ` — ${m.outcome}` : ''}`}>
                    <div className={`w-2 h-2 rounded-full ${color}`} />
                    <span className="text-[9px] text-text-dim">{m.id}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Gantt timeline */}
      <div className="bg-surface border border-border rounded p-3">
        <div className="text-xs text-text-dim uppercase tracking-wider mb-3">
          ATO Timeline — Day {state?.ato?.day} ({state?.ato?.phase})
        </div>

        {/* Hour ruler */}
        <div className="flex mb-1">
          <div className="w-20 flex-shrink-0" />
          <div className="flex-1 relative h-4">
            {[0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24].map(h => (
              <span
                key={h}
                className="absolute text-[10px] text-text-dim select-none"
                style={{ left: `${(h / 24) * 100}%`, transform: 'translateX(-50%)' }}
              >
                {pad(h)}
              </span>
            ))}
          </div>
        </div>

        {/* Mission bars — NO sort, order matches ATO order */}
        {missions.map(m => {
          const start      = (m.departure_hour / 24) * 100
          const duration   = m.return_hour > m.departure_hour
            ? m.return_hour - m.departure_hour
            : 24 - m.departure_hour + m.return_hour
          const width      = Math.max(1.5, (duration / 24) * 100)
          const assigned   = m.assigned_aircraft ?? []
          const full       = assigned.length >= m.required_aircraft
          const unassigned = assigned.length === 0
          const barColor   = m.outcome
            ? (OUTCOME_COLORS[m.outcome] ?? '#3d2050')
            : unassigned ? '#dc2626'
            : full ? (TYPE_BG[m.type] ?? '#3d2050')
            : '#c9a227'

          return (
            <div key={m.id} className="flex items-center mb-1">
              <div className="w-20 flex-shrink-0 text-xs flex items-center gap-1">
                <span className="text-text-dim">{m.id}</span>
                <span className={`font-bold text-[10px] ${TYPE_COLOR[m.type] ?? 'text-text-lo'}`}>{m.type}</span>
              </div>
              <div className="flex-1 h-5 bg-raised rounded relative overflow-hidden">
                {/* 2h gridlines — 6h marks slightly brighter */}
                {[2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22].map(h => (
                  <div key={h} className={`absolute top-0 bottom-0 w-px bg-border ${h % 6 === 0 ? 'opacity-60' : 'opacity-25'}`}
                    style={{ left: `${(h / 24) * 100}%` }} />
                ))}
                <div
                  onClick={() => { setSelectedMission(m.id); setSelectedAircraft([]) }}
                  className="absolute h-full rounded flex items-center px-1.5 text-[10px] font-semibold text-white overflow-hidden whitespace-nowrap cursor-pointer hover:brightness-125 transition-[filter]"
                  style={{
                    left: `${start}%`,
                    width: `${width}%`,
                    backgroundColor: barColor,
                    opacity: 0.9,
                    outline: selectedMission === m.id ? '2px solid #58a6ff' : 'none',
                    outlineOffset: '1px',
                  }}
                >
                  {m.outcome
                    ? ({ success: '✓', failure: '✗', aborted: '↩' }[m.outcome] ?? '?')
                    : unassigned
                      ? (width >= 6 ? 'Unassigned' : '—')
                      : assigned.join('+')}
                </div>
              </div>
            </div>
          )
        })}

        {/* Current time marker */}
        {state && (
          <div className="flex items-center mt-0.5">
            <div className="w-20 flex-shrink-0 text-[10px] text-col-amber font-semibold">
              {pad(state.current_hour)}:00
            </div>
            <div className="flex-1 h-4 relative">
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-col-amber opacity-90"
                style={{ left: `${(state.current_hour / 24) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Mission cards — NO sort, ATO order */}
      <div className="grid grid-cols-2 gap-2">
        {missions.map(m => (
          <MissionRow
            key={m.id}
            mission={m}
            selected={selectedMission === m.id}
            onClick={() => { setSelectedMission(m.id); setSelectedAircraft([]) }}
            state={state}
          />
        ))}
      </div>

      {/* Assign form */}
      <div ref={assignFormRef} className="bg-surface border border-border rounded p-3 space-y-3">
        <div className="text-xs text-text-dim uppercase tracking-wider">Assign Aircraft to Mission</div>

        <div>
          <label className="text-xs text-text-lo mb-1 block">Mission</label>
          <select
            value={selectedMission}
            onChange={e => { setSelectedMission(e.target.value); setSelectedAircraft([]) }}
            className="w-full bg-raised border border-border rounded px-2 py-1.5 text-sm text-text-hi focus:outline-none focus:border-col-blue"
          >
            <option value="">— select mission —</option>
            {missions.filter(m => !m.outcome).map(m => (
              <option key={m.id} value={m.id}>
                {m.id} | {m.type} | {pad(m.departure_hour)}:00 — {m.required_config}
              </option>
            ))}
          </select>
        </div>

        {selectedMissionObj && (
          <div className="text-xs text-text-dim bg-raised border border-border rounded px-2 py-1.5">
            Requires config: <span className="text-col-amber font-semibold">{selectedMissionObj.required_config}</span>
            {' · '}needs <span className="text-text-hi font-semibold">{selectedMissionObj.required_aircraft}</span> aircraft
          </div>
        )}

        <div>
          <label className="text-xs text-text-lo mb-1 block">Aircraft (ready or returning in time)</label>
          <div className="flex flex-wrap gap-1.5">
            {assignableAircraft.length === 0 && (
              <span className="text-xs text-text-dim">No available aircraft</span>
            )}
            {assignableAircraft.map(ac => {
              const mismatch    = selectedMissionObj && ac.configuration !== selectedMissionObj.required_config
              const selected    = selectedAircraft.includes(ac.id)
              const isReturning = ac.status === 'returning'
              return (
                <button
                  key={ac.id}
                  onClick={() => toggleAircraft(ac.id)}
                  title={mismatch
                    ? `Config mismatch: ${ac.configuration} ≠ ${selectedMissionObj.required_config}`
                    : isReturning ? `Returning in ${ac.return_eta}h — will be ready before departure` : ac.configuration}
                  className={`px-2 py-0.5 rounded text-xs font-semibold border transition-colors
                    ${selected
                      ? 'bg-col-blue/20 border-col-blue text-col-blue'
                      : mismatch
                        ? 'bg-raised border-col-amber/40 text-col-amber hover:border-col-amber'
                        : isReturning
                          ? 'bg-raised border-col-cyan/40 text-col-cyan hover:border-col-cyan'
                          : 'bg-raised border-border text-text-lo hover:border-col-blue/50 hover:text-text-hi'
                    }`}
                >
                  {ac.id}
                  {isReturning
                    ? <span className="ml-1 opacity-70">RTB+{ac.return_eta}h</span>
                    : <span className="ml-1 opacity-60">{ac.configuration}</span>
                  }
                  {mismatch && <span className="ml-1">⚠</span>}
                </button>
              )
            })}
          </div>
        </div>

        {hasMismatch && (
          <div className="text-xs text-col-amber bg-col-amber/10 border border-col-amber/30 rounded px-2 py-1.5">
            ⚠ Selected aircraft have mismatched configs — reconfiguration required before departure.
          </div>
        )}

        {error && (
          <div className="text-xs text-col-red bg-col-red/10 border border-col-red/30 rounded px-2 py-1">
            {error}
          </div>
        )}

        <button
          onClick={handleAssign}
          disabled={!selectedMission || selectedAircraft.length === 0 || assigning}
          className="w-full py-1.5 bg-col-blue text-white text-xs font-bold tracking-wider uppercase rounded
            hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {assigning
            ? 'Assigning...'
            : selectedAircraft.length > 0
              ? `Assign ${selectedAircraft.join(', ')}`
              : 'Assign'}
        </button>
      </div>
    </div>
  )
}
