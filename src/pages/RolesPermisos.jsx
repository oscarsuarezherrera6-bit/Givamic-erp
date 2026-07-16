import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { supabase, supabaseAdmin, isSupabaseEnabled } from '../lib/supabase'
import {
  ShieldCheckIcon, PlusIcon, PencilIcon, EyeIcon, TrashIcon,
  XMarkIcon, CheckIcon, MagnifyingGlassIcon, UserGroupIcon,
  ArrowRightIcon, Cog6ToothIcon, LockClosedIcon, NoSymbolIcon,
  BuildingOffice2Icon, KeyIcon,
} from '@heroicons/react/24/outline'

const MODULOS_DEF = [
  { id: 'dashboard',              label: 'Dashboard',                   acciones: ['ver'] },
  { id: 'requerimientos',         label: 'Requerimientos',              acciones: ['ver','crear','aprobar','eliminar'] },
  { id: 'cotizaciones',           label: 'Cotizaciones',                acciones: ['ver','crear','editar','eliminar'] },
  { id: 'ordenes-compra',         label: 'Órdenes de Compra',           acciones: ['ver','crear','aprobar','eliminar'] },
  { id: 'facturas',               label: 'Facturas',                    acciones: ['ver','crear','editar','eliminar'] },
  { id: 'conformidades',          label: 'Recepciones / Conformidades', acciones: ['ver','crear','editar'] },
  { id: 'almacen',                label: 'Almacén',                     acciones: ['ver','ingresar','despachar','anular'] },
  { id: 'uniformes',              label: 'Kit de Ingreso (Uniformes)',  acciones: ['ver','crear'] },
  { id: 'inventario',             label: 'Inventario',                  acciones: ['ver','editar'] },
  { id: 'maquinas',               label: 'Máquinas',                    acciones: ['ver','crear','editar'] },
  { id: 'epps',                   label: 'EPPs / SSOMA',                acciones: ['ver','crear','editar'] },
  { id: 'evaluacion-proveedores', label: 'Evaluación Proveedores',      acciones: ['ver','crear','editar'] },
  { id: 'req-pago',               label: 'Req. de Pago',                acciones: ['ver','crear','aprobar'] },
  { id: 'cuentas-por-pagar',      label: 'Cuentas por Pagar',           acciones: ['ver','crear'] },
  { id: 'facturacion-clientes',  label: 'Facturación Clientes',        acciones: ['ver','crear','editar'] },
  { id: 'reportes',               label: 'Reportes',                    acciones: ['ver'] },
  { id: 'auditoria',              label: 'Auditoría',                   acciones: ['ver'] },
  { id: 'rrhh',                    label: 'Recursos Humanos',            acciones: ['ver','crear','editar'] },
  { id: 'empresas-clientes',       label: 'Empresas y Clientes',         acciones: ['ver','editar'] },
  { id: 'maestros',               label: 'Maestros',                    acciones: ['ver','editar'] },
  { id: 'roles-permisos',         label: 'Roles y Permisos',            acciones: ['ver','editar'] },
]

const MODULOS_FLUJO = [
  { id: 'requerimientos', label: 'Requerimientos (REQ)' },
  { id: 'ordenesCompra',  label: 'Órdenes de Compra (OC)' },
]

const ACCION_LABELS = {
  ver:'Ver', crear:'Crear', editar:'Editar', aprobar:'Aprobar',
  eliminar:'Eliminar', ingresar:'Ingresar', despachar:'Despachar', anular:'Anular',
}

function genId() { return 'r' + Date.now() + Math.random().toString(36).slice(2,7) }
function genFId() { return 'f' + Date.now() + Math.random().toString(36).slice(2,7) }

/* ─── Badge helpers ─── */
function BadgeSuperAdmin({ on }) {
  return on
    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
        <CheckIcon className="w-3 h-3"/> Super Admin
      </span>
    : <span className="text-xs text-gray-400">—</span>
}
function BadgeModulos({ count, total }) {
  if (count === total) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Acceso total</span>
  if (count === 0)     return <span className="text-xs text-gray-400">Sin acceso</span>
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700"><EyeIcon className="w-3 h-3"/> {count} módulos</span>
}

/* ─── Modal crear/editar rol ─── */
function ModalRol({ rol, roles, onClose, onSave }) {
  const [nombre, setNombre]       = useState(rol?.nombre || '')
  const [desc, setDesc]           = useState(rol?.descripcion || '')
  const [superAdmin, setSuperAdmin] = useState(rol?.esSuperAdmin || false)
  const [activo, setActivo]       = useState(rol?.activo !== false)
  const [permisos, setPermisos]   = useState(rol?.permisos || {})
  const [expanded, setExpanded]   = useState({})
  const [search, setSearch]       = useState('')

  const modsFiltrados = MODULOS_DEF.filter(m =>
    m.label.toLowerCase().includes(search.toLowerCase())
  )

  function toggleModulo(modId, checked) {
    if (checked) {
      const todas = {}
      MODULOS_DEF.find(m => m.id === modId)?.acciones.forEach(a => { todas[a] = true })
      setPermisos(p => ({ ...p, [modId]: todas }))
    } else {
      setPermisos(p => { const n = { ...p }; delete n[modId]; return n })
    }
  }

  function toggleAccion(modId, accion, checked) {
    setPermisos(p => {
      const modActual = { ...(p[modId] || {}) }
      if (checked) modActual[accion] = true
      else delete modActual[accion]
      if (Object.keys(modActual).length === 0) {
        const n = { ...p }; delete n[modId]; return n
      }
      return { ...p, [modId]: modActual }
    })
  }

  const totalSelec = Object.keys(permisos).length
  const totalMods  = MODULOS_DEF.length

  function handleSave() {
    if (!nombre.trim()) return
    onSave({ nombre: nombre.trim(), descripcion: desc.trim(), esSuperAdmin: superAdmin, activo, permisos })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5 text-indigo-500"/>
              <span className="font-semibold text-gray-800">{rol ? 'Editar perfil' : 'Crear perfil'}</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Configura el perfil y selecciona accesos por módulo</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">{totalSelec} / {totalMods} módulos</span>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="w-5 h-5"/></button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Izquierda */}
          <div className="w-56 border-r border-gray-100 p-4 flex flex-col gap-3 shrink-0">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Datos</p>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nombre del perfil *</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Ej: Supervisor"
                value={nombre} onChange={e => setNombre(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Descripción</label>
              <textarea
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                rows={3} placeholder="Responsabilidades del perfil..."
                value={desc} onChange={e => setDesc(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <div>
                <p className="text-xs font-medium text-gray-700">Super Admin</p>
                <p className="text-xs text-gray-400">Ignora selección</p>
              </div>
              <button
                onClick={() => setSuperAdmin(v => !v)}
                className={`w-9 h-5 rounded-full transition-colors relative ${superAdmin ? 'bg-indigo-500' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${superAdmin ? 'right-0.5' : 'left-0.5'}`}/>
              </button>
            </div>
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
              <div>
                <p className="text-xs font-medium text-gray-700">Perfil activo</p>
                <p className="text-xs text-gray-400">Asignable a usuarios</p>
              </div>
              <button
                onClick={() => setActivo(v => !v)}
                className={`w-9 h-5 rounded-full transition-colors relative ${activo ? 'bg-emerald-500' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${activo ? 'right-0.5' : 'left-0.5'}`}/>
              </button>
            </div>
          </div>

          {/* Derecha - permisos */}
          <div className="flex-1 p-4 flex flex-col gap-2.5 overflow-y-auto">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Accesos por módulo</p>
            </div>
            <div className="relative">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-2.5 top-2 text-gray-400"/>
              <input
                className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Buscar módulo..."
                value={search} onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="border border-gray-200 rounded-xl overflow-hidden bg-white divide-y divide-gray-100 overflow-y-auto max-h-[360px]">
              {modsFiltrados.map(mod => {
                const modPerms = permisos[mod.id] || {}
                const modChecked = Object.keys(modPerms).length > 0
                const isExpanded = expanded[mod.id]
                const accionesSelec = Object.keys(modPerms).filter(a => modPerms[a]).length
                return (
                  <div key={mod.id}>
                    <div
                      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${modChecked ? 'bg-indigo-50/50 hover:bg-indigo-50' : 'hover:bg-gray-50'}`}
                      onClick={() => setExpanded(e => ({ ...e, [mod.id]: !e[mod.id] }))}
                    >
                      <input
                        type="checkbox" checked={modChecked}
                        onChange={e => { e.stopPropagation(); toggleModulo(mod.id, e.target.checked) }}
                        onClick={e => e.stopPropagation()}
                        className="accent-indigo-500 w-4 h-4 shrink-0 cursor-pointer"
                      />
                      <span className={`text-sm flex-1 ${modChecked ? 'font-semibold text-indigo-700' : 'font-medium text-gray-700'}`}>{mod.label}</span>
                      <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium tabular-nums ${accionesSelec > 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                        {accionesSelec}/{mod.acciones.length}
                      </span>
                      <span className={`w-4 h-4 flex items-center justify-center text-gray-400 text-base transition-transform select-none ${isExpanded ? 'rotate-90' : ''}`}>›</span>
                    </div>
                    {isExpanded && (
                      <div className="px-4 py-3 grid grid-cols-2 gap-2 bg-gray-50 border-t border-gray-100">
                        {mod.acciones.map(accion => (
                          <label key={accion} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50 cursor-pointer group transition-colors">
                            <input
                              type="checkbox"
                              checked={!!modPerms[accion]}
                              onChange={e => toggleAccion(mod.id, accion, e.target.checked)}
                              className="accent-indigo-500 w-4 h-4 shrink-0"
                            />
                            <span className="text-xs font-medium text-gray-600 group-hover:text-indigo-700">{ACCION_LABELS[accion] || accion}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={!nombre.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40"
          >
            <CheckIcon className="w-4 h-4"/> {rol ? 'Guardar cambios' : 'Crear perfil'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Modal ver detalle rol ─── */
function ModalVerRol({ rol, onClose, onEdit }) {
  const modulos = MODULOS_DEF.filter(m => {
    if (rol.esSuperAdmin) return true
    return Object.keys(rol.permisos || {}).includes(m.id)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
              <ShieldCheckIcon className="w-5 h-5 text-indigo-500"/>
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">{rol.nombre}</h3>
              <p className="text-xs text-gray-400 mt-0.5">{rol.descripcion || 'Sin descripción'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-0.5">
            <XMarkIcon className="w-5 h-5"/>
          </button>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 border-b border-gray-100">
          {rol.esSuperAdmin && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
              <CheckIcon className="w-3 h-3"/> Super Admin — acceso total
            </span>
          )}
          {!rol.esSuperAdmin && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
              <EyeIcon className="w-3 h-3"/> {modulos.length} módulo{modulos.length !== 1 ? 's' : ''} con acceso
            </span>
          )}
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${rol.activo ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
            {rol.activo ? 'Activo' : 'Inactivo'}
          </span>
        </div>

        {/* Módulos */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {rol.esSuperAdmin ? (
            <div className="text-center py-8 text-gray-400">
              <LockClosedIcon className="w-8 h-8 mx-auto mb-2 text-indigo-200"/>
              <p className="text-sm font-medium text-indigo-600">Acceso completo a todos los módulos</p>
              <p className="text-xs text-gray-400 mt-1">El Super Admin ignora la configuración de permisos</p>
            </div>
          ) : modulos.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p className="text-sm">Sin módulos asignados</p>
            </div>
          ) : (
            <div className="space-y-2">
              {modulos.map(mod => {
                const acciones = Object.entries(rol.permisos?.[mod.id] || {})
                  .filter(([, v]) => v)
                  .map(([k]) => ACCION_LABELS[k] || k)
                return (
                  <div key={mod.id} className="flex items-start gap-3 px-4 py-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-700">{mod.label}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {acciones.map(a => (
                          <span key={a} className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full font-medium">{a}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center px-5 py-3 border-t border-gray-100">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">Cerrar</button>
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <PencilIcon className="w-4 h-4"/> Editar perfil
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Tab Flujos ─── */
function TabFlujos({ flujos, rolesERP, onUpdate }) {
  const [moduloActivo, setModuloActivo] = useState('requerimientos')
  const pasos = flujos?.[moduloActivo] || []

  function addPaso() {
    const nuevo = { id: genFId(), tipo: 'fijo', rolId: rolesERP[0]?.id || '', label: rolesERP[0]?.nombre || '', esDespacho: false }
    onUpdate({ [moduloActivo]: [...pasos, nuevo] })
  }

  function updatePaso(idx, changes) {
    const updated = pasos.map((p, i) => {
      if (i !== idx) return p
      const merged = { ...p, ...changes }
      if (changes.rolId) {
        const rol = rolesERP.find(r => r.id === changes.rolId)
        merged.label = rol?.nombre || merged.label
      }
      return merged
    })
    onUpdate({ [moduloActivo]: updated })
  }

  function removePaso(idx) {
    onUpdate({ [moduloActivo]: pasos.filter((_, i) => i !== idx) })
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex gap-2 mb-5">
        {MODULOS_FLUJO.map(m => (
          <button
            key={m.id}
            onClick={() => setModuloActivo(m.id)}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              moduloActivo === m.id
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-medium'
                : 'text-gray-500 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4 text-sm text-blue-700 flex gap-2">
        <span className="mt-0.5">ℹ</span>
        <span>Los pasos <strong>dinámicos</strong> usan el jefe directo del usuario que genera el documento. Los <strong>fijos</strong> van siempre al mismo rol.</span>
      </div>

      <div className="flex flex-col gap-3">
        {pasos.map((paso, idx) => (
          <div key={paso.id} className="flex items-center gap-3">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${paso.tipo === 'dinamico' ? 'bg-emerald-100 text-emerald-700' : paso.esDespacho ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
              {idx + 1}
            </div>
            <div className="flex-1 border border-gray-200 rounded-lg overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-100">
                <select
                  value={paso.tipo}
                  onChange={e => updatePaso(idx, { tipo: e.target.value })}
                  className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-300"
                >
                  <option value="dinamico">Dinámico — jefe directo</option>
                  <option value="fijo">Rol fijo</option>
                </select>
                {paso.tipo === 'fijo' && (
                  <select
                    value={paso.rolId}
                    onChange={e => updatePaso(idx, { rolId: e.target.value })}
                    className="text-xs border border-gray-200 rounded px-2 py-1 bg-white flex-1 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                  >
                    {rolesERP.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                  </select>
                )}
                {paso.tipo === 'dinamico' && (
                  <span className="text-xs text-emerald-600 flex-1">Se resuelve según el campo "Jefe directo" del usuario</span>
                )}
                <label className="flex items-center gap-1.5 text-xs text-gray-500 ml-auto">
                  <input
                    type="checkbox"
                    checked={paso.esDespacho}
                    onChange={e => updatePaso(idx, { esDespacho: e.target.checked })}
                    className="accent-blue-500"
                  />
                  Es despacho/cierre
                </label>
                <button onClick={() => removePaso(idx)} className="text-gray-300 hover:text-red-400">
                  <XMarkIcon className="w-4 h-4"/>
                </button>
              </div>
              <div className="px-3 py-2 text-xs text-gray-400">
                {paso.tipo === 'dinamico' ? 'Paso dinámico — resuelve al jefe directo del solicitante' : `Paso fijo → ${paso.label}`}
                {paso.esDespacho ? ' · Cierra el flujo y genera despacho' : ''}
              </div>
            </div>
          </div>
        ))}

        {pasos.length > 0 && (
          <div className="flex items-center gap-3 opacity-30 pointer-events-none">
            <div className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center shrink-0"/>
            <div className="flex-1 border border-dashed border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-400">Fin del flujo</div>
          </div>
        )}

        <button
          onClick={addPaso}
          className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 mt-1"
        >
          <PlusIcon className="w-4 h-4"/> Agregar paso
        </button>
      </div>
    </div>
  )
}

/* ─── Modal agregar usuario ─── */
function ModalNuevoUsuario({ usuarios = [], rolesERP = [], areas = [], onClose, onSave }) {
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rolERPId: '', jefeDirectoId: '', rol: 'Colaborador', cargo: '', area: '' })
  const [showPass, setShowPass] = useState(false)

  function handleSave() {
    if (!form.nombre.trim() || !form.email.trim() || !form.password.trim()) return
    onSave({
      nombre:        form.nombre.trim(),
      email:         form.email.trim(),
      password:      form.password,
      rol:           form.rol,
      rolERPId:      form.rolERPId || null,
      jefeDirectoId: form.jefeDirectoId || null,
      cargo:         form.cargo.trim(),
      area:          form.area,
      activo:        true,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <UserGroupIcon className="w-5 h-5 text-indigo-500"/>
            <span className="font-semibold text-gray-800">Agregar usuario</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="w-5 h-5"/></button>
        </div>
        <div className="p-5 flex flex-col gap-3.5">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Nombre completo *</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Ej: María García"
              value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Email *</label>
            <input
              type="email"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="maria@empresa.pe"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Contraseña *</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 pr-10"
                placeholder="Mínimo 6 caracteres"
                value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              />
              <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                <EyeIcon className="w-4 h-4"/>
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Rol del sistema *</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}
            >
              <option value="Colaborador">Colaborador</option>
              <option value="Administrador">Administrador</option>
              <option value="Gerencia">Gerencia</option>
              <option value="Coordinador Logística y Compras">Coordinador Logística y Compras</option>
              <option value="Asistente Logística">Asistente Logística</option>
              <option value="Coordinador General">Coordinador General</option>
              <option value="Coordinador Operaciones">Coordinador Operaciones</option>
              <option value="Almacenero">Almacenero</option>
              <option value="Asistente Almacén">Asistente Almacén</option>
              <option value="Jefe RRHH">Jefe RRHH</option>
              <option value="Administrador de Empresa">Administrador de Empresa</option>
              <option value="Facturación">Facturación</option>
              <option value="Contador">Contador</option>
              <option value="Auditor">Auditor</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Perfil de acceso</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              value={form.rolERPId} onChange={e => setForm(f => ({ ...f, rolERPId: e.target.value }))}
            >
              <option value="">Sin perfil (asignar después)</option>
              {rolesERP.filter(r => r.activo !== false).map(r => (
                <option key={r.id} value={r.id}>{r.nombre}{r.esSuperAdmin ? ' ★' : ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Jefe directo</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
              value={form.jefeDirectoId} onChange={e => setForm(f => ({ ...f, jefeDirectoId: e.target.value }))}
            >
              <option value="">Sin jefe directo</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>{u.nombre}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Cargo</label>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                placeholder="Ej: Jefe de Logística"
                value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Área</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))}
              >
                <option value="">Sin área</option>
                {(areas || []).filter(a => a.activo !== false).map(a => (
                  <option key={a.id} value={a.nombre}>{a.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
          <button
            onClick={handleSave}
            disabled={!form.nombre.trim() || !form.email.trim() || !form.password.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40"
          >
            <CheckIcon className="w-4 h-4"/> Crear usuario
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Modal Cambiar Contraseña ─── */
function ModalCambiarPassword({ usuario, onClose, onUpdateRef }) {
  const [pw, setPw]             = useState('')
  const [pw2, setPw2]           = useState('')
  const [loading, setLoading]   = useState(false)
  const [msg, setMsg]           = useState(null)
  const [showActual, setShowActual] = useState(false)

  const pwActual = usuario.password || ''

  async function handleSave() {
    if (!pw || pw.length < 6) return setMsg({ tipo: 'error', texto: 'Mínimo 6 caracteres' })
    if (pw !== pw2)           return setMsg({ tipo: 'error', texto: 'Las contraseñas no coinciden' })

    const svcKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY
    const svcUrl = import.meta.env.VITE_SUPABASE_URL
    if (!svcKey || !svcUrl) return setMsg({ tipo: 'error', texto: 'Service key no configurada en Vercel' })

    setLoading(true)
    setMsg(null)
    try {
      // 1. Buscar usuario por email via REST
      const listRes = await fetch(`${svcUrl}/auth/v1/admin/users?per_page=200`, {
        headers: { apikey: svcKey, Authorization: `Bearer ${svcKey}` }
      })
      if (!listRes.ok) {
        const err = await listRes.json().catch(() => ({}))
        throw new Error(err.message || `Error ${listRes.status} al listar usuarios`)
      }
      const { users } = await listRes.json()
      const authUser = users.find(u => u.email === usuario.email)
      if (!authUser) throw new Error(`${usuario.email} no encontrado en Supabase Auth`)

      // 2. Actualizar contraseña via REST
      const updRes = await fetch(`${svcUrl}/auth/v1/admin/users/${authUser.id}`, {
        method: 'PUT',
        headers: { apikey: svcKey, Authorization: `Bearer ${svcKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw })
      })
      if (!updRes.ok) {
        const err = await updRes.json().catch(() => ({}))
        throw new Error(err.message || `Error ${updRes.status} al actualizar`)
      }

      onUpdateRef(usuario.id, pw)
      setMsg({ tipo: 'ok', texto: 'Contraseña actualizada correctamente' })
      setTimeout(onClose, 1500)
    } catch (e) {
      setMsg({ tipo: 'error', texto: e.message || 'Error de conexión' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <KeyIcon className="w-5 h-5 text-indigo-500"/>
            <span className="font-semibold text-gray-800">Contraseña de acceso</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="w-5 h-5"/></button>
        </div>
        <p className="text-sm text-gray-500 mb-3">Usuario: <span className="font-medium text-gray-700">{usuario.email}</span></p>

        {/* Contraseña actual */}
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
          <p className="text-xs text-amber-600 font-semibold mb-1.5">Contraseña actual</p>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono text-amber-900 flex-1 tracking-wider">
              {showActual ? (pwActual || '—') : (pwActual ? '•'.repeat(pwActual.length) : '—')}
            </span>
            {pwActual && (
              <button onClick={() => setShowActual(v => !v)} className="text-amber-500 hover:text-amber-700 shrink-0">
                <EyeIcon className="w-4 h-4"/>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Nueva contraseña</label>
            <input
              type="password"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Mínimo 6 caracteres"
              value={pw} onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Confirmar contraseña</label>
            <input
              type="password"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Repite la contraseña"
              value={pw2} onChange={e => setPw2(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>
          {msg && (
            <p className={`text-xs px-3 py-2 rounded-lg ${msg.tipo === 'ok' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
              {msg.texto}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Tab Usuarios ─── */
function TabUsuarios({ usuarios, rolesERP, areas, onUpdate, onAddUsuario, onDelete, onToggleActivo }) {
  const [editId, setEditId]         = useState(null)
  const [jefeVal, setJefeVal]       = useState('')
  const [rolERPVal, setRolERPVal]   = useState('')
  const [cargoVal, setCargoVal]     = useState('')
  const [areaVal, setAreaVal]       = useState('')
  const [search, setSearch]         = useState('')
  const [showNuevo, setShowNuevo]   = useState(false)
  const [confirmId, setConfirmId]   = useState(null)
  const [showInactivos, setShowInactivos] = useState(false)
  const [pwUsuario, setPwUsuario]         = useState(null)

  function startEdit(u) {
    setEditId(u.id)
    setJefeVal(u.jefeDirectoId || '')
    setRolERPVal(u.rolERPId || '')
    setCargoVal(u.cargo || '')
    setAreaVal(u.area || '')
  }
  function saveEdit(u) {
    onUpdate(u.id, { jefeDirectoId: jefeVal || null, rolERPId: rolERPVal || null, cargo: cargoVal, area: areaVal })
    setEditId(null)
  }
  function handleDelete(id) {
    onDelete(id)
    setConfirmId(null)
  }

  const usuariosFiltrados = usuarios.filter(u => {
    if (!showInactivos && u.activo === false) return false
    return u.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.cargo?.toLowerCase().includes(search.toLowerCase())
  })

  const sinPerfil = usuarios.filter(u => !u.rolERPId).length

  return (
    <div className="p-6">
      {pwUsuario && (
        <ModalCambiarPassword
          usuario={pwUsuario}
          onClose={() => setPwUsuario(null)}
          onUpdateRef={(id, pw) => onUpdate(id, { password: pw })}
        />
      )}
      {showNuevo && (
        <ModalNuevoUsuario
          usuarios={usuarios}
          rolesERP={rolesERP}
          areas={areas}
          onClose={() => setShowNuevo(false)}
          onSave={data => { onAddUsuario(data); setShowNuevo(false) }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="relative max-w-xs">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-2.5 text-gray-400"/>
            <input
              className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              placeholder="Buscar usuario..."
              value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          {sinPerfil > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"/>
              {sinPerfil} sin perfil
            </div>
          )}
          <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
            <input type="checkbox" className="rounded" checked={showInactivos} onChange={e => setShowInactivos(e.target.checked)}/>
            Ver inactivos
          </label>
        </div>
        <button
          onClick={() => setShowNuevo(true)}
          className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          <PlusIcon className="w-4 h-4"/> Agregar usuario
        </button>
      </div>

      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-400 uppercase">
              <th className="text-left px-4 py-3 font-medium">Usuario</th>
              <th className="text-left px-4 py-3 font-medium">Cargo / Área</th>
              <th className="text-left px-4 py-3 font-medium">Perfil de acceso</th>
              <th className="text-left px-4 py-3 font-medium">Jefe directo</th>
              <th className="px-4 py-3 w-28"/>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {usuariosFiltrados.map(u => {
              const rolAsignado = rolesERP.find(r => r.id === u.rolERPId)
              const jefeNombre  = usuarios.find(x => x.id === u.jefeDirectoId)?.nombre
              const isEditing   = editId === u.id
              return (
                <tr key={u.id} className={`hover:bg-gray-50 transition-colors ${isEditing ? 'bg-indigo-50/40' : ''}`}>
                  {/* Usuario */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${u.activo === false ? 'bg-gray-100 text-gray-400' : 'bg-indigo-100 text-indigo-600'}`}>
                        {u.nombre?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className={`font-semibold text-sm ${u.activo === false ? 'text-gray-400' : 'text-gray-800'}`}>{u.nombre}</p>
                          {u.activo === false && <span className="text-xs bg-red-50 text-red-400 px-1.5 py-0.5 rounded font-medium">Inactivo</span>}
                        </div>
                        <p className="text-xs text-gray-400">{u.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Cargo / Área */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex flex-col gap-1.5">
                        <input
                          value={cargoVal}
                          onChange={e => setCargoVal(e.target.value)}
                          placeholder="Cargo"
                          className="border border-indigo-200 rounded-lg px-2 py-1.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-indigo-300"
                        />
                        <select
                          value={areaVal}
                          onChange={e => setAreaVal(e.target.value)}
                          className="border border-indigo-200 rounded-lg px-2 py-1.5 text-xs w-full focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                        >
                          <option value="">Sin área</option>
                          {(areas||[]).filter(a => a.activo !== false).map(a => (
                            <option key={a.id} value={a.nombre}>{a.nombre}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-700">{u.cargo || <span className="text-gray-400 text-xs">Sin cargo</span>}</p>
                        {u.area && <p className="text-xs text-gray-400">{u.area}</p>}
                      </div>
                    )}
                  </td>

                  {/* Rol ERP */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <select
                        value={rolERPVal}
                        onChange={e => setRolERPVal(e.target.value)}
                        className="border border-indigo-200 rounded-lg px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                      >
                        <option value="">Sin perfil asignado</option>
                        {rolesERP.filter(r => r.activo !== false).map(r => (
                          <option key={r.id} value={r.id}>{r.nombre}{r.esSuperAdmin ? ' ★' : ''}</option>
                        ))}
                      </select>
                    ) : (
                      rolAsignado
                        ? <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${rolAsignado.esSuperAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>
                            {rolAsignado.esSuperAdmin && <ShieldCheckIcon className="w-3 h-3"/>}
                            {rolAsignado.nombre}
                          </span>
                        : <span className="text-xs text-amber-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"/>Sin perfil
                          </span>
                    )}
                  </td>

                  {/* Jefe directo */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <select
                        value={jefeVal}
                        onChange={e => setJefeVal(e.target.value)}
                        className="border border-indigo-200 rounded-lg px-2 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                      >
                        <option value="">Sin jefe directo</option>
                        {usuarios.filter(x => x.id !== u.id).map(x => (
                          <option key={x.id} value={x.id}>{x.nombre}</option>
                        ))}
                      </select>
                    ) : (
                      jefeNombre
                        ? <span className="text-sm text-gray-700">{jefeNombre}</span>
                        : <span className="text-xs text-gray-400">Sin asignar</span>
                    )}
                  </td>

                  {/* Acciones */}
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => saveEdit(u)} className="p-1.5 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg">
                          <CheckIcon className="w-4 h-4"/>
                        </button>
                        <button onClick={() => setEditId(null)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                          <XMarkIcon className="w-4 h-4"/>
                        </button>
                      </div>
                    ) : confirmId === u.id ? (
                      <div className="flex items-center gap-1 justify-end">
                        <span className="text-xs text-red-500 mr-1">¿Eliminar?</span>
                        <button onClick={() => handleDelete(u.id)} className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg">
                          <CheckIcon className="w-4 h-4"/>
                        </button>
                        <button onClick={() => setConfirmId(null)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                          <XMarkIcon className="w-4 h-4"/>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => onToggleActivo(u.id)}
                          title={u.activo === false ? 'Activar usuario' : 'Desactivar usuario'}
                          className={`p-1.5 rounded-lg ${u.activo === false ? 'text-emerald-500 hover:bg-emerald-50' : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'}`}
                        >
                          {u.activo === false ? <CheckIcon className="w-4 h-4"/> : <NoSymbolIcon className="w-4 h-4"/>}
                        </button>
                        <button
                          onClick={() => setPwUsuario(u)}
                          title="Cambiar contraseña"
                          className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg"
                        >
                          <KeyIcon className="w-4 h-4"/>
                        </button>
                        <button onClick={() => startEdit(u)} className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg">
                          <PencilIcon className="w-4 h-4"/>
                        </button>
                        <button onClick={() => setConfirmId(u.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                          <TrashIcon className="w-4 h-4"/>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
            {usuariosFiltrados.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-400">No hay usuarios que coincidan con la búsqueda</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ─── Tab Áreas ─── */
function TabAreas({ areas, onAdd, onUpdate, onDelete }) {
  const [editId, setEditId]   = useState(null)
  const [editVal, setEditVal] = useState('')
  const [newVal, setNewVal]   = useState('')
  const [confirmId, setConfirmId] = useState(null)

  function startEdit(a) { setEditId(a.id); setEditVal(a.nombre) }
  function saveEdit() { onUpdate(editId, { nombre: editVal.trim() }); setEditId(null) }
  function handleAdd() {
    if (!newVal.trim()) return
    onAdd({ nombre: newVal.trim(), activo: true })
    setNewVal('')
  }
  function handleDelete(id) { onDelete(id); setConfirmId(null) }

  return (
    <div className="p-6 max-w-xl">
      <p className="text-sm text-gray-500 mb-4">
        Gestiona las áreas de la empresa. Estas áreas aparecen en el autocompletado de requerimientos.
      </p>
      {/* Agregar nueva área */}
      <div className="flex gap-2 mb-5">
        <input
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          placeholder="Nombre del área (ej: Logística)"
          value={newVal}
          onChange={e => setNewVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
        />
        <button
          onClick={handleAdd}
          disabled={!newVal.trim()}
          className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-40"
        >
          <PlusIcon className="w-4 h-4"/> Agregar
        </button>
      </div>

      {/* Lista de áreas */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        {(areas || []).length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">No hay áreas configuradas</p>
        ) : (areas || []).map((a, idx) => (
          <div key={a.id} className={`flex items-center gap-3 px-4 py-3 ${idx > 0 ? 'border-t border-gray-100' : ''} hover:bg-gray-50`}>
            <BuildingOffice2Icon className="w-4 h-4 text-gray-400 shrink-0"/>
            {editId === a.id ? (
              <>
                <input
                  className="flex-1 border border-indigo-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  value={editVal}
                  onChange={e => setEditVal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveEdit()}
                  autoFocus
                />
                <button onClick={saveEdit} className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg"><CheckIcon className="w-4 h-4"/></button>
                <button onClick={() => setEditId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><XMarkIcon className="w-4 h-4"/></button>
              </>
            ) : confirmId === a.id ? (
              <>
                <span className="flex-1 text-sm text-gray-700">{a.nombre}</span>
                <span className="text-xs text-red-500 mr-1">¿Eliminar?</span>
                <button onClick={() => handleDelete(a.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><CheckIcon className="w-4 h-4"/></button>
                <button onClick={() => setConfirmId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><XMarkIcon className="w-4 h-4"/></button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-gray-800">{a.nombre}</span>
                <button onClick={() => startEdit(a)} className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg"><PencilIcon className="w-4 h-4"/></button>
                <button onClick={() => setConfirmId(a.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><TrashIcon className="w-4 h-4"/></button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Página principal ─── */
export default function RolesPermisos() {
  const { state, dispatch } = useApp()
  const rolesERP  = state.rolesERP || []
  const flujos    = state.flujos || {}
  const usuarios  = state.usuarios || []
  const areas     = state.areas || []

  const [tab, setTab]       = useState('roles')
  const [search, setSearch] = useState('')
  const [modal, setModal]   = useState(null)
  const [confirm, setConfirm] = useState(null) // id to delete

  const rolesFiltrados = useMemo(() =>
    rolesERP.filter(r => r.nombre?.toLowerCase().includes(search.toLowerCase())),
    [rolesERP, search]
  )

  function handleSaveRol(data) {
    if (modal.mode === 'new') {
      dispatch({ type: 'ADD_ROL_ERP', payload: data })
    } else {
      dispatch({ type: 'UPDATE_ROL_ERP', id: modal.rol.id, payload: data })
    }
    setModal(null)
  }

  function handleDeleteRol(id) {
    dispatch({ type: 'DELETE_ROL_ERP', id })
    setConfirm(null)
  }

  function handleUpdateFlujos(changes) {
    dispatch({ type: 'UPDATE_FLUJOS', payload: changes })
  }

  function handleUpdateUsuario(id, changes) {
    dispatch({ type: 'UPDATE_USUARIO', id, payload: changes })
  }

  async function handleAddUsuario(data) {
    dispatch({ type: 'ADD_USUARIO', payload: data })
    if (isSupabaseEnabled && supabase) {
      try {
        const { error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: { data: { nombre: data.nombre, rol: data.rol } },
        })
        if (error) console.warn('[Supabase] No se pudo crear usuario en Auth:', error.message)
      } catch (e) {
        console.warn('[Supabase] Error al crear usuario:', e)
      }
    }
  }

  function handleDeleteUsuario(id) {
    dispatch({ type: 'DELETE_USUARIO', id })
  }

  function handleToggleActivo(id) {
    dispatch({ type: 'TOGGLE_USUARIO_ACTIVO', id })
  }

  function handleAddArea(data) {
    dispatch({ type: 'ADD_AREA', payload: data })
  }

  function handleUpdateArea(id, data) {
    dispatch({ type: 'UPDATE_AREA', id, payload: data })
  }

  function handleDeleteArea(id) {
    dispatch({ type: 'DELETE_AREA', id })
  }

  const TABS = [
    { id: 'roles',    label: 'Roles',    Icon: ShieldCheckIcon },
    { id: 'flujos',   label: 'Flujos',   Icon: ArrowRightIcon },
    { id: 'usuarios', label: 'Usuarios', Icon: UserGroupIcon },
    { id: 'areas',    label: 'Áreas',    Icon: BuildingOffice2Icon },
  ]

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Roles y Permisos</h1>
          <p className="text-sm text-gray-500">Gestiona perfiles, accesos y flujos de aprobación</p>
        </div>
        {tab === 'roles' && (
          <button
            onClick={() => setModal({ mode: 'new' })}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4"/> Nueva plantilla de acceso
          </button>
        )}
        {/* El botón Agregar usuario está dentro de TabUsuarios */}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-100">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.Icon className="w-4 h-4"/> {t.label}
          </button>
        ))}
      </div>

      {/* Tab Roles */}
      {tab === 'roles' && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-2.5 text-gray-400"/>
              <input
                className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100"
                placeholder="Buscar perfil..."
                value={search} onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs text-gray-400 uppercase">
                  <th className="text-left px-4 py-3 font-medium">Perfil</th>
                  <th className="text-left px-4 py-3 font-medium">Descripción</th>
                  <th className="text-left px-4 py-3 font-medium">Super Admin</th>
                  <th className="text-left px-4 py-3 font-medium">Módulos</th>
                  <th className="text-left px-4 py-3 font-medium">Usuarios</th>
                  <th className="px-4 py-3 text-right font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rolesFiltrados.map(rol => {
                  const modsCount = rol.esSuperAdmin ? MODULOS_DEF.length : Object.keys(rol.permisos || {}).length
                  return (
                    <tr key={rol.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                            <ShieldCheckIcon className="w-3.5 h-3.5 text-indigo-500"/>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">{rol.nombre}</p>
                            {!rol.activo && <span className="text-xs text-gray-400">Inactivo</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{rol.descripcion || '—'}</td>
                      <td className="px-4 py-3"><BadgeSuperAdmin on={rol.esSuperAdmin}/></td>
                      <td className="px-4 py-3"><BadgeModulos count={modsCount} total={MODULOS_DEF.length}/></td>
                      <td className="px-4 py-3">
                        {(() => {
                          const count = usuarios.filter(u => u.rolERPId === rol.id).length
                          return count > 0
                            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600">{count} usuario{count > 1 ? 's' : ''}</span>
                            : <span className="text-xs text-gray-300">—</span>
                        })()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => setModal({ mode: 'edit', rol })} className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"><PencilIcon className="w-4 h-4"/></button>
                          <button onClick={() => setModal({ mode: 'view', rol })} className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"><EyeIcon className="w-4 h-4"/></button>
                          <button onClick={() => setConfirm(rol.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><TrashIcon className="w-4 h-4"/></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {rolesFiltrados.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-gray-400">No hay roles que coincidan con la búsqueda</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Tab Flujos */}
      {tab === 'flujos' && (
        <TabFlujos flujos={flujos} rolesERP={rolesERP} onUpdate={handleUpdateFlujos}/>
      )}

      {/* Tab Usuarios */}
      {tab === 'usuarios' && (
        <TabUsuarios
          usuarios={usuarios}
          rolesERP={rolesERP}
          areas={areas}
          onUpdate={handleUpdateUsuario}
          onAddUsuario={handleAddUsuario}
          onDelete={handleDeleteUsuario}
          onToggleActivo={handleToggleActivo}
        />
      )}

      {/* Tab Áreas */}
      {tab === 'areas' && (
        <TabAreas areas={areas} onAdd={handleAddArea} onUpdate={handleUpdateArea} onDelete={handleDeleteArea}/>
      )}

      {/* Modal crear/editar rol */}
      {(modal?.mode === 'new' || modal?.mode === 'edit') && (
        <ModalRol
          rol={modal.mode === 'edit' ? modal.rol : null}
          roles={rolesERP}
          onClose={() => setModal(null)}
          onSave={handleSaveRol}
        />
      )}

      {/* Modal ver detalle */}
      {modal?.mode === 'view' && (
        <ModalVerRol
          rol={modal.rol}
          onClose={() => setModal(null)}
          onEdit={() => setModal({ mode: 'edit', rol: modal.rol })}
        />
      )}

      {/* Confirm delete rol */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl p-6 shadow-2xl w-80">
            <p className="font-semibold text-gray-800 mb-1">¿Eliminar perfil?</p>
            <p className="text-sm text-gray-500 mb-4">Esta acción no se puede deshacer.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirm(null)} className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button onClick={() => handleDeleteRol(confirm)} className="px-3 py-1.5 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
