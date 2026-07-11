/**
 * exportUtils.js — Utilidades de exportación para GIVAMIC ERP
 * Excel (ExcelJS con estilos completos), PDF (jsPDF + autotable), ZIP (JSZip)
 */
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import JSZip from 'jszip'

// ── Helpers ────────────────────────────────────────────────────────────────────
export function fmtDateFile(d = new Date()) {
  const dd = String(d.getDate()).padStart(2,'0')
  const mm = String(d.getMonth()+1).padStart(2,'0')
  const yy = d.getFullYear()
  return `${dd}${mm}${yy}`
}

function fmtDateHour(d = new Date()) {
  return d.toLocaleString('es-PE', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })
}

export function buildFilename(modulo, filtroLabel = '') {
  const hoy = fmtDateFile()
  const filtro = filtroLabel ? `_${filtroLabel.replace(/\s+/g,'').replace(/[^a-zA-Z0-9_-]/g,'')}` : ''
  return `${modulo}${filtro}_generado${hoy}`
}

// ── Colores GIVAMIC ────────────────────────────────────────────────────────────
const C = {
  azul:        'FF1E3A5F',
  azulClaro:   'FFE8EDF5',
  azulMedio:   'FFCAD5E8',
  blanco:      'FFFFFFFF',
  grisClaro:   'FFF8FAFC',
  grisMedio:   'FFE2E8F0',
  texto:       'FF1E293B',
  textoGris:   'FF64748B',
  verde:       'FF16A34A',
  rojo:        'FFDC2626',
  ambar:       'FFD97706',
}

function cell(value, style = {}) {
  return { value, style }
}

// ── EXCEL con ExcelJS ──────────────────────────────────────────────────────────
export async function exportExcel(rows, columns, filename, meta = {}) {
  const wb = new ExcelJS.Workbook()
  wb.creator  = 'GIVAMIC ERP'
  wb.created  = new Date()
  wb.modified = new Date()

  const ws = wb.addWorksheet(meta.modulo || 'Reporte', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
    views: [{ state: 'frozen', ySplit: 5 }], // congela encabezado
  })

  const nCols = columns.length

  // ── Fila 1: Título ──────────────────────────────────────────────────────────
  ws.addRow([`GIVAMIC ERP  —  ${meta.modulo || 'Reporte'}`])
  ws.mergeCells(1, 1, 1, nCols)
  const titleCell = ws.getCell('A1')
  titleCell.font      = { bold: true, size: 14, color: { argb: C.blanco }, name: 'Calibri' }
  titleCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.azul } }
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  ws.getRow(1).height = 28

  // ── Fila 2: Filtros ─────────────────────────────────────────────────────────
  ws.addRow([`Filtros: ${meta.filtros || 'Sin filtros'}`])
  ws.mergeCells(2, 1, 2, nCols)
  const filterCell = ws.getCell('A2')
  filterCell.font      = { size: 9, color: { argb: C.blanco }, name: 'Calibri', italic: true }
  filterCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.azul } }
  filterCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  ws.getRow(2).height  = 16

  // ── Fila 3: Generado por ────────────────────────────────────────────────────
  ws.addRow([`Generado por: ${meta.usuario || 'Sistema'}   ·   ${fmtDateHour()}`])
  ws.mergeCells(3, 1, 3, nCols)
  const genCell = ws.getCell('A3')
  genCell.font      = { size: 8, color: { argb: C.textoGris }, name: 'Calibri' }
  genCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.grisMedio } }
  genCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 }
  ws.getRow(3).height = 14

  // ── Fila 4: Separador vacío ─────────────────────────────────────────────────
  ws.addRow([])
  ws.mergeCells(4, 1, 4, nCols)
  ws.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.azul } }
  ws.getRow(4).height = 4

  // ── Fila 5: Encabezados de columna ──────────────────────────────────────────
  const headerRow = ws.addRow(columns.map(c => c.header))
  headerRow.height = 22
  headerRow.eachCell(cell => {
    cell.font      = { bold: true, size: 10, color: { argb: C.blanco }, name: 'Calibri' }
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.azul } }
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false }
    cell.border    = {
      bottom: { style: 'medium', color: { argb: C.blanco } },
      right:  { style: 'thin',   color: { argb: 'FF2A4F7A' } },
    }
  })

  // Autofilter en encabezados
  ws.autoFilter = { from: { row: 5, column: 1 }, to: { row: 5, column: nCols } }

  // ── Filas de datos ──────────────────────────────────────────────────────────
  rows.forEach((rowData, ri) => {
    const values = columns.map(c => {
      const val = typeof c.key === 'function' ? c.key(rowData) : rowData[c.key]
      return val !== null && val !== undefined ? val : ''
    })
    const dataRow = ws.addRow(values)
    dataRow.height = 18

    const isEven = ri % 2 === 0
    const bgColor = isEven ? C.blanco : C.grisClaro

    dataRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
      const col = columns[colNum - 1]
      cell.font      = { size: 9, name: 'Calibri', color: { argb: C.texto } }
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
      cell.alignment = { vertical: 'middle', horizontal: col?.align || 'left', indent: col?.align === 'right' ? 0 : 1 }
      cell.border    = {
        bottom: { style: 'hair', color: { argb: C.grisMedio } },
        right:  { style: 'hair', color: { argb: C.grisMedio } },
      }
      // Formato numérico para columnas de dinero
      if (col?.total && typeof cell.value === 'number') {
        cell.numFmt    = '#,##0.00'
        cell.alignment = { vertical: 'middle', horizontal: 'right' }
      }
    })
  })

  // ── Fila de totales ─────────────────────────────────────────────────────────
  const hasTotals = columns.some(c => c.total)
  if (hasTotals) {
    // Fila separador
    ws.addRow([])

    const totalValues = columns.map(c => {
      if (!c.total) return ''
      return rows.reduce((acc, r) => {
        const v = typeof c.key === 'function' ? c.key(r) : r[c.key]
        return acc + (Number(v) || 0)
      }, 0)
    })
    totalValues[0] = 'TOTAL'
    const totalRow = ws.addRow(totalValues)
    totalRow.height = 20

    totalRow.eachCell({ includeEmpty: true }, (cell, colNum) => {
      const col = columns[colNum - 1]
      cell.font      = { bold: true, size: 10, name: 'Calibri', color: { argb: C.azul } }
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.azulClaro } }
      cell.border    = {
        top:    { style: 'medium', color: { argb: C.azul } },
        bottom: { style: 'medium', color: { argb: C.azul } },
      }
      cell.alignment = { vertical: 'middle', horizontal: col?.align || (colNum === 1 ? 'left' : 'center'), indent: 1 }
      if (col?.total && typeof cell.value === 'number') {
        cell.numFmt    = '#,##0.00'
        cell.alignment = { vertical: 'middle', horizontal: 'right' }
      }
    })
  }

  // ── Anchos de columna ────────────────────────────────────────────────────────
  ws.columns.forEach((col, i) => {
    const def = columns[i]
    if (def?.width) {
      col.width = def.width
    } else {
      // Auto-ancho basado en header
      const headerLen = (def?.header || '').length
      const maxData = rows.reduce((max, r) => {
        const v = typeof def?.key === 'function' ? def.key(r) : r[def?.key]
        return Math.max(max, String(v ?? '').length)
      }, 0)
      col.width = Math.max(headerLen + 2, Math.min(maxData + 2, 40))
    }
  })

  // ── Guardar ──────────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer()
  const blob   = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, `${filename}.xlsx`)
}

// ── PDF ────────────────────────────────────────────────────────────────────────
export function exportPDF(rows, columns, filename, meta = {}, opts = {}) {
  const orientation = opts.orientation || (columns.length > 6 ? 'landscape' : 'portrait')
  const doc = new jsPDF({ orientation, unit:'mm', format:'a4' })
  const pageW = doc.internal.pageSize.getWidth()

  // Encabezado
  doc.setFillColor(30, 58, 95)
  doc.rect(0, 0, pageW, 22, 'F')
  doc.setTextColor(255,255,255)
  doc.setFontSize(14)
  doc.setFont('helvetica','bold')
  doc.text(`GIVAMIC ERP — ${meta.modulo || 'Reporte'}`, 10, 10)
  doc.setFontSize(8)
  doc.setFont('helvetica','normal')
  doc.text(`Generado por: ${meta.usuario || 'Sistema'}  |  ${fmtDateHour()}`, 10, 17)
  if (meta.filtros) {
    doc.setTextColor(180,210,255)
    doc.text(`Filtros: ${meta.filtros}`, pageW - 10, 17, { align:'right' })
  }

  const tableBody = rows.map(row =>
    columns.map(c => {
      const val = typeof c.key === 'function' ? c.key(row) : row[c.key]
      if (c.total && typeof val === 'number')
        return val.toLocaleString('es-PE', { minimumFractionDigits: 2 })
      return val !== null && val !== undefined ? String(val) : '—'
    })
  )

  const foot = []
  const totalRow = columns.map(c => {
    if (!c.total) return ''
    const sum = rows.reduce((acc, r) => {
      const v = typeof c.key === 'function' ? c.key(r) : r[c.key]
      return acc + (Number(v) || 0)
    }, 0)
    return sum > 0 ? sum.toLocaleString('es-PE', { minimumFractionDigits: 2 }) : ''
  })
  if (totalRow.some(v => v !== '')) foot.push(totalRow)

  autoTable(doc, {
    head: [columns.map(c => c.header)],
    body: tableBody,
    foot: foot.length ? foot : undefined,
    startY: 26,
    styles:          { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak', font: 'helvetica' },
    headStyles:      { fillColor: [30,58,95], textColor: 255, fontStyle: 'bold', halign: 'center' },
    footStyles:      { fillColor: [232,237,245], textColor: [30,58,95], fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [248,250,252] },
    columnStyles:    columns.reduce((acc, c, i) => {
      if (c.total) acc[i] = { halign: 'right' }
      if (c.width) acc[i] = { ...(acc[i]||{}), cellWidth: c.width }
      return acc
    }, {}),
    didDrawPage: (data) => {
      const pageCount = doc.internal.getNumberOfPages()
      doc.setFontSize(7)
      doc.setTextColor(150)
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}  |  ${meta.usuario || 'Sistema'} — GIVAMIC ERP`,
        pageW / 2, doc.internal.pageSize.getHeight() - 5,
        { align:'center' }
      )
    }
  })

  doc.save(`${filename}.pdf`)
}

// ── ZIP de PDFs ────────────────────────────────────────────────────────────────
export async function exportPDFZip(items, zipName) {
  const zip = new JSZip()
  for (const item of items) {
    try {
      const blob = await item.generarPDF()
      zip.file(`${item.nombre}.pdf`, blob)
    } catch(e) {
      console.warn('Error generando PDF para', item.nombre, e)
    }
  }
  const content = await zip.generateAsync({ type:'blob' })
  const url = URL.createObjectURL(content)
  const a = document.createElement('a')
  a.href = url; a.download = `${zipName}.zip`; a.click()
  URL.revokeObjectURL(url)
}

// ── Registrar en historial ────────────────────────────────────────────────────
export function registrarReporte(dispatch, { tipo, modulo, filtros, usuario, formato }) {
  dispatch({
    type: 'ADD_REPORTE_HISTORIAL',
    payload: { tipo, modulo, filtros, usuario: usuario || 'Sistema', formato, fecha: new Date().toISOString() }
  })
}
