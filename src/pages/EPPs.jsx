import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'

const fullApellidos = (t) => {
  if (t?.apellidoPaterno || t?.apellidoMaterno)
    return [t.apellidoPaterno, t.apellidoMaterno].filter(Boolean).join(' ')
  return t?.apellidos || ''
}
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/layout/Toast'
import { genId, fmtDate, todayISO } from '../utils/helpers'
import Modal from '../components/common/Modal'
import PageHeader from '../components/common/PageHeader'
import {
  PlusIcon, ExclamationTriangleIcon, CheckCircleIcon,
  ClockIcon, PencilSquareIcon, TrashIcon, ShieldCheckIcon,
  UsersIcon, MagnifyingGlassIcon
} from '@heroicons/react/24/outline'

const TIPOS_EPP = [
  'Polo de Trabajo',
  'Mameluco Tyvek', 'Chaleco Reflectivo',
  'Botas de Jebe', 'Zapatos de Seguridad',
  'Guantes de Nitrilo', 'Guantes de Látex', 'Guantes de Cuero',
  'Mascarilla KN95', 'Mascarilla Quirúrgica', 'Respirador N95',
  'Casco de Seguridad', 'Lentes de Seguridad', 'Careta Facial',
  'Tapones para Oídos', 'Arnés de Seguridad',
]

const EMPTY = {
  trabajadorId: '', trabajador: '', dni: '', sedeId: '', tipoEPP: '',
  talla: '', cantidad: 1, fechaEntrega: todayISO(), diasCambio: 30, observaciones: ''
}

function estadoEPP(fechaEntrega, diasCambio) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const entrega = new Date(fechaEntrega + 'T00:00:00')
  const diasTranscurridos = Math.floor((hoy - entrega) / 86400000)
  const diasRestantes = (diasCambio || 30) - diasTranscurridos
  if (diasRestantes <= 0) return { label: 'Cambio Requerido', color: 'red', dias: diasRestantes }
  if (diasRestantes <= 5) return { label: 'Por Vencer', color: 'orange', dias: diasRestantes }
  return { label: 'Vigente', color: 'green', dias: diasRestantes }
}

function semaforoDoc(fecha) {
  if (!fecha) return null
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const f = new Date(fecha + 'T00:00:00')
  const dias = Math.floor((f - hoy) / 86400000)
  if (dias < 0) return { color: 'red', label: 'Vencido' }
  if (dias <= 30) return { color: 'orange', label: `${dias}d` }
  return { color: 'green', label: 'OK' }
}

const clsDoc = {
  red: 'bg-red-100 text-red-700',
  orange: 'bg-orange-100 text-orange-700',
  green: 'bg-green-100 text-green-700',
}

function Badge({ estado }) {
  const styles = {
    red: 'bg-red-100 text-red-700 border border-red-200',
    orange: 'bg-orange-100 text-orange-700 border border-orange-200',
    green: 'bg-green-100 text-green-700 border border-green-200',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${styles[estado.color]}`}>
      {estado.color === 'red' && <ExclamationTriangleIcon className="w-3 h-3" />}
      {estado.color === 'orange' && <ClockIcon className="w-3 h-3" />}
      {estado.color === 'green' && <CheckCircleIcon className="w-3 h-3" />}
      {estado.label}
    </span>
  )
}

function EmoSctrBadge({ t }) {
  if (!t) return <span className="text-[9px] text-gray-300">—</span>
  const emoFecha = t.documentos?.emo?.fechaVencimiento || t.emoVigencia || null
  const sctrFecha = t.documentos?.sctr?.fechaVencimiento || t.sctrVigencia || null
  const emo = semaforoDoc(emoFecha)
  const sctr = semaforoDoc(sctrFecha)
  return (
    <div className="flex flex-col gap-0.5">
      {emo
        ? <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${clsDoc[emo.color]}`}>EMO {emo.label}</span>
        : <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">EMO Pend.</span>}
      {sctr
        ? <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${clsDoc[sctr.color]}`}>SCTR {sctr.label}</span>
        : <span className="text-[9px] text-gray-300 px-1.5">SCTR —</span>}
    </div>
  )
}

function EPPForm({ initial, onClose, prefillTrabajador }) {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const init = prefillTrabajador
    ? { ...EMPTY, trabajadorId: prefillTrabajador.id, trabajador: `${fullApellidos(prefillTrabajador)}, ${prefillTrabajador.nombres}`, dni: prefillTrabajador.documento || '', sedeId: prefillTrabajador.sedeId || '' }
    : (initial || EMPTY)
  const [form, setForm] = useState(init)
  const isEdit = !!initial?.id
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.trabajador || !form.sedeId || !form.tipoEPP || !form.fechaEntrega) {
      return toast('Completa los campos obligatorios', 'error')
    }
    if (isEdit) {
      dispatch({ type: 'UPDATE_EPP', id: initial.id, payload: form })
      toast('EPP actualizado', 'success')
    } else {
      dispatch({ type: 'ADD_EPP', payload: { ...form, id: genId() } })
      toast('EPP registrado', 'success')
    }
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-600 block mb-1">
            Trabajador * <span className="text-gray-400 font-normal">(solo personal activo)</span>
          </label>
          <select className="input" value={form.trabajadorId} onChange={e => {
            const t = (state.trabajadores || []).find(x => x.id === e.target.value)
            if (t) {
              set('trabajadorId', t.id)
              set('trabajador', `${fullApellidos(t)}, ${t.nombres}`)
              set('dni', t.documento || '')
              if (t.sedeId) set('sedeId', t.sedeId || '')
            } else {
              set('trabajadorId', ''); set('trabajador', ''); set('dni', '')
            }
          }} required>
            <option value="">Seleccionar trabajador...</option>
            {(state.trabajadores || []).filter(t => t.estado === 'Activo').map(t => (
              <option key={t.id} value={t.id}>
                {fullApellidos(t)}, {t.nombres} — {t.documento}
                {t.tallaPolo ? ` | Polo: ${t.tallaPolo}` : ''}
                {t.tallaBotas ? ` | Botas: ${t.tallaBotas}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Sede *</label>
          <select className="input" value={form.sedeId} onChange={e => set('sedeId', e.target.value)} required>
            <option value="">Seleccionar...</option>
            {state.sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Tipo de EPP *</label>
          <select className="input" value={form.tipoEPP} onChange={e => set('tipoEPP', e.target.value)} required>
            <option value="">Seleccionar...</option>
            {TIPOS_EPP.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Talla</label>
          <input className="input" value={form.talla} onChange={e => set('talla', e.target.value)} placeholder="M / 40 / ÚNICO" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Cantidad</label>
          <input className="input" type="number" min="1" value={form.cantidad} onChange={e => set('cantidad', parseInt(e.target.value) || 1)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Fecha de Entrega *</label>
          <input className="input" type="date" value={form.fechaEntrega} onChange={e => set('fechaEntrega', e.target.value)} required />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Días para cambio</label>
          <input className="input" type="number" min="1" value={form.diasCambio} onChange={e => set('diasCambio', parseInt(e.target.value) || 30)} />
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-600 block mb-1">Observaciones</label>
          <input className="input" value={form.observaciones} onChange={e => set('observaciones', e.target.value)} placeholder="Notas adicionales..." />
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
        <button type="submit" className="btn-primary">{isEdit ? 'Actualizar' : 'Registrar EPP'}</button>
      </div>
    </form>
  )
}

// ── Tab: Padrón de Personal ───────────────────────────────────────────────────
function TabPadron({ onAsignarEPP }) {
  const { state } = useApp()
  const [search, setSearch] = useState('')

  const trabajadores = state.trabajadores || []
  const epps = state.epps || []
  const sedeMap = Object.fromEntries(state.sedes.map(s => [s.id, s.nombre]))

  // EPPs por trabajador
  const eppsMap = useMemo(() => {
    const m = {}
    epps.forEach(e => {
      if (!m[e.trabajadorId]) m[e.trabajadorId] = []
      m[e.trabajadorId].push(e)
    })
    return m
  }, [epps])

  const activos = useMemo(() => {
    const q = search.toLowerCase()
    return trabajadores
      .filter(t => t.estado === 'Activo')
      .filter(t =>
        !q ||
        `${t.nombres} ${fullApellidos(t)}`.toLowerCase().includes(q) ||
        (t.documento || '').includes(q) ||
        (t.cargo || '').toLowerCase().includes(q)
      )
  }, [trabajadores, search])

  const sinEPP = activos.filter(t => !eppsMap[t.id]?.length).length
  const sinEMO = activos.filter(t => {
    const emoFecha = t.documentos?.emo?.fechaVencimiento || t.emoVigencia || null
    return !emoFecha
  }).length

  return (
    <div className="space-y-4">
      {/* KPIs padrón */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <UsersIcon className="w-5 h-5 text-[#1e3a5f]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{activos.length}</p>
            <p className="text-xs text-gray-500">Personal activo</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
            <ShieldCheckIcon className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-600">{sinEPP}</p>
            <p className="text-xs text-gray-500">Sin EPP asignado</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{sinEMO}</p>
            <p className="text-xs text-gray-500">Sin EMO registrado</p>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative w-full max-w-sm">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="input pl-9 text-sm"
          placeholder="Buscar por nombre, DNI o cargo..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Tabla padrón */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 750 }}>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="table-th">Trabajador</th>
                <th className="table-th">Cargo</th>
                <th className="table-th">Sede</th>
                <th className="table-th text-center">EPPs asignados</th>
                <th className="table-th">EMO / SCTR</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {activos.map(t => {
                const eppsTrab = eppsMap[t.id] || []
                const emoFecha = t.documentos?.emo?.fechaVencimiento || t.emoVigencia || null
                const sinEppFlag = eppsTrab.length === 0
                return (
                  <tr key={t.id} className={`hover:bg-gray-50/50 ${sinEppFlag ? 'bg-orange-50/20' : ''}`}>
                    <td className="table-td">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-gray-800 text-xs">{fullApellidos(t)}, {t.nombres}</span>
                        <span className="text-gray-400 font-mono text-[10px]">{t.documento || '—'}</span>
                      </div>
                    </td>
                    <td className="table-td text-xs text-gray-600">{t.cargo || '—'}</td>
                    <td className="table-td text-xs text-gray-600">{sedeMap[t.sedeId] || '—'}</td>
                    <td className="table-td text-center">
                      {sinEppFlag
                        ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Sin EPP</span>
                        : <span className="text-[11px] font-bold text-[#1e3a5f] bg-blue-50 px-2 py-0.5 rounded-full">{eppsTrab.length}</span>
                      }
                    </td>
                    <td className="table-td"><EmoSctrBadge t={t} /></td>
                    <td className="table-td">
                      <button
                        onClick={() => onAsignarEPP(t)}
                        className="text-xs text-[#1e3a5f] hover:text-white hover:bg-[#1e3a5f] border border-[#1e3a5f]/30 hover:border-[#1e3a5f] px-2.5 py-1 rounded-lg transition-all font-medium"
                      >
                        + EPP
                      </button>
                    </td>
                  </tr>
                )
              })}
              {activos.length === 0 && (
                <tr>
                  <td colSpan={6} className="table-td text-center text-gray-400 py-10">
                    {search ? 'No se encontraron trabajadores' : 'No hay personal activo registrado'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function EPPs() {
  const { state, dispatch } = useApp()
  const { isAdmin } = useAuth()
  const toast = useToast()
  const [tab, setTab] = useState('epps')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [prefillTrab, setPrefillTrab] = useState(null)
  const [filtroSede, setFiltroSede] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroRenuncio, setFiltroRenuncio] = useState(false)
  const [filtroEMO, setFiltroEMO] = useState(false)
  const [confirmData, setConfirmData] = useState(null)

  const epps = state.epps || []
  const trabajadores = state.trabajadores || []
  const sedeMap = Object.fromEntries(state.sedes.map(s => [s.id, s.nombre]))
  const trabajadoresMap = Object.fromEntries(trabajadores.map(t => [t.id, t]))

  const eppsConEstado = useMemo(() =>
    epps.map(e => {
      const t = trabajadoresMap[e.trabajadorId]
      return { ...e, estado: estadoEPP(e.fechaEntrega, e.diasCambio), _trabajador: t }
    })
  , [epps, trabajadores])

  const emoPendientes = useMemo(() =>
    trabajadores.filter(t => {
      if (t.estado !== 'Activo') return false
      const emoFecha = t.documentos?.emo?.fechaVencimiento || t.emoVigencia || null
      return !emoFecha
    })
  , [trabajadores])

  const emoPendientesIds = useMemo(() => new Set(emoPendientes.map(t => t.id)), [emoPendientes])

  const filtrados = eppsConEstado.filter(e => {
    const esBaja = e._trabajador?.estado === 'Baja'
    if (filtroRenuncio) return esBaja
    if (esBaja) return false
    if (filtroSede && e.sedeId !== filtroSede) return false
    if (filtroEstado === 'alerta' && e.estado.color === 'green') return false
    if (filtroEstado === 'vigente' && e.estado.color !== 'green') return false
    if (filtroEMO && !emoPendientesIds.has(e.trabajadorId)) return false
    return true
  })

  const totalBaja = eppsConEstado.filter(e => e._trabajador?.estado === 'Baja').length
  const activos = eppsConEstado.filter(e => e._trabajador?.estado !== 'Baja')
  const totalAlerta = activos.filter(e => e.estado.color !== 'green').length
  const totalCambio = activos.filter(e => e.estado.color === 'red').length
  const totalVencer = activos.filter(e => e.estado.color === 'orange').length

  const handleEdit = (epp) => { setEditing(epp); setPrefillTrab(null); setShowForm(true) }
  const handleDelete = (id) => setConfirmData({ id, msg: '¿Eliminar este registro de EPP?' })
  const handleClose = () => { setShowForm(false); setEditing(null); setPrefillTrab(null) }
  const handleAsignarEPP = (t) => { setPrefillTrab(t); setEditing(null); setShowForm(true) }
  const executeConfirm = () => {
    if (!confirmData) return
    dispatch({ type: 'DELETE_EPP', id: confirmData.id })
    toast('Registro eliminado')
    setConfirmData(null)
  }

  const TABS = [
    { id: 'epps', label: 'Entregas EPP', Icon: ShieldCheckIcon },
    { id: 'padron', label: 'Padrón de Personal', Icon: UsersIcon },
  ]

  return (
    <div className="space-y-4">
      <PageHeader
        title="Control de SSOMA"
        subtitle="Seguridad, Salud Ocupacional y Medio Ambiente"
        action={
          <button onClick={() => { setPrefillTrab(null); setEditing(null); setShowForm(true) }} className="btn-primary flex items-center gap-2">
            <PlusIcon className="w-4 h-4" />Nueva Entrega
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t.id ? 'bg-white text-[#1e3a5f] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.Icon className="w-4 h-4" />
            {t.label}
            {t.id === 'padron' && trabajadores.filter(x => x.estado === 'Activo').length > 0 && (
              <span className="bg-[#1e3a5f] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                {trabajadores.filter(x => x.estado === 'Activo').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'padron' && <TabPadron onAsignarEPP={handleAsignarEPP} />}

      {tab === 'epps' && (
        <>
          {/* Banner EMO pendiente */}
          {emoPendientes.length > 0 && !filtroRenuncio && (
            <div className="rounded-xl p-3 flex items-center gap-3 bg-orange-50 border border-orange-200">
              <ExclamationTriangleIcon className="w-5 h-5 text-orange-500 shrink-0" />
              <p className="text-sm text-orange-700 flex-1">
                <span className="font-bold">{emoPendientes.length} trabajador{emoPendientes.length > 1 ? 'es' : ''}</span> sin EMO registrado — pendiente de programar examen médico
              </p>
              <button onClick={() => setFiltroEMO(p => !p)}
                className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors whitespace-nowrap ${
                  filtroEMO ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-orange-600 border-orange-300 hover:bg-orange-50'
                }`}>
                {filtroEMO ? '✓ Filtrando' : 'Ver solo estos'}
              </button>
            </div>
          )}

          {/* Banner alerta EPPs */}
          {totalAlerta > 0 && !filtroRenuncio && (
            <div className={`rounded-xl p-4 flex items-start gap-3 ${totalCambio > 0 ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-200'}`}>
              <ExclamationTriangleIcon className={`w-5 h-5 mt-0.5 shrink-0 ${totalCambio > 0 ? 'text-red-500' : 'text-orange-500'}`} />
              <div>
                <p className={`font-semibold text-sm ${totalCambio > 0 ? 'text-red-700' : 'text-orange-700'}`}>
                  {totalCambio > 0
                    ? `${totalCambio} EPP${totalCambio > 1 ? 's' : ''} requiere${totalCambio === 1 ? '' : 'n'} cambio inmediato`
                    : `${totalVencer} EPP${totalVencer > 1 ? 's' : ''} próximo${totalVencer === 1 ? '' : 's'} a vencer`}
                </p>
                <p className="text-xs mt-0.5 text-gray-600">
                  {totalCambio > 0 && `${totalCambio} con cambio requerido`}
                  {totalCambio > 0 && totalVencer > 0 && ' · '}
                  {totalVencer > 0 && `${totalVencer} por vencer (≤5 días)`}
                </p>
              </div>
            </div>
          )}

          {/* Estadísticas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <ShieldCheckIcon className="w-5 h-5 text-[#1e3a5f]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{activos.length}</p>
                <p className="text-xs text-gray-500">Total EPPs activos</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{activos.length - totalAlerta}</p>
                <p className="text-xs text-gray-500">Vigentes</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{totalAlerta}</p>
                <p className="text-xs text-gray-500">Con alerta</p>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex gap-3 flex-wrap">
            <select className="input w-auto text-sm" value={filtroSede} onChange={e => setFiltroSede(e.target.value)}>
              <option value="">Todas las sedes</option>
              {state.sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
            <select className="input w-auto text-sm" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
              <option value="">Todos los estados</option>
              <option value="alerta">Con alerta</option>
              <option value="vigente">Solo vigentes</option>
            </select>
            <button onClick={() => { setFiltroRenuncio(p => !p); setFiltroEMO(false) }}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-all ${
                filtroRenuncio ? 'bg-gray-700 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
              }`}>
              {filtroRenuncio ? '✓ ' : ''}Personal de Baja
              {totalBaja > 0 && <span className="bg-gray-300 text-gray-700 rounded-full text-[10px] px-1.5 py-0.5 font-bold">{totalBaja}</span>}
            </button>
          </div>

          {/* Tabla EPPs */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 720 }}>
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="table-th">Trabajador</th>
                    <th className="table-th">Sede</th>
                    <th className="table-th">Tipo EPP</th>
                    <th className="table-th">F. Entrega</th>
                    <th className="table-th text-center">Días rest.</th>
                    <th className="table-th">Estado EPP</th>
                    <th className="table-th">EMO / SCTR</th>
                    <th className="table-th"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtrados.map(e => (
                    <tr key={e.id} className={`hover:bg-gray-50/50 ${
                      e._trabajador?.estado === 'Baja' ? 'opacity-60 bg-gray-50/80'
                      : e.estado.color === 'red' ? 'bg-red-50/30'
                      : e.estado.color === 'orange' ? 'bg-orange-50/20' : ''
                    }`}>
                      <td className="table-td">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium text-gray-800 text-xs leading-tight">{e.trabajador}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-400 font-mono text-[10px]">{e.dni || '—'}</span>
                            {e._trabajador?.estado === 'Baja' && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 uppercase">Baja</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="table-td text-gray-600 text-xs">{sedeMap[e.sedeId] || e.sedeId}</td>
                      <td className="table-td text-xs">
                        {e.tipoEPP}{e.talla && <span className="text-gray-400 ml-1">({e.talla})</span>}
                      </td>
                      <td className="table-td text-xs">{fmtDate(e.fechaEntrega)}</td>
                      <td className="table-td text-center">
                        <span className={`font-bold text-xs ${
                          e.estado.color === 'red' ? 'text-red-600' : e.estado.color === 'orange' ? 'text-orange-600' : 'text-green-600'
                        }`}>
                          {e.estado.dias <= 0 ? `+${Math.abs(e.estado.dias)}d` : `${e.estado.dias}d`}
                        </span>
                      </td>
                      <td className="table-td"><Badge estado={e.estado} /></td>
                      <td className="table-td"><EmoSctrBadge t={e._trabajador} /></td>
                      {isAdmin && (
                        <td className="table-td">
                          <div className="flex items-center gap-1">
                            {e._trabajador?.estado !== 'Baja' && (
                              <button onClick={() => handleEdit(e)} className="text-blue-400 hover:text-blue-600 p-1 rounded">
                                <PencilSquareIcon className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => handleDelete(e.id)} className="text-red-300 hover:text-red-600 p-1 rounded">
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {filtrados.length === 0 && (
                    <tr><td colSpan={8} className="table-td text-center text-gray-400 py-10">No hay registros de EPP</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Confirm delete */}
      {confirmData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 pt-6 pb-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <TrashIcon className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-center font-semibold text-gray-800 text-base mb-2">Eliminar registro</h3>
              <p className="text-center text-sm text-gray-500">{confirmData.msg}</p>
            </div>
            <div className="flex gap-3 px-6 pb-6 pt-2">
              <button onClick={() => setConfirmData(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={executeConfirm}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600">
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <Modal title={editing ? 'Editar EPP' : 'Registrar Entrega de EPP'} onClose={handleClose} wide>
          <EPPForm initial={editing} prefillTrabajador={!editing ? prefillTrab : null} onClose={handleClose} />
        </Modal>
      )}
    </div>
  )
}
