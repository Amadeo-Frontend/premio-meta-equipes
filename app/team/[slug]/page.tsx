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
import GrowthChart from '@/components/GrowthChart'
import { toast } from 'sonner'

const semesterMonths = {
  S1: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun'] as const,
  S2: ['jul', 'ago', 'set', 'out', 'nov', 'dez'] as const,
}

type SemesterKey = keyof typeof semesterMonths

type Month = typeof semesterMonths[keyof typeof semesterMonths][number]

type Semester = {
  id: string
  year: number
  sem: SemesterKey
  label: string
  months: readonly Month[]
  base: Record<string, number>
}

type Params = { slug: string | string[] }

type Unit = 'kg' | 't'

const toNumber = (value: string) => {
  if (!value) return 0
  const n = Number(value.replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

function buildSemesters(team: Record<string, any>): Semester[] {
  const list: Semester[] = []
  Object.entries(team).forEach(([key, value]) => {
    if (!key.startsWith('base')) return
    const match = key.match(/base(\d{4})(S[12])?/) // base2025 or base2025S2
    if (!match) return
    const year = Number(match[1])
    const sem = (match[2] as SemesterKey | undefined) ?? 'S1'
    const months = semesterMonths[sem]
    list.push({
      id: `${year}-${sem}`,
      year,
      sem,
      label: `${year} ${sem === 'S1' ? 'Jan-Jun' : 'Jul-Dez'}`,
      months,
      base: value as Record<string, number>,
    })
  })
  return list.sort((a, b) => a.year === b.year ? a.sem.localeCompare(b.sem) : a.year - b.year)
}

export default function TeamPage() {
  const params = useParams<Params>()
  const slugParam = params?.slug
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam
  const team = slug ? teams[slug.toLowerCase() as keyof typeof teams] : undefined

  useEffect(() => {
    if (!team && slug) toast.error('Equipe não encontrada')
  }, [team, slug])

  const semesters = useMemo(() => team ? buildSemesters(team) : [], [team])
  const [semesterId, setSemesterId] = useState<string | null>(null)
  const [unit, setUnit] = useState<Unit>('kg')

  useEffect(() => {
    if (!semesterId && semesters.length) setSemesterId(semesters[0].id)
  }, [semesterId, semesters])

  const activeSemester = semesters.find(s => s.id === semesterId) ?? semesters[0]
  const months = activeSemester?.months ?? semesterMonths.S1

  const [period, setPeriod] = useState<string>('total')
  useEffect(() => { setPeriod('total') }, [semesterId])

  const [totals, setTotals] = useState<Record<string, string>>({})
  const [monthly, setMonthly] = useState<Record<string, Record<string, string>>>({})

  useEffect(() => {
    if (activeSemester && !monthly[activeSemester.id]) {
      setMonthly(prev => ({
        ...prev,
        [activeSemester.id]: Object.fromEntries(activeSemester.months.map(m => [m, ''])) as Record<string, string>,
      }))
    }
    if (activeSemester && totals[activeSemester.id] === undefined) {
      setTotals(prev => ({ ...prev, [activeSemester.id]: '' }))
    }
  }, [activeSemester, monthly, totals])

  if (!team || !activeSemester) return null

  const base = activeSemester.base
  const baseSemester = activeSemester.months.reduce((sum, m) => sum + (base[m] ?? 0), 0)

  const monthInputs = monthly[activeSemester.id] || Object.fromEntries(activeSemester.months.map(m => [m, '']))
  const totalInput = totals[activeSemester.id] || ''

  const factor = unit === 'kg' ? 0.001 : 1 // convert to tons
  const monthlySum = activeSemester.months.reduce((acc, m) => acc + toNumber(monthInputs[m] || '') * factor, 0)
  const actualSemester = period === 'total'
    ? (totalInput.trim() ? toNumber(totalInput) * factor : monthlySum)
    : monthlySum

  const semesterPrize = useMemo(
    () => calcPrizeProgress(baseSemester, actualSemester),
    [baseSemester, actualSemester],
  )

  const selectedMonth = period === 'total' ? null : (period as Month)
  const selectedBase = selectedMonth ? base[selectedMonth] || 0 : baseSemester
  const selectedActual = selectedMonth ? toNumber(monthInputs[selectedMonth] || '') * factor : actualSemester
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
      setTotals(prev => ({ ...prev, [activeSemester.id]: value }))
    } else {
      setMonthly(prev => ({
        ...prev,
        [activeSemester.id]: {
          ...(prev[activeSemester.id] || {}),
          [period]: value,
        },
      }))
    }
  }

  const InfoAndCharts = (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      <div className="space-y-4">
        <div className="rounded-lg border bg-card/60 p-4 shadow-sm space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{selectedMonth ? `Mês ${selectedMonth.toUpperCase()}` : activeSemester.label}</p>
          <p>Base considerada: <b>{selectedBase.toFixed(2)} t</b></p>
          <p>Real informado: <b>{selectedActual.toFixed(2)} t</b></p>
          <p>Progresso da meta: <b>{selectedPrize.progressPercent.toFixed(1)}%</b></p>
          <p className="text-lg">Prêmio estimado: <b>R$ {selectedPrize.dynamicPrize.toFixed(2)}</b></p>
        </div>

        <div className="rounded-lg border bg-card/60 p-4 shadow-sm space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Semestre {activeSemester.label}</p>
          <p>Base {activeSemester.label}: <b>{baseSemester.toFixed(2)} t</b></p>
          <p>Real acumulado: <b>{actualSemester.toFixed(2)} t</b></p>
          <p>Progresso da meta: <b>{semesterPrize.progressPercent.toFixed(1)}%</b></p>
          <p className="text-lg">Prêmio projetado: <b>R$ {semesterPrize.dynamicPrize.toFixed(2)}</b></p>
        </div>
      </div>

      <div className="h-full">
        <div className="h-[240px] lg:h-[260px] w-full bg-card/60 rounded-lg border p-2 shadow-sm">
          <GrowthChart base={chartBase} actual={chartActual} target={chartTarget} />
        </div>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-muted p-4 md:p-8 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        {team.logo && (
          <Image src={team.logo} alt={team.name} width={60} height={60} />
        )}
        <h1 className="text-2xl font-bold flex-1 min-w-[200px]">{team.name}</h1>
        <Select value={semesterId ?? activeSemester.id} onValueChange={v => setSemesterId(v)}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Semestre" /></SelectTrigger>
          <SelectContent>
            {semesters.map(s => (
              <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acompanhamento Mensal / Total</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 max-w-3xl lg:max-w-none">
            <div className="lg:flex lg:items-center lg:gap-4">
              <Select value={period} onValueChange={v => setPeriod(v as string)}>
                <SelectTrigger><SelectValue placeholder="Total" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">TOTAL</SelectItem>
                  {months.map(m => (
                    <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                className="lg:max-w-sm"
                type="number"
                placeholder={period === 'total' ? 'Total no semestre' : 'Venda do mês'}
                value={period === 'total' ? totalInput : monthInputs[period] || ''}
                onChange={e => handleInputChange(e.target.value)}
              />

              <Select value={unit} onValueChange={v => setUnit(v as Unit)}>
                <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="t">t</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {period !== 'total' && (
              <p className="text-sm text-muted-foreground">
                Base {period.toUpperCase()} {activeSemester.label}: <b className="text-foreground">{(base[period] ?? 0).toFixed(2)} t</b>
              </p>
            )}

            {period === 'total' && (
              <p className="text-xs text-muted-foreground">
                Deixe em branco para usar a soma dos meses ou preencha o total acumulado ({activeSemester.label}). Unidade selecionada: {unit}.
              </p>
            )}
          </div>

          {InfoAndCharts}
        </CardContent>
      </Card>
    </main>
  )
}
