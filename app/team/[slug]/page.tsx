'use client'

import * as React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import { teams } from '@/data/teams'
import { calcPrizeProgress } from '@/lib/calc'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import GrowthChart from '@/components/GrowthChart'
import { toast } from 'sonner'
import { Printer } from 'lucide-react'

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
}

type Params = { slug: string | string[] }

type Unit = 'kg' | 't'

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
    if (!team && slug) toast.error('🚫 Equipe não encontrada')
  }, [team, slug])

  const semesters = useMemo(() => team ? buildSemesters(team) : [], [team])
  const [semesterId, setSemesterId] = useState<string | null>(null)
  const [unit, setUnit] = useState<Unit>('kg')

  const selectedSemesterId = useMemo(
    () => (semesterId && semesters.some(s => s.id === semesterId))
      ? semesterId
      : semesters[0]?.id ?? null,
    [semesterId, semesters],
  )

  const activeSemester = semesters.find(s => s.id === selectedSemesterId)
  const months = activeSemester?.months ?? semesterMonths.S1
  const activeSemesterId = activeSemester?.id ?? '__none__'

  const [period, setPeriod] = useState<string>('total')

  const [totals, setTotals] = useState<Record<string, string>>({})
  const [monthly, setMonthly] = useState<Record<string, Record<string, string>>>({})

  const base = activeSemester?.base ?? {}
  const kgPerStoredUnit = 1000 // valores no data representam milhares de kg; multiplicamos por 1000 para obter kg
  const toDisplay = (valueKg: number) => (unit === 'kg' ? valueKg : valueKg / 1000)

  const baseInKg = Object.fromEntries(
    Object.entries(base || {}).map(([month, value]) => [month, (value ?? 0) * kgPerStoredUnit]),
  ) as Record<string, number>
  const baseSemesterKg = (activeSemester?.months ?? []).reduce((sum, m) => sum + (baseInKg[m] ?? 0), 0)

  const monthInputs = monthly[activeSemesterId] || Object.fromEntries(months.map(m => [m, '']))
  const totalInput = totals[activeSemesterId] || ''

  const inputToKg = (value: string) => toNumber(value) * (unit === 'kg' ? 1 : 1000)

  const monthlySumKg = months.reduce((acc, m) => acc + inputToKg(monthInputs[m] || ''), 0)
  const actualSemesterKg = period === 'total'
    ? (totalInput.trim() ? inputToKg(totalInput) : monthlySumKg)
    : monthlySumKg

  const semesterPrize = calcPrizeProgress(baseSemesterKg, actualSemesterKg)

  const selectedMonth = period === 'total' ? null : (period as Month)
  const selectedBaseKg = selectedMonth ? baseInKg[selectedMonth] || 0 : baseSemesterKg
  const selectedActualKg = selectedMonth ? inputToKg(monthInputs[selectedMonth] || '') : actualSemesterKg
  const selectedBaseDisplay = toDisplay(selectedBaseKg)
  const selectedActualDisplay = toDisplay(selectedActualKg)
  const selectedPrize = calcPrizeProgress(selectedBaseKg, selectedActualKg)

  const hasAnyInput = (() => {
    const hasTotal = totalInput.trim() !== ''
    const hasMonthly = Object.values(monthInputs || {}).some(v => (v || '').trim() !== '')
    return hasTotal || hasMonthly
  })()

  const targetForSelectedKg = selectedBaseKg + selectedPrize.growthTarget
  const targetForSemesterKg = baseSemesterKg + semesterPrize.growthTarget
  const targetForSelectedDisplay = toDisplay(targetForSelectedKg)
  const targetForSemesterDisplay = toDisplay(targetForSemesterKg)
  const chartBase = selectedBaseDisplay
  const chartActual = selectedActualDisplay
  const chartTarget = period === 'total' ? targetForSemesterDisplay : targetForSelectedDisplay

  useEffect(() => {
    if (semesterPrize.progressPercent >= 100) {
      toast.success('🏆 Prêmio máximo garantido!')
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

  const formatNumber = (value: number, minimumFractionDigits = 2, maximumFractionDigits = 2) =>
    value.toLocaleString('pt-BR', { minimumFractionDigits, maximumFractionDigits })

  const formatKg = (valueKg: number) => formatNumber(valueKg, 2, 2)
  const formatTon = (valueKg: number) => formatNumber(valueKg / 1000, 3, 3)
  const formatMassPair = (valueKg: number) => `${formatKg(valueKg)} kg / ${formatTon(valueKg)} t`

  const unitLabel = unit === 'kg' ? 'kg' : 't'

  const buildPrintHtml = () => {
    const rows = activeSemester.months.map(m => {
      const baseValueKg = baseInKg[m] ?? 0
      const realValueKg = inputToKg(monthInputs[m] || '')
      const progress = calcPrizeProgress(baseValueKg, realValueKg).progressPercent
      return {
        month: monthLabels[m],
        baseValueKg,
        realValueKg,
        progress,
      }
    })

    // Se o usuário informou um total do semestre, não exibir linhas mensais (mesmo que existam valores antigos)
    const isTotalAggregate = period === 'total' && totalInput.trim() !== ''
    const detailedRows = isTotalAggregate ? [] : rows.filter(r => r.realValueKg > 0)
    const hasDetails = detailedRows.length > 0

    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Relatório ${team.name} - ${activeSemester.label}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { margin:0; padding:32px 28px; font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif; background:#f6f8fb; color:#0f172a; }
    .container { max-width: 1100px; margin: 0 auto; }
    header { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; margin-bottom:24px; }
    h1 { margin:0; font-size:28px; }
    .subtitle { color:#475569; margin:4px 0 0; }
    .badge { display:inline-flex; align-items:center; gap:6px; background:#e0e7ff; color:#4338ca; padding:6px 10px; border-radius:999px; font-weight:600; font-size:12px; letter-spacing:0.02em; }
    .grid { display:grid; gap:14px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); margin-bottom:18px; }
    .card { background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:14px 16px; box-shadow:0 8px 24px rgba(15, 23, 42, 0.06); }
    .card h3 { margin:0 0 6px; font-size:14px; letter-spacing:0.02em; text-transform:uppercase; color:#475569; }
    .value { font-size:22px; margin:2px 0; font-weight:700; }
    .muted { color:#64748b; font-size:12px; margin:0; }
    table { width:100%; border-collapse:collapse; background:#fff; border:1px solid #e2e8f0; border-radius:14px; overflow:hidden; box-shadow:0 8px 24px rgba(15, 23, 42, 0.06); }
    th, td { padding:10px 12px; text-align:left; font-size:13px; }
    th { background:#f8fafc; color:#0f172a; letter-spacing:0.01em; }
    tbody tr:nth-child(even) { background:#fff; }
    tbody tr:nth-child(odd) { background:#fdfefe; }
    tbody tr:last-child td { border-bottom:0; }
    td { border-bottom:1px solid #e2e8f0; }
    tfoot td { font-weight:700; background:#f8fafc; }
    .progress { font-weight:600; }
    .small { font-size:11px; color:#475569; margin-top:6px; }
    .pill { display:inline-flex; align-items:center; gap:8px; background:#fff; border:1px solid #e2e8f0; border-radius:12px; padding:10px 12px; box-shadow:0 6px 18px rgba(15,23,42,0.05); }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>${team.name}</h1>
        <p class="subtitle">${activeSemester.label} • Valores em kg e t</p>
      </div>
      <div class="badge">Relatório pronto para impressão</div>
    </header>

    <div class="grid">
      <div class="card">
        <h3>Resumo do semestre</h3>
        <div class="value">${formatMassPair(actualSemesterKg)}</div>
        <p class="muted">Real acumulado (kg / t)</p>
        <p class="muted">Base: ${formatMassPair(baseSemesterKg)}</p>
      </div>
      <div class="card">
        <h3>Meta de crescimento (25%)</h3>
        <div class="value">${formatMassPair(targetForSemesterKg)}</div>
        <p class="muted">Precisa atingir: +${formatMassPair(semesterPrize.growthTarget)}</p>
      </div>
      <div class="card">
        <h3>Progresso</h3>
        <div class="value">${formatNumber(semesterPrize.progressPercent, 1, 1)}%</div>
        <p class="muted">Prêmio estimado: R$ ${formatNumber(semesterPrize.dynamicPrize)}</p>
      </div>
    </div>

    <section>
      ${hasDetails ? `
      <table>
        <thead>
          <tr>
            <th style="width:28%">Mês</th>
            <th>Base (kg / t)</th>
            <th>Real informado (kg / t)</th>
            <th>Progresso</th>
          </tr>
        </thead>
        <tbody>
          ${detailedRows.map(r => `
            <tr>
              <td>${r.month}</td>
              <td>${formatMassPair(r.baseValueKg)}</td>
              <td>${formatMassPair(r.realValueKg)}</td>
              <td class="progress">${formatNumber(r.progress, 1, 1)}%</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td>Total semestre</td>
            <td>${formatMassPair(baseSemesterKg)}</td>
            <td>${formatMassPair(actualSemesterKg)}</td>
            <td>${formatNumber(semesterPrize.progressPercent, 1, 1)}%</td>
          </tr>
        </tfoot>
      </table>
      ` : `
      <div class="card" style="display:flex; align-items:center; justify-content:space-between; gap:16px;">
        <div>
          <h3>Sem detalhamento mensal</h3>
          <p class="muted">Foi informado apenas o total do semestre.</p>
        </div>
        <div class="pill">
          <div>
            <div class="muted">Base</div>
            <div class="value" style="font-size:18px; margin:0;">${formatMassPair(baseSemesterKg)}</div>
          </div>
          <div>
            <div class="muted">Real</div>
            <div class="value" style="font-size:18px; margin:0;">${formatMassPair(actualSemesterKg)}</div>
          </div>
          <div>
            <div class="muted">Progresso</div>
            <div class="value" style="font-size:18px; margin:0;">${formatNumber(semesterPrize.progressPercent, 1, 1)}%</div>
          </div>
        </div>
      </div>
      `}
      <p class="small">Use a opção de imprimir do navegador (Ctrl+P / Command+P) para salvar em PDF ou enviar para a impressora.</p>
    </section>
  </div>
</body>
</html>
    `
  }

  const handlePrint = () => {
    if (!hasAnyInput) {
      toast.error('⚠️ Preencha algum valor antes de imprimir ou exportar.')
      return
    }
    if (typeof window === 'undefined') return
    const html = buildPrintHtml()

    const printWindow = window.open('', '_blank', 'width=900,height=900')
    if (printWindow) {
      const doc = printWindow.document
      doc.open()
      doc.write(html)
      doc.close()
      printWindow.focus()
      setTimeout(() => printWindow.print(), 120) // garante que o layout carregue antes de imprimir
      return
    }

    // Fallback via iframe (caso popup seja bloqueado)
    const iframe = document.createElement('iframe')
    iframe.style.position = 'fixed'
    iframe.style.right = '0'
    iframe.style.bottom = '0'
    iframe.style.width = '0'
    iframe.style.height = '0'
    iframe.style.border = '0'
    document.body.appendChild(iframe)
    const doc = iframe.contentWindow?.document
    if (doc) {
      doc.open()
      doc.write(html)
      doc.close()
      iframe.contentWindow?.focus()
      setTimeout(() => {
        iframe.contentWindow?.print()
        document.body.removeChild(iframe)
      }, 120)
    }
  }

  if (!team || !activeSemester) return null

  const InfoAndCharts = (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      <div className="space-y-4">
        <div className="rounded-lg border bg-card/60 p-4 shadow-sm space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">{selectedMonth ? `Mês ${selectedMonth.toUpperCase()}` : activeSemester.label}</p>
          <p>Base considerada: <b>{formatMassPair(selectedBaseKg)}</b></p>
          <p>Real informado: <b>{formatMassPair(selectedActualKg)}</b></p>
          <p>Progresso da meta: <b>{selectedPrize.progressPercent.toFixed(1)}%</b></p>
          <p className="text-lg">Prêmio estimado: <b>R$ {selectedPrize.dynamicPrize.toFixed(2)}</b></p>
        </div>

        <div className="rounded-lg border bg-card/60 p-4 shadow-sm space-y-1">
          <p className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Semestre {activeSemester.label}</p>
          <p>Base {activeSemester.label}: <b>{formatMassPair(baseSemesterKg)}</b></p>
          <p>Real acumulado: <b>{formatMassPair(actualSemesterKg)}</b></p>
          <p>Progresso da meta: <b>{semesterPrize.progressPercent.toFixed(1)}%</b></p>
          <p className="text-lg">Prêmio projetado: <b>R$ {semesterPrize.dynamicPrize.toFixed(2)}</b></p>
        </div>
      </div>

      <div className="h-full">
        <div className="h-[240px] lg:h-[260px] w-full bg-card/60 rounded-lg border p-2 shadow-sm">
          <GrowthChart
            base={chartBase}
            actual={chartActual}
            target={chartTarget}
            unit={unitLabel}
            decimals={unit === 't' ? 3 : 2}
          />
        </div>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-muted p-4 md:p-8 space-y-4 overflow-x-hidden">
      <div className="flex items-center gap-3 flex-wrap">
        {team.logo && (
          <Image src={team.logo} alt={team.name} width={60} height={60} />
        )}
        <h1 className="text-2xl font-bold flex-1 min-w-[200px]">{team.name}</h1>
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
            className="w-11 sm:w-auto px-2 sm:px-3 gap-2 cursor-pointer hover:shadow-sm transition-transform hover:-translate-y-[1px]"
            onClick={handlePrint}
            disabled={!hasAnyInput}
            aria-label="Imprimir ou exportar"
          >
            <Printer size={18} className="shrink-0" />
            <span className="hidden sm:inline">Imprimir / Exportar</span>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acompanhamento Mensal / Total</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 max-w-3xl lg:max-w-none">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
              <Select value={period} onValueChange={v => setPeriod(v as string)}>
                <SelectTrigger className="cursor-pointer hover:bg-muted/60 transition-colors">
                  <SelectValue placeholder="Total" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">TOTAL</SelectItem>
                  {months.map(m => (
                    <SelectItem key={m} value={m}>{m.toUpperCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                className="w-full lg:max-w-sm"
                type="number"
                placeholder={period === 'total' ? 'Total no semestre' : 'Venda do mês'}
                value={period === 'total' ? totalInput : monthInputs[period] || ''}
                onChange={e => handleInputChange(e.target.value)}
              />

              <Select value={unit} onValueChange={v => setUnit(v as Unit)}>
                <SelectTrigger className="w-full sm:w-[120px] lg:w-[90px] cursor-pointer hover:bg-muted/60 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="kg">kg</SelectItem>
                  <SelectItem value="t">t</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {period !== 'total' && (
              <p className="text-sm text-muted-foreground">
                Base {period.toUpperCase()} {activeSemester.label}: <b className="text-foreground">{formatMassPair(baseInKg[period] ?? 0)}</b>
              </p>
            )}

            {period === 'total' && (
              <p className="text-xs text-muted-foreground">
                Deixe em branco para usar a soma dos meses ou preencha o total acumulado ({activeSemester.label}). Unidade selecionada: {unit}.
              </p>
            )}

            <p className="text-[11px] text-muted-foreground">
              Os resultados são sempre exibidos em kg e toneladas; escolha a unidade apenas para informar os dados.
            </p>
          </div>

          {InfoAndCharts}
        </CardContent>
      </Card>
    </main>
  )
}
