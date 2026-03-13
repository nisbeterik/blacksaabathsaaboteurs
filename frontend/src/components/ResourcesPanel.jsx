import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

const DARK = {
  bg: '#161b22',
  border: '#30363d',
  text: '#8b949e',
  textHi: '#e6edf3',
}

function ResourceBar({ label, value, max, color = '#1f6feb', unit = '' }) {
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

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-raised border border-border rounded px-3 py-2 text-xs text-text-hi shadow-lg">
        <div className="font-semibold mb-1">{label}</div>
        {payload.map((p, i) => (
          <div key={i} style={{ color: p.color }}>{p.value}</div>
        ))}
      </div>
    )
  }
  return null
}

export default function ResourcesPanel({ state }) {
  const r = state?.resources
  if (!r) return null

  const fuelMax = 100000
  const weaponsData = Object.entries(r.weapons ?? {}).map(([k, v]) => ({ name: k, value: v }))
  const euData = Object.entries(r.exchange_units ?? {}).map(([k, v]) => ({ name: k, value: v }))
  const personnelData = Object.entries(r.personnel ?? {}).map(([k, v]) => ({ name: k, value: v }))

  const barColors = ['#1f6feb', '#3fb950', '#d29922', '#f85149', '#8b949e', '#58a6ff']

  const ChartContainer = ({ title, data, maxY }) => (
    <div className="bg-surface border border-border rounded p-3">
      <div className="text-xs text-text-dim uppercase tracking-wider mb-3">{title}</div>
      {data.length === 0
        ? <div className="text-xs text-text-dim">No data</div>
        : (
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={data} barSize={24} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={DARK.border} vertical={false} />
              <XAxis dataKey="name" tick={{ fill: DARK.text, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: DARK.text, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#21262d' }} />
              <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                {data.map((_, i) => (
                  <Cell key={i} fill={barColors[i % barColors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )
      }
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Fuel */}
      <div className="bg-surface border border-border rounded p-3 space-y-2">
        <div className="text-xs text-text-dim uppercase tracking-wider">Fuel</div>
        <ResourceBar label="Fuel available" value={r.fuel} max={fuelMax} unit=" L" />
        <div className="text-xs text-text-dim">4,000 L per sortie · {Math.floor(r.fuel / 4000)} sorties remaining</div>
      </div>

      {/* Spare parts */}
      <div className="bg-surface border border-border rounded p-3">
        <div className="text-xs text-text-dim uppercase tracking-wider mb-2">Spare Parts</div>
        <ResourceBar label="Generic spares" value={r.spare_parts} max={50} unit=" units" />
      </div>

      {/* Charts */}
      <ChartContainer title="Weapons Inventory" data={weaponsData} />
      <ChartContainer title="Exchange Units (UE)" data={euData} />
      <ChartContainer title="Personnel" data={personnelData} />

      {/* Tools */}
      {r.tools && Object.keys(r.tools).length > 0 && (
        <div className="bg-surface border border-border rounded p-3">
          <div className="text-xs text-text-dim uppercase tracking-wider mb-2">Tools</div>
          <div className="space-y-1.5">
            {Object.entries(r.tools).map(([k, v]) => (
              <ResourceBar key={k} label={k} value={v} max={Math.max(v + 2, 5)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
