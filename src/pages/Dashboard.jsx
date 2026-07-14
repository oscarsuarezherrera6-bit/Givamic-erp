/**
 * Dashboard.jsx — GIVAMIC ERP
 * Diseño profesional estilo ERP moderno
 */
import { useMemo, useState, useEffect } from 'react'
import DashboardCoordGen from './DashboardCoordGen'
import { useApp } from '../context/AppContext'
import { fmtMoney, fmtDate } from '../utils/helpers'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import {
  ShieldExclamationIcon, CubeIcon, ClipboardDocumentListIcon,
  BanknotesIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon,
  BuildingOfficeIcon, DocumentCheckIcon, CreditCardIcon,
  CurrencyDollarIcon, ExclamationCircleIcon
} from '@heroicons/react/24/outline'
import { useNavigate } from 'react-router-dom'
import { usePerm } from '../hooks/usePerm'
import { useAuth } from '../context/AuthContext'

// ── Helpers ────────────────────────────────────────────────────────────────────
const now = new Date()
const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
const lastMonth = (() => {
  const d = new Date(now); d.setMonth(d.getMonth()-1)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
})()

const greeting = () => {
  const h = now.getHours()
  if (h < 12) return 'Buenos días'
  if (h < 19) return 'Buenas tardes'
  return 'Buenas noches'
}

const calcTrend = (curr, prev) =>
  prev === 0 ? null : Math.round(((curr - prev) / prev) * 100)

// ── Sub-components ─────────────────────────────────────────────────────────────

function TrendBadge({ val, up = true }) {
  if (val === null || val === undefined) return null
  const positive = up ? val >= 0 : val <= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
      positive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
    }`}>
      {val >= 0
        ? <ArrowTrendingUpIcon className="w-3 h-3"/>
        : <ArrowTrendingDownIcon className="w-3 h-3"/>}
      {Math.abs(val)}%
    </span>
  )
}

/** Tarjeta con número grande — como "Clientes" o "Pedidos" en la referencia */
function StatCard({ label, value, sub, trend: t, trendUp = true, alert = false, onClick, Icon, iconBg = 'bg-blue-500' }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border p-4 flex flex-col justify-between gap-3 shadow-sm transition-all
        ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-px' : ''}
        ${alert ? 'border-red-200 bg-red-50/40' : 'border-gray-100'}`}
    >
      <div className="flex items-start justify-between">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg}`}>
          {Icon && <Icon className="w-4 h-4 text-white" />}
        </div>
        <TrendBadge val={t} up={trendUp} />
      </div>
      <div>
        <p className="text-2xl font-black text-gray-900 leading-none">{value}</p>
        <p className="text-xs font-semibold text-gray-500 mt-1">{label}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

/** Tarjeta con donut chart de estados — como "Pedidos Pagados" en la referencia */
const DONUT_COLORS = ['#f59e0b', '#10b981', '#ef4444', '#3b82f6', '#8b5cf6', '#06b6d4']

function DonutCard({ label, data, total, onClick }) {
  const hasData = data.length > 0 && total > 0
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2
        ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-px transition-all' : ''}`}
    >
      <p className="text-xs font-semibold text-gray-500">{label}</p>
      <div className="flex flex-col sm:flex-row items-center gap-2">
        {/* Donut */}
        <div className="w-[72px] h-[72px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={hasData ? data : [{ name: 'Sin datos', value: 1 }]}
                dataKey="value" cx="50%" cy="50%"
                outerRadius={34} innerRadius={20}
                paddingAngle={hasData ? 2 : 0}
                startAngle={90} endAngle={-270}
              >
                {hasData
                  ? data.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)
                  : <Cell fill="#e5e7eb" />}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Leyenda */}
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          {(hasData ? data : []).slice(0, 4).map((d, i) => {
            const pct = total > 0 ? Math.round((d.value / total) * 100) : 0
            return (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                <span className="text-[10px] text-gray-500 truncate flex-1">{d.name}</span>
                <span className="text-[10px] font-bold text-gray-700">{pct}%</span>
              </div>
            )
          })}
          {!hasData && <p className="text-[10px] text-gray-400 italic">Sin registros</p>}
          <p className="text-xs font-bold text-gray-800 mt-0.5 pt-0.5 border-t border-gray-100">
            Total: {total}
          </p>
        </div>
      </div>
    </div>
  )
}

/** Tarjeta destacada oscura — como "Ventas y Beneficios" en la referencia */
function HighlightCard({ label1, value1, label2, value2, chartData, trendVal }) {
  return (
    <div className="bg-[#1e3a5f] rounded-xl p-4 flex flex-col gap-3 shadow-sm">
      {/* Mini área chart */}
      <div className="h-[64px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 0, left: -28 }}>
            <defs>
              <linearGradient id="hlGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#60a5fa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#93c5fd' }}
              axisLine={false} tickLine={false} />
            <Tooltip
              formatter={v => [fmtMoney(v), 'Gasto']}
              contentStyle={{ fontSize: 11, borderRadius: 8, background: '#0f2d4e', border: '1px solid #1e4a7a', color: '#fff' }}
            />
            <Area type="monotone" dataKey="total" stroke="#60a5fa" strokeWidth={1.5}
              fill="url(#hlGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Cifras */}
      <div className="space-y-2">
        <div>
          <p className="text-[10px] text-blue-300 font-medium flex items-center gap-1">
            <BanknotesIcon className="w-3 h-3" /> {label1}
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-lg font-black text-white leading-tight">{value1}</p>
            <TrendBadge val={trendVal} up={false} />
          </div>
        </div>
        <div className="h-px bg-white/10" />
        <div>
          <p className="text-[10px] text-blue-300 font-medium flex items-center gap-1">
            <CubeIcon className="w-3 h-3" /> {label2}
          </p>
          <p className="text-lg font-black text-white leading-tight">{value2}</p>
        </div>
      </div>
    </div>
  )
}

/** Tarjeta KPI con barra de progreso y semáforo meta */
function KpiCard({ label, valor, unidad = '%', meta, sentido = 'mayor', descripcion, sub }) {
  const cumple = valor === null ? null : sentido === 'mayor' ? valor >= meta : valor <= meta
  const pct = unidad === '%' ? valor : null
  const barPct = pct !== null ? Math.min(100, pct) : Math.min(100, (valor / (meta * 2)) * 100)
  const barColor = cumple === null ? '#d1d5db' : cumple ? '#10b981' : '#ef4444'
  const displayVal = valor === null ? '—' : unidad === '%' ? `${valor}%` : `${valor} ${unidad}`
  const metaLabel = unidad === '%' ? `Meta: ${sentido === 'mayor' ? '≥' : '≤'}${meta}%` : `Meta: ${sentido === 'mayor' ? '≥' : '≤'}${meta} ${unidad}`
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-gray-500 leading-tight">{label}</p>
        {cumple !== null && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
            cumple ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
          }`}>{cumple ? '✓ Cumple' : '✕ No cumple'}</span>
        )}
      </div>
      <div className="flex items-baseline gap-1">
        <p className={`text-2xl font-black leading-none ${
          cumple === null ? 'text-gray-300' : cumple ? 'text-emerald-600' : 'text-red-500'
        }`}>{displayVal}</p>
      </div>
      <div className="space-y-1">
        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${barPct}%`, background: barColor }} />
        </div>
        <div className="flex justify-between items-center">
          <p className="text-[10px] text-gray-400">{metaLabel}</p>
          {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
        </div>
      </div>
      {descripcion && <p className="text-[10px] text-gray-400 leading-tight border-t border-gray-50 pt-1.5">{descripcion}</p>}
    </div>
  )
}

/** Ciclo operativo horizontal */
function CicloStep({ item, isLast, onClick }) {
  return (
    <div className="flex items-stretch gap-2 flex-1">
      <div
        onClick={onClick}
        className="flex-1 rounded-xl border p-3 cursor-pointer hover:shadow-sm transition-all"
        style={{
          borderColor: item.pendiente > 0 ? item.color + '66' : '#e5e7eb',
          background: item.pendiente > 0 ? item.color + '0d' : 'white'
        }}
      >
        <p className="text-xl font-black leading-none" style={{ color: item.color }}>{item.total}</p>
        <p className="text-[11px] font-semibold text-gray-700 mt-1">{item.label}</p>
        {item.pendiente > 0 && (
          <p className="text-[10px] mt-1 font-bold" style={{ color: item.color }}>
            {item.pendiente} pend.
          </p>
        )}
      </div>
      {!isLast && (
        <div className="flex items-center text-gray-300 text-xl font-light select-none">›</div>
      )}
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { state } = useApp()
  const navigate = useNavigate()
  const { puedeVer } = usePerm()
  const { user, isCoordGen } = useAuth()

  // ── Responsive: detectar móvil con JS puro (bypass CSS totalmente) ──────────
  const [winW, setWinW] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1280)
  useEffect(() => {
    const onResize = () => setWinW(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const isMobile = winW < 768

  if (isCoordGen && !user?.rol?.includes('Administrador')) return <DashboardCoordGen />

  const {
    facturas = [], movimientos = [], inventario = {},
    productos = [], requerimientos = [], sedes = [],
    ordenesCompra = [], epps = [], uniformeEntregas = [], uniformeStock = {},
    conformidades = [], solicitudesCotizacion = []
  } = state

  const provMap = useMemo(() =>
    Object.fromEntries((state.proveedores || []).map(p => [p.id, p.nombre])),
    [state.proveedores]
  )

  // ── KPI calcs ──────────────────────────────────────────────────────────────
  const gastoMes = useMemo(() =>
    facturas.filter(f => f.fecha.startsWith(thisMonth))
      .reduce((s, f) => s + (f.items || []).reduce((ss, it) => ss + it.cantidad * it.precioUnit, 0), 0),
    [facturas]
  )
  const gastoMesAnt = useMemo(() =>
    facturas.filter(f => f.fecha.startsWith(lastMonth))
      .reduce((s, f) => s + (f.items || []).reduce((ss, it) => ss + it.cantidad * it.precioUnit, 0), 0),
    [facturas]
  )

  const valorInventario = useMemo(() => {
    let t = 0
    Object.values(inventario).forEach(prods =>
      Object.values(prods).forEach(({ cantidad, precio }) => { t += cantidad * precio })
    )
    return t
  }, [inventario])

  // REQs
  const reqTotal    = requerimientos.length
  const reqMes      = useMemo(() => requerimientos.filter(r => r.fecha?.startsWith(thisMonth)).length, [requerimientos])
  const reqMesAnt   = useMemo(() => requerimientos.filter(r => r.fecha?.startsWith(lastMonth)).length, [requerimientos])
  const reqPend     = useMemo(() => requerimientos.filter(r => r.estado === 'Pendiente').length, [requerimientos])
  const reqApro     = useMemo(() => requerimientos.filter(r => r.estado === 'Aprobado').length, [requerimientos])
  const reqRech     = useMemo(() => requerimientos.filter(r => r.estado === 'Rechazado').length, [requerimientos])

  // OCs
  const ocs         = ordenesCompra || []
  const ocTotal     = ocs.length
  const ocMes       = useMemo(() => ocs.filter(o => o.fecha?.startsWith(thisMonth)).length, [ocs])
  const ocMesAnt    = useMemo(() => ocs.filter(o => o.fecha?.startsWith(lastMonth)).length, [ocs])
  const ocPend      = useMemo(() => ocs.filter(o => o.estado === 'Pendiente' || o.estado === 'En revisión').length, [ocs])
  const ocApro      = useMemo(() => ocs.filter(o => o.estado === 'Aprobada' || o.estado === 'Emitida').length, [ocs])
  const ocRech      = useMemo(() => ocs.filter(o => o.estado === 'Rechazada').length, [ocs])

  // Alertas operativas
  const eppAlerta   = useMemo(() =>
    epps.filter(e => e.estado_personal !== 'Renunció').filter(e => {
      if (!e.fechaEntrega || !e.diasCambio) return false
      const exp = new Date(e.fechaEntrega); exp.setDate(exp.getDate() + Number(e.diasCambio))
      return exp <= now
    }).length, [epps])

  const stockCritico = useMemo(() =>
    productos.filter(p => {
      const stock = Object.values(inventario).reduce((s, prods) => s + (prods[p.id]?.cantidad || 0), 0)
      return stock <= (p.stockMinimo || 0) && !p.esKit
    }).length, [productos, inventario])

  const reqPagosMes  = useMemo(() => (state.reqPagos || []).filter(r => r.fecha?.startsWith(thisMonth)).length, [state.reqPagos])
  const reqPagosPend = useMemo(() => (state.reqPagos || []).filter(r => r.estado === 'Pendiente' || r.estado === 'En Revisión').length, [state.reqPagos])
  const cxpPend      = useMemo(() => (state.cuentasPorPagar || []).filter(c => c.estado === 'Pendiente').length, [state.cuentasPorPagar])

  // ── KPIs SIG-FO-093 ────────────────────────────────────────────────────
  const kpiReqAtendidos = useMemo(() => {
    if (!requerimientos.length) return null
    const atendidos = requerimientos.filter(r =>
      ['Completado','Derivado a Kit','Completado OC','Atendido','Completado - OC Generada'].includes(r.estado)
    ).length
    return { valor: Math.round((atendidos / requerimientos.length) * 100), total: requerimientos.length, atendidos }
  }, [requerimientos])

  const kpiReqObservados = useMemo(() => {
    if (!requerimientos.length) return null
    const rechazados = requerimientos.filter(r => r.estado === 'Rechazado').length
    return { valor: Math.round((rechazados / requerimientos.length) * 100), total: requerimientos.length, rechazados }
  }, [requerimientos])

  const kpiBienesConformes = useMemo(() => {
    if (!conformidades.length) return null
    const totalConf = conformidades.length
    const conformes = conformidades.filter(c => {
      if (!c.items || !c.items.length) return c.resultado === 'Conforme'
      return c.items.every(it => it.estado === 'Conforme')
    }).length
    return { valor: Math.round((conformes / totalConf) * 100), total: totalConf, conformes }
  }, [conformidades])

  const kpiTiempoProveedor = useMemo(() => {
    const ocMap = Object.fromEntries((ordenesCompra || []).map(o => [o.id, o]))
    const diffs = (conformidades || [])
      .filter(c => c.ocId && ocMap[c.ocId] && c.fecha && ocMap[c.ocId].fecha)
      .map(c => {
        const dias = (new Date(c.fecha) - new Date(ocMap[c.ocId].fecha)) / 86400000
        return dias >= 0 ? dias : null
      }).filter(d => d !== null)
    if (!diffs.length) return null
    const promedio = diffs.reduce((s, d) => s + d, 0) / diffs.length
    return { valor: Math.round(promedio * 10) / 10, total: diffs.length }
  }, [conformidades, ordenesCompra])

  const kpiCotizaciones3Prov = useMemo(() => {
    if (!solicitudesCotizacion.length) return null
    const total = solicitudesCotizacion.length
    const con3 = solicitudesCotizacion.filter(s => (s.proveedores || []).length >= 3).length
    return { valor: Math.round((con3 / total) * 100), total, con3 }
  }, [solicitudesCotizacion])

  const kpiTiempoREQ = useMemo(() => {
    const cerrados = (requerimientos || []).filter(r => r.fecha && r.fechaCierre)
    if (!cerrados.length) return null
    const diffs = cerrados.map(r => (new Date(r.fechaCierre) - new Date(r.fecha)) / 86400000).filter(d => d >= 0)
    if (!diffs.length) return null
    const promedio = diffs.reduce((s, d) => s + d, 0) / diffs.length
    return { valor: Math.round(promedio * 10) / 10, total: diffs.length }
  }, [requerimientos])

  const kpiOCUrgentes = useMemo(() => {
    const ocs2 = ordenesCompra || []
    if (!ocs2.length) return null
    const urgentes = ocs2.filter(o => o.urgente === true).length
    return { valor: Math.round((urgentes / ocs2.length) * 100), urgentes, total: ocs2.length }
  }, [ordenesCompra])

  const kpiServiciosConformes = useMemo(() => {
    const servicios = (conformidades || []).filter(c => c.tipoRecepcion === 'Servicio')
    if (!servicios.length) return null
    const conformes = servicios.filter(c => {
      if (!c.items || !c.items.length) return c.resultado === 'Conforme'
      return c.items.every(it => it.estado === 'Conforme')
    }).length
    return { valor: Math.round((conformes / servicios.length) * 100), conformes, total: servicios.length }
  }, [conformidades])

  // ── Gasto chart 6 meses ──────────────────────────────────────────────────
  const gastoChart = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now); d.setMonth(d.getMonth() - (5 - i))
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('es-PE', { month: 'short' })
      const total = facturas.filter(f => f.fecha.startsWith(key))
        .reduce((s, f) => s + (f.items || []).reduce((ss, it) => ss + it.cantidad * it.precioUnit, 0), 0)
      return { label, total: Math.round(total) }
    }), [facturas])

  // ── Top productos consumidos ─────────────────────────────────────────────
  const topProds = useMemo(() => {
    const map = {}
    movimientos.filter(m => m.tipo === 'SALIDA').forEach(m => {
      map[m.producto] = (map[m.producto] || 0) + Math.abs(m.cantidad)
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([name, val]) => ({ name: name.length > 20 ? name.slice(0, 18) + '…' : name, val }))
  }, [movimientos])

  // ── Actividad reciente ───────────────────────────────────────────────────
  const actividad = useMemo(() => {
    const rows = []
    if (puedeVer('requerimientos'))
      [...requerimientos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 4).forEach(r =>
        rows.push({ fecha: r.fecha, tipo: 'REQ', numero: r.numero, desc: r.responsable || '—', estado: r.estado })
      )
    if (puedeVer('ordenes-compra'))
      [...ocs].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 4).forEach(o =>
        rows.push({ fecha: o.fecha, tipo: 'OC', numero: o.numero, desc: provMap[o.proveedorId] || '—', estado: o.estado })
      )
    if (puedeVer('facturas'))
      [...facturas].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 4).forEach(f =>
        rows.push({ fecha: f.fecha, tipo: 'FAC', numero: f.numero, desc: provMap[f.proveedorId] || '—', estado: f.estado })
      )
    if (puedeVer('req-pago'))
      [...(state.reqPagos || [])].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 3).forEach(r =>
        rows.push({ fecha: r.fecha, tipo: 'PAGO', numero: r.numero, desc: r.beneficiario || '—', estado: r.estado })
      )
    return rows.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 10)
  }, [requerimientos, ocs, facturas, provMap, puedeVer, state.reqPagos])

  // ── Ciclo operativo ──────────────────────────────────────────────────────
  const cicloAll = [
    { label: 'Requerimientos', total: reqTotal,   pendiente: reqPend,  color: '#f59e0b', path: '/requerimientos',  modulo: 'requerimientos' },
    { label: 'Órd. de Compra', total: ocTotal,    pendiente: ocPend,   color: '#3b82f6', path: '/ordenes-compra',  modulo: 'ordenes-compra' },
    { label: 'Facturas',       total: facturas.length, pendiente: facturas.filter(f => f.estado === 'Pendiente').length, color: '#8b5cf6', path: '/facturas', modulo: 'facturas' },
    { label: 'Almacén Stock',  total: Object.keys(inventario).reduce((s, k) => s + Object.keys(inventario[k]).length, 0), pendiente: stockCritico, color: '#10b981', path: '/almacen', modulo: 'almacen' },
    { label: 'Req. de Pago',   total: (state.reqPagos || []).length, pendiente: reqPagosPend, color: '#06b6d4', path: '/req-pago', modulo: 'req-pago' },
    { label: 'Ctas. x Pagar',  total: (state.cuentasPorPagar || []).length, pendiente: cxpPend, color: '#f43f5e', path: '/cuentas-por-pagar', modulo: 'cuentas-por-pagar' },
  ]
  const ciclo = cicloAll.filter(c => puedeVer(c.modulo))

  // ── Valor por sede ───────────────────────────────────────────────────────
  const valorPorSede = useMemo(() => {
    const map = {}
    ;(state.transferencias || []).forEach(t => {
      const sid = t.sedeDestinoId; if (!sid) return
      const total = t.total || t.items?.reduce((s, it) => s + (it.precioTotal || it.cantidad * (it.precioUnit || 0)), 0) || 0
      if (!map[sid]) map[sid] = { total: 0, vales: 0, mes: 0 }
      map[sid].total += total
      map[sid].vales += 1
      if (t.fecha?.startsWith(thisMonth)) map[sid].mes += total
    })
    return map
  }, [state.transferencias])

  // ── Alertas compactas ────────────────────────────────────────────────────
  const alertas = [
    eppAlerta > 0    && puedeVer('epps')            && { msg: `${eppAlerta} EPP${eppAlerta > 1 ? 's' : ''} vencido${eppAlerta > 1 ? 's' : ''}`, level: 'red',   path: '/epps' },
    stockCritico > 0 && puedeVer('almacen')         && { msg: `${stockCritico} producto${stockCritico > 1 ? 's' : ''} bajo stock mínimo`, level: 'amber', path: '/almacen' },
    reqPend > 0      && puedeVer('requerimientos')  && { msg: `${reqPend} REQ pendiente${reqPend > 1 ? 's' : ''}`, level: 'amber', path: '/requerimientos' },
    ocPend > 0       && puedeVer('ordenes-compra')  && { msg: `${ocPend} OC pendiente${ocPend > 1 ? 's' : ''}`, level: 'blue',  path: '/ordenes-compra' },
  ].filter(Boolean)

  // Donut data
  const reqDonut = [
    { name: 'Pendiente', value: reqPend },
    { name: 'Aprobado',  value: reqApro },
    { name: 'Rechazado', value: reqRech },
  ].filter(d => d.value > 0)

  const ocDonut = [
    { name: 'Pendiente', value: ocPend },
    { name: 'Aprobada',  value: ocApro },
    { name: 'Rechazada', value: ocRech },
  ].filter(d => d.value > 0)

  // Estado color map
  const estadoColor = {
    'Pendiente':   'bg-amber-100 text-amber-700',
    'Aprobado':    'bg-emerald-100 text-emerald-700',
    'Aprobada':    'bg-emerald-100 text-emerald-700',
    'Emitida':     'bg-indigo-100 text-indigo-700',
    'Rechazado':   'bg-red-100 text-red-700',
    'Rechazada':   'bg-red-100 text-red-700',
    'En revisión': 'bg-blue-100 text-blue-700',
    'En Revisión': 'bg-blue-100 text-blue-700',
    'Recibida':    'bg-emerald-100 text-emerald-700',
    'Cerrado':     'bg-gray-100 text-gray-600',
  }

  const tipoConfig = {
    REQ:  { short: 'REQ',  color: 'bg-amber-50 text-amber-700 border border-amber-200',  nav: '/requerimientos' },
    OC:   { short: 'OC',   color: 'bg-blue-50 text-blue-700 border border-blue-200',     nav: '/ordenes-compra' },
    FAC:  { short: 'FAC',  color: 'bg-violet-50 text-violet-700 border border-violet-200', nav: '/facturas' },
    PAGO: { short: 'PAGO', color: 'bg-cyan-50 text-cyan-700 border border-cyan-200',     nav: '/req-pago' },
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 pb-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] text-gray-400 font-medium">Inicio · Dashboard</p>
          <h1 className="text-xl font-black text-[#1e3a5f]">
            {greeting()}, {user?.nombre?.split(' ')[0] || 'Usuario'}
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-white border border-gray-100 rounded-lg px-3 py-1.5 shadow-sm">
          <span>📅</span>
          <span>{now.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>

      {/* ── Alertas pills ── */}
      {alertas.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {alertas.map((a, i) => (
            <button key={i} onClick={() => navigate(a.path)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:shadow-sm active:scale-95 ${
                a.level === 'red'   ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' :
                a.level === 'amber' ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' :
                                      'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
              }`}>
              <ExclamationCircleIcon className="w-3.5 h-3.5" />
              {a.msg}
              <span className="opacity-50">→</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Row 1: 2 stat cards + 2 donuts + 1 highlight ── */}
      <div className="grid gap-3" style={{ gridTemplateColumns: isMobile ? 'repeat(2,minmax(0,1fr))' : 'repeat(4,minmax(0,1fr))' }}>

        {/* REQs del mes */}
        {puedeVer('requerimientos') && (
          <StatCard
            label="REQs del Mes"
            value={reqMes}
            sub={`${reqPend} pendiente${reqPend !== 1 ? 's' : ''} · ${reqTotal} total`}
            trend={calcTrend(reqMes, reqMesAnt)}
            trendUp={false}
            Icon={ClipboardDocumentListIcon}
            iconBg="bg-amber-500"
            onClick={() => navigate('/requerimientos')}
          />
        )}

        {/* Órdenes de Compra */}
        {puedeVer('ordenes-compra') && (
          <StatCard
            label="Órdenes de Compra"
            value={ocTotal}
            sub={`${ocMes} este mes · ${ocPend} pendiente${ocPend !== 1 ? 's' : ''}`}
            trend={calcTrend(ocMes, ocMesAnt)}
            trendUp={false}
            Icon={DocumentCheckIcon}
            iconBg="bg-blue-500"
            onClick={() => navigate('/ordenes-compra')}
          />
        )}

        {/* Donut REQs */}
        {puedeVer('requerimientos') && (
          <DonutCard
            label="Estado Requerimientos"
            data={reqDonut}
            total={reqTotal}
            onClick={() => navigate('/requerimientos')}
          />
        )}

        {/* Donut OCs */}
        {puedeVer('ordenes-compra') && (
          <DonutCard
            label="Estado Órd. de Compra"
            data={ocDonut}
            total={ocTotal}
            onClick={() => navigate('/ordenes-compra')}
          />
        )}

        {/* Highlight: Gasto + Inventario */}
        {puedeVer('facturas') && (
          <div style={{ gridColumn: isMobile ? '1 / -1' : 'auto' }}>
          <HighlightCard
            label1="Gasto del Mes"
            value1={fmtMoney(gastoMes)}
            trendVal={calcTrend(gastoMes, gastoMesAnt)}
            label2="Valor en Almacén"
            value2={fmtMoney(valorInventario)}
            chartData={gastoChart}
          />
          </div>
        )}
      </div>

      {/* ── Row 2: 4 alert cards ── */}
      <div className="grid gap-3" style={{ gridTemplateColumns: isMobile ? 'repeat(2,minmax(0,1fr))' : 'repeat(4,minmax(0,1fr))' }}>

        {puedeVer('epps') && (
          <StatCard
            label="EPPs Vencidos"
            value={eppAlerta}
            sub="requieren cambio inmediato"
            Icon={ShieldExclamationIcon}
            iconBg={eppAlerta > 0 ? 'bg-red-500' : 'bg-gray-300'}
            alert={eppAlerta > 0}
            onClick={() => navigate('/epps')}
          />
        )}

        {puedeVer('almacen') && (
          <StatCard
            label="Stock Crítico"
            value={stockCritico}
            sub="productos bajo mínimo"
            Icon={CubeIcon}
            iconBg={stockCritico > 0 ? 'bg-orange-500' : 'bg-gray-300'}
            alert={stockCritico > 0}
            onClick={() => navigate('/almacen')}
          />
        )}

        {puedeVer('req-pago') && (
          <StatCard
            label="Req. de Pago Pend."
            value={reqPagosPend}
            sub={`${reqPagosMes} este mes`}
            Icon={CurrencyDollarIcon}
            iconBg={reqPagosPend > 0 ? 'bg-cyan-500' : 'bg-gray-300'}
            onClick={() => navigate('/req-pago')}
          />
        )}

        {puedeVer('cuentas-por-pagar') && (
          <StatCard
            label="Cuentas por Pagar"
            value={cxpPend}
            sub="facturas pendientes de pago"
            Icon={CreditCardIcon}
            iconBg={cxpPend > 0 ? 'bg-rose-500' : 'bg-gray-300'}
            alert={cxpPend > 0}
            onClick={() => navigate('/cuentas-por-pagar')}
          />
        )}
      </div>

      {/* ── KPIs SIG-FO-093 ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-bold text-gray-800">Indicadores de Gestión</p>
            <p className="text-[10px] text-gray-400">SIG-FO-093 · Logística y Compras</p>
          </div>
          <span className="text-[10px] bg-[#1e3a5f]/10 text-[#1e3a5f] font-semibold px-2 py-0.5 rounded-full">
            {[kpiReqAtendidos, kpiReqObservados, kpiBienesConformes, kpiTiempoProveedor, kpiCotizaciones3Prov, kpiTiempoREQ, kpiOCUrgentes, kpiServiciosConformes]
              .filter(k => {
                if (!k) return false
                const val = k.valor
                if (k === kpiReqObservados) return val <= 5
                if (k === kpiTiempoProveedor) return val <= 5
                if (k === kpiTiempoREQ) return val <= 7
                if (k === kpiOCUrgentes) return val <= 20
                return val >= 95
              }).length} / 8 KPIs en meta
          </span>
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: isMobile ? 'repeat(2,minmax(0,1fr))' : 'repeat(4,minmax(0,1fr))' }}>
          {puedeVer('requerimientos') && (
            <KpiCard
              label="% REQ Atendidos"
              valor={kpiReqAtendidos?.valor ?? null}
              meta={95} sentido="mayor"
              sub={kpiReqAtendidos ? `${kpiReqAtendidos.atendidos}/${kpiReqAtendidos.total}` : undefined}
              descripcion="Requerimientos completados vs total"
            />
          )}
          {puedeVer('requerimientos') && (
            <KpiCard
              label="% REQ Observados"
              valor={kpiReqObservados?.valor ?? null}
              meta={5} sentido="menor"
              sub={kpiReqObservados ? `${kpiReqObservados.rechazados} rechazados` : undefined}
              descripcion="Requerimientos rechazados vs total"
            />
          )}
          {puedeVer('almacen') && (
            <KpiCard
              label="Bienes Conformes 1ª Rec."
              valor={kpiBienesConformes?.valor ?? null}
              meta={95} sentido="mayor"
              sub={kpiBienesConformes ? `${kpiBienesConformes.conformes}/${kpiBienesConformes.total}` : undefined}
              descripcion="Recepciones sin observaciones"
            />
          )}
          {puedeVer('ordenes-compra') && (
            <KpiCard
              label="T. Atención Proveedor"
              valor={kpiTiempoProveedor?.valor ?? null}
              unidad="días" meta={5} sentido="menor"
              sub={kpiTiempoProveedor ? `${kpiTiempoProveedor.total} OC evaluadas` : undefined}
              descripcion="Días OC emitida → recepción conforme"
            />
          )}
          {puedeVer('cotizaciones') && (
            <KpiCard
              label="Cotizaciones ≥3 Proveedores"
              valor={kpiCotizaciones3Prov?.valor ?? null}
              meta={95} sentido="mayor"
              sub={kpiCotizaciones3Prov ? `${kpiCotizaciones3Prov.con3}/${kpiCotizaciones3Prov.total}` : undefined}
              descripcion="Cotizaciones con competencia mínima"
            />
          )}
          {puedeVer('requerimientos') && (
            <KpiCard
              label="T. Atención REQ"
              valor={kpiTiempoREQ?.valor ?? null}
              unidad="días" meta={7} sentido="menor"
              sub={kpiTiempoREQ ? `${kpiTiempoREQ.total} REQ cerrados` : undefined}
              descripcion="Días promedio apertura → cierre de REQ"
            />
          )}
          {puedeVer('ordenes-compra') && (
            <KpiCard
              label="Compras Urgentes"
              valor={kpiOCUrgentes?.valor ?? null}
              meta={20} sentido="menor"
              sub={kpiOCUrgentes ? `${kpiOCUrgentes.urgentes}/${kpiOCUrgentes.total} OC` : undefined}
              descripcion="% de OC marcadas como urgentes"
            />
          )}
          {puedeVer('almacen') && (
            <KpiCard
              label="Servicios Conformes"
              valor={kpiServiciosConformes?.valor ?? null}
              meta={95} sentido="mayor"
              sub={kpiServiciosConformes ? `${kpiServiciosConformes.conformes}/${kpiServiciosConformes.total} servicios` : undefined}
              descripcion="Servicios conformes en 1ª recepción"
            />
          )}
        </div>
      </div>

      {/* ── Ciclo operativo ── */}
      {ciclo.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3">
            Ciclo Operativo &nbsp;REQ → OC → Factura → Almacén
          </p>
          <div className="overflow-x-auto -mx-1 px-1">
            <div className="flex items-stretch gap-2" style={{ minWidth: ciclo.length * 110 }}>
              {ciclo.map((c, i) => (
                <CicloStep
                  key={c.label}
                  item={c}
                  isLast={i === ciclo.length - 1}
                  onClick={() => navigate(c.path)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Gráfico gasto + actividad reciente ── */}
      <div className="grid gap-3" style={{ gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,minmax(0,1fr))' }}>

        {/* Gasto mensual — 2 cols en desktop, full en móvil */}
        {puedeVer('facturas') && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4" style={{ gridColumn: isMobile ? 'auto' : 'span 2 / span 2' }}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-bold text-gray-800">Gasto de Compras</p>
                <p className="text-xs text-gray-400">Últimos 6 meses</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black text-[#1e3a5f]">{fmtMoney(gastoMes)}</p>
                <div className="flex items-center justify-end gap-1.5 mt-0.5">
                  <TrendBadge val={calcTrend(gastoMes, gastoMesAnt)} up={false} />
                  <span className="text-[10px] text-gray-400">vs mes anterior</span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={gastoChart} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>

                <defs>
                  <linearGradient id="gastoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1e3a5f" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#1e3a5f" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip
                  formatter={v => [fmtMoney(v), 'Gasto']}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
                />
                <Area type="monotone" dataKey="total" stroke="#1e3a5f" strokeWidth={2.5}
                  fill="url(#gastoGrad)" dot={{ r: 3, fill: '#1e3a5f', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Actividad reciente — 1 col */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-bold text-gray-800 mb-3">Actividad Reciente</p>
          {actividad.length === 0
            ? <p className="text-xs text-gray-400 text-center py-8">Sin actividad registrada</p>
            : (
              <div className="space-y-1">
                {actividad.map((a, i) => {
                  const tc = tipoConfig[a.tipo] || { short: a.tipo, color: 'bg-gray-50 text-gray-600 border border-gray-200', nav: '/' }
                  return (
                    <button key={i}
                      onClick={() => navigate(tc.nav)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                    >
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${tc.color}`}>
                        {tc.short}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-gray-700 truncate">
                          {a.numero} · <span className="font-normal text-gray-500">{a.desc}</span>
                        </p>
                        <p className="text-[9px] text-gray-400">{fmtDate(a.fecha)}</p>
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${estadoColor[a.estado] || 'bg-gray-100 text-gray-500'}`}>
                        {a.estado}
                      </span>
                    </button>
                  )
                })}
              </div>
            )
          }
        </div>
      </div>

      {/* ── Top productos consumidos ── */}
      {puedeVer('almacen') && topProds.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <p className="text-sm font-bold text-gray-800 mb-4">Top Productos — Salidas de Almacén</p>
          <div className="space-y-2.5">
            {topProds.map((p, i) => {
              const maxVal = topProds[0]?.val || 1
              const pct = Math.round((p.val / maxVal) * 100)
              const colors = ['bg-[#1e3a5f]', 'bg-blue-500', 'bg-blue-400', 'bg-blue-300', 'bg-blue-200']
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-medium text-gray-700">{p.name}</span>
                    <span className="text-[11px] font-bold text-gray-800">{p.val} un.</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className={`h-1.5 rounded-full transition-all ${colors[i] || 'bg-blue-200'}`}
                      style={{ width: `${Math.max(4, pct)}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Valor despachado por sede ── */}
      {sedes.length > 0 && puedeVer('almacen') && (() => {
        const maxVal = Math.max(...sedes.map(s => valorPorSede[s.id]?.total || 0), 1)
        const totalGlobal = sedes.reduce((s, sede) => s + (valorPorSede[sede.id]?.total || 0), 0)
        return (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <BuildingOfficeIcon className="w-4 h-4 text-gray-400" />
                  Valor Despachado por Sede
                </p>
                <p className="text-xs text-gray-400">Insumos entregados vía vales de salida</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400">Total histórico</p>
                <p className="text-base font-black text-[#1e3a5f]">{fmtMoney(totalGlobal)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-5">
              {sedes.map(s => {
                const d = valorPorSede[s.id] || { total: 0, vales: 0, mes: 0 }
                const pct = Math.round((d.total / maxVal) * 100)
                const share = totalGlobal > 0 ? Math.round((d.total / totalGlobal) * 100) : 0
                const kits  = (uniformeEntregas || []).filter(e => e.sedeNombre === s.nombre && e.estado === 'Activo').length
                const eppsS = epps.filter(e => e.sedeId === s.id && e.estado_personal !== 'Renunció').length
                return (
                  <div key={s.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-800">{s.nombre}</span>
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-semibold">{share}%</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-[#1e3a5f]">{fmtMoney(d.total)}</p>
                        <p className="text-[10px] text-gray-400">{d.vales} vales</p>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div className="h-2 rounded-full bg-gradient-to-r from-[#1e3a5f] to-[#3b82f6] transition-all"
                        style={{ width: `${Math.max(2, pct)}%` }} />
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] text-gray-400">🦺 {eppsS} EPPs</span>
                      <span className="text-[10px] text-gray-400">👕 {kits} kits</span>
                      <span className="text-[10px] text-emerald-600 font-semibold">{fmtMoney(d.mes)} este mes</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

    </div>
  )
}
