import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/layout/Toast'
import { fmtMoney, fmtDate, genId, todayISO } from '../utils/helpers'
import { generarPDFOC } from '../utils/pdfOC'
import Modal from '../components/common/Modal'
import Confirm from '../components/common/Confirm'
import PageHeader from '../components/common/PageHeader'
import ExportMenu, { useSelection, Checkbox } from '../components/common/ExportMenu'
import {
  PlusIcon, EyeIcon, TrashIcon, PencilSquareIcon,
  DocumentCheckIcon, DocumentTextIcon, ClipboardDocumentCheckIcon,
  ArrowRightIcon, CheckCircleIcon, ClockIcon, DocumentArrowDownIcon,
  ChevronDownIcon, ChevronUpIcon, XCircleIcon
} from '@heroicons/react/24/outline'

const OC_STYLE = {
  'Borrador':               'bg-gray-100 text-gray-600 border-gray-200',
  'Pendiente Aprobación':   'bg-amber-100 text-amber-700 border-amber-200',
  'Pendiente Gerencia':     'bg-purple-100 text-purple-700 border-purple-200',
  'Aprobada':               'bg-teal-100 text-teal-700 border-teal-200',
  'Rechazada':              'bg-red-100 text-red-600 border-red-200',
  'Emitida':                'bg-blue-100 text-blue-700 border-blue-200',
  'Facturada':              'bg-purple-100 text-purple-700 border-purple-200',
  'Pendiente Inspección':   'bg-orange-100 text-orange-700 border-orange-200',
  'Completada':             'bg-green-100 text-green-700 border-green-200',
  'Anulada':                'bg-red-100 text-red-700 border-red-200',
}

const EMPTY_ITEM = { id: '', productoId: '', descripcion: '', codigo: '', unidad: 'Unidad', cantidad: 1, precioUnit: 0, total: 0 }

function StepBar({ oc }) {
  const aprobado = ['Aprobada','Emitida','Facturada','Pendiente Inspección','Completada'].includes(oc.estado)
  const emitido  = ['Emitida','Facturada','Pendiente Inspección','Completada'].includes(oc.estado)
  const rechazada = oc.estado === 'Rechazada'

  const steps = [
    {
      key: 'aprov',
      label: rechazada ? 'Rechazada' : (
        oc.estado === 'Pendiente Aprobación' ? 'Pend. Admin' :
        oc.estado === 'Pendiente Gerencia'   ? 'Pend. Gerencia' :
        oc.estado === 'Borrador' ? 'Borrador' : 'Aprobada'
      ),
      done: aprobado,
      bad: rechazada,
      pending: ['Pendiente Aprobación','Pendiente Gerencia'].includes(oc.estado),
    },
    { key: 'oc',   label: 'OC Emitida',   done: emitido,         bad: false, pending: false },
    { key: 'fact', label: 'Facturado',     done: !!oc.facturaId,  bad: false, pending: false },
    { key: 'insp', label: 'Inspeccionado', done: !!oc.conformidadId, bad: false, pending: false },
    { key: 'done', label: 'Completado',    done: oc.estado === 'Completada', bad: false, pending: false },
  ]

  return (
    <div className="flex items-center gap-0 my-4">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center flex-1">
          <div className={`flex items-center gap-1.5 flex-1 ${i > 0 ? 'pl-2' : ''}`}>
            {i > 0 && <div className={`h-0.5 flex-1 ${steps[i-1].done ? 'bg-green-400' : 'bg-gray-200'}`} />}
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0
              ${s.bad ? 'bg-red-500 text-white' : s.done ? 'bg-green-500 text-white' : s.pending ? 'bg-amber-400 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {s.bad ? '✗' : s.done ? '✓' : s.pending ? '…' : i+1}
            </div>
            <span className={`text-xs ml-1 whitespace-nowrap ${s.bad ? 'text-red-600 font-medium' : s.done ? 'text-green-700 font-medium' : s.pending ? 'text-amber-700 font-medium' : 'text-gray-400'}`}>
              {s.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

function Section({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button type="button" onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors">
        {title}
        {open ? <ChevronUpIcon className="w-4 h-4 text-gray-400"/> : <ChevronDownIcon className="w-4 h-4 text-gray-400"/>}
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  )
}

// ── Formulario OC ──────────────────────────────────────────
function OCForm({ initial, onClose }) {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const isEdit = !!initial?.id

  const [form, setForm] = useState(initial || {
    fecha: todayISO(), fechaEntregaEsperada: '',
    proveedorId: '', proveedor: '',
    area: '', sedeId: '', aprobadoPor: '',
    items: [{ ...EMPTY_ITEM, id: genId() }],
    estado: 'Borrador', observaciones: '', reqOrigenId: '',
    empresaId: (state.empresas||[])[0]?.id || '',
    tipo: 'Compra',
    moneda: 'Soles (PEN)',
    numeroReqInterno: '',
    responsableSolicitante: '',
    proveedorAprobado: 'Sí',
    condicionProveedor: 'Aprobado',
    tiempoEntrega: '',
    lugarEntrega: '',
    formaPagoOC: '',
    otroCondicion: '',
    comentarios: '',
    elaboradoPor: '',
    cargoElaborado: '',
    revisadoPor: '',
    cargoRevisado: '',
  })

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const setItem = (idx, k, v) => {
    const items = form.items.map((it, i) => {
      if (i !== idx) return it
      const next = { ...it, [k]: v }
      if (k === 'productoId') {
        const prod = state.productos.find(p => p.id === v)
        if (prod) { next.descripcion = prod.nombre; next.codigo = prod.codigo; next.unidad = prod.unidad; next.precioUnit = prod.ultimoPrecio || 0 }
      }
      if (k === 'cantidad' || k === 'precioUnit') {
        const c = k === 'cantidad' ? parseFloat(v)||0 : parseFloat(next.cantidad)||0
        const p = k === 'precioUnit' ? parseFloat(v)||0 : parseFloat(next.precioUnit)||0
        next.total = c * p
      }
      return next
    })
    setForm(p => ({ ...p, items }))
  }

  const addItem = () => setForm(p => ({ ...p, items: [...p.items, { ...EMPTY_ITEM, id: genId() }] }))
  const removeItem = (idx) => setForm(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))

  const totalNeto = form.items.reduce((s, it) => s + (it.total||0), 0)
  const totalIGV = totalNeto * 0.18
  const totalGeneral = totalNeto + totalIGV

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.proveedorId || form.items.some(it => !it.productoId))
      return toast('Selecciona proveedor y todos los productos', 'error')
    const prov = state.proveedores.find(p => p.id === form.proveedorId)
    const payload = { ...form, proveedor: prov?.nombre || '', totalNeto, totalIGV, totalGeneral }
    if (isEdit) {
      dispatch({ type: 'UPDATE_OC', id: initial.id, payload })
      toast('OC actualizada', 'success')
    } else {
      dispatch({ type: 'ADD_OC', payload })
      toast('OC creada en borrador', 'success')
    }
    onClose()
  }

  const empresas = state.empresas || []

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Proveedor *</label>
          <select className="input" value={form.proveedorId} onChange={e => set('proveedorId', e.target.value)} required>
            <option value="">Seleccionar...</option>
            {state.proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Fecha OC</label>
          <input className="input" type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Fecha Entrega Esperada</label>
          <input className="input" type="date" value={form.fechaEntregaEsperada} onChange={e => set('fechaEntregaEsperada', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Área Solicitante</label>
          <input className="input" value={form.area} onChange={e => set('area', e.target.value)} placeholder="Almacén, Operaciones..." />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Sede</label>
          <select className="input" value={form.sedeId} onChange={e => set('sedeId', e.target.value)}>
            <option value="">Central / Todas</option>
            {state.sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-xs font-medium text-gray-600 block mb-1">Requerimiento de Origen (opcional)</label>
          <select className="input" value={form.reqOrigenId} onChange={e => set('reqOrigenId', e.target.value)}>
            <option value="">— Sin requerimiento vinculado —</option>
            {(state.requerimientos || []).filter(r => r.estado === 'Pendiente').map(r => (
              <option key={r.id} value={r.id}>{r.numero} · {r.responsable} · {r.areaSolicitante || 'Sin área'} ({r.items?.length || 0} ítems)</option>
            ))}
          </select>
          {form.reqOrigenId && (
            <p className="text-xs text-blue-600 mt-1">✓ Al crear esta OC, el REQ pasará a estado "En Compra"</p>
          )}
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Observaciones</label>
          <input className="input" value={form.observaciones} onChange={e => set('observaciones', e.target.value)} placeholder="Notas adicionales..." />
        </div>
      </div>

      <Section title="Datos adicionales para PDF (SIG-FO-022)" defaultOpen={false}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Empresa emisora</label>
            <select className="input" value={form.empresaId} onChange={e => set('empresaId', e.target.value)}>
              {empresas.map(e => <option key={e.id} value={e.id}>{e.razonSocial}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">N° Req. Interno</label>
            <input className="input" value={form.numeroReqInterno} onChange={e => set('numeroReqInterno', e.target.value)} placeholder="REQ-0001" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Responsable Solicitante</label>
            <input className="input" value={form.responsableSolicitante} onChange={e => set('responsableSolicitante', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Tiempo de entrega</label>
            <input className="input" value={form.tiempoEntrega} onChange={e => set('tiempoEntrega', e.target.value)} placeholder="7 días hábiles" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Lugar de entrega</label>
            <input className="input" value={form.lugarEntrega} onChange={e => set('lugarEntrega', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Forma de pago</label>
            <input className="input" value={form.formaPagoOC} onChange={e => set('formaPagoOC', e.target.value)} placeholder="Crédito 30 días" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Elaborado por</label>
            <input className="input" value={form.elaboradoPor} onChange={e => set('elaboradoPor', e.target.value)} />
          </div>

        </div>
      </Section>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-700">Productos / Servicios a solicitar</p>
          <button type="button" onClick={addItem} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            <PlusIcon className="w-3.5 h-3.5"/>Agregar ítem
          </button>
        </div>
        <div className="space-y-2">
          {form.items.map((it, idx) => (
            <div key={it.id} className="grid grid-cols-12 gap-2 items-end border border-gray-100 rounded-lg p-2 bg-gray-50/50">
              <div className="col-span-4">
                {idx === 0 && <p className="text-[10px] text-gray-500 mb-1">Producto</p>}
                <select className="input text-xs" value={it.productoId} onChange={e => setItem(idx, 'productoId', e.target.value)} required>
                  <option value="">Seleccionar...</option>
                  {state.productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                {idx === 0 && <p className="text-[10px] text-gray-500 mb-1">UM</p>}
                <input className="input text-xs" value={it.unidad} onChange={e => setItem(idx, 'unidad', e.target.value)} />
              </div>
              <div className="col-span-2">
                {idx === 0 && <p className="text-[10px] text-gray-500 mb-1">Cant.</p>}
                <input className="input text-xs text-right" type="number" min="1" value={it.cantidad} onChange={e => setItem(idx, 'cantidad', e.target.value)} />
              </div>
              <div className="col-span-2">
                {idx === 0 && <p className="text-[10px] text-gray-500 mb-1">P. Unit.</p>}
                <input className="input text-xs text-right" type="number" min="0" step="0.01" value={it.precioUnit} onChange={e => setItem(idx, 'precioUnit', e.target.value)} />
              </div>
              <div className="col-span-1">
                {idx === 0 && <p className="text-[10px] text-gray-500 mb-1">Total</p>}
                <p className="text-xs font-medium text-right py-2">{fmtMoney(it.total||0)}</p>
              </div>
              <div className="col-span-1 flex justify-end">
                <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 p-1">
                  <TrashIcon className="w-3.5 h-3.5"/>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-3 gap-4 text-sm border-t border-gray-100 pt-3">
          <span className="text-gray-500">Neto: <strong>{fmtMoney(totalNeto)}</strong></span>
          <span className="text-gray-500">IGV 18%: <strong>{fmtMoney(totalIGV)}</strong></span>
          <span className="text-[#1e3a5f] font-bold">Total: {fmtMoney(totalGeneral)}</span>
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
        <button type="submit" className="btn-primary">{isEdit ? 'Guardar cambios' : 'Crear OC (Borrador)'}</button>
      </div>
    </form>
  )
}

// ── Panel de aprobación reutilizable ───────────────────────
function ApprovalPanel({ title, color, oc, onAprobar, onRechazar }) {
  const [comentario, setComentario] = useState('')
  const [motivo, setMotivo] = useState('')
  const [mode, setMode] = useState(null) // 'aprobar' | 'rechazar'

  if (mode === 'rechazar') {
    return (
      <div className={`rounded-xl border p-4 space-y-3 border-red-200 bg-red-50`}>
        <p className="text-sm font-semibold text-red-800">Rechazar OC {oc.numero}</p>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Motivo del rechazo *</label>
          <textarea className="input text-xs h-20 resize-none" value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Explica el motivo del rechazo..." />
        </div>
        <div className="flex gap-2">
          <button onClick={() => { if (!motivo.trim()) return; onRechazar(motivo) }} className="btn-danger text-xs">
            Confirmar rechazo
          </button>
          <button onClick={() => setMode(null)} className="btn-secondary text-xs">Cancelar</button>
        </div>
      </div>
    )
  }

  if (mode === 'aprobar') {
    return (
      <div className={`rounded-xl border p-4 space-y-3 ${color === 'purple' ? 'border-purple-200 bg-purple-50' : 'border-teal-200 bg-teal-50'}`}>
        <p className="text-sm font-semibold text-gray-800">Aprobar OC {oc.numero}</p>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Comentario (opcional)</label>
          <input className="input text-xs" value={comentario} onChange={e => setComentario(e.target.value)} placeholder="Observaciones de la aprobación..." />
        </div>
        <div className="flex gap-2">
          <button onClick={() => onAprobar(comentario)} className="btn-primary text-xs">
            ✅ Confirmar aprobación
          </button>
          <button onClick={() => setMode(null)} className="btn-secondary text-xs">Cancelar</button>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border p-4 ${color === 'purple' ? 'border-purple-200 bg-purple-50' : 'border-amber-200 bg-amber-50'}`}>
      <p className={`text-sm font-semibold mb-1 ${color === 'purple' ? 'text-purple-800' : 'text-amber-800'}`}>
        {title}
      </p>
      <p className="text-xs text-gray-600 mb-3">
        Total OC: <strong>{fmtMoney(oc.totalGeneral||0)}</strong>
        {oc.area && <span className="ml-2">— Área: {oc.area}</span>}
      </p>
      <div className="flex gap-2">
        <button onClick={() => setMode('aprobar')} className="btn-primary text-xs flex items-center gap-1">
          <CheckCircleIcon className="w-4 h-4"/>Aprobar
        </button>
        <button onClick={() => setMode('rechazar')} className="btn-danger text-xs flex items-center gap-1">
          <XCircleIcon className="w-4 h-4"/>Rechazar
        </button>
      </div>
    </div>
  )
}

// ── Detalle OC ──────────────────────────────────────────────
function OCDetail({ oc, onClose, onEdit }) {
  const { state, dispatch } = useApp()
  const { isAdmin, isAdminEmpresa, user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const [confirmBox, setConfirmBox] = useState(null)
  const [proveedorSelId, setProveedorSelId] = useState(oc.proveedorId || '')

  const guardarProveedor = () => {
    if (!proveedorSelId) return
    const prov = state.proveedores.find(p => p.id === proveedorSelId)
    dispatch({ type: 'UPDATE_OC', id: oc.id, payload: { proveedorId: proveedorSelId, proveedor: prov?.nombre || '' } })
    toast('Proveedor asignado: ' + (prov?.nombre || ''))
  }

  const factura = oc.facturaId ? state.facturas.find(f => f.id === oc.facturaId) : null
  const conformidad = oc.conformidadId ? (state.conformidades||[]).find(c => c.id === oc.conformidadId) : null
  const prov = state.proveedores.find(p => p.id === oc.proveedorId)
  const anular = () => {
    setConfirmBox({
      message: '¿Anular esta Orden de Compra?',
      confirmLabel: 'Anular',
      onConfirm: () => {
        dispatch({ type: 'UPDATE_OC', id: oc.id, payload: { estado: 'Anulada' } })
        toast('OC anulada')
        setConfirmBox(null)
        onClose()
      }
    })
  }

  const emitirDirecto = () => {
    const selId = proveedorSelId || oc.proveedorId
    if (!selId) { toast('Selecciona un proveedor antes de emitir', 'error'); return }
    const empresa = state.empresas?.[0] || {}
    const proveedor = state.proveedores.find(p => p.id === selId) || {}
    generarPDFOC({ ...oc, proveedorId: selId, proveedor: proveedor.nombre || '' }, empresa, proveedor, state.logo || null)
    const emailProv = proveedor.contacto || ''
    const subject = encodeURIComponent(`Orden de Compra ${oc.numero} - GIVAMIC S.A.C.`)
    const body = encodeURIComponent(
      `Estimados señores ${proveedor.nombre || 'Proveedor'},\n\n` +
      `Por medio del presente, les hacemos llegar la Orden de Compra N° ${oc.numero} ` +
      `por un monto total de S/ ${(oc.totalGeneral || 0).toFixed(2)} (incluye IGV).\n\n` +
      `Adjuntamos el documento en formato PDF para su revisión y atención.\n\n` +
      `Atentamente,\n${user?.nombre || 'Área de Compras'}\nGIVAMIC S.A.C.`
    )
    window.open(`mailto:${emailProv}?subject=${subject}&body=${body}`, '_blank')
    dispatch({ type: 'UPDATE_OC', id: oc.id, payload: { proveedorId: selId, proveedor: proveedor.nombre || '', estado: 'Emitida', fechaEmision: new Date().toISOString().split('T')[0] } })
    toast('OC emitida — PDF descargado y correo preparado para ' + (proveedor.nombre || 'proveedor'), 'success')
    onClose()
  }

  const emitir = () => {
    // 1. Generar y descargar el PDF
    const empresa = state.empresas?.[0] || {}
    const proveedor = state.proveedores.find(p => p.id === oc.proveedorId) || {}
    generarPDFOC(oc, empresa, proveedor, state.logo || null)

    // 2. Abrir cliente de correo con datos pre-llenados
    const emailProv = proveedor.contacto || ''
    const subject = encodeURIComponent(`Orden de Compra ${oc.numero} - GIVAMIC S.A.C.`)
    const body = encodeURIComponent(
      `Estimados señores ${proveedor.nombre || 'Proveedor'},

` +
      `Por medio del presente, les hacemos llegar la Orden de Compra N° ${oc.numero} ` +
      `por un monto total de S/ ${(oc.totalGeneral || 0).toFixed(2)} (incluye IGV).

` +
      `Adjuntamos el documento en formato PDF para su revisión y atención.

` +
      `Agradecemos su pronta atención y quedamos a su disposición ante cualquier consulta.

` +
      `Atentamente,
${user?.nombre || 'Área de Compras'}
GIVAMIC S.A.C.`
    )
    window.open(`mailto:${emailProv}?subject=${subject}&body=${body}`, '_blank')

    // 3. Actualizar estado
    dispatch({ type: 'UPDATE_OC', id: oc.id, payload: { estado: 'Emitida', fechaEmision: new Date().toISOString().split('T')[0] } })
    toast('PDF descargado y correo preparado para ' + (proveedor.nombre || 'proveedor'), 'success')
    onClose()
  }

  const aprobarAdmin = (comentario) => {
    dispatch({ type: 'APROBAR_OC', id: oc.id, aprobadoPor: user?.nombre || 'Administración', comentario })
    toast('OC aprobada', 'success')
    onClose()
  }

  const aprobarGerencia = (comentario) => {
    dispatch({ type: 'APROBAR_OC', id: oc.id, aprobadoPor: user?.nombre || 'Gerencia', comentario })
    toast('OC aprobada por Gerencia', 'success')
    onClose()
  }

  const rechazar = (motivo) => {
    dispatch({ type: 'RECHAZAR_OC', id: oc.id, rechazadoPor: user?.nombre || user?.rol, motivo })
    toast('OC rechazada', 'error')
    onClose()
  }

  const handlePDF = () => {
    const empresa = (state.empresas || []).find(e => e.id === oc.empresaId) || (state.empresas || [])[0]
    const proveedor = state.proveedores.find(p => p.id === oc.proveedorId)
    const logo = state.logo || null
    generarPDFOC(oc, empresa, proveedor, logo)
    toast('PDF generado')
  }

  return (
    <div className="space-y-4">
      <StepBar oc={oc} />

      {/* Badge OC aprobada automáticamente vía cotización */}
      {oc.aprobadaPorCotizacion && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 flex items-center gap-2">
          🏆 <span>OC aprobada por Gerencia/Administración vía cotización —
          {oc.solcotNumero && <strong className="ml-1"> {oc.solcotNumero}</strong>}
          {oc.cotNumero && <strong className="ml-1"> {oc.cotNumero}</strong>}
          . No requiere aprobación adicional.</span>
        </div>
      )}

      {/* Info aprobador si ya fue procesada manualmente */}
      {oc.aprobadoPor && !oc.aprobadaPorCotizacion && ['Aprobada','Emitida','Facturada','Pendiente Inspección','Completada'].includes(oc.estado) && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg px-3 py-2 text-xs text-teal-700">
          ✅ Aprobada por <strong>{oc.aprobadoPor}</strong>
          {oc.comentarioAprobacion && <span className="ml-2 text-gray-500">— {oc.comentarioAprobacion}</span>}
        </div>
      )}
      {oc.estado === 'Rechazada' && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
          ❌ Rechazada por <strong>{oc.rechazadoPor}</strong>
          {oc.motivoRechazo && <span className="ml-2">— {oc.motivoRechazo}</span>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div><span className="text-gray-500">N° OC:</span> <span className="font-bold font-mono text-[#1e3a5f]">{oc.numero}</span></div>
        <div><span className="text-gray-500">Estado:</span> <span className={`badge border ${OC_STYLE[oc.estado]}`}>{oc.estado}</span></div>
        <div><span className="text-gray-500">Tipo:</span> {oc.tipo || 'Compra'}</div>
        <div>
          <span className="text-gray-500">Proveedor:</span> <span className="font-medium">{prov?.nombre || oc.proveedor || '—'}</span>
          {prov?.contacto && <span className="ml-1 text-xs text-blue-500">· {prov.contacto}</span>}
        </div>
        <div><span className="text-gray-500">Fecha OC:</span> {fmtDate(oc.fecha)}</div>
        {oc.fechaEntregaEsperada && <div><span className="text-gray-500">Entrega esperada:</span> {fmtDate(oc.fechaEntregaEsperada)}</div>}
        {oc.area && <div><span className="text-gray-500">Área:</span> {oc.area}</div>}
        {oc.tiempoEntrega && <div><span className="text-gray-500">T. Entrega:</span> {oc.tiempoEntrega}</div>}
        {oc.formaPagoOC && <div><span className="text-gray-500">Forma pago:</span> {oc.formaPagoOC}</div>}
      </div>

      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs min-w-[380px]">
          <thead><tr className="bg-gray-50">
            <th className="table-th">Producto</th><th className="table-th">UM</th>
            <th className="table-th text-right">Cant.</th><th className="table-th text-right">P. Unit.</th>
            <th className="table-th text-right">Total</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {oc.items.map((it, i) => (
              <tr key={i}>
                <td className="table-td">{it.descripcion}<span className="text-gray-400 ml-1">({it.codigo})</span></td>
                <td className="table-td">{it.unidad}</td>
                <td className="table-td text-right">{it.cantidad}</td>
                <td className="table-td text-right">{fmtMoney(it.precioUnit)}</td>
                <td className="table-td text-right font-medium">{fmtMoney(it.total||0)}</td>
              </tr>
            ))}
            <tr className="bg-gray-50 text-xs">
              <td colSpan={4} className="table-td text-right text-gray-500">Neto / IGV / Total:</td>
              <td className="table-td text-right font-bold">
                {fmtMoney(oc.totalNeto)} / {fmtMoney(oc.totalIGV)} / {fmtMoney(oc.totalGeneral)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Paneles de aprobación ─────────────────────── */}

      {/* 1. Asignar proveedor y emitir (Borrador) */}
      {oc.estado === 'Borrador' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-amber-800">OC en borrador — Selecciona el proveedor y emite</p>

          <div>
            <label className="text-xs font-semibold text-gray-600 block mb-1">Proveedor *</label>
            <select
              className="input text-sm w-full"
              value={proveedorSelId}
              onChange={e => setProveedorSelId(e.target.value)}
            >
              <option value="">— Seleccionar proveedor —</option>
              {state.proveedores.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}{p.contacto ? ` · ${p.contacto}` : ''}</option>
              ))}
            </select>
            {prov && !proveedorSelId && <p className="text-xs text-green-600 mt-1">✓ Proveedor actual: <strong>{prov.nombre}</strong>{prov.contacto ? ` — ${prov.contacto}` : ''}</p>}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-600">Total: <strong>{fmtMoney(oc.totalGeneral||0)}</strong></p>
            <button
              onClick={emitirDirecto}
              disabled={!proveedorSelId && !oc.proveedorId}
              className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-40"
            >
              📄 Emitir OC
            </button>
          </div>
        </div>
      )}

      {/* 2. Panel Contadora (Pendiente Aprobación) */}
      {oc.estado === 'Pendiente Aprobación' && isAdminEmpresa && (
        <ApprovalPanel
          title="🔑 Requiere tu aprobación — Administración de Empresa"
          color="amber"
          oc={oc}
          onAprobar={aprobarAdmin}
          onRechazar={rechazar}
        />
      )}
      {oc.estado === 'Pendiente Aprobación' && !isAdminEmpresa && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
          ⏳ Esperando aprobación de Administración de Empresa
        </div>
      )}

      {/* Vínculos factura / conformidad */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`rounded-xl border p-3 ${factura ? 'border-purple-200 bg-purple-50' : 'border-dashed border-gray-200 bg-gray-50'}`}>
          <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
            <DocumentTextIcon className="w-3.5 h-3.5"/>Factura vinculada
          </p>
          {factura
            ? <div>
                <p className="text-sm font-bold text-purple-700 font-mono">{factura.numero}</p>
                <p className="text-xs text-gray-500">{fmtDate(factura.fecha)} · <span className={factura.estado === 'Recibida' ? 'text-green-600 font-medium' : ''}>{factura.estado}</span></p>
              </div>
            : <p className="text-xs text-gray-400">Sin factura vinculada</p>
          }
        </div>
        <div className={`rounded-xl border p-3 ${conformidad ? 'border-green-200 bg-green-50' : 'border-dashed border-gray-200 bg-gray-50'}`}>
          <p className="text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
            <ClipboardDocumentCheckIcon className="w-3.5 h-3.5"/>Conformidad
          </p>
          {conformidad
            ? <div>
                <p className="text-sm font-bold text-green-700 font-mono">{conformidad.numero}</p>
                <p className="text-xs text-gray-500">{fmtDate(conformidad.fecha)} · {conformidad.resultado}</p>
              </div>
            : <p className="text-xs text-gray-400">Sin inspección registrada</p>
          }
        </div>
      </div>

      {/* Acciones */}
      <div className="border-t border-gray-100 pt-3 flex flex-wrap gap-2 justify-between">
        <div className="flex gap-2">
          {(oc.estado === 'Aprobada' || oc.estado === 'Emitida') && (
            <button onClick={emitir} className="btn-primary text-xs flex items-center gap-1">
              <DocumentCheckIcon className="w-4 h-4"/>
              {oc.estado === 'Emitida' ? 'Reenviar al proveedor' : 'Emitir al proveedor'}
            </button>
          )}
          {oc.estado === 'Pendiente Inspección' && !conformidad && oc.facturaId && (
            <button onClick={() => { onClose(); navigate('/conformidades', { state: { facturaId: oc.facturaId } }) }}
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-3 py-2 rounded-lg flex items-center gap-1 font-medium">
              <ClipboardDocumentCheckIcon className="w-4 h-4"/>Registrar Inspección
            </button>
          )}
          <button onClick={handlePDF}
            className="bg-[#1e3a5f] hover:bg-[#16305a] text-white text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 font-medium">
            <DocumentArrowDownIcon className="w-4 h-4"/>Descargar PDF (SIG-FO-022)
          </button>
        </div>
        <div className="flex gap-2">
          {!['Completada','Anulada','Emitida','Facturada','Pendiente Inspección'].includes(oc.estado) && (
            <>
              <button onClick={() => { onClose(); onEdit(oc) }} className="btn-secondary text-xs flex items-center gap-1">
                <PencilSquareIcon className="w-4 h-4"/>Editar
              </button>
              {!['Pendiente Aprobación','Pendiente Gerencia','Aprobada'].includes(oc.estado) && (
                <button onClick={anular} className="btn-danger text-xs">Anular</button>
              )}
            </>
          )}
          <button onClick={onClose} className="btn-secondary text-xs">Cerrar</button>
        </div>
      </div>
      {confirmBox && <Confirm {...confirmBox} onCancel={() => setConfirmBox(null)} />}
    </div>
  )
}

// ── Página principal ───────────────────────────────────────
export default function OrdenesCompra() {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [detail, setDetail] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [search, setSearch] = useState('')

  const { isAdmin, isAdminEmpresa, isCoordLogistica, user } = useAuth()
  const ocs = state.ordenesCompra || []

  const filtered = ocs
    .filter(o => !filtroEstado || o.estado === filtroEstado)
    .filter(o => !search ||
      o.numero?.toLowerCase().includes(search.toLowerCase()) ||
      o.proveedor?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))

  const pendAdmin    = ocs.filter(o => o.estado === 'Pendiente Aprobación').length
  const emitidas     = ocs.filter(o => o.estado === 'Emitida').length
  const pendInsp     = ocs.filter(o => o.estado === 'Pendiente Inspección').length
  const completadas  = ocs.filter(o => o.estado === 'Completada').length

  const [confirmBox2, setConfirmBox2] = useState(null)
  const handleEdit = (oc) => { setEditing(oc); setShowForm(true) }
  const handleDelete = (id) => {
    setConfirmBox2({
      message: '¿Eliminar esta OC?',
      onConfirm: () => {
        dispatch({ type: 'DELETE_OC', id })
        toast('OC eliminada')
        setConfirmBox2(null)
      }
    })
  }
  const handleClose = () => { setShowForm(false); setEditing(null) }

  const handleQuickPDF = (oc) => {
    const empresa = (state.empresas || []).find(e => e.id === oc.empresaId) || (state.empresas || [])[0]
    const proveedor = state.proveedores.find(p => p.id === oc.proveedorId)
    generarPDFOC(oc, empresa, proveedor, state.logo || null)
    toast('PDF generado')
  }

  const COLS = [
    { header: 'N° OC', key: 'numero' },
    { header: 'Fecha', key: 'fecha' },
    { header: 'Proveedor', key: 'proveedor' },
    { header: 'Área', key: 'area' },
    { header: 'Estado', key: 'estado' },
    { header: 'Total (S/)', key: r => r.totalGeneral || 0, total: true },
    { header: 'Factura', key: 'facturaId' },
    { header: 'Conformidad', key: 'estadoConformidad' },
  ]
  const { selected, toggleOne, toggleAll, clearSelection, isSelected, allSelected, someSelected } = useSelection(filtered)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Órdenes de Compra"
        subtitle="Gestión del flujo de compras: Borrador → Aprobación → Emitida → Factura → Conformidad"
        action={
          <div className="flex items-center gap-2">
            <ExportMenu modulo="OC" data={filtered} selected={selected} columns={COLS} filtroLabel={filtroEstado} />
            <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
              <PlusIcon className="w-4 h-4"/>Nueva OC
            </button>
          </div>
        }
      />

      {/* Alertas de pendientes */}
      {(pendAdmin > 0 && isAdminEmpresa) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <ClockIcon className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700 font-medium">
            {pendAdmin} OC{pendAdmin > 1 ? 's' : ''} esperando tu aprobación
          </p>
          <button onClick={() => setFiltroEstado('Pendiente Aprobación')} className="ml-auto text-xs text-amber-600 underline">Ver</button>
        </div>
      )}
      {pendInsp > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-3">
          <ClockIcon className="w-5 h-5 text-orange-500 shrink-0" />
          <p className="text-sm text-orange-700 font-medium">
            {pendInsp} OC{pendInsp > 1 ? 's' : ''} con factura recibida esperando inspección de conformidad
          </p>
          <button onClick={() => setFiltroEstado('Pendiente Inspección')} className="ml-auto text-xs text-orange-600 underline">Ver</button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Pend. Aprobación', val: pendAdmin,    color: 'amber'  },
          { label: 'Emitidas',         val: emitidas,     color: 'blue'   },
          { label: 'Pend. Inspección', val: pendInsp,     color: 'orange' },
          { label: 'Completadas',      val: completadas,  color: 'green'  },
        ].map(k => (
          <div key={k.label} className="card p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFiltroEstado(k.val > 0 ? (k.label === 'Pend. Aprobación' ? 'Pendiente Aprobación' : k.label === 'Emitidas' ? 'Emitida' : k.label === 'Pend. Inspección' ? 'Pendiente Inspección' : 'Completada') : '')}>
            <p className={`text-2xl font-bold ${k.color === 'amber' ? 'text-amber-600' : k.color === 'purple' ? 'text-purple-600' : k.color === 'orange' ? 'text-orange-600' : k.color === 'green' ? 'text-green-600' : 'text-[#1e3a5f]'}`}>{k.val}</p>
            <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="card flex gap-3 flex-wrap">
        <input className="input max-w-xs" placeholder="Buscar OC o proveedor..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input w-auto" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.keys(OC_STYLE).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        {filtroEstado && (
          <button onClick={() => setFiltroEstado('')} className="text-xs text-gray-400 hover:text-gray-600 underline">Limpiar filtro</button>
        )}
      </div>

      <div className="card p-0 overflow-hidden">

        {/* ── Móvil: cards ── */}
        <div className="md:hidden divide-y divide-gray-100">
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-10">No hay órdenes de compra</p>
          )}
          {filtered.map(oc => (
            <div key={oc.id} className={`p-3 ${
              oc.estado === 'Pendiente Inspección' ? 'bg-orange-50/40' :
              oc.estado === 'Pendiente Aprobación' ? 'bg-amber-50/40' :
              oc.estado === 'Pendiente Gerencia'   ? 'bg-purple-50/40' : ''
            }`}>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  {/* N° OC + Estado */}
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-xs font-bold text-[#1e3a5f]">{oc.numero}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-semibold ${OC_STYLE[oc.estado]}`}>{oc.estado}</span>
                  </div>
                  {/* Proveedor */}
                  <p className="text-sm font-semibold text-gray-800 truncate">{oc.proveedor}</p>
                  {/* Meta info */}
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="text-xs text-gray-500">{fmtDate(oc.fecha)}</span>
                    <span className="text-xs font-bold text-gray-700">{fmtMoney(oc.totalGeneral||0)}</span>
                    {oc.facturaId && (
                      <span className="flex items-center gap-0.5 text-xs text-green-600 font-medium">
                        <CheckCircleIcon className="w-3.5 h-3.5"/>Factura
                      </span>
                    )}
                    {oc.conformidadId && (
                      <span className="flex items-center gap-0.5 text-xs text-green-600 font-medium">
                        <CheckCircleIcon className="w-3.5 h-3.5"/>Conform.
                      </span>
                    )}
                  </div>
                </div>
                {/* Acciones */}
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button onClick={() => setDetail(oc)} className="text-blue-400 hover:text-blue-600 p-1.5" title="Ver detalle">
                    <EyeIcon className="w-5 h-5"/>
                  </button>
                  <button onClick={() => handleQuickPDF(oc)} className="text-gray-400 hover:text-[#1e3a5f] p-1.5" title="PDF">
                    <DocumentArrowDownIcon className="w-5 h-5"/>
                  </button>
                  {(isAdmin || (isCoordLogistica && ['Borrador','Pendiente Aprobación'].includes(oc.estado))) && (
                    <button onClick={() => handleEdit(oc)} className="text-gray-400 hover:text-[#1e3a5f] p-1.5" title="Editar">
                      <PencilSquareIcon className="w-5 h-5"/>
                    </button>
                  )}
                  {isCoordLogistica && !isAdmin && oc.estado === 'Emitida' && (
                    <button
                      onClick={() => {
                        if (window.confirm('¿Anular esta OC Emitida? Esta acción no se puede deshacer.')) {
                          dispatch({ type: 'UPDATE_OC', id: oc.id, payload: { estado: 'Anulada', anuladoPor: user?.nombre, fechaAnulacion: new Date().toISOString().split('T')[0] } })
                          toast('OC anulada', 'error')
                        }
                      }}
                      className="text-red-400 hover:text-red-600 p-1.5" title="Anular OC">
                      <TrashIcon className="w-5 h-5"/>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Desktop: tabla completa ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="table-th w-8"><Checkbox checked={allSelected} indeterminate={someSelected} onChange={toggleAll} /></th>
                <th className="table-th">N° OC</th>
                <th className="table-th">Fecha</th>
                <th className="table-th">Proveedor</th>
                <th className="table-th">Área</th>
                <th className="table-th text-center">Ítems</th>
                <th className="table-th text-right">Total</th>
                <th className="table-th">Estado</th>
                <th className="table-th text-center">Factura</th>
                <th className="table-th text-center">Conform.</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(oc => (
                <tr key={oc.id} className={`hover:bg-gray-50/50
                  ${oc.estado === 'Pendiente Inspección' ? 'bg-orange-50/20' : ''}
                  ${oc.estado === 'Pendiente Aprobación' ? 'bg-amber-50/20' : ''}
                  ${oc.estado === 'Pendiente Gerencia'   ? 'bg-purple-50/20' : ''}
                `}>
                  <td className="table-td w-8"><Checkbox checked={isSelected(oc.id)} onChange={() => toggleOne(oc.id)} /></td>
                  <td className="table-td font-mono text-xs font-bold text-[#1e3a5f]">{oc.numero}</td>
                  <td className="table-td">{fmtDate(oc.fecha)}</td>
                  <td className="table-td">{oc.proveedor}</td>
                  <td className="table-td text-xs text-gray-500">{oc.area || '—'}</td>
                  <td className="table-td text-center">{oc.items?.length || 0}</td>
                  <td className="table-td text-right font-medium">{fmtMoney(oc.totalGeneral||0)}</td>
                  <td className="table-td">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${OC_STYLE[oc.estado]}`}>{oc.estado}</span>
                  </td>
                  <td className="table-td text-center">
                    {oc.facturaId ? <CheckCircleIcon className="w-4 h-4 text-green-500 mx-auto" /> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="table-td text-center">
                    {oc.conformidadId ? <CheckCircleIcon className="w-4 h-4 text-green-500 mx-auto" /> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setDetail(oc)} className="text-blue-400 hover:text-blue-600 p-1" title="Ver detalle">
                        <EyeIcon className="w-4 h-4"/>
                      </button>
                      <button onClick={() => handleQuickPDF(oc)} className="text-gray-400 hover:text-[#1e3a5f] p-1" title="Descargar PDF">
                        <DocumentArrowDownIcon className="w-4 h-4"/>
                      </button>
                      {(isAdmin || (isCoordLogistica && ['Borrador','Pendiente Aprobación'].includes(oc.estado))) && (
                        <button onClick={() => handleEdit(oc)} className="text-gray-400 hover:text-[#1e3a5f] p-1" title="Editar">
                          <PencilSquareIcon className="w-4 h-4"/>
                        </button>
                      )}
                      {isCoordLogistica && !isAdmin && oc.estado === 'Emitida' && (
                        <button
                          onClick={() => {
                            if (window.confirm('¿Anular esta OC Emitida? Esta acción no se puede deshacer.')) {
                              dispatch({ type: 'UPDATE_OC', id: oc.id, payload: { estado: 'Anulada', anuladoPor: user?.nombre, fechaAnulacion: new Date().toISOString().split('T')[0] } })
                              toast('OC anulada', 'error')
                            }
                          }}
                          className="text-red-400 hover:text-red-600 p-1" title="Anular OC">
                          <TrashIcon className="w-4 h-4"/>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {ocs.length === 0 && (
                <tr><td colSpan={11} className="table-td text-center text-gray-400 py-10">No hay órdenes de compra</td></tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {showForm && (
        <Modal title={editing ? `Editar ${editing.numero}` : 'Nueva Orden de Compra'} onClose={handleClose} wide>
          <OCForm initial={editing} onClose={handleClose} />
        </Modal>
      )}
      {detail && (
        <Modal title={`Orden de Compra: ${detail.numero}`} onClose={() => setDetail(null)} wide>
          <OCDetail oc={detail} onClose={() => setDetail(null)} onEdit={handleEdit} />
        </Modal>
      )}
      {confirmBox2 && <Confirm {...confirmBox2} onCancel={() => setConfirmBox2(null)} />}
    </div>
  )
}
