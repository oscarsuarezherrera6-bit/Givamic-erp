import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/layout/Toast'
import { fmtDate, todayISO } from '../utils/helpers'
import Modal from '../components/common/Modal'
import Confirm from '../components/common/Confirm'
import PageHeader from '../components/common/PageHeader'
import {
  PlusIcon, EyeIcon, TrashIcon, CheckCircleIcon,
  ExclamationTriangleIcon, ExclamationCircleIcon, ClipboardDocumentCheckIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline'
import { generarPDFInspeccion } from '../utils/pdfInspeccion'

// ── Resultado visual ───────────────────────────────────────
const RESULTADO_STYLE = {
  'Conforme':                    'bg-green-100 text-green-700 border-green-200',
  'Conforme con Observaciones':  'bg-orange-100 text-orange-700 border-orange-200',
  'No Conforme':                 'bg-red-100 text-red-700 border-red-200',
}

const ITEM_ESTADO_STYLE = {
  'Conforme':    'bg-green-100 text-green-700',
  'Observado':   'bg-orange-100 text-orange-700',
  'No Conforme': 'bg-red-100 text-red-700',
}

function calcResultado(items) {
  if (items.some(it => it.estado === 'No Conforme')) return 'No Conforme'
  if (items.some(it => it.estado === 'Observado')) return 'Conforme con Observaciones'
  return 'Conforme'
}

// ── Formulario de Inspección ───────────────────────────────
function ConformidadForm({ facturaId: initFacturaId, onClose }) {
  const { state, dispatch } = useApp()
  const toast = useToast()

  const [facturaId, setFacturaId] = useState(initFacturaId || '')
  const factura = facturaId ? state.facturas.find(f => f.id === facturaId) : null
  const oc = factura?.ocId ? (state.ordenesCompra||[]).find(o => o.id === factura.ocId) : null
  const prov = factura?.proveedorId ? state.proveedores.find(p => p.id === factura.proveedorId) : null

  // Facturas elegibles: Recibida y sin conformidad registrada aún
  const conformidades = state.conformidades || []
  const facturasElegibles = state.facturas.filter(f =>
    f.estado === 'Recibida' && !conformidades.some(c => c.facturaId === f.id)
  )

  const [form, setForm] = useState({
    fecha: todayISO(), inspeccionadoPor: '', aprobadoPor: '', observacionesGenerales: ''
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  // Checkboxes SIG-FO-024: SI / NO / NA por criterio
  const [checks, setChecks] = useState(['SI','SI','SI','SI'])
  const setChk = (i, val) => setChecks(prev => prev.map((v, idx) => idx===i ? val : v))

  const [items, setItems] = useState([])

  // Cargar ítems desde la FACTURA cuando se selecciona
  useEffect(() => {
    if (factura) {
      setItems(factura.items.map(it => ({
        productoId: it.productoId,
        descripcion: it.producto || it.descripcion || '',
        codigo: it.codigo || '',
        unidad: it.unidad,
        cantidadSolicitada: it.cantidad,
        cantidadRecibida: it.cantidad,
        estado: 'Conforme',
        observacion: '',
        accionInmediata: '',
        fechaCompromiso: '',
        estadoAccion: ''
      })))
    } else {
      setItems([])
    }
  }, [facturaId])

  const setItem = (idx, k, v) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [k]: v } : it))
  }

  const resultado = items.length > 0 ? calcResultado(items) : null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!facturaId || !factura) return toast('Selecciona una factura', 'error')
    if (!form.inspeccionadoPor) return toast('Ingresa el nombre del inspector', 'error')
    if (items.some(it => it.estado === 'No Conforme' && !it.observacion.trim()))
      return toast('Los ítems No Conformes requieren observación', 'error')

    dispatch({
      type: 'ADD_CONFORMIDAD',
      payload: { ...form, facturaId, ocId: factura.ocId || null, items, resultado, checks }
    })
    toast('Conformidad registrada correctamente', 'success')
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Seleccionar Factura */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-600 block mb-1">Factura a inspeccionar *</label>
          {initFacturaId
            ? <div className="input bg-gray-50 text-gray-700 flex items-center gap-2">
                <span className="font-mono font-bold text-[#1e3a5f]">{factura?.numero}</span>
                <span className="text-gray-500">— {prov?.nombre}</span>
                <span className="text-xs text-green-600 font-medium">· Recibida</span>
              </div>
            : <select className="input" value={facturaId} onChange={e => setFacturaId(e.target.value)} required>
                <option value="">Seleccionar factura recibida...</option>
                {facturasElegibles.map(f => {
                  const p = state.proveedores.find(pv => pv.id === f.proveedorId)
                  return <option key={f.id} value={f.id}>{f.numero} — {p?.nombre || ''} ({fmtDate(f.fecha)})</option>
                })}
              </select>
          }
        </div>
        {factura && (
          <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 flex gap-4">
            <span>Proveedor: <strong>{prov?.nombre}</strong></span>
            <span>Fecha: <strong>{fmtDate(factura.fecha)}</strong></span>
            <span>Ítems: <strong>{factura.items.length}</strong></span>
            {oc && <span>OC vinculada: <strong className="font-mono">{oc.numero}</strong></span>}
          </div>
        )}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Fecha de Inspección *</label>
          <input className="input" type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} required />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Inspeccionado por *</label>
          <input className="input" value={form.inspeccionadoPor} onChange={e => set('inspeccionadoPor', e.target.value)}
            placeholder="Nombre del inspector" required />
        </div>
      </div>

      {/* Tabla de inspección por ítem */}
      {items.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">Inspección por ítem</p>
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#1e3a5f] text-white">
                  <th className="px-3 py-2 text-left">Producto</th>
                  <th className="px-3 py-2 text-center">UM</th>
                  <th className="px-3 py-2 text-center">Cant. OC</th>
                  <th className="px-3 py-2 text-center">Cant. Recibida</th>
                  <th className="px-3 py-2 text-center">Estado</th>
                  <th className="px-3 py-2 text-left">Observación / Problema</th>
                  <th className="px-3 py-2 text-left">Acción Inmediata</th>
                  <th className="px-3 py-2 text-center">F. Compromiso</th>
                  <th className="px-3 py-2 text-center">Estado Acción</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={idx} className={`border-t border-gray-100 ${idx % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                    <td className="px-3 py-2">
                      <p className="font-medium text-gray-800">{it.descripcion}</p>
                      <p className="text-gray-400">{it.codigo}</p>
                    </td>
                    <td className="px-3 py-2 text-center text-gray-500">{it.unidad}</td>
                    <td className="px-3 py-2 text-center font-semibold text-[#1e3a5f]">{it.cantidadSolicitada}</td>
                    <td className="px-3 py-2 text-center">
                      <input type="number" min="0" max={it.cantidadSolicitada * 2}
                        value={it.cantidadRecibida}
                        onChange={e => setItem(idx, 'cantidadRecibida', parseFloat(e.target.value)||0)}
                        className="w-16 text-center border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <select value={it.estado} onChange={e => setItem(idx, 'estado', e.target.value)}
                        className={`text-xs rounded-full px-2 py-1 border-0 font-medium cursor-pointer ${ITEM_ESTADO_STYLE[it.estado]}`}>
                        <option value="Conforme">Conforme</option>
                        <option value="Observado">Observado</option>
                        <option value="No Conforme">No Conforme</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input type="text" value={it.observacion}
                        onChange={e => setItem(idx, 'observacion', e.target.value)}
                        placeholder={it.estado !== 'Conforme' ? 'Obligatorio...' : 'Opcional'}
                        className={`w-full border rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 ${it.estado === 'No Conforme' && !it.observacion ? 'border-red-300 bg-red-50' : 'border-gray-200'}`} />
                    </td>
                    <td className="px-3 py-2">
                      <input type="text" value={it.accionInmediata||''}
                        onChange={e => setItem(idx, 'accionInmediata', e.target.value)}
                        disabled={it.estado === 'Conforme'}
                        placeholder={it.estado !== 'Conforme' ? 'Acción...' : ''}
                        className="w-full border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-300" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="date" value={it.fechaCompromiso||''}
                        onChange={e => setItem(idx, 'fechaCompromiso', e.target.value)}
                        disabled={it.estado === 'Conforme'}
                        className="w-full border border-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-300" />
                    </td>
                    <td className="px-3 py-2">
                      <select value={it.estadoAccion||''}
                        onChange={e => setItem(idx, 'estadoAccion', e.target.value)}
                        disabled={it.estado === 'Conforme'}
                        className="w-full border border-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50 disabled:text-gray-300">
                        <option value="">—</option>
                        <option value="Pendiente">Pendiente</option>
                        <option value="En proceso">En proceso</option>
                        <option value="Cerrado">Cerrado</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resultado auto-calculado */}
      {resultado && (
        <div className={`rounded-xl border p-4 flex items-center gap-3 ${RESULTADO_STYLE[resultado]}`}>
          {resultado === 'Conforme' && <CheckCircleIcon className="w-6 h-6 text-green-600 shrink-0" />}
          {resultado === 'Conforme con Observaciones' && <ExclamationTriangleIcon className="w-6 h-6 text-orange-500 shrink-0" />}
          {resultado === 'No Conforme' && <ExclamationCircleIcon className="w-6 h-6 text-red-600 shrink-0" />}
          <div>
            <p className="font-bold text-sm">Resultado: {resultado}</p>
            <p className="text-xs opacity-75">
              {resultado === 'Conforme' && 'Todos los ítems recibidos conforme a la OC.'}
              {resultado === 'Conforme con Observaciones' && 'Recibido con observaciones en algunos ítems.'}
              {resultado === 'No Conforme' && 'Existen ítems no conformes. Requiere acción correctiva.'}
            </p>
          </div>
        </div>
      )}

      {/* Criterios SIG-FO-024 */}
      <div>
        <p className="text-xs font-semibold text-gray-700 mb-2">Criterios de inspección (SIG-FO-024)</p>
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          {[
            'Producto conforme a OC/RQ/guía, en cantidad, descripción, marca/modelo, medida y unidad.',
            'Producto en buen estado físico, sin daños, faltantes, derrames o contaminación visible.',
            'Embalaje, rotulado y presentación adecuados.',
            'Documentación mínima: Guía, comprobante, ficha técnica, garantía, MSDS, lote o vencimiento.'
          ].map((txt, i) => (
            <div key={i} className={`flex items-center gap-3 px-3 py-2 ${i%2===1?'bg-gray-50':''}`}>
              <span className="text-xs font-bold text-gray-400 w-5 shrink-0">{i+1}</span>
              <span className="text-xs text-gray-700 flex-1">{txt}</span>
              <div className="flex gap-1 shrink-0">
                {['SI','NO','NA'].map(opt => (
                  <button key={opt} type="button"
                    onClick={() => setChk(i, opt)}
                    className={`text-xs px-2 py-1 rounded font-medium border transition-colors ${
                      checks[i]===opt
                        ? opt==='SI' ? 'bg-green-500 text-white border-green-500'
                          : opt==='NO' ? 'bg-red-500 text-white border-red-500'
                          : 'bg-gray-400 text-white border-gray-400'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                    }`}>{opt}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Observaciones Generales</label>
        <textarea className="input resize-none h-16" value={form.observacionesGenerales}
          onChange={e => set('observacionesGenerales', e.target.value)}
          placeholder="Comentarios adicionales sobre la recepción..." />
      </div>

      <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
        <button type="submit" disabled={items.length === 0}
          className="btn-primary flex items-center gap-2 disabled:opacity-50">
          <ClipboardDocumentCheckIcon className="w-4 h-4"/>Registrar Conformidad
        </button>
      </div>
    </form>
  )
}

// ── Detalle conformidad ────────────────────────────────────
function ConformidadDetail({ conf, onClose }) {
  const { state, dispatch } = useApp()
  const { isAdmin } = useAuth()
  const toast = useToast()
  const [confirmBox, setConfirmBox] = useState(null)
  const oc = (state.ordenesCompra||[]).find(o => o.id === conf.ocId)
  const factura = conf.facturaId ? state.facturas.find(f => f.id === conf.facturaId) : null
  const proveedor = factura?.proveedorId ? state.proveedores.find(p => p.id === factura.proveedorId) : null

  const handlePDF = () => {
    generarPDFInspeccion(conf, oc, proveedor, state.logo || null)
    toast('PDF generado')
  }

  const handleDelete = () => {
    setConfirmBox({
      message: '¿Eliminar esta conformidad?',
      onConfirm: () => {
        dispatch({ type: 'DELETE_CONFORMIDAD', id: conf.id })
        if (oc) dispatch({ type: 'UPDATE_OC', id: oc.id, payload: { estado: 'Pendiente Inspección', conformidadId: null } })
        toast('Conformidad eliminada')
        setConfirmBox(null)
        onClose()
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className={`rounded-xl border p-4 flex items-center gap-3 ${RESULTADO_STYLE[conf.resultado]}`}>
        {conf.resultado === 'Conforme' && <CheckCircleIcon className="w-6 h-6 text-green-600 shrink-0" />}
        {conf.resultado === 'Conforme con Observaciones' && <ExclamationTriangleIcon className="w-6 h-6 text-orange-500 shrink-0" />}
        {conf.resultado === 'No Conforme' && <ExclamationCircleIcon className="w-6 h-6 text-red-600 shrink-0" />}
        <div>
          <p className="font-bold">{conf.numero} · {conf.resultado}</p>
          <p className="text-xs opacity-75">{fmtDate(conf.fecha)} · Inspector: {conf.inspeccionadoPor}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div><span className="text-gray-500">OC:</span> <span className="font-mono font-bold">{oc?.numero || '—'}</span></div>
        <div><span className="text-gray-500">Factura:</span> <span className="font-mono">{factura?.numero || '—'}</span></div>
        {conf.aprobadoPor && <div><span className="text-gray-500">Aprobado por:</span> {conf.aprobadoPor}</div>}
      </div>

      {/* Items inspeccionados */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="table-th">Producto</th>
              <th className="table-th text-center">UM</th>
              <th className="table-th text-center">OC</th>
              <th className="table-th text-center">Recibido</th>
              <th className="table-th text-center">Estado</th>
              <th className="table-th">Observación</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {conf.items.map((it, i) => (
              <tr key={i}>
                <td className="table-td">
                  <p className="font-medium">{it.descripcion}</p>
                  <p className="text-gray-400">{it.codigo}</p>
                </td>
                <td className="table-td text-center">{it.unidad}</td>
                <td className="table-td text-center">{it.cantidadSolicitada}</td>
                <td className="table-td text-center font-semibold">
                  <span className={it.cantidadRecibida < it.cantidadSolicitada ? 'text-orange-600' : 'text-green-600'}>
                    {it.cantidadRecibida}
                  </span>
                </td>
                <td className="table-td text-center">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ITEM_ESTADO_STYLE[it.estado]}`}>
                    {it.estado}
                  </span>
                </td>
                <td className="table-td text-gray-600">{it.observacion || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {conf.observacionesGenerales && (
        <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700">
          <span className="font-medium text-gray-500 text-xs block mb-1">Observaciones generales:</span>
          {conf.observacionesGenerales}
        </div>
      )}

      <div className="flex justify-between pt-2 border-t border-gray-100">
        {isAdmin && <button onClick={handleDelete} className="btn-danger text-xs">Eliminar</button>}
        {!isAdmin && <div/>}
        <div className="flex gap-2">
          <button onClick={handlePDF} className="btn-secondary flex items-center gap-1.5">
            <DocumentArrowDownIcon className="w-4 h-4"/>PDF SIG-FO-024
          </button>
          <button onClick={onClose} className="btn-secondary">Cerrar</button>
        </div>
      </div>
      {confirmBox && <Confirm {...confirmBox} onCancel={() => setConfirmBox(null)} />}
    </div>
  )
}

// ── Página principal ───────────────────────────────────────
export default function Conformidades() {
  const { state } = useApp()
  const location = useLocation()
  const [showForm, setShowForm] = useState(false)
  const [formFacturaId, setFormFacturaId] = useState(null)
  const [detail, setDetail] = useState(null)

  // Si viene desde OC con facturaId preseleccionado
  useEffect(() => {
    if (location.state?.facturaId) {
      setFormFacturaId(location.state.facturaId)
      setShowForm(true)
    }
  }, [location.state])

  const conformidades = state.conformidades || []
  const ocs = state.ordenesCompra || []

  // Facturas Recibidas sin conformidad aún
  const facturasPendientes = state.facturas.filter(f =>
    f.estado === 'Recibida' && !conformidades.some(c => c.facturaId === f.id)
  )

  return (
    <div className="space-y-4">
      <PageHeader
        title="Recepciones y Conformidades"
        subtitle="Inspección de productos recibidos y actas de conformidad"
        action={
          <button onClick={() => { setFormFacturaId(null); setShowForm(true) }} className="btn-primary flex items-center gap-2">
            <PlusIcon className="w-4 h-4"/>Nueva Inspección
          </button>
        }
      />

      {/* Facturas recibidas pendientes de inspección */}
      {facturasPendientes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-orange-700 flex items-center gap-1">
            <ExclamationTriangleIcon className="w-4 h-4"/>
            {facturasPendientes.length} factura{facturasPendientes.length > 1 ? 's' : ''} recibida{facturasPendientes.length > 1 ? 's' : ''} pendiente{facturasPendientes.length > 1 ? 's' : ''} de inspección:
          </p>
          <div className="flex flex-wrap gap-2">
            {facturasPendientes.map(f => {
              const prov = state.proveedores.find(p => p.id === f.proveedorId)
              const oc = f.ocId ? (state.ordenesCompra||[]).find(o => o.id === f.ocId) : null
              return (
                <button key={f.id}
                  onClick={() => { setFormFacturaId(f.id); setShowForm(true) }}
                  className="flex items-center gap-2 bg-orange-50 border border-orange-200 hover:bg-orange-100 text-orange-700 text-xs px-3 py-2 rounded-lg transition-colors">
                  <ClipboardDocumentCheckIcon className="w-4 h-4"/>
                  <span className="font-bold font-mono">{f.numero}</span>
                  <span className="text-orange-500">·</span>
                  <span>{prov?.nombre}</span>
                  {oc && <span className="text-orange-400 font-mono">({oc.numero})</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Conformidades', val: conformidades.length, Icon: ClipboardDocumentCheckIcon, color: 'blue' },
          { label: 'Conformes', val: conformidades.filter(c => c.resultado === 'Conforme').length, Icon: CheckCircleIcon, color: 'green' },
          { label: 'Con Obs / No Conforme', val: conformidades.filter(c => c.resultado !== 'Conforme').length, Icon: ExclamationTriangleIcon, color: 'orange' },
        ].map(k => (
          <div key={k.label} className="card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${k.color === 'green' ? 'bg-green-50' : k.color === 'orange' ? 'bg-orange-50' : 'bg-blue-50'}`}>
              <k.Icon className={`w-5 h-5 ${k.color === 'green' ? 'text-green-600' : k.color === 'orange' ? 'text-orange-500' : 'text-[#1e3a5f]'}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{k.val}</p>
              <p className="text-xs text-gray-500">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="table-th">N° Conform.</th>
              <th className="table-th">Fecha</th>
              <th className="table-th">OC</th>
              <th className="table-th">Factura</th>
              <th className="table-th">Inspector</th>
              <th className="table-th">Resultado</th>
              <th className="table-th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {[...conformidades].sort((a,b) => new Date(b.fecha)-new Date(a.fecha)).map(conf => {
              const oc = ocs.find(o => o.id === conf.ocId)
              const factura = conf.facturaId ? state.facturas.find(f => f.id === conf.facturaId) : null
              return (
                <tr key={conf.id} className="hover:bg-gray-50/50">
                  <td className="table-td font-mono text-xs font-bold text-[#1e3a5f]">{conf.numero}</td>
                  <td className="table-td">{fmtDate(conf.fecha)}</td>
                  <td className="table-td font-mono text-xs">{oc?.numero || '—'}</td>
                  <td className="table-td font-mono text-xs">{factura?.numero || '—'}</td>
                  <td className="table-td">{conf.inspeccionadoPor}</td>
                  <td className="table-td">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${RESULTADO_STYLE[conf.resultado]}`}>
                      {conf.resultado}
                    </span>
                  </td>
                  <td className="table-td">
                    <button onClick={() => setDetail(conf)} className="text-blue-400 hover:text-blue-600 p-1">
                      <EyeIcon className="w-4 h-4"/>
                    </button>
                  </td>
                </tr>
              )
            })}
            {conformidades.length === 0 && (
              <tr><td colSpan={7} className="table-td text-center text-gray-400 py-10">No hay registros de conformidad</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <Modal title="Nueva Inspección de Recepción" onClose={() => { setShowForm(false); setFormFacturaId(null) }} wide>
          <ConformidadForm facturaId={formFacturaId} onClose={() => { setShowForm(false); setFormFacturaId(null) }} />
        </Modal>
      )}
      {detail && (
        <Modal title={`Conformidad: ${detail.numero}`} onClose={() => setDetail(null)} wide>
          <ConformidadDetail conf={detail} onClose={() => setDetail(null)} />
        </Modal>
      )}
    </div>
  )
}
