export const userGuide = [
  [
    'Antes de empezar',
    'La web guarda tus movimientos en una base de datos privada asociada a tu cuenta. Vuelven a aparecer al iniciar sesión, incluso desde otro dispositivo. El Excel es una copia descargable independiente: editarlo o usar Apps Script en Google Sheets no modifica la base de datos de la web. No existe sincronización automática con Google.',
  ],
  [
    '1 · Registrar gastos',
    'Usa Nuevo movimiento en la web, o MI FINANZAS > Registrar gasto en Sheets. Elige categoría, fecha y método. Una compra Nu aumenta consumo y deuda, no reduce caja. No registres la cuota moto como gasto de consumo: usa Pago de deuda.',
  ],
  [
    '2 · Registrar ingresos',
    'Registra solo dinero realmente recibido. Los dos salarios esperados no se cuentan como caja. En Sheets, selecciona el ID esperado como referencia para conciliarlo.',
  ],
  [
    '3 · Prestar dinero',
    'Selecciona Préstamo e indica el nombre y descripción. Reduce caja y aumenta cuentas por cobrar. No inventes fechas históricas.',
  ],
  [
    '4 · Recibir abonos',
    'Selecciona Abono recibido y el préstamo correspondiente. Permite abonos parciales. Aumenta caja y reduce la cuenta por cobrar; no es salario ni liquida la tarjeta automáticamente.',
  ],
  [
    '5 · Nu Cajitas',
    'Usa Ahorro, Retiro de ahorro o Interés. Los aportes son transferencias; registra el interés real informado por Nu. Nunca se asume una tasa vigente.',
  ],
  [
    '6 · Inversiones',
    'Registra un aporte como Inversión. Actualiza manualmente unidades y valor actual en INVERSIONES. Aportes no son gastos de consumo; rendimientos no son salario.',
  ],
  [
    '7 · Nuevo mes',
    'Selecciona el mes y pulsa Generar nuevo mes. En Sheets usa MI FINANZAS. Genera expectativas con IDs únicos; no borra meses anteriores. La caja arrastra solo movimientos reales. Fechas de gastos sin definir permanecen vacías.',
  ],
  [
    '8 · Leer el dashboard',
    'Disponible es caja, no ingreso esperado ni cuentas por cobrar. Patrimonio incluye activos no líquidos y pasivos. La moto y su financiación son provisionales hasta contrastar contrato y extracto.',
  ],
  [
    '9 · Metas',
    'Edita objetivo, fecha y aporte mensual. Fondo de emergencia: 3 meses de compromisos esenciales ($7.125.000), objetivo ampliado 6 meses ($14.250.000). Los aportes sugeridos no se debitan automáticamente.',
  ],
  [
    'Conciliación',
    'Compara CONCILIACION con extractos. No reemplaces diferencias por ingresos inventados. Completa capital e interés de cada pago de moto en PAGOS DEUDA; los pagos no reducen capital hasta confirmar el desglose.',
  ],
  [
    'Históricos',
    'ARCHIVO HISTORICO conserva las celdas originales, no transacciones reconstruidas. Descarga también el original. Marzo carece de registro y octubre no tiene detalle. Cifras abreviadas y saldos ideales requieren revisión.',
  ],
  [
    'Financiación',
    'El cronograma parte provisionalmente de noviembre de 2026. Confirma inicio, tasa, seguros, cargos y saldo. $800.000 al 2,1% no es exactamente la cuota estándar de 24 meses. La simulación no sustituye el contrato.',
  ],
  [
    'Pagos ya incluidos en mi saldo',
    'Si pagaste la universidad y tu banco ya muestra $1.100.000, usa el acceso rápido de universidad. Mantén activada la opción Este movimiento ya está incluido en mi saldo y confirma $1.100.000. El gasto queda registrado sin descontarse dos veces. La conciliación se conserva como diferencia de caja, nunca como ingreso. Para gastos nuevos, deja esta opción desactivada.',
  ],
  [
    'Seguridad y respaldo',
    'Conserva una copia del original. No compartas públicamente la hoja. La automatización solo solicita acceso al documento activo; revisa el código antes de autorizar. Usa una copia para probar.',
  ],
]

export const appsScript = `/** Claro PFMS — instalar en el documento importado. @OnlyCurrentDoc */
function onOpen() {
  var menu = SpreadsheetApp.getUi().createMenu('MI FINANZAS');
  [['Registrar movimiento','abrirRegistro'],['Registrar ingreso','abrirIngreso'],['Registrar gasto','abrirGasto'],['Registrar préstamo','abrirPrestamo'],['Registrar abono recibido','abrirAbono'],['Registrar inversión','abrirInversion'],['Registrar interés','abrirInteres'],['Actualizar dashboard','actualizar'],['Generar nuevo mes','generarNuevoMes'],['Generar reporte mensual','generarReporte']].forEach(function(x){menu.addItem(x[0],x[1]);});
  menu.addToUi();
}
function abrirRegistro(tipo) {
  var html=HtmlService.createHtmlOutputFromFile('Registro').setTitle('Nuevo movimiento · Claro');
  html.append('<script>document.getElementById("type").value='+JSON.stringify(typeof tipo==='string'?tipo:'Gasto')+';document.getElementById("type").dispatchEvent(new Event("change"));</script>');
  SpreadsheetApp.getUi().showSidebar(html);
}
function abrirIngreso(){abrirRegistro('Ingreso');}
function abrirGasto(){abrirRegistro('Gasto');}
function abrirPrestamo(){abrirRegistro('Préstamo');}
function abrirAbono(){abrirRegistro('Abono recibido');}
function abrirInversion(){abrirRegistro('Inversión');}
function abrirInteres(){abrirRegistro('Interés');}
function actualizar() {
  var ss=SpreadsheetApp.getActive(), dash=ss.getSheetByName('INICIO DASHBOARD'), report=ss.getSheetByName('REPORTES'), snapshots=ss.getSheetByName('SNAPSHOTS');
  SpreadsheetApp.flush();
  dash.getCharts().forEach(function(c){dash.removeChart(c);});
  dash.insertChart(dash.newChart().setChartType(Charts.ChartType.COLUMN).addRange(report.getRange('A3:C15')).setPosition(3,5,0,0).setOption('title','Ingresos y gastos reales').setOption('colors',['#16836B','#C8A577']).setOption('legend',{position:'bottom'}).setOption('width',640).setOption('height',300).build());
  if(snapshots.getLastRow()>3)dash.insertChart(dash.newChart().setChartType(Charts.ChartType.LINE).addRange(snapshots.getRange(3,1,snapshots.getLastRow()-2,2)).setPosition(20,5,0,0).setOption('title','Evolución del patrimonio · snapshots').setOption('colors',['#16836B']).setOption('width',640).setOption('height',300).build());
  ss.toast('Dashboard y gráficos actualizados','Claro');
}
function datosRegistro() {
  var s=SpreadsheetApp.getActive().getSheetByName('CUENTAS POR COBRAR');
  return s.getLastRow()<4?[]:s.getRange(4,1,s.getLastRow()-3,8).getValues().filter(function(r){return Number(r[7])>0;}).map(function(r){return {id:r[0],label:r[2],balance:r[7]};});
}
function registrar(d) {
  var lock=LockService.getDocumentLock(); lock.waitLock(30000);
  try {
    var ss=SpreadsheetApp.getActive(), ledger=ss.getSheetByName('MOVIMIENTOS');
    var allowed=['Ingreso','Gasto','Préstamo','Abono recibido','Ahorro','Retiro de ahorro','Interés','Inversión','Pago de deuda'];
    if(allowed.indexOf(d.type)<0 || !Number.isFinite(Number(d.amount)) || Number(d.amount)<=0 || !/^\\d{4}-\\d{2}-\\d{2}$/.test(d.date) || !String(d.description).trim() || !d.token) throw Error('Revisa tipo, fecha, descripción e importe.');
    var date=new Date(d.date+'T12:00:00'), amount=Number(d.amount);
    if(isNaN(date.getTime()) || Utilities.formatDate(date,ss.getSpreadsheetTimeZone(),'yyyy-MM-dd')!==d.date) throw Error('Fecha inválida.');
    var id='TX-'+d.token, rows=ledger.getDataRange().getValues();
    if(rows.some(function(r){return r[0]===id;})) return 'Este movimiento ya fue registrado.';
    if(d.reference && /^(NOM|REC)-/.test(d.reference) && rows.some(function(r){return r[7]===d.reference;}))throw Error('La expectativa ya fue conciliada. No se creó un duplicado.');
    var repayRow=0;
    if(d.type==='Abono recibido') {
      var loans=ss.getSheetByName('CUENTAS POR COBRAR'), lr=loans.getDataRange().getValues();
      repayRow=lr.findIndex(function(r){return r[0]===d.reference;})+1;
      if(repayRow<4 || amount>Number(loans.getRange(repayRow,8).getValue())) throw Error('Selecciona un préstamo y un abono que no supere su saldo.');
    }
    if(d.type==='Pago de deuda' && ['NU','MOTO'].indexOf(d.reference)<0) throw Error('Selecciona NU o MOTO como referencia.');
    if(d.type==='Retiro de ahorro' && amount>Number(ss.getSheetByName('PATRIMONIO').getRange('B5').getValue()))throw Error('El retiro supera tus ahorros.');
    if(d.type==='Pago de deuda' && d.reference==='NU' && amount>Number(ss.getSheetByName('TARJETA NU').getRange('B4').getValue()))throw Error('El pago supera el saldo Nu.');
    var cash=['Ingreso','Abono recibido','Retiro de ahorro'].indexOf(d.type)>=0?amount:(d.type==='Interés'||(d.type==='Gasto'&&d.method==='Tarjeta Nu')?0:-amount);
    var saving=['Ahorro','Interés'].indexOf(d.type)>=0?amount:d.type==='Retiro de ahorro'?-amount:0;
    ledger.appendRow([id,date,d.type,d.description,amount,d.method,d.category,d.reference,cash,saving,d.type==='Inversión'?amount:0,new Date()]);
    var month=date.getMonth()+1, year=date.getFullYear(), period=date.getDate()<=15?1:2;
    if(d.type==='Ingreso') {
      var inc=ss.getSheetByName('INGRESOS'), ir=inc.getDataRange().getValues(), ix=ir.findIndex(function(r){return r[0]===d.reference && r[9]==='Esperado';});
      if(ix>=3) {inc.getRange(ix+1,1,1,11).setValues([[id,date,d.category,d.description,amount,d.method,period,month,year,'Recibido',d.reference]]);}
      else inc.appendRow([id,date,d.category,d.description,amount,d.method,period,month,year,'Recibido',d.reference]);
    }
    if(d.type==='Gasto') {
      var exp=ss.getSheetByName('GASTOS'), er=exp.getDataRange().getValues(), ex=er.findIndex(function(r){return r[0]===d.reference && r[12]==='Esperado';});
      var values=[id,date,d.description,d.category,amount,d.method,d.method==='Tarjeta Nu'?'Nu':'Bancolombia',period,month,year,'Personal','','Pagado',d.reference];
      if(ex>=3) exp.getRange(ex+1,1,1,14).setValues([values]); else exp.appendRow(values);
    }
    if(d.type==='Abono recibido') ss.getSheetByName('ABONOS').appendRow([id,d.reference,date,amount,d.method,id]);
    if(d.type==='Préstamo') {
      var c=ss.getSheetByName('CUENTAS POR COBRAR'), r=c.getLastRow()+1;
      c.appendRow([id,d.category||'Por especificar',d.description,amount,date,'','=SUMIF(ABONOS!B4:B10000,A'+r+',ABONOS!D4:D10000)','=MAX(0,D'+r+'-G'+r+')','=IF(H'+r+'=0,"Pagado",IF(F'+r+'="","Sin fecha",IF(F'+r+'<TODAY(),"Vencido","Pendiente")))','Creado desde formulario']);
    }
    if(['Ahorro','Retiro de ahorro','Interés'].indexOf(d.type)>=0) ss.getSheetByName('AHORROS NU CAJITAS').appendRow([id,date,d.reference||'Fondo de emergencia',d.type,amount,'','Registro manual']);
    if(d.type==='Inversión') {
      var inv=ss.getSheetByName('INVERSIONES'), r=inv.getLastRow()+1;
      inv.appendRow([id,d.description,d.category,d.method,date,amount,'',amount,0,'=H'+r+'-F'+r,'=IFERROR((H'+r+'+I'+r+'-F'+r+')/F'+r+',0)','Actualizar valor de mercado manualmente']);
    }
    if(d.type==='Pago de deuda') ss.getSheetByName('PAGOS DEUDA').appendRow([id,d.reference,date,amount,0,0,'Confirmar capital e interés antes de actualizar principal']);
    ss.getSheetByName('AUDITORIA').appendRow([new Date(),id,'Creación',d.description,'',amount]);
    SpreadsheetApp.flush();
    return 'Movimiento registrado. Tu dashboard está actualizado.';
  } finally {lock.releaseLock();}
}
function generarNuevoMes() {
  var ui=SpreadsheetApp.getUi(), answer=ui.prompt('Generar nuevo mes','Escribe AAAA-MM (ejemplo: 2027-01)',ui.ButtonSet.OK_CANCEL);
  if(answer.getSelectedButton()!==ui.Button.OK) return;
  var monthKey=answer.getResponseText().trim();
  if(!/^\\d{4}-(0[1-9]|1[0-2])$/.test(monthKey)||monthKey<'2026-11') {ui.alert('Mes inválido; operación desde noviembre 2026.');return;}
  var lock=LockService.getDocumentLock();lock.waitLock(30000);
  try {
    var ss=SpreadsheetApp.getActive(), parts=monthKey.split('-'), y=Number(parts[0]), m=Number(parts[1]), inc=ss.getSheetByName('INGRESOS'), exp=ss.getSheetByName('GASTOS'), fixed=ss.getSheetByName('GASTOS FIJOS').getDataRange().getValues();
    var incomeIds=inc.getDataRange().getValues().reduce(function(a,r){a[r[0]]=true;if(r[10])a[r[10]]=true;return a;},{}), expenseIds=exp.getDataRange().getValues().reduce(function(a,r){a[r[0]]=true;if(r[13])a[r[13]]=true;if(r[13]&&r[1] instanceof Date)a[r[13]+'-'+Utilities.formatDate(r[1],ss.getSpreadsheetTimeZone(),'yyyy-MM')]=true;return a;},{});
    [15,Math.min(30,new Date(y,m,0).getDate())].forEach(function(day){var id='NOM-'+monthKey+'-'+day;if(!incomeIds[id])inc.appendRow([id,new Date(y,m-1,day),'Salario','Nómina esperada',1800000,'Transferencia',day<=15?1:2,m,y,'Esperado',id]);});
    fixed.slice(3).forEach(function(r){if(r[6]!=='Sí')return;var id=r[0]+'-'+monthKey;if(expenseIds[id])return;var day=Number(r[3])||0;exp.appendRow([id,day?new Date(y,m-1,Math.min(day,new Date(y,m,0).getDate())):'',r[1],r[4],r[2],r[0]==='REC-04'?'Tarjeta Nu':'Débito Bancolombia',r[0]==='REC-04'?'Nu':'Bancolombia',day?(day<=15?1:2):'',m,y,r[5]==='Sí'?'Esencial':'Personal','Expectativa; no pagado','Esperado',r[0]]);});
    ss.getSheetByName('CONFIGURACION').getRange('B6').setValue(monthKey);
    var q=ss.getSheetByName('QUINCENAS');
    [1,2].forEach(function(p){var r=p+3,start=p===1?1:16,end=p===1?15:new Date(y,m,0).getDate();var range=function(col,type){return 'SUMIFS(MOVIMIENTOS!'+col+'4:'+col+'10000,MOVIMIENTOS!B4:B10000,">="&DATE('+y+','+m+','+start+'),MOVIMIENTOS!B4:B10000,"<="&DATE('+y+','+m+','+end+')'+(type?',MOVIMIENTOS!C4:C10000,"'+type+'"':'')+')';};q.getRange(r,2).setFormula(p===1?'=CONFIGURACION!B4+SUMIFS(MOVIMIENTOS!I4:I10000,MOVIMIENTOS!B4:B10000,"<"&DATE('+y+','+m+',1))':'=J4');q.getRange(r,4).setFormula('='+range('E','Ingreso'));q.getRange(r,6).setFormula('='+range('E','Gasto'));q.getRange(r,7).setFormula('='+range('E','Ahorro'));q.getRange(r,8).setFormula('='+range('E','Inversión'));q.getRange(r,10).setFormula('=B'+r+'+'+range('I',''));});
    [1,2].forEach(function(p){q.getRange(p+3,5).setFormula('=SUMIFS(GASTOS!E4:E10000,GASTOS!H4:H10000,'+p+',GASTOS!I4:I10000,'+m+',GASTOS!J4:J10000,'+y+',GASTOS!M4:M10000,"Esperado")');});
    ss.getSheetByName('AUDITORIA').appendRow([new Date(),monthKey,'Generar mes','Sin borrar historia','','']);
    ss.toast('Mes generado sin duplicados. Confirma fechas pendientes.','Claro');
  } finally {lock.releaseLock();}
}
function generarReporte() {
  var ss=SpreadsheetApp.getActive(), month=ss.getSheetByName('CONFIGURACION').getRange('B6').getValue(), snapshots=ss.getSheetByName('SNAPSHOTS'), found=snapshots.getDataRange().getValues().findIndex(function(r){return String(r[0])===String(month);}), row=[month,ss.getSheetByName('PATRIMONIO').getRange('B11').getValue(),ss.getSheetByName('PATRIMONIO').getRange('B4').getValue(),new Date(),'Snapshot manual; conciliar antes de cierre'];
  if(found>=3)snapshots.getRange(found+1,1,1,5).setValues([row]);else snapshots.appendRow(row);
  ss.setActiveSheet(ss.getSheetByName('REPORTES')); ss.toast('Snapshot guardado; reporte actualizado.','Claro');
}
function onEdit(e) {
  if(!e||!e.range||e.range.getSheet().getName()==='AUDITORIA')return;
  var audit=e.source.getSheetByName('AUDITORIA');
  if(audit)audit.appendRow([new Date(),e.range.getSheet().getName()+'!'+e.range.getA1Notation(),'Edición manual',e.range.getNumRows()*e.range.getNumColumns()>1?'Edición múltiple: revisar historial de versiones':'Celda editada',e.oldValue===undefined?'Sin valor anterior disponible':e.oldValue,e.value===undefined?'Edición múltiple o borrado':e.value]);
}
`

export const sidebarHtml = `<!DOCTYPE html><html lang="es"><head><base target="_top"><style>body{font:14px system-ui;color:#203b34;background:#f7f9f8;padding:18px}h2{font-size:24px}label{display:block;margin:15px 0 6px}input,select,button{box-sizing:border-box;width:100%;padding:11px;border:1px solid #dce5e0;border-radius:7px;background:white}button{background:#16836b;color:white;border:0;margin-top:20px;font-weight:600}p{line-height:1.6}#message{font-size:13px}</style></head><body><h2>Un movimiento.<br>Todo en orden.</h2><p>Registra solo operaciones confirmadas.</p><form id="form"><label>Tipo</label><select name="type" id="type"><option>Gasto</option><option>Ingreso</option><option>Préstamo</option><option>Abono recibido</option><option>Ahorro</option><option>Retiro de ahorro</option><option>Interés</option><option>Inversión</option><option>Pago de deuda</option></select><label>Descripción</label><input name="description" required maxlength="200"><label>Monto COP</label><input name="amount" type="number" min="1" step="1" required><label>Fecha</label><input name="date" type="date" required><label>Categoría / deudor</label><input name="category" value="Otros" required><label>Método / plataforma</label><select name="method"><option>Débito Bancolombia</option><option>Tarjeta Nu</option><option>Efectivo</option><option>Transferencia</option><option>Otro</option></select><label id="refLabel">Referencia opcional (ID esperado o meta)</label><input name="reference" id="reference" list="loans"><datalist id="loans"></datalist><p id="hint"></p><button id="submit">Registrar movimiento</button></form><p id="message" role="status"></p><script>document.querySelector('[name=date]').value=new Date().toLocaleDateString('en-CA');var token=crypto.randomUUID();google.script.run.withSuccessHandler(function(rows){var list=document.getElementById('loans');list.replaceChildren();rows.forEach(function(r){var option=document.createElement('option');option.value=r.id;option.textContent=r.label+' — '+r.balance;list.appendChild(option);});}).datosRegistro();document.getElementById('type').onchange=function(){var t=this.value;document.getElementById('refLabel').textContent=t==='Abono recibido'?'ID del préstamo (obligatorio)':t==='Pago de deuda'?'Deuda: NU o MOTO (obligatorio)':'Referencia opcional (ID esperado o meta)';document.getElementById('reference').required=t==='Abono recibido'||t==='Pago de deuda';document.getElementById('hint').textContent=t==='Abono recibido'?'Recibir dinero no paga automáticamente tu deuda Nu.':t==='Interés'?'Registra el interés real informado por Nu.':'';};document.getElementById('form').onsubmit=function(e){e.preventDefault();var b=document.getElementById('submit');b.disabled=true;var d=Object.fromEntries(new FormData(this));d.token=token;google.script.run.withSuccessHandler(function(message){document.getElementById('message').textContent=message;token=crypto.randomUUID();b.disabled=false;document.querySelector('[name=amount]').value='';}).withFailureHandler(function(err){document.getElementById('message').textContent=err.message;b.disabled=false;}).registrar(d);};</script></body></html>`
