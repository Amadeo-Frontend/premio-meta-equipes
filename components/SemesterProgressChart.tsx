"use client"

import { RadialBarChart, RadialBar, ResponsiveContainer } from "recharts"

export default function SemesterChart({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(value, 100))
  const data = [{ value: safeValue }]

  return (
    <div className="relative h-[220px] w-full">
      <ResponsiveContainer>
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="70%"
          outerRadius="100%"
          startAngle={90}
          endAngle={-270}
          data={data}
        >
          <RadialBar dataKey="value" fill="rgb(var(--primary))" />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl font-semibold">{safeValue.toFixed(1)}%</span>
      </div>
    </div>
  )
}
