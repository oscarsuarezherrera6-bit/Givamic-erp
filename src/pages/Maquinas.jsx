import React, { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/layout/Toast'
import { fmtDate, todayISO } from '../utils/helpers'
import Modal from '../components/common/Modal'
import Confirm from '../components/common/Confirm'
import PageHeader from '../components/common/PageHeader'
import {
  PlusIcon, PencilIcon, TrashIcon, WrenchScrewdriverIcon,
  ClipboardDocumentListIcon, BellAlertIcon, CheckCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline'

const ESTADOS     = ['Operativa', 'En servicio externo', 'De baja']
const TIPOS       = [
  // Equipos de limpieza
  'Lustradora', 'Aspiradora', 'Hidrolimpiadora', 'Abrillantadora', 'Barredora',
  // TI / Oficina
  'Laptop', 'PC / Desktop', 'Monitor', 'Impresora', 'Escáner', 'Proyector',
  'Tablet', 'Teléfono IP', 'Servidor', 'Switch / Router',
  // Otros activos
  'Vehículo', 'Herramienta', 'Otro',
]
const TIPOS_SERV  = ['Preventivo', 'Correctivo']
const ESTADOS_SERV = ['Solicitado', 'Cotización recibida', 'Programado', 'En proceso', 'Completado', 'Cancelado']

const estadoMaqColor = {
  'Operativa':           'bg-green-100 text-green-700',
  'En servicio externo': 'bg-blue-100 text-blue-700',
  'De baja':             'bg-red-100 text-red-700',
}

const estadoServColor = {
  'Solicitado':          'bg-amber-100 text-amber-700',
  'Cotización recibida': 'bg-blue-100 text-blue-700',
  'Programado':          'bg-purple-100 text-purple-700',
  'En proceso':          'bg-indigo-100 text-indigo-700',
  'Completado':          'bg-green-100 text-green-700',
  'Cancelado':           'bg-gray-100 text-gray-500',
}

function diasHasta(fecha) {
  if (!fecha) return null
  return Math.round((new Date(fecha) - new Date(todayISO())) / 86400000)
}

function alertaFecha(prox) {
  const d = diasHasta(prox)
  if (d === null) return null
  if (d < 0)   return { label: `Vencido hace ${Math.abs(d)}d`, color: 'text-red-600', dot: 'bg-red-500', urgente: true }
  if (d <= 30) return { label: `En ${d}d`, color: 'text-amber-600', dot: 'bg-amber-500', urgente: true }
  return { label: `En ${d}d`, color: 'text-green-600', dot: 'bg-green-500', urgente: false }
}

// ─── Form máquina ─────────────────────────────────────────────────────────────
function MaquinaForm({ initial, onClose }) {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const [form, setForm] = useState(initial || {
    nombre: '', tipo: 'Lustradora', marca: '', modelo: '',
    sedeId: state.sedes[0]?.id || '', fechaIngreso: todayISO(),
    estado: 'Operativa', proximoMantenimiento: '', observaciones: '',
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) return
    if (initial) { dispatch({ type: 'UPDATE_MAQUINA', id: initial.id, payload: form }); toast('Máquina actualizada') }
    else         { dispatch({ type: 'ADD_MAQUINA', payload: form }); toast('Máquina registrada') }
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {[['nombre', 'Nombre / Código *', true], ['marca', 'Marca', false], ['modelo', 'Modelo', false]].map(([k, l, req]) => (
          <div key={k}>
            <label className="text-xs font-medium text-gray-600 block mb-1">{l}</label>
            <input className="input" value={form[k]} onChange={e => set(k, e.target.value)} required={req} />
          </div>
        ))}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Tipo</label>
          <select className="input" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
            {TIPOS.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Sede asignada</label>
          <select className="input" value={form.sedeId} onChange={e => set('sedeId', e.target.value)}>
            {state.sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Fecha de ingreso</label>
          <input type="date" className="input" value={form.fechaIngreso} onChange={e => set('fechaIngreso', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Próximo mantenimiento</label>
          <input type="date" className="input" value={form.proximoMantenimiento || ''} onChange={e => set('proximoMantenimiento', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Estado</label>
          <select className="input" value={form.estado} onChange={e => set('estado', e.target.value)}>
            {ESTADOS.map(e => <option key={e}>{e}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-600 block mb-1">Observaciones</label>
          <input className="input" value={form.observaciones} onChange={e => set('observaciones', e.target.value)} />
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
        <button type="submit" className="btn-primary">{initial ? 'Actualizar' : 'Registrar'}</button>
      </div>
    </form>
  )
}

// ─── Form solicitud de servicio ───────────────────────────────────────────────
function SolicitudForm({ maquina, initial, onClose }) {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const [form, setForm] = useState(initial || {
    tipo: 'Preventivo',
    descripcion: '',
    proveedorId: '',
    fechaSolicitud: todayISO(),
    fechaRecojo: '',
    costo: '',
    estado: 'Solicitado',
    observaciones: '',
  })
  const [crearCot, setCrearCot] = useState(!initial)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const prov = (state.proveedores || []).find(p => p.id === form.proveedorId)
  const sede = (state.sedes || []).find(s => s.id === maquina.sedeId)

  const handleSubmit = (e) => {
    e.preventDefault()
    let cotizacionNumero = initial?.cotizacionNumero || ''

    if (crearCot && form.proveedorId && !initial) {
      const n = (state.ultimoCot || 0) + 1
      cotizacionNumero = 'COT-' + String(n).padStart(4, '0')
      dispatch({
        type: 'ADD_COTIZACION',
        payload: {
          fecha: form.fechaSolicitud,
          proveedorId: form.proveedorId,
          proveedor: prov?.nombre || '',
          tipo: 'Servicio',
          descripcion: `Mantenimiento ${form.tipo} — ${maquina.nombre}`,
          items: [{
            id: Date.now().toString(),
            descripcion: `Serv. mantenimiento ${form.tipo.toLowerCase()} — ${maquina.nombre} (${[maquina.marca, maquina.modelo].filter(Boolean).join(' ')})`,
            cantidad: 1, precioUnit: 0, total: 0,
          }],
          totalNeto: 0, totalIGV: 0, totalGeneral: 0,
          estado: 'Pendiente',
          observaciones: `Máq: ${maquina.nombre} · Sede: ${sede?.nombre || ''} · ${form.descripcion || ''}`,
          maquinaId: maquina.id,
        },
      })
      toast('Cotización creada en módulo de Cotizaciones')
    }

    const payload = {
      maquinaId: maquina.id,
      maquinaNombre: maquina.nombre,
      sedeId: maquina.sedeId,
      tipo: form.tipo,
      descripcion: form.descripcion,
      proveedorId: form.proveedorId,
      proveedorNombre: prov?.nombre || '',
      fechaSolicitud: form.fechaSolicitud,
      fechaRecojo: form.fechaRecojo,
      estado: form.estado,
      observaciones: form.observaciones,
      costo: form.costo ? parseFloat(form.costo) : null,
      cotizacionNumero,
    }

    if (initial) {
      dispatch({ type: 'UPDATE_SOLICITUD_MANT', id: initial.id, payload })
      toast('Servicio actualizado')
    } else {
      dispatch({ type: 'ADD_SOLICITUD_MANT', payload })
      toast('Solicitud registrada')
    }
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-[#1e3a5f]/5 rounded-xl px-4 py-3 border border-[#1e3a5f]/10">
        <p className="text-xs font-bold text-[#1e3a5f]">{maquina.nombre}</p>
        <p className="text-xs text-gray-500">{maquina.tipo} · {[maquina.marca, maquina.modelo].filter(Boolean).join(' ') || '—'} · {sede?.nombre || '—'}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Tipo de servicio</label>
          <select className="input" value={form.tipo} onChange={e => set('tipo', e.target.value)}>
            {TIPOS_SERV.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Estado</label>
          <select className="input" value={form.estado} onChange={e => set('estado', e.target.value)}>
            {ESTADOS_SERV.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-600 block mb-1">Proveedor de servicio</label>
          <select className="input" value={form.proveedorId} onChange={e => set('proveedorId', e.target.value)}>
            <option value="">Seleccionar proveedor...</option>
            {(state.proveedores || []).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-600 block mb-1">Descripción / motivo</label>
          <input className="input" value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
            placeholder={form.tipo === 'Correctivo' ? 'Describir la falla detectada...' : 'Mantenimiento preventivo según calendario'} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Fecha de solicitud</label>
          <input type="date" className="input" value={form.fechaSolicitud} onChange={e => set('fechaSolicitud', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Fecha de recojo</label>
          <input type="date" className="input" value={form.fechaRecojo} onChange={e => set('fechaRecojo', e.target.value)} />
          <p className="text-[10px] text-gray-400 mt-0.5">Completar cuando el proveedor confirme</p>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Costo (S/)</label>
          <input type="number" className="input" value={form.costo} onChange={e => set('costo', e.target.value)}
            placeholder="0.00" min="0" step="0.01" />
          <p className="text-[10px] text-gray-400 mt-0.5">Según cotización recibida</p>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Observaciones</label>
          <input className="input" value={form.observaciones} onChange={e => set('observaciones', e.target.value)} />
        </div>
      </div>

      {!initial && form.proveedorId && (
        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
          <input type="checkbox" checked={crearCot} onChange={e => setCrearCot(e.target.checked)} className="rounded" />
          <span>Crear cotización en módulo de Cotizaciones para este servicio</span>
        </label>
      )}

      <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
        <button type="submit" className="btn-primary flex items-center gap-1.5">
          <CheckCircleIcon className="w-4 h-4" />
          {initial ? 'Actualizar' : 'Registrar solicitud'}
        </button>
      </div>
    </form>
  )
}

// ─── Panel historial por máquina ──────────────────────────────────────────────
function PanelServicios({ maquina, solicitudes, onSolicitar }) {
  const { dispatch } = useApp()
  const toast = useToast()
  const [editando, setEditando] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  const misSolicitudes = [...solicitudes]
    .filter(s => s.maquinaId === maquina.id)
    .sort((a, b) => (b.fechaSolicitud || '').localeCompare(a.fechaSolicitud || ''))

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Historial de servicios</p>
        <button onClick={onSolicitar} className="flex items-center gap-1 text-xs font-semibold text-[#1e3a5f] hover:underline">
          <PlusIcon className="w-3.5 h-3.5" />Solicitar servicio
        </button>
      </div>

      {misSolicitudes.length === 0 && (
        <p className="text-xs text-gray-400 italic py-2">Sin servicios registrados.</p>
      )}

      <div className="space-y-2">
        {misSolicitudes.map(s => (
          <div key={s.id} className="rounded-xl border border-gray-100 bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.tipo === 'Correctivo' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{s.tipo}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${estadoServColor[s.estado] || 'bg-gray-100 text-gray-500'}`}>{s.estado}</span>
                  {s.numero && <span className="text-[10px] text-gray-400">{s.numero}</span>}
                  {s.cotizacionNumero && <span className="text-[10px] text-blue-600 font-semibold">{s.cotizacionNumero}</span>}
                </div>
                <p className="text-xs text-gray-700 mt-1 font-medium">{s.descripcion || '—'}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {s.proveedorNombre || 'Sin proveedor'} · Solicitud: {fmtDate(s.fechaSolicitud)}
                  {s.fechaRecojo ? ` · Recojo: ${fmtDate(s.fechaRecojo)}` : ''}
                </p>
                {s.costo != null && <p className="text-[11px] font-bold text-[#1e3a5f] mt-0.5">S/ {parseFloat(s.costo).toFixed(2)}</p>}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => setEditando(s)} className="text-blue-400 hover:text-blue-600 p-1 rounded"><PencilIcon className="w-3.5 h-3.5" /></button>
                <button onClick={() => setConfirmDel(s)} className="text-red-300 hover:text-red-600 p-1 rounded"><TrashIcon className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editando && (
        <Modal title="Editar servicio" onClose={() => setEditando(null)}>
          <SolicitudForm maquina={maquina} initial={editando} onClose={() => setEditando(null)} />
        </Modal>
      )}
      {confirmDel && (
        <Confirm message="¿Eliminar este registro de servicio?"
          onConfirm={() => { dispatch({ type: 'DELETE_SOLICITUD_MANT', id: confirmDel.id }); toast('Eliminado'); setConfirmDel(null) }}
          onCancel={() => setConfirmDel(null)} />
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Maquinas() {
  const { state, dispatch } = useApp()
  const { isAdmin } = useAuth()
  const toast = useToast()

  const [tab,            setTab]           = useState('maquinas')
  const [showForm,       setShowForm]      = useState(false)
  const [editing,        setEditing]       = useState(null)
  const [confirm,        setConfirm]       = useState(null)
  const [filtroSede,     setFiltroSede]    = useState('')
  const [filtroEstado,   setFiltroEstado]  = useState('')
  const [expandedId,     setExpandedId]    = useState(null)
  const [solicitarPara,  setSolicitarPara] = useState(null)
  const [filtroServSede,   setFiltroServSede]   = useState('')
  const [filtroServEstado, setFiltroServEstado] = useState('')

  const sedeMap     = Object.fromEntries((state.sedes || []).map(s => [s.id, s.nombre]))
  const solicitudes = state.solicitudesMantenimiento || []

  const alertas = useMemo(() =>
    (state.maquinas || [])
      .map(m => { const a = alertaFecha(m.proximoMantenimiento); return a?.urgente ? { ...m, alerta: a } : null })
      .filter(Boolean)
      .sort((a, b) => (diasHasta(a.proximoMantenimiento) ?? 999) - (diasHasta(b.proximoMantenimiento) ?? 999))
  , [state.maquinas])

  const filtered = (state.maquinas || [])
    .filter(m => !filtroSede   || m.sedeId === filtroSede)
    .filter(m => !filtroEstado || m.estado === filtroEstado)
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  const filteredServs = solicitudes
    .filter(s => !filtroServSede   || s.sedeId === filtroServSede)
    .filter(s => !filtroServEstado || s.estado === filtroServEstado)
    .sort((a, b) => (b.fechaSolicitud || '').localeCompare(a.fechaSolicitud || ''))

  const activos = solicitudes.filter(s => ['Solicitado', 'Cotización recibida', 'Programado', 'En proceso'].includes(s.estado)).length

  return (
    <div className="space-y-4">
      <PageHeader title="Activos y Equipos" subtitle="Máquinas, equipos de oficina y activos por sede"
        action={<button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2"><PlusIcon className="w-4 h-4" />Nuevo Activo</button>} />

      {/* Banner alertas */}
      {alertas.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-100">
            <BellAlertIcon className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-bold text-amber-800">
              {alertas.some(a => diasHasta(a.proximoMantenimiento) < 0)
                ? `${alertas.filter(a => diasHasta(a.proximoMantenimiento) < 0).length} activo(s) con mantenimiento VENCIDO`
                : `${alertas.length} activo(s) con mantenimiento próximo (≤30 días)`}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {alertas.slice(0, 5).map(a => (
              <div key={a.id} className="flex items-center gap-4 px-4 py-2.5">
                <div className={`w-2 h-2 rounded-full shrink-0 ${a.alerta.dot}`} />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-bold text-gray-800">{a.nombre}</span>
                  <span className="text-xs text-gray-400 mx-1.5">·</span>
                  <span className="text-xs text-gray-500">{sedeMap[a.sedeId] || '—'}</span>
                </div>
                <span className={`text-xs font-bold shrink-0 ${a.alerta.color}`}>{a.alerta.label}</span>
                <button onClick={() => setSolicitarPara(a)}
                  className="text-xs font-semibold bg-[#1e3a5f] text-white px-3 py-1 rounded-lg hover:bg-[#16304f] shrink-0">
                  Solicitar servicio
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id: 'maquinas',  label: 'Máquinas',           Icon: WrenchScrewdriverIcon },
          { id: 'servicios', label: 'Historial Servicios', Icon: ClipboardDocumentListIcon },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === t.id ? 'bg-white text-[#1e3a5f] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <t.Icon className="w-4 h-4" />{t.label}
            {t.id === 'servicios' && activos > 0 && (
              <span className="ml-0.5 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">{activos}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── TAB MÁQUINAS ── */}
      {tab === 'maquinas' && (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex gap-3">
            <select className="input max-w-[200px]" value={filtroSede} onChange={e => setFiltroSede(e.target.value)}>
              <option value="">Todas las sedes</option>
              {(state.sedes || []).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
            <select className="input max-w-[200px]" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              {ESTADOS.map(e => <option key={e}>{e}</option>)}
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1e3a5f] text-white text-[11px] uppercase">
                  <th className="table-th text-white">Nombre / Código</th>
                  <th className="table-th text-white">Marca / Modelo</th>
                  <th className="table-th text-white">Sede</th>
                  <th className="table-th text-white">F. Ingreso</th>
                  <th className="table-th text-white">Estado</th>
                  <th className="table-th text-white">Próx. Mant.</th>
                  <th className="table-th text-white">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => {
                  const alerta = alertaFecha(m.proximoMantenimiento)
                  const isExp  = expandedId === m.id
                  return (
                    <React.Fragment key={m.id}>
                      <tr className={`hover:bg-gray-50/50 border-b border-gray-50 ${isExp ? 'bg-blue-50/30' : ''}`}>
                        <td className="table-td font-semibold text-gray-800">{m.nombre}</td>
                        <td className="table-td text-gray-400 text-xs">{[m.marca, m.modelo].filter(Boolean).join(' / ') || '—'}</td>
                        <td className="table-td">{sedeMap[m.sedeId] || '—'}</td>
                        <td className="table-td text-xs text-gray-400">{fmtDate(m.fechaIngreso)}</td>
                        <td className="table-td">
                          <span className={`badge ${estadoMaqColor[m.estado] || 'bg-gray-100 text-gray-600'}`}>{m.estado}</span>
                        </td>
                        <td className="table-td">
                          {m.proximoMantenimiento && alerta
                            ? <span className={`flex items-center gap-1 text-xs font-bold ${alerta.color}`}>
                                <span className={`w-2 h-2 rounded-full shrink-0 ${alerta.dot}`} />
                                {fmtDate(m.proximoMantenimiento)} · {alerta.label}
                              </span>
                            : m.proximoMantenimiento
                              ? <span className="text-xs text-gray-500">{fmtDate(m.proximoMantenimiento)}</span>
                              : <span className="text-xs text-gray-300">—</span>}
                        </td>
                        <td className="table-td">
                          <div className="flex gap-1">
                            <button onClick={() => setExpandedId(isExp ? null : m.id)}
                              title="Ver historial" className="text-[#1e3a5f] hover:bg-[#1e3a5f]/10 p-1 rounded">
                              <ClipboardDocumentListIcon className="w-4 h-4" />
                            </button>
                            <button onClick={() => setSolicitarPara(m)}
                              title="Solicitar servicio" className="text-amber-500 hover:text-amber-700 p-1 rounded">
                              <ArrowPathIcon className="w-4 h-4" />
                            </button>
                            {isAdmin && <>
                              <button onClick={() => setEditing(m)} className="text-blue-400 hover:text-blue-600 p-1 rounded"><PencilIcon className="w-4 h-4" /></button>
                              <button onClick={() => setConfirm(m)} className="text-red-300 hover:text-red-600 p-1 rounded"><TrashIcon className="w-4 h-4" /></button>
                            </>}
                          </div>
                        </td>
                      </tr>
                      {isExp && (
                        <tr>
                          <td colSpan={8} className="p-0 bg-gray-50/50 border-b border-gray-100 border-l-4 border-l-[#1e3a5f]/20">
                            <PanelServicios maquina={m} solicitudes={solicitudes} onSolicitar={() => setSolicitarPara(m)} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="table-td text-center text-gray-400 py-8">Sin máquinas registradas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── TAB HISTORIAL SERVICIOS ── */}
      {tab === 'servicios' && (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Solicitados',     n: solicitudes.filter(s => s.estado === 'Solicitado').length,          bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
              { label: 'Cotiz. recibida', n: solicitudes.filter(s => s.estado === 'Cotización recibida').length, bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
              { label: 'Programados',     n: solicitudes.filter(s => s.estado === 'Programado').length,          bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-200' },
              { label: 'Completados',     n: solicitudes.filter(s => s.estado === 'Completado').length,          bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
            ].map(k => (
              <div key={k.label} className={`${k.bg} border ${k.border} rounded-2xl p-4 text-center`}>
                <p className={`text-3xl font-black ${k.text}`}>{k.n}</p>
                <p className="text-xs text-gray-500 mt-1">{k.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex gap-3">
            <select className="input max-w-[200px]" value={filtroServSede} onChange={e => setFiltroServSede(e.target.value)}>
              <option value="">Todas las sedes</option>
              {(state.sedes || []).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
            <select className="input max-w-[200px]" value={filtroServEstado} onChange={e => setFiltroServEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              {ESTADOS_SERV.map(e => <option key={e}>{e}</option>)}
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#1e3a5f] text-white text-[11px] uppercase">
                  <th className="table-th text-white">#</th>
                  <th className="table-th text-white">Máquina</th>
                  <th className="table-th text-white">Sede</th>
                  <th className="table-th text-white">Tipo</th>
                  <th className="table-th text-white">Descripción</th>
                  <th className="table-th text-white">Proveedor</th>
                  <th className="table-th text-white">F. Solicitud</th>
                  <th className="table-th text-white">F. Recojo</th>
                  <th className="table-th text-white">Costo</th>
                  <th className="table-th text-white">Cotización</th>
                  <th className="table-th text-white">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredServs.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/50">
                    <td className="table-td text-xs text-gray-400">{s.numero}</td>
                    <td className="table-td font-semibold text-gray-800">{s.maquinaNombre}</td>
                    <td className="table-td text-xs text-gray-500">{sedeMap[s.sedeId] || '—'}</td>
                    <td className="table-td">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.tipo === 'Correctivo' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{s.tipo}</span>
                    </td>
                    <td className="table-td text-gray-600 text-xs max-w-[180px] truncate">{s.descripcion || '—'}</td>
                    <td className="table-td text-gray-600 text-xs">{s.proveedorNombre || '—'}</td>
                    <td className="table-td text-xs text-gray-400 whitespace-nowrap">{fmtDate(s.fechaSolicitud)}</td>
                    <td className="table-td text-xs text-gray-400 whitespace-nowrap">{s.fechaRecojo ? fmtDate(s.fechaRecojo) : '—'}</td>
                    <td className="table-td text-xs font-bold text-[#1e3a5f]">{s.costo != null ? `S/ ${parseFloat(s.costo).toFixed(2)}` : '—'}</td>
                    <td className="table-td text-xs text-blue-600 font-semibold">{s.cotizacionNumero || '—'}</td>
                    <td className="table-td">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${estadoServColor[s.estado] || 'bg-gray-100 text-gray-500'}`}>{s.estado}</span>
                    </td>
                  </tr>
                ))}
                {filteredServs.length === 0 && (
                  <tr><td colSpan={11} className="table-td text-center text-gray-400 py-8">Sin servicios registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modales */}
      {showForm && <Modal title="Nuevo Activo / Equipo"  onClose={() => setShowForm(false)}><MaquinaForm onClose={() => setShowForm(false)} /></Modal>}
      {editing  && <Modal title="Editar Activo / Equipo" onClose={() => setEditing(null)}><MaquinaForm initial={editing} onClose={() => setEditing(null)} /></Modal>}
      {solicitarPara && (
        <Modal title={`Solicitar servicio — ${solicitarPara.nombre}`} onClose={() => setSolicitarPara(null)}>
          <SolicitudForm maquina={solicitarPara} onClose={() => setSolicitarPara(null)} />
        </Modal>
      )}
      {confirm && (
        <Confirm message={`¿Eliminar "${confirm.nombre}"?`}
          onConfirm={() => { dispatch({ type: 'DELETE_MAQUINA', id: confirm.id }); toast('Eliminado'); setConfirm(null) }}
          onCancel={() => setConfirm(null)}
          danger
        />
      )}
    </div>
  )
}
