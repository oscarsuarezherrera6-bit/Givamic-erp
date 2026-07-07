import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/layout/Toast'
import { genId, fmtDate, todayISO } from '../utils/helpers'
import Modal from '../components/common/Modal'
import PageHeader from '../components/common/PageHeader'
import {
  PlusIcon, ExclamationTriangleIcon, CheckCircleIcon,
  ClockIcon, PencilSquareIcon, TrashIcon, ShieldCheckIcon
} from '@heroicons/react/24/outline'

const TIPOS_EPP = [
  'Guantes de Nitrilo', 'Guantes de Látex', 'Guantes de Cuero',
  'Mascarilla KN95', 'Mascarilla Quirúrgica', 'Respirador N95',
  'Casco de Seguridad', 'Lentes de Seguridad', 'Careta Facial',
  'Botas de Jebe', 'Zapatos de Seguridad', 'Chaleco Reflectivo',
  'Mameluco Tyvek', 'Tapones para Oídos', 'Arnés de Seguridad',
]

const EMPTY = {
  trabajador: '', dni: '', sedeId: '', tipoEPP: '',
  talla: '', cantidad: 1, fechaEntrega: todayISO(), diasCambio: 30, observaciones: ''
}

function estadoEPP(fechaEntrega, diasCambio) {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const entrega = new Date(fechaEntrega + 'T00:00:00')
  const diasTranscurridos = Math.floor((hoy - entrega) / 86400000)
  const diasRestantes = (diasCambio || 30) - diasTranscurridos
  if (diasRestantes <= 0) return { label: 'Cambio Requerido', color: 'red', dias: diasRestantes }
  if (diasRestantes <= 5) return { label: 'Por Vencer', color: 'orange', dias: diasRestantes }
  return { label: 'Vigente', color: 'green', dias: diasRestantes }
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

function EPPForm({ initial, onClose }) {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const [form, setForm] = useState(initial || EMPTY)
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
        <div className="col-span-2 sm:col-span-1">
          <label className="text-xs font-medium text-gray-600 block mb-1">Trabajador *</label>
          <input className="input" value={form.trabajador} onChange={e => set('trabajador', e.target.value)} placeholder="Nombre completo" required />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">DNI</label>
          <input className="input" value={form.dni} onChange={e => set('dni', e.target.value)} placeholder="12345678" maxLength={8} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Sede *</label>
          <select className="input" value={form.sedeId} onChange={e => set('sedeId', e.target.value)} required>
            <option value="">Seleccionar...</option>
            {state.sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
        <div className="col-span-2 sm:col-span-1">
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
          <input className="input" type="number" min="1" value={form.cantidad} onChange={e => set('cantidad', parseInt(e.target.value)||1)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Fecha de Entrega *</label>
          <input className="input" type="date" value={form.fechaEntrega} onChange={e => set('fechaEntrega', e.target.value)} required />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Días para cambio</label>
          <input className="input" type="number" min="1" value={form.diasCambio} onChange={e => set('diasCambio', parseInt(e.target.value)||30)} />
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

export default function EPPs() {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filtroSede, setFiltroSede] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroRenuncio, setFiltroRenuncio] = useState(false)
  const [confirmData, setConfirmData] = useState(null) // { type, id, epp, msg, icon, color }

  const epps = state.epps || []
  const sedeMap = Object.fromEntries(state.sedes.map(s => [s.id, s.nombre]))

  const eppsConEstado = useMemo(() =>
    epps.map(e => ({ ...e, estado: estadoEPP(e.fechaEntrega, e.diasCambio) }))
  , [epps])

  const filtrados = eppsConEstado.filter(e => {
    if (filtroRenuncio) return e.estado_personal === 'Renunció'
    if (e.estado_personal === 'Renunció') return false
    if (filtroSede && e.sedeId !== filtroSede) return false
    if (filtroEstado === 'alerta' && e.estado.color === 'green') return false
    if (filtroEstado === 'vigente' && e.estado.color !== 'green') return false
    return true
  })
  const totalRenunciados = eppsConEstado.filter(e => e.estado_personal === 'Renunció').length

  const activos = eppsConEstado.filter(e => e.estado_personal !== 'Renunció')
  const totalAlerta = activos.filter(e => e.estado.color !== 'green').length
  const totalCambio = activos.filter(e => e.estado.color === 'red').length
  const totalVencer = activos.filter(e => e.estado.color === 'orange').length

  const { isAdmin } = useAuth()
  const handleEdit = (epp) => { setEditing(epp); setShowForm(true) }
  const handleDelete = (id) => {
    setConfirmData({ type:'delete', id, msg:'¿Eliminar este registro de EPP? Esta acción no se puede deshacer.', icon:'🗑️', color:'red' })
  }
  const handleClose = () => { setShowForm(false); setEditing(null) }
  const handleRenuncio = (epp) => {
    setConfirmData({ type:'renuncio', epp, msg:`¿Marcar a ${epp.trabajador} como renunciado? Sus EPPs quedarán inactivos y se ocultarán de la lista activa.`, icon:'👤', color:'amber' })
  }
  const executeConfirm = () => {
    if (!confirmData) return
    if (confirmData.type === 'delete') {
      dispatch({ type: 'DELETE_EPP', id: confirmData.id })
      toast('Registro eliminado')
    } else if (confirmData.type === 'renuncio') {
      const epp = confirmData.epp
      dispatch({ type: 'UPDATE_EPP', id: epp.id, payload: { ...epp, estado_personal: 'Renunció', renuncioFecha: new Date().toISOString().slice(0,10) } })
      toast(`${epp.trabajador} marcado como renunciado`)
    }
    setConfirmData(null)
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Control de SSOMA"
        subtitle="Seguridad, Salud Ocupacional y Medio Ambiente"
        action={
          <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
            <PlusIcon className="w-4 h-4" />Nueva Entrega
          </button>
        }
      />

      {/* Alertas resumen */}
      {totalAlerta > 0 && (
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

      {/* KPIs */}
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
        <button onClick={()=>setFiltroRenuncio(p=>!p)}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg border transition-all ${filtroRenuncio?'bg-gray-700 border-gray-700 text-white':'bg-white border-gray-200 text-gray-500 hover:border-gray-400'}`}>
          <span>{filtroRenuncio?'✓ ':''}</span>Ver renunciados {totalRenunciados>0&&<span className="bg-gray-300 text-gray-700 rounded-full text-[10px] px-1.5 py-0.5 font-bold">{totalRenunciados}</span>}
        </button>
      </div>

      {/* Tabla */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: 720 }}>
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="table-th">Trabajador</th>
              <th className="table-th">DNI</th>
              <th className="table-th">Sede</th>
              <th className="table-th">Tipo EPP</th>
              <th className="table-th">Talla</th>
              <th className="table-th text-center">Cant.</th>
              <th className="table-th">F. Entrega</th>
              <th className="table-th text-center">Días rest.</th>
              <th className="table-th">Estado</th>
              <th className="table-th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtrados.map(e => (
              <tr key={e.id} className={`hover:bg-gray-50/50 ${e.estado_personal==='Renunció'?'opacity-50 bg-gray-50':e.estado.color === 'red' ? 'bg-red-50/30' : e.estado.color === 'orange' ? 'bg-orange-50/20' : ''}`}>
                <td className="table-td font-medium text-gray-800">{e.trabajador}</td>
                <td className="table-td text-gray-500 font-mono text-xs">{e.dni || '—'}</td>
                <td className="table-td text-gray-600">{sedeMap[e.sedeId] || e.sedeId}</td>
                <td className="table-td">{e.tipoEPP}</td>
                <td className="table-td text-center">{e.talla || '—'}</td>
                <td className="table-td text-center">{e.cantidad}</td>
                <td className="table-td">{fmtDate(e.fechaEntrega)}</td>
                <td className="table-td text-center">
                  <span className={`font-bold ${e.estado.color === 'red' ? 'text-red-600' : e.estado.color === 'orange' ? 'text-orange-600' : 'text-green-600'}`}>
                    {e.estado.dias <= 0 ? `+${Math.abs(e.estado.dias)}d vencido` : `${e.estado.dias}d`}
                  </span>
                </td>
                <td className="table-td"><Badge estado={e.estado} /></td>
                {isAdmin && (
                  <td className="table-td">
                    <div className="flex items-center gap-1">
                      {e.estado_personal !== 'Renunció' && (
                        <button onClick={() => handleEdit(e)} className="text-blue-400 hover:text-blue-600 p-1 rounded" title="Editar">
                          <PencilSquareIcon className="w-4 h-4" />
                        </button>
                      )}
                      {e.estado_personal !== 'Renunció' && (
                        <button onClick={() => handleRenuncio(e)}
                          className="text-xs font-medium px-2 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-amber-100 hover:text-amber-700 border border-gray-200 hover:border-amber-300 transition-all"
                          title="Marcar como renunciado">
                          Renunció
                        </button>
                      )}
                      {e.estado_personal === 'Renunció' && (
                        <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-gray-200 text-gray-500">Inactivo</span>
                      )}
                      <button onClick={() => handleDelete(e.id)} className="text-red-300 hover:text-red-600 p-1 rounded" title="Eliminar">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr><td colSpan={10} className="table-td text-center text-gray-400 py-10">No hay registros de EPP</td></tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Confirm Modal */}
      {confirmData && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in">
            <div className={`px-6 pt-6 pb-4`}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmData.color==='red'?'bg-red-100':'bg-amber-100'}`}>
                <span className="text-2xl">{confirmData.icon}</span>
              </div>
              <h3 className="text-center font-semibold text-gray-800 text-base mb-2">
                {confirmData.type==='delete' ? 'Eliminar registro' : 'Marcar como renunciado'}
              </h3>
              <p className="text-center text-sm text-gray-500 leading-relaxed">{confirmData.msg}</p>
            </div>
            <div className="flex gap-3 px-6 pb-6 pt-2">
              <button onClick={()=>setConfirmData(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
                Cancelar
              </button>
              <button onClick={executeConfirm}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all ${confirmData.color==='red'?'bg-red-500 hover:bg-red-600':'bg-amber-500 hover:bg-amber-600'}`}>
                {confirmData.type==='delete' ? 'Eliminar' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <Modal title={editing ? 'Editar EPP' : 'Registrar Entrega de EPP'} onClose={handleClose} wide>
          <EPPForm initial={editing} onClose={handleClose} />
        </Modal>
      )}
    </div>
  )
}
