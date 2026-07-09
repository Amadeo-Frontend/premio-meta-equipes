const fs = require('fs');
const PDFDocument = require('pdfkit-table');

function formatNumber(num) {
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function formatCurrency(num) {
    return 'R$ ' + num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function drawTrophy(doc, x, y, scale = 1) {
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

function createPdf(filename, teamName, base, acumulado, meta100, maxPremio) {
    // Portrait A4 for an explanatory report
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(fs.createWriteStream(filename));

    // Colors
    const bgColor = '#f8fafc'; // Very light slate for background
    const cardBg = '#ffffff';
    const textDark = '#0f172a'; // Slate 900
    const textMuted = '#475569'; // Slate 600
    const textBlue = '#1d4ed8'; // Blue 700
    
    // Chart Colors
    const barBase = '#94a3b8'; // Slate 400
    const barReal = '#3b82f6'; // Blue 500
    const barMeta = '#10b981'; // Emerald 500

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // --- Math Calculations ---
    const targetGrowth = meta100 - base;
    const actualGrowth = acumulado - base;
    let percentage = (actualGrowth / targetGrowth) * 100;
    if (percentage < 0) percentage = 0;
    
    let premioGanho = 0;
    if (percentage >= 10) {
        premioGanho = maxPremio * (percentage / 100);
        if (premioGanho > maxPremio) premioGanho = maxPremio;
    }

    // ==========================================
    // FULL TARGET TABLE
    // ==========================================
    doc.rect(0, 0, pageWidth, 80).fill(textBlue);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(22).text('Tabela de Metas e Premiação Completa: ' + teamName, 50, 30);
    
    doc.y = 120;
    
    const fullTableRows = [];
    for (let i = 10; i <= 100; i += 10) {
        const rowGrowth = targetGrowth * (i / 100);
        const rowMeta = base + rowGrowth;
        const rowPremio = maxPremio * (i / 100);
        const crescPercent = (i / 100) * 25; // 100% = +25% growth over base
        
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
        x: (pageWidth - 470) / 2, // 80 + 120 + 150 + 120 = 470
        width: 470,
        prepareHeader: () => doc.font("Helvetica-Bold").fontSize(11).fillColor(textMuted),
        prepareRow: (row, indexColumn, indexRow, rectRow) => {
            doc.font("Helvetica").fontSize(12).fillColor(textDark);
            
            // Highlight the 100% row
            if (indexRow === 9) { // 100% row
                doc.addBackground(rectRow, '#e0f2fe'); // light blue
                doc.font("Helvetica-Bold").fillColor(textBlue);
            } else {
                doc.addBackground(rectRow, indexRow % 2 === 0 ? '#ffffff' : '#f8fafc');
            }
        },
        rectHeader: () => ({ fillColor: '#f1f5f9' })
    });
    
    doc.end();
}

// Lunch Dog
createPdf(
    'Equipe_Lunch_Dog_Projecao_S2.pdf',
    'Equipe Lunch Dog',
    1874.483,
    1874.483,
    1874.483 * 1.25,
    10000
);

// Varejo & Snack
createPdf(
    'Equipe_Varejo_Snack_Projecao_S2.pdf',
    'Equipe Varejo & Snack',
    355.255,
    355.255,
    355.255 * 1.25,
    5000
);

// Imbramil
createPdf(
    'Equipe_Imbramil_Projecao_S2.pdf',
    'Equipe Imbramil',
    331.222,
    331.222,
    331.222 * 1.25,
    5000
);

console.log("PDFs explicativos de projeção (S2) gerados com sucesso!");
