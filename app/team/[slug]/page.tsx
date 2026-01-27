'use client'

import * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { teams } from '@/data/teams'
import { calcPrizeProgress } from '@/lib/calc'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import SemesterProgressChart from '@/components/SemesterProgressChart'
import GrowthChart from '@/components/GrowthChart'
import { toast } from 'sonner'

const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun'] as const
const periods = ['total', ...months] as const

type Month = typeof months[number]
type Period = typeof periods[number]

type Params = { slug: string | string[] }

const toNumber = (value: string) => {
  if (!value) return 0
  const normalized = value.replace(',', '.')
  const num = Number(normalized)
  return Number.isFinite(num) ? num : 0
}

export default function TeamPage() {
  const params = useParams<Params>()
  const slugParam = params?.slug
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam
  const team = slug ? teams[slug.toLowerCase() as keyof typeof teams] : undefined

  useEffect(() => {
    if (!team && slug) toast.error('Equipe não encontrada')
  }, [team, slug])

  if (!team) return null

  const baseSemester = useMemo(
    () => Object.values(team.base2025).reduce((a, b) => a + b, 0),
    [team.base2025],
  )

  const [period, setPeriod] = useState<Period>('total')
  const [totalInput, setTotalInput] = useState('')
  const [monthly, setMonthly] = useState<Record<Month, string>>({
    jan: '', fev: '', mar: '', abr: '', mai: '', jun: '',
  })
  const [presentationMode, setPresentationMode] = useState(false)

  const monthlySum = useMemo(
    () => months.reduce((acc, m) => acc + toNumber(monthly[m]), 0),
    [monthly],
  )

  const actualSemester = totalInput.trim() ? toNumber(totalInput) : monthlySum
  const semesterPrize = useMemo(
    () => calcPrizeProgress(baseSemester, actualSemester),
    [baseSemester, actualSemester],
  )

  const selectedMonth = period === 'total' ? null : (period as Month)
  const selectedBase = selectedMonth ? team.base2025[selectedMonth] : baseSemester
  const selectedActual = selectedMonth ? toNumber(monthly[selectedMonth]) : actualSemester
  const selectedPrize = useMemo(
    () => calcPrizeProgress(selectedBase, selectedActual),
    [selectedBase, selectedActual],
  )

  const targetForSelected = selectedBase + selectedPrize.growthTarget
  const targetForSemester = baseSemester + semesterPrize.growthTarget
  const chartBase = selectedBase
  const chartActual = selectedActual
  const chartTarget = period === 'total' ? targetForSemester : targetForSelected

  useEffect(() => {
    if (semesterPrize.progressPercent >= 100) {
      toast.success('Prêmio máximo garantido!')
    }
  }, [semesterPrize.progressPercent])

  const handleInputChange = (value: string) => {
    if (period === 'total') {
      setTotalInput(value)
    } else {
      setMonthly(prev => ({ ...prev, [period as Month]: value }))
    }
  }

  const showInputs = !presentationMode

  return (
    <main className="min-h-screen bg-muted p-4 md:p-8 space-y-4">
      <div className="flex items-center gap-3">
        {team.logo && (
          <Image src={team.logo} alt={team.name} width={60} height={60} />
        )}
        <h1 className="text-2xl font-bold flex-1">{team.name}</h1>
        <button
          type="button"
          onClick={() => setPresentationMode(!presentationMode)}
          className="text-sm px-3 py-1 rounded border bg-card hover:bg-accent"
        >
          {presentationMode ? 'Sair do modo apresentação' : 'Modo apresentação'}
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acompanhamento Mensal / Total</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {showInputs && (
            <div className="space-y-3">
              <Select value={period} onValueChange={v => setPeriod(v as Period)}>
                <SelectTrigger><SelectValue placeholder="Total" /></SelectTrigger>
                <SelectContent>
                  {periods.map(p => (
                    <SelectItem key={p} value={p}>
                      {p === 'total' ? 'TOTAL (Jan-Jun)' : p.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="number"
                placeholder={period === 'total' ? 'Total no semestre (t)' : 'Venda do mês (t)'}
                value={period === 'total' ? totalInput : monthly[period as Month]}
                onChange={e => handleInputChange(e.target.value)}
              />

              {period !== 'total' && (
                <p className="text-sm">
                  Base {period.toUpperCase()} 2025:{' '}
                  <b>{team.base2025[period as Month].toFixed(2)} t</b>
                </p>
              )}

              {period === 'total' && (
                <p className="text-xs text-muted-foreground">
                  Deixe em branco para usar a soma dos meses ou preencha o total acumulado (Jan-Jun).
                </p>
              )}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4 items-start pt-2">
            <div className="space-y-2">
              <p>Base considerada: <b>{selectedBase.toFixed(2)} t</b></p>
              <p>Real informado: <b>{selectedActual.toFixed(2)} t</b></p>
              <p>Progresso da meta: <b>{selectedPrize.progressPercent.toFixed(1)}%</b></p>
              <p className="text-lg">Prêmio estimado: <b>R$ {selectedPrize.dynamicPrize.toFixed(2)}</b></p>
            </div>

            <div className="h-[220px] md:h-[260px]">
              <GrowthChart
                base={chartBase}
                actual={chartActual}
                target={chartTarget}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resultado Semestral • Prêmio Dinâmico</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4 items-center">
          <div className="space-y-2">
            <p>Base Jan-Jun 2025: <b>{baseSemester.toFixed(2)} t</b></p>
            <p>Real acumulado: <b>{actualSemester.toFixed(2)} t</b></p>
            <p>Progresso da meta: <b>{semesterPrize.progressPercent.toFixed(1)}%</b></p>
            <p className="text-xl">
              Prêmio projetado: <b>R$ {semesterPrize.dynamicPrize.toFixed(2)}</b>
            </p>
          </div>

          <div className="space-y-4">
            <div className="h-[240px]">
              <GrowthChart
                base={baseSemester}
                actual={actualSemester}
                target={targetForSemester}
              />
            </div>
            <div className="h-[220px]">
              <SemesterProgressChart value={semesterPrize.progressPercent} />
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
