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
  const baseInTon = Object.fromEntries(
    Object.entries(base || {}).map(([month, value]) => [month, value ?? 0]),
  ) as Record<string, number>
  const baseSemesterTon = (activeSemester?.months ?? []).reduce((sum, m) => sum + (baseInTon[m] ?? 0), 0)

  const monthInputs = monthly[activeSemesterId] || Object.fromEntries(months.map(m => [m, '']))
  const totalInput = totals[activeSemesterId] || ''

  const inputToTon = (value: string) => toNumber(value)

  const actualSemesterTon = period === 'total'
    ? (totalInput.trim() ? inputToTon(totalInput) : months.reduce((acc, m) => acc + inputToTon(monthInputs[m] || ''), 0))
    : months.reduce((acc, m) => acc + inputToTon(monthInputs[m] || ''), 0)

  const semesterPrize = calcPrizeProgress(baseSemesterTon, actualSemesterTon)

  const monthlyPrizeDetails = months.map(m => {
    const bTon = baseInTon[m] ?? 0
    const aTon = inputToTon(monthInputs[m] || '')
    return calcPrizeProgress(bTon, aTon)
  })
  const monthlyPrizesSum = monthlyPrizeDetails.reduce((sum, p) => sum + p.dynamicPrize, 0)

  const selectedMonth = period === 'total' ? null : (period as Month)
  const selectedBaseTon = selectedMonth ? baseInTon[selectedMonth] || 0 : baseSemesterTon
  const selectedActualTon = selectedMonth ? inputToTon(monthInputs[selectedMonth] || '') : actualSemesterTon
  const selectedPrize = calcPrizeProgress(selectedBaseTon, selectedActualTon)

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

  const buildPrintHtml = () => {
    if (!activeSemester || !team) return ''
    const rows = activeSemester.months.map(m => {
      const baseValueTon = baseInTon[m] ?? 0
      const realValueTon = inputToTon(monthInputs[m] || '')
      const progress = calcPrizeProgress(baseValueTon, realValueTon).progressPercent
      return {
        month: monthLabels[m],
        baseValueTon,
        realValueTon,
        progress,
      }
    })

    // Se o usuário informou um total do semestre, não exibir linhas mensais
    const isTotalAggregate = period === 'total' && totalInput.trim() !== ''
    const detailedRows = isTotalAggregate ? [] : rows.filter(r => r.realValueTon > 0)
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
    body { margin:0; padding:32px 28px; font-family: "Outfit", "Inter", system-ui, sans-serif; background:#f8fafc; color:#0f172a; }
    .container { max-width: 1100px; margin: 0 auto; }
    header { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; margin-bottom:24px; }
    h1 { margin:0; font-size:28px; font-weight: 800; letter-spacing: -0.02em; }
    .subtitle { color:#64748b; margin:4px 0 0; font-weight: 500; }
    .badge { display:inline-flex; align-items:center; gap:6px; background:#eff6ff; color:#2563eb; padding:8px 14px; border-radius:999px; font-weight:700; font-size:12px; border: 1px solid #dbeafe; }
    .grid { display:grid; gap:16px; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); margin-bottom:24px; }
    .card { background:#fff; border:1px solid #e2e8f0; border-radius:16px; padding:20px; box-shadow:0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    .card h3 { margin:0 0 8px; font-size:12px; letter-spacing:0.05em; text-transform:uppercase; color:#64748b; font-weight: 700; }
    .value { font-size:24px; margin:2px 0; font-weight:800; color: #1e293b; }
    .muted { color:#94a3b8; font-size:12px; margin:0; font-weight: 500; }
    table { width:100%; border-collapse:collapse; background:#fff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden; box-shadow:0 4px 6px -1px rgba(0, 0, 0, 0.1); }
    th, td { padding:14px 16px; text-align:left; font-size:14px; }
    th { background:#f1f5f9; color:#475569; font-weight: 700; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
     td { border-bottom:1px solid #f1f5f9; color: #334155; }
    tfoot td { font-weight:800; background:#f8fafc; color: #0f172a; }
    .progress { font-weight:700; color: #2563eb; }
    .small { font-size:11px; color:#94a3b8; margin-top:12px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div>
        <h1>${team.name}</h1>
        <p class="subtitle">${activeSemester.label} • Valores em toneladas (t)</p>
      </div>
      <div class="badge">Relatório Consolidado</div>
    </header>

    <div class="grid">
      <div class="card">
        <h3>Resumo Real</h3>
        <div class="value">${formatTon(actualSemesterTon)}</div>
        <p class="muted">Base: ${formatTon(baseSemesterTon)}</p>
      </div>
      <div class="card">
        <h3>Crescimento (25%)</h3>
        <div class="value">${formatTon(baseSemesterTon + semesterPrize.growthTarget)}</div>
        <p class="muted">Meta: +${formatTon(semesterPrize.growthTarget)}</p>
      </div>
      <div class="card">
        <h3>Resultados</h3>
        <div class="value" style="color: #2563eb;">R$ ${formatNumber(semesterPrize.dynamicPrize)}</div>
        <p class="muted">Prêmio Projetado</p>
        <div class="value" style="font-size:18px; color: #059669; margin-top:8px;">R$ ${formatNumber(monthlyPrizesSum)}</div>
        <p class="muted">Prêmio Acumulado</p>
      </div>
    </div>

    <section>
      ${hasDetails ? `
      <table>
        <thead>
          <tr>
            <th style="width:25%">Mês</th>
            <th>Base (t)</th>
            <th>Venda Real (t)</th>
            <th>Progresso</th>
          </tr>
        </thead>
        <tbody>
          ${detailedRows.map(r => `
            <tr>
              <td>${r.month}</td>
              <td>${formatTon(r.baseValueTon)}</td>
              <td>${formatTon(r.realValueTon)}</td>
              <td class="progress">${formatNumber(r.progress, 1, 1)}%</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td>Total Semestre</td>
            <td>${formatTon(baseSemesterTon)}</td>
            <td>${formatTon(actualSemesterTon)}</td>
            <td class="progress">${formatNumber(semesterPrize.progressPercent, 1, 1)}%</td>
          </tr>
        </tfoot>
      </table>
      ` : `
      <div class="card" style="text-align: center; padding: 40px;">
          <h3 style="margin-bottom: 16px;">Total do Semestre</h3>
          <div style="display: flex; justify-content: center; gap: 32px;">
            <div><p class="muted">Base</p><div class="value">${formatTon(baseSemesterTon)}</div></div>
            <div><p class="muted">Real</p><div class="value">${formatTon(actualSemesterTon)}</div></div>
            <div><p class="muted">Progresso</p><div class="value" style="color: #2563eb;">${formatNumber(semesterPrize.progressPercent, 1, 1)}%</div></div>
          </div>
      </div>
      `}
      <p class="small">Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
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
    if (!team || !activeSemester) return
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
                <span className="text-xs font-medium text-muted-foreground">Prêmio Projetado (Semestre)</span>
                <span className="text-sm font-bold text-blue-600">R$ {semesterPrize.dynamicPrize.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">PRÊMIO ACUMULADO (MENSAL)</span>
                <span className="text-3xl font-black text-emerald-600 leading-none">R$ {monthlyPrizesSum.toFixed(2)}</span>
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
