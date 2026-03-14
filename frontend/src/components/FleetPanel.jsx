import { useContext, useState } from 'react'
import { TooltipCtx } from '../App'
import Tooltip from './Tooltip'
import { GLOSSARY } from '../tooltips'

const STATUS_CONFIG = {
  green:       { label: 'READY',      color: 'text-col-green',  dot: 'bg-col-green',  border: 'border-col-green/30'  },
  red:         { label: 'MAINT',      color: 'text-col-red',    dot: 'bg-col-red',    border: 'border-col-red/30'    },
  grey:        { label: 'GREY',       color: 'text-text-dim',   dot: 'bg-text-dim',   border: 'border-border'         },
  on_mission:  { label: 'AIRBORNE',   color: 'text-col-blue',   dot: 'bg-col-blue',   border: 'border-col-blue/30'   },
  returning:   { label: 'RETURNING',  color: 'text-col-cyan',   dot: 'bg-col-cyan',   border: 'border-col-cyan/30'   },
  written_off: { label: 'WRITTEN OFF',color: 'text-text-dim',   dot: 'bg-col-red',    border: 'border-col-red/20'    },
}

// Top-down pixel-art Gripen — grey only, traced from reference image
function JetIcon() {
  const s = 1
  const T = null
  const A = '#1e1e2c'  // darkest — cockpit glass, engine interior
  const B = '#3e3e56'  // dark — engine pods, shadow panels
  const C = '#606078'  // mid — main body
  const D = '#848498'  // light — surface highlights, leading edges
  const W = '#d0d8ec'  // near-white — cockpit highlight, exhaust glow

  // 18 wide × 20 tall
  const grid = [
    [T, T, T, T, T, T, T, T, C, C, T, T, T, T, T, T, T, T],  // nose tip
    [T, T, T, T, T, T, T, C, C, C, C, T, T, T, T, T, T, T],  // nose
    [T, T, T, T, T, T, C, C, A, A, C, C, T, T, T, T, T, T],  // canopy dark
    [T, T, T, T, T, T, C, C, A, A, C, C, T, T, T, T, T, T],  // canopy dark
    [T, T, T, T, T, C, C, C, W, W, C, C, C, T, T, T, T, T],  // canopy white
    [T, T, T, T, T, C, C, C, B, B, C, C, C, T, T, T, T, T],  // canopy base
    [T, T, T, T, C, C, C, C, C, C, C, C, C, C, T, T, T, T],  // body widens
    [T, T, T, C, C, D, C, C, C, C, C, C, D, C, C, T, T, T],  // wing leading
    [T, T, C, C, D, D, C, C, C, C, C, C, D, D, C, C, T, T],  // wings grow
    [T, C, C, D, D, C, C, C, C, C, C, C, C, D, D, C, C, T],
    [C, C, D, D, C, C, C, C, C, C, C, C, C, C, D, D, C, C],  // max span
    [C, C, D, C, C, C, C, C, C, C, C, C, C, C, C, D, C, C],
    [T, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, C, T],  // wings taper
    [T, T, C, C, C, C, C, C, C, C, C, C, C, C, C, C, T, T],
    [T, T, T, C, C, C, C, C, C, C, C, C, C, C, C, T, T, T],
    [T, T, T, T, C, C, C, C, C, C, C, C, C, C, T, T, T, T],  // waist
    [T, T, T, T, T, C, B, B, C, C, B, B, C, T, T, T, T, T],  // engine pods
    [T, T, T, T, T, C, B, A, C, C, A, B, C, T, T, T, T, T],  // engine interior
    [T, T, T, T, T, T, B, A, C, C, A, B, T, T, T, T, T, T],  // nozzle
    [T, T, T, T, T, T, W, W, T, T, W, W, T, T, T, T, T, T],  // exhaust glow
  ]

  return (
    <svg
      width={18 * s} height={20 * s}
      style={{ imageRendering: 'pixelated', verticalAlign: 'middle' }}
      aria-hidden="true"
    >
      {grid.flatMap((row, ri) =>
        row.map((color, ci) =>
          color ? <rect key={`${ri}-${ci}`} x={ci * s} y={ri * s} width={s} height={s} fill={color} /> : null
        )
      )}
    </svg>
  )
}

function lifeColor(life) {
  if (life > 100) return 'bg-col-green'
  if (life > 30)  return 'bg-col-amber'
  return 'bg-col-red'
}

function lifeTextColor(life) {
  if (life > 100) return 'text-col-green'
  if (life > 30)  return 'text-col-amber'
  return 'text-col-red'
}

const ALL_CONFIGS = ['DCA/CAP', 'RECCE', 'AI/ST', 'AEW&C']

function ConfirmModal({ title, message, onConfirm, onCancel, confirmLabel = 'Confirm', confirmClass = 'bg-col-red text-white' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-surface border border-border rounded-lg p-5 max-w-sm w-full mx-4 space-y-4 shadow-xl">
        {title && <div className="text-sm font-bold text-text-hi">{title}</div>}
        <p className="text-sm text-text-lo leading-relaxed">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-xs border border-border text-text-lo hover:text-text-hi rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-1.5 text-xs font-bold rounded hover:opacity-80 transition-opacity ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function AircraftCard({ ac, mission, onAction, exchangeUnits }) {
  const s = STATUS_CONFIG[ac.status] ?? STATUS_CONFIG.grey
  const tooltipsEnabled = useContext(TooltipCtx)
  const lifePct = Math.min(100, Math.round((ac.remaining_life / 200) * 100))
  const [rtbModal, setRtbModal] = useState(false)

  return (
    <div className={`bg-surface border ${s.border} rounded p-3 flex flex-col gap-1.5`}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot} ${ac.status === 'on_mission' ? 'pulse-dot' : ''}`} />
          <span className="font-bold text-sm text-text-hi">{ac.id}</span>
          <Tooltip text={GLOSSARY[ac.type]} enabled={tooltipsEnabled}>
            <span className="flex items-center gap-1 text-xs text-text-dim">
              <JetIcon />
              {ac.type}
            </span>
          </Tooltip>
        </div>
        <Tooltip text={GLOSSARY[s.label]} enabled={tooltipsEnabled}>
          <span className={`text-xs font-bold tracking-wider ${s.color}`}>{s.label}</span>
        </Tooltip>
      </div>

      {/* Life bar */}
      <div>
        <div className="flex justify-between text-xs mb-0.5">
          <span className="text-text-dim">Life remaining</span>
          <span className={`font-semibold ${lifeTextColor(ac.remaining_life)}`}>{ac.remaining_life}h</span>
        </div>
        <div className="h-1.5 bg-raised rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${lifeColor(ac.remaining_life)}`}
            style={{ width: `${lifePct}%` }}
          />
        </div>
      </div>

      {/* Flight hours + config row */}
      <div className="flex items-center justify-between text-xs">
        <Tooltip text={GLOSSARY[ac.configuration]} enabled={tooltipsEnabled}>
          <span className="text-text-lo">{ac.configuration}</span>
        </Tooltip>
        <span className="text-text-dim">{ac.total_flight_hours}h total</span>
      </div>

      {/* Config + mission/location */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-dim">{ac.location}</span>
        {ac.status === 'on_mission' && mission && (
          <span className="text-col-blue font-semibold">
            {mission.id} · {mission.type}
            {mission.departure_hour != null && mission.return_hour != null && (
              <span className="ml-1 font-normal opacity-70">
                {String(mission.departure_hour).padStart(2,'0')}–{String(mission.return_hour).padStart(2,'0')}
              </span>
            )}
          </span>
        )}
        {ac.maintenance_eta != null && (
          <span className="text-col-amber font-semibold">{ac.maintenance_eta}h ETA</span>
        )}
        {ac.return_eta != null && (
          <span className="text-col-cyan font-semibold">{ac.return_eta}h to base</span>
        )}
      </div>

      {/* Payload */}
      {ac.current_payload?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {ac.current_payload.map((p, i) => (
            <span key={i} className="px-1.5 py-0.5 bg-raised text-text-dim text-xs rounded">{p}</span>
          ))}
        </div>
      )}

      {/* Fault */}
      {ac.fault && (
        <div className="bg-col-red/10 border border-col-red/30 rounded px-2 py-1 text-xs text-col-red">
          <Tooltip text={Object.entries(GLOSSARY).find(([k]) => ac.fault.includes(k))?.[1]} enabled={tooltipsEnabled}>
            <span>{ac.fault}</span>
          </Tooltip>
        </div>
      )}

      {/* Reconfigure — only for ready aircraft */}
      {ac.status === 'green' && (
        <div className="pt-0.5">
          <div className="text-[10px] text-text-dim mb-1 uppercase tracking-wider">Reconfigure (3h)</div>
          <div className="flex flex-wrap gap-1">
            {ALL_CONFIGS.filter(c => c !== ac.configuration).map(cfg => (
              <button
                key={cfg}
                onClick={() => onAction('/api/action/reconfigure-aircraft', { aircraft_id: ac.id, new_config: cfg })}
                title={`Reconfigure ${ac.id} to ${cfg} — takes 3h`}
                className="px-1.5 py-0.5 text-[10px] border border-col-blue/40 text-col-blue hover:bg-col-blue/10 rounded transition-colors"
              >
                → {cfg}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reconfiguration in progress badge */}
      {ac.status === 'red' && ac.pending_config && (
        <div className="text-[10px] text-col-blue bg-col-blue/10 border border-col-blue/30 rounded px-2 py-0.5">
          Reconfiguring → {ac.pending_config}
        </div>
      )}

      {/* Exchange Unit application — only for aircraft in maintenance with ETA > 1h */}
      {ac.status === 'red' && !ac.pending_config && ac.maintenance_eta > 1 && Object.keys(exchangeUnits ?? {}).length > 0 && (
        <div className="pt-0.5">
          <div className="text-[10px] text-text-dim mb-1 uppercase tracking-wider">Apply Exchange Unit (−4h ETA)</div>
          <div className="flex flex-wrap gap-1">
            {Object.entries(exchangeUnits).map(([ueType, count]) => (
              <button
                key={ueType}
                onClick={() => onAction('/api/action/apply-exchange-unit', { aircraft_id: ac.id, ue_type: ueType })}
                disabled={count === 0}
                title={`Apply ${ueType} — ETA ${ac.maintenance_eta}h → ${Math.max(1, ac.maintenance_eta - 4)}h (${count} available)`}
                className="px-1.5 py-0.5 text-[10px] border border-col-amber/40 text-col-amber hover:bg-col-amber/10 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {ueType} ({count})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* RTB confirm modal */}
      {rtbModal && (
        <ConfirmModal
          title={`RTB — ${ac.id}`}
          message={`Order ${ac.id} to return to base? The sortie is aborted (−25 pts) and post-mission check still applies on landing. Only use this if you need the aircraft urgently for a higher-priority task.`}
          confirmLabel="Order RTB"
          confirmClass="bg-col-red text-white"
          onConfirm={() => { setRtbModal(false); onAction('/api/action/recall-aircraft', { aircraft_id: ac.id }) }}
          onCancel={() => setRtbModal(false)}
        />
      )}

      {/* Action buttons */}
      <div className="flex gap-1 pt-0.5">
        {ac.status === 'on_mission' && (
          <button
            onClick={() => setRtbModal(true)}
            className="flex-1 py-0.5 text-xs border border-col-blue/40 text-col-blue hover:bg-col-blue/10 rounded transition-colors"
          >
            RTB ⚠
          </button>
        )}
      </div>
    </div>
  )
}

export default function FleetPanel({ state, onAction, fleetFilter, onClearFilter }) {
  const aircraft      = state?.aircraft ?? []
  const exchangeUnits = state?.resources?.exchange_units ?? {}

  const missionByAircraft = {}
  ;(state?.ato?.missions ?? []).forEach(m => {
    ;(m.assigned_aircraft ?? []).forEach(id => {
      missionByAircraft[id] = m
    })
  })

  const allGroups = [
    { key: 'green',       label: 'Ready' },
    { key: 'on_mission',  label: 'Airborne' },
    { key: 'returning',   label: 'Returning' },
    { key: 'red',         label: 'Maintenance' },
    { key: 'grey',        label: 'Cannibalized' },
    { key: 'written_off', label: 'Written Off' },
  ]

  const groups = {
    green:       aircraft.filter(a => a.status === 'green'),
    on_mission:  aircraft.filter(a => a.status === 'on_mission'),
    returning:   aircraft.filter(a => a.status === 'returning'),
    red:         aircraft.filter(a => a.status === 'red'),
    grey:        aircraft.filter(a => a.status === 'grey'),
    written_off: aircraft.filter(a => a.status === 'written_off'),
  }

  const visibleGroups = fleetFilter
    ? allGroups.filter(g => g.key === fleetFilter)
    : allGroups.filter(g => groups[g.key].length > 0)

  return (
    <div className="space-y-4">

      {/* Active filter banner */}
      {fleetFilter && (
        <div className="flex items-center justify-between bg-raised border border-border rounded px-3 py-1.5">
          <span className="text-xs text-text-lo">
            Filtered: <span className="text-text-hi font-semibold capitalize">{fleetFilter.replace('_', ' ')}</span>
          </span>
          <button
            onClick={onClearFilter}
            className="text-xs text-text-dim hover:text-text-hi transition-colors"
          >
            Clear filter ×
          </button>
        </div>
      )}

      {/* Aircraft cards grouped by status */}
      {visibleGroups.map(g => (
        <div key={g.key}>
          <div className={`text-xs uppercase tracking-wider mb-2 ${g.key === 'written_off' ? 'text-col-red/60' : 'text-text-dim'}`}>
            {g.label} ({groups[g.key].length})
            {g.key === 'written_off' && <span className="ml-2 normal-case">— permanently out of service</span>}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {groups[g.key].map(ac => (
              <AircraftCard
                key={ac.id}
                ac={ac}
                mission={missionByAircraft[ac.id]}
                onAction={onAction}
                exchangeUnits={exchangeUnits}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
