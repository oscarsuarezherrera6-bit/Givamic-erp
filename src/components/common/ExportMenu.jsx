/**
 * ExportMenu — Botón de exportación reutilizable para todos los módulos
 * Incluye: dropdown Excel/PDF, contador de seleccionados, ZIP para PDFs
 */
import { useState, useRef, useEffect } from 'react'
import { ArrowDownTrayIcon, DocumentArrowDownIcon, TableCellsIcon, ArchiveBoxArrowDownIcon } from '@heroicons/react/24/outline'
import { exportExcel, exportPDF, exportPDFZip, buildFilename, registrarReporte } from '../../utils/exportUtils'
import { useApp } from '../../context/AppContext'
import { useAuth } from '../../context/AuthContext'

/**
 * @param {Object} props
 * @param {string}   props.modulo        Nombre del módulo (ej: "Facturas")
 * @param {Array}    props.data          Datos filtrados activos
 * @param {Array}    props.selected      IDs seleccionados (opcional)
 * @param {Array}    props.columns       [{header, key, width?, total?, totalFmt?}]
 * @param {string}   props.filtroLabel   Texto de filtros aplicados (ej: "Jun 2026")
 * @param {boolean}  props.hasPDFZip     Muestra opción ZIP de PDFs individuales
 * @param {Function} props.onPDFZip      Async fn que recibe items seleccionados y genera el ZIP
 * @param {string}   props.className     Clases extra para el botón principal
 */
export default function ExportMenu({
  modulo = 'Reporte',
  data = [],
  selected = [],
  columns = [],
  filtroLabel = '',
  hasPDFZip = false,
  onPDFZip,
  className = '',
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(null)
  const ref = useRef(null)
  const { dispatch } = useApp()
  const { user } = useAuth()

  // Cerrar al click fuera
  useEffect(() => {
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [])

  const exportData = selected.length > 0
    ? data.filter(r => selected.includes(r.id))
    : data

  const count = exportData.length
  const filename = buildFilename(modulo, filtroLabel)
  const meta = {
    modulo,
    filtros: filtroLabel || 'Sin filtros',
    usuario: user?.nombre || user?.email || 'Sistema',
  }

  const handleExcel = async () => {
    setLoading('xlsx')
    try {
      await exportExcel(exportData, columns, filename, meta)
      registrarReporte(dispatch, { tipo: modulo, modulo, filtros: filtroLabel, usuario: meta.usuario, formato: 'Excel' })
    } catch(e) {
      console.error('Export Excel error:', e)
    } finally {
      setLoading(null)
      setOpen(false)
    }
  }

  const handlePDF = () => {
    setLoading('pdf')
    try {
      exportPDF(exportData, columns, filename, meta)
      registrarReporte(dispatch, { tipo: modulo, modulo, filtros: filtroLabel, usuario: meta.usuario, formato: 'PDF' })
    } finally {
      setLoading(null)
      setOpen(false)
    }
  }

  const handleZip = async () => {
    if (!onPDFZip) return
    setLoading('zip')
    try {
      await onPDFZip(exportData)
      registrarReporte(dispatch, { tipo: modulo, modulo, filtros: filtroLabel, usuario: meta.usuario, formato: 'ZIP' })
    } finally {
      setLoading(null)
      setOpen(false)
    }
  }

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 bg-[#1e3a5f] hover:bg-[#2a4f7a] text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
      >
        <ArrowDownTrayIcon className="w-4 h-4" />
        Exportar
        {count > 0 && selected.length > 0 && (
          <span className="bg-amber-400 text-amber-900 text-[10px] font-black rounded-full px-1.5 py-0.5 ml-0.5 leading-none">
            {count}
          </span>
        )}
        <svg className={`w-3 h-3 ml-0.5 transition-transform ${open ? 'rotate-180':''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-lg z-50 min-w-[200px] overflow-hidden">
          {/* Info de cantidad */}
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
            <p className="text-xs text-gray-500">
              {selected.length > 0
                ? <><span className="font-bold text-[#1e3a5f]">{count}</span> registros seleccionados</>
                : <><span className="font-bold text-[#1e3a5f]">{count}</span> registros (vista actual)</>
              }
            </p>
          </div>

          {/* Opciones */}
          <button
            onClick={handleExcel}
            disabled={loading === 'xlsx'}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-green-50 text-left transition-colors group"
          >
            <div className="w-7 h-7 rounded-lg bg-green-100 group-hover:bg-green-200 flex items-center justify-center transition-colors">
              <TableCellsIcon className="w-4 h-4 text-green-700" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">Exportar a Excel</p>
              <p className="text-xs text-gray-400">.xlsx — editable</p>
            </div>
            {loading === 'xlsx' && <span className="ml-auto text-xs text-gray-400">...</span>}
          </button>

          <button
            onClick={handlePDF}
            disabled={loading === 'pdf'}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-red-50 text-left transition-colors group border-t border-gray-50"
          >
            <div className="w-7 h-7 rounded-lg bg-red-100 group-hover:bg-red-200 flex items-center justify-center transition-colors">
              <DocumentArrowDownIcon className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">Exportar a PDF</p>
              <p className="text-xs text-gray-400">.pdf — para imprimir</p>
            </div>
            {loading === 'pdf' && <span className="ml-auto text-xs text-gray-400">...</span>}
          </button>

          {hasPDFZip && (
            <button
              onClick={handleZip}
              disabled={loading === 'zip' || count === 0}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-blue-50 text-left transition-colors group border-t border-gray-100 disabled:opacity-40"
            >
              <div className="w-7 h-7 rounded-lg bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors">
                <ArchiveBoxArrowDownIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-800">Descargar PDFs en ZIP</p>
                <p className="text-xs text-gray-400">Un PDF por documento</p>
              </div>
              {loading === 'zip' && <span className="ml-auto text-xs text-gray-400">...</span>}
            </button>
          )}

          <div className="px-3 py-2 bg-gray-50 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 text-center">
              Incluye filtros aplicados y marca de agua GIVAMIC
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Hook de selección ────────────────────────────────────────────────────────
/**
 * Devuelve { selected, toggleOne, toggleAll, clearSelection, isSelected, allSelected }
 */
export function useSelection(items = []) {
  const [selected, setSelected] = useState([])

  const toggleOne = (id) =>
    setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  const toggleAll = () =>
    setSelected(s => s.length === items.length ? [] : items.map(i => i.id))

  const clearSelection = () => setSelected([])

  const isSelected = (id) => selected.includes(id)

  const allSelected = items.length > 0 && selected.length === items.length

  const someSelected = selected.length > 0 && selected.length < items.length

  return { selected, toggleOne, toggleAll, clearSelection, isSelected, allSelected, someSelected }
}

// ── Checkbox estilizado ───────────────────────────────────────────────────────
export function Checkbox({ checked, indeterminate, onChange, className = '' }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate
  }, [indeterminate])
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      onChange={onChange}
      className={`w-3.5 h-3.5 accent-[#1e3a5f] cursor-pointer rounded ${className}`}
    />
  )
}
