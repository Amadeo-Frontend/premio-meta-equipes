'use client'

import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis } from 'recharts'

export default function GrowthChart({
  base,
  actual,
  target,
}: {
  base: number
  actual: number
  target: number
}) {
  const primary = '#2563eb' // Blue 600
  const baseColor = '#64748b' // Slate 500
  const success = '#059669' // Emerald 600
  const danger = '#dc2626' // Red 600

  const data = [
    { name: 'Base', value: base, fill: baseColor },
    { name: 'Venda Real', value: actual, fill: actual >= base ? primary : danger },
    { name: 'Meta (25%)', value: target, fill: success },
  ]

  const format = (value: number) =>
    value.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })

  return (
    <div className="h-[240px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 30, right: 10, left: 10, bottom: 5 }}>
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'currentColor', fontSize: 12, fontWeight: 500 }}
            dy={10}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
              borderRadius: '12px', 
              border: 'none',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              padding: '12px'
            }}
            itemStyle={{ fontSize: '12px', fontWeight: 600 }}
            formatter={(value) =>
              typeof value === 'number' ? [`${format(value)} t`, 'Valor'] : [value, 'Valor']
            }
          />
          <Bar
            dataKey="value"
            radius={[8, 8, 0, 0]}
            barSize={60}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} fillOpacity={0.9} />
            ))}
            <LabelList
              dataKey="value"
              position="top"
              fill="currentColor"
              offset={10}
              style={{ fontSize: '12px', fontWeight: 700 }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any) => typeof value === 'number' ? `${format(value)} t` : value}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
