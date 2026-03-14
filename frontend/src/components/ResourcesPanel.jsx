const WEAPON_MAX = { 'Robot-1': 20, 'Bomb-2': 16, 'Robot-15': 8 }
const EU_MAX     = { Radar: 4, SignalProcessor: 4, EjectionSeat: 2, HydraulicPump: 4 }
const PERS_MAX   = { klargoring_crew: 6, maintenance_tech: 6, pilots: 12 }
const PERS_LABEL = { klargoring_crew: 'Klargöring', maintenance_tech: 'Maint. Tech', pilots: 'Pilots' }

function statusColor(pct) {
  if (pct > 60) return '#3fb950'
  if (pct > 25) return '#d29922'
  return '#f85149'
}

function StatBar({ label, value, max, unit = '' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const color = statusColor(pct)
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 shrink-0 text-xs text-text-lo truncate">{label}</div>
      <div className="flex-1 h-1.5 bg-raised rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <div className="w-16 text-right text-xs font-mono font-semibold" style={{ color }}>
        {value.toLocaleString()}{unit}
      </div>
    </div>
  )
}

function SectionCard({ title, children }) {
  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-raised">
        <span className="text-xs font-semibold uppercase tracking-widest text-text-lo">{title}</span>
      </div>
      <div className="p-4 space-y-3">
        {children}
      </div>
    </div>
  )
}

function BigStat({ label, value, sub, color = '#e6edf3' }) {
  return (
    <div className="flex flex-col">
      <span className="text-2xl font-bold font-mono" style={{ color }}>{value}</span>
      <span className="text-xs text-text-lo">{label}</span>
      {sub && <span className="text-xs text-text-dim mt-0.5">{sub}</span>}
    </div>
  )
}

export default function ResourcesPanel({ state, onRequestResupply, onApplyUE, loading = false }) {
  const r = state?.resources
  if (!r) return <div className="text-text-dim text-sm p-4">No resource data.</div>

  const fuelPct    = Math.min(100, (r.fuel / 100000) * 100)
  const fuelColor  = statusColor(fuelPct)
  const sorties    = Math.floor(r.fuel / 4000)
  const resupplyEta = state.resupply_eta ?? null

  // Aircraft currently in maintenance eligible for UE application
  const inMaint = (state.aircraft ?? []).filter(a => a.status === 'red' && a.maintenance_eta > 1)

  return (
    <div className="space-y-3">

      {/* Fuel — hero card with resupply action */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-raised">
          <span className="text-xs font-semibold uppercase tracking-widest text-text-lo">Fuel</span>
        </div>
        <div className="p-4">
          <div className="flex items-end justify-between mb-3">
            <BigStat
              label="Liters available"
              value={r.fuel.toLocaleString()}
              sub={`${sorties} sorties remaining`}
              color={fuelColor}
            />
            <div className="text-right">
              <span className="text-2xl font-bold font-mono" style={{ color: fuelColor }}>
                {fuelPct.toFixed(0)}%
              </span>
              <div className="text-xs text-text-dim">of capacity</div>
            </div>
          </div>
          {/* Segmented fuel bar */}
          <div className="h-3 bg-raised rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${fuelPct}%`, backgroundColor: fuelColor }}
            />
          </div>
          <div className="flex justify-between text-xs text-text-dim mt-1.5">
            <span>0</span>
            <span>25k</span>
            <span>50k</span>
            <span>75k</span>
            <span>100k L</span>
          </div>
          {/* Resupply row */}
          <div className="mt-3 pt-3 border-t border-border">
            {resupplyEta != null ? (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-col-green animate-pulse flex-shrink-0" />
                <span className="text-xs text-col-green font-semibold">
                  Convoy en route — {resupplyEta}h ETA
                </span>
                <span className="text-xs text-text-dim">(+30kL fuel, +weapons on arrival)</span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-dim">No resupply en route.</span>
                <button
                  onClick={onRequestResupply}
                  disabled={loading}
                  className="px-3 py-1 text-xs border border-col-green/50 text-col-green
                    hover:bg-col-green/10 rounded transition-colors disabled:opacity-40"
                >
                  Request Resupply (8h)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Weapons */}
      <SectionCard title="Weapons">
        {Object.entries(r.weapons ?? {}).map(([k, v]) => (
          <StatBar key={k} label={k} value={v} max={WEAPON_MAX[k] ?? Math.max(v * 2, 4)} unit=" rds" />
        ))}
        {Object.keys(r.weapons ?? {}).length === 0 && (
          <div className="text-xs text-red-400 font-semibold">⚠ No weapons on hand</div>
        )}
      </SectionCard>

      {/* Exchange Units — interactive */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-raised">
          <span className="text-xs font-semibold uppercase tracking-widest text-text-lo">Exchange Units (UE)</span>
          <span className="text-xs text-text-dim ml-auto">Apply → reduce maint ETA by 4h</span>
        </div>
        <div className="p-4 space-y-4">
          {Object.entries(r.exchange_units ?? {}).map(([k, v]) => {
            const max   = EU_MAX[k] ?? Math.max(v + 2, 4)
            const pct   = Math.min(100, (v / max) * 100)
            const color = statusColor(pct)
            return (
              <div key={k}>
                <div className="flex items-center gap-3 mb-1.5">
                  <span className="text-xs text-text-lo w-36 truncate">{k}</span>
                  <div className="flex-1 h-1 bg-raised rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                  <span className="text-xs font-mono font-bold w-5 text-right" style={{ color }}>{v}</span>
                </div>
                {inMaint.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {inMaint.map(ac => (
                      <button
                        key={ac.id}
                        onClick={() => onApplyUE(ac.id, k)}
                        disabled={loading || v === 0}
                        title={`Apply ${k} to ${ac.id} — ETA ${ac.maintenance_eta}h → ${Math.max(1, ac.maintenance_eta - 4)}h`}
                        className="px-2 py-0.5 text-xs border border-col-amber/40 text-col-amber
                          hover:bg-col-amber/10 rounded transition-colors
                          disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        → {ac.id} ({ac.maintenance_eta}h)
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          {inMaint.length === 0 && (
            <div className="text-xs text-text-dim">No aircraft in maintenance — UEs on standby.</div>
          )}
        </div>
      </div>

      {/* Personnel */}
      <SectionCard title="Personnel">
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(r.personnel ?? {}).map(([k, v]) => {
            const max = PERS_MAX[k] ?? Math.max(v + 2, 6)
            const pct = Math.min(100, (v / max) * 100)
            const color = statusColor(pct)
            return (
              <div key={k} className="bg-raised rounded p-3 flex flex-col items-center gap-1 border border-border">
                <span className="text-2xl font-bold font-mono" style={{ color }}>{v}</span>
                <span className="text-xs text-text-dim text-center leading-tight">{PERS_LABEL[k] ?? k}</span>
                <div className="w-full h-1 bg-bg-base rounded-full overflow-hidden mt-1">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
              </div>
            )
          })}
        </div>
      </SectionCard>

      {/* Spare Parts */}
      <SectionCard title="Spare Parts">
        <StatBar label="Generic spares" value={r.spare_parts} max={50} unit=" units" />
        <div className="text-xs text-text-dim">
          Pool covers minor LRU swaps · critical parts tracked as Exchange Units above
        </div>
      </SectionCard>

    </div>
  )
}
