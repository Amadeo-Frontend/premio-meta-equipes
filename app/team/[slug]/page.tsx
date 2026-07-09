'use client'

import GrowthChart from '@/components/GrowthChart'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { teams } from '@/data/teams'
import { calcPrizeProgress } from '@/lib/calc'
import { Printer } from 'lucide-react'
import Image from 'next/image'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

const semesterMonths = {
  S1: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun'] as const,
  S2: ['jul', 'ago', 'set', 'out', 'nov', 'dez'] as const,
}

type SemesterKey = keyof typeof semesterMonths

type Month = typeof semesterMonths[keyof typeof semesterMonths][number]

const monthLabels: Record<Month, string> = {
  jan: 'Jan',
  fev: 'Fev',
  mar: 'Mar',
  abr: 'Abr',
  mai: 'Mai',
  jun: 'Jun',
  jul: 'Jul',
  ago: 'Ago',
  set: 'Set',
  out: 'Out',
  nov: 'Nov',
  dez: 'Dez',
}

type Semester = {
  id: string
  year: number
  sem: SemesterKey
  label: string
  months: readonly Month[]
  base: Record<string, number>
  fechadoTotal?: number
}

type Params = { slug: string | string[] }

const toNumber = (value: string) => {
  if (!value) return 0

  const trimmed = value.trim()
  if (!trimmed) return 0

  // Identifica o último separador (ponto ou vírgula) como separador decimal
  const decimalMatch = trimmed.match(/[.,](?=[^.,]*$)/)
  const decimalSeparator = decimalMatch ? decimalMatch[0] : null

  let normalized = trimmed
  if (decimalSeparator) {
    const [intPart, fracPart] = normalized.split(decimalSeparator)
    const cleanInt = intPart.replace(/[^\d-]/g, '')
    const cleanFrac = fracPart.replace(/[^\d]/g, '')
    normalized = `${cleanInt}.${cleanFrac}`
  } else {
    // Sem separador decimal: remove todos os separadores de milhar
    normalized = normalized.replace(/[^\d-]/g, '')
  }

  const n = Number(normalized)
  return Number.isFinite(n) ? n : 0
}

function buildSemesters(team: Record<string, unknown>): Semester[] {
  const list: Semester[] = []
  Object.entries(team).forEach(([key, value]) => {
    if (!key.startsWith('base')) return
    const match = key.match(/base(\d{4})(S[12])?/) // base2025 or base2025S2
    if (!match) return
    const year = Number(match[1])
    const sem = (match[2] as SemesterKey | undefined) ?? 'S1'
    const months = semesterMonths[sem]
    const fechadoKey = key.replace('base', 'fechado')
    const fechadoTotal = team[fechadoKey] as number | undefined

    list.push({
      id: `${year}-${sem}`,
      year,
      sem,
      label: `${year} ${sem === 'S1' ? 'Jan-Jun' : 'Jul-Dez'}`,
      months,
      base: value as Record<string, number>,
      fechadoTotal,
    })
  })
  // Sort and return
  return list.sort((a, b) => a.year === b.year ? a.sem.localeCompare(b.sem) : a.year - b.year)
}

export default function TeamPage() {
  const params = useParams<Params>()
  const slugParam = params?.slug
  const slug = Array.isArray(slugParam) ? slugParam[0] : slugParam
  const team = slug ? teams[slug.toLowerCase() as keyof typeof teams] : undefined

  useEffect(() => {
    if (!team && slug) toast.error('🚫 Equipe não encontrada')
  }, [team, slug])

  const semesters = useMemo(() => team ? buildSemesters(team) : [], [team])
  const [semesterId, setSemesterId] = useState<string | null>(null)

  const selectedSemesterId = useMemo(
    () => {
      if (semesterId && semesters.some(s => s.id === semesterId)) return semesterId
      // Default to the last semester (e.g., S2 instead of S1)
      return semesters.length > 0 ? semesters[semesters.length - 1].id : null
    },
    [semesterId, semesters],
  )

  const activeSemester = semesters.find(s => s.id === selectedSemesterId)

  const [period, setPeriod] = useState<string>('total')
  const [totals, setTotals] = useState<Record<string, string>>({})
  const [monthly, setMonthly] = useState<Record<string, Record<string, string>>>({})
  const [isExporting, setIsExporting] = useState(false)

  const months = activeSemester?.months ?? semesterMonths.S1
  const activeSemesterId = activeSemester?.id ?? '__none__'

  const base = activeSemester?.base ?? {}
  const baseInTon = Object.fromEntries(
    Object.entries(base || {}).map(([month, value]) => [month, value ?? 0]),
  ) as Record<string, number>
  const baseSemesterTon = (activeSemester?.months ?? []).reduce((sum, m) => sum + (baseInTon[m] ?? 0), 0)

  const monthInputs = monthly[activeSemesterId] || Object.fromEntries(months.map(m => [m, '']))
  const totalInput = totals[activeSemesterId] ?? (activeSemester?.fechadoTotal !== undefined ? activeSemester.fechadoTotal.toString() : '')

  const inputToTon = (value: string) => toNumber(value)

  const actualSemesterTon = period === 'total'
    ? (totalInput.trim() ? inputToTon(totalInput) : months.reduce((acc, m) => acc + inputToTon(monthInputs[m] || ''), 0))
    : months.reduce((acc, m) => acc + inputToTon(monthInputs[m] || ''), 0)

  const semesterPrize = calcPrizeProgress(baseSemesterTon, actualSemesterTon, team?.maxPrize ?? 0)

  const monthlyPrizeDetails = months.map(m => {
    const bTon = baseInTon[m] ?? 0
    const aTon = inputToTon(monthInputs[m] || '')
    return calcPrizeProgress(bTon, aTon, team?.maxPrize ?? 0)
  })
  const monthlyPrizesSum = monthlyPrizeDetails.reduce((sum, p) => sum + p.dynamicPrize, 0)

  const selectedMonth = period === 'total' ? null : (period as Month)
  const selectedBaseTon = selectedMonth ? baseInTon[selectedMonth] || 0 : baseSemesterTon
  const selectedActualTon = selectedMonth ? inputToTon(monthInputs[selectedMonth] || '') : actualSemesterTon
  const selectedPrize = calcPrizeProgress(selectedBaseTon, selectedActualTon, team?.maxPrize ?? 0)

  const hasAnyInput = (() => {
    const hasTotal = totalInput.trim() !== ''
    const hasMonthly = Object.values(monthInputs || {}).some(v => (v || '').trim() !== '')
    return hasTotal || hasMonthly
  })()

  const chartBase = selectedBaseTon
  const chartActual = selectedActualTon
  const chartTarget = selectedBaseTon + selectedPrize.growthTarget

  useEffect(() => {
    if (semesterPrize.progressPercent >= 100) {
      toast.success('🏆 Prêmio máximo garantido!')
    }
  }, [semesterPrize.progressPercent])

  const handleInputChange = (value: string) => {
    if (!activeSemester) return
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

  const formatNumber = (value: number, min = 2, max = 2) =>
    value.toLocaleString('pt-BR', { minimumFractionDigits: min, maximumFractionDigits: max })

  const formatTon = (valueTon: number) => `${formatNumber(valueTon, 3, 3)} t`

  const handlePrint = async () => {
    if (!hasAnyInput) {
      toast.error('⚠️ Preencha algum valor antes de imprimir ou exportar.')
      return
    }
    if (!team || !activeSemester) return
    
    setIsExporting(true)
    const loadToast = toast.loading('Gerando PDF...')

    try {
      const response = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamName: team.name,
          base: baseSemesterTon,
          acumulado: actualSemesterTon,
          meta100: baseSemesterTon + semesterPrize.growthTarget,
          maxPremio: team.maxPrize
        })
      })

      if (!response.ok) throw new Error('Falha ao gerar o PDF')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.style.display = 'none'
      a.href = url
      a.download = `Relatorio_${team.name.replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      
      toast.success('PDF gerado com sucesso!', { id: loadToast })
    } catch (error) {
      console.error(error)
      toast.error('Ocorreu um erro ao gerar o PDF.', { id: loadToast })
    } finally {
      setIsExporting(false)
    }
  }

  if (!team || !activeSemester) return null


  const InfoAndCharts = activeSemester && team ? (
    <div className="grid lg:grid-cols-2 gap-8 items-start">
      <div className="space-y-6">
        <div className="glass-card p-8 space-y-6">
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground/80 font-bold">{selectedMonth ? `Período: ${selectedMonth.toUpperCase()}` : `Semestre: ${activeSemester.label}`}</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-bold">Base</p>
                <p className="text-2xl font-black text-[rgb(var(--text))]">{formatTon(selectedBaseTon)}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider font-bold">Real</p>
                <p className="text-2xl font-black text-[rgb(var(--text))]">{formatTon(selectedActualTon)}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground/70 pt-1">Meta Alcançada: <span className="font-bold text-[rgb(var(--text))]">{selectedPrize.progressPercent.toFixed(1)}%</span></p>
            <p className="text-3xl font-black text-blue-600 pt-1">R$ {selectedPrize.dynamicPrize.toFixed(2)}</p>
          </div>

          <div className="pt-4 border-t border-white/10 space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Resumo Acumulado ({activeSemester.label})</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Base Total</p>
                <p className="text-xl font-black">{formatTon(baseSemesterTon)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Real Total</p>
                <p className="text-xl font-black">{formatTon(actualSemesterTon)}</p>
              </div>
            </div>
            <div className="pt-3 space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-xs font-medium text-muted-foreground">Prêmio Acumulado (Mensal)</span>
                <span className="text-sm font-bold text-emerald-600">R$ {monthlyPrizesSum.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">PRÊMIO PROJETADO (SEMESTRE)</span>
                <span className="text-3xl font-black text-blue-600 leading-none">R$ {semesterPrize.dynamicPrize.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="h-full">
        <div className="h-full glass-card p-8">
          <GrowthChart
            base={chartBase}
            actual={chartActual}
            target={chartTarget}
          />
        </div>
      </div>
    </div>
  ) : null

  return (
    <main className="min-h-screen bg-[rgb(var(--bg))] p-4 md:p-6 space-y-4 md:space-y-6 overflow-x-hidden">
      <div className="flex items-center gap-6 flex-wrap">
        {team.logo && (
          <div className="p-1 rounded-2xl shadow-lg glass-card overflow-hidden flex items-center justify-center">
            <Image 
              src={team.logo} 
              alt={team.name} 
              width={120} 
              height={120} 
              className="w-20 h-20 md:w-28 md:h-28 object-contain transition-transform hover:scale-110 duration-500"
            />
          </div>
        )}
        <h1 className="text-3xl md:text-4xl font-black tracking-tighter flex-1 min-w-[200px] text-[rgb(var(--text))] drop-shadow-sm">
          {team.name}
        </h1>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={selectedSemesterId ?? ''} onValueChange={v => { setSemesterId(v); setPeriod('total') }}>
            <SelectTrigger className="w-full sm:w-[180px] lg:w-[150px] cursor-pointer hover:bg-muted/60 transition-colors">
              <SelectValue placeholder="Semestre" />
            </SelectTrigger>
            <SelectContent>
              {semesters.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="h-12 w-11 sm:w-auto px-2 sm:px-4 gap-2 cursor-pointer hover:shadow-md transition-all duration-300 hover:-translate-y-1"
            onClick={handlePrint}
            disabled={!hasAnyInput || isExporting}
            aria-label="Imprimir ou exportar"
          >
            <Printer size={18} className={`shrink-0 ${isExporting ? 'animate-pulse text-blue-500' : ''}`} />
            <span className="hidden sm:inline">{isExporting ? 'Gerando...' : 'Imprimir / Exportar'}</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acompanhamento Mensal / Total</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4 max-w-3xl lg:max-w-none">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <Select value={period} onValueChange={v => setPeriod(v as string)}>
                <SelectTrigger className="glass-input h-14 text-base font-semibold lg:w-[200px] cursor-pointer">
                  <SelectValue placeholder="Total" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">FECHAMENTO TOTAL</SelectItem>
                  {months.map(m => (
                    <SelectItem key={m} value={m}>{monthLabels[m].toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative flex-1 lg:max-w-md">
                <Input
                  className="glass-input pl-5 pr-14 h-14 text-xl font-bold transition-all duration-300"
                  type="number"
                  step="0.001"
                  placeholder={period === 'total' ? 'Volume total (t)' : `Volume em ${monthLabels[period as Month]} (t)`}
                  value={period === 'total' ? totalInput : monthInputs[period] || ''}
                  onChange={e => handleInputChange(e.target.value)}
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground font-black pointer-events-none text-lg">t</div>
              </div>
            </div>

            {period !== 'total' && (
              <p className="text-sm text-muted-foreground font-medium animate-in fade-in slide-in-from-left-2 transition-all">
                Base {monthLabels[period as Month]} {activeSemester.label}: <b className="text-foreground">{formatTon(baseInTon[period] ?? 0)}</b>
              </p>
            )}

            {period === 'total' && (
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Informe o volume total acumulado do semestre ou deixe em branco para somar os meses preenchidos individualmente. 
                <span className="block font-bold text-foreground mt-1">Todos os valores devem ser informados em Toneladas (t).</span>
              </p>
            )}
          </div>

          {InfoAndCharts}
        </CardContent>
      </Card>
    </main>
  )
}
