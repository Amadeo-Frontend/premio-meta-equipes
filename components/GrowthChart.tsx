'use client'

import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts'

export default function GrowthChart({
  base,
  actual,
  target,
}: {
  base: number
  actual: number
  target: number
}) {
  const primary = 'rgb(var(--primary))'
  const neutral = '#94a3b8' // cor neutra para base
  const success = '#22c55e' // verde para meta
  const danger = '#ef4444' // vermelho quando ficar negativo

  const data = [
    { name: 'Base', value: base, fill: neutral },
    { name: 'Real', value: actual, fill: actual >= base ? primary : danger },
    { name: 'Meta', value: target, fill: success },
  ]

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 24 }}>
          <XAxis dataKey="name" />
          <Tooltip
            formatter={(value) =>
              typeof value === 'number' ? `${value.toFixed(1)} t` : value
            }
          />
          <Bar
            dataKey="value"
            radius={[6, 6, 0, 0]}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
            <LabelList
              dataKey="value"
              position="top"
              fill="currentColor"
              formatter={(value) =>
                typeof value === 'number' ? value.toFixed(1) : value
              }
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
