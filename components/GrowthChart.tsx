'use client'

import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts'

export default function GrowthChart({
  base,
  actual,
  target,
}: {
  base: number
  actual: number
  target: number
}) {
  const data = [
    { name: 'Base 2025', value: base },
    { name: 'Real', value: actual },
    { name: 'Meta', value: target },
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
            fill="rgb(var(--primary))"
          >
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
