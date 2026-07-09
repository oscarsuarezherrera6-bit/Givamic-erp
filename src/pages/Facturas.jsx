import { useState, useRef, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/layout/Toast'
import { fmtMoney, fmtDate, genId, todayISO } from '../utils/helpers'
import { extraerDatosFactura, fileToDataURL } from '../utils/parseFact'
import Modal from '../components/common/Modal'
import PageHeader from '../components/common/PageHeader'
import {
  PlusIcon, EyeIcon, TrashIcon, DocumentArrowUpIcon,
  ArrowPathIcon, ExclamationTriangleIcon, ClockIcon
} from '@heroicons/react/24/outline'

const EMPTY_ITEM = { id: '', productoId: '', producto: '', cantidad: 1, precioUnit: 0, unidad: 'Unidad' }

// ── Helpers de crédito ─────────────────────────────────────
function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + parseInt(days) || 0)
  return d.toISOString().slice(0, 10)
}

function estadoCredito(fechaVencimiento) {
  if (!fechaVencimiento) return null
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0)
  const vence = new Date(fechaVencimiento + 'T00:00:00')
  const dias = Math.floor((vence - hoy) / 86400000)
  if (dias < 0)  return { label: `Vencida (${Math.abs(dias)}d)`, color: 'red',    dias }
  if (dias <= 7) return { label: `Vence en ${dias}d`,             color: 'orange', dias }
  return           { label: `${dias}d restantes`,                  color: 'blue',   dias }
}

function CreditoBadge({ fechaVencimiento }) {
  const st = estadoCredito(fechaVencimiento)
  if (!st) return <span className="text-gray-300 text-xs">—</span>
  const cls = {
    red:    'bg-red-100 text-red-700 border-red-200',
    orange: 'bg-orange-100 text-orange-700 border-orange-200',
    blue:   'bg-blue-50 text-blue-700 border-blue-200',
  }[st.color]
  const Icon = st.color === 'red' ? ExclamationTriangleIcon : ClockIcon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      <Icon className="w-3 h-3" />
      {st.label}
    </span>
  )
}

// ── Formulario ─────────────────────────────────────────────
function FacturaForm({ onClose }) {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const fileRef = useRef()
  const [loading, setLoading] = useState(false)
  const [ocId, setOcId] = useState('')
  const [form, setForm] = useState({
    numero: '', proveedorId: '', fecha: todayISO(), estado: 'Pendiente',
    tipoPago: 'Contado', diasCredito: 15,
    items: [{ ...EMPTY_ITEM, id: genId() }], archivoPDF: null, nombreArchivo: ''
  })

  // Cargar datos de OC seleccionada
  const handleSelectOC = (selectedOcId) => {
    setOcId(selectedOcId)
    if (!selectedOcId) return
    const oc = (state.ordenesCompra||[]).find(o => o.id === selectedOcId)
    if (!oc) return
    setForm(p => ({
      ...p,
      proveedorId: oc.proveedorId || p.proveedorId,
      items: oc.items.map(it => ({ id: genId(), productoId: it.productoId, producto: it.descripcion, cantidad: it.cantidad, precioUnit: it.precioUnit, unidad: it.unidad }))
    }))
  }

  // OCs disponibles para vincular (sin factura aún)
  const ocsDisponibles = (state.ordenesCompra||[]).filter(o => !o.facturaId && o.estado !== 'Anulada')

  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const fechaVencimientoCalc = form.tipoPago === 'Crédito' && form.fecha
    ? addDays(form.fecha, form.diasCredito)
    : null

  const setItem = (idx, k, v) => {
    const items = form.items.map((it, i) => {
      if (i !== idx) return it
      const next = { ...it, [k]: v }
      if (k === 'productoId') {
        const prod = state.productos.find(p => p.id === v)
        if (prod) { next.producto = prod.nombre; next.unidad = prod.unidad; next.precioUnit = prod.ultimoPrecio || 0 }
      }
      return next
    })
    setForm(p => ({ ...p, items }))
  }
  const addItem = () => setForm(p => ({ ...p, items: [...p.items, { ...EMPTY_ITEM, id: genId() }] }))
  const removeItem = (idx) => setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))
  const total = form.items.reduce((s, it) => s + (it.cantidad || 0) * (it.precioUnit || 0), 0)

  const handlePDF = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true)

    // 1) Adjuntar archivo siempre — esto nunca falla
    let dataURL
    try {
      dataURL = await fileToDataURL(file)
      setForm(p => ({ ...p, archivoPDF: dataURL, nombreArchivo: file.name }))
    } catch {
      toast('No se pudo cargar el archivo.', 'error')
      setLoading(false); e.target.value = ''; return
    }

    // 2) Intentar extraer datos (opcional — PDF queda adjunto aunque falle)
    toast('Leyendo PDF...', 'warning')
    try {
      const datos = await extraerDatosFactura(file)
      let proveedorId = form.proveedorId
      if (datos.rucProveedor) {
        const prov = state.proveedores.find(p => p.ruc === datos.rucProveedor)
        if (prov) proveedorId = prov.id
      }
      if (!proveedorId && datos.nombreProveedor) {
        const prov = state.proveedores.find(p =>
          p.nombre.toLowerCase().includes(datos.nombreProveedor.toLowerCase().slice(0, 8))
        )
        if (prov) proveedorId = prov.id
      }
      const itemsMapped = datos.items.length > 0
        ? datos.items.map(it => {
            const prod = state.productos.find(p =>
              p.nombre.toLowerCase().includes(it.descripcion.toLowerCase().slice(0, 6)) ||
              it.descripcion.toLowerCase().includes(p.nombre.toLowerCase().slice(0, 6))
            )
            return { id: genId(), productoId: prod?.id || '', producto: prod?.nombre || it.descripcion, cantidad: it.cantidad, precioUnit: it.precioUnit, unidad: it.unidad || prod?.unidad || 'Unidad' }
          })
        : form.items
      setForm(p => ({ ...p, numero: datos.numero || p.numero, proveedorId: proveedorId || p.proveedorId, fecha: datos.fecha || p.fecha, items: itemsMapped }))
      const found = [datos.numero, datos.rucProveedor, datos.fecha, datos.items.length > 0].filter(Boolean).length
      toast(`PDF leído: ${found}/4 campos detectados${datos.items.length > 0 ? ` · ${datos.items.length} ítems` : ''}`, 'success')
    } catch {
      toast('PDF adjuntado. Completa los datos del formulario manualmente.', 'warning')
    } finally { setLoading(false); e.target.value = '' }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.numero || !form.proveedorId || form.items.length === 0)
      return toast('Completa todos los campos', 'error')
    dispatch({ type: 'ADD_FACTURA', payload: { ...form, total, totalGeneral: total, ocId: ocId || null, fechaVencimiento: fechaVencimientoCalc } })
    toast('Factura registrada correctamente')
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Vincular OC */}
      {ocsDisponibles.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
          <label className="text-xs font-semibold text-blue-700 block mb-1.5">📋 Vincular a Orden de Compra (opcional)</label>
          <select className="input text-sm" value={ocId} onChange={e => handleSelectOC(e.target.value)}>
            <option value="">Sin vinculación a OC</option>
            {ocsDisponibles.map(oc => (
              <option key={oc.id} value={oc.id}>{oc.numero} — {oc.proveedor} ({oc.items.length} ítems)</option>
            ))}
          </select>
          {ocId && <p className="text-xs text-blue-600 mt-1">✓ Proveedor e ítems autocargados desde la OC. Los precios están bloqueados (vienen de la OC).</p>}
        </div>
      )}

      {/* Carga PDF */}
      <div className={`border-2 border-dashed rounded-xl p-4 text-center transition-colors ${form.archivoPDF ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-blue-300 bg-gray-50'}`}>
        {form.archivoPDF ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-green-700">
              <span className="text-xl">📄</span>
              <span className="font-medium">{form.nombreArchivo}</span>
              <span className="text-xs text-green-500">— datos extraídos</span>
            </div>
            <button type="button" onClick={() => fileRef.current.click()} className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600">
              <ArrowPathIcon className="w-3.5 h-3.5"/>Cambiar
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current.click()} disabled={loading} className="flex flex-col items-center gap-2 w-full">
            {loading
              ? <><ArrowPathIcon className="w-6 h-6 text-blue-500 animate-spin"/><span className="text-sm text-blue-500">Leyendo PDF...</span></>
              : <><DocumentArrowUpIcon className="w-6 h-6 text-gray-400"/><span className="text-sm text-gray-500">Cargar factura PDF para autocompletar</span><span className="text-xs text-gray-400">Extrae N°, proveedor, fecha e ítems</span></>
            }
          </button>
        )}
        <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handlePDF} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">N° de Factura *</label>
          <input className="input" value={form.numero} onChange={e => setField('numero', e.target.value)} placeholder="F001-00001" required />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Proveedor *</label>
          <select className="input" value={form.proveedorId} onChange={e => setField('proveedorId', e.target.value)} required>
            <option value="">Seleccionar...</option>
            {state.proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Fecha Factura</label>
          <input className="input" type="date" value={form.fecha} onChange={e => setField('fecha', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Estado</label>
          <select className="input" value={form.estado} onChange={e => setField('estado', e.target.value)}>
            <option>Pendiente</option><option>Recibida</option><option>Anulada</option>
          </select>
        </div>

        {/* ── Tipo de pago ── */}
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Tipo de Pago</label>
          <select className="input" value={form.tipoPago} onChange={e => setField('tipoPago', e.target.value)}>
            <option value="Contado">Contado</option>
            <option value="Crédito">Crédito</option>
          </select>
        </div>
        {form.tipoPago === 'Crédito' && (
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Días de Crédito</label>
            <select className="input" value={form.diasCredito}
              onChange={e => setField('diasCredito', parseInt(e.target.value))}>
              {[7, 10, 15, 30, 45, 60].map(d => <option key={d} value={d}>{d} días</option>)}
            </select>
          </div>
        )}
        {form.tipoPago === 'Crédito' && fechaVencimientoCalc && (
          <div className="col-span-2">
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
              <ClockIcon className="w-4 h-4 text-orange-500 shrink-0" />
              <span className="text-sm text-orange-700">
                Fecha de vencimiento: <strong>{fmtDate(fechaVencimientoCalc)}</strong>
                <span className="text-xs text-orange-500 ml-2">({form.diasCredito} días desde la factura)</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Ítems */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-700">Ítems de la factura{ocId && <span className="ml-2 text-[10px] font-normal text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">🔒 Precios bloqueados — vinculado a OC</span>}</p>
          {!ocId && (
            <button type="button" onClick={addItem} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              <PlusIcon className="w-3.5 h-3.5"/>Agregar ítem
            </button>
          )}
        </div>
        <div className="space-y-2">
          {form.items.map((it, idx) => (
            <div key={it.id} className="grid grid-cols-12 gap-2 items-end bg-gray-50 p-2 rounded-lg">
              <div className="col-span-4">
                {idx === 0 && <label className="text-xs text-gray-500 block mb-1">Producto</label>}
                <select className="input text-xs" value={it.productoId} onChange={e => setItem(idx, 'productoId', e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {state.productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
                {!it.productoId && it.producto && (
                  <p className="text-xs text-amber-600 mt-0.5 truncate" title={it.producto}>⚠ "{it.producto}"</p>
                )}
              </div>
              <div className="col-span-2">
                {idx === 0 && <label className="text-xs text-gray-500 block mb-1">Unidad</label>}
                <input className="input text-xs" value={it.unidad} onChange={e => setItem(idx, 'unidad', e.target.value)} />
              </div>
              <div className="col-span-2">
                {idx === 0 && <label className="text-xs text-gray-500 block mb-1">Cantidad</label>}
                <input className="input text-xs" type="number" min="1" value={it.cantidad} onChange={e => setItem(idx, 'cantidad', parseFloat(e.target.value)||0)} />
              </div>
              <div className="col-span-2">
                {idx === 0 && <label className="text-xs text-gray-500 block mb-1">Precio Unit.</label>}
                {ocId
                  ? <p className="input text-xs bg-gray-100 text-gray-600 cursor-not-allowed">{fmtMoney(it.precioUnit)}</p>
                  : <input className="input text-xs" type="text" inputMode="decimal" value={it._precioRaw ?? (it.precioUnit === 0 ? '' : String(it.precioUnit))} onChange={e => { const raw = e.target.value; if (/^\d*\.?\d*$/.test(raw)) { const items = form.items.map((x,i) => i===idx ? {...x, _precioRaw: raw, precioUnit: parseFloat(raw)||0} : x); setForm(p=>({...p,items})) } }} onBlur={() => { const items = form.items.map((x,i) => i===idx ? {...x, _precioRaw: undefined, precioUnit: parseFloat(String(x._precioRaw ?? x.precioUnit))||0} : x); setForm(p=>({...p,items})) }} />
                }
              </div>
              <div className="col-span-1">
                {idx === 0 && <label className="text-xs text-gray-500 block mb-1">Total</label>}
                <p className="text-xs font-medium text-gray-700 pt-2">{fmtMoney(it.cantidad*it.precioUnit)}</p>
              </div>
              {!ocId && (
              <div className="col-span-1 flex justify-end">
                <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 pt-1">
                  <TrashIcon className="w-4 h-4"/>
                </button>
              </div>
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-end mt-2">
          <p className="text-sm font-semibold text-gray-800">Total: {fmtMoney(total)}</p>
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
        <button type="submit" className="btn-primary">Guardar Factura</button>
      </div>
    </form>
  )
}

// ── Detalle ────────────────────────────────────────────────
function FacturaDetail({ factura, onClose }) {
  const { state } = useApp()
  const prov = state.proveedores.find(p => p.id === factura.proveedorId)
  const total = factura.items.reduce((s, it) => s + it.cantidad * it.precioUnit, 0)
  const estadoColor = { Pendiente: 'bg-yellow-100 text-yellow-700', Recibida: 'bg-green-100 text-green-700', Anulada: 'bg-red-100 text-red-700' }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-gray-500">N° Factura:</span> <span className="font-semibold font-mono">{factura.numero}</span></div>
        <div><span className="text-gray-500">Proveedor:</span> <span className="font-semibold">{prov?.nombre}</span></div>
        <div><span className="text-gray-500">Fecha:</span> {fmtDate(factura.fecha)}</div>
        <div><span className="text-gray-500">Estado:</span> <span className={`badge ${estadoColor[factura.estado]}`}>{factura.estado}</span></div>
        <div><span className="text-gray-500">Tipo de Pago:</span> <span className="font-semibold">{factura.tipoPago || 'Contado'}</span></div>
        {factura.tipoPago === 'Crédito' && factura.fechaVencimiento && (
          <div>
            <span className="text-gray-500">Vence:</span>{' '}
            <span className={`font-semibold ${estadoCredito(factura.fechaVencimiento)?.color === 'red' ? 'text-red-600' : estadoCredito(factura.fechaVencimiento)?.color === 'orange' ? 'text-orange-600' : 'text-blue-700'}`}>
              {fmtDate(factura.fechaVencimiento)}
            </span>
            {' '}<CreditoBadge fechaVencimiento={factura.fechaVencimiento} />
          </div>
        )}
      </div>

      {factura.archivoPDF && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
            <span className="text-xs font-medium text-gray-600">📄 {factura.nombreArchivo || 'Factura original'}</span>
            <a href={factura.archivoPDF} download={factura.nombreArchivo || 'factura.pdf'} className="text-xs text-blue-600 hover:underline">Descargar</a>
          </div>
          <iframe src={factura.archivoPDF} className="w-full h-72" title="PDF Factura" />
        </div>
      )}

      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs min-w-[380px]">
          <thead><tr className="bg-gray-50">
            <th className="table-th">Producto</th><th className="table-th">Unidad</th>
            <th className="table-th text-right">Cant.</th><th className="table-th text-right">P. Unit.</th>
            <th className="table-th text-right">Total</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {factura.items.map((it, i) => (
              <tr key={i}>
                <td className="table-td">{it.producto}</td>
                <td className="table-td">{it.unidad}</td>
                <td className="table-td text-right">{it.cantidad}</td>
                <td className="table-td text-right">{fmtMoney(it.precioUnit)}</td>
                <td className="table-td text-right font-medium">{fmtMoney(it.cantidad*it.precioUnit)}</td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-semibold">
              <td className="table-td" colSpan={4}>TOTAL</td>
              <td className="table-td text-right">{fmtMoney(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="flex justify-end"><button onClick={onClose} className="btn-secondary">Cerrar</button></div>
    </div>
  )
}

// ── Página principal ───────────────────────────────────────
export default function Facturas() {
  const { state, dispatch } = useApp()
  const { isContador } = useAuth()
  const toast = useToast()
  const [showForm, setShowForm] = useState(false)
  const [detail, setDetail] = useState(null)
  const [search, setSearch] = useState('')
  const [filtroMes, setFiltroMes] = useState('')

  const provMap = Object.fromEntries(state.proveedores.map(p => [p.id, p.nombre]))
  const estadoColor = { Pendiente: 'bg-yellow-100 text-yellow-700', Recibida: 'bg-green-100 text-green-700', Anulada: 'bg-red-100 text-red-700' }
  const meses = [...new Set(state.facturas.map(f => f.fecha.slice(0,7)))].sort().reverse()

  const filtered = state.facturas
    .filter(f => !filtroMes || f.fecha.startsWith(filtroMes))
    .filter(f => !search || f.numero.toLowerCase().includes(search.toLowerCase()) || (provMap[f.proveedorId]||'').toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => new Date(b.fecha)-new Date(a.fecha))

  // Alertas de crédito
  const alertasCredito = useMemo(() =>
    state.facturas.filter(f => {
      if (f.tipoPago !== 'Crédito' || !f.fechaVencimiento) return false
      const st = estadoCredito(f.fechaVencimiento)
      return st?.color === 'red' || st?.color === 'orange'
    })
  , [state.facturas])

  const cambiarEstado = (f, estado) => {
    dispatch({ type: 'UPDATE_FACTURA_ESTADO', id: f.id, estado })
    toast(`Factura marcada como ${estado}`)
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Facturas de Compra" subtitle="Registro de facturas de proveedores"
        action={!isContador && <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-4 h-4"/>Nueva Factura
        </button>} />

      {/* Alertas crédito */}
      {alertasCredito.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
          <ExclamationTriangleIcon className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-sm text-orange-700">
              {alertasCredito.length} factura{alertasCredito.length > 1 ? 's' : ''} a crédito con vencimiento próximo o vencida{alertasCredito.length > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-gray-600 mt-0.5">
              {alertasCredito.map(f => `${f.numero} (${fmtDate(f.fechaVencimiento)})`).join(' · ')}
            </p>
          </div>
        </div>
      )}

      <div className="card flex gap-3 flex-wrap">
        <input className="input max-w-xs" placeholder="Buscar por número o proveedor..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input max-w-[180px]" value={filtroMes} onChange={e => setFiltroMes(e.target.value)}>
          <option value="">Todos los meses</option>
          {meses.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="card p-0 overflow-hidden">

        {/* ── Móvil: cards ── */}
        <div className="md:hidden divide-y divide-gray-100">
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">Sin resultados</p>
          )}
          {filtered.map(f => {
            const total = f.items.reduce((s,it) => s+it.cantidad*it.precioUnit, 0)
            const stCred = f.tipoPago === 'Crédito' ? estadoCredito(f.fechaVencimiento) : null
            const rowBg = stCred?.color === 'red' ? 'bg-red-50/40' : stCred?.color === 'orange' ? 'bg-orange-50/30' : ''
            return (
              <div key={f.id} className={`p-3 ${rowBg}`}>
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    {/* N° + Estado */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-mono text-xs font-bold text-[#1e3a5f]">{f.numero}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${estadoColor[f.estado] || 'bg-gray-100 text-gray-600'}`}>{f.estado}</span>
                      {f.archivoPDF && <span className="text-green-500 text-sm" title="PDF adjunto">📄</span>}
                    </div>
                    {/* Proveedor */}
                    <p className="text-sm font-semibold text-gray-800 truncate">{provMap[f.proveedorId]}</p>
                    {/* Meta */}
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-gray-500">{fmtDate(f.fecha)}</span>
                      <span className="text-xs font-bold text-gray-700">{fmtMoney(total)}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${f.tipoPago === 'Crédito' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                        {f.tipoPago || 'Contado'}
                      </span>
                    </div>
                    {/* Vencimiento crédito */}
                    {f.tipoPago === 'Crédito' && f.fechaVencimiento && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">Vence: {fmtDate(f.fechaVencimiento)}</span>
                        <CreditoBadge fechaVencimiento={f.fechaVencimiento} />
                      </div>
                    )}
                    {/* Cambiar estado (no contador) */}
                    {!isContador && (
                      <select className="mt-1.5 text-xs border border-gray-200 rounded px-2 py-1" value={f.estado}
                        onChange={e => cambiarEstado(f, e.target.value)}>
                        <option>Pendiente</option><option>Recibida</option><option>Anulada</option>
                      </select>
                    )}
                  </div>
                  {/* Acción */}
                  <button onClick={() => setDetail(f)} className="text-blue-500 hover:text-blue-700 p-1.5 flex-shrink-0">
                    <EyeIcon className="w-5 h-5"/>
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Desktop: tabla completa ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-100">
              <th className="table-th">N° Factura</th>
              <th className="table-th">Proveedor</th>
              <th className="table-th">Fecha</th>
              <th className="table-th">Pago</th>
              <th className="table-th">Vencimiento</th>
              <th className="table-th text-right">Total</th>
              <th className="table-th">Estado</th>
              <th className="table-th">PDF</th>
              <th className="table-th">Ver</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(f => {
                const total = f.items.reduce((s,it) => s+it.cantidad*it.precioUnit, 0)
                const stCred = f.tipoPago === 'Crédito' ? estadoCredito(f.fechaVencimiento) : null
                const rowBg = stCred?.color === 'red' ? 'bg-red-50/30' : stCred?.color === 'orange' ? 'bg-orange-50/20' : ''
                return (
                  <tr key={f.id} className={`hover:bg-gray-50/50 ${rowBg}`}>
                    <td className="table-td font-mono text-xs">{f.numero}</td>
                    <td className="table-td">{provMap[f.proveedorId]}</td>
                    <td className="table-td">{fmtDate(f.fecha)}</td>
                    <td className="table-td">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${f.tipoPago === 'Crédito' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                        {f.tipoPago || 'Contado'}
                      </span>
                    </td>
                    <td className="table-td">
                      {f.tipoPago === 'Crédito' && f.fechaVencimiento
                        ? <div className="space-y-0.5">
                            <p className="text-xs text-gray-600">{fmtDate(f.fechaVencimiento)}</p>
                            <CreditoBadge fechaVencimiento={f.fechaVencimiento} />
                          </div>
                        : <span className="text-gray-300 text-xs">—</span>
                      }
                    </td>
                    <td className="table-td text-right font-medium">{fmtMoney(total)}</td>
                    <td className="table-td">
                      {isContador
                        ? <span className={`text-xs px-2 py-0.5 rounded font-medium ${estadoColor[f.estado] || ''}`}>{f.estado}</span>
                        : <select className="text-xs border border-gray-200 rounded px-2 py-1" value={f.estado}
                            onChange={e => cambiarEstado(f, e.target.value)}>
                            <option>Pendiente</option><option>Recibida</option><option>Anulada</option>
                          </select>
                      }
                    </td>
                    <td className="table-td">
                      {f.archivoPDF
                        ? <span title="PDF adjunto" className="text-green-500 text-base">📄</span>
                        : <span className="text-gray-300 text-xs">—</span>
                      }
                    </td>
                    <td className="table-td">
                      <button onClick={() => setDetail(f)} className="text-blue-500 hover:text-blue-700">
                        <EyeIcon className="w-4 h-4"/>
                      </button>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && <tr><td colSpan={9} className="table-td text-center text-gray-400 py-8">Sin resultados</td></tr>}
            </tbody