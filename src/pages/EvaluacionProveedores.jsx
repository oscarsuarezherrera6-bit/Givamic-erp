import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { useToast } from '../components/layout/Toast'
import { fmtDate } from '../utils/helpers'
import { PlusIcon, TrashIcon, EyeIcon, ChartBarIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline'
import Modal from '../components/common/Modal'
import PageHeader from '../components/common/PageHeader'
import Confirm from '../components/common/Confirm'

// ─── Constantes del formato SIG-FO-113 (solo valores 1, 3 y 5) ────────────────────
const RIESGO_CRITERIOS = [
  { id: 'impactoCalidad',    nombre: 'Impacto en la calidad',              peso: 25,
    desc: 'Qué tanto el producto o servicio del proveedor influye en la calidad final que recibe el cliente.',
    escala: {
      1: 'No afecta la calidad final del producto o servicio entregado al cliente.',
      3: 'Afecta parcialmente la calidad; el problema puede corregirse internamente.',
      5: 'Afecta directamente la calidad final, puede generar producto no conforme o reclamos del cliente.',
    }},
  { id: 'impactoContinuidad', nombre: 'Impacto en continuidad operativa',   peso: 20,
    desc: 'Qué tan grave sería para la operación si el proveedor se retrasa o falla.',
    escala: {
      1: 'Su ausencia no afecta la continuidad operativa.',
      3: 'Genera retrasos moderados que pueden gestionarse.',
      5: 'Su falla detiene o paraliza la operación.',
    }},
  { id: 'impactoLegal',      nombre: 'Impacto legal / normativo',           peso: 15,
    desc: 'Riesgo de incumplir leyes, normas ambientales, de seguridad y salud en el trabajo, así como riesgos de soborno, corrupción o prácticas indebidas, asociados al proveedor o al servicio prestado.',
    escala: {
      1: 'No genera riesgos legales, normativos ni de compliance.',
      3: 'Puede generar observaciones o incumplimientos menores.',
      5: 'Alto riesgo de sanciones legales, multas o impacto reputacional.',
    }},
  { id: 'sustituibilidad',   nombre: 'Sustituibilidad',                     peso: 15,
    desc: 'Qué tan fácil y rápido es cambiar de proveedor sin afectar el proceso.',
    escala: {
      1: 'Hay muchos proveedores alternativos; el cambio es inmediato.',
      3: 'Existen alternativas pero el cambio requiere tiempo o costo.',
      5: 'Es muy difícil sustituirlo; no hay alternativas viables a corto plazo.',
    }},
  { id: 'nivelDependencia',  nombre: 'Nivel de dependencia',                peso: 15,
    desc: 'Qué tan dependiente es la organización del proveedor (exclusividad, contratos, conocimiento técnico).',
    escala: {
      1: 'No hay dependencia; relación comercial estándar.',
      3: 'Dependencia moderada por contrato o conocimiento especializado.',
      5: 'Alta dependencia; exclusividad o tecnología propietaria sin sustituto.',
    }},
  { id: 'historialDesempeno', nombre: 'Historial de desempeño',             peso: 10,
    desc: 'Qué tan bien ha cumplido el proveedor en entregas, calidad y solución de problemas en el pasado.',
    escala: {
      1: 'Excelente historial; sin incidentes relevantes.',
      3: 'Historial aceptable; incidentes menores resueltos.',
      5: 'Historial negativo; incumplimientos frecuentes o problemas sin resolver.',
    }},
]

const VALOR_CRITERIOS = [
  { id: 'aporteNegocio',       nombre: 'Aporte al negocio',         peso: 30,
    desc: 'Qué tanto el proveedor ayuda a cumplir metas importantes del negocio, como crecimiento, eficiencia, expansión, innovación o satisfacción del cliente.',
    escala: {
      1: 'Su aporte al negocio es mínimo o estándar.',
      3: 'Apoya parcialmente los objetivos del negocio.',
      5: 'Contribuye de forma clave al crecimiento o mejora del negocio.',
    }},
  { id: 'diferenciacion',      nombre: 'Diferenciación',             peso: 25,
    desc: 'Si el proveedor ofrece algo que nos hace mejores o diferentes frente a la competencia (mejor precio, mejor tecnología, mejor servicio o mayor rapidez).',
    escala: {
      1: 'No ofrece diferenciación; es un proveedor genérico.',
      3: 'Aporta alguna ventaja competitiva puntual.',
      5: 'Nos diferencia claramente de la competencia.',
    }},
  { id: 'relacionLargoPlazo',  nombre: 'Relación a largo plazo',     peso: 25,
    desc: 'Qué tan dispuesto está el proveedor a trabajar en conjunto, adaptarse a necesidades, mejorar procesos y apoyar a largo plazo.',
    escala: {
      1: 'Relación transaccional; sin interés en colaboración.',
      3: 'Abierto a colaborar en situaciones específicas.',
      5: 'Aliado estratégico; alto nivel de colaboración y adaptación.',
    }},
  { id: 'impactoEconomico',    nombre: 'Impacto económico',          peso: 20,
    desc: 'Qué tanto el proveedor ayuda a reducir costos, mejorar la rentabilidad o generar crecimiento económico para la organización.',
    escala: {
      1: 'No impacta significativamente los costos ni la rentabilidad.',
      3: 'Genera ahorro o valor económico moderado.',
      5: 'Alto impacto en reducción de costos o mejora de rentabilidad.',
    }},
]

const calcRiesgo = (vals) => RIESGO_CRITERIOS.reduce((s,c) => s + c.peso * (vals[c.id]||0), 0)
const calcValor  = (vals) => VALOR_CRITERIOS.reduce((s,c)  => s + c.peso * (vals[c.id]||0), 0)
const clasifRiesgo = (p) => p >= 400 ? 'CRÍTICO' : 'NO CRÍTICO'
const clasifValor  = (p) => p >= 350 ? 'ESTRATÉGICO' : 'NO ESTRATÉGICO'
const clasifFinal  = (r, v) => {
  if (r === 'CRÍTICO' && v === 'ESTRATÉGICO')     return 'CRÍTICO Y ESTRATÉGICO'
  if (r === 'CRÍTICO' && v === 'NO ESTRATÉGICO')  return 'CRÍTICO'
  if (r === 'NO CRÍTICO' && v === 'ESTRATÉGICO')  return 'ESTRATÉGICO'
  return 'NO CRÍTICO / NO ESTRATÉGICO'
}
const accionFinal = (cf) => {
  if (cf === 'CRÍTICO Y ESTRATÉGICO') return 'Evaluación inicial detallada y reevaluación periódica (mínimo semestral o ante cambios relevantes).'
  if (cf === 'CRÍTICO')               return 'Evaluación inicial obligatoria y reevaluación semestral para confirmar que se mantienen las condiciones de riesgo controlado.'
  if (cf === 'ESTRATÉGICO')           return 'Evaluación inicial y reevaluación anual para verificar que continúa aportando valor al negocio.'
  return 'No pasan por evaluación formal detallada, debido a su bajo impacto. Su control se realiza mediante la verificación en la recepción del bien o servicio.'
}
const colorFinal = (cf) => {
  if (cf === 'CRÍTICO Y ESTRATÉGICO') return { bg:'bg-red-600',    text:'text-white',      badge:'bg-red-100 text-red-700',    border:'border-red-300' }
  if (cf === 'CRÍTICO')               return { bg:'bg-red-500',    text:'text-white',      badge:'bg-red-100 text-red-700',    border:'border-red-200' }
  if (cf === 'ESTRATÉGICO')           return { bg:'bg-yellow-400', text:'text-gray-900',   badge:'bg-yellow-100 text-yellow-800', border:'border-yellow-300' }
  return                                     { bg:'bg-emerald-500', text:'text-white',      badge:'bg-emerald-100 text-emerald-700', border:'border-emerald-200' }
}

// ─── Selector calificación 1-5 ─────────────────────────────
function CalifSelector({ value, onChange, peso, escala }) {
  return (
    <div>
      <div className="flex items-center gap-1.5">
        {[1,3,5].map(n => (
          <button key={n} type="button"
            title={escala[n] || ''}
            onClick={()=>onChange(n)}
            className={`w-9 h-9 rounded-lg text-sm font-bold border-2 transition-colors ${
              value===n
                ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white'
                : 'border-gray-200 bg-white text-gray-500 hover:border-[#1e3a5f] hover:text-[#1e3a5f]'}`}>
            {n}
          </button>
        ))}
        <span className="ml-2 w-10 text-right text-sm font-black text-[#1e3a5f]">
          {value > 0 ? peso * value : '—'}
        </span>
      </div>
      {/* Altura fija: el contenido cambia pero el layout NO se mueve */}
      <div className="h-8 overflow-hidden mt-1.5">
        <p className="text-[10px] leading-tight text-gray-500 italic">
          {value > 0
            ? <><span className="font-bold not-italic text-[#1e3a5f]">{value} —</span> {escala[value]}</>
            : <span className="text-gray-300">Pasa el cursor sobre un número para ver su descripción</span>}
        </p>
      </div>
    </div>
  )
}

// ─── Hook métricas operativas por proveedor ────────────────
function useMetricasProveedor(proveedorId, state) {
  return useMemo(() => {
    if (!proveedorId) return null
    const ocs    = (state.ordenesCompra  || []).filter(o => o.proveedorId === proveedorId)
    const facts  = (state.facturas       || []).filter(f => f.proveedorId === proveedorId)
    const confs  = (state.conformidades  || []).filter(c => {
      const f = facts.find(f => f.id === c.facturaId)
      return !!f
    })

    // Tiempo entrega: OC.fecha → Factura.fecha (linked via conformidad)
    const tiempos = confs.map(c => {
      const oc  = ocs.find(o => o.id === c.ocId)
      const fac = facts.find(f => f.id === c.facturaId)
      if (!oc?.fecha || !fac?.fecha) return null
      const dias = Math.round((new Date(fac.fecha) - new Date(oc.fecha)) / 86400000)
      const esperado = oc.fechaEntregaEsperada
        ? Math.round((new Date(oc.fechaEntregaEsperada) - new Date(oc.fecha)) / 86400000)
        : null
      const aTiempo = esperado !== null ? dias <= esperado : null
      return { ocNumero: oc.numero, ocFecha: oc.fecha, facFecha: fac.fecha,
               fechaEsperada: oc.fechaEntregaEsperada, dias, esperado, aTiempo }
    }).filter(Boolean)

    const diasProm   = tiempos.length ? Math.round(tiempos.reduce((s,t)=>s+t.dias,0)/tiempos.length) : null
    const aTiempoN   = tiempos.filter(t=>t.aTiempo===true).length
    const conPlazo   = tiempos.filter(t=>t.aTiempo!==null).length
    const pctPlazo   = conPlazo > 0 ? Math.round(aTiempoN/conPlazo*100) : null

    // Calidad: items de conformidades
    const todosItems = confs.flatMap(c => c.items || [])
    const conformes  = todosItems.filter(i => i.estado === 'Conforme').length
    const pctCalidad = todosItems.length > 0 ? Math.round(conformes/todosItems.length*100) : null

    return { ocs: ocs.length, confs: confs.length, tiempos, diasProm,
             pctPlazo, aTiempoN, conPlazo,
             totalItems: todosItems.length, conformes, pctCalidad }
  }, [proveedorId, state.ordenesCompra, state.facturas, state.conformidades])
}

// ─── Panel métricas (usado en form y en tab) ───────────────
function PanelMetricas({ m, provNombre }) {
  if (!m) return null
  if (m.ocs === 0) return (
    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
      Sin OCs registradas para este proveedor. Las métricas estarán disponibles una vez se generen órdenes de compra.
    </div>
  )
  const colorPct = (v) => v===null?'text-gray-400':v>=80?'text-emerald-600':v>=60?'text-amber-600':'text-red-600'
  const bgPct    = (v) => v===null?'bg-gray-50':v>=80?'bg-emerald-50':v>=60?'bg-amber-50':'bg-red-50'
  const borderPct= (v) => v===null?'border-gray-100':v>=80?'border-emerald-100':v>=60?'border-amber-100':'border-red-100'

  return (
    <div className="space-y-3">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {[
          { label:'OCs emitidas', value: m.ocs, unit:'', color:'text-[#1e3a5f]', bg:'bg-blue-50', border:'border-blue-100' },
          { label:'Con recepción', value: m.confs, unit:'', color:'text-[#1e3a5f]', bg:'bg-blue-50', border:'border-blue-100' },
          { label:'Tiempo prom.', value: m.diasProm !== null ? m.diasProm : '—', unit: m.diasProm!==null?'días':'', color:'text-[#1e3a5f]', bg:'bg-blue-50', border:'border-blue-100' },
          { label:'% a tiempo', value: m.pctPlazo !== null ? m.pctPlazo+'%' : '—', unit:'', color:colorPct(m.pctPlazo), bg:bgPct(m.pctPlazo), border:borderPct(m.pctPlazo) },
        ].map(k => (
          <div key={k.label} className={`${k.bg} border ${k.border} rounded-xl p-3 text-center`}>
            <p className={`text-xl font-black ${k.color}`}>{k.value}<span className="text-xs font-normal ml-0.5">{k.unit}</span></p>
            <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Calidad */}
      {m.totalItems > 0 && (
        <div className={`${bgPct(m.pctCalidad)} border ${borderPct(m.pctCalidad)} rounded-xl px-4 py-3 flex items-center justify-between`}>
          <div>
            <p className="text-xs font-bold text-gray-700">Calidad en recepciones</p>
            <p className="text-[11px] text-gray-500">{m.conformes} conformes de {m.totalItems} ítems recibidos</p>
          </div>
          <span className={`text-2xl font-black ${colorPct(m.pctCalidad)}`}>{m.pctCalidad}%</span>
        </div>
      )}

      {/* Historial entregas */}
      {m.tiempos.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Historial de entregas</p>
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500">
                  <th className="px-3 py-2 text-left font-semibold">OC</th>
                  <th className="px-3 py-2 text-left font-semibold">Emisión OC</th>
                  <th className="px-3 py-2 text-left font-semibold">Fecha esperada</th>
                  <th className="px-3 py-2 text-left font-semibold">Recepción</th>
                  <th className="px-3 py-2 text-center font-semibold">Días</th>
                  <th className="px-3 py-2 text-center font-semibold">Plazo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {m.tiempos.map((t,i) => (
                  <tr key={i} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2 font-mono text-gray-600">{t.ocNumero}</td>
                    <td className="px-3 py-2 text-gray-500">{fmtDate(t.ocFecha)}</td>
                    <td className="px-3 py-2 text-gray-500">{t.fechaEsperada ? fmtDate(t.fechaEsperada) : '—'}</td>
                    <td className="px-3 py-2 text-gray-500">{fmtDate(t.facFecha)}</td>
                    <td className="px-3 py-2 text-center font-bold text-[#1e3a5f]">{t.dias}</td>
                    <td className="px-3 py-2 text-center">
                      {t.aTiempo===null ? <span className="text-gray-300">—</span>
                       : t.aTiempo
                         ? <span className="text-emerald-600 font-bold">✓ A tiempo</span>
                         : <span className="text-red-500 font-bold">✗ Tarde</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Formulario ────────────────────────────────────────────
function EvalForm({ initial, onClose }) {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const proveedores = state.proveedores || []

  const emptyRiesgo = Object.fromEntries(RIESGO_CRITERIOS.map(c=>[c.id, 0]))
  const emptyValor  = Object.fromEntries(VALOR_CRITERIOS.map(c=>[c.id, 0]))

  const [provId,   setProvId]   = useState(initial?.proveedorId || '')
  const [bienesServ, setBienes] = useState(initial?.bienesServicios || '')
  const [evalPor,  setEvalPor]  = useState(initial?.evaluadoPor || '')
  const [fecha,    setFecha]    = useState(initial?.fecha || new Date().toISOString().slice(0,10))
  const [obs,      setObs]      = useState(initial?.observaciones || '')
  const [riesgo,   setRiesgo]   = useState(initial?.riesgoVals || emptyRiesgo)
  const [valor,    setValor]    = useState(initial?.valorVals || emptyValor)
  const [showMetricas, setShowMetricas] = useState(false)

  const metricas = useMetricasProveedor(provId, state)

  const pRiesgo = calcRiesgo(riesgo)
  const pValor  = calcValor(valor)
  const cRiesgo = clasifRiesgo(pRiesgo)
  const cValor  = clasifValor(pValor)
  const cFinal  = clasifFinal(cRiesgo, cValor)
  const col     = colorFinal(cFinal)
  const prov    = proveedores.find(p=>p.id===provId)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!provId) return toast('Selecciona un proveedor','error')
    if (!evalPor.trim()) return toast('Indica quién realiza la evaluación','error')
    const sinCalif = [...RIESGO_CRITERIOS,...VALOR_CRITERIOS].filter(c=>{
      const val = c.id in riesgo ? riesgo[c.id] : valor[c.id]
      return !val || val === 0
    })
    if (sinCalif.length > 0) return toast(`Califica todos los criterios (faltan ${sinCalif.length})`, 'error')

    dispatch({
      type: initial ? 'UPDATE_EVALUACION_PROV' : 'ADD_EVALUACION_PROV',
      id: initial?.id,
      payload: {
        proveedorId: provId, proveedorNombre: prov?.nombre||'', ruc: prov?.ruc||'',
        bienesServicios: bienesServ, evaluadoPor: evalPor, fecha, observaciones: obs,
        riesgoVals: riesgo, valorVals: valor,
        puntajeRiesgo: pRiesgo, clasificacionRiesgo: cRiesgo,
        puntajeValor: pValor, clasificacionValor: cValor,
        clasificacionFinal: cFinal, accion: accionFinal(cFinal),
      }
    })
    toast(initial ? 'Evaluación actualizada ✓' : 'Evaluación registrada ✓')
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Datos generales */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="text-xs font-semibold text-gray-600 block mb-1">Proveedor evaluado *</label>
          <select className="input" value={provId} onChange={e=>setProvId(e.target.value)}>
            <option value="">Seleccionar proveedor...</option>
            {proveedores.map(p=><option key={p.id} value={p.id}>{p.nombre}{p.ruc?` — ${p.ruc}`:''}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-xs font-semibold text-gray-600 block mb-1">Bienes y/o servicios que suministra</label>
          <input className="input" value={bienesServ} onChange={e=>setBienes(e.target.value)} placeholder="Ej: Insumos de limpieza, guantes, detergentes..." />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Evaluado por *</label>
          <input className="input" value={evalPor} onChange={e=>setEvalPor(e.target.value)} placeholder="Nombre del evaluador" />
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 block mb-1">Fecha *</label>
          <input type="date" className="input" value={fecha} onChange={e=>setFecha(e.target.value)} />
        </div>
      </div>

      {/* Panel métricas operativas */}
      {provId && metricas && (
        <div className="border border-[#1e3a5f]/20 rounded-xl overflow-hidden">
          <button type="button"
            onClick={()=>setShowMetricas(p=>!p)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-[#1e3a5f]/5 hover:bg-[#1e3a5f]/10 transition-colors">
            <div className="flex items-center gap-2">
              <ChartBarIcon className="w-4 h-4 text-[#1e3a5f]"/>
              <span className="text-xs font-bold text-[#1e3a5f]">Desempeño operativo del proveedor</span>
              {metricas.pctCalidad!==null && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${metricas.pctCalidad>=80?'bg-emerald-100 text-emerald-700':metricas.pctCalidad>=60?'bg-amber-100 text-amber-700':'bg-red-100 text-red-700'}`}>
                  Calidad: {metricas.pctCalidad}%
                </span>
              )}
              {metricas.pctPlazo!==null && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${metricas.pctPlazo>=80?'bg-emerald-100 text-emerald-700':metricas.pctPlazo>=60?'bg-amber-100 text-amber-700':'bg-red-100 text-red-700'}`}>
                  Plazo: {metricas.pctPlazo}%
                </span>
              )}
            </div>
            <span className="text-xs text-gray-400">{showMetricas?'▲ Ocultar':'▼ Ver métricas'}</span>
          </button>
          {showMetricas && (
            <div className="p-4 bg-white">
              <PanelMetricas m={metricas} />
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN RIESGO */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="h-px flex-1 bg-gray-200"/>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nivel de Riesgo (Criticidad)</span>
          <div className="h-px flex-1 bg-gray-200"/>
        </div>
        <div className="space-y-4">
          {RIESGO_CRITERIOS.map((c,i) => (
            <div key={c.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <p className="text-xs font-bold text-gray-700 mb-0.5">
                {String(i+1).padStart(2,'0')} · {c.nombre}
                <span className="ml-2 text-[10px] font-normal text-gray-400">Peso: {c.peso}</span>
              </p>
              <p className="text-[11px] text-gray-500 mb-2 leading-tight">{c.desc}</p>
              <CalifSelector value={riesgo[c.id]} onChange={v=>setRiesgo(p=>({...p,[c.id]:v}))} peso={c.peso} escala={c.escala}/>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between bg-[#1e3a5f]/5 rounded-xl px-4 py-2.5 border border-[#1e3a5f]/10">
          <span className="text-xs font-semibold text-gray-600">Total Riesgo</span>
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-[#1e3a5f]">{pRiesgo}</span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${pRiesgo>=400?'bg-red-100 text-red-700':'bg-emerald-100 text-emerald-700'}`}>
              {cRiesgo} {pRiesgo>=400?'(≥400)':'(<400)'}
            </span>
          </div>
        </div>
      </div>

      {/* SECCIÓN VALOR */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="h-px flex-1 bg-gray-200"/>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nivel de Valor (Estrategia)</span>
          <div className="h-px flex-1 bg-gray-200"/>
        </div>
        <div className="space-y-4">
          {VALOR_CRITERIOS.map((c,i) => (
            <div key={c.id} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
              <p className="text-xs font-bold text-gray-700 mb-0.5">
                {String(i+1).padStart(2,'0')} · {c.nombre}
                <span className="ml-2 text-[10px] font-normal text-gray-400">Peso: {c.peso}</span>
              </p>
              <p className="text-[11px] text-gray-500 mb-2 leading-tight">{c.desc}</p>
              <CalifSelector value={valor[c.id]} onChange={v=>setValor(p=>({...p,[c.id]:v}))} peso={c.peso} escala={c.escala}/>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between bg-[#1e3a5f]/5 rounded-xl px-4 py-2.5 border border-[#1e3a5f]/10">
          <span className="text-xs font-semibold text-gray-600">Total Valor</span>
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-[#1e3a5f]">{pValor}</span>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${pValor>=350?'bg-yellow-100 text-yellow-800':'bg-gray-100 text-gray-600'}`}>
              {cValor} {pValor>=350?'(≥350)':'(<350)'}
            </span>
          </div>
        </div>
      </div>

      {/* CLASIFICACIÓN FINAL */}
      {(pRiesgo>0||pValor>0) && (
        <div className={`rounded-2xl border-2 ${col.border} overflow-hidden`}>
          <div className={`${col.bg} ${col.text} px-5 py-3 flex items-center justify-between`}>
            <span className="text-sm font-bold uppercase tracking-wide">Clasificación Final</span>
            <span className="text-lg font-black">{cFinal}</span>
          </div>
          <div className="bg-white px-5 py-3">
            <p className="text-xs font-semibold text-gray-500 mb-1">Acción requerida:</p>
            <p className="text-sm text-gray-700 leading-relaxed">{accionFinal(cFinal)}</p>
          </div>
        </div>
      )}

      <div>
        <label className="text-xs font-semibold text-gray-600 block mb-1">Observaciones</label>
        <textarea className="input resize-none h-16" value={obs} onChange={e=>setObs(e.target.value)} placeholder="Notas adicionales sobre el proveedor..." />
      </div>

      <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
        <button type="submit" className="btn-primary">
          {initial ? 'Actualizar evaluación' : 'Registrar evaluación'}
        </button>
      </div>
    </form>
  )
}

// ─── Vista detalle ─────────────────────────────────────────
function EvalDetalle({ ev, onClose }) {
  const col = colorFinal(ev.clasificacionFinal)
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`${col.bg} ${col.text} rounded-xl px-5 py-4`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-bold">{ev.proveedorNombre}</p>
            <p className="text-sm opacity-80">{ev.ruc} · {ev.bienesServicios}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black">{ev.clasificacionFinal}</p>
            <p className="text-xs opacity-80">{fmtDate(ev.fecha)} · {ev.evaluadoPor}</p>
          </div>
        </div>
      </div>

      {/* Puntajes resumen */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
          <p className="text-3xl font-black text-[#1e3a5f]">{ev.puntajeRiesgo}</p>
          <p className="text-xs text-gray-500 mt-1">Puntaje Riesgo</p>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${ev.clasificacionRiesgo==='CRÍTICO'?'bg-red-100 text-red-700':'bg-emerald-100 text-emerald-700'}`}>{ev.clasificacionRiesgo}</span>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-center">
          <p className="text-3xl font-black text-[#1e3a5f]">{ev.puntajeValor}</p>
          <p className="text-xs text-gray-500 mt-1">Puntaje Valor</p>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${ev.clasificacionValor==='ESTRATÉGICO'?'bg-yellow-100 text-yellow-800':'bg-gray-100 text-gray-600'}`}>{ev.clasificacionValor}</span>
        </div>
      </div>

      {/* Detalle criterios riesgo */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Criterios de Riesgo</p>
        {RIESGO_CRITERIOS.map(c => (
          <div key={c.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50">
            <span className="text-xs text-gray-600 flex-1">{c.nombre}</span>
            <div className="flex gap-0.5">
              {[1,3,5].map(n=><div key={n} className={`w-5 h-5 rounded text-[10px] flex items-center justify-center font-bold ${n===(ev.riesgoVals?.[c.id]||0)?'bg-[#1e3a5f] text-white':'bg-gray-100 text-gray-400'}`}>{n}</div>)}
            </div>
            <span className="text-xs font-bold text-[#1e3a5f] w-12 text-right">{c.peso*(ev.riesgoVals?.[c.id]||0)}</span>
          </div>
        ))}
      </div>

      {/* Detalle criterios valor */}
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Criterios de Valor</p>
        {VALOR_CRITERIOS.map(c => (
          <div key={c.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50">
            <span className="text-xs text-gray-600 flex-1">{c.nombre}</span>
            <div className="flex gap-0.5">
              {[1,3,5].map(n=><div key={n} className={`w-5 h-5 rounded text-[10px] flex items-center justify-center font-bold ${n===(ev.valorVals?.[c.id]||0)?'bg-[#1e3a5f] text-white':'bg-gray-100 text-gray-400'}`}>{n}</div>)}
            </div>
            <span className="text-xs font-bold text-[#1e3a5f] w-12 text-right">{c.peso*(ev.valorVals?.[c.id]||0)}</span>
          </div>
        ))}
      </div>

      {/* Acción */}
      <div className={`rounded-xl border ${col.border} p-4 bg-white`}>
        <p className="text-xs font-bold text-gray-500 mb-1">Acción requerida</p>
        <p className="text-sm text-gray-700">{ev.accion}</p>
      </div>

      {ev.observaciones && (
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
          <p className="text-xs font-bold text-gray-500 mb-1">Observaciones</p>
          <p className="text-sm text-gray-600">{ev.observaciones}</p>
        </div>
      )}

      <div className="flex justify-end pt-2 border-t border-gray-100">
        <button onClick={onClose} className="btn-secondary">Cerrar</button>
      </div>
    </div>
  )
}

// ─── Página principal ──────────────────────────────────────
const CF_COLOR = {
  'CRÍTICO Y ESTRATÉGICO': 'bg-red-600 text-white',
  'CRÍTICO':               'bg-red-100 text-red-700',
  'ESTRATÉGICO':           'bg-yellow-100 text-yellow-800',
  'NO CRÍTICO / NO ESTRATÉGICO': 'bg-emerald-100 text-emerald-700',
}

export default function EvaluacionProveedores() {
  const { state, dispatch } = useApp()
  const toast = useToast()
  const evaluaciones = state.evaluacionesProveedor || []
  const [confirmBox, setConfirmBox] = useState(null)
  const [tab, setTab]             = useState('evaluaciones') // 'evaluaciones' | 'desempeno'
  const [modal, setModal]         = useState(null)
  const [selected, setSelected]   = useState(null)
  const [filtroClasif, setFiltro] = useState('')
  const [filtroProv, setFiltroProv] = useState('')
  const [provDesempeno, setProvDesempeno] = useState('')

  const provMap = useMemo(() => Object.fromEntries((state.proveedores||[]).map(p=>[p.id,p.nombre])), [state.proveedores])

  // KPIs
  const counts = useMemo(() => {
    const c = { 'CRÍTICO Y ESTRATÉGICO':0, 'CRÍTICO':0, 'ESTRATÉGICO':0, 'NO CRÍTICO / NO ESTRATÉGICO':0 }
    evaluaciones.forEach(e => { if (c[e.clasificacionFinal]!==undefined) c[e.clasificacionFinal]++ })
    return c
  }, [evaluaciones])

  // Última evaluación por proveedor
  const ultimasPorProv = useMemo(() => {
    const map = {}
    evaluaciones.forEach(e => {
      if (!map[e.proveedorId] || e.fecha > map[e.proveedorId].fecha) map[e.proveedorId] = e
    })
    return map
  }, [evaluaciones])

  const filtradas = useMemo(() => {
    return evaluaciones
      .filter(e => !filtroClasif || e.clasificacionFinal === filtroClasif)
      .filter(e => !filtroProv  || e.proveedorId === filtroProv)
      .sort((a,b) => b.fecha?.localeCompare(a.fecha||''))
  }, [evaluaciones, filtroClasif, filtroProv])

  const handleDelete = (id) => {
    setConfirmBox({
      message: '¿Eliminar esta evaluación?',
      onConfirm: () => {
        dispatch({ type:'DELETE_EVALUACION_PROV', id })
        toast('Evaluación eliminada')
        setConfirmBox(null)
      }
    })
  }

  const metricasDesempeno = useMetricasProveedor(provDesempeno, state)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Evaluación de Proveedores"
        subtitle="SIG-FO-113 · Clasificación por Riesgo y Valor"
        action={
          <button onClick={()=>setModal('form')} className="btn-primary flex items-center gap-2">
            <PlusIcon className="w-4 h-4"/>Nueva Evaluación
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { id:'evaluaciones', label:'Evaluaciones SIG-FO-113', Icon: ClipboardDocumentCheckIcon },
          { id:'desempeno',    label:'Desempeño Operativo',     Icon: ChartBarIcon },
        ].map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab===t.id ? 'bg-white text-[#1e3a5f] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <t.Icon className="w-4 h-4"/>{t.label}
          </button>
        ))}
      </div>

      {tab === 'evaluaciones' && <>
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { cf:'CRÍTICO Y ESTRATÉGICO', label:'Crítico y Estratégico', bg:'bg-red-600',    text:'text-white' },
          { cf:'CRÍTICO',               label:'Crítico',               bg:'bg-red-100',    text:'text-red-700' },
          { cf:'ESTRATÉGICO',           label:'Estratégico',           bg:'bg-yellow-100', text:'text-yellow-800' },
          { cf:'NO CRÍTICO / NO ESTRATÉGICO', label:'No Crítico / No Estrat.', bg:'bg-emerald-100', text:'text-emerald-700' },
        ].map(k => (
          <div key={k.cf} onClick={()=>setFiltro(p=>p===k.cf?'':k.cf)}
            className={`rounded-2xl border border-gray-100 p-4 cursor-pointer shadow-sm hover:shadow-md transition-all ${filtroClasif===k.cf?'ring-2 ring-[#1e3a5f]':''}`}>
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${k.bg} mb-2`}>
              <span className={`text-xl font-black ${k.text}`}>{counts[k.cf]}</span>
            </div>
            <p className="text-xs font-medium text-gray-600 leading-tight">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <select className="input w-auto text-sm" value={filtroProv} onChange={e=>setFiltroProv(e.target.value)}>
          <option value="">Todos los proveedores</option>
          {(state.proveedores||[]).map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        {filtroClasif && (
          <button onClick={()=>setFiltro('')} className="text-xs text-gray-500 hover:text-gray-700 underline">
            × Quitar filtro: {filtroClasif}
          </button>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="bg-[#1e3a5f] text-white text-[11px] uppercase">
              <th className="table-th text-white">N°</th>
              <th className="table-th text-white">Proveedor</th>
              <th className="table-th text-white">Bienes / Servicios</th>
              <th className="table-th text-white text-center">Riesgo</th>
              <th className="table-th text-white text-center">Valor</th>
              <th className="table-th text-white">Clasificación Final</th>
              <th className="table-th text-white">Evaluado por</th>
              <th className="table-th text-white">Fecha</th>
              <th className="table-th text-white"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtradas.length === 0 && (
              <tr><td colSpan={9} className="table-td text-center text-gray-400 py-10">
                No hay evaluaciones registradas
              </td></tr>
            )}
            {filtradas.map((ev,i) => {
              const esUltima = ultimasPorProv[ev.proveedorId]?.id === ev.id
              return (
                <tr key={ev.id} className="hover:bg-gray-50/50">
                  <td className="table-td font-mono text-xs text-gray-400">{String(filtradas.length-i).padStart(3,'0')}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-gray-800">{ev.proveedorNombre}</span>
                      {esUltima && <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-bold">ÚLTIMA</span>}
                    </div>
                    {ev.ruc && <p className="text-[10px] text-gray-400">{ev.ruc}</p>}
                  </td>
                  <td className="table-td text-gray-500 text-xs max-w-[150px] truncate">{ev.bienesServicios||'—'}</td>
                  <td className="table-td text-center">
                    <div className={`inline-flex flex-col items-center gap-0.5`}>
                      <span className="text-base font-black text-[#1e3a5f]">{ev.puntajeRiesgo}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${ev.clasificacionRiesgo==='CRÍTICO'?'bg-red-100 text-red-700':'bg-emerald-100 text-emerald-700'}`}>{ev.clasificacionRiesgo}</span>
                    </div>
                  </td>
                  <td className="table-td text-center">
                    <div className="inline-flex flex-col items-center gap-0.5">
                      <span className="text-base font-black text-[#1e3a5f]">{ev.puntajeValor}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${ev.clasificacionValor==='ESTRATÉGICO'?'bg-yellow-100 text-yellow-800':'bg-gray-100 text-gray-500'}`}>{ev.clasificacionValor}</span>
                    </div>
                  </td>
                  <td className="table-td">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${CF_COLOR[ev.clasificacionFinal]||'bg-gray-100 text-gray-600'}`}>
                      {ev.clasificacionFinal}
                    </span>
                  </td>
                  <td className="table-td text-gray-600 text-xs">{ev.evaluadoPor}</td>
                  <td className="table-td text-gray-500 text-xs whitespace-nowrap">{fmtDate(ev.fecha)}</td>
                  <td className="table-td">
                    <div className="flex items-center gap-1">
                      <button onClick={()=>{ setSelected(ev); setModal('detalle') }} className="text-blue-400 hover:text-blue-600 p-1 rounded" title="Ver detalle">
                        <EyeIcon className="w-4 h-4"/>
                      </button>
                      <button onClick={()=>handleDelete(ev.id)} className="text-red-300 hover:text-red-600 p-1 rounded" title="Eliminar">
                        <TrashIcon className="w-4 h-4"/>
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Leyenda acciones */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Acciones según clasificación</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            { cf:'CRÍTICO Y ESTRATÉGICO', color:'bg-red-600 text-white', accion:'Reevaluación mínimo semestral o ante cambios relevantes.' },
            { cf:'CRÍTICO',               color:'bg-red-100 text-red-700', accion:'Reevaluación semestral para confirmar riesgo controlado.' },
            { cf:'ESTRATÉGICO',           color:'bg-yellow-100 text-yellow-800', accion:'Reevaluación anual para verificar aporte al negocio.' },
            { cf:'NO CRÍTICO / NO ESTRATÉGICO', color:'bg-emerald-100 text-emerald-700', accion:'Control en recepción del bien o servicio. Sin evaluación formal.' },
          ].map(a => (
            <div key={a.cf} className="flex flex-col gap-1 p-2 rounded-lg bg-gray-50">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full self-start ${a.color}`}>{a.cf}</span>
              <p className="text-[11px] text-gray-500 leading-tight">{a.accion}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Modales */}
      {modal === 'form' && (
        <Modal title="Nueva Evaluación de Proveedor — SIG-FO-113" onClose={()=>setModal(null)} wide>
          <EvalForm onClose={()=>setModal(null)} />
        </Modal>
      )}
      {modal === 'detalle' && selected && (
        <Modal title={`Evaluación — ${selected.proveedorNombre}`} onClose={()=>{ setModal(null); setSelected(null) }} wide>
          <EvalDetalle ev={selected} onClose={()=>{ setModal(null); setSelected(null) }} />
        </Modal>
      )}
      </>}

      {/* TAB: Desempeño Operativo */}
      {tab === 'desempeno' && (
        <div className="space-y-4">
          {/* Selector proveedor */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <label className="text-xs font-semibold text-gray-600 block mb-2">Seleccionar proveedor</label>
            <select className="input w-full max-w-md" value={provDesempeno} onChange={e=>setProvDesempeno(e.target.value)}>
              <option value="">— Elige un proveedor para ver su desempeño —</option>
              {(state.proveedores||[]).map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </div>

          {/* Resumen todos los proveedores */}
          {!provDesempeno && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 bg-[#1e3a5f]/5">
                <p className="text-sm font-bold text-[#1e3a5f]">Resumen operativo — todos los proveedores</p>
              </div>
              <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[560px]">
                <thead>
                  <tr className="bg-gray-50 text-[11px] text-gray-500 uppercase">
                    <th className="table-th">Proveedor</th>
                    <th className="table-th text-center">OCs</th>
                    <th className="table-th text-center">Recepciones</th>
                    <th className="table-th text-center">Días prom.</th>
                    <th className="table-th text-center">% A tiempo</th>
                    <th className="table-th text-center">% Calidad</th>
                    <th className="table-th text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(state.proveedores||[]).map(p => {
                    const m = (() => {
                      const ocs   = (state.ordenesCompra||[]).filter(o=>o.proveedorId===p.id)
                      const facts = (state.facturas||[]).filter(f=>f.proveedorId===p.id)
                      const confs = (state.conformidades||[]).filter(c=>facts.find(f=>f.id===c.facturaId))
                      const tiempos = confs.map(c=>{
                        const oc=ocs.find(o=>o.id===c.ocId); const fac=facts.find(f=>f.id===c.facturaId)
                        if(!oc?.fecha||!fac?.fecha) return null
                        const dias=Math.round((new Date(fac.fecha)-new Date(oc.fecha))/86400000)
                        const esp=oc.fechaEntregaEsperada?Math.round((new Date(oc.fechaEntregaEsperada)-new Date(oc.fecha))/86400000):null
                        return {dias, aTiempo: esp!==null?dias<=esp:null}
                      }).filter(Boolean)
                      const diasProm=tiempos.length?Math.round(tiempos.reduce((s,t)=>s+t.dias,0)/tiempos.length):null
                      const conPlazo=tiempos.filter(t=>t.aTiempo!==null).length
                      const pctPlazo=conPlazo>0?Math.round(tiempos.filter(t=>t.aTiempo).length/conPlazo*100):null
                      const items=confs.flatMap(c=>c.items||[])
                      const pctCalidad=items.length>0?Math.round(items.filter(i=>i.estado==='Conforme').length/items.length*100):null
                      return {ocs:ocs.length, confs:confs.length, diasProm, pctPlazo, pctCalidad}
                    })()
                    const semaforo = (v) => v===null?'—':v>=80?'🟢':v>=60?'🟡':'🔴'
                    const pctCls   = (v) => v===null?'text-gray-400':v>=80?'text-emerald-600 font-bold':v>=60?'text-amber-600 font-bold':'text-red-600 font-bold'
                    return (
                      <tr key={p.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={()=>{setProvDesempeno(p.id)}}>
                        <td className="table-td font-semibold text-gray-800">{p.nombre}</td>
                        <td className="table-td text-center text-gray-600">{m.ocs||'—'}</td>
                        <td className="table-td text-center text-gray-600">{m.confs||'—'}</td>
                        <td className="table-td text-center font-bold text-[#1e3a5f]">{m.diasProm!==null?`${m.diasProm}d`:'—'}</td>
                        <td className={`table-td text-center ${pctCls(m.pctPlazo)}`}>{m.pctPlazo!==null?`${m.pctPlazo}%`:'—'}</td>
                        <td className={`table-td text-center ${pctCls(m.pctCalidad)}`}>{m.pctCalidad!==null?`${m.pctCalidad}%`:'—'}</td>
                        <td className="table-td text-center text-base">{semaforo(m.pctCalidad)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
            </div>
          )}

          {/* Detalle proveedor seleccionado */}
          {provDesempeno && metricasDesempeno && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-bold text-[#1e3a5f]">
                  {(state.proveedores||[]).find(p=>p.id===provDesempeno)?.nombre}
                </p>
                <button onClick={()=>setProvDesempeno('')} className="text-xs text-gray-400 hover:text-gray-600">← Todos los proveedores</button>
              </div>
              <PanelMetricas m={metricasDesempeno} />
            </div>
          )}
        </div>
      )}
      {confirmBox && <Confirm {...confirmBox} onCancel={() => setConfirmBox(null)} />}
    </div>
  )
}
