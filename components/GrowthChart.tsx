'use client'

import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, LabelList, Cell } from 'recharts'

export default function GrowthChart({
  base,
  actual,
  target,
  unit = 't',
  decimals = 2,
}: {
  base: number
  actual: number
  target: number
  unit?: string
  decimals?: number
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

  const format = (value: number) =>
    value.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 24 }}>
          <XAxis dataKey="name" />
          <Tooltip
            formatter={(value) =>
              typeof value === 'number' ? `${format(value)} ${unit}` : value
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
                typeof value === 'number' ? format(value) : value
              }
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
