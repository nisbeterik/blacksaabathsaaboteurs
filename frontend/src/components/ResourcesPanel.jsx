import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

const DARK = {
  border: '#30363d',
  text:   '#8b949e',
}

const BAR_COLORS = ['#1f6feb', '#3fb950', '#d29922', '#f85149', '#8b949e', '#58a6ff']

// Defined outside the parent so React never remounts it on re-render
function ResourceBar({ label, value, max, unit = '' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const barColor = pct > 50 ? '#3fb950' : pct > 20 ? '#d29922' : '#f85149'
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-text-lo">{label}</span>
        <span className="text-text-hi font-semibold">{value.toLocaleString()}{unit}</span>
      </div>
      <div className="h-2 bg-raised rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        />
      </div>
    </div>
  )
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1c2128', border: '1px solid #30363d', borderRadius: 4, padding: '6px 10px' }}>
      <div style={{ color: '#e6edf3', fontWeight: 600, marginBottom: 2, fontSize: 11 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.fill, fontSize: 11 }}>{p.value}</div>
      ))}
    </div>
  )
}

function ChartCard({ title, data }) {
  return (
    <div className="bg-surface border border-border rounded p-3">
      <div className="text-xs text-text-dim uppercase tracking-wider mb-3">{title}</div>
      {data.length === 0
        ? <div className="text-xs text-text-dim">No data</div>
        : (
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={data} barSize={28} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={DARK.border} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: DARK.text, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: DARK.text, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#21262d' }} />
              <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )
      }
    </div>
  )
}

export default function ResourcesPanel({ state }) {
  const r = state?.resources
  if (!r) return null

  const weaponsData   = Object.entries(r.weapons        ?? {}).map(([k, v]) => ({ name: k, value: v }))
  const euData        = Object.entries(r.exchange_units  ?? {}).map(([k, v]) => ({ name: k, value: v }))
  const personnelData = Object.entries(r.personnel       ?? {}).map(([k, v]) => ({ name: k, value: v }))
  const toolsData     = Object.entries(r.tools           ?? {}).map(([k, v]) => ({ name: k, value: v }))

  const fuelMax = 100000

  return (
    <div className="space-y-4">
      {/* Fuel */}
      <div className="bg-surface border border-border rounded p-3 space-y-2">
        <div className="text-xs text-text-dim uppercase tracking-wider">Fuel</div>
        <ResourceBar label="Fuel available" value={r.fuel} max={fuelMax} unit=" L" />
        <div className="text-xs text-text-dim">
          4,000 L per sortie &middot; {Math.floor(r.fuel / 4000)} sorties remaining
        </div>
      </div>

      {/* Spare parts */}
      <div className="bg-surface border border-border rounded p-3">
        <div className="text-xs text-text-dim uppercase tracking-wider mb-2">Spare Parts</div>
        <ResourceBar label="Generic spares" value={r.spare_parts} max={50} unit=" units" />
      </div>

      <ChartCard title="Weapons Inventory" data={weaponsData} />
      <ChartCard title="Exchange Units (UE)" data={euData} />
      <ChartCard title="Personnel" data={personnelData} />
      {toolsData.length > 0 && <ChartCard title="Tools" data={toolsData} />}
    </div>
  )
}
