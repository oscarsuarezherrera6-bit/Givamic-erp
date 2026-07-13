import React, { useState, useRef } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/layout/Toast'
import Modal from '../components/common/Modal'
import Confirm from '../components/common/Confirm'
import PageHeader from '../components/common/PageHeader'
import { PlusIcon, PencilIcon, TrashIcon, PhotoIcon, EyeIcon, EyeSlashIcon, ServerStackIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline'

const TAB_SEDES    = 'Sedes'
const TAB_PROVS    = 'Proveedores'
const TAB_EMPS     = 'Empresas del Grupo'
const TAB_LOGO     = 'Logo'
const TAB_APROB    = 'Aprobaciones'
const TAB_SISTEMA  = 'Sistema'

function GenericForm({ fields, initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || Object.fromEntries(fields.map(f => [f.key, ''])))
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const handleSubmit = (e) => { e.preventDefault(); onSave(form); onClose() }
  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {fields.map(f => (
        <div key={f.key}>
          <label className="text-xs font-medium text-gray-600 block mb-1">{f.label}{f.required ? ' *' : ''}</label>
          {f.type === 'select'
            ? <select className="input" value={form[f.key]} onChange={e => set(f.key, e.target.value)} required={f.required}>
                <option value="">Seleccionar...</option>
                {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            : <input className="input" type={f.type||'text'} value={form[f.key]||''} placeholder={f.placeholder||''} onChange={e => set(f.key, e.target.value)} required={f.required} />
          }
        </div>
      ))}
      <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
        <button type="submit" className="btn-primary">{initial ? 'Actualizar' : 'Agregar'}</button>
      </div>
    </form>
  )
}


const ROL_COLOR = {
  'Administrador':          'bg-purple-100 text-purple-700',
  'Gerencia':               'bg-rose-100 text-rose-700',
  'Coordinador General':    'bg-indigo-100 text-indigo-700',
  'Coordinador Operaciones':'bg-sky-100 text-sky-700',
  'Almacenero':             'bg-blue-100 text-blue-700',
  'Asistente Almacén':      'bg-blue-50 text-blue-600',
  'Supervisor':             'bg-amber-100 text-amber-700',
  'Contador':               'bg-green-100 text-green-700',
  'Facturación':            'bg-teal-100 text-teal-700',
  'Reclutamiento':          'bg-pink-100 text-pink-700',
  'Gestión Doc.':           'bg-orange-100 text-orange-700',
  'Coordinador':            'bg-cyan-100 text-cyan-700',
}

function PasswordCell({ password, isAdmin }) {
  const [visible, setVisible] = useState(false)
  if (!isAdmin) return <span className="text-gray-400 tracking-widest text-xs">••••••••</span>
  return (
    <div className="flex items-center gap-1.5">
      <span className={`font-mono text-xs ${visible ? 'text-gray-700' : 'text-gray-400 tracking-widest'}`}>
        {visible ? password : '••••••••'}
      </span>
      <button onClick={() => setVisible(v => !v)}
        className="text-gray-400 hover:text-[#1e3a5f] transition-colors"
        title={visible ? 'Ocultar' : 'Mostrar contraseña'}>
        {visible ? <EyeSlashIcon className="w-3.5 h-3.5"/> : <EyeIcon className="w-3.5 h-3.5"/>}
      </button>
    </div>
  )
}

function renderCell(col, row, isAdmin) {
  if (col.render) return col.render(row)
  const val = row[col.key]
  if (col.key === 'rol') return <span className={`badge text-xs ${ROL_COLOR[val] || 'bg-gray-100 text-gray-600'}`}>{val || '—'}</span>
  if (col.key === 'password') return <PasswordCell password={val} isAdmin={isAdmin} />
  return val || '—'
}

function Table({ cols, rows, onEdit, onDelete, isAdmin }) {
  return (
    <table className="w-full text-sm">
      <thead><tr className="bg-gray-50 border-b border-gray-100">
        {cols.map(c => <th key={c.key} className="table-th">{c.label}</th>)}
        {isAdmin && <th className="table-th">Acciones</th>}
      </tr></thead>
      <tbody className="divide-y divide-gray-50">
        {rows.map(r => (
          <tr key={r.id} className="hover:bg-gray-50/50">
            {cols.map(c => <td key={c.key} className="table-td">{renderCell(c, r, isAdmin)}</td>)}
            {isAdmin && (
              <td className="table-td"><div className="flex gap-2">
                <button onClick={() => onEdit(r)} className="text-blue-500 hover:text-blue-700"><PencilIcon className="w-4 h-4"/></button>
                <button onClick={() => onDelete(r)} className="text-red-400 hover:text-red-600"><TrashIcon className="w-4 h-4"/></button>
              </div></td>
            )}
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={cols.length + (isAdmin?1:0)} className="table-td text-center text-gray-400 py-8">Sin registros</td></tr>}
      </tbody>
    </table>
  )
}

// ══════════════════════════════════════════════════════════════════════════════
// TAB: EMPRESAS DEL GRUPO
// ══════════════════════════════════════════════════════════════════════════════
function TabEmpresasGrupo({ isAdmin }) {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const empresasGrupo = state.empresasGrupo || []
  const clientesRRHH  = state.clientesRRHH  || []

  const [openEg,  setOpenEg]  = React.useState({})
  const [openCli, setOpenCli] = React.useState({})

  // Modals empresa
  const [mEg,    setMEg]    = React.useState(null) // null | {mode, data}
  const [mCli,   setMCli]   = React.useState(null) // null | {mode, empresaId, data}
  const [mLoc,   setMLoc]   = React.useState(null) // null | {mode, clienteId, data?, id?}
  const [confirmDel, setConfirmDel] = React.useState(null)

  const toggleEg  = id => setOpenEg(p  => ({ ...p, [id]: !p[id] }))
  const toggleCli = id => setOpenCli(p => ({ ...p, [id]: !p[id] }))

  /* ─── Empresa ─── */
  const saveEg = (form) => {
    if (!form.nombre?.trim()) return
    if (mEg.mode === 'add') {
      dispatch({ type: 'ADD_EMPRESA_GRUPO', payload: { id: 'eg_' + Math.random().toString(36).slice(2,8), clienteIds: [], activo: true, ...form } })
      toast('Empresa agregada')
    } else {
      dispatch({ type: 'UPDATE_EMPRESA_GRUPO', id: mEg.data.id, payload: form })
      toast('Empresa actualizada')
    }
    setMEg(null)
  }

  /* ─── Cliente ─── */
  const saveCli = (form) => {
    if (!form.nombre?.trim()) return
    if (mCli.mode === 'add') {
      const newId = 'cr_' + Math.random().toString(36).slice(2,8)
      dispatch({ type: 'ADD_CLIENTE_RRHH', payload: { id: newId, locales: [], activo: true, ...form } })
      const eg = empresasGrupo.find(e => e.id === mCli.empresaId)
      if (eg) dispatch({ type: 'UPDATE_EMPRESA_GRUPO', id: eg.id, payload: { clienteIds: [...(eg.clienteIds||[]), newId] } })
      toast('Cliente agregado y vinculado')
    } else {
      dispatch({ type: 'UPDATE_CLIENTE_RRHH', id: mCli.data.id, payload: form })
      toast('Cliente actualizado')
    }
    setMCli(null)
  }

  /* ─── Local ─── */
  const saveLoc = (form) => {
    if (!form.nombre?.trim()) return
    if (mLoc.mode === 'add') {
      dispatch({ type: 'ADD_LOCAL_RRHH', clienteId: mLoc.clienteId,
        payload: { id: 'loc_' + Math.random().toString(36).slice(2,8), activo: true, ...form } })
      toast('Local agregado')
    } else {
      dispatch({ type: 'UPDATE_LOCAL_RRHH', clienteId: mLoc.clienteId, id: mLoc.id, payload: form })
      toast('Local actualizado')
    }
    setMLoc(null)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Empresas del Grupo</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Haz clic en una empresa para ver sus clientes. Haz clic en un cliente para ver sus locales.
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setMEg({ mode: 'add', data: {} })} className="btn-primary text-sm">
            + Nueva Empresa
          </button>
        )}
      </div>

      {empresasGrupo.length === 0 && (
        <div className="text-center py-10 text-gray-400 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
          Sin empresas registradas
        </div>
      )}

      <div className="space-y-2">
        {empresasGrupo.map(eg => {
          const egClientes   = clientesRRHH.filter(c => (eg.clienteIds||[]).includes(c.id))
          const totalLocales = egClientes.reduce((s,c) => s + (c.locales||[]).length, 0)
          const isEgOpen     = !!openEg[eg.id]

          return (
            <div key={eg.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">

              {/* ── Fila empresa ── */}
              <div
                onClick={() => toggleEg(eg.id)}
                className="flex items-center gap-3 px-4 py-3 bg-[#1e3a5f] cursor-pointer select-none"
              >
                <span className={`text-white text-xs transition-transform duration-150 ${isEgOpen ? 'rotate-90' : ''}`}>▶</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{eg.nombre}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${eg.activo !== false ? 'bg-green-400/20 text-green-200' : 'bg-gray-400/20 text-gray-300'}`}>
                      {eg.activo !== false ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                  <p className="text-[#8ab4d4] text-xs">
                    {eg.ruc ? `RUC: ${eg.ruc} · ` : ''}{egClientes.length} cliente(s) · {totalLocales} local(es)
                  </p>
                </div>
                {isAdmin && (
                  <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setMEg({ mode: 'edit', data: eg })}
                      className="p-1.5 rounded-lg hover:bg-white/20 text-white/70 hover:text-white">
                      <PencilIcon className="w-3.5 h-3.5"/>
                    </button>
                    <button onClick={() => setConfirmDel({ type: 'empresa', id: eg.id })}
                      className="p-1.5 rounded-lg hover:bg-red-400/20 text-white/50 hover:text-red-200">
                      <TrashIcon className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                )}
              </div>

              {/* ── Clientes ── */}
              {isEgOpen && (
                <div className="bg-gray-50 divide-y divide-gray-100">
                  {egClientes.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-3">Sin clientes vinculados</p>
                  )}

                  {egClientes.map(cli => {
                    const isCliOpen = !!openCli[cli.id]
                    const locales   = cli.locales || []
                    return (
                      <div key={cli.id}>
                        {/* Fila cliente */}
                        <div
                          onClick={() => toggleCli(cli.id)}
                          className="flex items-center gap-2 px-6 py-2.5 bg-blue-50 hover:bg-blue-100 cursor-pointer select-none transition-colors"
                        >
                          <span className={`text-blue-500 text-xs transition-transform duration-150 ${isCliOpen ? 'rotate-90' : ''}`}>▶</span>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-semibold text-[#1e3a5f]">{cli.nombre}</span>
                            {cli.tipo && <span className="ml-2 text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{cli.tipo}</span>}
                            {cli.ruc  && <span className="ml-2 text-xs text-gray-400">RUC: {cli.ruc}</span>}
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-600 shrink-0">
                            {locales.length} local{locales.length !== 1 ? 'es' : ''}
                          </span>
                          {isAdmin && (
                            <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                              <button onClick={() => setMCli({ mode: 'edit', empresaId: eg.id, data: cli })}
                                className="p-1 rounded hover:bg-blue-200 text-blue-500"><PencilIcon className="w-3 h-3"/></button>
                              <button onClick={() => setConfirmDel({ type: 'cliente', id: cli.id })}
                                className="p-1 rounded hover:bg-red-100 text-red-400"><TrashIcon className="w-3 h-3"/></button>
                            </div>
                          )}
                        </div>

                        {/* Locales del cliente */}
                        {isCliOpen && (
                          <div className="bg-white px-8 py-2 space-y-1">
                            {locales.length === 0 && (
                              <p className="text-xs text-gray-400 py-1">Sin locales registrados</p>
                            )}
                            {locales.map(loc => (
                              <div key={loc.id}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-100 hover:border-gray-200">
                                <span className="text-gray-400 text-sm">📍</span>
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-medium text-gray-700">{loc.nombre}</span>
                                  {loc.direccion && <span className="ml-2 text-xs text-gray-400">{loc.direccion}</span>}
                                  {loc.area && <span className="ml-1 text-xs text-gray-400">· {loc.area}</span>}
                                  {loc.piso && <span className="ml-1 text-xs text-gray-400">· {loc.piso}</span>}
                                </div>
                                {isAdmin && (
                                  <div className="flex gap-1">
                                    <button onClick={() => setMLoc({ mode: 'edit', clienteId: cli.id, id: loc.id, data: loc })}
                                      className="p-1 rounded hover:bg-blue-50 text-blue-400"><PencilIcon className="w-3 h-3"/></button>
                                    <button onClick={() => setConfirmDel({ type: 'local', clienteId: cli.id, id: loc.id })}
                                      className="p-1 rounded hover:bg-red-50 text-red-400"><TrashIcon className="w-3 h-3"/></button>
                                  </div>
                                )}
                              </div>
                            ))}
                            {isAdmin && (
                              <button onClick={() => setMLoc({ mode: 'add', clienteId: cli.id, data: {} })}
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1 pt-1.5 pb-0.5">
                                <PlusIcon className="w-3 h-3"/> Agregar local / sede
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}

                  {/* Botón agregar cliente */}
                  {isAdmin && (
                    <div className="px-6 py-2.5">
                      <button onClick={() => setMCli({ mode: 'add', empresaId: eg.id, data: {} })}
                        className="text-xs text-blue-700 hover:underline flex items-center gap-1">
                        <PlusIcon className="w-3 h-3"/> Agregar cliente a {eg.nombre}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Modal Empresa ── */}
      {mEg && (
        <EgModal title={mEg.mode==='add' ? 'Nueva Empresa del Grupo' : 'Editar Empresa'}
          init={mEg.data} onSave={saveEg} onClose={() => setMEg(null)}
          fields={[
            { key:'nombre',    label:'Razón Social *', required:true },
            { key:'ruc',       label:'RUC' },
            { key:'direccion', label:'Dirección' },
          ]}
          extras={form => (
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" checked={form.activo !== false}
                onChange={() => {}} className="w-4 h-4 accent-[#1e3a5f]" readOnly />
              Empresa activa
            </label>
          )}
        />
      )}

      {/* ── Modal Cliente ── */}
      {mCli && (
        <EgModal title={mCli.mode==='add' ? 'Nuevo Cliente' : 'Editar Cliente'}
          init={mCli.data} onSave={saveCli} onClose={() => setMCli(null)}
          fields={[
            { key:'nombre',   label:'Nombre *',                    required:true },
            { key:'tipo',     label:'Tipo (Colegio, Universidad…)' },
            { key:'ruc',      label:'RUC' },
            { key:'contacto', label:'Persona de contacto' },
            { key:'telefono', label:'Teléfono' },
          ]}
        />
      )}

      {/* ── Modal Local ── */}
      {mLoc && (
        <EgModal title={mLoc.mode==='add' ? 'Nuevo Local / Sede' : 'Editar Local'}
          init={mLoc.data} onSave={saveLoc} onClose={() => setMLoc(null)}
          fields={[
            { key:'nombre',    label:'Nombre del local / sede *', required:true },
            { key:'direccion', label:'Dirección' },
            { key:'piso',      label:'Piso / Zona' },
            { key:'area',      label:'Área (m²)' },
          ]}
        />
      )}

      {/* ── Confirm eliminar ── */}
      {confirmDel && (
        <Confirm
          message={
            confirmDel.type === 'empresa' ? '¿Eliminar esta empresa del grupo?' :
            confirmDel.type === 'cliente' ? '¿Eliminar este cliente y todos sus locales?' :
            '¿Eliminar este local?'
          }
          danger confirmLabel="Eliminar"
          onConfirm={() => {
            if (confirmDel.type === 'empresa') dispatch({ type:'DELETE_EMPRESA_GRUPO', id:confirmDel.id })
            else if (confirmDel.type === 'cliente') dispatch({ type:'DELETE_CLIENTE_RRHH', id:confirmDel.id })
            else dispatch({ type:'DELETE_LOCAL_RRHH', clienteId:confirmDel.clienteId, id:confirmDel.id })
            toast('Eliminado'); setConfirmDel(null)
          }}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </div>
  )
}

/* Mini-formulario reutilizable para modals de esta sección */
function EgModal({ title, init, fields, onSave, onClose, extras }) {
  const [form, setForm] = React.useState({ ...init })
  const set = (k,v) => setForm(p => ({ ...p, [k]:v }))
  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-3">
        {fields.map(f => (
          <div key={f.key}>
            <label className="text-xs font-medium text-gray-600 block mb-1">{f.label}</label>
            <input className="input" value={form[f.key]||''} onChange={e=>set(f.key, e.target.value)} required={!!f.required} />
          </div>
        ))}
        {extras && extras(form)}
        <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button type="button" onClick={() => onSave(form)} className="btn-primary">Guardar</button>
        </div>
      </div>
    </Modal>
  )
}


// ── Sistema Tab ────────────────────────────────────────────────────────────────
function SistemaTab({ dispatch, toast, setConfirm, isAdmin }) {
  const [confirmSistema, setConfirmSistema] = useState(null)

  const contadores = (() => {
    try {
      const raw = localStorage.getItem('givamic_data')
      if (!raw) return null
      const d = JSON.parse(raw)
      return {
        requerimientos: (d.requerimientos||[]).length,
        ordenesCompra: (d.ordenesCompra||[]).length,
        facturas: (d.facturas||[]).length,
        conformidades: (d.conformidades||[]).length,
        cotizaciones: (d.cotizaciones||[]).length,
        rqs: (d.rqs||[]).length,
        reqPagos: (d.reqPagos||[]).length,
        evaluaciones: (d.evaluacionesProveedor||[]).length,
        solicitudesMant: (d.solicitudesMantenimiento||[]).length,
        movimientos: (d.movimientos||[]).length,
        entregas: (d.uniformeEntregas||[]).length,
        auditLog: (d.auditLog||[]).length,
      }
    } catch { return null }
  })()

  const handleExportar = () => {
    const raw = localStorage.getItem('givamic_data')
    if (!raw) return toast('No hay datos para exportar', 'error')
    const blob = new Blob([raw], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `givamic_backup_${new Date().toISOString().slice(0,10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast('Backup descargado')
  }

  const handleImportar = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        localStorage.setItem('givamic_data', JSON.stringify(data))
        toast('Datos restaurados — recarga la página', 'success')
      } catch { toast('Archivo inválido', 'error') }
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-4 max-w-2xl">

      {/* Resumen de datos */}
      {contadores && (
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <ServerStackIcon className="w-5 h-5 text-[#1e3a5f]" />
            <h2 className="font-semibold text-gray-800">Datos almacenados</h2>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Requerimientos', val: contadores.requerimientos },
              { label: 'Órdenes de Compra', val: contadores.ordenesCompra },
              { label: 'Facturas', val: contadores.facturas },
              { label: 'Conformidades', val: contadores.conformidades },
              { label: 'RQs (pagos)', val: contadores.rqs },
              { label: 'Req. de Pago', val: contadores.reqPagos },
              { label: 'Eval. Proveedores', val: contadores.evaluaciones },
              { label: 'Sol. Mantenimiento', val: contadores.solicitudesMant },
              { label: 'Movimientos stock', val: contadores.movimientos },
              { label: 'Entregas kit', val: contadores.entregas },
              { label: 'Audit log', val: contadores.auditLog },
            ].map(({ label, val }) => (
              <div key={label} className="bg-gray-50 rounded-lg p-3 text-center">
                <p className="text-lg font-bold text-[#1e3a5f]">{val}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">Los datos se almacenan en el navegador (localStorage). Usa el backup para guardar una copia externa.</p>
        </div>
      )}

      {/* Backup / Restaurar */}
      <div className="card space-y-3">
        <h2 className="font-semibold text-gray-800 mb-2">Backup y restauración</h2>
        <div className="flex gap-3">
          <button onClick={handleExportar} className="btn-secondary flex items-center gap-2">
            Exportar backup (.json)
          </button>
          <label className="btn-secondary flex items-center gap-2 cursor-pointer">
            Importar backup
            <input type="file" accept=".json" className="hidden" onChange={handleImportar} />
          </label>
        </div>
        <p className="text-xs text-gray-500">Exporta todos los datos del sistema. Puedes restaurarlos si cambias de computadora o navegador.</p>
      </div>

      {/* Zona peligrosa */}
      {isAdmin && (
        <div className="border border-red-200 rounded-xl p-4 bg-red-50 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldExclamationIcon className="w-5 h-5 text-red-600" />
            <h2 className="font-semibold text-red-700">Zona de administración</h2>
          </div>
          <div className="space-y-2">
            <div className="bg-white rounded-lg border border-red-100 p-3">
              <p className="text-sm font-medium text-gray-800">Limpiar datos operativos</p>
              <p className="text-xs text-gray-500 mt-1 mb-3">
                Elimina todos los registros transaccionales (REQ, OC, Facturas, Conformidades, Movimientos, Entregas, etc.)
                y deja el sistema listo para uso en producción. <strong>Los maestros (sedes, productos, proveedores, usuarios) se conservan.</strong>
              </p>
              <button
                onClick={() => setConfirmSistema({
                  message: '¿Limpiar TODOS los datos operativos? Se eliminarán REQs, OCs, Facturas, Conformidades, Movimientos, Entregas y todo el historial. Los maestros se conservan. Esta acción no se puede deshacer.',
                  confirmLabel: 'Sí, limpiar',
                  onConfirm: () => {
                    dispatch({ type: 'CLEAR_DATOS_OPERATIVOS' })
                    toast('Datos operativos eliminados — sistema listo para producción', 'success')
                    setConfirmSistema(null)
                  }
                })}
                className="bg-red-600 hover:bg-red-700 text-white text-xs px-4 py-2 rounded-lg font-medium transition-colors">
                Limpiar datos operativos
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmSistema && (
        <Confirm
          message={confirmSistema.message}
          confirmLabel={confirmSistema.confirmLabel}
          onConfirm={confirmSistema.onConfirm}
          onCancel={() => setConfirmSistema(null)}
        />
      )}
    </div>
  )
}

export default function Maestros() {
  const { state, dispatch } = useApp()
  const { isAdmin } = useAuth()
  const toast = useToast()
  const fileRef = useRef()
  const [tab, setTab] = useState(TAB_SEDES)
  const [modal, setModal] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const tabs = [TAB_SEDES, TAB_PROVS, TAB_EMPS, TAB_LOGO, TAB_APROB, TAB_SISTEMA]

  const open = (editing = null) => setModal({ editing })
  const close = () => setModal(null)

  const sedeFields = [
    { key: 'nombre',      label: 'Nombre de la sede',       required: true },
    { key: 'direccion',   label: 'Dirección' },
    { key: 'supervisor',  label: 'Supervisor 1',            placeholder: 'Nombre del supervisor' },
    { key: 'supervisor2', label: 'Supervisor 2 (opcional)', placeholder: 'Nombre del segundo supervisor' },
  ]
  const sedeCols = [
    { key: 'nombre',    label: 'Nombre' },
    { key: 'direccion', label: 'Dirección' },
    { key: 'supervisor', label: 'Supervisores', render: (row) => [row.supervisor, row.supervisor2].filter(Boolean).join(' / ') || '—' }
  ]

  const provFields = [
    { key: 'nombre',    label: 'Razón social',                    required: true },
    { key: 'ruc',       label: 'RUC',                             required: true },
    { key: 'domicilio', label: 'Domicilio / Dirección' },
    { key: 'contacto',  label: 'Email / Contacto' },
    { key: 'telefono',  label: 'Teléfono' },
    { key: 'noCuenta',  label: 'N° Cuenta bancaria' },
    { key: 'ciCci',     label: 'CCI (Código de Cuenta Interbancario)' }
  ]
  const provCols = [
    { key: 'nombre',    label: 'Nombre' }, { key: 'ruc',      label: 'RUC' },
    { key: 'domicilio', label: 'Domicilio' }, { key: 'contacto', label: 'Contacto' },
    { key: 'telefono',  label: 'Teléfono' }, { key: 'noCuenta', label: 'N° Cuenta' }
  ]

  const CRUD = {
    [TAB_SEDES]: { list: 'sedes',       fields: sedeFields, cols: sedeCols, label: 'Sede',      add: 'ADD_SEDE',      upd: 'UPDATE_SEDE',      del: 'DELETE_SEDE' },
    [TAB_PROVS]: { list: 'proveedores', fields: provFields, cols: provCols, label: 'Proveedor', add: 'ADD_PROVEEDOR', upd: 'UPDATE_PROVEEDOR', del: 'DELETE_PROVEEDOR' },
  }
  const cfg = CRUD[tab]

  const handleSave = (data) => {
    if (modal?.editing) {
      dispatch({ type: cfg.upd, id: modal.editing.id, payload: data })
      toast(`${cfg.label} actualizado`)
    } else {
      dispatch({ type: cfg.add, payload: data })
      toast(`${cfg.label} agregado`)
    }
    close()
  }

  const handleDelete = () => {
    dispatch({ type: cfg.del, id: confirm.item.id })
    toast(`${cfg.label} eliminado`)
    setConfirm(null)
  }

  const handleLogoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => { dispatch({ type: 'SET_LOGO', logo: ev.target.result }); toast('Logo actualizado') }
    reader.readAsDataURL(file)
  }
  const clearLogo = () => { dispatch({ type: 'SET_LOGO', logo: null }); toast('Logo eliminado') }

  return (
    <div>
      <PageHeader title="Maestros" subtitle="Configuración central del sistema" />

      <div className="flex gap-1 mb-4 border-b border-gray-200 overflow-x-auto">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === t ? 'border-[#1e3a5f] text-[#1e3a5f]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === TAB_SISTEMA ? (
        <SistemaTab dispatch={dispatch} toast={toast} setConfirm={setConfirm} isAdmin={isAdmin} />
      ) : tab === TAB_APROB ? (
        <AprobacionesTab />
      ) : tab === TAB_LOGO ? (
        <div className="card max-w-md">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Logo de la empresa</h2>
          {state.logo
            ? <div className="flex flex-col items-center gap-3">
                <img src={state.logo} alt="Logo" className="h-24 object-contain rounded-lg border border-gray-200 bg-gray-50 p-2" />
                <button onClick={clearLogo} className="btn-secondary text-xs text-red-500">Eliminar logo</button>
              </div>
            : <div className="flex flex-col items-center gap-3">
                <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center">
                  <PhotoIcon className="w-10 h-10 text-gray-300" />
                </div>
                <p className="text-xs text-gray-400">Sin logo configurado</p>
              </div>
          }
          <div className="mt-4">
            <label className="btn-secondary text-xs cursor-pointer flex items-center gap-2 w-fit">
              <PhotoIcon className="w-4 h-4" /> Subir nuevo logo
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </label>
          </div>
        </div>
      ) : tab === TAB_EMPS ? (
        <TabEmpresasGrupo isAdmin={isAdmin} />
      ) : (
        <>
          {cfg && (
            <div className="flex justify-end mb-3">
              <button onClick={() => open()} className="btn-primary text-sm flex items-center gap-1.5">
                <PlusIcon className="w-4 h-4" /> Agregar {cfg.label}
              </button>
            </div>
          )}
          {cfg && <Table cols={cfg.cols} rows={(state[cfg.list]||[])} onEdit={r => open(r)} onDelete={r => setConfirm({ item: r, message: `¿Eliminar ${cfg.label.toLowerCase()} "${r.nombre || r.razonSocial || r.id}"? Esta acción no se puede deshacer.` })} isAdmin={isAdmin} />}
        </>
      )}

      {modal && cfg && (
        <Modal title={`${modal.editing ? 'Editar' : 'Nuevo'} ${cfg.label}`} onClose={close}>
          <GenericForm fields={cfg.fields} initial={modal.editing} onSave={handleSave} onClose={close} />
        </Modal>
      )}
      {confirm && (
        <Confirm
          message={confirm.message}
          confirmLabel="Eliminar"
          onConfirm={handleDelete}
          onCancel={() => setConfirm(null)}
          danger
        />
      )}
    </div>
  )
}
