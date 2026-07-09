import { useState, useMemo, useRef, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/layout/Toast'
import Modal from '../components/common/Modal'
import PageHeader from '../components/common/PageHeader'
import { fmtMoney, fmtDate, genId, todayISO } from '../utils/helpers'
import { generarPDFVale } from '../utils/pdfVale'
import { generarPDFTraslado } from '../utils/pdfTraslado'
import {
  PlusIcon, ArrowDownIcon, ArrowUpIcon, CubeIcon,
  EyeIcon, TrashIcon, DocumentArrowDownIcon,
  PaperClipIcon, DocumentIcon, XMarkIcon, ExclamationTriangleIcon
} from '@heroicons/react/24/outline'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const TAB_STOCK    = 'Stock Almacén'
const TAB_INGRESOS = 'Ingresos'
const TAB_VALES    = 'Vales de Salida'
const TAB_INV      = 'Inventario Sedes'
const COLORS = ['#1e3a5f','#2d5a9e','#4a86d4','#6fa8dc','#93c5fd']

// ── Stock calculator (ingresos − vales/transferencias) ─────
function calcStock(ingresos, transferencias, productos) {
  const map = {}
  ingresos.forEach(ing => {
    ing.items?.forEach(it => {
      if (!it.productoId) return
      if (!map[it.productoId]) map[it.productoId] = { ingresado: 0, salida: 0, nombre: it.producto || it.descripcion || '', codigo: it.codigo || '', unidad: it.unidad || '' }
      map[it.productoId].ingresado += Number(it.cantidadRecibida ?? it.cantidad ?? 0)
    })
  })
  transferencias.forEach(t => {
    t.items?.forEach(it => {
      if (!it.productoId) return
      if (!map[it.productoId]) map[it.productoId] = { ingresado: 0, salida: 0, nombre: it.descripcion || it.producto || '', codigo: it.codigo || '', unidad: it.unidad || '' }
      map[it.productoId].salida += Number(it.cantidad ?? 0)
    })
  })
  return Object.entries(map).map(([productoId, v]) => {
    const prod = productos.find(p => p.id === productoId)
    return {
      productoId,
      descripcion: prod?.nombre || v.nombre || '—',
      codigo: prod?.codigo || v.codigo || '—',
      unidad: prod?.unidad || v.unidad || '—',
      ingresado: v.ingresado,
      salida: v.salida,
      stock: v.ingresado - v.salida,
      stockMinimo: Number(prod?.stockMinimo ?? 0)
    }
  }).sort((a, b) => a.descripcion.localeCompare(b.descripcion))
}

// ── Formulario Vale de Salida (idéntico a Transferencias) ──
const EMPTY_ITEM = { id:'', productoId:'', descripcion:'', codigo:'', unidad:'', cantidad:1, precioUnit:0, precioTotal:0, observaciones:'' }

function ValeForm({ onClose }) {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const sedesDestino = state.sedes.filter(s => !s.esCentral)
  const prods = state.productos
  const stockCentral = state.inventario['s1'] || {}

  const [form, setForm] = useState({
    areaSolicitante: '', responsable: '', sedeDestinoId: '', fecha: todayISO(),
    items: [{ ...EMPTY_ITEM, id: genId() }], observaciones: ''
  })
  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const setItem = (idx, k, v) => {
    const items = form.items.map((it, i) => {
      if (i !== idx) return it
      const next = { ...it, [k]: v }
      if (k === 'productoId') {
        const prod = prods.find(p => p.id === v)
        if (prod) {
          next.descripcion = prod.nombre; next.codigo = prod.codigo
          next.unidad = prod.unidad; next.precioUnit = prod.ultimoPrecio || 0
          next.precioTotal = next.precioUnit * (next.cantidad || 1)
        }
      }
      if (k === 'cantidad' || k === 'precioUnit') {
        const cant = k === 'cantidad' ? parseFloat(v)||0 : parseFloat(next.cantidad)||0
        const pu   = k === 'precioUnit' ? parseFloat(v)||0 : parseFloat(next.precioUnit)||0
        next.precioTotal = cant * pu
      }
      return next
    })
    setForm(p => ({ ...p, items }))
  }

  const addItem    = () => setForm(p => ({ ...p, items: [...p.items, { ...EMPTY_ITEM, id: genId() }] }))
  const removeItem = (idx) => setForm(p => ({ ...p, items: p.items.filter((_,i) => i !== idx) }))
  const total = form.items.reduce((s, it) => s + (it.precioTotal||0), 0)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.areaSolicitante || !form.responsable || !form.sedeDestinoId)
      return toast('Completa los datos de cabecera', 'error')
    if (form.items.some(it => !it.productoId))
      return toast('Selecciona producto en todos los ítems', 'error')
    for (const it of form.items) {
      const stock = stockCentral[it.productoId]?.cantidad || 0
      if (it.cantidad > stock) {
        toast(`Stock insuficiente: "${it.descripcion}" (disponible: ${stock})`, 'error'); return
      }
    }
    const nextNum   = state.ultimoVale + 1
    const numeroVale = `VS-${String(nextNum).padStart(4,'0')}`
    const payload   = { ...form, total, items: form.items.map(it => ({ ...it, cantidad: parseFloat(it.cantidad)||0, precioUnit: parseFloat(it.precioUnit)||0 })) }
    dispatch({ type: 'ADD_TRANSFERENCIA', payload })
    toast('Vale registrado. Generando PDF...', 'success')
    onClose('pdf', { ...payload, numeroVale, sedeDestinoId: form.sedeDestinoId })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Área Solicitante *</label>
          <input className="input" value={form.areaSolicitante} onChange={e => setField('areaSolicitante', e.target.value)} placeholder="Ej: Operaciones" required />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Responsable *</label>
          <input className="input" value={form.responsable} onChange={e => setField('responsable', e.target.value)} placeholder="Nombre del responsable" required />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Sede destino *</label>
          <select className="input" value={form.sedeDestinoId} onChange={e => setField('sedeDestinoId', e.target.value)} required>
            <option value="">Seleccionar sede...</option>
            {sedesDestino.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Fecha</label>
          <input className="input" type="date" value={form.fecha} onChange={e => setField('fecha', e.target.value)} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-700">Productos a despachar</p>
          <button type="button" onClick={addItem} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            <PlusIcon className="w-3.5 h-3.5"/>Agregar ítem
          </button>
        </div>
        <div className="space-y-2">
          {form.items.map((it, idx) => {
            const stockDisp = stockCentral[it.productoId]?.cantidad ?? null
            return (
              <div key={it.id} className="bg-gray-50 p-2 rounded-lg space-y-2">
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    {idx === 0 && <label className="text-xs text-gray-500 block mb-1">Producto</label>}
                    <select className="input text-xs" value={it.productoId} onChange={e => setItem(idx,'productoId',e.target.value)} required>
                      <option value="">Seleccionar...</option>
                      {prods.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                    {stockDisp !== null && (
                      <p className={`text-xs mt-0.5 ${stockDisp === 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        Stock almacén: {stockDisp}
                      </p>
                    )}
                  </div>
                  <div className="col-span-1">
                    {idx === 0 && <label className="text-xs text-gray-500 block mb-1">UM</label>}
                    <input className="input text-xs" value={it.unidad} onChange={e => setItem(idx,'unidad',e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <label className="text-xs text-gray-500 block mb-1">Cantidad</label>}
                    <input className="input text-xs" type="number" min="1" value={it.cantidad}
                      onChange={e => setItem(idx,'cantidad',e.target.value)} max={stockDisp ?? undefined} />
                  </div>
                  <div className="col-span-2">
                    {idx === 0 && <label className="text-xs text-gray-500 block mb-1">P. Unitario</label>}
                    <input className="input text-xs" type="number" step="0.01" min="0" value={it.precioUnit}
                      onChange={e => setItem(idx,'precioUnit',e.target.value)} />
                  </div>
                  <div className="col-span-1">
                    {idx === 0 && <label className="text-xs text-gray-500 block mb-1">Total</label>}
                    <p className="text-xs font-medium text-gray-700 pt-2">{fmtMoney(it.precioTotal)}</p>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 text-xs pt-1">✕</button>
                  </div>
                </div>
                <input className="input text-xs" value={it.observaciones}
                  onChange={e => setItem(idx,'observaciones',e.target.value)}
                  placeholder="Observaciones (opcional)" />
              </div>
            )
          })}
        </div>
        <div className="flex justify-end mt-2">
          <p className="text-sm font-semibold text-gray-800">Total: {fmtMoney(total)}</p>
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
        <button type="button" onClick={() => onClose()} className="btn-secondary">Cancelar</button>
        <button type="submit" className="btn-primary flex items-center gap-2">
          <DocumentArrowDownIcon className="w-4 h-4"/>Registrar y Generar Vale PDF
        </button>
      </div>
    </form>
  )
}

// ── Formulario Ingreso ─────────────────────────────────────
const TIPO_INGRESO = [
  { value: 'Factura',  label: '📄 Por Factura',             desc: 'Ingreso vinculado a una factura recibida de proveedor' },
  { value: 'Ajuste',   label: '⚖️ Ajuste de Inventario',    desc: 'Corrección manual de stock (merma, conteo físico, etc.)' },
  { value: 'Traslado', label: '🏢 Traslado desde Sede',     desc: 'Devolución o traslado de productos de una sede al almacén central' },
]

const EMPTY_ADJ = { id:'', productoId:'', descripcion:'', codigo:'', unidad:'', cantidad:1 }

function IngresoForm({ onClose }) {
  const { state, dispatch } = useApp()
  const toast = useToast()

  const [tipo, setTipo]           = useState('Factura')
  const [fecha, setFecha]         = useState(todayISO())
  const [observaciones, setObs]   = useState('')
  const [motivo, setMotivo]       = useState('')

  // ── Factura ──────────────────────────────────────────────
  const ingresosExistentes = state.ingresosAlmacen || []
  const facturasElegibles  = (state.facturas || []).filter(f =>
    f.estado === 'Recibida' &&
    !ingresosExistentes.some(i => i.facturaId === f.id)
  )
  const [facturaId, setFacturaId] = useState('')
  const [itemsFact, setItemsFact] = useState([])
  const factura   = facturasElegibles.find(f => f.id === facturaId)
  const proveedor = factura ? state.proveedores.find(p => p.id === factura.proveedorId) : null
  const oc        = factura?.ocId ? (state.ordenesCompra||[]).find(o => o.id === factura.ocId) : null
  const handleFactura = (id) => {
    setFacturaId(id)
    const f = facturasElegibles.find(x => x.id === id)
    if (f?.items?.length) {
      const mapped = f.items.map(it => ({
        productoId: it.productoId || '',
        descripcion: it.producto || it.descripcion || '',
        codigo: it.codigo || '',
        unidad: it.unidad || '',
        cantidadFactura: Number(it.cantidad ?? 0),
        cantidadRecibida: Number(it.cantidad ?? 0),
      }))
      setItemsFact(mapped)
    } else { setItemsFact([]) }
  }
  const setItemFact = (idx, k, v) =>
    setItemsFact(prev => prev.map((it, i) => i === idx ? { ...it, [k]: v } : it))

  // ── Ajuste ───────────────────────────────────────────────
  const [itemsAdj, setItemsAdj] = useState([{ ...EMPTY_ADJ, id: genId() }])
  const addItemAdj = () => setItemsAdj(p => [...p, { ...EMPTY_ADJ, id: genId() }])
  const removeItemAdj = (idx) => setItemsAdj(p => p.filter((_,i) => i !== idx))
  const setItemAdj = (idx, k, v) => {
    setItemsAdj(prev => prev.map((it, i) => {
      if (i !== idx) return it
      const next = { ...it, [k]: v }
      if (k === 'productoId') {
        const prod = state.productos.find(p => p.id === v)
        if (prod) { next.descripcion = prod.nombre; next.codigo = prod.codigo; next.unidad = prod.unidad }
      }
      return next
    }))
  }




  // ── Traslado desde sede ───────────────────────────────────
  const sedesOrigen = state.sedes.filter(s => !s.esCentral)
  const [sedeOrigenId, setSedeOrigenId] = useState('')
  const [itemsTrasl, setItemsTrasl]     = useState([{ ...EMPTY_ADJ, id: genId() }])
  const invSede = sedeOrigenId ? (state.inventario[sedeOrigenId] || {}) : {}
  const productosSede = Object.entries(invSede)
    .filter(([, d]) => d.cantidad > 0)
    .map(([pid, d]) => {
      const prod = state.productos.find(p => p.id === pid)
      return { productoId: pid, descripcion: prod?.nombre || d.nombre || d.descripcion || pid, codigo: prod?.codigo || '', unidad: prod?.unidad || d.unidad || '', disponible: d.cantidad }
    })
  const addItemTrasl = () => setItemsTrasl(p => [...p, { ...EMPTY_ADJ, id: genId() }])
  const removeItemTrasl = (idx) => setItemsTrasl(p => p.filter((_,i) => i !== idx))
  const setItemTrasl = (idx, k, v) => {
    setItemsTrasl(prev => prev.map((it, i) => {
      if (i !== idx) return it
      const next = { ...it, [k]: v }
      if (k === 'productoId') {
        const p = productosSede.find(x => x.productoId === v)
        if (p) { next.descripcion = p.descripcion; next.codigo = p.codigo; next.unidad = p.unidad; next.cantidad = 1 }
      }
      return next
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    let payload = { fecha, tipo, observaciones }

    if (tipo === 'Factura') {
      if (!facturaId) return toast('Selecciona una factura', 'error')
      if (!itemsFact.length) return toast('La factura no tiene ítems', 'error')
      payload = { ...payload, facturaId, facturaNumero: factura?.numero||'', ocId: oc?.id||'', ocNumero: oc?.numero||'', proveedorId: proveedor?.id||'', proveedorNombre: proveedor?.nombre||'', items: itemsFact.map(it => ({ ...it, cantidadRecibida: Number(it.cantidadRecibida) })) }
    }

    if (tipo === 'Ajuste') {
      const validos = itemsAdj.filter(it => it.productoId && Number(it.cantidad) > 0)
      if (!validos.length) return toast('Agrega al menos un producto con cantidad', 'error')
      if (!motivo) return toast('Ingresa el motivo del ajuste', 'error')
      payload = { ...payload, motivo, items: validos.map(it => ({ ...it, cantidadRecibida: Number(it.cantidad) })) }
    }

    if (tipo === 'Traslado') {
      if (!sedeOrigenId) return toast('Selecciona la sede de origen', 'error')
      const validos = itemsTrasl.filter(it => it.productoId && Number(it.cantidad) > 0)
      if (!validos.length) return toast('Agrega al menos un producto', 'error')
      const sedeName = sedesOrigen.find(s => s.id === sedeOrigenId)?.nombre || ''
      for (const it of validos) {
        const disp = productosSede.find(p => p.productoId === it.productoId)?.disponible || 0
        if (Number(it.cantidad) > disp) return toast(`"${it.descripcion}" supera el stock de la sede (${disp})`, 'error')
      }
      payload = { ...payload, sedeOrigenId, sedeOrigenNombre: sedeName, items: validos.map(it => ({ ...it, cantidadRecibida: Number(it.cantidad) })) }
    }

    dispatch({ type: 'ADD_INGRESO_ALMACEN', payload })
    toast('Ingreso registrado ✓')
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Tipo de ingreso */}
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-2">Tipo de ingreso *</label>
        <div className="grid grid-cols-3 gap-2">
          {TIPO_INGRESO.map(t => (
            <button key={t.value} type="button"
              onClick={() => setTipo(t.value)}
              className={`text-left p-3 rounded-xl border-2 text-xs transition-all ${tipo===t.value ? 'border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              <div className="font-semibold mb-0.5">{t.label}</div>
              <div className="text-[10px] text-gray-400 leading-tight">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Fecha */}
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Fecha *</label>
        <input className="input max-w-[180px]" type="date" value={fecha} onChange={e => setFecha(e.target.value)} required />
      </div>

      {/* ── FACTURA ── */}
      {tipo === 'Factura' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Factura recibida *</label>
            {facturasElegibles.length === 0 ? (
              <div className="input bg-orange-50 text-orange-600 text-xs">No hay facturas en estado "Recibida" pendientes de ingreso.</div>
            ) : (
              <select className="input" value={facturaId} onChange={e => handleFactura(e.target.value)} required>
                <option value="">Seleccionar factura...</option>
                {facturasElegibles.map(f => {
                  const pv = state.proveedores.find(p => p.id === f.proveedorId)
                  const o  = f.ocId ? (state.ordenesCompra||[]).find(x => x.id === f.ocId) : null
                  return <option key={f.id} value={f.id}>{f.numero} — {pv?.nombre||'—'}{o ? ` (OC: ${o.numero})` : ''}</option>
                })}
              </select>
            )}
          </div>
          {factura && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 flex gap-4 flex-wrap">
              <span>Proveedor: <strong>{proveedor?.nombre||'—'}</strong></span>
              {oc && <span>OC: <strong className="font-mono">{oc.numero}</strong></span>}
              <span>Factura: <strong className="font-mono">{factura.numero}</strong></span>
            </div>
          )}
          {itemsFact.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-xs">
                <thead><tr className="bg-[#1e3a5f] text-white">
                  <th className="px-3 py-2 text-left">Producto</th>
                  <th className="px-3 py-2 text-center">Und</th>
                  <th className="px-3 py-2 text-center">Cant. Factura</th>
                  <th className="px-3 py-2 text-center">Cant. Recibida</th>
                </tr></thead>
                <tbody>
                  {itemsFact.map((it, idx) => (
                    <tr key={idx} className={`border-t border-gray-100 ${idx%2===1?'bg-gray-50/50':''}`}>
                      <td className="px-3 py-2"><p className="font-medium">{it.descripcion}</p><p className="text-gray-400">{it.codigo}</p></td>
                      <td className="px-3 py-2 text-center">{it.unidad}</td>
                      <td className="px-3 py-2 text-center font-semibold text-[#1e3a5f]">{it.cantidadFactura}</td>
                      <td className="px-3 py-2 text-center">
                        <input type="number" min="0" value={it.cantidadRecibida}
                          onChange={e => setItemFact(idx,'cantidadRecibida',parseFloat(e.target.value)||0)}
                          className="w-20 text-center border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── AJUSTE ── */}
      {tipo === 'Ajuste' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Motivo del ajuste *</label>
            <input className="input" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej: Conteo físico, merma, corrección de error..." required />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">Productos a ajustar</p>
            <div className="space-y-2">
              {itemsAdj.map((it, idx) => (
                <div key={it.id} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg p-2">
                  <div className="col-span-6">
                    <select className="input text-xs" value={it.productoId} onChange={e => setItemAdj(idx,'productoId',e.target.value)}>
                      <option value="">Seleccionar producto...</option>
                      {state.productos.map(p => <option key={p.id} value={p.id}>{p.nombre} ({p.codigo})</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 text-xs text-gray-500 text-center">{it.unidad||'—'}</div>
                  <div className="col-span-3">
                    <input type="number" min="0" step="0.01" className="input text-xs text-center" value={it.cantidad}
                      onChange={e => setItemAdj(idx,'cantidad',e.target.value)} placeholder="Cant." />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {itemsAdj.length > 1 && <button type="button" onClick={() => removeItemAdj(idx)} className="text-red-400 hover:text-red-600 text-sm">✕</button>}
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={addItemAdj} className="mt-2 text-xs text-[#1e3a5f] hover:underline font-medium">+ Agregar producto</button>
          </div>
        </div>
      )}

      {/* ── TRASLADO DESDE SEDE ── */}
      {tipo === 'Traslado' && (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Sede de origen *</label>
            <select className="input" value={sedeOrigenId} onChange={e => { setSedeOrigenId(e.target.value); setItemsTrasl([{ ...EMPTY_ADJ, id: genId() }]) }} required>
              <option value="">Seleccionar sede...</option>
              {sedesOrigen.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          {sedeOrigenId && productosSede.length === 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-600">Esta sede no tiene stock disponible para trasladar.</div>
          )}
          {sedeOrigenId && productosSede.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-700">Productos a trasladar al almacén central</p>
              {itemsTrasl.map((it, idx) => (
                <div key={it.id} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg p-2">
                  <div className="col-span-6">
                    <select className="input text-xs" value={it.productoId} onChange={e => setItemTrasl(idx,'productoId',e.target.value)}>
                      <option value="">Seleccionar producto...</option>
                      {productosSede.map(p => <option key={p.productoId} value={p.productoId}>{p.descripcion} (disp: {p.disponible})</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 text-xs text-gray-500 text-center">{it.unidad||'—'}</div>
                  <div className="col-span-3">
                    <input type="number" min="1" className="input text-xs text-center" value={it.cantidad}
                      onChange={e => setItemTrasl(idx,'cantidad',e.target.value)} placeholder="Cant." />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {itemsTrasl.length > 1 && <button type="button" onClick={() => removeItemTrasl(idx)} className="text-red-400 hover:text-red-600 text-sm">✕</button>}
                  </div>
                </div>
              ))}
              <button type="button" onClick={addItemTrasl} className="text-xs text-[#1e3a5f] hover:underline font-medium">+ Agregar producto</button>
            </div>
          )}
        </div>
      )}

      

      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Observaciones</label>
        <textarea className="input resize-none h-14" value={observaciones} onChange={e => setObs(e.target.value)} placeholder="Notas adicionales..." />
      </div>
      <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
        <button type="submit" className="btn-primary flex items-center gap-2">
          <ArrowDownIcon className="w-4 h-4"/>Registrar Ingreso
        </button>
      </div>
    </form>
  )
}

// ── Detalle Ingreso ────────────────────────────────────────
function IngresoDetail({ ing, onClose, onDelete }) {
  const tipo = ing.tipo || 'Factura'
  const tipoBadge = tipo === 'Ajuste' ? 'bg-purple-100 text-purple-700' : tipo === 'Traslado' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
  const showCantFact = tipo === 'Factura'
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 text-xs">Tipo:</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tipoBadge}`}>{tipo}</span>
        </div>
        <div><span className="text-gray-500 text-xs">Fecha:</span> <span className="font-medium">{fmtDate(ing.fecha)}</span></div>
        {tipo === 'Factura' && <>
          <div><span className="text-gray-500 text-xs">Factura:</span> <span className="font-mono font-bold text-[#1e3a5f]">{ing.facturaNumero||'—'}</span></div>
          {ing.ocNumero && <div><span className="text-gray-500 text-xs">OC:</span> <span className="font-mono">{ing.ocNumero}</span></div>}
          <div className="col-span-2"><span className="text-gray-500 text-xs">Proveedor:</span> <span className="font-medium">{ing.proveedorNombre||'—'}</span></div>
        </>}
        {tipo === 'Ajuste' && (
          <div className="col-span-2 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-xs text-purple-700">
            <span className="font-semibold">Motivo: </span>{ing.motivo||'—'}
          </div>
        )}
        {tipo === 'Traslado' && (
          <div className="col-span-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-700">
            <span className="font-semibold">Sede origen: </span>{ing.sedeOrigenNombre||'—'}
          </div>
        )}
        {ing.observaciones && <div className="col-span-2 text-xs text-gray-600 bg-gray-50 rounded p-2 italic">{ing.observaciones}</div>}
      </div>
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead><tr className="bg-gray-50 border-b border-gray-100">
            <th className="table-th">Producto</th>
            <th className="table-th text-center">Und</th>
            {showCantFact && <th className="table-th text-center">Cant. Factura</th>}
            <th className="table-th text-center">Cant. Ingresada</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {ing.items?.map((it, i) => (
              <tr key={i}>
                <td className="table-td"><p className="font-medium">{it.descripcion}</p><p className="text-gray-400">{it.codigo}</p></td>
                <td className="table-td text-center">{it.unidad}</td>
                {showCantFact && <td className="table-td text-center text-[#1e3a5f] font-semibold">{it.cantidadFactura}</td>}
                <td className="table-td text-center font-semibold text-green-600">{it.cantidadRecibida}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between pt-2 border-t border-gray-100">
        {onDelete ? <button onClick={onDelete} className="btn-danger text-xs">Eliminar</button> : <div/>}
        <button onClick={onClose} className="btn-secondary">Cerrar</button>
      </div>
    </div>
  )
}


// ── Formulario Traslado entre Sedes ───────────────────────
const EMPTY_TRS = { id:'', productoId:'', descripcion:'', codigo:'', unidad:'', cantidad:1 }

function TrasladoSedesForm({ onClose }) {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const todasSedes = state.sedes || []

  const [fecha, setFecha]           = useState(todayISO())
  const [sedeOrigenId, setOrigen]   = useState('')
  const [sedeDestinoId, setDestino] = useState('')
  const [motivo, setMotivo]         = useState('')
  const [observaciones, setObs]     = useState('')
  const [items, setItems]           = useState([{ ...EMPTY_TRS, id: genId() }])

  const invOrigen = sedeOrigenId ? (state.inventario[sedeOrigenId] || {}) : {}
  const productosOrigen = Object.entries(invOrigen)
    .filter(([, d]) => d.cantidad > 0)
    .map(([pid, d]) => {
      const prod = state.productos.find(p => p.id === pid)
      return { productoId: pid, descripcion: prod?.nombre || d.nombre || d.descripcion || pid, codigo: prod?.codigo || '', unidad: prod?.unidad || d.unidad || '', disponible: d.cantidad }
    })

  const addItem    = () => setItems(p => [...p, { ...EMPTY_TRS, id: genId() }])
  const removeItem = (idx) => setItems(p => p.filter((_, i) => i !== idx))
  const setItem    = (idx, k, v) => setItems(prev => prev.map((it, i) => {
    if (i !== idx) return it
    const next = { ...it, [k]: v }
    if (k === 'productoId') {
      const p = productosOrigen.find(x => x.productoId === v)
      if (p) { next.descripcion = p.descripcion; next.codigo = p.codigo; next.unidad = p.unidad; next.cantidad = 1 }
    }
    return next
  }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!sedeOrigenId)              return toast('Selecciona la sede de origen', 'error')
    if (!sedeDestinoId)             return toast('Selecciona la sede de destino', 'error')
    if (sedeOrigenId === sedeDestinoId) return toast('Origen y destino no pueden ser la misma sede', 'error')
    const validos = items.filter(it => it.productoId && Number(it.cantidad) > 0)
    if (!validos.length)            return toast('Agrega al menos un producto', 'error')
    for (const it of validos) {
      const disp = productosOrigen.find(p => p.productoId === it.productoId)?.disponible || 0
      if (Number(it.cantidad) > disp) return toast(`"${it.descripcion}" supera el stock disponible (${disp})`, 'error')
    }
    const origenNombre  = todasSedes.find(s => s.id === sedeOrigenId)?.nombre  || ''
    const destinoNombre = todasSedes.find(s => s.id === sedeDestinoId)?.nombre || ''
    dispatch({
      type: 'ADD_TRASLADO_SEDES',
      payload: { fecha, sedeOrigenId, sedeOrigenNombre: origenNombre, sedeDestinoId, sedeDestinoNombre: destinoNombre, motivo, observaciones, items: validos.map(it => ({ ...it, cantidad: Number(it.cantidad) })) }
    })
    toast('Traslado registrado ✓')
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Fecha *</label>
          <input className="input" type="date" value={fecha} onChange={e => setFecha(e.target.value)} required />
        </div>
        <div className="col-span-2 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Sede Origen *</label>
            <select className="input" value={sedeOrigenId} onChange={e => { setOrigen(e.target.value); setItems([{ ...EMPTY_TRS, id: genId() }]) }} required>
              <option value="">Seleccionar...</option>
              {todasSedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Sede Destino *</label>
            <select className="input" value={sedeDestinoId} onChange={e => setDestino(e.target.value)} required>
              <option value="">Seleccionar...</option>
              {todasSedes.filter(s => s.id !== sedeOrigenId).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </div>
        </div>
        {sedeOrigenId && sedeDestinoId && (
          <div className="col-span-2 flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
            <span className="font-semibold">{todasSedes.find(s=>s.id===sedeOrigenId)?.nombre}</span>
            <span>→</span>
            <span className="font-semibold">{todasSedes.find(s=>s.id===sedeDestinoId)?.nombre}</span>
          </div>
        )}
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-600 block mb-1">Motivo del traslado</label>
          <input className="input" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ej: Reabastecimiento, excedente de stock, urgencia..." />
        </div>
      </div>

      {sedeOrigenId && productosOrigen.length === 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 text-xs text-orange-600">
          La sede de origen no tiene stock disponible para trasladar.
        </div>
      )}

      {sedeOrigenId && productosOrigen.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-2">Productos a trasladar</p>
          <div className="space-y-2">
            {items.map((it, idx) => (
              <div key={it.id} className="grid grid-cols-12 gap-2 items-center bg-gray-50 rounded-lg p-2">
                <div className="col-span-6">
                  <select className="input text-xs" value={it.productoId} onChange={e => setItem(idx,'productoId',e.target.value)}>
                    <option value="">Seleccionar producto...</option>
                    {productosOrigen.map(p => <option key={p.productoId} value={p.productoId}>{p.descripcion} (disp: {p.disponible})</option>)}
                  </select>
                </div>
                <div className="col-span-2 text-xs text-gray-500 text-center">{it.unidad||'—'}</div>
                <div className="col-span-3">
                  <input type="number" min="1" className="input text-xs text-center" value={it.cantidad}
                    onChange={e => setItem(idx,'cantidad',e.target.value)} placeholder="Cant." />
                </div>
                <div className="col-span-1 flex justify-end">
                  {items.length > 1 && <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 text-sm">✕</button>}
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addItem} className="mt-2 text-xs text-[#1e3a5f] hover:underline font-medium">+ Agregar producto</button>
        </div>
      )}

      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Observaciones</label>
        <textarea className="input resize-none h-14" value={observaciones} onChange={e => setObs(e.target.value)} placeholder="Notas adicionales..." />
      </div>
      <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
        <button type="submit" className="btn-primary flex items-center gap-2">
          <ArrowUpIcon className="w-4 h-4 rotate-90"/>Registrar Traslado
        </button>
      </div>
    </form>
  )
}

// ── Página principal ───────────────────────────────────────
export default function Almacen() {
  const { state, dispatch } = useApp()
  const { isAdmin } = useAuth()
  const toast = useToast()
  const [tab, setTab]           = useState(TAB_STOCK)
  const [modal, setModal]       = useState(null)   // 'ingreso' | 'vale' | 'traslado_sedes'
  const [detail, setDetail]     = useState(null)
  const [confirm, setConfirm]   = useState(null)
  const [successVale, setSuccessVale] = useState(null)
  const [historialModal, setHistorialModal] = useState(null) // { prod, historial }

  // Filtros vales
  const [filtroSede, setFiltroSede] = useState('')
  const [filtroMes,  setFiltroMes]  = useState('')
  const [filtroDesde,setFiltroDesde]= useState('')
  const [filtroHasta,setFiltroHasta]= useState('')

  // Filtros inventario sedes
  const [invSede,     setInvSede]     = useState('s1')
  const [invCategoria,setInvCategoria]= useState('')

  const ingresos      = state.ingresosAlmacen || []
  const transferencias = state.transferencias || []
  const productos     = state.productos || []
  const sedes         = state.sedes || []
  const sedesDestino  = sedes.filter(s => !s.esCentral)
  const sedeMap       = Object.fromEntries(sedes.map(s => [s.id, s.nombre]))

  const stock = calcStock(ingresos, transferencias, productos)

  // Últimos 6 meses
  const now = new Date()
  const last6 = []
  for (let i=5; i>=0; i--) {
    const d = new Date(now); d.setMonth(d.getMonth()-i); d.setDate(1)
    last6.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)
  }

  const meses = useMemo(() =>
    [...new Set(transferencias.map(t => t.fecha.slice(0,7)))].sort().reverse(),
    [transferencias])

  const filteredVales = transferencias
    .filter(t => !filtroSede || t.sedeDestinoId === filtroSede)
    .filter(t => !filtroMes  || t.fecha.startsWith(filtroMes))
    .filter(t => !filtroDesde|| t.fecha >= filtroDesde)
    .filter(t => !filtroHasta|| t.fecha <= filtroHasta)
    .sort((a,b) => new Date(b.fecha)-new Date(a.fecha))

  const reporteData = useMemo(() => last6.map(mes => {
    const entry = { mes }
    sedesDestino.forEach(s => {
      entry[s.nombre] = transferencias
        .filter(t => t.sedeDestinoId === s.id && t.fecha.startsWith(mes))
        .reduce((sum, t) => sum+(t.total||0), 0)
    })
    return entry
  }), [transferencias, sedes])

  const tablaMensual = useMemo(() => {
    return sedesDestino.map(s => ({
      sede: s.nombre,
      meses: Object.fromEntries(last6.map(mes => [
        mes,
        transferencias.filter(t => t.sedeDestinoId === s.id && t.fecha.startsWith(mes))
          .reduce((sum,t) => sum+(t.total||0), 0)
      ]))
    }))
  }, [transferencias, sedes])

  const descargarPDF = (t) => {
    generarPDFVale(t, sedes, state.logo)
    toast(`PDF ${t.numeroVale} descargado`)
  }

  const handleValeClose = (flag, valeData) => {
    setModal(null)
    if (flag === 'pdf' && valeData) setSuccessVale(valeData)
  }

  const handleDeleteIng = (id) => {
    dispatch({ type: 'DELETE_INGRESO_ALMACEN', id })
    toast('Ingreso eliminado'); setDetail(null); setConfirm(null)
  }

  // Totales KPI
  const totalIngresado = ingresos.reduce((s, ing) =>
    s + (ing.items||[]).reduce((ss, it) => ss + (it.cantidadRecibida||it.cantidad||0), 0), 0)
  const totalDespachado = transferencias.reduce((s, t) =>
    s + (t.items||[]).reduce((ss, it) => ss + (it.cantidad||0), 0), 0)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Almacén Central"
        subtitle="Control de ingresos, despachos y stock disponible"
        action={
          <div className="flex gap-2">
            <button onClick={() => setModal('ingreso')} className="btn-secondary flex items-center gap-2">
              <ArrowDownIcon className="w-4 h-4"/>Nuevo Ingreso
            </button>
            <button onClick={() => setModal('vale')} className="btn-primary flex items-center gap-2">
              <ArrowUpIcon className="w-4 h-4"/>Nueva Salida / Vale
            </button>
          </div>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Ingresos registrados', val: ingresos.length,    color: 'green',  Icon: ArrowDownIcon },
          { label: 'Vales de salida',      val: transferencias.length, color: 'orange', Icon: ArrowUpIcon },
          { label: 'Productos en stock',   val: stock.filter(s=>s.stock>0).length, color: 'blue', Icon: CubeIcon },
          { label: 'Uds. despachadas',     val: totalDespachado,    color: 'purple', Icon: DocumentArrowDownIcon },
        ].map(k => (
          <div key={k.label} className="card p-3 flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center
              ${k.color==='green'?'bg-green-50':k.color==='orange'?'bg-orange-50':k.color==='purple'?'bg-purple-50':'bg-blue-50'}`}>
              <k.Icon className={`w-4 h-4 ${k.color==='green'?'text-green-600':k.color==='orange'?'text-orange-500':k.color==='purple'?'text-purple-600':'text-[#1e3a5f]'}`}/>
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-gray-800">{k.val}</p>
              <p className="text-xs text-gray-500 leading-tight">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[TAB_STOCK, TAB_INGRESOS, TAB_VALES, TAB_INV].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab===t ? 'border-[#1e3a5f] text-[#1e3a5f]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>{t}</button>
        ))}
      </div>

      {/* ══ STOCK ══ */}
      {tab === TAB_STOCK && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-100">
              <th className="table-th">Producto</th>
              <th className="table-th">Código</th>
              <th className="table-th text-center">Und</th>
              <th className="table-th text-center">Total Ingresado</th>
              <th className="table-th text-center">Total Despachado</th>
              <th className="table-th text-center">Stock Mín.</th>
              <th className="table-th text-center">Precio Unit.</th>
              <th className="table-th text-center">Stock Actual</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {stock.map(s => {
                const bajo = s.stockMinimo > 0 && s.stock <= s.stockMinimo
                const critico = s.stock === 0
                const prod = productos.find(p => p.id === s.productoId)
                const alerta = prod?.alertaPrecio
                return (
                <tr key={s.productoId} className={`hover:bg-gray-50/50 ${critico ? 'bg-red-50' : bajo ? 'bg-yellow-50' : alerta?.activa ? 'bg-orange-50' : ''}`}>
                  <td className="table-td font-medium">
                    <div>
                      <span className="flex items-center gap-1.5">
                        {bajo && <ExclamationTriangleIcon className={`w-4 h-4 flex-shrink-0 ${critico ? 'text-red-500' : 'text-yellow-500'}`} title="Stock bajo mínimo"/>}
                        {alerta?.activa && <span title={`Precio subio ${alerta.pct}% vs referencia S/ ${Number(alerta.precioAnterior).toFixed(2)}`}>⚠️</span>}
                        {s.descripcion}
                      </span>
                      {alerta?.activa && (
                        <p className="text-[10px] text-orange-600 mt-0.5 font-medium">
                          Precio subio {alerta.pct}% — factura {alerta.factura} ({alerta.proveedor})
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="table-td font-mono text-xs text-gray-500">{s.codigo}</td>
                  <td className="table-td text-center text-gray-500">{s.unidad}</td>
                  <td className="table-td text-center text-green-700 font-semibold">{s.ingresado}</td>
                  <td className="table-td text-center text-orange-600 font-semibold">{s.salida}</td>
                  <td className="table-td text-center">
                    {s.stockMinimo > 0
                      ? <span className={`px-2 py-0.5 rounded text-xs font-semibold ${bajo ? (critico ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700') : 'bg-gray-100 text-gray-500'}`}>{s.stockMinimo}</span>
                      : <span className="text-gray-300 text-xs">—</span>
                    }
                  </td>
                  <td className="table-td text-center">
                    <button
                      type="button"
                      onClick={() => prod && setHistorialModal({ prod, historial: prod.historialPrecios || [] })}
                      className={`group inline-flex items-center gap-1 rounded px-2 py-0.5 transition ${prod ? 'cursor-pointer hover:bg-blue-50' : 'cursor-default'}`}
                      title={prod ? 'Ver historial de precios' : ''}
                    >
                      {alerta?.activa
                        ? <span className="text-xs font-bold text-orange-700">S/ {Number(alerta.precioNuevo).toFixed(2)} ↑</span>
                        : <span className="text-xs text-gray-600">{prod?.ultimoPrecio ? 'S/ ' + Number(prod.ultimoPrecio).toFixed(2) : '—'}</span>
                      }
                      {prod && <span className="text-[9px] text-blue-400 opacity-0 group-hover:opacity-100 transition">📋</span>}
                    </button>
                  </td>
                  <td className="table-td text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      critico ? 'bg-red-100 text-red-600' :
                      bajo    ? 'bg-yellow-100 text-yellow-700' :
                      s.stock > 0 ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>{s.stock}</span>
                  </td>
                </tr>
                )
              })}
              {stock.length === 0 && (
                <tr><td colSpan={7} className="table-td text-center text-gray-400 py-10">Sin movimientos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ══ INGRESOS ══ */}
      {tab === TAB_INGRESOS && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-100">
              <th className="table-th">N° Ingreso</th>
              <th className="table-th">Fecha</th>
              <th className="table-th">Tipo</th>
              <th className="table-th">Referencia</th>
              <th className="table-th text-center">Ítems</th>
              <th className="table-th"></th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {[...ingresos].sort((a,b)=>new Date(b.fecha)-new Date(a.fecha)).map(ing => {
                const tipoBadge = ing.tipo === 'Ajuste' ? 'bg-purple-100 text-purple-700' : ing.tipo === 'Traslado' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                const tipoLabel = ing.tipo || 'Factura'
                const ref = ing.tipo === 'Ajuste' ? (ing.motivo || '—') : ing.tipo === 'Traslado' ? ('Desde: ' + (ing.sedeOrigenNombre || '—')) : ((ing.facturaNumero || '—') + (ing.proveedorNombre ? ' · ' + ing.proveedorNombre : ''))
                return (
                <tr key={ing.id} className="hover:bg-gray-50/50">
                  <td className="table-td font-mono font-bold text-green-700 text-xs">{ing.numero}</td>
                  <td className="table-td">{fmtDate(ing.fecha)}</td>
                  <td className="table-td"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tipoBadge}`}>{tipoLabel}</span></td>
                  <td className="table-td text-xs text-gray-600 max-w-[200px] truncate">{ref}</td>
                  <td className="table-td text-center">{ing.items?.length ?? 0}</td>
                  <td className="table-td">
                    <button onClick={() => setDetail({ type:'ingreso', item: ing })}
                      className="text-blue-400 hover:text-blue-600 p-1"><EyeIcon className="w-4 h-4"/></button>
                  </td>
                </tr>
                )
              })}
              {ingresos.length === 0 && (
                <tr><td colSpan={6} className="table-td text-center text-gray-400 py-10">Sin ingresos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ══ VALES DE SALIDA ══ */}
      {tab === TAB_VALES && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="card flex gap-3 flex-wrap">
            <select className="input max-w-[180px]" value={filtroSede} onChange={e => setFiltroSede(e.target.value)}>
              <option value="">Todas las sedes</option>
              {sedesDestino.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
            <select className="input max-w-[160px]" value={filtroMes} onChange={e => setFiltroMes(e.target.value)}>
              <option value="">Todos los meses</option>
              {meses.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <input type="date" className="input max-w-[150px]" value={filtroDesde} onChange={e => setFiltroDesde(e.target.value)} />
              <span className="text-gray-400 text-sm">—</span>
              <input type="date" className="input max-w-[150px]" value={filtroHasta} onChange={e => setFiltroHasta(e.target.value)} />
            </div>
          </div>

          {/* Tabla vales */}
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                <th className="table-th">N° Vale</th>
                <th className="table-th">Fecha</th>
                <th className="table-th">Sede Destino</th>
                <th className="table-th">Área</th>
                <th className="table-th">Responsable</th>
                <th className="table-th text-center">Ítems</th>
                <th className="table-th text-right">Total</th>
                <th className="table-th">PDF</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {filteredVales.map(t => (
                  <tr key={t.id} className="hover:bg-gray-50/50">
                    <td className="table-td font-mono text-xs font-semibold text-[#1e3a5f]">{t.numeroVale}</td>
                    <td className="table-td">{fmtDate(t.fecha)}</td>
                    <td className="table-td">{sedeMap[t.sedeDestinoId]}</td>
                    <td className="table-td">{t.areaSolicitante}</td>
                    <td className="table-td">{t.responsable}</td>
                    <td className="table-td text-center">{t.items.length}</td>
                    <td className="table-td text-right font-semibold">{fmtMoney(t.total)}</td>
                    <td className="table-td">
                      <button onClick={() => descargarPDF(t)} className="text-blue-500 hover:text-blue-700">
                        <DocumentArrowDownIcon className="w-4 h-4"/>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredVales.length === 0 && (
                  <tr><td colSpan={8} className="table-td text-center text-gray-400 py-8">Sin resultados</td></tr>
                )}
              </tbody>
            </table>
          </div>


          {/* ── Traslados entre Sedes ── */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div>
                <h2 className="text-sm font-semibold text-gray-800">Traslados entre Sedes</h2>
                <p className="text-xs text-gray-400 mt-0.5">Movimientos de productos de una sede a otra</p>
              </div>
              <button onClick={() => setModal('traslado_sedes')}
                className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3">
                <ArrowUpIcon className="w-3.5 h-3.5 rotate-90"/>Nuevo Traslado
              </button>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                <th className="table-th">N°</th>
                <th className="table-th">Fecha</th>
                <th className="table-th">Origen</th>
                <th className="table-th">Destino</th>
                <th className="table-th">Motivo</th>
                <th className="table-th text-center">Ítems</th>
                <th className="table-th"></th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {[...(state.trasladosSedes||[])].sort((a,b)=>new Date(b.fecha)-new Date(a.fecha)).map(t => (
                  <tr key={t.id} className="hover:bg-gray-50/50">
                    <td className="table-td font-mono font-bold text-orange-600 text-xs">{t.numero}</td>
                    <td className="table-td">{fmtDate(t.fecha)}</td>
                    <td className="table-td text-sm text-gray-600">{t.sedeOrigenNombre}</td>
                    <td className="table-td text-sm font-medium text-[#1e3a5f]">{t.sedeDestinoNombre}</td>
                    <td className="table-td text-xs text-gray-500 max-w-[160px] truncate">{t.motivo||'—'}</td>
                    <td className="table-td text-center">{t.items?.length??0}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setDetail({ type:'traslado_sedes', item: t })}
                          className="text-blue-400 hover:text-blue-600 p-1"><EyeIcon className="w-4 h-4"/></button>
                        <button onClick={() => generarPDFTraslado(t, state.logo || null)}
                          className="text-gray-400 hover:text-[#1e3a5f] p-1" title="Descargar PDF">
                          <DocumentArrowDownIcon className="w-4 h-4"/>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {(state.trasladosSedes||[]).length === 0 && (
                  <tr><td colSpan={7} className="table-td text-center text-gray-400 py-8">Sin traslados registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Reporte mensual tabla */}
          <div className="card overflow-x-auto">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Reporte mensual por sede (S/)</h2>
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 border-b border-gray-100">
                <th className="table-th">Sede</th>
                {last6.map(m => <th key={m} className="table-th text-right">{m}</th>)}
                <th className="table-th text-right">Total</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {tablaMensual.map(row => {
                  const tot = Object.values(row.meses).reduce((s,v)=>s+v,0)
                  return (
                    <tr key={row.sede}>
                      <td className="table-td font-medium">{row.sede}</td>
                      {last6.map(m => <td key={m} className="table-td text-right">{row.meses[m]>0?fmtMoney(row.meses[m]):'—'}</td>)}
                      <td className="table-td text-right font-semibold">{fmtMoney(tot)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Gráfico */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Comparativo mensual por sede (S/)</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={reporteData} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={v => `S/ ${v.toFixed(2)}`} />
                <Legend />
                {sedesDestino.map((s,i) => (
                  <Bar key={s.id} dataKey={s.nombre} stackId="a" fill={COLORS[i%COLORS.length]}
                    radius={i===sedesDestino.length-1?[4,4,0,0]:[0,0,0,0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ══ INVENTARIO SEDES ══ */}
      {tab === TAB_INV && (() => {
        const prodMap = Object.fromEntries(productos.map(p => [p.id, p]))
        const categorias = [...new Set(productos.map(p => p.categoria).filter(Boolean))].sort()
        const inv = state.inventario[invSede] || {}
        const stockSede = Object.entries(inv).map(([pid, data]) => {
          const prod = prodMap[pid]
          if (!prod) return null
          if (invCategoria && prod.categoria !== invCategoria) return null
          return { ...prod, cantidad: data.cantidad, precio: data.precio, valorTotal: data.cantidad * data.precio }
        }).filter(Boolean).sort((a,b) => a.nombre.localeCompare(b.nombre))
        const totalValorizado = stockSede.reduce((s,p) => s+p.valorTotal, 0)
        const sedeName = sedes.find(s => s.id === invSede)?.nombre || ''
        return (
          <div className="space-y-3">
            <div className="card flex gap-3 flex-wrap">
              <select className="input max-w-[220px]" value={invSede} onChange={e => setInvSede(e.target.value)}>
                {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
              <select className="input max-w-[180px]" value={invCategoria} onChange={e => setInvCategoria(e.target.value)}>
                <option value="">Todas las categorías</option>
                {categorias.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-700">{sedeName} — {stockSede.length} productos</h2>
                <div className="bg-[#1e3a5f] text-white text-sm font-semibold px-4 py-1.5 rounded-lg">
                  Total valorizado: {fmtMoney(totalValorizado)}
                </div>
              </div>
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b border-gray-100">
                  <th className="table-th">Código</th>
                  <th className="table-th">Producto</th>
                  <th className="table-th">Categoría</th>
                  <th className="table-th">Unidad</th>
                  <th className="table-th text-right">Cantidad</th>
                  <th className="table-th text-right">Precio Unit.</th>
                  <th className="table-th text-right">Valor Total</th>
                  <th className="table-th">Alerta</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {stockSede.map(p => (
                    <tr key={p.id} className={`hover:bg-gray-50/50 ${p.cantidad===0?'bg-red-50/30':''}`}>
                      <td className="table-td font-mono text-xs">{p.codigo}</td>
                      <td className="table-td font-medium">{p.nombre}</td>
                      <td className="table-td">{p.categoria}</td>
                      <td className="table-td">{p.unidad}</td>
                      <td className={`table-td text-right font-semibold ${p.cantidad===0?'text-red-600':p.cantidad<=3?'text-amber-600':'text-gray-800'}`}>{p.cantidad}</td>
                      <td className="table-td text-right">{fmtMoney(p.precio)}</td>
                      <td className="table-td text-right font-medium">{fmtMoney(p.valorTotal)}</td>
                      <td className="table-td">
                        {p.cantidad===0 && <span className="flex items-center gap-1 text-red-600 text-xs"><ExclamationTriangleIcon className="w-4 h-4"/>Sin stock</span>}
                        {p.cantidad>0 && p.cantidad<=3 && <span className="flex items-center gap-1 text-amber-600 text-xs"><ExclamationTriangleIcon className="w-4 h-4"/>Stock bajo</span>}
                      </td>
                    </tr>
                  ))}
                  {stockSede.length===0 && <tr><td colSpan={8} className="table-td text-center text-gray-400 py-8">Sin productos en esta sede</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {/* Modales */}
      {modal === 'ingreso' && (
        <Modal title="Nuevo Ingreso al Almacén" onClose={() => setModal(null)} wide>
          <IngresoForm onClose={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'vale' && (
        <Modal title="Nueva Salida / Vale de Despacho" onClose={() => setModal(null)} wide>
          <ValeForm onClose={handleValeClose} />
        </Modal>
      )}
      {modal === 'traslado_sedes' && (
        <Modal title="Traslado entre Sedes" onClose={() => setModal(null)} wide>
          <TrasladoSedesForm onClose={() => setModal(null)} />
        </Modal>
      )}

      {detail?.type === 'ingreso' && (
        <Modal title={`Ingreso: ${detail.item.numero}`} onClose={() => setDetail(null)} wide>
          <IngresoDetail ing={detail.item} onClose={() => setDetail(null)}
            onDelete={isAdmin ? () => setConfirm({ id: detail.item.id, numero: detail.item.numero }) : null} />
        </Modal>
      )}
      {detail?.type === 'traslado_sedes' && (() => {
        const t = detail.item
        return (
          <Modal title={`Traslado: ${t.numero}`} onClose={() => setDetail(null)} wide>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-500 text-xs">Fecha:</span> <span className="font-medium">{fmtDate(t.fecha)}</span></div>
                <div><span className="text-gray-500 text-xs">N°:</span> <span className="font-mono font-bold text-orange-600">{t.numero}</span></div>
                <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 flex items-center gap-2">
                  <span className="font-semibold">{t.sedeOrigenNombre}</span>
                  <span>→</span>
                  <span className="font-semibold">{t.sedeDestinoNombre}</span>
                </div>
                {t.motivo && <div className="col-span-2 text-xs text-gray-600"><span className="text-gray-400">Motivo: </span>{t.motivo}</div>}
                {t.observaciones && <div className="col-span-2 text-xs text-gray-500 italic bg-gray-50 rounded p-2">{t.observaciones}</div>}
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead><tr className="bg-gray-50 border-b border-gray-100">
                    <th className="table-th">Producto</th>
                    <th className="table-th text-center">Und</th>
                    <th className="table-th text-center">Cantidad</th>
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {t.items?.map((it,i) => (
                      <tr key={i}>
                        <td className="table-td"><p className="font-medium">{it.descripcion}</p><p className="text-gray-400">{it.codigo}</p></td>
                        <td className="table-td text-center">{it.unidad}</td>
                        <td className="table-td text-center font-semibold text-orange-600">{it.cantidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <button onClick={() => generarPDFTraslado(t, state.logo || null)}
                  className="btn-primary flex items-center gap-1.5 text-xs">
                  <DocumentArrowDownIcon className="w-4 h-4"/>Descargar PDF
                </button>
                <button onClick={() => setDetail(null)} className="btn-secondary">Cerrar</button>
              </div>
            </div>
          </Modal>
        )
      })()}

      {confirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-sm text-center space-y-4">
            <p className="text-gray-700">¿Eliminar <strong>{confirm.numero}</strong>?</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={() => handleDeleteIng(confirm.id)} className="btn-danger flex-1">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal historial de precios */}
      {historialModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setHistorialModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="bg-[#1e3a5f] rounded-t-2xl px-6 py-4 flex items-center justify-between">
              <div>
                <p className="text-white font-bold text-sm">{historialModal.prod.nombre}</p>
                <p className="text-blue-200 text-xs">Historial de precios — {historialModal.prod.codigo}</p>
              </div>
              <button onClick={() => setHistorialModal(null)} className="text-white/70 hover:text-white">
                <XMarkIcon className="w-5 h-5"/>
              </button>
            </div>
            <div className="p-4">
              {historialModal.historial.length === 0 ? (
                <p className="text-center text-gray-400 py-6 text-sm">Sin historial de precios registrado</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <th className="px-3 py-2 text-left">Fecha</th>
                      <th className="px-3 py-2 text-right">Precio</th>
                      <th className="px-3 py-2 text-right">Anterior</th>
                      <th className="px-3 py-2 text-right">Var.</th>
                      <th className="px-3 py-2 text-left">Proveedor</th>
                      <th className="px-3 py-2 text-left">Factura</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {[...historialModal.historial].reverse().map((h, i) => {
                      const diff = h.precioAnterior > 0 ? ((h.precio - h.precioAnterior) / h.precioAnterior * 100) : null
                      const esUltimo = i === 0
                      return (
                        <tr key={h.id || i} className={esUltimo ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                          <td className="px-3 py-2 text-gray-600 text-xs">{h.fecha}</td>
                          <td className="px-3 py-2 text-right font-bold text-gray-800">S/ {Number(h.precio).toFixed(2)}</td>
                          <td className="px-3 py-2 text-right text-gray-400 text-xs">{h.precioAnterior > 0 ? 'S/ ' + Number(h.precioAnterior).toFixed(2) : '—'}</td>
                          <td className="px-3 py-2 text-right text-xs">
                            {diff !== null
                              ? <span className={`font-semibold ${diff > 0 ? 'text-red-600' : diff < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                  {diff > 0 ? '↑' : diff < 0 ? '↓' : ''} {Math.abs(diff).toFixed(1)}%
                                </span>
                              : <span className="text-gray-300">—</span>
                            }
                          </td>
                          <td className="px-3 py-2 text-gray-500 text-xs">{h.proveedor || '—'}</td>
                          <td className="px-3 py-2 text-gray-500 text-xs font-mono">{h.factura || '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-xs text-gray-400">{historialModal.historial.length} registro(s)</p>
                <p className="text-xs font-semibold text-[#1e3a5f]">
                  Precio actual: S/ {Number(historialModal.prod.ultimoPrecio || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal éxito vale */}
      {successVale && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-1">¡Salida registrada!</h3>
            <p className="text-sm text-gray-500 mb-4">Vale <span className="font-mono font-bold text-[#1e3a5f]">{successVale?.numeroVale}</span> generado</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => { generarPDFVale(successVale, state.sedes || [], state.logo) }} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <DocumentArrowDownIcon className="w-4 h-4" /> Descargar PDF
              </button>
              <button onClick={() => setSuccessVale(null)} className="btn-secondary flex-1">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
