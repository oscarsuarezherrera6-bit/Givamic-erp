import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useToast } from '../components/layout/Toast'
import PageHeader from '../components/common/PageHeader'
import ExportMenu, { useSelection, Checkbox } from '../components/common/ExportMenu'
import Modal from '../components/common/Modal'
import { BanknotesIcon, ClockIcon, ExclamationTriangleIcon, CheckCircleIcon, FunnelIcon, PlusIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'

const fmtDate = d => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
const fmtMoney = n => `S/ ${Number(n || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const todayISO = () => new Date().toISOString().split('T')[0]

function diasVencimiento(fechaVenc) {
  if (!fechaVenc) return null
  const hoy = new Date(); hoy.setHours(0,0,0,0)
  const vence = new Date(fechaVenc + 'T00:00:00')
  return Math.round((vence - hoy) / 86400000)
}

function AgingBadge({ dias }) {
  if (dias === null) return null
  if (dias < 0)   return <span className="badge bg-red-100 text-red-700 font-bold">Vencida {Math.abs(dias)}d</span>
  if (dias === 0) return <span className="badge bg-red-100 text-red-700 font-bold">Vence hoy</span>
  if (dias <= 7)  return <span className="badge bg-orange-100 text-orange-700">Vence en {dias}d</span>
  if (dias <= 30) return <span className="badge bg-yellow-100 text-yellow-700">Vence en {dias}d</span>
  return <span className="badge bg-blue-50 text-blue-600">Vence en {dias}d</span>
}

function EstadoBadge({ estadoPago }) {
  if (estadoPago === 'Pagado')    return <span className="badge bg-green-100 text-green-700">Pagado</span>
  if (estadoPago === 'Parcial')   return <span className="badge bg-yellow-100 text-yellow-700">Parcial</span>
  return <span className="badge bg-red-50 text-red-600">Pendiente</span>
}

function ModalPago({ factura, onClose, dispatch, toast }) {
  const saldo = (factura.totalGeneral || factura.total || 0) - (factura.montoPagado || 0)
  const [monto, setMonto]   = useState(saldo.toFixed(2))
  const [fecha, setFecha]   = useState(todayISO())
  const [metodo, setMetodo] = useState('Transferencia')
  const [referencia, setRef] = useState('')
  const [obs, setObs]       = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const m = parseFloat(monto)
    if (!m || m <= 0) return
    dispatch({ type: 'REGISTRAR_PAGO_FACTURA', id: factura.id, monto: m, fecha, metodo, referencia, observaciones: obs })
    toast(`Pago de ${fmtMoney(m)} registrado`, 'success')
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 rounded-xl p-4 space-y-1">
        <p className="text-xs text-blue-600 font-semibold">{factura.numero} — {factura.proveedor}</p>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total:</span>
          <span className="font-bold">{fmtMoney(factura.totalGeneral || factura.total)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Pagado:</span>
          <span className="text-green-600 font-semibold">{fmtMoney(factura.montoPagado)}</span>
        </div>
        <div className="flex justify-between text-sm border-t border-blue-100 pt-1">
          <span className="font-bold text-gray-700">Saldo:</span>
          <span className="font-black text-red-600">{fmtMoney(saldo)}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Monto (S/) *</label>
          <input type="number" min="0.01" max={saldo} step="0.01" className="input" value={monto} onChange={e => setMonto(e.target.value)} required />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Fecha *</label>
          <input type="date" className="input" value={fecha} onChange={e => setFecha(e.target.value)} required />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">Método</label>
          <select className="input" value={metodo} onChange={e => setMetodo(e.target.value)}>
            {['Transferencia','Cheque','Efectivo','Depósito','Detracción'].map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-600 block mb-1">N° Operación</label>
          <input className="input" value={referencia} onChange={e => setRef(e.target.value)} placeholder="Ej: 0012345678" />
        </div>
      </div>
      <div>
        <label className="text-xs font-medium text-gray-600 block mb-1">Observaciones</label>
        <input className="input" value={obs} onChange={e => setObs(e.target.value)} placeholder="Opcional..." />
      </div>
      <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
        <button type="submit" className="btn-primary">Registrar pago</button>
      </div>
    </form>
  )
}

function HistorialPagos({ factura, onClose }) {
  const pagos = factura.pagos || []
  return (
    <div className="space-y-3">
      <div className="bg-gray-50 rounded-xl p-4 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total:</span>
          <span className="font-bold">{fmtMoney(factura.totalGeneral || factura.total)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Pagado:</span>
          <span className="font-bold text-green-600">{fmtMoney(factura.montoPagado)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="font-bold">Saldo:</span>
          <span className="font-black text-red-600">{fmtMoney((factura.totalGeneral || factura.total || 0) - (factura.montoPagado || 0))}</span>
        </div>
      </div>
      {pagos.length === 0
        ? <p className="text-sm text-gray-400 text-center py-4">Sin pagos registrados</p>
        : (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b">
              <th className="table-th">Fecha</th>
              <th className="table-th">Monto</th>
              <th className="table-th">Método</th>
              <th className="table-th">Ref.</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {pagos.map(p => (
                <tr key={p.id}>
                  <td className="table-td">{fmtDate(p.fecha)}</td>
                  <td className="table-td font-semibold text-green-700">{fmtMoney(p.monto)}</td>
                  <td className="table-td">{p.metodo}</td>
                  <td className="table-td text-gray-500">{p.referencia || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      }
      <div className="flex justify-end pt-2 border-t border-gray-100">
        <button onClick={onClose} className="btn-secondary">Cerrar</button>
      </div>
    </div>
  )
}

export default function CuentasPorPagar() {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const navigate = useNavigate()

  const [filtroEstado, setFiltroEstado] = useState('Pendientes')
  const [filtroProveedor, setFiltroProveedor] = useState('')
  const [modalPago, setModalPago] = useState(null)
  const [modalHistorial, setModalHistorial] = useState(null)

  const facturasCredito = useMemo(() =>
    (state.facturas || []).filter(f => f.tipoPago === 'Crédito')
  , [state.facturas])

  useEffect(() => {
    facturasCredito
      .filter(f => f.estadoPago !== 'Pagado')
      .forEach(f => {
        const dias = diasVencimiento(f.fechaVencimiento)
        if (dias !== null && dias >= 0 && dias <= 7) {
          const notifId = `cxp-vence-${f.id}`
          const yaExiste = (state.notificaciones || []).some(n => n.id === notifId)
          if (!yaExiste) {
            dispatch({
              type: 'ADD_NOTIF',
              payload: {
                id: notifId,
                paraRoles: ['Contador', 'Administrador', 'Gerente'],
                mensaje: `Factura ${f.numero} vence ${dias === 0 ? 'hoy' : 'en ' + dias + ' día(s)'}`,
                tipo: 'alerta',
                link: '/cuentas-por-pagar',
                leido: false,
                creadoEn: new Date().toISOString()
              }
            })
          }
        }
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const facturasFiltradas = useMemo(() => {
    return facturasCredito.filter(f => {
      if (filtroProveedor && !f.proveedor?.toLowerCase().includes(filtroProveedor.toLowerCase())) return false
      if (filtroEstado === 'Pendientes') return f.estadoPago !== 'Pagado'
      if (filtroEstado === 'Pagadas')   return f.estadoPago === 'Pagado'
      if (filtroEstado === 'Vencidas')  { const d = diasVencimiento(f.fechaVencimiento); return d !== null && d < 0 && f.estadoPago !== 'Pagado' }
      return true
    }).sort((a, b) => {
      const da = diasVencimiento(a.fechaVencimiento) ?? 999
      const db = diasVencimiento(b.fechaVencimiento) ?? 999
      return da - db
    })
  }, [facturasCredito, filtroEstado, filtroProveedor])

  const kpis = useMemo(() => {
    const pendientes = facturasCredito.filter(f => f.estadoPago !== 'Pagado')
    const vencidas   = pendientes.filter(f => (diasVencimiento(f.fechaVencimiento) ?? 1) < 0)
    const porVencer  = pendientes.filter(f => { const d = diasVencimiento(f.fechaVencimiento); return d !== null && d >= 0 && d <= 30 })
    const totalDeuda = pendientes.reduce((s, f) => s + ((f.totalGeneral || f.total || 0) - (f.montoPagado || 0)), 0)
    return { totalPendientes: pendientes.length, vencidas: vencidas.length, porVencer: porVencer.length, totalDeuda }
  }, [facturasCredito])

  const aging = useMemo(() => {
    const pendientes = facturasCredito.filter(f => f.estadoPago !== 'Pagado')
    const b = { corriente: 0, d30: 0, d60: 0, d90: 0, mas90: 0 }
    pendientes.forEach(f => {
      const d = diasVencimiento(f.fechaVencimiento) ?? 0
      const saldo = (f.totalGeneral || f.total || 0) - (f.montoPagado || 0)
      if (d > 0)         b.corriente += saldo
      else if (d >= -30) b.d30 += saldo
      else if (d >= -60) b.d60 += saldo
      else if (d >= -90) b.d90 += saldo
      else               b.mas90 += saldo
    })
    return b
  }, [facturasCredito])

  const COLS = [
    { header: 'N° Factura', key: 'numero' },
    { header: 'Proveedor', key: 'proveedor' },
    { header: 'Fecha', key: 'fecha' },
    { header: 'Vencimiento', key: 'fechaVencimiento' },
    { header: 'Estado', key: r => r.estadoPago || 'Pendiente' },
    { header: 'Total (S/)', key: r => r.totalGeneral || r.total || 0, total: true },
    { header: 'Pagado (S/)', key: r => r.montoPagado || 0, total: true },
    { header: 'Saldo (S/)', key: r => (r.totalGeneral || r.total || 0) - (r.montoPagado || 0), total: true },
  ]
  const { selected, toggleOne, toggleAll, clearSelection, isSelected, allSelected, someSelected } = useSelection(facturasFiltradas)

  return (
    <div>
      <PageHeader title="Cuentas por Pagar" subtitle="Control de facturas a crédito y pagos"
        action={<ExportMenu modulo="CxP" data={facturasFiltradas} selected={selected} columns={COLS} filtroLabel={filtroEstado} />}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <div className="card p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-2xl font-black text-red-600">{kpis.vencidas}</p>
            <p className="text-xs text-gray-500">Vencidas</p>
          </div>
        </div>
        <div className="card p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
            <ClockIcon className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-2xl font-black text-orange-600">{kpis.porVencer}</p>
            <p className="text-xs text-gray-500">Por vencer (30d)</p>
          </div>
        </div>
        <div className="card p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <BanknotesIcon className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="text-2xl font-black text-[#1e3a5f]">{kpis.totalPendientes}</p>
            <p className="text-xs text-gray-500">Pendientes</p>
          </div>
        </div>
        <div className="card p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
            <BanknotesIcon className="w-5 h-5 text-purple-500" />
          </div>
          <div>
            <p className="text-xl font-black text-purple-700">{fmtMoney(kpis.totalDeuda)}</p>
            <p className="text-xs text-gray-500">Total deuda</p>
          </div>
        </div>
      </div>

      <div className="card p-4 mb-5">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Aging Report</p>
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Por vencer', val: aging.corriente, color: 'bg-blue-100 text-blue-700' },
            { label: '0–30 días',  val: aging.d30,       color: 'bg-yellow-100 text-yellow-700' },
            { label: '31–60 días', val: aging.d60,       color: 'bg-orange-100 text-orange-700' },
            { label: '61–90 días', val: aging.d90,       color: 'bg-red-100 text-red-700' },
            { label: '+90 días',   val: aging.mas90,     color: 'bg-red-200 text-red-800' },
          ].map(b => (
            <div key={b.label} className={`rounded-xl p-3 text-center ${b.color}`}>
              <p className="text-base font-black">{fmtMoney(b.val)}</p>
              <p className="text-[10px] font-semibold mt-0.5">{b.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 flex-wrap items-center mb-4">
        {['Pendientes','Vencidas','Pagadas','Todas'].map(e => (
          <button key={e} onClick={() => setFiltroEstado(e)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${filtroEstado === e ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1e3a5f]'}`}>
            {e}
          </button>
        ))}
        <div className="flex items-center gap-2 ml-auto bg-white border border-gray-200 rounded-lg px-3 py-1.5">
          <FunnelIcon className="w-3.5 h-3.5 text-gray-400" />
          <input className="text-xs outline-none w-36" placeholder="Buscar proveedor..."
            value={filtroProveedor} onChange={e => setFiltroProveedor(e.target.value)} />
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-100">
            <th className="table-th w-8"><Checkbox checked={allSelected} indeterminate={someSelected} onChange={toggleAll} /></th>
            <th className="table-th">Factura</th>
            <th className="table-th">Proveedor</th>
            <th className="table-th">Fecha</th>
            <th className="table-th">Vencimiento</th>
            <th className="table-th text-right">Total</th>
            <th className="table-th text-right">Pagado</th>
            <th className="table-th text-right">Saldo</th>
            <th className="table-th">Estado</th>
            <th className="table-th">Acciones</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {facturasFiltradas.map(f => {
              const total  = f.totalGeneral || f.total || 0
              const pagado = f.montoPagado || 0
              const saldo  = total - pagado
              const dias   = diasVencimiento(f.fechaVencimiento)
              const vencida = dias !== null && dias < 0 && f.estadoPago !== 'Pagado'
              return (
                <tr key={f.id} className={`hover:bg-gray-50/50 ${vencida ? 'bg-red-50/30' : ''}`}>
                  <td className="table-td w-8"><Checkbox checked={isSelected(f.id)} onChange={() => toggleOne(f.id)} /></td>
                  <td className="table-td font-semibold text-[#1e3a5f]">{f.numero}</td>
                  <td className="table-td">{f.proveedor}</td>
                  <td className="table-td text-gray-500">{fmtDate(f.fecha)}</td>
                  <td className="table-td">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-600">{fmtDate(f.fechaVencimiento)}</span>
                      {f.estadoPago !== 'Pagado' && <AgingBadge dias={dias} />}
                    </div>
                  </td>
                  <td className="table-td text-right font-semibold">{fmtMoney(total)}</td>
                  <td className="table-td text-right text-green-600">{fmtMoney(pagado)}</td>
                  <td className="table-td text-right font-bold text-red-600">{saldo > 0 ? fmtMoney(saldo) : '—'}</td>
                  <td className="table-td"><EstadoBadge estadoPago={f.estadoPago || 'Pendiente'} /></td>
                  <td className="table-td">
                    <div className="flex gap-2">
                      {f.estadoPago !== 'Pagado' && (
                        <button onClick={() => setModalPago(f)}
                          className="flex items-center gap-1 text-xs bg-[#1e3a5f] text-white px-2.5 py-1 rounded-lg hover:bg-[#2c5282] transition-colors">
                          <PlusIcon className="w-3 h-3" />Pagar
                        </button>
                      )}
                      <button onClick={() => setModalHistorial(f)}
                        className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1 rounded-lg border border-blue-200 hover:bg-blue-50 transition-colors">
                        Historial
                      </button>
                      <button onClick={() => navigate('/facturas', { state: { buscarNumero: f.numero } })}
                        className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center gap-1">
                        <ArrowTopRightOnSquareIcon className="w-3 h-3" />Ver
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {facturasFiltradas.length === 0 && (
              <tr><td colSpan={10} className="table-td text-center text-gray-400 py-10">
                <CheckCircleIcon className="w-8 h-8 mx-auto mb-2 text-green-300" />
                No hay facturas en esta categoría
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modalPago && (
        <Modal title={`Registrar pago — ${modalPago.numero}`} onClose={() => setModalPago(null)}>
          <ModalPago factura={modalPago} onClose={() => setModalPago(null)} dispatch={dispatch} toast={toast} />
        </Modal>
      )}
      {modalHistorial && (
        <Modal title={`Historial — ${modalHistorial.numero}`} onClose={() => setModalHistorial(null)}>
          <HistorialPagos factura={modalHistorial} onClose={() => setModalHistorial(null)} />
        </Modal>
      )}
    </div>
  )
}
