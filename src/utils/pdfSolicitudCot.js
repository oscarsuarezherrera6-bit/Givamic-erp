import jsPDF from 'jspdf'
import { fmtDate } from './helpers'

/* ── colores ─────────────────────────────────────────────── */
const NK  = [30, 30, 30]
const BL  = [30, 58, 95]    // azul corporativo
const WHT = [255, 255, 255]
const LGR = [230, 230, 230]
const GR  = [108, 108, 108]
const BG  = [245, 247, 250]  // gris muy claro para filas alternas

/* ── helpers ─────────────────────────────────────────────── */
function rect(doc, x, y, w, h, fill, stroke) {
  if (fill)   { doc.setFillColor(...fill);   doc.rect(x, y, w, h, 'F') }
  if (stroke) { doc.setDrawColor(...stroke); doc.rect(x, y, w, h, 'S') }
}

function text(doc, txt, x, y, opts = {}) {
  doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
  doc.setFontSize(opts.fs || 8)
  doc.setTextColor(...(opts.color || NK))
  doc.text(String(txt ?? ''), x, y, { align: opts.align || 'left' })
}

function cell(doc, x, y, w, h, txt, opts = {}) {
  rect(doc, x, y, w, h, opts.bg || null, opts.border !== false ? LGR : null)
  doc.setFont('helvetica', opts.bold ? 'bold' : 'normal')
  doc.setFontSize(opts.fs || 7.5)
  doc.setTextColor(...(opts.color || NK))
  const align = opts.align || 'left'
  const px = align === 'right' ? x + w - 1.5
    : align === 'center' ? x + w / 2
    : x + 1.5
  const lines = doc.splitTextToSize(String(txt ?? ''), w - 3)
  if (lines.length > 1 && opts.multiline) {
    lines.forEach((l, i) => doc.text(l, px, y + 3.5 + i * 3.5, { align }))
  } else {
    doc.text(lines[0] ?? '', px, y + h / 2 + (opts.fs || 7.5) * 0.35, { align })
  }
}

/* ── generador ───────────────────────────────────────────── */
export function generarPDFSolicitudCot(sc, logo) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const PW = 210
  const ML = 10
  const MR = 10
  const W  = PW - ML - MR  // 190mm
  let y = 10

  // Fecha de generación del documento (hoy)
  const today = new Date()
  const todayStr = today.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })

  /* ══ HEADER ═══════════════════════════════════════════════ */
  // Logo con aspect ratio preservado (max 28w x 14h)
  if (logo) {
    try {
      const img = new Image()
      img.src = logo
      const ratio = img.naturalWidth / img.naturalHeight || 2
      const lh = Math.min(14, 28 / ratio)
      const lw = lh * ratio
      doc.addImage(logo, 'PNG', ML, y + (14 - lh) / 2, lw, lh)
    } catch (_) {}
  }
  // Título central
  rect(doc, ML + 30, y, W - 30 - 48, 14, BL, null)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(...WHT)
  doc.text('SISTEMA INTEGRADO DE GESTIÓN', ML + 30 + (W - 30 - 48) / 2, y + 5, { align: 'center' })
  doc.setFontSize(11)
  doc.text('FORMATO DE SOLICITUD DE COTIZACIÓN', ML + 30 + (W - 30 - 48) / 2, y + 10.5, { align: 'center' })
  // Código / versión / fecha
  const CW = 48
  const CX = ML + W - CW
  rect(doc, CX, y, CW, 4.7, null, LGR)
  rect(doc, CX, y + 4.7, CW, 4.7, null, LGR)
  rect(doc, CX, y + 9.4, CW, 4.6, null, LGR)
  text(doc, `CÓDIGO:  SIG-FO-111`, CX + 1.5, y + 3.5, { fs: 6.5 })
  text(doc, `VERSIÓN:  001`,        CX + 1.5, y + 8.2, { fs: 6.5 })
  text(doc, `FECHA:  ${todayStr}`, CX + 1.5, y + 12.8, { fs: 6.5 })
  y += 17

  /* ══ DATOS GENERALES ═══════════════════════════════════════ */
  rect(doc, ML, y, W, 5, BL, null)
  text(doc, 'DATOS GENERALES DE SOLICITUD', ML + 1.5, y + 3.5, { fs: 7.5, bold: true, color: WHT })
  y += 5

  // Fila 1: empresa | ruc | n° solicitud | fecha solicitud
  const labels1 = ['EMPRESA SOLICITANTE', 'RUC', 'N° DE SOLICITUD', 'FECHA DE SOLICITUD']
  const vals1   = [
    sc.empresaSolicitante || 'GIVAMIC INVERSIONES S.A.C.',
    sc.ruc                || '20545534046',
    sc.numero             || '',
    todayStr,
  ]
  const ws1 = [68, 28, 38, 56]
  let xi = ML
  labels1.forEach((lbl, i) => {
    rect(doc, xi, y, ws1[i], 4.5, [235, 238, 245], LGR)
    text(doc, lbl, xi + 1.5, y + 3.2, { fs: 6, bold: true, color: GR })
    xi += ws1[i]
  })
  y += 4.5
  xi = ML
  vals1.forEach((val, i) => {
    rect(doc, xi, y, ws1[i], 5, null, LGR)
    text(doc, val, xi + 1.5, y + 3.5, { fs: 7.5, bold: i < 2 })
    xi += ws1[i]
  })
  y += 5

  // Fila 2: fecha límite | tipo de compra | plazos entrega
  const labels2 = ['FECHA LÍMITE PARA ENVÍO DE COTIZACIÓN', 'TIPO DE COMPRA', 'PLAZOS DE ENTREGA']
  const vals2   = [
    fmtDate(sc.fechaLimite || ''),
    sc.tipoCompra    || '',
    sc.plazosEntrega || '',
  ]
  const ws2 = [68, 38, 84]
  xi = ML
  labels2.forEach((lbl, i) => {
    rect(doc, xi, y, ws2[i], 4.5, [235, 238, 245], LGR)
    text(doc, lbl, xi + 1.5, y + 3.2, { fs: 6, bold: true, color: GR })
    xi += ws2[i]
  })
  y += 4.5
  xi = ML
  vals2.forEach((val, i) => {
    rect(doc, xi, y, ws2[i], 5, null, LGR)
    text(doc, val, xi + 1.5, y + 3.5, { fs: 7.5 })
    xi += ws2[i]
  })
  y += 5

  /* ══ DATOS DE CONTACTO ════════════════════════════════════ */
  y += 1
  rect(doc, ML, y, W, 5, BL, null)
  text(doc, 'DATOS DE CONTACTO', ML + 1.5, y + 3.5, { fs: 7.5, bold: true, color: WHT })
  y += 5

  const labelsC = ['NOMBRE Y APELLIDOS', 'CARGO', 'TELÉFONO', 'CORREO ELECTRÓNICO']
  const valsC   = [
    sc.contactoNombre   || '',
    sc.contactoCargo    || '',
    sc.contactoTelefono || '',
    sc.contactoEmail    || '',
  ]
  const wsC = [55, 45, 30, 60]
  xi = ML
  labelsC.forEach((lbl, i) => {
    rect(doc, xi, y, wsC[i], 4.5, [235, 238, 245], LGR)
    text(doc, lbl, xi + 1.5, y + 3.2, { fs: 6, bold: true, color: GR })
    xi += wsC[i]
  })
  y += 4.5
  xi = ML
  valsC.forEach((val, i) => {
    rect(doc, xi, y, wsC[i], 5, null, LGR)
    text(doc, val, xi + 1.5, y + 3.5, { fs: 7.5 })
    xi += wsC[i]
  })
  y += 5

  /* ══ DESCRIPCIÓN DE LA SOLICITUD ══════════════════════════ */
  y += 1
  rect(doc, ML, y, W, 5, BL, null)
  text(doc, 'DESCRIPCIÓN DE LA SOLICITUD', ML + 1.5, y + 3.5, { fs: 7.5, bold: true, color: WHT })
  y += 5

  // Cabeceras tabla
  const COL = [
    { label: 'N°',                                           w: 9,  align: 'center' },
    { label: 'DESCRIPCIÓN DEL BIEN / SERVICIO SOLICITADO',  w: 60, align: 'left'   },
    { label: 'MARCA / MODELO\n(si aplica)',                  w: 32, align: 'center' },
    { label: 'UNIDAD\nDE MEDIDA',                            w: 22, align: 'center' },
    { label: 'CANTIDAD',                                     w: 20, align: 'center' },
    { label: 'ESPECIFICACIONES TÉCNICAS, SST Y/O\nMEDIO AMBIENTALES A CUMPLIR', w: 47, align: 'left' },
  ]
  const TH = 8
  xi = ML
  COL.forEach(c => {
    rect(doc, xi, y, c.w, TH, [30, 58, 95], LGR)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6)
    doc.setTextColor(...WHT)
    const lines = c.label.split('\n')
    const startY = y + (TH - lines.length * 3.5) / 2 + 2.5
    lines.forEach((l, li) => doc.text(l, xi + c.w / 2, startY + li * 3.5, { align: 'center' }))
    xi += c.w
  })
  y += TH

  // Filas de items (mínimo 15 filas o lo que haya)
  const items = sc.items || []
  const MIN_ROWS = 15
  const totalRows = Math.max(items.length, MIN_ROWS)
  const ROW_H = 7

  for (let i = 0; i < totalRows; i++) {
    const it  = items[i] || {}
    const bg  = i % 2 === 0 ? null : BG
    xi = ML
    const cols_data = [
      { v: String(i + 1).padStart(2, '0'), align: 'center' },
      { v: it.descripcion || '', align: 'left' },
      { v: it.marcaModelo || '', align: 'center' },
      { v: it.unidad || '', align: 'center' },
      { v: it.cantidad != null ? it.cantidad : '', align: 'center' },
      { v: it.especificaciones || '', align: 'left' },
    ]
    COL.forEach((c, ci) => {
      rect(doc, xi, y, c.w, ROW_H, bg, LGR)
      const d = cols_data[ci]
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...NK)
      const px = d.align === 'center' ? xi + c.w / 2 : xi + 1.5
      if (d.v) {
        const lines = doc.splitTextToSize(String(d.v), c.w - 3)
        doc.text(lines[0], px, y + ROW_H / 2 + 1.2, { align: d.align })
      }
      xi += c.w
    })
    y += ROW_H

    // Nueva página si se acerca el borde
    if (y > 255 && i < totalRows - 1) {
      doc.addPage()
      y = 15
    }
  }

  /* ══ TEXTO LEGAL ══════════════════════════════════════════ */
  y += 2
  const legal = 'Mediante el envío de la presente cotización, el proveedor declara que cumple, o puede cumplir, con los requisitos técnicos, de Seguridad y Salud en el Trabajo (SST), medio ambiente y antisoborno aplicables al bien y/o servicio solicitado. En caso pueda cumplir con los requisitos, sírvase enviar su cotización detallada dentro del plazo indicado.'
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(6.5)
  doc.setTextColor(...GR)
  const legalLines = doc.splitTextToSize(legal, W)
  doc.text(legalLines, ML, y)
  y += legalLines.length * 3.2 + 3

  /* ══ INSTRUCCIONES AL PROVEEDOR (pág. 2) ═════════════════ */
  doc.addPage()
  y = 15

  // Header simple pág 2
  rect(doc, ML, y, W, 8, BL, null)
  text(doc, 'INSTRUCCIONES AL PROVEEDOR — SIG-FO-111', ML + W / 2, y + 5, { fs: 10, bold: true, color: WHT, align: 'center' })
  y += 12

  const instrucciones = [
    { n: '1.', t: 'En su cotización debe responder explícitamente si cumple con las especificaciones técnicas y requisitos SST y/o Medio Ambiente: CUMPLE / CUMPLE PARCIAL / NO CUMPLE.' },
    { n: '1.1.', t: 'Si es PARCIAL o NO CUMPLE, debe detallar las diferencias y si puede subsanarlas en un tiempo prudente.' },
    { n: '2.', t: 'Si se requiere documentación (ficha técnica, MSDS, certificados), debe adjuntarla al correo junto con su cotización.' },
    { n: '3.', t: 'En la cotización debe especificar según aplique:' },
  ]

  instrucciones.forEach(ins => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...BL)
    doc.text(ins.n, ML, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...NK)
    const lines = doc.splitTextToSize(ins.t, W - 10)
    doc.text(lines, ML + 8, y)
    y += lines.length * 4 + 2
  })

  // Lista de especificaciones requeridas
  const specs = [
    'Cumplimiento de ESPECIFICACIONES TÉCNICAS: (CUMPLE / CUMPLE PARCIAL / NO CUMPLE)',
    'Garantía (si aplica): [plazo y alcance]',
    'Plazo de entrega / ejecución: [N° días o fecha comprometida]',
    'Vigencia de la cotización: [N° días calendario]',
    'Lugar de entrega / ejecución: [Dirección o sede]',
    'Descuentos (si los hay): [Sí/No] – [% o monto]',
    'Forma de pago: [Al contado / A crédito / Otros]',
    'Experiencia en bienes/servicios similares: [Sí/No]',
    'Conflicto de intereses e integridad (ISO 37001): [No existe / Existe]',
  ]

  specs.forEach(s => {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...NK)
    doc.text('•', ML + 10, y)
    const lines = doc.splitTextToSize(s, W - 16)
    doc.text(lines, ML + 14, y)
    y += lines.length * 3.8 + 1
  })

  y += 4
  rect(doc, ML, y, W, 18, [255, 251, 235], LGR)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...[146, 64, 14])
  doc.text('TEXTO SUGERIDO PARA INCLUIR EN SU COTIZACIÓN:', ML + 2, y + 4)
  doc.setFont('helvetica', 'italic')
  doc.setFontSize(7)
  doc.setTextColor(...NK)
  const textoDecl = '"Declaramos bajo juramento que nuestra cotización cumple con las especificaciones y requisitos aplicables; si hay cumplimiento parcial/no cumplimiento, detallamos diferencias y sustento. Adjuntamos la documentación solicitada cuando aplique. Declaramos además no tener conflicto de intereses ni haber realizado ofrecimientos indebidos (antisoborno). La información es veraz y verificable."'
  const declLines = doc.splitTextToSize(textoDecl, W - 4)
  doc.text(declLines, ML + 2, y + 8)
  y += 22

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...[185, 28, 28])
  const important = 'IMPORTANTE: La cotización SIN respuesta de cumplimiento y SIN adjuntos aplicables podrá ser descartada del proceso de evaluación.'
  doc.text(important, ML, y)

  // Footer
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)
    doc.setTextColor(...GR)
    doc.text(`SIG-FO-111 v001 | ${sc.empresaSolicitante || 'GIVAMIC INVERSIONES S.A.C.'} | Página ${p} de ${totalPages}`, PW / 2, 290, { align: 'center' })
  }

  const nombre = `SC-${sc.numero || 'solicitud'}.pdf`
  doc.save(nombre)
}
