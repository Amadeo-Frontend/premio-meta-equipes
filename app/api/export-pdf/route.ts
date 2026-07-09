import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit-table';

function formatNumber(num: number) {
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function formatCurrency(num: number) {
    return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function drawTrophy(doc: any, x: number, y: number, scale = 1) {
    const gold = '#fbbf24'; // amber-400
    const darkGold = '#d97706'; // amber-600
    
    doc.save();
    doc.translate(x, y);
    doc.scale(scale);
    
    // Handles
    doc.path('M 10 15 C -5 15 -5 30 12 28').lineWidth(3).stroke(gold);
    doc.path('M 40 15 C 55 15 55 30 38 28').lineWidth(3).stroke(gold);
    
    // Bowl
    doc.path('M 10 10 L 40 10 L 38 25 C 36 38 14 38 12 25 Z').fill(gold);
    
    // Stem
    doc.rect(22, 35, 6, 12).fill(darkGold);
    
    // Base
    doc.rect(15, 47, 20, 6).fill(darkGold);
    
    doc.restore();
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { teamName, base, acumulado, meta100, maxPremio } = body;

        if (!teamName || base === undefined || acumulado === undefined || meta100 === undefined || maxPremio === undefined) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        return new Promise<Response>((resolve, reject) => {
            try {
                const doc = new PDFDocument({ margin: 40, size: 'A4' });
                const chunks: Buffer[] = [];

            doc.on('data', chunk => chunks.push(chunk));
            doc.on('end', () => {
                const pdfBuffer = Buffer.concat(chunks);
                resolve(new Response(pdfBuffer, {
                    status: 200,
                    headers: {
                        'Content-Type': 'application/pdf',
                        'Content-Disposition': `attachment; filename="Relatorio_${teamName.replace(/\s+/g, '_')}.pdf"`
                    }
                }));
            });

            // Colors
            const bgColor = '#f8fafc';
            const cardBg = '#ffffff';
            const textDark = '#0f172a';
            const textMuted = '#475569';
            const textBlue = '#1d4ed8';
            
            // Chart Colors
            const barBase = '#94a3b8';
            const barReal = '#3b82f6';
            const barMeta = '#10b981';

            const pageWidth = doc.page.width;
            const pageHeight = doc.page.height;

            // --- Math Calculations ---
            const targetGrowth = meta100 - base;
            const actualGrowth = acumulado - base;
            let percentage = (actualGrowth / targetGrowth) * 100;
            if (percentage < 0) percentage = 0;
            if (!Number.isFinite(percentage)) percentage = 0;
            
            let premioGanho = 0;
            if (percentage >= 10) {
                premioGanho = maxPremio * (percentage / 100);
                if (premioGanho > maxPremio) premioGanho = maxPremio;
            }

            // ==========================================
            // BACKGROUND & HEADER
            // ==========================================
            doc.rect(0, 0, pageWidth, pageHeight).fill(bgColor);
            doc.rect(0, 0, pageWidth, 8).fill(textBlue);

            doc.y = 40;
            doc.fillColor(textDark).font('Helvetica-Bold').fontSize(24).text('Relatório Oficial de Premiação', { align: 'center' });
            doc.fillColor(textMuted).font('Helvetica').fontSize(16).text(teamName.toUpperCase(), { align: 'center' });
            
            doc.moveDown(1.5);

            // ==========================================
            // EXPLANATORY TEXT
            // ==========================================
            const explanation = `Parabéns pelos resultados neste semestre! O cálculo da sua premiação é baseado no crescimento real da equipe em relação ao volume base.\n\nA meta de 100% garante o prêmio máximo. O valor que você recebe é exatamente proporcional ao percentual dessa meta que foi alcançado (a partir de 10%). Confira abaixo os números finais do seu fechamento.`;

            doc.fillColor(textDark).font('Helvetica').fontSize(12).text(explanation, 50, doc.y, {
                width: pageWidth - 100,
                align: 'justify',
                lineGap: 4
            });

            doc.moveDown(2);

            // ==========================================
            // PRIZE CARD (THE BIG HIGHLIGHT + TROPHY)
            // ==========================================
            const cardPrizeY = doc.y;
            const cardPrizeHeight = 160;
            
            doc.roundedRect(50, cardPrizeY, pageWidth - 100, cardPrizeHeight, 12).fill(cardBg).stroke('#e2e8f0');
            
            doc.fillColor(textMuted).font('Helvetica-Bold').fontSize(12).text('PRÊMIO EXATO CONQUISTADO (SEMESTRE)', 50, cardPrizeY + 25, { align: 'center', width: pageWidth - 100 });
            
            if (premioGanho > 0) {
                const prizeStr = formatCurrency(premioGanho);
                drawTrophy(doc, pageWidth / 2 - 140, cardPrizeY + 60, 1.5);
                doc.fillColor(textBlue).font('Helvetica-Bold').fontSize(46).text(prizeStr, pageWidth / 2 - 40, cardPrizeY + 65, { lineBreak: false });
                doc.fillColor(textDark).font('Helvetica-Bold').fontSize(12).text(`Meta Alcançada: ${percentage.toFixed(1)}%`, 50, cardPrizeY + 135, { align: 'center', width: pageWidth - 100 });
            } else {
                doc.fillColor('#dc2626').font('Helvetica-Bold').fontSize(40).text('R$ 0,00', 50, cardPrizeY + 65, { align: 'center', width: pageWidth - 100 });
                doc.fillColor(textMuted).font('Helvetica').fontSize(11).text(`A equipe não atingiu o crescimento mínimo de 10%.`, 50, cardPrizeY + 120, { align: 'center', width: pageWidth - 100 });
            }

            doc.y = cardPrizeY + cardPrizeHeight + 30;

            // ==========================================
            // SUMMARY METRICS CARD
            // ==========================================
            const summaryY = doc.y;
            doc.roundedRect(50, summaryY, pageWidth - 100, 90, 10).fill(cardBg);
            
            const colWidth = (pageWidth - 100) / 3;
            
            doc.fillColor(textMuted).font('Helvetica-Bold').fontSize(10).text('VOLUME BASE', 50, summaryY + 20, { width: colWidth, align: 'center' });
            doc.fillColor(textDark).font('Helvetica-Bold').fontSize(18).text(`${formatNumber(base)} t`, 50, summaryY + 40, { width: colWidth, align: 'center' });
            
            doc.fillColor(textMuted).font('Helvetica-Bold').fontSize(10).text('VENDA REAL (ACUMULADO)', 50 + colWidth, summaryY + 20, { width: colWidth, align: 'center' });
            doc.fillColor(textBlue).font('Helvetica-Bold').fontSize(22).text(`${formatNumber(acumulado)} t`, 50 + colWidth, summaryY + 38, { width: colWidth, align: 'center' });
            
            doc.fillColor(textMuted).font('Helvetica-Bold').fontSize(10).text('META 100% (PRÊMIO MÁX.)', 50 + colWidth * 2, summaryY + 20, { width: colWidth, align: 'center' });
            doc.fillColor(textDark).font('Helvetica-Bold').fontSize(18).text(`${formatNumber(meta100)} t`, 50 + colWidth * 2, summaryY + 40, { width: colWidth, align: 'center' });

            doc.y = summaryY + 120;

            // ==========================================
            // BAR CHART CARD
            // ==========================================
            const chartCardY = doc.y;
            const chartCardHeight = 240;
            doc.roundedRect(50, chartCardY, pageWidth - 100, chartCardHeight, 12).fill(cardBg);
            
            doc.fillColor(textDark).font('Helvetica-Bold').fontSize(14).text('Gráfico de Desempenho (Toneladas)', 70, chartCardY + 20);

            const chartYBase = chartCardY + chartCardHeight - 40;
            const maxBarHeight = 130;
            const maxVal = Math.max(base, acumulado, meta100);
            
            const barWidth = 60;
            const gap = 70;
            const startX = 50 + ((pageWidth - 100) - (3 * barWidth + 2 * gap)) / 2;

            const drawBar = (x: number, val: number, color: string, label: string) => {
                const height = maxVal > 0 ? (val / maxVal) * maxBarHeight : 0;
                const y = chartYBase - height;
                
                doc.roundedRect(x, y, barWidth, height, 4).fill(color);
                doc.fillColor(textDark).font('Helvetica-Bold').fontSize(10).text(`${formatNumber(val)} t`, x - 20, y - 20, { width: barWidth + 40, align: 'center' });
                doc.fillColor(textMuted).font('Helvetica-Bold').fontSize(11).text(label, x - 20, chartYBase + 15, { width: barWidth + 40, align: 'center' });
            };

            drawBar(startX, base, barBase, 'Base (0%)');
            drawBar(startX + barWidth + gap, acumulado, barReal, `Real (${percentage.toFixed(1)}%)`);
            drawBar(startX + (barWidth + gap) * 2, meta100, barMeta, 'Meta (100%)');

            // ==========================================
            // PAGE 2: FULL TARGET TABLE
            // ==========================================
            doc.addPage();
            doc.rect(0, 0, pageWidth, 80).fill(textBlue);
            doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(22).text('Tabela de Metas e Premiação Completa', 50, 30);
            
            doc.y = 120;
            
            const fullTableRows = [];
            for (let i = 10; i <= 100; i += 10) {
                const rowGrowth = targetGrowth * (i / 100);
                const rowMeta = base + rowGrowth;
                const rowPremio = maxPremio * (i / 100);
                const crescPercent = (i / 100) * 25; 
                
                fullTableRows.push([
                    `${i}%`,
                    `+${crescPercent.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`,
                    `${formatNumber(rowMeta)} t`,
                    formatCurrency(rowPremio)
                ]);
            }

            const tableFull = {
                headers: [
                    { label: "NÍVEL", property: 'nivel', width: 80, align: 'center' },
                    { label: "CRESCIMENTO", property: 'cresc', width: 120, align: 'center' },
                    { label: "META (t)", property: 'meta', width: 150, align: 'right' },
                    { label: "PRÊMIO BASE", property: 'premio', width: 120, align: 'right' }
                ],
                rows: fullTableRows
            };

            doc.table(tableFull, {
                padding: 8,
                x: (pageWidth - 470) / 2, 
                width: 470,
                prepareHeader: () => doc.font("Helvetica-Bold").fontSize(11).fillColor(textMuted),
                prepareRow: (row: any, indexColumn: any, indexRow: any, rectRow: any) => {
                    doc.font("Helvetica").fontSize(12).fillColor(textDark);
                    
                    if (indexRow === 9) { 
                        doc.addBackground(rectRow, '#e0f2fe'); 
                        doc.font("Helvetica-Bold").fillColor(textBlue);
                    } else {
                        doc.addBackground(rectRow, indexRow % 2 === 0 ? '#ffffff' : '#f8fafc');
                    }
                },
                rectHeader: () => ({ fillColor: '#f1f5f9' })
            } as any);
            
            doc.moveDown(2);
            doc.fillColor(textMuted).font('Helvetica').fontSize(11).text('Lembrete: O prêmio exato conquistado é pago proporcionalmente ao percentual atingido, como demonstrado na primeira página.', { align: 'center' });

            doc.end();
            } catch (err) {
                reject(err);
            }
        });
    } catch (error: any) {
        console.error('Error generating PDF:', error);
        return NextResponse.json({ error: 'Failed to generate PDF', details: error.message, stack: error.stack }, { status: 500 });
    }
}
