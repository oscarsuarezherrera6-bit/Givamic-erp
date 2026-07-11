import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/layout/Toast'
import PageHeader from '../components/common/PageHeader'
import ExportMenu, { useSelection, Checkbox } from '../components/common/ExportMenu'
import { fmtDate, genId, todayISO } from '../utils/helpers'
import { generarPDFRequerimiento } from '../utils/pdfRequerimiento'
import Confirm from '../components/common/Confirm'
import {
  PlusIcon, EyeIcon, TrashIcon, ArrowLeftIcon,
  DocumentArrowDownIcon, CheckCircleIcon, XCircleIcon,
  PencilSquareIcon, PaperAirplaneIcon, NoSymbolIcon,
  ExclamationTriangleIcon, ClockIcon, CheckBadgeIcon,
  ArrowPathIcon, MagnifyingGlassIcon, FunnelIcon,
  ShoppingCartIcon, BuildingStorefrontIcon, ArrowUpCircleIcon
} from '@heroicons/react/24/outline'

const ESTADOS = ['Borrador','Pendiente Aprobación Jefe','Pendiente de Aprobación','Aprobado - En Almacén','Aprobado con Ajustes - En Almacén','Pendiente de Aprobación Gerencial','Aprobado por Gerencia','En Consolidado','En Orden de Compra','Despachado Parcialmente','Completado','Rechazado','Rechazado por Gerencia','Pospuesto - Consolidado Gerencial','Anulado']
const PRIORIDADES = ['Alta','Media','Baja']
const TIPOS = ['Bien','Servicio']
const UNIDADES = ['UND','GL','LT','KG','ML','MT','M2','KIT','CJA','BOL','BID','PKT','SRV','RLL','PAR','JGO']

const ESTADO_COLOR = {
  'Borrador':                    'bg-gray-100 text-gray-600',
  'Pendiente Aprobación Jefe':    'bg-purple-100 text-purple-700',
  'Pendiente de Aprobación':     'bg-amber-100 text-amber-700',
  'Aprobado - En Almacén':       'bg-blue-100 text-blue-700',
  'Aprobado con Ajustes - En Almacén': 'bg-cyan-100 text-cyan-700',
  'En Orden de Compra':          'bg-indigo-100 text-indigo-700',
  'Despachado Parcialmente':     'bg-teal-100 text-teal-700',
  'Completado':                  'bg-green-100 text-green-700',
  'Rechazado':                              'bg-red-100 text-red-700',
  'Anulado':                                'bg-gray-100 text-gray-400',
  'Pendiente de Aprobación Gerencial':      'bg-orange-100 text-orange-700',
  'Aprobado por Gerencia':                  'bg-emerald-100 text-emerald-700',
  'Rechazado por Gerencia':                 'bg-red-200 text-red-800',
  'En Consolidado':                          'bg-indigo-100 text-indigo-700',
  'Pospuesto - Consolidado Gerencial':      'bg-slate-100 text-slate-600',
}

const PRIO_COLOR = {
  'Alta':  'bg-red-100 text-red-700',
  'Media': 'bg-amber-100 text-amber-700',
  'Baja':  'bg-green-100 text-green-700',
}

const ESTADO_ICON = {
  'Borrador':                    ClockIcon,
  'Pendiente de Aprobación':     ExclamationTriangleIcon,
  'Aprobado - En Almacén':       BuildingStorefrontIcon,
  'Aprobado con Ajustes - En Almacén': BuildingStorefrontIcon,
  'En Orden de Compra':          ShoppingCartIcon,
  'Despachado Parcialmente':     CheckBadgeIcon,
  'Completado':                  CheckCircleIcon,
  'Rechazado':                              XCircleIcon,
  'Anulado':                                NoSymbolIcon,
  'Pendiente de Aprobación Gerencial':      ArrowUpCircleIcon,
  'Aprobado por Gerencia':                  CheckCircleIcon,
  'Rechazado por Gerencia':                 XCircleIcon,
  'En Consolidado':                          ClockIcon,
  'Pospuesto - Consolidado Gerencial':      ClockIcon,
}

// ── PRODUCT COMBOBOX ────────────────────────────────────────────────────────
function ProductCombobox({ value, productoId, productos, inventario, onSelect, placeholder }) {
  const [query, setQuery] = useState(value || '')
  const [open, setOpen] = useState(false)
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 320 })
  const inputRef = useRef(null)
  const wrapRef = useRef(null)

  useEffect(() => { setQuery(value || '') }, [value])

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        // also check if click was inside the portal dropdown
        const portal = document.getElementById('prod-combobox-portal')
        if (portal && portal.contains(e.target)) return
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const openDropdown = () => {
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect()
      setDropPos({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: Math.max(r.width, 380) })
    }
    setOpen(true)
  }

  const filtered = useMemo(() => {
    if (!query.trim()) return productos.slice(0, 50)
    const q = query.toLowerCase()
    return productos.filter(p =>
      p.nombre?.toLowerCase().includes(q) || p.codigo?.toLowerCase().includes(q)
    ).slice(0, 40)
  }, [query, productos])

  const stockSede = (pid) => inventario?.['s1']?.[pid]?.cantidad ?? null

  const handleSelect = (p) => {
    setQuery(p.nombre)
    setOpen(false)
    onSelect({ descripcion: p.nombre, productoId: p.id, unidad: p.unidad || '', talla: p.talla || '' })
  }

  const linked = productoId && productos.find(p => p.id === productoId)

  // Portal dropdown rendered at body level to escape table overflow clipping
  const dropdown = open && filtered.length > 0 && typeof document !== 'undefined'
    ? (() => {
        let portal = document.getElementById('prod-combobox-portal')
        if (!portal) {
          portal = document.createElement('div')
          portal.id = 'prod-combobox-portal'
          document.body.appendChild(portal)
        }
        return createPortal(
          <div
            style={{ position: 'fixed', top: dropPos.top - window.scrollY, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}
            className="bg-white border border-gray-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto"
          >
            <div className="px-3 py-2 text-[10px] text-gray-400 font-semibold uppercase tracking-wide border-b bg-gray-50 rounded-t-xl sticky top-0">
              {query.trim() ? `${filtered.length} resultado(s)` : 'Catalogo de productos'}
            </div>
            {filtered.map(p => {
              const stk = stockSede(p.id)
              return (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(p) }}
                  className="w-full text-left px-3 py-2.5 hover:bg-blue-50 flex items-center gap-3 border-b border-gray-50 last:border-0 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800 truncate">{p.nombre}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {p.codigo && <span className="text-[10px] text-gray-400 font-mono bg-gray-100 px-1 rounded">{p.codigo}</span>}
                      {p.unidad && <span className="text-[10px] text-gray-500">{p.unidad}</span>}
                    </div>
                  </div>
                  {stk !== null && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${stk > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {stk > 0 ? `${stk} disp.` : 'Sin stock'}
                    </span>
                  )}
                </button>
              )
            })}
          </div>,
          portal
        )
      })()
    : null

  return (
    <div ref={wrapRef}>
      <div className="relative">
        <input
          ref={inputRef}
          className={`input text-xs py-1.5 w-full pr-7 ${linked ? 'border-green-400 bg-green-50' : ''}`}
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            openDropdown()
            if (!e.target.value) onSelect({ descripcion: '', productoId: null, unidad: '', talla: '' })
            else onSelect({ descripcion: e.target.value, productoId: null, unidad: '', talla: '' })
          }}
          onFocus={openDropdown}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder={placeholder || 'Busca o escribe descripcion...'}
        />
        {linked
          ? <CheckCircleIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-green-500 pointer-events-none" />
          : <MagnifyingGlassIcon className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 pointer-events-none" />
        }
      </div>
      {linked && (
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">{linked.codigo}</span>
          {stockSede(productoId) !== null && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${stockSede(productoId) > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-600'}`}>
              Stock: {stockSede(productoId)}
            </span>
          )}
        </div>
      )}
      {dropdown}
    </div>
  )
}

function mkItem() {
  return {
    id: genId(), descripcion: '', productoId: null,
    cantidad: 1, unidad: '', talla: '',
    sedeId: '', especificaciones: '',
    estadoItem: 'Pendiente',
    cantidadAprobada: null, motivoRechazo: '',
  }
}

// ── LIST VIEW ──────────────────────────────────────────────────────────────────
function ReqList({ reqs, sedes, onNew, onView, onEdit, onConsolidar, isAdmin, isCoordGen, isCoordLogistica, isJefeRRHH, inventario }) {
  const [search, setSearch] = useState('')
  const [fEstado, setFEstado] = useState('')
  const [fPrio, setFPrio] = useState('')
  const [fSede, setFSede] = useState('')
  const [fTipo, setFTipo] = useState('')
  const [fDesde, setFDesde] = useState('')
  const [fHasta, setFHasta] = useState('')

  const sedeMap = Object.fromEntries(sedes.map(s => [s.id, s.nombre]))

  // Stock en Almacén Central (s1) — que es desde donde se despacha
  const stockTotal = (productoId) => {
    if (!productoId || !inventario) return null
    return inventario['s1']?.[productoId]?.cantidad ?? null
  }
  const pendAprobacion = reqs.filter(r => r.estado === 'Pendiente de Aprobación').length
  const pendAlmacen    = reqs.filter(r => r.estado === 'Aprobado - En Almacén').length

  const filtrados = useMemo(() => {
    return [...reqs].filter(r => {
      if (search && !`${r.numero} ${r.responsable} ${r.areaSolicitante}`.toLowerCase().includes(search.toLowerCase())) return false
      if (fEstado && r.estado !== fEstado) return false
      if (fPrio && r.prioridad !== fPrio) return false
      if (fSede && r.sedeId !== fSede) return false
      if (fTipo && r.tipo !== fTipo) return false
      if (fDesde && r.fecha < fDesde) return false
      if (fHasta && r.fecha > fHasta) return false
      return true
    }).sort((a, b) => {
      const dateDiff = new Date(b.fecha) - new Date(a.fecha)
      if (dateDiff !== 0) return dateDiff
      return (b.numero || '').localeCompare(a.numero || '', undefined, { numeric: true })
    })
  }, [reqs, search, fEstado, fPrio, fSede, fTipo, fDesde, fHasta])

  const limpiar = () => { setSearch(''); setFEstado(''); setFPrio(''); setFSede(''); setFTipo(''); setFDesde(''); setFHasta('') }
  const hayFiltro = search || fEstado || fPrio || fSede || fTipo || fDesde || fHasta

  const COLS = [
    { header: 'N° RQ', key: 'numero' },
    { header: 'Fecha', key: 'fecha' },
    { header: 'Responsable', key: 'responsable' },
    { header: 'Área', key: 'areaSolicitante' },
    { header: 'Sede', key: r => sedeMap[r.sedeId] || '' },
    { header: 'Tipo', key: 'tipo' },
    { header: 'Prioridad', key: 'prioridad' },
    { header: 'Estado', key: 'estado' },
    { header: 'Ítems', key: r => r.items?.length || 0 },
  ]
  const { selected, toggleOne, toggleAll, clearSelection, isSelected, allSelected, someSelected } = useSelection(filtrados)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Requerimientos de Bienes y Servicios"
        subtitle={`${reqs.length} registros · ${pendAprobacion} pendiente${pendAprobacion !== 1 ? 's' : ''} de aprobación`}
        action={
          <div className="flex items-center gap-2">
            <ExportMenu modulo="Requerimientos" data={filtrados} selected={selected} columns={COLS} filtroLabel={fEstado} />
            <button onClick={onNew} className="btn-primary flex items-center gap-2">
              <PlusIcon className="w-4 h-4" />Nuevo Requerimiento
            </button>
          </div>
        }
      />

      {pendAprobacion > 0 && (isCoordGen || isAdmin) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 font-medium">
            Tienes <strong>{pendAprobacion}</strong> requerimiento{pendAprobacion !== 1 ? 's' : ''} esperando tu aprobación — <strong>Paso 2: Coordinador General</strong>
          </p>
        </div>
      )}
      {pendAlmacen > 0 && (isAdmin || isCoordLogistica) && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-blue-600 shrink-0" />
          <p className="text-sm text-blue-800 font-medium">
            Hay <strong>{pendAlmacen}</strong> requerimiento{pendAlmacen !== 1 ? 's' : ''} aprobado{pendAlmacen !== 1 ? 's' : ''} en almacén pendiente{pendAlmacen !== 1 ? 's' : ''} de despacho — <strong>Paso 3: Logística</strong>
          </p>
        </div>
      )}

      <div className="card space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <FunnelIcon className="w-4 h-4" />Filtros
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="relative col-span-2 md:col-span-2">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-2.5 top-2.5 text-gray-400 pointer-events-none" />
            <input className="input pl-8 text-sm" placeholder="N° RQ, responsable..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input text-sm" value={fEstado} onChange={e => setFEstado(e.target.value)}>
            <option value="">Estado</option>
            {ESTADOS.map(e => <option key={e}>{e}</option>)}
          </select>
          <select className="input text-sm" value={fPrio} onChange={e => setFPrio(e.target.value)}>
            <option value="">Prioridad</option>
            {PRIORIDADES.map(p => <option key={p}>{p}</option>)}
          </select>
          <select className="input text-sm" value={fSede} onChange={e => setFSede(e.target.value)}>
            <option value="">Sede</option>
            {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
          <select className="input text-sm" value={fTipo} onChange={e => setFTipo(e.target.value)}>
            <option value="">Tipo</option>
            {TIPOS.map(t => <option key={t}>{t}</option>)}
          </select>
          <input type="date" className="input text-sm" value={fDesde} onChange={e => setFDesde(e.target.value)} />
          <input type="date" className="input text-sm" value={fHasta} onChange={e => setFHasta(e.target.value)} />
        </div>
        {hayFiltro && (
          <button onClick={limpiar} className="text-xs text-blue-600 hover:underline">
            Limpiar filtros · {filtrados.length} resultado{filtrados.length !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="table-th w-8"><Checkbox checked={allSelected} indeterminate={someSelected} onChange={toggleAll} /></th>
              <th className="table-th">N° RQ</th>
              <th className="table-th">Fecha</th>
              <th className="table-th">Responsable</th>
              <th className="table-th">Área</th>
              <th className="table-th">Sede</th>
              <th className="table-th text-center">Tipo</th>
              <th className="table-th text-center">Prioridad</th>
              <th className="table-th text-center">Ítems</th>
              <th className="table-th text-center">Estado</th>
              <th className="table-th text-center">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtrados.length === 0 && (
              <tr><td colSpan={11} className="text-center py-10 text-gray-400">No hay requerimientos</td></tr>
            )}
            {filtrados.map(r => {
              const EIcon = ESTADO_ICON[r.estado] || ClockIcon
              return (
                <tr key={r.id} className="hover:bg-gray-50/60 cursor-pointer">
                  <td className="table-td w-8" onClick={e => e.stopPropagation()}><Checkbox checked={isSelected(r.id)} onChange={() => toggleOne(r.id)} /></td>
                  <td className="table-td font-mono font-bold text-[#1e3a5f]" onClick={() => onView(r)}>{r.numero}</td>
                  <td className="table-td whitespace-nowrap">{fmtDate(r.fecha)}</td>
                  <td className="table-td">{r.responsable}</td>
                  <td className="table-td text-gray-500">{r.areaSolicitante || '—'}</td>
                  <td className="table-td">{sedeMap[r.sedeId] || '—'}</td>
                  <td className="table-td text-center"><span className="badge bg-gray-100 text-gray-600">{r.tipo}</span></td>
                  <td className="table-td text-center"><span className={`badge ${PRIO_COLOR[r.prioridad]}`}>{r.prioridad}</span></td>
                  <td className="table-td text-center">{r.items?.length || 0}</td>
                  <td className="table-td text-center">
                    <div className="flex items-center justify-center gap-1">
                      <EIcon className="w-3.5 h-3.5" />
                      <span className={`badge ${ESTADO_COLOR[r.estado]}`}>{r.estado}</span>
                    </div>
                  </td>
                  <td className="table-td text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button onClick={e => { e.stopPropagation(); onView(r) }} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600" title="Ver detalle"><EyeIcon className="w-4 h-4" /></button>
                      {r.estado === 'Borrador' && isAdmin && (
                        <button onClick={e => { e.stopPropagation(); onEdit(r) }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500" title="Editar"><PencilSquareIcon className="w-4 h-4" /></button>
                      )}
                      {(isAdmin || isCoordLogistica) && r.estado === 'Aprobado - En Almacén' && (
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            onConsolidar({ id: r.id, consolidadoPor: r.aprobadoPor || 'Coord. Logística', motivoConsolidado: '' })
                          }}
                          className="p-1.5 hover:bg-indigo-50 rounded-lg text-indigo-500" title="Poner en Consolidado">
                          <ClockIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}

// ── FORM VIEW ──────────────────────────────────────────────────────────────────
function ReqForm({ initial, sedes, productos, user, inventario, onSave, onBack }) {
  const toast = useToast()
  const emptyForm = {
    estado: 'Borrador', prioridad: 'Media', tipo: 'Bien',
    responsable: user?.cargo || user?.nombre || '',
    areaSolicitante: user?.area || '', sedeId: '',
    fecha: todayISO(),
    fechaLimiteGlobal: '',
    horaLimiteGlobal: '',
    items: [mkItem()],
    requeridoPorNombre: user?.nombre || '',
    requeridoPorCargo: user?.cargo || '',
  }
  const [form, setForm] = useState(() =>
    initial ? { ...initial, items: initial.items.map(it => ({ ...it })) } : emptyForm
  )
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const setItem = (idx, k, v) => setForm(p => ({
    ...p, items: p.items.map((it, i) => i === idx ? { ...it, [k]: v } : it)
  }))
  const addItem = () => setForm(p => ({ ...p, items: [...p.items, mkItem()] }))
  const removeItem = idx => setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))

  const prodMap = Object.fromEntries(productos.map(p => [p.id, p]))

  const autoLinkItem = (desc) => {
    if (!desc || !productos.length) return null
    const d = desc.toLowerCase().trim()
    const exact = productos.find(p => p.nombre?.toLowerCase().trim() === d)
    if (exact) return exact.id
    const partial = productos.find(p => d.includes(p.nombre?.toLowerCase().trim()) || p.nombre?.toLowerCase().trim().includes(d))
    return partial?.id || null
  }

  const handleSubmit = (asBorrador) => {
    if (!form.responsable.trim()) { toast('Ingrese el responsable', 'error'); return }
    if (!form.sedeId) { toast('Seleccione la sede', 'error'); return }
    if (form.items.some(it => !it.descripcion.trim())) { toast('Complete la descripción de todos los ítems', 'error'); return }
    const itemsConLink = form.items.map(it => ({
      ...it,
      productoId: it.productoId || autoLinkItem(it.descripcion) || null
    }))
    const jefeId = user?.jefeDirectoId || null
    const estadoInicial = asBorrador ? 'Borrador' : (jefeId ? 'Pendiente Aprobación Jefe' : 'Pendiente de Aprobación')
    onSave({ ...form, items: itemsConLink, estado: estadoInicial, rolSolicitante: user?.rol || '', jefeAprobadorId: jefeId, creadorId: user?.id || '' })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeftIcon className="w-4 h-4" />Volver
        </button>
        <h1 className="text-lg font-bold text-gray-800">
          {initial ? `Editar ${initial.numero}` : 'Nuevo Requerimiento — SIG-FO-023'}
        </h1>
      </div>

      <div className="card space-y-4">
        {/* Datos generales */}
        <div className="border border-[#1e3a5f] rounded-xl overflow-hidden">
          <div className="bg-[#1e3a5f] px-4 py-2.5">
            <p className="text-white text-xs font-bold uppercase tracking-wide">Datos Generales del Requerimiento — SIG-FO-023</p>
          </div>
          <div className="p-4 space-y-3">
            {/* Row 1: Prioridad | Tipo | Fecha solicitud */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-2">PRIORIDAD</label>
                <div className="flex gap-4">
                  {PRIORIDADES.map(p => (
                    <label key={p} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="prioridad" value={p} checked={form.prioridad === p} onChange={() => setF('prioridad', p)} className="accent-[#1e3a5f]" />
                      <span className={`text-xs font-semibold ${p === 'Alta' ? 'text-red-600' : p === 'Media' ? 'text-amber-600' : 'text-green-600'}`}>{p.toUpperCase()}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-2">TIPO DE REQUERIMIENTO</label>
                <div className="flex gap-4">
                  {TIPOS.map(t => (
                    <label key={t} className="flex items-center gap-1.5 cursor-pointer">
                      <input type="radio" name="tipo" value={t} checked={form.tipo === t} onChange={() => setF('tipo', t)} className="accent-[#1e3a5f]" />
                      <span className="text-xs font-semibold text-gray-700">{t.toUpperCase()}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">FECHA DE SOLICITUD</label>
                <input type="date" className="input text-sm bg-gray-50 cursor-default" value={form.fecha} readOnly />
              </div>
            </div>
            {/* Row 2: Resp | Área | Fecha límite | Hora límite | Sede */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">RESP. DE LA SOLICITUD</label>
                <input className="input bg-gray-50 cursor-default"
                  value={form.responsable}
                  readOnly
                  placeholder="Nombre del responsable" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">ÁREA SOLICITANTE</label>
                <input className="input bg-gray-50 cursor-default"
                  value={form.areaSolicitante}
                  readOnly
                  placeholder="Área o departamento" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">FECHA LÍMITE DE ENTREGA</label>
                <input type="date" className="input" value={form.fechaLimiteGlobal} onChange={e => setF('fechaLimiteGlobal', e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">HORA LÍMITE</label>
                <input type="time" className="input" value={form.horaLimiteGlobal} onChange={e => setF('horaLimiteGlobal', e.target.value)} />
              </div>
              <div className="col-span-2 md:col-span-1">
                <label className="text-xs font-bold text-gray-600 block mb-1">SEDE / ÁREA <span className="text-red-500">*</span></label>
                <select className="input" value={form.sedeId} onChange={e => setF('sedeId', e.target.value)} required>
                  <option value="">Seleccionar sede...</option>
                  {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="border border-[#1e3a5f] rounded-xl overflow-hidden">
          <div className="bg-[#1e3a5f] px-4 py-2.5 flex items-center justify-between">
            <p className="text-white text-xs font-bold uppercase tracking-wide">Ítems del Requerimiento</p>
            <button type="button" onClick={addItem} className="flex items-center gap-1.5 text-xs text-blue-200 hover:text-white font-medium">
              <PlusIcon className="w-3.5 h-3.5" />Agregar fila
            </button>
          </div>
          <div className="overflow-x-auto">
            {(() => {
              const anyHasTalla = form.items.some(it => it.talla !== '')
              return (
            <table className="w-full text-xs" style={{ minWidth: 680 }}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="table-th text-center w-8">N°</th>
                  <th className="table-th" style={{ minWidth: 220 }}>Descripción / Producto</th>
                  <th className="table-th text-center w-16">Cant.</th>
                  <th className="table-th w-24">UM</th>
                  {anyHasTalla && <th className="table-th w-20">Talla</th>}
                  <th className="table-th w-36">Sede/Local</th>
                  <th className="table-th" style={{ minWidth: 180 }}>Especificaciones</th>
                  <th className="table-th w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {form.items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="table-td text-center text-gray-400 font-mono font-bold">{String(idx+1).padStart(2,'0')}</td>
                    <td className="table-td" style={{ minWidth: 200 }}>
                      <ProductCombobox
                        value={item.descripcion}
                        productoId={item.productoId}
                        productos={productos}
                        inventario={inventario || {}}
                        onSelect={({ descripcion, productoId, unidad, talla }) => {
                          setItem(idx, 'descripcion', descripcion)
                          setItem(idx, 'productoId', productoId)
                          if (unidad) setItem(idx, 'unidad', unidad)
                          setItem(idx, 'talla', talla ?? '')
                        }}
                      />
                    </td>
                    <td className="table-td" style={{ minWidth: 60 }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        className="input text-xs py-1 text-center w-full"
                        value={item.cantidad === '' ? '' : (item.cantidad ?? 1)}
                        onChange={e => {
                          const raw = e.target.value.replace(/[^0-9]/g, '')
                          setItem(idx, 'cantidad', raw === '' ? '' : parseInt(raw, 10))
                        }}
                        onBlur={() => {
                          if (!item.cantidad || item.cantidad < 1) setItem(idx, 'cantidad', 1)
                        }}
                      />
                    </td>
                    <td className="table-td">
                      <select className="input text-xs py-1" value={item.unidad} onChange={e => setItem(idx,'unidad',e.target.value)}>
                        <option value="">UM...</option>
                        {UNIDADES.map(u => <option key={u}>{u}</option>)}
                      </select>
                    </td>
                    {anyHasTalla && (
                      <td className="table-td">
                        {item.talla !== '' && (
                          <input className="input text-xs py-1" value={item.talla} onChange={e => setItem(idx,'talla',e.target.value)} placeholder="Talla" />
                        )}
                      </td>
                    )}
                    <td className="table-td">
                      <select className="input text-xs py-1" value={item.sedeId} onChange={e => setItem(idx,'sedeId',e.target.value)}>
                        <option value="">Sede...</option>
                        {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                      </select>
                    </td>
                    <td className="table-td">
                      <input className="input text-xs py-1" value={item.especificaciones} onChange={e => setItem(idx,'especificaciones',e.target.value)} placeholder="Especificaciones técnicas..." />
                    </td>
                    <td className="table-td">
                      {form.items.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
              )
            })()}
          </div>
          <div className="px-4 py-2 text-xs text-gray-400 bg-gray-50 border-t border-gray-100">
            Total: {form.items.length} ítem{form.items.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Firmas */}
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <p className="text-xs font-bold text-gray-600 uppercase">Requerido Por</p>
            </div>
            <div className="p-4 space-y-2">
              <div>
                <label className="text-xs text-gray-500">Apellidos y Nombres</label>
                <input className="input text-sm mt-0.5" value={form.requeridoPorNombre} onChange={e => setF('requeridoPorNombre', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-gray-500">Cargo</label>
                <input className="input text-sm mt-0.5" value={form.requeridoPorCargo} onChange={e => setF('requeridoPorCargo', e.target.value)} />
              </div>
            </div>
          </div>
          <div className="border border-gray-100 rounded-xl overflow-hidden opacity-50">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-500 uppercase">Aprobado Por</p>
            </div>
            <div className="p-4">
              <p className="text-xs text-gray-400 italic">Se completará al aprobar el requerimiento desde almacén</p>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
          <button type="button" onClick={onBack} className="btn-secondary">Cancelar</button>
          <button type="button" onClick={() => handleSubmit(true)} className="btn-secondary flex items-center gap-2">
            <ArrowPathIcon className="w-4 h-4" />Guardar como Borrador
          </button>
          <button type="button" onClick={() => handleSubmit(false)} className="btn-primary flex items-center gap-2">
            <PaperAirplaneIcon className="w-4 h-4" />Enviar al Almacén
          </button>
        </div>
      </div>
    </div>
  )
}

// ── DETAIL VIEW ────────────────────────────────────────────────────────────────
function ReqDetail({ req, sedes, onBack, onEdit, onAnular, onAprobar, onAprobarJefe, onAprobarPaso1, onConsolidar, onElevarGerencia, onAprobarGerencia, onRechazarGerencia, onPosponerGerencia, isAdmin, isCoordGen, isCoordLogistica, isGerencia, isJefeRRHH, logo, inventario, user, usuarios }) {
  const toast = useToast()
  const { state: appState } = useApp()
  const productos = appState.productos || []
  const sedeMap = Object.fromEntries(sedes.map(s => [s.id, s.nombre]))

  // Auto-vincula por nombre exacto o parcial contra el catálogo
  const autoLink = (desc) => {
    if (!desc || !productos.length) return null
    const d = desc.toLowerCase().trim()
    const exact = productos.find(p => p.nombre?.toLowerCase().trim() === d)
    if (exact) return exact.id
    const partial = productos.find(p => d.includes(p.nombre?.toLowerCase().trim()) || p.nombre?.toLowerCase().trim().includes(d))
    return partial?.id || null
  }

  // Stock en Almacén Central (s1) — que es desde donde se despacha
  const stockTotal = (productoId) => {
    if (!productoId || !inventario) return null
    return inventario['s1']?.[productoId]?.cantidad ?? null
  }

  const [showAprobPanel, setShowAprobPanel] = useState(false)
  const [showJefePanel, setShowJefePanel] = useState(false)
  const [showPaso1Panel, setShowPaso1Panel] = useState(false)
  const [comentarioPaso1, setComentarioPaso1] = useState('')
  const [comentarioJefe, setComentarioJefe] = useState('')
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [aprobNombreJefe, setAprobNombreJefe] = useState(() => {
    try { return JSON.parse(localStorage.getItem('givamic_user'))?.nombre || '' } catch { return '' }
  })
  const [itemsJefe, setItemsJefe] = useState(() =>
    (req.items || []).map(it => ({
      itemId: it.id,
      cantidadAprobada: it.cantidadAprobadaJefe !== undefined ? it.cantidadAprobadaJefe : Number(it.cantidad),
      motivoAjuste: it.motivoAjusteJefe || '',
    }))
  )
  const setItemJefe = (itemId, k, v) =>
    setItemsJefe(prev => prev.map(a => a.itemId === itemId ? { ...a, [k]: v } : a))
  const aprobarTodoJefe = () => setItemsJefe(prev => prev.map(a => {
    const it = req.items?.find(x => x.id === a.itemId)
    return { ...a, cantidadAprobada: Number(it?.cantidad || a.cantidadAprobada), motivoAjuste: '' }
  }))
  const [showElevarPanel, setShowElevarPanel] = useState(false)
  const [showConsolidadoPanel, setShowConsolidadoPanel] = useState(false)
  const [motivoConsolidado, setMotivoConsolidado] = useState('')
  const [tipoElevacion, setTipoElevacion] = useState('Activo fijo')
  const [detalleElevacion, setDetalleElevacion] = useState('')
  const [showGerenciaPanel, setShowGerenciaPanel] = useState(false)
  const [comentarioGerencia, setComentarioGerencia] = useState('')
  const [motivoRechazoGerencia, setMotivoRechazoGerencia] = useState('')
  const [motivoPostergacion, setMotivoPostergacion] = useState('')
  const [aprobComment, setAprobComment] = useState('')
  const [aprobNombre, setAprobNombre] = useState(() => {
    try { return JSON.parse(localStorage.getItem('givamic_user'))?.nombre || '' } catch { return '' }
  })
  const [aprobCargo, setAprobCargo] = useState('')
  const [proveedorOCId, setProveedorOCId] = useState('')
  const [itemsAprob, setItemsAprob] = useState(() =>
    (req.items || []).map(it => {
      const vinculadoId = it.productoId || autoLink(it.descripcion) || null
      const stk = vinculadoId ? (inventario?.['s1']?.[vinculadoId]?.cantidad ?? null) : null
      const sinStock = stk === null || stk === 0
      return {
        itemId: it.id,
        estadoItem: it.estadoItem === 'Pendiente' ? 'Aprobado' : it.estadoItem,
        cantidadAprobada: it.cantidadAprobadaJefe !== undefined ? it.cantidadAprobadaJefe : (it.cantidadAprobada ?? it.cantidad),
        motivoRechazo: it.motivoRechazo || '',
        stockDecision: sinStock ? 'oc' : 'stock',
        productoIdVinculado: vinculadoId,
      }
    })
  )

  const setItemAprob = (itemId, k, v) =>
    setItemsAprob(prev => prev.map(a => a.itemId === itemId ? { ...a, [k]: v } : a))

  const aprobarTodo = () => setItemsAprob(prev => prev.map(a => {
    const it = req.items.find(x => x.id === a.itemId)
    return { ...a, estadoItem: 'Aprobado', cantidadAprobada: it?.cantidad || a.cantidadAprobada }
  }))
  const rechazarTodo = () => setItemsAprob(prev => prev.map(a => ({ ...a, estadoItem: 'Rechazado' })))

  const handleAprobar = () => {
    const provSel = (appState.proveedores || []).find(p => p.id === proveedorOCId)
    onAprobar({
      id: req.id,
      payload: {
        aprobadoPor: aprobNombre || 'Almacén',
        aprobadoPorNombre: aprobNombre,
        aprobadoPorCargo: aprobCargo,
        comentario: aprobComment,
        itemsAprobacion: itemsAprob,
        proveedorOC: provSel?.nombre || '',
        proveedorOCId: proveedorOCId || null,
      }
    })
  }

  const handlePDF = () => {
    const reqN = {
      ...req,
      _sedeName: sedeMap[req.sedeId] || req.areaSolicitante || '',
      items: (req.items || []).map(it => ({ ...it, _sedeName: sedeMap[it.sedeId] || '' })),
    }
    generarPDFRequerimiento(reqN, logo)
  }

  const EIcon = ESTADO_ICON[req.estado] || ClockIcon
  const canDespachar       = (isAdmin || isCoordLogistica) && ['Aprobado - En Almacén','Aprobado con Ajustes - En Almacén','Aprobado por Gerencia','En Consolidado'].includes(req.estado)
  const canElevarGerencia  = (isAdmin || isCoordLogistica) && ['Aprobado - En Almacén','Aprobado con Ajustes - En Almacén'].includes(req.estado)
  const canConsolidar      = (isAdmin || isCoordLogistica) && ['Aprobado - En Almacén','Aprobado con Ajustes - En Almacén'].includes(req.estado)
  const canAprobarGen      = (isAdmin || isCoordGen) && req.estado === 'Pendiente de Aprobación'
  const canAprobarGerencia = (isAdmin || isGerencia) && req.estado === 'Pendiente de Aprobación Gerencial'
  const canAnular = ['Borrador','Pendiente de Aprobación','Aprobado - En Almacén','Pendiente de Aprobación Gerencial'].includes(req.estado)
  // Paso 1: jefe directo del creador
  const esJefeDirectoDelReq = req.estado === 'Pendiente Aprobación Jefe' && (isAdmin || (user?.id && user.id === req.jefeAprobadorId))
  const jefeNombre = usuarios.find(u => u.id === req.jefeAprobadorId)?.nombre || '—'

  return (
    <div className="space-y-3">

      {/* ── Cabecera compacta ─────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
            <ArrowLeftIcon className="w-3.5 h-3.5" />Volver
          </button>
          <h1 className="text-base font-bold text-[#1e3a5f]">{req.numero}</h1>
          <span className={`badge text-xs ${PRIO_COLOR[req.prioridad]}`}>{req.prioridad}</span>
          <div className="flex items-center gap-1">
            <EIcon className="w-3.5 h-3.5 text-gray-400" />
            <span className={`badge text-xs ${ESTADO_COLOR[req.estado]}`}>{req.estado}</span>
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {esJefeDirectoDelReq && !showPaso1Panel && (
            <button onClick={() => setShowPaso1Panel(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium">
              <CheckCircleIcon className="w-3.5 h-3.5" />Paso 1: Aprobar como Jefe
            </button>
          )}
          {canAprobarGen && !showJefePanel && (
            <button onClick={() => setShowJefePanel(true)} className="bg-purple-600 hover:bg-purple-700 text-white px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium">
              <CheckCircleIcon className="w-3.5 h-3.5" />Paso 2: Aprobar / Rechazar
            </button>
          )}
          {canConsolidar && !showElevarPanel && !showAprobPanel && !showConsolidadoPanel && (
            <button onClick={() => setShowConsolidadoPanel(true)} className="bg-indigo-500 hover:bg-indigo-600 text-white px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium">
              <ClockIcon className="w-3.5 h-3.5" />Poner en Consolidado
            </button>
          )}
          {canElevarGerencia && !showElevarPanel && !showAprobPanel && !showConsolidadoPanel && (
            <button onClick={() => setShowElevarPanel(true)} className="bg-orange-500 hover:bg-orange-600 text-white px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium">
              <ArrowUpCircleIcon className="w-3.5 h-3.5" />Elevar a Gerencia
            </button>
          )}
          {canDespachar && !showAprobPanel && (
            <button onClick={() => setShowAprobPanel(true)} className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-2.5">
              <BuildingStorefrontIcon className="w-3.5 h-3.5" />Paso 3: Atender en Almacén
            </button>
          )}
          {canAprobarGerencia && !showGerenciaPanel && (
            <button onClick={() => setShowGerenciaPanel(true)} className="bg-orange-600 hover:bg-orange-700 text-white px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-medium">
              <CheckCircleIcon className="w-3.5 h-3.5" />Paso 4: Resolución Gerencial
            </button>
          )}

          <button onClick={handlePDF} className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-2.5">
            <DocumentArrowDownIcon className="w-3.5 h-3.5" />PDF
          </button>
          {req.estado === 'Borrador' && isAdmin && (
            <button onClick={() => onEdit(req)} className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-2.5">
              <PencilSquareIcon className="w-3.5 h-3.5" />Editar
            </button>
          )}
          {canAnular && (
            <button onClick={() => onAnular(req)} className="btn-danger text-xs py-1.5 px-2.5 flex items-center gap-1.5">
              <NoSymbolIcon className="w-3.5 h-3.5" />Anular
            </button>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-400">{req.responsable} · {req.areaSolicitante || '—'} · {fmtDate(req.fecha)}</p>

      {/* ── PASO 1: Panel Jefe Directo ──────────────────────── */}
      {showPaso1Panel && esJefeDirectoDelReq && (
        <div className="border-2 border-purple-200 bg-purple-50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded">PASO 1</span>
            <p className="font-semibold text-purple-800 text-sm">Aprobación Jefe Directo</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-gray-600 bg-white/80 rounded-lg p-2 border border-purple-100">
            <span><span className="text-gray-400">Solicitante:</span> <strong>{req.responsable}</strong></span>
            <span><span className="text-gray-400">Área:</span> {req.areaSolicitante || '—'}</span>
            <span><span className="text-gray-400">Ítems:</span> {req.items?.length || 0}</span>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Comentario (opcional)</label>
            <input className="input text-sm w-full" value={comentarioPaso1} onChange={e => setComentarioPaso1(e.target.value)} placeholder="Observación o motivo..." />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => {
                onAprobarPaso1({ id: req.id, aprobado: true, aprobadoPor: user?.nombre || jefeNombre, comentario: comentarioPaso1 })
              }}
              className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs px-4 py-1.5 rounded-lg font-medium"
            >
              <CheckCircleIcon className="w-3.5 h-3.5" />Aprobar REQ
            </button>
            <button
              onClick={() => {
                if (!comentarioPaso1.trim()) { toast('Ingresa el motivo de rechazo', 'error'); return }
                onAprobarPaso1({ id: req.id, aprobado: false, aprobadoPor: user?.nombre || jefeNombre, comentario: comentarioPaso1 })
              }}
              className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs px-4 py-1.5 rounded-lg font-medium"
            >
              <XCircleIcon className="w-3.5 h-3.5" />Rechazar
            </button>
            <button onClick={() => setShowPaso1Panel(false)} className="text-xs text-gray-500 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
          </div>
        </div>
      )}

      {/* ── PASO 2: Panel Coordinador General ─────────────── */}
      {showJefePanel && canAprobarGen && (
        <div className="border-2 border-sky-200 bg-sky-50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-sky-500 text-white text-xs font-bold px-2 py-0.5 rounded">PASO 2</span>
            <p className="font-semibold text-sky-800 text-sm">Coordinador General — Aprobación ítem por ítem</p>
          </div>
          {/* Resumen de cabecera */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-600 bg-white/80 rounded-lg p-2 border border-sky-100">
            <span><span className="text-gray-400">Solicitante:</span> <strong>{req.responsable}</strong></span>
            <span><span className="text-gray-400">Área:</span> {req.areaSolicitante || '—'}</span>
            <span><span className="text-gray-400">Prioridad:</span> <span className={`badge ${PRIO_COLOR[req.prioridad]}`}>{req.prioridad}</span></span>
            <span><span className="text-gray-400">Ítems:</span> {req.items?.length || 0}</span>
          </div>
          {/* Nombre del aprobador + comentario global */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Tu nombre (Coord. General) *</label>
              <input className="input text-sm" value={aprobNombreJefe} onChange={e => setAprobNombreJefe(e.target.value)} placeholder="Nombre completo" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Comentario general (opcional)</label>
              <input className="input text-sm" value={comentarioJefe} onChange={e => setComentarioJefe(e.target.value)} placeholder="Observación general del REQ..." />
            </div>
          </div>
          {/* Botón rápido */}
          <div className="flex gap-2">
            <button onClick={aprobarTodoJefe} className="bg-sky-100 hover:bg-sky-200 text-sky-800 text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5">
              <CheckCircleIcon className="w-3.5 h-3.5" />Aprobar todo como está
            </button>
          </div>
          {/* Tabla ítem por ítem */}
          <div className="overflow-x-auto rounded-lg border border-sky-200">
            <table className="w-full text-xs" style={{ minWidth: 680 }}>
              <thead>
                <tr className="bg-sky-100 text-sky-800">
                  <th className="table-th w-8 text-center">N°</th>
                  <th className="table-th">Producto / Descripción</th>
                  <th className="table-th text-center">Cant. SOLICITADA</th>
                  <th className="table-th text-center" style={{ minWidth: 110 }}>Cant. APROBADA</th>
                  <th className="table-th" style={{ minWidth: 180 }}>Motivo / Comentario</th>
                  <th className="table-th text-center" style={{ minWidth: 140 }}>Acción rápida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-100">
                {(req.items || []).map((it, idx) => {
                  const aj = itemsJefe.find(a => a.itemId === it.id) || {}
                  const cantSol = Number(it.cantidad)
                  const cantAprob = aj.cantidadAprobada !== undefined ? Number(aj.cantidadAprobada) : cantSol
                  const esRechazado = cantAprob === 0
                  const esParcial = cantAprob > 0 && cantAprob < cantSol
                  const rowBg = esRechazado ? 'bg-red-50' : esParcial ? 'bg-amber-50' : 'bg-white'
                  return (
                    <tr key={it.id} className={rowBg}>
                      <td className="table-td text-center font-mono text-gray-400">{String(idx+1).padStart(2,'0')}</td>
                      <td className="table-td font-medium">{it.descripcion}</td>
                      <td className="table-td text-center font-semibold text-gray-700">{cantSol}</td>
                      <td className="table-td text-center">
                        <input
                          type="number" min={0} max={cantSol} step={1}
                          className={`w-20 text-center border rounded-lg px-2 py-1 text-sm font-bold ${esRechazado ? 'border-red-400 text-red-600 bg-red-50' : esParcial ? 'border-amber-400 text-amber-700 bg-amber-50' : 'border-green-300 text-green-700'}`}
                          value={aj.cantidadAprobada !== undefined ? aj.cantidadAprobada : cantSol}
                          onChange={e => {
                            const v = Math.max(0, Math.min(cantSol, Number(e.target.value)))
                            setItemJefe(it.id, 'cantidadAprobada', v)
                            if (v > 0) setItemJefe(it.id, 'motivoAjuste', aj.motivoAjuste || '')
                          }}
                        />
                      </td>
                      <td className="table-td">
                        <input
                          className={`input text-xs w-full ${(esRechazado && !aj.motivoAjuste?.trim()) ? 'border-red-400' : ''}`}
                          placeholder={esRechazado ? 'Motivo obligatorio...' : esParcial ? 'Motivo del ajuste (recomendado)...' : 'Comentario (opcional)...'}
                          value={aj.motivoAjuste || ''}
                          onChange={e => setItemJefe(it.id, 'motivoAjuste', e.target.value)}
                        />
                      </td>
                      <td className="table-td text-center">
                        <div className="flex gap-1 justify-center">
                          <button
                            title="Restituir cantidad solicitada original"
                            onClick={() => { setItemJefe(it.id, 'cantidadAprobada', cantSol); setItemJefe(it.id, 'motivoAjuste', '') }}
                            className="bg-green-100 hover:bg-green-200 text-green-700 text-xs px-2 py-1 rounded font-medium"
                          >↺ Cant. sol.</button>
                          <button
                            title="Rechazar ítem completo"
                            onClick={() => setItemJefe(it.id, 'cantidadAprobada', 0)}
                            className="bg-red-100 hover:bg-red-200 text-red-700 text-xs px-2 py-1 rounded font-medium"
                          >✗ Rechazar</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {/* Resumen visual */}
          <div className="flex gap-3 text-xs flex-wrap">
            {(() => {
              const rechazados = itemsJefe.filter(a => Number(a.cantidadAprobada) === 0).length
              const parciales = itemsJefe.filter(a => {
                const it = req.items?.find(x => x.id === a.itemId)
                const cant = Number(a.cantidadAprobada)
                return cant > 0 && cant < Number(it?.cantidad)
              }).length
              const completos = itemsJefe.length - rechazados - parciales
              return (
                <>
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{completos} completo{completos !== 1 ? 's' : ''}</span>
                  {parciales > 0 && <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{parciales} parcial{parciales !== 1 ? 'es' : ''}</span>}
                  {rechazados > 0 && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{rechazados} rechazado{rechazados !== 1 ? 's' : ''}</span>}
                </>
              )
            })()}
          </div>
          {/* Acciones */}
          <div className="flex gap-2 flex-wrap pt-1 border-t border-sky-200">
            <button onClick={() => {
              if (!aprobNombreJefe.trim()) { toast('Ingresa tu nombre para aprobar', 'error'); return }
              const rechazadosSinMotivo = itemsJefe.filter(a => Number(a.cantidadAprobada) === 0 && !a.motivoAjuste?.trim())
              if (rechazadosSinMotivo.length > 0) {
                toast(`Ítems rechazados requieren motivo (${rechazadosSinMotivo.length} sin motivo)`, 'error'); return
              }
              const todosRechazados = itemsJefe.every(a => Number(a.cantidadAprobada) === 0)
              if (todosRechazados) { toast('Si rechaza todos los ítems, use el botón Rechazar REQ', 'error'); return }
              onAprobarJefe({ id: req.id, aprobado: true, aprobadoPor: aprobNombreJefe, comentario: comentarioJefe, itemsAprob: itemsJefe })
              setShowJefePanel(false)
            }} className="btn-primary text-xs flex items-center gap-1.5">
              <CheckCircleIcon className="w-3.5 h-3.5" />Guardar aprobación con ajustes
            </button>
            <button onClick={() => {
              if (!motivoRechazo.trim()) { toast('El motivo de rechazo es obligatorio', 'error'); return }
              onAprobarJefe({ id: req.id, aprobado: false, aprobadoPor: aprobNombreJefe || 'Coordinador General', comentario: motivoRechazo, itemsAprob: [] })
              setShowJefePanel(false)
            }} className="btn-danger text-xs flex items-center gap-1.5">
              <XCircleIcon className="w-3.5 h-3.5" />Rechazar REQ completo
            </button>
            <button onClick={() => setShowJefePanel(false)} className="btn-secondary text-xs">Cancelar</button>
          </div>
          {/* Campo motivo rechazo total */}
          <div>
            <label className="text-xs font-medium text-red-600 block mb-1">Motivo rechazo total del REQ <span className="text-gray-400">(solo si rechaza todo)</span></label>
            <input className="input text-sm border-red-200" value={motivoRechazo} onChange={e => setMotivoRechazo(e.target.value)} placeholder="Explique el motivo de rechazo total..." />
          </div>
        </div>
      )}

      {/* ── Panel: Poner en Consolidado ─────────────────── */}
      {showConsolidadoPanel && canConsolidar && (
        <div className="border-2 border-indigo-300 bg-indigo-50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded">CONSOLIDADO</span>
            <p className="font-semibold text-indigo-800 text-sm">Poner en Consolidado — se atenderá en una compra futura</p>
          </div>
          <p className="text-xs text-indigo-700">Este REQ quedará en estado <strong>En Consolidado</strong> hasta que se decida atenderlo.</p>
          <div>
            <label className="block text-xs font-semibold text-indigo-700 mb-1">Motivo (opcional)</label>
            <input
              className="input text-sm w-full"
              value={motivoConsolidado}
              onChange={e => setMotivoConsolidado(e.target.value)}
              placeholder="Ej: Se agrupará con próxima OC de limpieza..."
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => {
                onConsolidar({ id: req.id, consolidadoPor: req.aprobadoPor || 'Coord. Logística', motivoConsolidado })
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5">
              <ClockIcon className="w-4 h-4" />Confirmar — Poner en Consolidado
            </button>
            <button onClick={() => { setShowConsolidadoPanel(false); setMotivoConsolidado('') }} className="btn-secondary text-xs px-4 py-2">Cancelar</button>
          </div>
        </div>
      )}

      {/* ── PASO 3b: Elevar a Gerencia panel ─────────────── */}
      {showElevarPanel && canElevarGerencia && (
        <div className="border-2 border-orange-300 bg-orange-50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded">PASO 3b</span>
            <p className="font-semibold text-orange-800 text-sm">Coord. Logística — Elevar a Aprobación Gerencial</p>
          </div>
          <p className="text-xs text-gray-600">Este requerimiento requiere autorización superior. Ingresa el tipo y motivo antes de enviarlo a Gerencia.</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Tipo de pedido *</label>
              <select className="input text-sm" value={tipoElevacion} onChange={e => setTipoElevacion(e.target.value)}>
                <option>Activo fijo</option>
                <option>Monto elevado</option>
                <option>Decisión estratégica</option>
                <option>Otro</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Detalle / especificar *</label>
              <input className="input text-sm" value={detalleElevacion} onChange={e => setDetalleElevacion(e.target.value)} placeholder="Describe por qué necesita aprobación gerencial..." />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => {
              if (!detalleElevacion.trim()) { toast('El detalle es obligatorio', 'error'); return }
              const motivoFinal = tipoElevacion + (detalleElevacion ? ': ' + detalleElevacion : '')
              onElevarGerencia({ id: req.id, elevadoPor: aprobNombre || 'Coord. Logística', motivoElevacion: motivoFinal })
              setShowElevarPanel(false)
            }} className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium">
              <ArrowUpCircleIcon className="w-3.5 h-3.5" />Enviar a Gerencia
            </button>
            <button onClick={() => setShowElevarPanel(false)} className="btn-secondary text-xs">Cancelar</button>
          </div>
        </div>
      )}

      {/* ── PASO 4: Panel Gerencial ──────────────────────────── */}
      {showGerenciaPanel && canAprobarGerencia && (
        <div className="border-2 border-orange-400 bg-orange-50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-orange-600 text-white text-xs font-bold px-2 py-0.5 rounded">PASO 4</span>
            <p className="font-semibold text-orange-900 text-sm">Administración / Gerencia — Resolución</p>
          </div>
          {req.motivoElevacion && (
            <div className="bg-white rounded-lg px-3 py-2 text-xs text-orange-800 border border-orange-200">
              <span className="font-medium">Motivo de elevación:</span> {req.motivoElevacion}
              {req.elevadoPor && <span className="ml-2 text-gray-400">— elevado por {req.elevadoPor}</span>}
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Comentario de Gerencia</label>
            <input className="input text-sm" value={comentarioGerencia} onChange={e => setComentarioGerencia(e.target.value)} placeholder="Observación (opcional al aprobar o posponer)..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-red-600 block mb-1">Motivo de rechazo <span className="text-gray-400">(obligatorio si rechaza)</span></label>
              <input className="input text-sm border-red-200" value={motivoRechazoGerencia} onChange={e => setMotivoRechazoGerencia(e.target.value)} placeholder="Explique el motivo del rechazo..." />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 block mb-1">Motivo de postergación <span className="text-gray-400">(si pospone)</span></label>
              <input className="input text-sm" value={motivoPostergacion} onChange={e => setMotivoPostergacion(e.target.value)} placeholder="Ej: Revisar en reunión de directorio..." />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => {
              onAprobarGerencia({ id: req.id, aprobadoPor: aprobNombre || 'Gerencia', comentario: comentarioGerencia })
              setShowGerenciaPanel(false)
            }} className="btn-primary text-xs flex items-center gap-1.5">
              <CheckCircleIcon className="w-3.5 h-3.5" />✅ Aprobar — Enviar a Logística
            </button>
            <button onClick={() => {
              if (!motivoRechazoGerencia.trim()) { toast('El motivo de rechazo es obligatorio', 'error'); return }
              onRechazarGerencia({ id: req.id, rechazadoPor: aprobNombre || 'Gerencia', motivoRechazo: motivoRechazoGerencia })
              setShowGerenciaPanel(false)
            }} className="btn-danger text-xs flex items-center gap-1.5">
              <XCircleIcon className="w-3.5 h-3.5" />❌ Rechazar
            </button>
            <button onClick={() => {
              onPosponerGerencia({ id: req.id, pospuestoPor: aprobNombre || 'Gerencia', motivoPostergacion: motivoPostergacion || comentarioGerencia || 'Pendiente de decisión gerencial' })
              setShowGerenciaPanel(false)
            }} className="bg-slate-400 hover:bg-slate-500 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium">
              <ClockIcon className="w-3.5 h-3.5" />⏸️ Posponer — Consolidado Gerencial
            </button>
            <button onClick={() => setShowGerenciaPanel(false)} className="btn-secondary text-xs">Cancelar</button>
          </div>
        </div>
      )}

      {/* Badges de estado */}
      {/* Trazabilidad */}
      {req.aprobadoPorJefe && ['Aprobado - En Almacén','Aprobado con Ajustes - En Almacén','Completado','Despachado Parcialmente','En Orden de Compra'].includes(req.estado) && (
        <div className={`border rounded-lg px-3 py-2 text-xs ${req.estado === 'Aprobado con Ajustes - En Almacén' ? 'bg-cyan-50 border-cyan-200 text-cyan-800' : 'bg-purple-50 border-purple-200 text-purple-700'}`}>
          {req.estado === 'Aprobado con Ajustes - En Almacén' ? '⚠️' : '✅'}{' '}
          <strong>Paso 2 {req.estado === 'Aprobado con Ajustes - En Almacén' ? 'APROBADO CON AJUSTES' : 'completado'}</strong> — Aprobado por: <strong>{req.aprobadoPorJefe}</strong>
          {req.comentarioJefe && <span className="ml-1 text-gray-400">— {req.comentarioJefe}</span>}
          {req.fechaAprobacionJefe && <span className="ml-2 text-gray-400">el {req.fechaAprobacionJefe}</span>}
          {req.detalleAprobacionJefe && (
            <p className="mt-1 text-gray-500 italic">Detalle: {req.detalleAprobacionJefe}</p>
          )}
        </div>
      )}
      {req.valeId && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
          📦 <strong>Vale de salida generado</strong> — Despacho registrado en almacén
          {req.valeNumero && <span className="ml-1 font-mono font-bold"> ({req.valeNumero})</span>}
        </div>
      )}
      {req.ocVinculadaNumero && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 text-xs text-indigo-700">
          🛒 <strong>Orden de Compra generada:</strong> <span className="font-mono font-bold">{req.ocVinculadaNumero}</span> — en proceso de compra
        </div>
      )}
      {req.motivoRechazo && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
          ❌ <strong>Rechazado:</strong> {req.motivoRechazo}
        </div>
      )}
      {req.motivoElevacion && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-700">
          ⬆️ <strong>Elevado a Gerencia</strong> — Motivo: {req.motivoElevacion}
          {req.elevadoPor && <span className="ml-2 text-gray-400">por {req.elevadoPor}</span>}
          {req.fechaElevacion && <span className="ml-2 text-gray-400">el {req.fechaElevacion}</span>}
        </div>
      )}
      {req.aprobadoPorGerencia && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-700">
          ✅ <strong>Aprobado por Gerencia</strong> — {req.aprobadoPorGerencia}
          {req.comentarioGerencia && <span className="ml-1 text-gray-400">— {req.comentarioGerencia}</span>}
          {req.fechaAprobacionGerencia && <span className="ml-2 text-gray-400">el {req.fechaAprobacionGerencia}</span>}
        </div>
      )}
      {req.motivoRechazoGerencia && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
          ❌ <strong>Rechazado por Gerencia:</strong> {req.motivoRechazoGerencia}
          {req.rechazadoPorGerencia && <span className="ml-1 text-gray-400">— {req.rechazadoPorGerencia}</span>}
        </div>
      )}
      {req.motivoConsolidado !== undefined && req.estado === 'En Consolidado' && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 text-xs text-indigo-800">
          🕐 <strong>En Consolidado:</strong> {req.motivoConsolidado || 'Pendiente de compra futura'}
          {req.consolidadoPor && <span className="ml-2 text-indigo-500">— por {req.consolidadoPor}</span>}
        </div>
      )}
      {req.motivoPostergacion && (
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600">
          ⏸️ <strong>Pospuesto - Consolidado Gerencial:</strong> {req.motivoPostergacion}
          {req.pospuestoPorGerencia && <span className="ml-1 text-gray-400">— {req.pospuestoPorGerencia}</span>}
        </div>
      )}

      {/* ── Info general compacta ─────────────────────────── */}
      <div className="card p-3 grid grid-cols-3 md:grid-cols-6 gap-x-4 gap-y-2 text-xs">
        <div><p className="text-xs text-gray-500">Sede</p><p className="font-medium">{sedeMap[req.sedeId] || '—'}</p></div>
        <div><p className="text-xs text-gray-500">Área Solicitante</p><p className="font-medium">{req.areaSolicitante || '—'}</p></div>
        <div><p className="text-xs text-gray-500">Tipo</p><p className="font-medium">{req.tipo}</p></div>
        <div><p className="text-xs text-gray-500">Ítems</p><p className="font-medium">{req.items?.length || 0}</p></div>
        {req.fechaLimiteGlobal && (
          <div><p className="text-xs text-gray-500">Fecha Límite Entrega</p><p className="font-medium">{fmtDate(req.fechaLimiteGlobal)}</p></div>
        )}
        {req.horaLimiteGlobal && (
          <div><p className="text-xs text-gray-500">Hora Límite</p><p className="font-medium">{req.horaLimiteGlobal}</p></div>
        )}
        {req.aprobadoPor && <div><p className="text-xs text-gray-500">Procesado por</p><p className="font-medium">{req.aprobadoPor}</p></div>}
        {req.fechaAprobacion && <div><p className="text-xs text-gray-500">Fecha proceso</p><p className="font-medium">{fmtDate(req.fechaAprobacion)}</p></div>}
        {req.comentarioAprobacion && <div className="col-span-2"><p className="text-xs text-gray-500">Comentario</p><p className="font-medium">{req.comentarioAprobacion}</p></div>}
        {req.motivoRechazo && <div className="col-span-2"><p className="text-xs text-gray-500">Motivo rechazo</p><p className="font-medium text-red-600">{req.motivoRechazo}</p></div>}
        {req.valeId && <div className="col-span-2"><p className="text-xs text-gray-500">Vale generado</p><p className="font-medium text-green-700">✓ Vale de salida creado automáticamente</p></div>}
      </div>

      {/* Items table */}
      <div className="card overflow-hidden p-0">
        <div className="bg-[#1e3a5f] px-3 py-2">
          <p className="text-white text-xs font-semibold uppercase tracking-wide">Ítems del Requerimiento</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 700 }}>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="table-th w-10 text-center">N°</th>
                <th className="table-th">Descripción</th>
                <th className="table-th text-center">Cant. Sol.</th>
                {['Aprobado con Ajustes - En Almacén','Completado','Despachado Parcialmente'].includes(req.estado) && <th className="table-th text-center text-cyan-700">Cant. Aprobada CG</th>}
                {req.estado !== 'Borrador' && !['Aprobado - En Almacén','Aprobado con Ajustes - En Almacén','Pendiente de Aprobación'].includes(req.estado) && <th className="table-th text-center">Cant. Apro.</th>}
                <th className="table-th text-center">UM</th>
                {(req.items||[]).some(it=>it.talla) && <th className="table-th text-center">Talla</th>}
                <th className="table-th">Sede</th>
                <th className="table-th">Especificaciones</th>
                {req.estado !== 'Borrador' && !['Aprobado - En Almacén','Aprobado con Ajustes - En Almacén','Pendiente de Aprobación'].includes(req.estado) && <th className="table-th">Estado</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(req.items || []).map((it, idx) => (
                <tr key={it.id} className={
                  'hover:bg-gray-50/50 ' +
                  (it.estadoItem === 'Rechazado' ? 'bg-red-50/30' :
                   it.estadoItem === 'Aprobado' || it.estadoItem === 'Aprobado Parcial' ? 'bg-green-50/20' : '')
                }>
                  <td className="table-td text-center font-mono text-gray-400">{String(idx+1).padStart(2,'0')}</td>
                  <td className="table-td font-medium">{it.descripcion}</td>
                  <td className="table-td text-center">{it.cantidad}</td>
                  {['Aprobado con Ajustes - En Almacén','Completado','Despachado Parcialmente'].includes(req.estado) && (
                    <td className={`table-td text-center font-bold ${it.cantidadAprobadaJefe === 0 ? 'text-red-600' : it.cantidadAprobadaJefe < it.cantidad ? 'text-amber-600' : 'text-cyan-700'}`}>
                      {it.cantidadAprobadaJefe !== undefined ? it.cantidadAprobadaJefe : '—'}
                      {it.motivoAjusteJefe && <p className="text-xs text-gray-400 font-normal">{it.motivoAjusteJefe}</p>}
                    </td>
                  )}
                  {req.estado !== 'Borrador' && !['Aprobado - En Almacén','Aprobado con Ajustes - En Almacén','Pendiente de Aprobación'].includes(req.estado) && (
                    <td className="table-td text-center font-semibold">
                      {it.cantidadAprobada !== null && it.cantidadAprobada !== undefined ? it.cantidadAprobada : '—'}
                    </td>
                  )}
                  <td className="table-td text-center">{it.unidad || '—'}</td>
                  {(req.items||[]).some(i=>i.talla) && <td className="table-td text-center">{it.talla || '—'}</td>}
                  <td className="table-td">{sedeMap[it.sedeId] || '—'}</td>
                  <td className="table-td text-xs text-gray-500">{it.especificaciones || '—'}</td>
                  {req.estado !== 'Borrador' && !['Aprobado - En Almacén','Aprobado con Ajustes - En Almacén','Pendiente de Aprobación'].includes(req.estado) && (
                    <td className="table-td">
                      <span className={`badge text-xs ${
                        it.estadoItem === 'Aprobado' ? 'bg-green-100 text-green-700' :
                        it.estadoItem === 'Aprobado Parcial' ? 'bg-blue-100 text-blue-700' :
                        it.estadoItem === 'Rechazado' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{it.estadoItem}</span>
                      {it.motivoRechazo && <p className="text-xs text-red-500 mt-0.5">{it.motivoRechazo}</p>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="card p-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Requerido Por</p>
          <p className="text-sm font-medium">{req.requeridoPorNombre || '—'}</p>
          <p className="text-xs text-gray-400">{req.requeridoPorCargo || ''}</p>
        </div>
        <div className="card p-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Aprobado Por</p>
          <p className="text-sm font-medium">{req.aprobadoPorNombre || req.aprobadoPor || <span className="text-gray-300 italic text-xs">Pendiente</span>}</p>
          {req.aprobadoPorCargo && <p className="text-xs text-gray-400">{req.aprobadoPorCargo}</p>}
          {req.fechaAprobacion && <p className="text-xs text-gray-300 mt-0.5">{fmtDate(req.fechaAprobacion)}</p>}
        </div>
      </div>

      {/* Approval Panel */}
      {showAprobPanel && canDespachar && (
        <div className="card border-2 border-amber-200 bg-amber-50/20 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-700 text-sm flex items-center gap-1.5"><CheckCircleIcon className="w-4 h-4 text-amber-500" />Panel de Aprobación — Almacén</p>
            <div className="flex gap-2">
              <button onClick={aprobarTodo} className="text-xs bg-green-100 text-green-700 hover:bg-green-200 px-3 py-1.5 rounded-lg font-semibold">
                ✓ Aprobar todo
              </button>
              <button onClick={rechazarTodo} className="text-xs bg-red-100 text-red-700 hover:bg-red-200 px-3 py-1.5 rounded-lg font-semibold">
                ✗ Rechazar todo
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {req.items.map((it, idx) => {
              const a = itemsAprob.find(x => x.itemId === it.id)
              return (
                <div key={it.id} className="bg-white rounded-xl p-3 border border-gray-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">
                        <span className="font-mono text-gray-400 text-xs">{String(idx+1).padStart(2,'0')}. </span>
                        {it.descripcion}
                      </p>
                      {(() => {
                          const vinculadoId = a?.productoIdVinculado || it.productoId || null
                          const stk = vinculadoId ? stockTotal(vinculadoId) : null
                          const cantNec = it.cantidadAprobadaJefe !== undefined ? it.cantidadAprobadaJefe : it.cantidad
                          const cantOrig = it.cantidad
                          const tieneAjusteCG = it.cantidadAprobadaJefe !== undefined && it.cantidadAprobadaJefe !== cantOrig
                          const isPartial = stk !== null && stk > 0 && stk < cantNec
                          const sinStock = stk !== null && stk === 0
                          const conStock = stk !== null && stk >= cantNec
                          return (
                            <div className="mt-1 space-y-1.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-gray-500">
                                  {tieneAjusteCG ? 'Aprobado CG:' : 'Cant:'}{' '}
                                  <strong className={tieneAjusteCG ? 'text-cyan-700' : ''}>{cantNec}</strong> {it.unidad}
                                </span>
                                {conStock && <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">Stock disponible: {stk} — irá a Vale de Salida</span>}
                                {isPartial && <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">Stock parcial: {stk} de {cantNec} {it.unidad}</span>}
                                {sinStock && <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">Sin stock — generará OC</span>}
                                {stk === null && vinculadoId && (
                                  <span className="text-xs font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                                    Sin stock — generará OC
                                  </span>
                                )}
                                {stk === null && !vinculadoId && (
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-amber-600 font-medium">Vincular al catálogo:</span>
                                    <select
                                      className="text-xs border border-amber-300 rounded-lg px-2 py-0.5 bg-amber-50 focus:outline-none focus:border-amber-500"
                                      value={a?.productoIdVinculado || ''}
                                      onChange={e => setItemAprob(it.id, 'productoIdVinculado', e.target.value || null)}>
                                      <option value="">— Sin vincular (irá a OC) —</option>
                                      {productos.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre} ({p.codigo})</option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                              {isPartial && a?.estadoItem !== 'Rechazado' && (
                                <div className="flex items-center gap-1 mt-1 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                                  <span className="text-xs text-amber-800 font-medium mr-2">¿Qué hacer con este ítem?</span>
                                  <label className="flex items-center gap-1 cursor-pointer mr-3">
                                    <input type="radio" name={'stock_dec_' + it.id} value="stock"
                                      checked={a?.stockDecision !== 'oc'}
                                      onChange={() => setItemAprob(it.id, 'stockDecision', 'stock')}
                                      className="accent-green-600" />
                                    <span className="text-xs text-green-700 font-semibold">Atender con stock ({stk} {it.unidad}) + OC por resto ({cantNec - stk})</span>
                                  </label>
                                  <label className="flex items-center gap-1 cursor-pointer">
                                    <input type="radio" name={'stock_dec_' + it.id} value="oc"
                                      checked={a?.stockDecision === 'oc'}
                                      onChange={() => setItemAprob(it.id, 'stockDecision', 'oc')}
                                      className="accent-orange-600" />
                                    <span className="text-xs text-orange-700 font-semibold">Enviar todo a OC ({cantNec} {it.unidad})</span>
                                  </label>
                                </div>
                              )}
                            </div>
                          )
                        })()}
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      {['Aprobado','Aprobado Parcial','Rechazado'].map(opt => (
                        <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
                          <input type="radio" name={'aprob_' + it.id} value={opt}
                            checked={a?.estadoItem === opt}
                            onChange={() => setItemAprob(it.id, 'estadoItem', opt)}
                            className={opt === 'Aprobado' ? 'accent-green-600' : opt === 'Rechazado' ? 'accent-red-600' : 'accent-blue-600'} />
                          <span className={`text-xs font-semibold ${
                            opt === 'Aprobado' ? 'text-green-700' :
                            opt === 'Rechazado' ? 'text-red-700' : 'text-blue-700'
                          }`}>{opt === 'Aprobado Parcial' ? 'Parcial' : opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {a?.estadoItem === 'Aprobado Parcial' && (
                    <div className="mt-2 flex items-center gap-2">
                      <label className="text-xs text-gray-500">Cantidad aprobada:</label>
                      <input type="number" className="input text-xs py-1 w-24" value={a?.cantidadAprobada || ''} min={1} max={it.cantidad}
                        onChange={e => setItemAprob(it.id, 'cantidadAprobada', Number(e.target.value))} />
                      <span className="text-xs text-gray-400">de {it.cantidad} {it.unidad}</span>
                    </div>
                  )}
                  {a?.estadoItem === 'Rechazado' && (
                    <div className="mt-2">
                      <input className="input text-xs py-1 w-full" placeholder="Motivo de rechazo..."
                        value={a?.motivoRechazo || ''}
                        onChange={e => setItemAprob(it.id, 'motivoRechazo', e.target.value)} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-2 gap-3 border border-gray-200 rounded-xl p-3 bg-white">
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Aprobado por — Apellidos y Nombres</label>
              <input className="input text-sm" value={aprobNombre} onChange={e => setAprobNombre(e.target.value)} placeholder="Nombre del aprobador" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 block mb-1">Cargo</label>
              <input className="input text-sm" value={aprobCargo} onChange={e => setAprobCargo(e.target.value)} placeholder="Cargo del aprobador" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Comentario general</label>
            <textarea className="input text-sm" rows={2} value={aprobComment} onChange={e => setAprobComment(e.target.value)}
              placeholder="Observaciones sobre la aprobación..." />
          </div>

          {/* Proveedor para OC automática */}
          {itemsAprob.some(a => a.stockDecision === 'oc' && a.estadoItem === 'Aprobado') && (
            <div className="border border-blue-200 rounded-xl p-3 bg-blue-50">
              <label className="text-xs font-semibold text-blue-700 block mb-1">
                Proveedor para la OC automática <span className="font-normal text-blue-500">(ítems sin stock)</span>
              </label>
              <select
                className="input text-sm"
                value={proveedorOCId}
                onChange={e => setProveedorOCId(e.target.value)}
              >
                <option value="">— Sin proveedor definido (asignar luego) —</option>
                {(appState.proveedores || []).map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} {p.ruc ? `(${p.ruc})` : ''}</option>
                ))}
              </select>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2 border-t border-amber-100">
            <button onClick={() => setShowAprobPanel(false)} className="btn-secondary text-sm">Cancelar</button>
            <button onClick={handleAprobar} className="btn-primary text-sm flex items-center gap-2">
              <CheckCircleIcon className="w-4 h-4" />Confirmar Decision
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// MAIN
export default function Requerimientos() {
  const { state, dispatch } = useApp()
  const { user, isAdmin, isGerencia, isCoordGen, isCoordLogistica, isJefeRRHH } = useAuth()
  const toast = useToast()

  const [view, setView] = useState('list')
  const [editing, setEditing] = useState(null)
  const [detailId, setDetailId] = useState(null)
  const [confirmBox, setConfirmBox] = useState(null)

  const reqs = state.requerimientos || []
  const detailReq = detailId ? reqs.find(r => r.id === detailId) : null

  const handleNew  = () => { setEditing(null); setView('form') }
  const handleEdit = r => { setEditing(r); setView('form') }
  const handleView = r => { setDetailId(r.id); setView('detail') }
  const handleBack = () => { setView('list'); setEditing(null); setDetailId(null) }

  const handleSave = (formData) => {
    if (editing) {
      dispatch({ type: 'UPDATE_REQUERIMIENTO', id: editing.id, payload: formData })
      toast(editing.numero + ' actualizado')
    } else {
      dispatch({ type: 'ADD_REQUERIMIENTO', payload: formData })
      const msg = formData.estado === 'Pendiente de Aprobación'
        ? 'Requerimiento enviado — pendiente de aprobación del Coordinador General'
        : 'Borrador guardado'
      toast(msg)
    }
    setView('list')
    setEditing(null)
  }

  const handleAnular = (r) => {
    setConfirmBox({
      message: 'Anular el requerimiento ' + r.numero + '?',
      confirmLabel: 'Anular',
      onConfirm: () => {
        dispatch({ type: 'UPDATE_REQUERIMIENTO', id: r.id, payload: { estado: 'Anulado' } })
        toast(r.numero + ' anulado')
        setConfirmBox(null)
        handleBack()
      }
    })
  }

  const handleAprobarPaso1 = ({ id, aprobado, aprobadoPor, comentario }) => {
    dispatch({ type: 'APROBAR_PASO1_JEFE_DIRECTO', id, aprobado, aprobadoPor, comentario })
    if (aprobado) toast('REQ aprobado — continúa al siguiente paso', 'success')
    else {
      dispatch({ type: 'UPDATE_REQUERIMIENTO', id, payload: { estado: 'Rechazado', motivoRechazo: comentario || 'Rechazado por jefe directo' } })
      toast('REQ rechazado por jefe directo', 'error')
    }
    setView('list')
    setDetailId(null)
  }

  const handleAprobarJefe = ({ id, aprobado, aprobadoPor, comentario, itemsAprob }) => {
    dispatch({ type: 'APROBAR_REQ_JEFE', id, aprobado, aprobadoPor, comentario, itemsAprob })
    if (aprobado) {
      const tieneAjustes = (itemsAprob || []).some(a => {
        const req = (state.requerimientos || []).find(r => r.id === id)
        const orig = req?.items?.find(it => it.id === a.itemId)
        return orig && Number(a.cantidadAprobada) < Number(orig.cantidad)
      })
      toast(tieneAjustes ? 'REQ aprobado con ajustes — Almacén recibirá cantidades modificadas' : 'REQ aprobado — enviado a Almacén (Paso 3)', 'success')
    } else toast('REQ rechazado y notificado al solicitante', 'error')
    setView('list')
    setDetailId(null)
  }


  const handleAprobar = ({ id, payload }) => {
    dispatch({ type: 'APROBAR_REQUERIMIENTO', id, payload })
    const allRej = payload.itemsAprobacion.every(a => a.estadoItem === 'Rechazado')
    if (allRej) toast('Requerimiento rechazado')
    else toast('Requerimiento atendido — Vale de salida y/o OC generados', 'success')
    setView('list')
    setDetailId(null)
  }

  const handleConsolidar = ({ id, consolidadoPor, motivoConsolidado }) => {
    dispatch({ type: 'CONSOLIDAR_REQ', id, consolidadoPor, motivoConsolidado })
    toast('REQ puesto en Consolidado — se atenderá en compra futura', 'info')
    setView('list'); setDetailId(null)
  }

  const handleElevarGerencia = ({ id, elevadoPor, motivoElevacion }) => {
    dispatch({ type: 'ELEVAR_GERENCIA', id, elevadoPor, motivoElevacion })
    toast('REQ elevado a Aprobación Gerencial', 'info')
    setView('list')
    setDetailId(null)
  }

  const handleAprobarGerencia = ({ id, aprobadoPor, comentario }) => {
    dispatch({ type: 'APROBAR_GERENCIA', id, aprobadoPor, comentario })
    toast('REQ aprobado por Gerencia — listo para despacho', 'success')
    setView('list')
    setDetailId(null)
  }

  const handleRechazarGerencia = ({ id, rechazadoPor, motivoRechazo }) => {
    dispatch({ type: 'RECHAZAR_GERENCIA', id, rechazadoPor, motivoRechazo })
    toast('REQ rechazado por Gerencia', 'error')
    setView('list')
    setDetailId(null)
  }

  const handlePosponerGerencia = ({ id, pospuestoPor, motivoPostergacion }) => {
    dispatch({ type: 'POSPONER_GERENCIA', id, pospuestoPor, motivoPostergacion })
    toast('REQ pospuesto al Consolidado Gerencial')
    setView('list')
    setDetailId(null)
  }



  return (
    <>
      {view === 'list' && (
        <ReqList
          reqs={reqs}
          sedes={state.sedes || []}
          inventario={state.inventario || {}}
          onNew={handleNew}
          onView={handleView}
          onEdit={handleEdit}
          onConsolidar={handleConsolidar}
          isAdmin={isAdmin}
          isCoordGen={isCoordGen}
          isCoordLogistica={isCoordLogistica}
          isJefeRRHH={isJefeRRHH}
        />
      )}
      {view === 'form' && (
        <ReqForm
          initial={editing}
          sedes={state.sedes || []}
          productos={state.productos || []}
          inventario={state.inventario || {}}
          user={user}
          onSave={handleSave}
          onBack={handleBack}
        />
      )}
      {view === 'detail' && detailReq && (
        <ReqDetail
          req={detailReq}
          onBack={handleBack}
          onEdit={handleEdit}
          onAprobarPaso1={handleAprobarPaso1}
          onAprobarJefe={handleAprobarJefe}
          onAprobar={handleAprobar}
          onConsolidar={handleConsolidar}
          onElevarGerencia={handleElevarGerencia}
          onAprobarGerencia={handleAprobarGerencia}
          onRechazarGerencia={handleRechazarGerencia}
          onPosponerGerencia={handlePosponerGerencia}
          onAnular={() => handleAnular(detailReq)}
          sedes={state.sedes || []}
          inventario={state.inventario || {}}
          user={user}
          usuarios={state.usuarios || []}
          logo={state.logo || state.config?.logoBase64 || null}
          isAdmin={isAdmin}
          isGerencia={isGerencia}
          isCoordGen={isCoordGen}
          isCoordLogistica={isCoordLogistica}
          isJefeRRHH={isJefeRRHH}
        />
      )}
      {confirmBox && (
        <Confirm
          message={confirmBox.message}
          confirmLabel={confirmBox.confirmLabel}
          onConfirm={confirmBox.onConfirm}
          onCancel={() => setConfirmBox(null)}
        />
      )}
    </>
  )
}
