import { useState, useMemo } from 'react'
import ExcelJS from 'exceljs'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/layout/Toast'
import Modal from '../components/common/Modal'
import PageHeader from '../components/common/PageHeader'
import Confirm from '../components/common/Confirm'
import { fmtDate, genId, todayISO } from '../utils/helpers'
import {
  PlusIcon, ArrowUpIcon, EyeIcon,
  TrashIcon, UserIcon, ArrowPathIcon,
  CheckCircleIcon, ClockIcon, ExclamationTriangleIcon, ChevronDownIcon, ChevronUpIcon
} from '@heroicons/react/24/outline'

const TAB_DASHBOARD    = 'Dashboard'
const TAB_STOCK        = 'Stock'
const TAB_ENTREGAS     = 'Entregas'
const TAB_DEVOLUCIONES = 'Devoluciones'
const TAB_DESDE_REQ    = 'Desde REQ'

// ── Helpers de kit ────────────────────────────────────────
function useKitHelpers() {
  const { state } = useApp()
  const kitProds  = useMemo(() => (state.productos||[]).filter(p => p.esKit), [state.productos])
  const uStock    = state.uniformeStock || {}
  const pranedas  = useMemo(() => [...new Set(kitProds.map(p => p.praneda))], [kitProds])

  const getTallas  = (praneda) => kitProds.filter(p => p.praneda === praneda).map(p => p.talla)
  const getProdId  = (praneda, talla) => kitProds.find(p => p.praneda === praneda && p.talla === talla)?.id
  const getStockOf = (productoId) => uStock[productoId] || { nuevo:0, usado:0, desechado:0 }
  const getPraneda = (productoId) => kitProds.find(p => p.id === productoId)?.praneda || ''
  const getTalla   = (productoId) => kitProds.find(p => p.id === productoId)?.talla || ''
  const getNombre  = (productoId) => kitProds.find(p => p.id === productoId)?.nombre || productoId

  return { kitProds, uStock, pranedas, getTallas, getProdId, getStockOf, getPraneda, getTalla, getNombre }
}

// ── Fila de ítem en formulario de entrega ─────────────────
function EntregaItemRow({ item, idx, onSet, onRemove, showRemove, pranedas, getTallas, getProdId, getStockOf }) {
  const tallas    = item.praneda ? getTallas(item.praneda) : []
  const productoId = item.praneda && item.talla ? getProdId(item.praneda, item.talla) : null
  const st        = productoId ? getStockOf(productoId) : { nuevo:0, usado:0 }

  const handlePraneda = (val) => { onSet(idx,'praneda',val); onSet(idx,'talla',''); onSet(idx,'productoId','') }
  const handleTalla   = (val) => {
    onSet(idx,'talla',val)
    const pid = getProdId(item.praneda, val)
    onSet(idx,'productoId', pid||'')
  }
  const handleCond    = (val) => onSet(idx,'condicion',val)

  return (
    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
      <div className="grid grid-cols-12 gap-2 items-center">
        <div className="col-span-4">
          <select className="input text-xs" value={item.praneda||''} onChange={e => handlePraneda(e.target.value)}>
            <option value="">Prenda...</option>
            {pranedas.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="col-span-3">
          <select className="input text-xs" value={item.talla||''} onChange={e => handleTalla(e.target.value)} disabled={!item.praneda}>
            <option value="">Talla...</option>
            {tallas.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="col-span-3">
          <input type="number" min="1" className="input text-xs text-center" value={item.cantidad}
            onChange={e => onSet(idx,'cantidad',e.target.value)} placeholder="Cant." />
        </div>
        <div className="col-span-2 flex justify-end">
          {showRemove && <button type="button" onClick={() => onRemove(idx)} className="text-red-400 hover:text-red-600 text-sm">✕</button>}
        </div>
      </div>
      {item.talla && (
        <div className="flex gap-2 pl-1">
          <button type="button" onClick={() => handleCond('Nuevo')}
            className={`text-xs px-3 py-1 rounded-full border transition-all ${item.condicion==='Nuevo' ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' : 'border-gray-300 text-gray-600 hover:border-[#1e3a5f]'}`}>
            Nuevo <span className="ml-1 opacity-70">({st.nuevo})</span>
          </button>
          <button type="button" onClick={() => handleCond('Usado')}
            className={`text-xs px-3 py-1 rounded-full border transition-all ${item.condicion==='Usado' ? 'bg-amber-600 text-white border-amber-600' : 'border-gray-300 text-gray-600 hover:border-amber-400'}`}>
            Usado <span className="ml-1 opacity-70">({st.usado})</span>
          </button>
        </div>
      )}
    </div>
  )
}

// ── Formulario de Entrega ─────────────────────────────────
function EntregaForm({ onClose }) {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const { pranedas, getTallas, getProdId, getStockOf, getNombre } = useKitHelpers()

  const [trabajadorNombre, setNombre] = useState('')
  const [trabajadorDNI, setDNI]       = useState('')
  const [cargo, setCargo]             = useState('')
  const [sedeNombre, setSede]         = useState('')
  const [fecha, setFecha]             = useState(todayISO())
  const [observaciones, setObs]       = useState('')
  const [items, setItems] = useState([{ id:genId(), praneda:'', talla:'', productoId:'', condicion:'Nuevo', cantidad:1 }])

  const addItem    = () => setItems(p => [...p, { id:genId(), praneda:'', talla:'', productoId:'', condicion:'Nuevo', cantidad:1 }])
  const removeItem = (idx) => setItems(p => p.filter((_,i) => i !== idx))
  const setItem    = (idx, k, v) => setItems(p => p.map((it,i) => i===idx ? {...it,[k]:v} : it))

  const sedes = state.sedes || []

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!trabajadorNombre.trim()) return toast('Ingresa el nombre del trabajador','error')
    const validos = items.filter(it => it.productoId && it.condicion && Number(it.cantidad) > 0)
    if (!validos.length) return toast('Agrega al menos una prenda con talla y condición','error')
    for (const it of validos) {
      const st = getStockOf(it.productoId)
      const disp = it.condicion==='Nuevo' ? st.nuevo : st.usado
      if (Number(it.cantidad) > disp) {
        return toast(`Sin stock ${it.condicion.toLowerCase()} suficiente para ${getNombre(it.productoId)} (disp: ${disp})`, 'error')
      }
    }
    dispatch({
      type: 'ADD_UNIFORME_ENTREGA',
      payload: {
        fecha, trabajadorNombre, trabajadorDNI, cargo, sedeNombre, observaciones,
        items: validos.map(it => ({ productoId:it.productoId, nombre:getNombre(it.productoId), condicion:it.condicion, cantidad:Number(it.cantidad) })),
        estado: 'Activo'
      }
    })
    toast('Entrega registrada ✓')
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Trabajador *</label>
          <input className="input" value={trabajadorNombre} onChange={e=>setNombre(e.target.value)} placeholder="Nombre completo" />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">DNI</label>
          <input className="input" value={trabajadorDNI} onChange={e=>setDNI(e.target.value)} placeholder="00000000" maxLength={8} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Cargo</label>
          <select className="input" value={cargo} onChange={e=>setCargo(e.target.value)}>
            <option value="">— seleccionar —</option>
            <option>Operario de Limpieza</option>
            <option>Supervisor</option>
            <option>Administrativo</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Sede</label>
          <select className="input" value={sedeNombre} onChange={e=>setSede(e.target.value)}>
            <option value="">— seleccionar —</option>
            {sedes.map(s => <option key={s.id}>{s.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Fecha *</label>
          <input type="date" className="input" value={fecha} onChange={e=>setFecha(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 block mb-2">Prendas a entregar *</label>
        <div className="space-y-2">
          {items.map((it,idx) => (
            <EntregaItemRow key={it.id} item={it} idx={idx}
              onSet={setItem} onRemove={removeItem} showRemove={items.length>1}
              pranedas={pranedas} getTallas={getTallas} getProdId={getProdId} getStockOf={getStockOf} />
          ))}
        </div>
        <button type="button" onClick={addItem} className="mt-2 text-xs text-[#1e3a5f] hover:underline font-medium">+ Agregar prenda</button>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Observaciones</label>
        <textarea className="input resize-none h-14" value={observaciones} onChange={e=>setObs(e.target.value)} placeholder="Observaciones..." />
      </div>
      <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
        <button type="submit" className="btn-primary flex items-center gap-2">
          <ArrowUpIcon className="w-4 h-4"/>Registrar Entrega
        </button>
      </div>
    </form>
  )
}

// ── Fila de ítem en formulario de devolución ──────────────
function DevItemRow({ item, idx, onSet, onRemove, showRemove, pranedas, getTallas, getProdId }) {
  const tallas = item.praneda ? getTallas(item.praneda) : []
  const handlePraneda = (val) => { onSet(idx,'praneda',val); onSet(idx,'talla',''); onSet(idx,'productoId','') }
  const handleTalla   = (val) => { onSet(idx,'talla',val); onSet(idx,'productoId', getProdId(item.praneda,val)||'') }

  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <div className="grid grid-cols-12 gap-2 items-center">
        <div className="col-span-3">
          <select className="input text-xs" value={item.praneda||''} onChange={e=>handlePraneda(e.target.value)}>
            <option value="">Prenda...</option>
            {pranedas.map(p=><option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <select className="input text-xs" value={item.talla||''} onChange={e=>handleTalla(e.target.value)} disabled={!item.praneda}>
            <option value="">Talla...</option>
            {tallas.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="col-span-3">
          <select className="input text-xs" value={item.estadoDevuelta||''} onChange={e=>onSet(idx,'estadoDevuelta',e.target.value)}>
            <option value="">Estado...</option>
            <option value="Apto">✅ Apto (reutilizable)</option>
            <option value="Desechar">❌ Desechar (dañado)</option>
          </select>
        </div>
        <div className="col-span-2">
          <input type="number" min="1" className="input text-xs text-center" value={item.cantidad}
            onChange={e=>onSet(idx,'cantidad',e.target.value)} placeholder="Cant." />
        </div>
        <div className="col-span-2 flex justify-end">
          {showRemove && <button type="button" onClick={()=>onRemove(idx)} className="text-red-400 hover:text-red-600 text-sm">✕</button>}
        </div>
      </div>
    </div>
  )
}

// ── Formulario de Devolución ──────────────────────────────
function DevolucionForm({ onClose, entregaId = null, trabajadorNombreInit = '', trabajadorDNIInit = '' }) {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const { pranedas, getTallas, getProdId, getNombre, getPraneda, getTalla } = useKitHelpers()

  // Si viene de entrega, pre-cargar los ítems de esa entrega
  const entregaSource = useMemo(() => {
    if (!entregaId) return null
    return (state.uniformeEntregas || []).find(e => e.id === entregaId) || null
  }, [entregaId, state.uniformeEntregas])

  const initialItems = useMemo(() => {
    if (!entregaSource) return [{ id:genId(), productoId:'', nombre:'', estadoDevuelta:'', cantidad:1, libre:true }]
    return (entregaSource.items || []).map(it => ({
      id: genId(),
      productoId: it.productoId,
      nombre: it.nombre || getNombre(it.productoId),
      cantidadOriginal: Number(it.cantidad),
      cantidad: Number(it.cantidad),
      estadoDevuelta: '',
      libre: false,
    }))
  }, [entregaSource])

  const [trabajadorNombre, setNombre] = useState(trabajadorNombreInit)
  const [trabajadorDNI, setDNI]       = useState(trabajadorDNIInit)
  const [fecha, setFecha]             = useState(todayISO())
  const [observaciones, setObs]       = useState('')
  const [items, setItems]             = useState(initialItems)

  const setEstado = (idx, val) => setItems(p => p.map((it,i)=>i===idx?{...it,estadoDevuelta:val}:it))

  // Para devolución libre (sin entrega vinculada)
  const addItem    = () => setItems(p => [...p, { id:genId(), productoId:'', nombre:'', estadoDevuelta:'', cantidad:1, libre:true }])
  const removeItem = (idx) => setItems(p => p.filter((_,i)=>i!==idx))
  const setItem    = (idx, k, v) => setItems(p => {
    const copy = p.map((it,i) => {
      if (i!==idx) return it
      const upd = {...it,[k]:v}
      if (k==='praneda') { upd.talla=''; upd.productoId='' }
      if (k==='talla') { upd.productoId = getProdId(upd.praneda, v) || ''; upd.nombre = getNombre(getProdId(upd.praneda,v)||'') }
      return upd
    })
    return copy
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!trabajadorNombre.trim()) return toast('Ingresa el nombre del trabajador','error')
    const validos = items.filter(it => it.productoId && it.estadoDevuelta && Number(it.cantidad)>0)
    if (!validos.length) return toast('Selecciona el estado (Apto/Desechar) de al menos una prenda','error')
    dispatch({
      type: 'ADD_UNIFORME_DEVOLUCION',
      payload: {
        fecha, trabajadorNombre, trabajadorDNI, observaciones, entregaId,
        items: validos.map(it => ({ productoId:it.productoId, nombre:it.nombre||getNombre(it.productoId), estadoDevuelta:it.estadoDevuelta, cantidad:Number(it.cantidad) }))
      }
    })
    toast('Devolución registrada ✓')
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Trabajador *</label>
          <input className="input" value={trabajadorNombre} onChange={e=>setNombre(e.target.value)} placeholder="Nombre completo" disabled={!!entregaId} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">DNI</label>
          <input className="input" value={trabajadorDNI} onChange={e=>setDNI(e.target.value)} placeholder="00000000" disabled={!!entregaId} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Fecha *</label>
          <input type="date" className="input" value={fecha} onChange={e=>setFecha(e.target.value)} />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Prendas a devolver *</label>
        <p className="text-[10px] text-gray-400 mb-3">
          <strong>Apto</strong> → vuelve al stock como <span className="text-amber-600 font-medium">Usado</span> &nbsp;·&nbsp;
          <strong>Desechar</strong> → se registra como <span className="text-red-600 font-medium">Desechado</span>
        </p>

        {/* ── Ítems pre-cargados desde entrega ── */}
        {items.map((it, idx) => (
          it.libre ? (
            // Fila libre: usuario elige prenda
            <div key={it.id} className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-2 items-center mb-2">
              <select className="input text-sm" value={it.praneda||''} onChange={e=>setItem(idx,'praneda',e.target.value)}>
                <option value="">Prenda...</option>
                {pranedas.map(p=><option key={p}>{p}</option>)}
              </select>
              <select className="input text-sm" value={it.talla||''} onChange={e=>setItem(idx,'talla',e.target.value)} disabled={!it.praneda}>
                <option value="">Talla...</option>
                {(it.praneda?getTallas(it.praneda):[]).map(t=><option key={t}>{t}</option>)}
              </select>
              <input type="number" min="1" className="input text-sm w-16 text-center" value={it.cantidad}
                onChange={e=>setItem(idx,'cantidad',e.target.value)} />
              <div className="flex gap-1">
                <button type="button" onClick={()=>setEstado(idx,'Apto')}
                  className={`px-2 py-1 rounded text-xs font-medium border transition-all ${it.estadoDevuelta==='Apto'?'bg-emerald-100 border-emerald-500 text-emerald-700':'bg-gray-50 border-gray-200 text-gray-500 hover:border-emerald-300'}`}>
                  Apto
                </button>
                <button type="button" onClick={()=>setEstado(idx,'Desechar')}
                  className={`px-2 py-1 rounded text-xs font-medium border transition-all ${it.estadoDevuelta==='Desechar'?'bg-red-100 border-red-500 text-red-700':'bg-gray-50 border-gray-200 text-gray-500 hover:border-red-300'}`}>
                  Desechar
                </button>
              </div>
              {items.filter(i=>i.libre).length>1 &&
                <button type="button" onClick={()=>removeItem(idx)} className="text-gray-300 hover:text-red-400 text-lg leading-none">×</button>}
            </div>
          ) : (
            // Fila pre-cargada: cantidad editable + estado
            <div key={it.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border mb-2 ${
              it.estadoDevuelta==='Apto' ? 'bg-emerald-50 border-emerald-200' :
              it.estadoDevuelta==='Desechar' ? 'bg-red-50 border-red-200' :
              'bg-gray-50 border-gray-200'}`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{it.nombre}</p>
                <p className="text-xs text-gray-400">Entregado: {it.cantidadOriginal}</p>
              </div>
              <div className="flex items-center gap-1">
                <label className="text-xs text-gray-500">Devuelve:</label>
                <input type="number" min="0" max={it.cantidadOriginal}
                  value={it.cantidad}
                  onChange={e => setItem(idx,'cantidad', Math.min(Number(e.target.value), it.cantidadOriginal))}
                  className="w-14 text-center input text-sm py-1" />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={()=>setEstado(idx,'Apto')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${it.estadoDevuelta==='Apto'?'bg-emerald-500 border-emerald-500 text-white shadow-sm':'bg-white border-gray-300 text-gray-600 hover:border-emerald-400 hover:text-emerald-600'}`}>
                  ✓ Apto
                </button>
                <button type="button" onClick={()=>setEstado(idx,'Desechar')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${it.estadoDevuelta==='Desechar'?'bg-red-500 border-red-500 text-white shadow-sm':'bg-white border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-600'}`}>
                  ✕ Desechar
                </button>
              </div>
            </div>
          )
        ))}

        {!entregaId &&
          <button type="button" onClick={addItem} className="mt-1 text-xs text-[#1e3a5f] hover:underline font-medium">+ Agregar prenda</button>}
      </div>

      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Observaciones</label>
        <textarea className="input resize-none h-14" value={observaciones} onChange={e=>setObs(e.target.value)} placeholder="Estado general, motivo de devolución..." />
      </div>
      <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
        <button type="submit" className="btn-primary flex items-center gap-2">
          <ArrowPathIcon className="w-4 h-4"/>Registrar Devolución
        </button>
      </div>
    </form>
  )
}

// ── Módulo principal ──────────────────────────────────────

// ── Tab Desde REQ ──────────────────────────────────────────
function TabDesdeREQ({ kits, dispatch, toast, user, isCoordLogistica, isAdmin }) {
  const [kitAbierto, setKitAbierto] = useState(null)
  const [despachoForm, setDespachoForm] = useState({})

  const kitDetalle = kits.find(k => k.id === kitAbierto)

  const estadoColor = {
    'Pendiente':             'bg-amber-100 text-amber-700',
    'Pendiente a Completar': 'bg-orange-100 text-orange-700',
    'Atendido':              'bg-emerald-100 text-emerald-700',
  }
  const estadoIcon = {
    'Pendiente':             ClockIcon,
    'Pendiente a Completar': ExclamationTriangleIcon,
    'Atendido':              CheckCircleIcon,
  }

  function initForm(kit) {
    const form = {}
    ;(kit.items || []).forEach((_, idx) => {
      form[idx] = { cantNuevo: 0, cantUsado: 0 }
    })
    setDespachoForm(form)
    setKitAbierto(kit.id)
  }

  function handleDespachar() {
    if (!kitDetalle) return
    const despacho = Object.entries(despachoForm).map(([idx, v]) => ({
      idx: Number(idx),
      cantNuevo: Number(v.cantNuevo) || 0,
      cantUsado: Number(v.cantUsado) || 0,
    }))
    const totalEnviado = despacho.reduce((s, d) => s + d.cantNuevo + d.cantUsado, 0)
    if (totalEnviado === 0) { toast('Ingresa al menos una cantidad a enviar', 'error'); return }

    dispatch({
      type: 'DESPACHAR_KIT_INGRESO',
      kitId:      kitDetalle.id,
      despacho,
      fecha:      new Date().toISOString().slice(0, 10),
      despachoPor: user?.nombre || '',
    })
    toast('Despacho registrado correctamente', 'success')
    setKitAbierto(null)
    setDespachoForm({})
  }

  if (kitDetalle) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <button onClick={() => setKitAbierto(null)} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1">
            <ChevronUpIcon className="w-3.5 h-3.5 rotate-270" />← Volver
          </button>
          <h2 className="text-sm font-bold text-[#1e3a5f]">{kitDetalle.reqNumero} — {kitDetalle.personal || 'Sin nombre'}</h2>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoColor[kitDetalle.estado] || 'bg-gray-100 text-gray-600'}`}>
            {kitDetalle.estado}
          </span>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3 text-xs text-gray-600">
            <div><span className="text-gray-400">Personal: </span><strong>{kitDetalle.personal || '—'}</strong></div>
            <div><span className="text-gray-400">Sede: </span><strong>{kitDetalle.sede || '—'}</strong></div>
            <div><span className="text-gray-400">Área: </span><strong>{kitDetalle.area || '—'}</strong></div>
            <div><span className="text-gray-400">Derivado por: </span><strong>{kitDetalle.derivadoPor || '—'}</strong></div>
            <div><span className="text-gray-400">Fecha: </span><strong>{kitDetalle.fechaDerivado || '—'}</strong></div>
            <div><span className="text-gray-400">REQ: </span><strong>{kitDetalle.reqNumero}</strong></div>
          </div>
        </div>

        {/* Tabla de ítems */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Ítems a despachar</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-500 font-medium">Prenda / Artículo</th>
                  <th className="px-3 py-2 text-center text-gray-500 font-medium">Solicitado</th>
                  <th className="px-3 py-2 text-center text-gray-500 font-medium">Enviado ant.</th>
                  <th className="px-3 py-2 text-center text-teal-600 font-medium">Nuevo ↓</th>
                  <th className="px-3 py-2 text-center text-amber-600 font-medium">Usado ↓</th>
                  <th className="px-3 py-2 text-center text-gray-500 font-medium">Sin stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(kitDetalle.items || []).map((it, idx) => {
                  const enviado = (it.cantNuevo || 0) + (it.cantUsado || 0)
                  const faltante = Math.max(0, it.cantidad - enviado)
                  const fv = despachoForm[idx] || { cantNuevo: 0, cantUsado: 0 }
                  const sinStock = Math.max(0, faltante - (Number(fv.cantNuevo)||0) - (Number(fv.cantUsado)||0))
                  const completo = enviado >= it.cantidad
                  return (
                    <tr key={idx} className={`${completo ? 'bg-emerald-50/50' : ''} ${it.esEstandar ? 'bg-blue-50/30' : ''}`}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-medium text-gray-800">{it.descripcion}</p>
                          {it.esEstandar && <span className="text-[9px] bg-blue-100 text-blue-600 font-semibold px-1.5 py-0.5 rounded-full uppercase tracking-wide">Estándar</span>}
                        </div>
                        {it.talla && <p className="text-gray-400 text-[10px]">Talla: {it.talla}</p>}
                        {completo && <span className="text-[10px] text-emerald-600 font-medium">✓ Completo</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center font-medium text-gray-700">{it.cantidad}</td>
                      <td className="px-3 py-2.5 text-center text-gray-500">
                        {enviado > 0 ? <span className="text-blue-600 font-medium">{enviado}</span> : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {!completo ? (
                          <input type="number" min="0" max={faltante}
                            className="w-14 border border-teal-300 rounded-lg text-center py-1 text-xs focus:ring-1 focus:ring-teal-400"
                            value={fv.cantNuevo || ''}
                            onChange={e => setDespachoForm(f => ({ ...f, [idx]: { ...f[idx], cantNuevo: e.target.value } }))}
                            placeholder="0"
                          />
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {!completo ? (
                          <input type="number" min="0" max={faltante}
                            className="w-14 border border-amber-300 rounded-lg text-center py-1 text-xs focus:ring-1 focus:ring-amber-400"
                            value={fv.cantUsado || ''}
                            onChange={e => setDespachoForm(f => ({ ...f, [idx]: { ...f[idx], cantUsado: e.target.value } }))}
                            placeholder="0"
                          />
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {!completo
                          ? <span className={sinStock > 0 ? 'text-red-500 font-medium' : 'text-gray-400'}>{sinStock > 0 ? sinStock : '—'}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Historial de despachos */}
        {(kitDetalle.despachos || []).length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Historial de despachos</h3>
            <div className="space-y-1">
              {kitDetalle.despachos.map((d, i) => (
                <div key={d.id || i} className="flex items-center gap-2 text-xs text-gray-600 py-1 border-b border-gray-50 last:border-0">
                  <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="font-medium">{d.fecha}</span>
                  <span className="text-gray-400">por</span>
                  <span>{d.despachoPor || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {kitDetalle.estado !== 'Atendido' && (
          <div className="flex justify-end">
            <button onClick={handleDespachar}
              className="bg-[#1e3a5f] hover:bg-[#16304f] text-white px-5 py-2 rounded-xl text-sm font-medium flex items-center gap-2">
              <CheckCircleIcon className="w-4 h-4" />Registrar Despacho
            </button>
          </div>
        )}
      </div>
    )
  }

  // Lista de kits
  const pendientes   = kits.filter(k => k.estado === 'Pendiente')
  const parciales    = kits.filter(k => k.estado === 'Pendiente a Completar')
  const atendidos    = kits.filter(k => k.estado === 'Atendido')

  function KitCard({ k }) {
    const EIcon = estadoIcon[k.estado] || ClockIcon
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-3 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            k.estado === 'Atendido' ? 'bg-emerald-100' : k.estado === 'Pendiente a Completar' ? 'bg-orange-100' : 'bg-amber-100'
          }`}>
            <EIcon className={`w-4.5 h-4.5 ${
              k.estado === 'Atendido' ? 'text-emerald-600' : k.estado === 'Pendiente a Completar' ? 'text-orange-600' : 'text-amber-600'
            }`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{k.personal || 'Sin nombre'}</p>
            <p className="text-xs text-gray-400">{k.reqNumero} · {k.sede || '—'} · {k.area || '—'}</p>
            <p className="text-[10px] text-gray-400">Derivado: {k.fechaDerivado || '—'} por {k.derivadoPor || '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${estadoColor[k.estado] || 'bg-gray-100 text-gray-600'}`}>
            {k.estado}
          </span>
          <button onClick={() => initForm(k)}
            className="bg-[#1e3a5f] hover:bg-[#16304f] text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5">
            <EyeIcon className="w-3.5 h-3.5" />{k.estado === 'Atendido' ? 'Ver' : 'Atender'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {kits.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-10 text-center">
          <ClockIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No hay kits derivados desde Requerimientos.</p>
          <p className="text-xs text-gray-400 mt-1">Cuando el Coordinador de Logística derive un REQ, aparecerá aquí.</p>
        </div>
      )}
      {pendientes.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide">⏳ Pendientes ({pendientes.length})</h3>
          {pendientes.map(k => <KitCard key={k.id} k={k} />)}
        </div>
      )}
      {parciales.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-orange-700 uppercase tracking-wide">🟡 Pendiente a Completar ({parciales.length})</h3>
          {parciales.map(k => <KitCard key={k.id} k={k} />)}
        </div>
      )}
      {atendidos.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">✅ Atendidos ({atendidos.length})</h3>
          {atendidos.map(k => <KitCard key={k.id} k={k} />)}
        </div>
      )}
    </div>
  )
}

export default function Uniformes() {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const { kitProds, uStock, pranedas, getTallas, getProdId, getStockOf, getNombre, getTalla, getPraneda } = useKitHelpers()

  const [tab, setTab]     = useState(TAB_STOCK)
  const [modal, setModal] = useState(null)
  const [search, setSearch] = useState('')
  const [confirmBox, setConfirmBox] = useState(null)
  const [devEntregaId, setDevEntregaId] = useState(null)
  const [sedesMes, setSedesMes] = useState(() => { const d=new Date(); return d.toISOString().slice(0,7) })
  const [kardexPage, setKardexPage] = useState(0)
  const KARDEX_PAGE_SIZE = 25

  const { user, isAdmin, isCoordLogistica } = useAuth()
  const entregas     = state.uniformeEntregas     || []
  const devoluciones = state.uniformeDevoluciones || []
  const kitsDesdeREQ = state.kitsDesdeREQ         || []

  // ── Stock agrupado por praneda ────────────────────────
  const stockGroups = useMemo(() => {
    const groups = {}
    kitProds.forEach(p => {
      if (!groups[p.praneda]) groups[p.praneda] = { categoria: p.categoria, items:[] }
      const s = uStock[p.id] || { nuevo:0, usado:0, desechado:0 }
      groups[p.praneda].items.push({ id:p.id, talla:p.talla, nuevo:s.nuevo||0, usado:s.usado||0, desechado:s.desechado||0 })
    })
    return groups
  }, [kitProds, uStock])

  const totalNuevo    = useMemo(() => Object.values(uStock).reduce((s,v)=>s+(v.nuevo||0),0), [uStock])

  const handleExportExcel = async () => {
    const wb = new ExcelJS.Workbook()
    wb.creator = 'GIVAMIC ERP'; wb.created = new Date()
    const ws = wb.addWorksheet('Stock Kit de Ingresos')

    // Title rows
    ws.mergeCells('A1:G1')
    ws.getCell('A1').value = 'GIVAMIC — Stock Kit de Ingresos de Personal'
    ws.getCell('A1').font = { bold:true, size:14, color:{ argb:'FFFFFFFF' } }
    ws.getCell('A1').fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF1E3A5F' } }
    ws.getCell('A1').alignment = { horizontal:'center', vertical:'middle' }
    ws.getRow(1).height = 28

    ws.mergeCells('A2:G2')
    ws.getCell('A2').value = 'Reporte generado: ' + new Date().toLocaleString('es-PE')
    ws.getCell('A2').font = { italic:true, size:9, color:{ argb:'FF666666' } }
    ws.getCell('A2').alignment = { horizontal:'center' }

    ws.addRow([]) // blank row

    // Header row
    const headers = ['Prenda','Categoría','Talla / Color','Nuevo','Usado','Total Disp.','Desechado']
    const hRow = ws.addRow(headers)
    hRow.eachCell(cell => {
      cell.font = { bold:true, color:{ argb:'FFFFFFFF' } }
      cell.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF1E3A5F' } }
      cell.alignment = { horizontal:'center', vertical:'middle' }
      cell.border = { bottom:{ style:'thin', color:{ argb:'FFAAAAAA' } } }
    })
    ws.getRow(4).height = 20

    // Column widths
    ws.columns = [
      { width:16 },{ width:14 },{ width:14 },
      { width:10 },{ width:10 },{ width:12 },{ width:12 }
    ]

    // Data
    let totalN=0, totalU=0, totalD=0
    Object.entries(stockGroups).forEach(([praneda, { categoria, items }]) => {
      items.forEach((it, idx) => {
        const total = it.nuevo + it.usado
        const row = ws.addRow([
          idx===0 ? praneda : '', categoria, it.talla,
          it.nuevo, it.usado, total, it.desechado
        ])
        // Style
        row.getCell(1).font = { bold: idx===0 }
        row.getCell(3).alignment = { horizontal:'center' }
        // Color cells
        if (it.nuevo > 0) { row.getCell(4).font = { color:{ argb:'FF166534' } }; row.getCell(4).fill = { type:'pattern',pattern:'solid',fgColor:{ argb:'FFF0FDF4' } } }
        if (it.usado > 0) { row.getCell(5).font = { color:{ argb:'FF92400E' } }; row.getCell(5).fill = { type:'pattern',pattern:'solid',fgColor:{ argb:'FFFFFBEB' } } }
        row.getCell(6).font = { bold:true, color:{ argb:'FF1E3A5F' } }
        if (it.desechado > 0) { row.getCell(7).font = { color:{ argb:'FFB91C1C' } } }
        if (total === 0) row.getCell(6).fill = { type:'pattern',pattern:'solid',fgColor:{ argb:'FFFEF2F2' } }
        // Alternate row bg
        const rowBg = (ws.rowCount % 2 === 0) ? 'FFF8FAFC' : 'FFFFFFFF'
        row.eachCell(cell => { if (!cell.fill || cell.fill.fgColor?.argb === 'FFFFFFFF') cell.fill = { type:'pattern',pattern:'solid',fgColor:{ argb:rowBg } } })
        totalN += it.nuevo; totalU += it.usado; totalD += it.desechado
      })
    })

    // Totals row
    ws.addRow([])
    const tRow = ws.addRow(['TOTALES','','', totalN, totalU, totalN+totalU, totalD])
    tRow.eachCell(cell => { cell.font = { bold:true, color:{ argb:'FF1E3A5F' } }; cell.fill = { type:'pattern',pattern:'solid',fgColor:{ argb:'FFE8EFF7' } } })
    tRow.getCell(4).font = { bold:true, color:{ argb:'FF166534' } }
    tRow.getCell(5).font = { bold:true, color:{ argb:'FF92400E' } }
    tRow.getCell(7).font = { bold:true, color:{ argb:'FFB91C1C' } }

    // Download
    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'Stock_Kit_Ingresos_' + new Date().toISOString().slice(0,10) + '.xlsx'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  const totalUsado    = useMemo(() => Object.values(uStock).reduce((s,v)=>s+(v.usado||0),0), [uStock])
  const totalDesechado= useMemo(() => Object.values(uStock).reduce((s,v)=>s+(v.desechado||0),0), [uStock])

  // ── Dashboard helpers ─────────────────────────────────
  const tallaRotacion = useMemo(() => {
    const map = {}
    entregas.forEach(ent => {
      ;(ent.items||[]).forEach(it => {
        const nombre = it.nombre || getNombre(it.productoId)
        map[nombre] = (map[nombre]||0) + Number(it.cantidad||0)
      })
    })
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,8)
  }, [entregas])
  const maxTalla = tallaRotacion.length ? tallaRotacion[0][1] : 1

  const sedeRotacion = useMemo(() => {
    const map = {}
    entregas.filter(e => e.fecha?.startsWith(sedesMes)).forEach(e => {
      const s = e.sedeNombre || '—'
      ;(e.items||[]).forEach(it => { map[s] = (map[s]||0) + Number(it.cantidad||0) })
    })
    return Object.entries(map).sort((a,b)=>b[1]-a[1])
  }, [entregas, sedesMes])
  const maxSede = sedeRotacion.length ? sedeRotacion[0][1] : 1

  const meses = useMemo(() => {
    const arr = []; const d = new Date()
    for (let i=0; i<6; i++) {
      const m = new Date(d.getFullYear(), d.getMonth()-i, 1)
      arr.push({ value: m.toISOString().slice(0,7), label: m.toLocaleString('es-PE',{month:'long',year:'numeric'}) })
    }
    return arr
  }, [])

  const kardex = useMemo(() => {
    const rows = []
    entregas.forEach(e => {
      ;(e.items||[]).forEach(it => rows.push({ fecha:e.fecha, tipo:'Entrega', nombre:it.nombre||getNombre(it.productoId), condicion:it.condicion, cantidad:it.cantidad, trabajador:e.trabajadorNombre, sede:e.sedeNombre }))
    })
    devoluciones.forEach(d => {
      ;(d.items||[]).forEach(it => rows.push({ fecha:d.fecha, tipo:'Devolución', nombre:it.nombre||getNombre(it.productoId), estadoDevuelta:it.estadoDevuelta, cantidad:it.cantidad, trabajador:d.trabajadorNombre }))
    })
    return rows.sort((a,b)=>b.fecha?.localeCompare(a.fecha||''))
  }, [entregas, devoluciones])

  // Stock crítico: total disponible = 0 o bajo mínimo
  const stockCritico = useMemo(() => {
    return kitProds.map(p => {
      const s = uStock[p.id] || { nuevo:0, usado:0, desechado:0 }
      const total = s.nuevo + s.usado
      return { nombre: p.nombre, total, minimo: p.stockMinimo||0, nuevo:s.nuevo, usado:s.usado }
    }).filter(p => p.total <= (p.minimo||2)).sort((a,b)=>a.total-b.total).slice(0,8)
  }, [kitProds, uStock])

  // Trabajadores únicos con entrega activa
  const trabajadoresActivos = useMemo(() => {
    const ids = new Set(entregas.filter(e=>e.estado==='Activo').map(e=>e.trabajadorDNI||e.trabajadorNombre))
    return ids.size
  }, [entregas])

  // Tasa de devolución
  const totalEntregado = useMemo(() => entregas.reduce((s,e)=>(e.items||[]).reduce((ss,it)=>ss+Number(it.cantidad||0),s),0),[entregas])
  const totalDevuelto  = useMemo(() => devoluciones.reduce((s,d)=>(d.items||[]).reduce((ss,it)=>ss+Number(it.cantidad||0),s),0),[devoluciones])
  const pctDevolucion  = totalEntregado > 0 ? Math.round(totalDevuelto/totalEntregado*100) : 0

  // Últimas devoluciones (5)
  const ultDevs = useMemo(() => devoluciones.slice(0,5), [devoluciones])

  // Filtered entregas
  const entregasFilt = useMemo(() => {
    if (!search.trim()) return entregas
    const q = search.toLowerCase()
    return entregas.filter(e => e.trabajadorNombre?.toLowerCase().includes(q) || e.trabajadorDNI?.includes(q) || e.sedeNombre?.toLowerCase().includes(q))
  }, [entregas, search])

  const handleDeleteEntrega = (id) => {
    setConfirmBox({
      message: '¿Eliminar esta entrega?',
      onConfirm: () => {
        dispatch({ type:'DELETE_UNIFORME_ENTREGA', id })
        toast('Entrega eliminada')
        setConfirmBox(null)
      }
    })
  }

  const handleDeleteDev = (id) => {
    setConfirmBox({
      message: '¿Eliminar esta devolución?',
      onConfirm: () => {
        dispatch({ type:'DELETE_UNIFORME_DEVOLUCION', id })
        toast('Devolución eliminada')
        setConfirmBox(null)
      }
    })
  }

  const TABS = [TAB_DASHBOARD, TAB_STOCK, TAB_ENTREGAS, TAB_DEVOLUCIONES, TAB_DESDE_REQ]

  return (
    <div className="page-container">
      <PageHeader title="Control de Ingresos" subtitle="Prendas, paños y trapeadores por trabajador y sede" />

      {/* KPI strip */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
        {[
          { label:'Entregas', value:entregas.length, sub:'total histórico', color:'text-[#1e3a5f]' },
          { label:'Trabajadores', value:trabajadoresActivos, sub:'con kit activo', color:'text-[#1e3a5f]' },
          { label:'Stock Nuevo', value:totalNuevo, sub:'prendas disponibles', color:'text-green-600' },
          { label:'Stock Usado', value:totalUsado, sub:'listo para reuso', color:'text-amber-600' },
          { label:'Desechados', value:totalDesechado, sub:'histórico acumulado', color:'text-red-500' },
          { label:'Tasa Retorno', value:pctDevolucion+'%', sub:`${totalDevuelto} de ${totalEntregado}`, color: pctDevolucion>30?'text-amber-600':'text-emerald-600' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-100 p-3 text-center shadow-sm">
            <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-xs font-medium text-gray-700 mt-0.5">{k.label}</p>
            <p className="text-[10px] text-gray-400">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto -mx-0.5 px-0.5 mb-4">
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button key={t} onClick={()=>setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${tab===t ? 'bg-white text-[#1e3a5f] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
            {t === TAB_DESDE_REQ && kitsDesdeREQ.filter(k => k.estado !== 'Atendido').length > 0 && (
              <span className="bg-amber-400 text-amber-900 text-[8px] font-black rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {kitsDesdeREQ.filter(k => k.estado !== 'Atendido').length}
              </span>
            )}
          </button>
        ))}
      </div>
      </div>

      {/* ── DASHBOARD ── */}
      {tab === TAB_DASHBOARD && (
        <div className="space-y-3">

          {/* Fila 1: Rotación + Stock crítico */}
          <div className="grid grid-cols-2 gap-3">

            {/* Rotación histórica */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <h3 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Prendas con más rotación</h3>
              {tallaRotacion.length === 0
                ? <p className="text-xs text-gray-400">Sin entregas registradas.</p>
                : <div className="space-y-1.5">
                    {tallaRotacion.map(([nombre, cnt]) => (
                      <div key={nombre} className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-600 w-24 truncate shrink-0">{nombre}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                          <div className="h-4 rounded-full bg-[#1e3a5f] flex items-center justify-end pr-1.5 transition-all"
                            style={{ width:`${Math.max(6,(cnt/maxTalla)*100)}%` }}>
                            <span className="text-white text-[9px] font-bold">{cnt}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>

            {/* Stock crítico / agotado */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <h3 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide flex items-center gap-2">
                Alertas de stock
                {stockCritico.length > 0 && <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{stockCritico.length}</span>}
              </h3>
              {stockCritico.length === 0
                ? <p className="text-xs text-emerald-600 font-medium">✓ Todo el stock está en niveles normales</p>
                : <div className="space-y-1.5">
                    {stockCritico.map(p => (
                      <div key={p.nombre} className="flex items-center justify-between py-1 border-b border-gray-50 last:border-0">
                        <span className="text-[11px] text-gray-700 font-medium truncate flex-1">{p.nombre}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-gray-400">N:{p.nuevo} U:{p.usado}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.total===0?'bg-red-100 text-red-700':'bg-amber-100 text-amber-700'}`}>
                            {p.total===0?'AGOTADO':`Total: ${p.total}`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>

          {/* Fila 2: Rotación por sede + Últimas devoluciones */}
          <div className="grid grid-cols-2 gap-3">

            {/* Sede x mes */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Rotación por sede</h3>
                <select className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 text-gray-600 focus:outline-none" value={sedesMes} onChange={e=>setSedesMes(e.target.value)}>
                  {meses.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              {sedeRotacion.length === 0
                ? <p className="text-xs text-gray-400">Sin entregas en este mes.</p>
                : <div className="space-y-1.5">
                    {sedeRotacion.map(([sede, cnt]) => (
                      <div key={sede} className="flex items-center gap-2">
                        <span className="text-[11px] text-gray-600 w-32 truncate shrink-0">{sede}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                          <div className="h-4 rounded-full bg-emerald-500 flex items-center justify-end pr-1.5 transition-all"
                            style={{ width:`${Math.max(6,(cnt/maxSede)*100)}%` }}>
                            <span className="text-white text-[9px] font-bold">{cnt}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>

            {/* Últimas devoluciones */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <h3 className="text-xs font-semibold text-gray-700 mb-3 uppercase tracking-wide">Últimas devoluciones</h3>
              {ultDevs.length === 0
                ? <p className="text-xs text-gray-400">Sin devoluciones registradas.</p>
                : <div className="space-y-1.5">
                    {ultDevs.map((d,i) => (
                      <div key={i} className="flex items-start justify-between py-1 border-b border-gray-50 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-gray-800 truncate">{d.trabajadorNombre}</p>
                          <p className="text-[10px] text-gray-400">{fmtDate(d.fecha)} · {(d.items||[]).length} prenda(s)</p>
                        </div>
                        <div className="flex gap-1 shrink-0 ml-2">
                          {[...new Set((d.items||[]).map(it=>it.estadoDevuelta))].map(est=>(
                            <span key={est} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${est==='Apto'?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-600'}`}>{est}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>

          {/* Fila 3: Kardex completo paginado */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Kardex de movimientos
                <span className="ml-2 text-[10px] font-normal text-gray-400 normal-case">{kardex.length} registros totales</span>
              </h3>
              <div className="flex items-center gap-2">
                <button disabled={kardexPage===0} onClick={()=>setKardexPage(p=>p-1)}
                  className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-500 disabled:opacity-30 hover:bg-gray-50">‹ Ant</button>
                <span className="text-[11px] text-gray-500">
                  {kardexPage*KARDEX_PAGE_SIZE+1}–{Math.min((kardexPage+1)*KARDEX_PAGE_SIZE, kardex.length)} de {kardex.length}
                </span>
                <button disabled={(kardexPage+1)*KARDEX_PAGE_SIZE>=kardex.length} onClick={()=>setKardexPage(p=>p+1)}
                  className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-500 disabled:opacity-30 hover:bg-gray-50">Sig ›</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="bg-gray-50 text-gray-400 uppercase text-[9px]">
                  <th className="table-th">Fecha</th><th className="table-th">Tipo</th>
                  <th className="table-th">Prenda</th><th className="table-th text-center">Cant.</th>
                  <th className="table-th">Estado</th><th className="table-th">Trabajador</th>
                  <th className="table-th">Sede</th>
                </tr></thead>
                <tbody>
                  {kardex.length === 0
                    ? <tr><td colSpan={7} className="table-td text-center text-gray-400 py-6">Sin movimientos</td></tr>
                    : kardex.slice(kardexPage*KARDEX_PAGE_SIZE, (kardexPage+1)*KARDEX_PAGE_SIZE).map((r,i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="table-td text-gray-500 whitespace-nowrap">{fmtDate(r.fecha)}</td>
                        <td className="table-td">
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${r.tipo==='Entrega'?'bg-blue-100 text-blue-700':'bg-purple-100 text-purple-700'}`}>{r.tipo}</span>
                        </td>
                        <td className="table-td font-medium text-gray-700">{r.nombre}</td>
                        <td className="table-td text-center font-bold text-gray-800">{r.cantidad}</td>
                        <td className="table-td">
                          {r.tipo==='Entrega'
                            ? <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${r.condicion==='Nuevo'?'bg-green-100 text-green-700':'bg-amber-100 text-amber-700'}`}>{r.condicion}</span>
                            : <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${r.estadoDevuelta==='Apto'?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-600'}`}>{r.estadoDevuelta}</span>
                          }
                        </td>
                        <td className="table-td text-gray-600 max-w-[120px] truncate">{r.trabajador}</td>
                        <td className="table-td text-gray-400 max-w-[100px] truncate">{r.sede||'—'}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── STOCK ── */}
      {tab === TAB_STOCK && (
        <div className="space-y-4">
          <p className="text-xs text-gray-400">Stock leído del Almacén Central. Los ingresos se registran desde Almacén → Nuevo Ingreso.</p>
          {Object.keys(stockGroups).length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400">
              Sin productos de kit registrados.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(stockGroups).map(([praneda, { categoria, items }]) => {
                const totalDisp = items.reduce((s,it) => s + it.nuevo + it.usado, 0)
                const totalNvp  = items.reduce((s,it) => s + it.nuevo, 0)
                const totalUsd  = items.reduce((s,it) => s + it.usado, 0)
                const totalDes  = items.reduce((s,it) => s + it.desechado, 0)
                const sinStock  = totalDisp === 0
                return (
                  <div key={praneda} className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${sinStock ? 'border-red-200' : 'border-gray-100'}`}>
                    {/* Cabecera de prenda */}
                    <div className={`px-4 py-3 flex items-center justify-between ${sinStock ? 'bg-red-50' : 'bg-[#1e3a5f]'}`}>
                      <div>
                        <p className={`font-bold text-sm ${sinStock ? 'text-red-700' : 'text-white'}`}>{praneda}</p>
                        <p className={`text-[10px] uppercase tracking-wide ${sinStock ? 'text-red-400' : 'text-blue-200'}`}>{categoria}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-extrabold ${sinStock ? 'text-red-500' : 'text-white'}`}>{totalDisp}</p>
                        <p className={`text-[10px] ${sinStock ? 'text-red-400' : 'text-blue-200'}`}>disponibles</p>
                      </div>
                    </div>
                    {/* Resumen N / U / D */}
                    <div className="grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100">
                      <div className="py-2 text-center">
                        <p className={`text-base font-bold ${totalNvp > 0 ? 'text-green-600' : 'text-gray-300'}`}>{totalNvp}</p>
                        <p className="text-[9px] text-gray-400 uppercase">Nuevo</p>
                      </div>
                      <div className="py-2 text-center">
                        <p className={`text-base font-bold ${totalUsd > 0 ? 'text-amber-500' : 'text-gray-300'}`}>{totalUsd}</p>
                        <p className="text-[9px] text-gray-400 uppercase">Usado</p>
                      </div>
                      <div className="py-2 text-center">
                        <p className={`text-base font-bold ${totalDes > 0 ? 'text-red-500' : 'text-gray-300'}`}>{totalDes}</p>
                        <p className="text-[9px] text-gray-400 uppercase">Desechado</p>
                      </div>
                    </div>
                    {/* Tallas */}
                    <div className="p-3">
                      <p className="text-[9px] font-bold text-gray-400 uppercase mb-2">{['Paño','Trapeador'].includes(praneda) ? 'Stock por color' : 'Stock por talla'}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {items.map(it => {
                          const disp = it.nuevo + it.usado
                          return (
                            <div key={it.id} className={`flex flex-col items-center rounded-xl px-2.5 py-1.5 border min-w-[48px] ${disp === 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                              <span className={`text-[10px] font-extrabold ${disp === 0 ? 'text-red-400' : 'text-[#1e3a5f]'}`}>{it.talla}</span>
                              <span className={`text-sm font-bold leading-none mt-0.5 ${disp === 0 ? 'text-red-300' : 'text-gray-800'}`}>{disp}</span>
                              <div className="flex gap-1 mt-1">
                                {it.nuevo > 0 && <span className="text-[8px] bg-green-100 text-green-700 px-1 rounded font-semibold">N:{it.nuevo}</span>}
                                {it.usado > 0 && <span className="text-[8px] bg-amber-100 text-amber-700 px-1 rounded font-semibold">U:{it.usado}</span>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── ENTREGAS ── */}
      {tab === TAB_ENTREGAS && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <input className="input flex-1" placeholder="Buscar por nombre, DNI o sede..." value={search} onChange={e=>setSearch(e.target.value)} />
            <button onClick={()=>setModal('entrega')} className="btn-primary flex items-center gap-2">
              <PlusIcon className="w-4 h-4"/>Nueva Entrega
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth: 640 }}>
              <thead><tr className="bg-[#1e3a5f] text-white text-[11px] uppercase">
                <th className="table-th text-white">N°</th>
                <th className="table-th text-white">Fecha</th>
                <th className="table-th text-white">Trabajador</th>
                <th className="table-th text-white">DNI</th>
                <th className="table-th text-white">Cargo</th>
                <th className="table-th text-white">Sede</th>
                <th className="table-th text-white text-center">Prendas</th>
                <th className="table-th text-white text-center">Acciones</th>
              </tr></thead>
              <tbody>
                {entregasFilt.length === 0 ? (
                  <tr><td colSpan={8} className="table-td text-center text-gray-400 py-8">Sin entregas registradas.</td></tr>
                ) : entregasFilt.map(ent => (
                  <tr key={ent.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="table-td font-mono text-[10px] text-gray-400">{ent.numero}</td>
                    <td className="table-td">{fmtDate(ent.fecha)}</td>
                    <td className="table-td font-semibold text-gray-800">{ent.trabajadorNombre}</td>
                    <td className="table-td text-gray-500">{ent.trabajadorDNI||'—'}</td>
                    <td className="table-td text-gray-600">{ent.cargo||'—'}</td>
                    <td className="table-td text-gray-600">{ent.sedeNombre||'—'}</td>
                    <td className="table-td text-center">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {(ent.items||[]).map((it,i) => (
                          <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${it.condicion==='Nuevo' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {it.nombre||getNombre(it.productoId)} ×{it.cantidad}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="table-td">
                      <div className="flex gap-1 justify-center">
                        <button title="Registrar devolución" onClick={()=>{ setDevEntregaId(ent.id); setModal('devolucion') }}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                          <ArrowPathIcon className="w-4 h-4"/>
                        </button>
                        <button title="Eliminar" onClick={()=>handleDeleteEntrega(ent.id)}
                          className="p-1 text-red-400 hover:bg-red-50 rounded">
                          <TrashIcon className="w-4 h-4"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* ── DEVOLUCIONES ── */}
      {tab === TAB_DEVOLUCIONES && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button onClick={()=>{ setDevEntregaId(null); setModal('devolucion') }} className="btn-secondary flex items-center gap-2">
              <ArrowPathIcon className="w-4 h-4"/>Devolución Directa
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ minWidth: 480 }}>
              <thead><tr className="bg-[#1e3a5f] text-white text-[11px] uppercase">
                <th className="table-th text-white">N°</th>
                <th className="table-th text-white">Fecha</th>
                <th className="table-th text-white">Trabajador</th>
                <th className="table-th text-white text-center">Prendas devueltas</th>
                <th className="table-th text-white text-center">Acciones</th>
              </tr></thead>
              <tbody>
                {devoluciones.length === 0 ? (
                  <tr><td colSpan={5} className="table-td text-center text-gray-400 py-8">Sin devoluciones registradas.</td></tr>
                ) : devoluciones.map(dev => (
                  <tr key={dev.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="table-td font-mono text-[10px] text-gray-400">{dev.numero}</td>
                    <td className="table-td">{fmtDate(dev.fecha)}</td>
                    <td className="table-td font-semibold text-gray-800">{dev.trabajadorNombre}</td>
                    <td className="table-td">
                      <div className="flex flex-wrap gap-1 justify-center">
                        {(dev.items||[]).map((it,i) => (
                          <span key={i} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${it.estadoDevuelta==='Apto' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                            {it.nombre||getNombre(it.productoId)} ×{it.cantidad} ({it.estadoDevuelta})
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="table-td text-center">
                      <button onClick={()=>handleDeleteDev(dev.id)} className="p-1 text-red-400 hover:bg-red-50 rounded">
                        <TrashIcon className="w-4 h-4"/>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {modal === 'entrega' && (
        <Modal title="Nueva Entrega de Kit" onClose={()=>setModal(null)} wide>
          <EntregaForm onClose={()=>setModal(null)} />
        </Modal>
      )}
      {modal === 'devolucion' && (
        <Modal title={devEntregaId ? 'Registrar Devolución' : 'Devolución Directa'} onClose={()=>setModal(null)} wide>
          <DevolucionForm onClose={()=>setModal(null)} entregaId={devEntregaId}
            trabajadorNombreInit={devEntregaId ? (entregas.find(e=>e.id===devEntregaId)?.trabajadorNombre||'') : ''}
            trabajadorDNIInit={devEntregaId ? (entregas.find(e=>e.id===devEntregaId)?.trabajadorDNI||'') : ''} />
        </Modal>
      )}
      {tab === TAB_DESDE_REQ && (
        <TabDesdeREQ
          kits={kitsDesdeREQ}
          dispatch={dispatch}
          toast={toast}
          user={user}
          isAdmin={isAdmin}
          isCoordLogistica={isCoordLogistica}
        />
      )}

      {confirmBox && <Confirm {...confirmBox} onCancel={() => setConfirmBox(null)} />}
    </div>
  )
}
