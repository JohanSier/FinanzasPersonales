import ExcelJS from 'exceljs'
import JSZip from 'jszip'
import { amortize, type Movement, type Fixed, type Goal, type FinanceData } from './finance'
import { appsScript, sidebarHtml, userGuide } from './automation'

const money = '"$"#,##0;[Red]-"$"#,##0'
export async function buildWorkbook(
  movements: Movement[] = [],
  fixed: Fixed[] = [],
  goals: Goal[] = [],
  selectedMonth = '2026-11',
  plans: Record<string, Fixed[]> = {},
  source?: Pick<FinanceData, 'config' | 'loans' | 'history'>,
) {
  const debts = source?.loans ?? []
  const history = source?.history ?? []
  const book = new ExcelJS.Workbook()
  book.creator = 'Claro · Finanzas personales'
  book.created = new Date()
  book.calcProperties.fullCalcOnLoad = true
  book.addWorksheet('INICIO DASHBOARD', {
    views: [{ state: 'frozen', ySplit: 3 }],
  })
  const sheet = (
    name: string,
    headers: string[],
    rows: (string | number | Date | null | ExcelJS.CellFormulaValue)[][] = [],
  ) => {
    const ws =
      book.getWorksheet(name) ||
      book.addWorksheet(name, {
        views: [{ state: 'frozen', ySplit: 3 }],
        properties: { tabColor: { argb: 'FF16836B' } },
      })
    ws.mergeCells(1, 1, 1, headers.length)
    ws.getCell('A1').value = 'CLARO  /  ' + name
    ws.getRow(1).height = 38
    ws.getCell('A1').font = {
      name: 'Aptos',
      size: 18,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    }
    ws.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF142D2A' },
    }
    ws.addRow([])
    ws.addRow(headers)
    ws.getRow(3).height = 28
    ws.getRow(3).eachCell((c) => {
      c.font = { bold: true, color: { argb: 'FF365A51' }, size: 10 }
      c.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE7F2ED' },
      }
    })
    rows.forEach((r) => ws.addRow(r))
    ws.columns.forEach((c, i) => {
      c.width = i === 0 ? 26 : 24
    })
    ws.autoFilter = {
      from: { row: 3, column: 1 },
      to: { row: Math.max(3, ws.rowCount), column: headers.length },
    }
    for (let r = 4; r <= ws.rowCount; r++) {
      ws.getRow(r).height = 25
      ws.getRow(r).eachCell((c) => {
        c.font = {
          name: 'Aptos',
          size: 11,
          color: {
            argb: c.type === ExcelJS.ValueType.Formula ? 'FF202938' : 'FF2563A0',
          },
        }
        if (r % 2 === 0)
          c.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF5F8F7' },
          }
        if (typeof c.value === 'number' || c.type === ExcelJS.ValueType.Formula) c.numFmt = money
        if (c.value instanceof Date) c.numFmt = 'dd/mm/yyyy'
        c.alignment = { vertical: 'middle', wrapText: true }
        c.protection = { locked: c.type === ExcelJS.ValueType.Formula }
      })
    }
    return ws
  }
  const formula = (s: string, result?: number) => ({
    formula: s,
    ...(result === undefined ? {} : { result }),
  })
  const config = sheet(
    'CONFIGURACION',
    ['Parámetro', 'Valor', 'Observación'],
    [
      [
        'Saldo inicial Bancolombia',
        source?.config.openingCash ?? 0,
        'Saldo real confirmado; consultar conciliaciones, no es ingreso',
      ],
      [
        'Ingreso mensual esperado',
        source?.config.monthlyIncome ?? 0,
        'No recibido hasta su registro',
      ],
      ['Mes seleccionado', selectedMonth, 'AAAA-MM; editable'],
      ['Tasa moto mensual', source?.config.motoRate ?? 0, 'Por validar contra contrato'],
      [
        'Capital inicial moto',
        source?.config.motoPrincipal ?? 0,
        'Saldo inicial provisional; confirmar extracto',
      ],
      [
        'Valor estimado moto',
        source?.config.motoMarketValue ?? 0,
        'Referencia: precio de compra, no avalúo confirmado',
      ],
      ['Nu avance inicial', source?.config.nuAdvance ?? 0, 'Incluido una sola vez como deuda Nu'],
      ['Fondo emergencia meses', 3, 'Meta ampliada: 6 meses'],
      ['Salario base', 2340000, 'Composición del ingreso mensual'],
      ['Auxilios', 1260000, 'Composición del ingreso mensual'],
      ['Límite tarjeta Nu', null, 'Pendiente: registrar cupo real'],
      ['Corte tarjeta Nu', null, 'Pendiente: día de corte'],
      ['Pago tarjeta Nu', null, 'Pendiente: fecha de pago'],
      ['Inicio operación', '2026-11-01', 'Historia original preservada por separado'],
    ],
  )
  config.getCell('B7').numFmt = '0.0%'
  const income = sheet('INGRESOS', [
    'ID',
    'Fecha',
    'Fuente',
    'Descripción',
    'Monto',
    'Método',
    'Quincena',
    'Mes',
    'Año',
    'Estado',
    'Referencia',
  ])
  const expenses = sheet('GASTOS', [
    'ID',
    'Fecha',
    'Descripción',
    'Categoría',
    'Monto',
    'Método',
    'Cuenta',
    'Quincena',
    'Mes',
    'Año',
    'Tipo',
    'Notas',
    'Estado',
    'Recurrente ID',
  ])
  const [year, month] = selectedMonth.split('-').map(Number)
  const monthlyPlans = { [selectedMonth]: fixed, ...plans }
  for (const [planMonth, snapshot] of Object.entries(monthlyPlans).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const [year, month] = planMonth.split('-').map(Number)
    for (const day of [15, Math.min(30, new Date(year, month, 0).getDate())]) {
      const id = `NOM-${planMonth}-${day}`
      if (!movements.some((m) => m.type === 'Ingreso' && m.reference === id))
        income.addRow([
          id,
          new Date(year, month - 1, day),
          'Salario',
          'Nómina esperada',
          1800000,
          'Transferencia',
          day <= 15 ? 1 : 2,
          month,
          year,
          'Esperado',
          id,
        ])
    }
    snapshot
      .filter((f) => f.active && !movements.some((m) => m.reference === `${f.id}-${planMonth}`))
      .forEach((f) =>
        expenses.addRow([
          `${f.id}-${planMonth}`,
          f.day
            ? new Date(year, month - 1, Math.min(f.day, new Date(year, month, 0).getDate()))
            : null,
          f.name,
          f.category,
          f.amount,
          f.id === 'REC-04' ? 'Tarjeta Nu' : 'Débito Bancolombia',
          f.id === 'REC-04' ? 'Nu' : 'Bancolombia',
          f.day ? (f.day <= 15 ? 1 : 2) : null,
          month,
          year,
          f.essential ? 'Esencial' : 'Personal',
          f.day ? 'Fecha configurada' : 'Confirmar fecha; estimación mensual',
          'Esperado',
          f.id,
        ]),
      )
  }
  movements.forEach((m) => {
    const d = new Date(m.date + 'T12:00:00')
    if (m.type === 'Ingreso')
      income.addRow([
        m.id,
        d,
        m.category,
        m.description,
        m.amount,
        m.method,
        d.getDate() <= 15 ? 1 : 2,
        d.getMonth() + 1,
        d.getFullYear(),
        'Recibido',
        m.reference,
      ])
    if (m.type === 'Gasto')
      expenses.addRow([
        m.id,
        d,
        m.description,
        m.category,
        m.amount,
        m.method,
        m.method === 'Tarjeta Nu' ? 'Nu' : 'Bancolombia',
        d.getDate() <= 15 ? 1 : 2,
        d.getMonth() + 1,
        d.getFullYear(),
        'Personal',
        '',
        'Pagado',
        m.reference,
      ])
  })
  sheet(
    'GASTOS FIJOS',
    [
      'ID recurrente',
      'Descripción',
      'Monto mensual',
      'Día de pago',
      'Categoría',
      'Esencial',
      'Activo',
      'Vigente desde',
    ],
    fixed.map((f) => [
      f.id,
      f.name,
      f.amount,
      f.day,
      f.category,
      f.essential ? 'Sí' : 'No',
      f.active ? 'Sí' : 'No',
      selectedMonth,
    ]),
  )
  const ledger = sheet('MOVIMIENTOS', [
    'ID',
    'Fecha',
    'Tipo',
    'Descripción',
    'Monto',
    'Método',
    'Categoría',
    'Referencia',
    'Impacto caja',
    'Impacto ahorro',
    'Impacto inversión',
    'Creado',
    'Conciliación de caja',
  ])
  movements.forEach((m, i) => {
    const r = i + 4
    ledger.addRow([
      m.id,
      new Date(m.date + 'T12:00:00'),
      m.type,
      m.description,
      m.amount,
      m.method,
      m.category,
      m.reference,
      formula(
        `IF(OR(C${r}="Ingreso",C${r}="Abono recibido",C${r}="Retiro de ahorro"),E${r},IF(OR(C${r}="Interés",AND(C${r}="Gasto",F${r}="Tarjeta Nu")),0,-E${r}))+M${r}`,
      ),
      formula(`IF(OR(C${r}="Ahorro",C${r}="Interés"),E${r},IF(C${r}="Retiro de ahorro",-E${r},0))`),
      formula(`IF(C${r}="Inversión",E${r},0)`),
      m.created,
      m.cashAdjustment ?? 0,
    ])
  })
  const cxc = sheet('CUENTAS POR COBRAR', [
    'ID',
    'Deudor',
    'Descripción',
    'Monto prestado',
    'Fecha préstamo',
    'Fecha esperada',
    'Reintegrado',
    'Saldo pendiente',
    'Estado',
    'Notas',
  ])
  debts.forEach((d, i) => {
    const r = i + 4
    cxc.addRow([
      d.id,
      'Padre',
      d.description,
      d.amount,
      null,
      d.due ? new Date(d.due + 'T12:00:00') : null,
      formula(`SUMIFS(ABONOS!D$4:D$10000,ABONOS!B$4:B$10000,A${r})`),
      formula(`MAX(0,D${r}-G${r})`),
      formula(
        `IF(H${r}=0,"Pagado",IF(F${r}="","Sin fecha",IF(F${r}<TODAY(),"Vencido","Pendiente")))`,
      ),
      d.id === 'CXC-08'
        ? 'Ventana esperada: 27/11–03/12/2026. No garantizado. Destino: deuda Nu.'
        : 'Fecha de préstamo y pago por confirmar',
    ])
  })
  const repayments = sheet('ABONOS', [
    'ID',
    'Préstamo ID',
    'Fecha',
    'Monto',
    'Método',
    'Movimiento ID',
  ])
  movements
    .filter((m) => m.type === 'Abono recibido')
    .forEach((m) =>
      repayments.addRow([
        m.id,
        m.reference,
        new Date(m.date + 'T12:00:00'),
        m.amount,
        m.method,
        m.id,
      ]),
    )
  sheet(
    'CUENTAS POR PAGAR',
    [
      'ID',
      'Acreedor',
      'Descripción',
      'Original',
      'Saldo',
      'Tasa mensual',
      'Fecha vencimiento',
      'Cuota',
      'Estado',
    ],
    [
      [
        'MOTO',
        'Financiera · confirmar',
        'Financiación Suzuki Gixxer',
        13850000,
        formula(
          `MAX(0,CONFIGURACION!B8-SUMIF('PAGOS DEUDA'!B4:B10000,"MOTO",'PAGOS DEUDA'!E4:E10000))`,
        ),
        0.021,
        'Cada día 5',
        800000,
        'Saldo y contrato por verificar',
      ],
      [
        'NU',
        'Nu',
        'Avance de nómina para padre',
        2065000,
        formula(`'TARJETA NU'!B4`),
        null,
        null,
        null,
        'Verificar extracto; no sumar avance dos veces',
      ],
    ],
  )
  sheet(
    'PAGOS DEUDA',
    [
      'ID',
      'Deuda ID',
      'Fecha',
      'Pago total',
      'Capital confirmado',
      'Interés confirmado',
      'Observaciones',
    ],
    movements
      .filter((m) => m.type === 'Pago de deuda')
      .map((m) => [
        m.id,
        m.reference,
        new Date(m.date + 'T12:00:00'),
        m.amount,
        0,
        0,
        'Completar distribución capital/interés con extracto; no reducir capital sin confirmar',
      ]),
  )
  const savings = sheet(
    'AHORROS NU CAJITAS',
    ['ID', 'Fecha', 'Meta', 'Tipo', 'Monto', 'Tasa efectiva informada', 'Notas'],
    movements
      .filter((m) => ['Ahorro', 'Retiro de ahorro', 'Interés'].includes(m.type))
      .map((m) => [
        m.id,
        new Date(m.date + 'T12:00:00'),
        m.reference || 'Fondo de emergencia',
        m.type,
        m.amount,
        null,
        'Tasa manual; no se presume rendimiento',
      ]),
  )
  savings.getColumn(6).numFmt = '0.00%'
  sheet(
    'INVERSIONES',
    [
      'ID',
      'Inversión',
      'Tipo',
      'Plataforma',
      'Compra',
      'Capital invertido',
      'Unidades',
      'Valor actual manual',
      'Ganancia realizada',
      'Ganancia no realizada',
      'Retorno',
      'Objetivo',
    ],
    movements
      .filter((m) => m.type === 'Inversión')
      .map((m, i) => [
        m.id,
        m.description,
        m.category,
        m.method,
        new Date(m.date + 'T12:00:00'),
        m.amount,
        null,
        m.amount,
        0,
        formula(`H${i + 4}-F${i + 4}`),
        formula(`IFERROR((H${i + 4}+I${i + 4}-F${i + 4})/F${i + 4},0)`),
        'Valor inicial al costo; actualizar manualmente',
      ]),
  )
  sheet(
    'PROYECTOS',
    [
      'ID',
      'Proyecto',
      'Descripción',
      'Inversión inicial',
      'Inversiones adicionales',
      'Costo operativo',
      'Ingresos reales',
      'Ingresos proyectados',
      'Valor estimado',
      'Beneficio neto',
      'ROI',
      'Lanzamiento',
      'Estado',
    ],
    [
      [
        'PRY-01',
        'Mi próximo proyecto',
        'Completar antes de invertir',
        0,
        0,
        0,
        0,
        0,
        null,
        formula('G4-D4-E4-F4'),
        formula('IFERROR(J4/(D4+E4),0)'),
        null,
        'Idea · sin ingresos confirmados',
      ],
    ],
  )
  sheet(
    'TARJETA NU',
    ['Indicador', 'Valor', 'Nota'],
    [
      [
        'Saldo pendiente',
        formula(
          `CONFIGURACION!B10+SUMIFS(GASTOS!E4:E10000,GASTOS!F4:F10000,"Tarjeta Nu",GASTOS!M4:M10000,"Pagado")-SUMIFS(MOVIMIENTOS!E4:E10000,MOVIMIENTOS!C4:C10000,"Pago de deuda",MOVIMIENTOS!H4:H10000,"NU")`,
        ),
        'El avance se cuenta una sola vez',
      ],
      ['Cupo de crédito', formula('CONFIGURACION!B14'), 'Completar valor real'],
      ['Cupo disponible', formula('MAX(0,B5-B4)'), 'Solo válido al configurar cupo'],
      ['Spotify mensual esperado', 10000, 'No es una compra real hasta registrar el cargo'],
      ['Avance inicial', 2065000, 'Recibido en nombre del padre; pasivo inicial, no ingreso nuevo'],
      ['Corte', null, 'Configurar con extracto'],
      ['Fecha de pago', null, 'Configurar con extracto'],
    ],
  )
  sheet(
    'MOTO TRACKER',
    [
      'Cuota',
      'Fecha estimada',
      'Saldo inicial',
      'Interés',
      'Pago',
      'Abono capital',
      'Saldo final',
      'Interés acumulado',
      'Extra capital',
    ],
    amortize().map((a, i) => {
      const r = i + 4
      return [
        i + 1,
        new Date(2026, 10 + i, 5),
        i ? formula(`G${r - 1}`) : formula('CONFIGURACION!B8'),
        formula(`ROUND(C${r}*CONFIGURACION!B7,0)`),
        formula(`MIN(C${r}+D${r},800000+I${r})`),
        formula(`E${r}-D${r}`),
        formula(`MAX(0,C${r}-F${r})`),
        formula(`SUM(D$4:D${r})`),
        0,
      ]
    }),
  )
  sheet(
    'COSTOS MOTO',
    ['ID', 'Fecha', 'Tipo', 'Descripción', 'Monto', 'Movimiento ID'],
    movements
      .filter((m) => m.category === 'Moto' && m.type === 'Gasto')
      .map((m) => [
        m.id,
        new Date(m.date + 'T12:00:00'),
        'Propiedad',
        m.description,
        m.amount,
        m.id,
      ]),
  )
  sheet(
    'METAS FINANCIERAS',
    [
      'ID',
      'Meta',
      'Objetivo',
      'Saldo actual',
      'Fecha meta',
      'Aporte mensual',
      'Prioridad',
      'Progreso',
      'Restante',
      'Meses estimados',
    ],
    goals.map((g, i) => {
      const r = i + 4
      return [
        g.id,
        g.name,
        g.target,
        g.id === 'META-02'
          ? 0
          : g.id === 'META-03'
            ? formula('SUM(MOVIMIENTOS!K4:K10000)')
            : formula(`SUMIF(MOVIMIENTOS!H4:H10000,A${r},MOVIMIENTOS!J4:J10000)`),
        new Date(g.deadline + 'T12:00:00'),
        g.monthly,
        i === 0 ? 'Alta' : 'Media',
        formula(`IFERROR(D${r}/C${r},0)`),
        formula(`MAX(0,C${r}-D${r})`),
        formula(`IFERROR(ROUNDUP(I${r}/F${r},0),0)`),
      ]
    }),
  )
  sheet(
    'PATRIMONIO',
    ['Concepto', 'Valor', 'Clasificación', 'Nota'],
    [
      [
        'Bancolombia disponible',
        formula('CONFIGURACION!B4+SUM(MOVIMIENTOS!I4:I10000)'),
        'Activo líquido',
        'Conciliar con extracto',
      ],
      [
        'Ahorros Nu',
        formula('SUM(MOVIMIENTOS!J4:J10000)'),
        'Activo ahorro',
        'No sumar nuevamente a caja',
      ],
      ['Inversiones', formula('SUM(INVERSIONES!H4:H10000)'), 'Activo inversión', 'Valor manual'],
      [
        'Cuentas por cobrar',
        formula(`SUM('CUENTAS POR COBRAR'!H4:H10000)`),
        'Activo no líquido',
        'No disponible para gastar',
      ],
      [
        'Moto valor estimado',
        formula('CONFIGURACION!B9'),
        'Activo estimado',
        'Actualizar avalúo; precio compra como referencia',
      ],
      [
        'Crédito moto',
        formula(`'CUENTAS POR PAGAR'!E4`),
        'Pasivo',
        'Provisional hasta conciliar contrato',
      ],
      [
        'Tarjeta Nu y avance',
        formula(`'TARJETA NU'!B4`),
        'Pasivo',
        'Avance ya incluido; no duplicar',
      ],
      [
        'Patrimonio neto',
        formula('SUM(B4:B8)-SUM(B9:B10)'),
        'Total',
        'Estimado: incluye moto y financiación no conciliadas',
      ],
    ],
  )
  sheet(
    'QUINCENAS',
    [
      'Periodo',
      'Saldo inicial',
      'Ingreso esperado',
      'Recibido',
      'Fijos esperados',
      'Gasto registrado',
      'Ahorro',
      'Inversión',
      'Negocios',
      'Saldo cierre real',
    ],
    [1, 2].map((period, i) => {
      const r = i + 4
      const start = new Date(year, month - 1, period === 1 ? 1 : 16)
      const end = new Date(year, month - 1, period === 1 ? 15 : new Date(year, month, 0).getDate())
      const range = (col: string, type: string) =>
        `SUMIFS(MOVIMIENTOS!${col}4:${col}10000,MOVIMIENTOS!B4:B10000,">="&DATE(${year},${month},${start.getDate()}),MOVIMIENTOS!B4:B10000,"<="&DATE(${year},${month},${end.getDate()})${
          type ? `,MOVIMIENTOS!C4:C10000,"${type}"` : ''
        })`
      return [
        period,
        period === 1
          ? formula(
              `CONFIGURACION!B4+SUMIFS(MOVIMIENTOS!I4:I10000,MOVIMIENTOS!B4:B10000,"<"&DATE(${year},${month},1))`,
            )
          : formula('J4'),
        1800000,
        formula(range('E', 'Ingreso')),
        formula(
          `SUMIFS(GASTOS!E4:E10000,GASTOS!H4:H10000,A${r},GASTOS!I4:I10000,${month},GASTOS!J4:J10000,${year},GASTOS!M4:M10000,"Esperado")`,
        ),
        formula(range('E', 'Gasto')),
        formula(range('E', 'Ahorro')),
        formula(range('E', 'Inversión')),
        0,
        formula(`B${r}+${range('I', '')}`),
      ]
    }),
  )
  sheet(
    'PROYECCIONES',
    ['Horizonte meses', 'Conservador', 'Realista', 'Optimista', 'Supuestos'],
    [1, 3, 6, 12].map((h, i) => {
      const r = i + 4
      return [
        h,
        formula(
          `PATRIMONIO!B4+A${r}*(3600000-SUMIF('GASTOS FIJOS'!F4:F1000,"Sí",'GASTOS FIJOS'!C4:C1000))`,
        ),
        formula(`PATRIMONIO!B4+A${r}*(3600000-SUM('GASTOS FIJOS'!C4:C1000)-400000)`),
        formula(`C${r}+5885000`),
        'Modelo, no garantía. Realista: aportes 400.000/mes. Optimista: recuperación total padre. Ajustar supuestos.',
      ]
    }),
  )
  sheet(
    'REPORTES',
    ['Mes', 'Ingreso real', 'Gasto consumo', 'Ahorro neto', 'Tasa ahorro'],
    Array.from({ length: 12 }, (_, i) => {
      const r = i + 4
      return [
        `${year}-${String(i + 1).padStart(2, '0')}`,
        formula(
          `SUMIFS(INGRESOS!E4:E10000,INGRESOS!H4:H10000,${i + 1},INGRESOS!I4:I10000,${year},INGRESOS!J4:J10000,"Recibido")`,
        ),
        formula(
          `SUMIFS(GASTOS!E4:E10000,GASTOS!I4:I10000,${i + 1},GASTOS!J4:J10000,${year},GASTOS!M4:M10000,"Pagado")`,
        ),
        formula(
          `SUMIFS(MOVIMIENTOS!J4:J10000,MOVIMIENTOS!B4:B10000,">="&DATE(${year},${i + 1},1),MOVIMIENTOS!B4:B10000,"<"&DATE(${year},${i + 2},1))`,
        ),
        formula(`IFERROR(D${r}/B${r},0)`),
      ]
    }),
  )
  sheet('SNAPSHOTS', ['Mes', 'Patrimonio al cierre', 'Caja conciliada', 'Registrado', 'Nota'])
  sheet(
    'CONCILIACION',
    ['Fecha', 'Cuenta', 'Saldo sistema', 'Saldo extracto', 'Diferencia', 'Nota'],
    [
      [
        null,
        'Bancolombia',
        formula('PATRIMONIO!B4'),
        null,
        formula('IF(D4="","",D4-C4)'),
        'No ajustar caja automáticamente; documentar diferencias.',
      ],
    ],
  )
  sheet(
    'AUDITORIA',
    ['Fecha registro', 'ID', 'Acción', 'Descripción', 'Valor anterior', 'Valor nuevo'],
    movements.map((m) => [m.created, m.id, 'Creación', m.description, null, m.amount]),
  )
  sheet(
    'ARCHIVO HISTORICO',
    ['Hoja original', 'Celda', 'Contenido original', 'Fórmula original', 'Verificación'],
    history.map((h) => [
      'Hoja 1',
      h.cell,
      h.value,
      h.formula,
      'Fuente original íntegra. Notas/estimaciones: no importadas como transacciones.',
    ]),
  )
  sheet(
    'REVISION MIGRACION',
    ['Hallazgo', 'Estado', 'Acción requerida'],
    [
      [
        'Una hoja original inspeccionada: Hoja 1',
        'Preservada',
        'Respaldo original incluido por separado',
      ],
      [
        'Enero–octubre 2026 con notas y cifras abreviadas',
        'Por verificar',
        'No asumir que 1.500 representa $1.500.000',
      ],
      ['Marzo no tiene registro mensual', 'Sin datos', 'No inventar transacciones'],
      [
        'Octubre sin movimientos detallados',
        'Incompleto',
        'Conservar metas; no tratarlas como saldos reales',
      ],
      ['Saldos ideales y ahorros futuros', 'Proyecciones', 'No sumar al saldo operativo'],
      [
        'Sin identificadores únicos históricos',
        'Duplicados no verificables',
        'Revisión manual antes de normalizar; evitar importación doble',
      ],
      [
        'Buses presente en historia',
        'Retirado de operación',
        'Conservado en archivo; no generado a futuro',
      ],
      [
        'Financiación: cuota $800.000, tasa 2,1%, 24 meses',
        'Contrato pendiente',
        `Cuota estándar 24 meses ≈ $${Math.round((13850000 * 0.021) / (1 - Math.pow(1.021, -24)))}; cronograma provisional, no validado`,
      ],
      [
        'Avance Nu inicial',
        'Por conciliar',
        'Verificar que ya está incluido en saldo de tarjeta; se registra una sola vez',
      ],
    ],
  )
  sheet('GUIA', ['Tema', 'Instrucción'], userGuide)
  const dash = sheet(
    'INICIO DASHBOARD',
    ['Indicador', 'Valor', 'Contexto'],
    [
      [
        'Ingresos recibidos del mes',
        formula(
          `SUMIFS(INGRESOS!E4:E10000,INGRESOS!H4:H10000,${month},INGRESOS!I4:I10000,${year},INGRESOS!J4:J10000,"Recibido")`,
        ),
        'No incluye nómina esperada',
      ],
      [
        'Gastos pagados del mes',
        formula(
          `SUMIFS(GASTOS!E4:E10000,GASTOS!I4:I10000,${month},GASTOS!J4:J10000,${year},GASTOS!M4:M10000,"Pagado")`,
        ),
        'Consumo; no incluye aportes o capital de deuda',
      ],
      ['Dinero disponible', formula('PATRIMONIO!B4'), 'Saldo inicial + movimientos de caja'],
      ['Ahorros acumulados', formula('PATRIMONIO!B5'), 'Contribuciones + interés − retiros'],
      ['Portafolio', formula('PATRIMONIO!B6'), 'Actualización manual'],
      ['Dinero por cobrar', formula('PATRIMONIO!B7'), 'No es efectivo disponible'],
      ['Pasivos totales', formula('SUM(PATRIMONIO!B9:B10)'), 'Avance Nu incluido una sola vez'],
      ['Patrimonio neto estimado', formula('PATRIMONIO!B11'), 'Conciliar moto y saldos'],
      [
        'Tasa de ahorro',
        formula(
          'IFERROR(SUMIFS(MOVIMIENTOS!E4:E10000,MOVIMIENTOS!C4:C10000,"Ahorro",MOVIMIENTOS!B4:B10000,">="&DATE(' +
            year +
            ',' +
            month +
            ',1),MOVIMIENTOS!B4:B10000,"<"&DATE(' +
            year +
            ',' +
            (month + 1) +
            ',1))/B4,0)',
        ),
        'Solo con ingreso efectivamente recibido',
      ],
      ['Ingreso esperado', 3600000, '15 y 30; último día si febrero'],
      [
        'Fijos esperados',
        formula(`SUMIF('GASTOS FIJOS'!G4:G1000,"Sí",'GASTOS FIJOS'!C4:C1000)`),
        'Fechas sin confirmar no se marcan vencidas',
      ],
      [
        'Meta emergencia 3 meses',
        formula(`SUMIF('GASTOS FIJOS'!F4:F1000,"Sí",'GASTOS FIJOS'!C4:C1000)*3`),
        'Base: compromisos esenciales de caja, incluye cuota moto',
      ],
      ['Meta emergencia 6 meses', formula('B15*2'), 'Objetivo extendido'],
    ],
  )
  dash.getCell('B12').numFmt = '0.0%'
  const selectedYear = 'VALUE(LEFT(CONFIGURACION!B6,4))'
  const selectedMonthNumber = 'VALUE(RIGHT(CONFIGURACION!B6,2))'
  const firstDay = `DATE(${selectedYear},${selectedMonthNumber},1)`
  const afterLastDay = `DATE(${selectedYear},${selectedMonthNumber}+1,1)`
  dash.getCell('B4').value = formula(
    `SUMIFS(INGRESOS!E4:E10000,INGRESOS!H4:H10000,${selectedMonthNumber},INGRESOS!I4:I10000,${selectedYear},INGRESOS!J4:J10000,"Recibido")`,
  )
  dash.getCell('B5').value = formula(
    `SUMIFS(GASTOS!E4:E10000,GASTOS!I4:I10000,${selectedMonthNumber},GASTOS!J4:J10000,${selectedYear},GASTOS!M4:M10000,"Pagado")`,
  )
  dash.getCell('B12').value = formula(
    `IFERROR(SUMIFS(MOVIMIENTOS!E4:E10000,MOVIMIENTOS!C4:C10000,"Ahorro",MOVIMIENTOS!B4:B10000,">="&${firstDay},MOVIMIENTOS!B4:B10000,"<"&${afterLastDay})/B4,0)`,
  )
  dash.getCell('B15').value = formula(
    `SUMIFS('GASTOS FIJOS'!C4:C1000,'GASTOS FIJOS'!F4:F1000,"Sí",'GASTOS FIJOS'!G4:G1000,"Sí")*3`,
  )
  const reports = book.getWorksheet('REPORTES')!
  for (let i = 0; i < 12; i++) {
    const r = i + 4
    reports.getCell(`A${r}`).value = formula(`TEXT(DATE(${selectedYear},${i + 1},1),"yyyy-mm")`)
    reports.getCell(`B${r}`).value = formula(
      `SUMIFS(INGRESOS!E4:E10000,INGRESOS!H4:H10000,${i + 1},INGRESOS!I4:I10000,${selectedYear},INGRESOS!J4:J10000,"Recibido")`,
    )
    reports.getCell(`C${r}`).value = formula(
      `SUMIFS(GASTOS!E4:E10000,GASTOS!I4:I10000,${i + 1},GASTOS!J4:J10000,${selectedYear},GASTOS!M4:M10000,"Pagado")`,
    )
    reports.getCell(`D${r}`).value = formula(
      `SUMIFS(MOVIMIENTOS!J4:J10000,MOVIMIENTOS!B4:B10000,">="&DATE(${selectedYear},${i + 1},1),MOVIMIENTOS!B4:B10000,"<"&DATE(${selectedYear},${i + 2},1))`,
    )
  }
  const projections = book.getWorksheet('PROYECCIONES')!
  for (let r = 4; r <= 7; r++) {
    projections.getCell(`B${r}`).value = formula(
      `PATRIMONIO!B4+A${r}*(CONFIGURACION!B5-SUMIFS('GASTOS FIJOS'!C4:C1000,'GASTOS FIJOS'!F4:F1000,"Sí",'GASTOS FIJOS'!G4:G1000,"Sí"))`,
    )
    projections.getCell(`C${r}`).value = formula(
      `PATRIMONIO!B4+A${r}*(CONFIGURACION!B5-SUMIF('GASTOS FIJOS'!G4:G1000,"Sí",'GASTOS FIJOS'!C4:C1000)-400000)`,
    )
    projections.getCell(`D${r}`).value = formula(
      `C${r}+IF(A${r}>=2,SUM('CUENTAS POR COBRAR'!H4:H10000),0)`,
    )
  }
  const percentageColumns: Record<string, number[]> = {
    INVERSIONES: [11],
    'METAS FINANCIERAS': [8],
    PROYECTOS: [11],
    REPORTES: [5],
  }
  const integerColumns: Record<string, number[]> = {
    INGRESOS: [7, 8, 9],
    GASTOS: [8, 9, 10],
    'GASTOS FIJOS': [4],
    'MOTO TRACKER': [1],
    QUINCENAS: [1],
    PROYECCIONES: [1],
    'METAS FINANCIERAS': [10],
  }
  book.eachSheet((ws) => {
    percentageColumns[ws.name]?.forEach((c) => (ws.getColumn(c).numFmt = '0.0%'))
    integerColumns[ws.name]?.forEach((c) => (ws.getColumn(c).numFmt = '0'))
    if (ws.name === 'CONFIGURACION') ws.getCell('B11').numFmt = '0'
    if (ws.name === 'ARCHIVO HISTORICO' || ws.name === 'GUIA') {
      ws.getColumn(ws.name === 'GUIA' ? 2 : 3).width = 90
      ws.eachRow((row, r) => {
        if (r >= 4)
          row.height = Math.min(
            480,
            Math.max(
              35,
              String(row.getCell(ws.name === 'GUIA' ? 2 : 3).value)
                .split('\n')
                .reduce((total, line) => total + Math.max(1, Math.ceil(line.length / 85)), 0) * 15,
            ),
          )
      })
    }
    if (['INGRESOS', 'GASTOS'].includes(ws.name)) {
      ws.getColumn(2).numFmt = 'dd/mm/yyyy'
      ws.getColumn(5).numFmt = money
    }
    if (ws.name === 'GASTOS')
      for (let r = 4; r < 504; r++) {
        ws.getCell(`D${r}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [
            '"Educación,Transporte,Moto,Alimentación,Familia,Entretenimiento,Suscripciones,Compras,Salud,Tecnología,Viajes,Otros"',
          ],
        }
        ws.getCell(`M${r}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"Esperado,Pagado,Pausado"'],
        }
        ws.getCell(`F${r}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: ['"Débito Bancolombia,Tarjeta Nu,Efectivo,Transferencia,Otro"'],
        }
      }
  })
  const goalsSheet = book.getWorksheet('METAS FINANCIERAS')!
  const progressRule: ExcelJS.DataBarRuleType & {
    color: Partial<ExcelJS.Color>
  } = {
    type: 'dataBar',
    priority: 1,
    minLength: 0,
    maxLength: 100,
    showValue: true,
    gradient: false,
    cfvo: [
      { type: 'num', value: 0 },
      { type: 'num', value: 1 },
    ],
    color: { argb: 'FF92BEA2' },
  }
  goalsSheet.addConditionalFormatting({
    ref: `H4:H${Math.max(4, goalsSheet.rowCount)}`,
    rules: [progressRule],
  })
  book.getWorksheet('CUENTAS POR COBRAR')!.addConditionalFormatting({
    ref: 'A4:J10000',
    rules: [
      {
        type: 'expression',
        priority: 2,
        formulae: ['$I4="Vencido"'],
        style: {
          fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFDECEC' },
          },
          font: { color: { argb: 'FFAA4444' } },
        },
      },
    ],
  })
  book.getWorksheet('GASTOS')!.addConditionalFormatting({
    ref: 'A4:N10000',
    rules: [
      {
        type: 'expression',
        priority: 2,
        formulae: ['AND($M4="Esperado",$B4<>"",$B4<TODAY())'],
        style: {
          fill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFF6E6' },
          },
        },
      },
    ],
  })
  for (const name of ['INICIO DASHBOARD', 'PATRIMONIO', 'METAS FINANCIERAS', 'MOTO TRACKER']) {
    const ws = book.getWorksheet(name)!
    await ws.protect('', {
      selectLockedCells: true,
      selectUnlockedCells: true,
      autoFilter: true,
      spinCount: 1000,
      insertRows: true,
    })
  }
  return book
}
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
export async function downloadWorkbook(
  movements: Movement[],
  fixed: Fixed[],
  goals: Goal[],
  month: string,
  plans: Record<string, Fixed[]> = {},
  source?: Pick<FinanceData, 'config' | 'loans' | 'history'>,
) {
  const book = await buildWorkbook(movements, fixed, goals, month, plans, source)
  const data = await book.xlsx.writeBuffer()
  downloadBlob(
    new Blob([data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `Claro-Finanzas-${month}.xlsx`,
  )
}
export async function downloadAutomation() {
  const zip = new JSZip()
  zip.file('Codigo.gs', appsScript)
  zip.file('Registro.html', sidebarHtml)
  zip.file(
    'LEEME.txt',
    '1. Importa el Excel en Google Sheets.\n2. Abre Extensiones > Apps Script.\n3. Pega Codigo.gs. Crea un archivo HTML llamado Registro y pega Registro.html.\n4. Guarda y recarga la hoja. Autoriza al usar MI FINANZAS.\n5. La automatización debe probarse en una copia antes de operar. No se ha ejecutado en tu cuenta.\n\n' +
      userGuide.map((r) => r.join(': ')).join('\n'),
  )
  downloadBlob(
    new Blob([(await zip.generateAsync({ type: 'uint8array' })) as BlobPart], {
      type: 'application/zip',
    }),
    'Claro-Automatizacion-Google-Sheets.zip',
  )
}
