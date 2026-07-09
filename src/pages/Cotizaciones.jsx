import { useState, useMemo, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/layout/Toast'
import { fmtDate, fmtMoney, genId, todayISO } from '../utils/helpers'
import PageHeader from '../components/common/PageHeader'
import Confirm from '../components/common/Confirm'
import {
  PlusIcon, DocumentArrowDownIcon, TrashIcon,
  EyeIcon, ArrowLeftIcon, TrophyIcon, CheckCircleIcon,
  ClipboardDocumentListIcon, BuildingOfficeIcon, ShoppingCartIcon
} from '@heroicons/react/24/outline'
import { generarPDFCotizacion } from '../utils/pdfCotizacion'
import { generarPDFSolicitudCot } from '../utils/pdfSolicitudCot'

/* ─── constantes ─────────────────────────────────────────── */

const PESOS_DEFAULT = {
  precio: 0.70, sst: 0.00, espTecnica: 0.15,
  formaPago: 0.05, plazoEntrega: 0.05, condicion: 0.05
}

const CRITERIOS = [
  { n: '01', label: 'Precio',                          key: 'pPrecio',  peso: 'precio' },
  { n: '02', label: 'Cumplimiento SST / MA',           key: 'pSST',     peso: 'sst' },
  { n: '03', label: 'Cumplimiento Esp. Técnicas',      key: 'pEsp',     peso: 'espTecnica' },
  { n: '04', label: 'Forma de Pago / Crédito',         key: 'pPago',    peso: 'formaPago' },
  { n: '05', label: 'Plazo de Entrega',                key: 'pPlazo',   peso: 'plazoEntrega' },
  { n: '06', label: 'Condición del Proveedor',         key: 'pCond',    peso: 'condicion' },
]

const PROV_COLORS  = ['border-blue-300 bg-blue-50',   'border-green-300 bg-green-50',   'border-amber-300 bg-amber-50']
const PROV_HEADERS = ['bg-blue-600 text-white',        'bg-green-600 text-white',         'bg-amber-500 text-white']

function mkProv(n) {
  return {
    alias: `PROV. ${n}`, razonSocial: '', ruc: '',
    condicion: 'NUEVO', formaPago: 'CONTADO',
    diasCredito: 0, plazoEntrega: 0, vigencia: 0,
    cumpleEsp: 'Si', cumpleSST: 'Si',
    pdfFile: null, pdfNombre: ''
  }
}
function mkItem(n = 3) {
  return { id: genId(), descripcion: '', und: 'UND', cant: 1, precios: Array(n).fill(0), obs: '' }
}

const JUSTIF_OPTIONS = [
  'Proveedor exclusivo / homologado',
  'Monto menor al límite de comparación',
  'Urgencia operativa',
  'Proveedor fijo por contrato',
  'Otro',
]

/* ─── cálculo ────────────────────────────────────────────── */

function calcScore(provs, items, pesos) {
  const totales = provs.map((_, pi) =>
    items.reduce((s, it) => s + Number(it.precios[pi] || 0) * Number(it.cant || 0), 0)
  )
  const valid = totales.filter(t => t > 0)
  const minT  = valid.length ? Math.min(...valid) : 0

  const pPrecio = totales.map(t => (t > 0 && minT > 0) ? (minT / t) * 100 : 0)
  const pSST    = provs.map(p => p.cumpleSST === 'Si' ? 100 : 0)
  const pEsp    = provs.map(p => p.cumpleEsp === 'Si' ? 100 : 0)
  const pPago   = provs.map(p => p.formaPago === 'Crédito' ? 100 : 0)

  const plazos  = provs.map(p => Number(p.plazoEntrega || 0))
  const minP    = Math.min(...plazos.filter(p => p > 0).concat(Infinity))
  const pPlazo  = plazos.map(p => (p > 0 && isFinite(minP)) ? (minP / p) * 100 : 0)

  const pCond   = provs.map(p => p.condicion === 'HABITUAL' ? 100 : 0)

  const resultados = provs.map((_, i) =>
    pPrecio[i] * pesos.precio  +
    pSST[i]    * pesos.sst     +
    pEsp[i]    * pesos.espTecnica +
    pPago[i]   * pesos.formaPago  +
    pPlazo[i]  * pesos.plazoEntrega +
    pCond[i]   * pesos.condicion
  )

  const maxR       = Math.max(...resultados)
  const ganadorIdx = resultados.findIndex(r => r === maxR)

  return { totales, minT, pPrecio, pSST, pEsp, pPago, pPlazo, pCond, resultados, ganadorIdx }
}

/* ─── formulario ─────────────────────────────────────────── */

function CotizacionForm({ initial, onSave, onCancel }) {
  const { state } = useApp()

  const [form, setForm] = useState(() => initial ? { ...initial } : {
    modo: 'comparativa',   // 'comparativa' | 'unica'
    justificacion: '',
    solicitante: '', cargoResponsable: '', proyectoServicio: '',
    fechaSolicitud: todayISO(), fechaEvaluacion: todayISO(),
    nEvaluacion: '001', tipo: 'Bien',
    requisitoSST: 'No', requisitoMA: 'No',
    proveedores: [mkProv(1), mkProv(2), mkProv(3)],
    items: [mkItem(3)],
    pesos: { ...PESOS_DEFAULT },
    comentarios: '',
    aprobaciones: [
      { responsable: 'ELABORADO POR:',          cargo: 'Cord. Logística y Compras',  nombre: '', fecha: '' },
      { responsable: 'REVISADO Y APROBADO POR:', cargo: 'Administración',             nombre: '', fecha: '' },
      { responsable: 'REVISADO Y APROBADO POR:', cargo: 'Gerencia Administrativa',    nombre: '', fecha: '' },
    ]
  })

  const sf  = (k, v)     => setForm(p => ({ ...p, [k]: v }))
  const sp  = (i, k, v)  => setForm(p => ({ ...p, proveedores: p.proveedores.map((pr, j) => j === i ? { ...pr, [k]: v } : pr) }))

  const isUnica = form.modo === 'unica'
  const nProvs  = isUnica ? 1 : 3

  const handleModo = (modo) => {
    const n = modo === 'unica' ? 1 : 3
    setForm(p => ({
      ...p, modo,
      proveedores: modo === 'unica'
        ? [p.proveedores[0]]
        : p.proveedores.length < 3
          ? [p.proveedores[0], mkProv(2), mkProv(3)]
          : p.proveedores,
      items: p.items.map(it => ({
        ...it,
        precios: Array.from({ length: n }, (_, i) => Number(it.precios?.[i] ?? 0)),
      })),
    }))
  }

  const handlePDFProv = (i, file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      sp(i, 'pdfFile', e.target.result)
      sp(i, 'pdfNombre', file.name)
    }
    reader.readAsDataURL(file)
  }
  const sit = (i, k, v)  => setForm(p => ({ ...p, items: p.items.map((it, j) => j === i ? { ...it, [k]: v } : it) }))
  const sip = (i, pi, v) => setForm(p => ({
    ...p,
    items: p.items.map((it, j) => {
      if (j !== i) return it
      const precios = [...it.precios]; precios[pi] = Number(v) || 0
      return { ...it, precios }
    })
  }))
  const sa    = (i, k, v)  => setForm(p => ({ ...p, aprobaciones: p.aprobaciones.map((a, j) => j === i ? { ...a, [k]: v } : a) }))
  const score = useMemo(() => calcScore(form.proveedores, form.items, form.pesos), [form.proveedores, form.items, form.pesos])

  const llenaProv = (i, provId) => {
    const p = state.proveedores.find(x => x.id === provId)
    if (!p) return
    sp(i, 'razonSocial', p.nombre)
    sp(i, 'ruc', p.ruc || '')
    sp(i, 'alias', p.nombre.split(' ')[0].toUpperCase())
  }

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        title="Cotización — SIG-FO-107"
        subtitle={isUnica ? 'Cotización Única — Proveedor Directo' : 'Cuadro Comparativo de Cotizaciones'}
        action={
          <div className="flex gap-2">
            <button onClick={onCancel} className="btn-secondary flex items-center gap-2">
              <ArrowLeftIcon className="w-4 h-4"/>Cancelar
            </button>
            <button onClick={() => onSave(form, score)} className="btn-primary flex items-center gap-2">
              <CheckCircleIcon className="w-4 h-4"/>Guardar
            </button>
          </div>
        }
      />

      {/* ── 0. Modalidad ───────────────────────────────────── */}
      <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide mr-2">Modalidad</span>
        {[
          { id: 'comparativa', label: 'Comparativa', sub: '3 proveedores + puntaje SIG-FO-107' },
          { id: 'unica',       label: 'Cotización Única', sub: 'Proveedor fijo / sin comparación' },
        ].map(opt => (
          <button key={opt.id} onClick={() => handleModo(opt.id)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 transition-all text-left ${
              form.modo === opt.id
                ? 'border-[#1e3a5f] bg-[#1e3a5f]/5'
                : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
              form.modo === opt.id ? 'border-[#1e3a5f]' : 'border-gray-300'}`}>
              {form.modo === opt.id && <div className="w-2 h-2 rounded-full bg-[#1e3a5f]"/>}
            </div>
            <div>
              <p className={`text-sm font-bold ${form.modo === opt.id ? 'text-[#1e3a5f]' : 'text-gray-600'}`}>{opt.label}</p>
              <p className="text-[10px] text-gray-400">{opt.sub}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ── 1. Datos generales ─────────────────────────────── */}
      <div className="card">
        <h2 className="text-sm font-bold text-[#1e3a5f] uppercase tracking-wide mb-3">Datos Generales</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { k:'solicitante',       l:'Solicitante' },
            { k:'cargoResponsable',  l:'Cargo del Responsable' },
            { k:'proyectoServicio',  l:'Proyecto / Servicio' },
          ].map(({k,l}) => (
            <div key={k}>
              <label className="text-xs font-medium text-gray-600 block mb-1">{l}</label>
              <input className="input" value={form[k]} onChange={e => sf(k, e.target.value)} />
            </div>
          ))}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Fecha de Solicitud</label>
            <input className="input" type="date" value={form.fechaSolicitud} onChange={e => sf('fechaSolicitud', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Fecha de Evaluación</label>
            <input className="input" type="date" value={form.fechaEvaluacion} onChange={e => sf('fechaEvaluacion', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">N° de Evaluación</label>
            <input className="input" value={form.nEvaluacion} onChange={e => sf('nEvaluacion', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Tipo</label>
            <select className="input" value={form.tipo} onChange={e => sf('tipo', e.target.value)}>
              <option>Bien</option><option>Servicio</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">¿Requisitos SST?</label>
            <select className="input" value={form.requisitoSST} onChange={e => sf('requisitoSST', e.target.value)}>
              <option>No</option><option>Sí</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">¿Requisitos MA?</label>
            <select className="input" value={form.requisitoMA} onChange={e => sf('requisitoMA', e.target.value)}>
              <option>No</option><option>Sí</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── 2. Proveedores ─────────────────────────────────── */}
      <div className="card">
        <h2 className="text-sm font-bold text-[#1e3a5f] uppercase tracking-wide mb-3">
          {isUnica ? 'Datos del Proveedor' : 'Datos de Proveedores'}
        </h2>
        <div className={`gap-4 ${isUnica ? 'max-w-md' : 'grid grid-cols-3'}`}>
          {form.proveedores.map((prov, i) => (
            <div key={i} className={`border-2 rounded-xl p-4 ${PROV_COLORS[i]}`}>
              {!isUnica && (
                <div className={`text-xs font-bold px-3 py-1 rounded-lg mb-3 text-center ${PROV_HEADERS[i]}`}>
                  PROVEEDOR {i + 1}
                </div>
              )}
              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Alias (nombre corto) *</label>
                  <input className="input text-xs" value={prov.alias} onChange={e => sp(i,'alias',e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Buscar en Maestros</label>
                  <select className="input text-xs" onChange={e => llenaProv(i, e.target.value)} defaultValue="">
                    <option value="">— seleccionar —</option>
                    {state.proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Razón Social</label>
                  <input className="input text-xs" value={prov.razonSocial} onChange={e => sp(i,'razonSocial',e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">RUC</label>
                  <input className="input text-xs" value={prov.ruc} onChange={e => sp(i,'ruc',e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Condición</label>
                    <select className="input text-xs" value={prov.condicion} onChange={e => sp(i,'condicion',e.target.value)}>
                      <option>NUEVO</option><option>HABITUAL</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Forma de Pago</label>
                    <select className="input text-xs" value={prov.formaPago} onChange={e => sp(i,'formaPago',e.target.value)}>
                      <option>CONTADO</option>
                      <option value="Crédito">CRÉDITO</option>
                      <option value="% Adelanto">% ADELANTO</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Días crédito</label>
                    <input className="input text-xs" type="number" min="0" value={prov.diasCredito} onChange={e => sp(i,'diasCredito',e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Plazo entrega (d)</label>
                    <input className="input text-xs" type="number" min="0" value={prov.plazoEntrega} onChange={e => sp(i,'plazoEntrega',e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Vigencia cot. (d)</label>
                    <input className="input text-xs" type="number" min="0" value={prov.vigencia} onChange={e => sp(i,'vigencia',e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-200 mt-1">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Cumple Esp. Téc.</label>
                    <select className="input text-xs" value={prov.cumpleEsp} onChange={e => sp(i,'cumpleEsp',e.target.value)}>
                      <option value="Si">Sí</option><option value="No">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Cumple SST/MA</label>
                    <select className="input text-xs" value={prov.cumpleSST} onChange={e => sp(i,'cumpleSST',e.target.value)}>
                      <option value="Si">Sí</option><option value="No">No</option>
                    </select>
                  </div>
                </div>
                {/* PDF de cotización del proveedor */}
                <div className="pt-2 border-t border-gray-200 mt-1">
                  <label className="text-xs font-medium text-gray-600 block mb-1">Cotización PDF</label>
                  {prov.pdfFile ? (
                    <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                      <DocumentArrowDownIcon className="w-4 h-4 text-red-500 flex-shrink-0"/>
                      <span className="text-xs text-gray-700 truncate flex-1">{prov.pdfNombre}</span>
                      <a href={prov.pdfFile} download={prov.pdfNombre}
                        className="text-xs text-blue-600 hover:underline flex-shrink-0">Ver</a>
                      <button type="button" onClick={() => { sp(i,'pdfFile',null); sp(i,'pdfNombre','') }}
                        className="text-xs text-red-400 hover:text-red-600 flex-shrink-0">✕</button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed border-gray-300 hover:border-blue-400 rounded-lg px-3 py-2 transition-colors">
                      <PlusIcon className="w-4 h-4 text-gray-400"/>
                      <span className="text-xs text-gray-500">Cargar PDF del proveedor</span>
                      <input type="file" accept=".pdf" className="hidden"
                        onChange={e => handlePDFProv(i, e.target.files?.[0])} />
                    </label>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 3. Ítems ───────────────────────────────────────── */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[#1e3a5f] uppercase tracking-wide">
            {isUnica ? 'Ítems / Descripción' : 'Comparación Económica — Ítems'}
          </h2>
          <button onClick={() => setForm(p => ({ ...p, items: [...p.items, mkItem(nProvs)] }))}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            <PlusIcon className="w-3.5 h-3.5"/>Agregar ítem
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[#1e3a5f] text-white">
                <th className="px-2 py-2 text-left w-6">#</th>
                <th className="px-2 py-2 text-left min-w-[180px]">Ítem / Descripción</th>
                <th className="px-2 py-2 text-center w-14">UND</th>
                <th className="px-2 py-2 text-right w-16">CANT.</th>
                {form.proveedores.map((p, i) => (
                  <th key={i} className="px-2 py-2 text-right min-w-[80px]">{p.alias} P.Unit.</th>
                ))}
                {form.proveedores.map((p, i) => (
                  <th key={`t${i}`} className="px-2 py-2 text-right min-w-[80px]">Total {p.alias}</th>
                ))}
                <th className="w-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {form.items.map((it, ii) => (
                <tr key={it.id} className="hover:bg-gray-50">
                  <td className="px-2 py-1 text-gray-400 text-center">{ii + 1}</td>
                  <td className="px-2 py-1">
                    <input className="input text-xs py-0.5 w-full" value={it.descripcion}
                      onChange={e => sit(ii,'descripcion',e.target.value)} placeholder="Descripción" />
                  </td>
                  <td className="px-2 py-1">
                    <input className="input text-xs py-0.5 w-12 text-center" value={it.und}
                      onChange={e => sit(ii,'und',e.target.value)} />
                  </td>
                  <td className="px-2 py-1">
                    <input className="input text-xs py-0.5 w-16 text-right" type="number" min="0" step="any"
                      value={it.cant} onChange={e => sit(ii,'cant',e.target.value)} />
                  </td>
                  {form.proveedores.map((_, pi) => (
                    <td key={pi} className="px-2 py-1">
                      <input className="input text-xs py-0.5 w-20 text-right" type="number" min="0" step="0.01"
                        value={it.precios[pi] || 0} onChange={e => sip(ii, pi, e.target.value)} />
                    </td>
                  ))}
                  {form.proveedores.map((_, pi) => (
                    <td key={`t${pi}`} className="px-2 py-1 text-right font-medium text-gray-700">
                      {fmtMoney(Number(it.precios[pi]||0) * Number(it.cant||0))}
                    </td>
                  ))}
                  <td className="px-2 py-1 text-center">
                    {form.items.length > 1 && (
                      <button onClick={() => setForm(p => ({ ...p, items: p.items.filter((_,j) => j !== ii) }))}
                        className="text-red-400 hover:text-red-600">✕</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-gray-300">
              <tr className="bg-gray-50">
                <td colSpan={4} className="px-2 py-1.5 text-xs font-semibold text-right text-gray-700">TOTAL SIN IGV</td>
                {form.proveedores.map((_, i) => <td key={i} className="px-2 py-1"></td>)}
                {score.totales.map((t, i) => (
                  <td key={`f${i}`} className={`px-2 py-1.5 text-xs text-right font-bold ${i === score.ganadorIdx ? 'text-green-700' : 'text-gray-700'}`}>
                    {fmtMoney(t)}
                  </td>
                ))}
                <td></td>
              </tr>
              <tr>
                <td colSpan={4} className="px-2 py-1 text-xs font-semibold text-right text-gray-600">IGV 18%</td>
                {form.proveedores.map((_, i) => <td key={i}></td>)}
                {score.totales.map((t, i) => (
                  <td key={`g${i}`} className="px-2 py-1 text-xs text-right text-gray-500">{fmtMoney(t * 0.18)}</td>
                ))}
                <td></td>
              </tr>
              <tr className="bg-[#1e3a5f]/5">
                <td colSpan={4} className="px-2 py-1.5 text-xs font-bold text-right text-[#1e3a5f]">TOTAL CON IGV</td>
                {form.proveedores.map((_, i) => <td key={i}></td>)}
                {score.totales.map((t, i) => (
                  <td key={`h${i}`} className={`px-2 py-1.5 text-xs text-right font-bold ${i === score.ganadorIdx ? 'text-green-700' : 'text-[#1e3a5f]'}`}>
                    {fmtMoney(t * 1.18)}
                  </td>
                ))}
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
        {!isUnica && score.minT > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            Proveedor más económico:{' '}
            <span className="font-bold text-green-700">{form.proveedores[score.totales.indexOf(score.minT)]?.alias}</span>
            {' '}— {fmtMoney(score.minT)} s/IGV
          </p>
        )}
      </div>

      {/* ── 5. Justificación cotización única (solo modo única) */}
      {isUnica && (
        <div className="card border-2 border-amber-200 bg-amber-50/30">
          <h2 className="text-sm font-bold text-[#1e3a5f] uppercase tracking-wide mb-3">Justificación — Cotización Única</h2>
          <p className="text-xs text-gray-500 mb-3">Indicar el motivo por el que no se realiza comparación de tres cotizaciones.</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {JUSTIF_OPTIONS.map(opt => (
              <button key={opt} onClick={() => sf('justificacion', opt)}
                className={`text-xs px-3 py-1.5 rounded-full border-2 font-medium transition-all ${
                  form.justificacion === opt
                    ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white'
                    : 'border-gray-300 text-gray-600 hover:border-[#1e3a5f]/50'}`}>
                {opt}
              </button>
            ))}
          </div>
          <input className="input" value={form.justificacion}
            onChange={e => sf('justificacion', e.target.value)}
            placeholder="Descripción del motivo (requerida)..." />
        </div>
      )}

      {/* ── 5b. Evaluación con puntaje (solo modo comparativa) */}
      {!isUnica && <div className="card">
        <h2 className="text-sm font-bold text-[#1e3a5f] uppercase tracking-wide mb-3">Evaluación con Puntaje y Pesos</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[#1e3a5f] text-white">
                <th className="px-2 py-2 text-left w-8" rowSpan={2}>N°</th>
                <th className="px-2 py-2 text-left" rowSpan={2}>Criterio</th>
                <th className="px-2 py-2 text-center w-14" rowSpan={2}>Peso</th>
                {form.proveedores.map((p, i) => (
                  <th key={i} className="px-2 py-2 text-center" colSpan={2}>{p.alias || `PROV. ${i+1}`}</th>
                ))}
              </tr>
              <tr className="bg-[#1e3a5f]/70 text-white text-xs">
                {form.proveedores.flatMap((_, i) => [
                  <th key={`ph${i}`} className="px-2 py-1.5 text-center font-normal">Puntaje</th>,
                  <th key={`rh${i}`} className="px-2 py-1.5 text-center font-normal">Resultado</th>
                ])}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {CRITERIOS.map(cr => (
                <tr key={cr.n} className="hover:bg-gray-50">
                  <td className="px-2 py-1.5 text-gray-400 text-center">{cr.n}</td>
                  <td className="px-2 py-1.5 font-medium">{cr.label}</td>
                  <td className="px-2 py-1.5 text-center text-gray-600">{form.pesos[cr.peso].toFixed(2)}</td>
                  {form.proveedores.flatMap((_, i) => [
                    <td key={`p${i}`} className="px-2 py-1.5 text-right text-gray-700">
                      {(score[cr.key]?.[i] ?? 0).toFixed(2)}
                    </td>,
                    <td key={`r${i}`} className={`px-2 py-1.5 text-right font-medium ${i === score.ganadorIdx ? 'text-green-700' : 'text-blue-700'}`}>
                      {((score[cr.key]?.[i] ?? 0) * form.pesos[cr.peso]).toFixed(4)}
                    </td>
                  ])}
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-gray-300">
              <tr className="bg-gray-50 font-bold">
                <td colSpan={3} className="px-2 py-2 text-xs">TOTAL PONDERADO</td>
                {score.resultados.flatMap((r, i) => [
                  <td key={`tp${i}`} className="px-2 py-2"></td>,
                  <td key={`tr${i}`} className={`px-2 py-2 text-xs text-right ${i === score.ganadorIdx ? 'text-green-700 text-sm' : 'text-gray-700'}`}>
                    {r.toFixed(4)}
                    {i === score.ganadorIdx && ' 🏆'}
                  </td>
                ])}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Ganador */}
        {score.ganadorIdx >= 0 && score.resultados[score.ganadorIdx] > 0 && (
          <div className="mt-4 bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-center gap-4">
            <TrophyIcon className="w-10 h-10 text-yellow-500 shrink-0" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Proveedor Ganador</p>
              <p className="text-xl font-bold text-green-700">{form.proveedores[score.ganadorIdx]?.alias}</p>
              <p className="text-xs text-gray-500">
                {form.proveedores[score.ganadorIdx]?.razonSocial
                  ? `${form.proveedores[score.ganadorIdx].razonSocial} — `
                  : ''}
                Puntaje final: <span className="font-bold">{(score.resultados[score.ganadorIdx]).toFixed(4)}</span>
                {' '}({(score.resultados[score.ganadorIdx] * 100).toFixed(1)}%)
              </p>
            </div>
          </div>
        )}
      </div>}

      {/* ── 6. Comentarios ─────────────────────────────────── */}
      <div className="card">
        <h2 className="text-sm font-bold text-[#1e3a5f] uppercase tracking-wide mb-2">Comentarios / Observaciones</h2>
        <textarea className="input" rows={3} value={form.comentarios}
          onChange={e => sf('comentarios', e.target.value)}
          placeholder="Observaciones generales de la evaluación..." />
      </div>

      {/* ── 7. Aprobaciones ────────────────────────────────── */}
      <div className="card">
        <h2 className="text-sm font-bold text-[#1e3a5f] uppercase tracking-wide mb-3">Aprobaciones</h2>
        <div className="space-y-3">
          {form.aprobaciones.map((ap, i) => (
            <div key={i} className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Responsable</label>
                <input className="input text-xs bg-gray-50 text-gray-500" value={ap.responsable} readOnly />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Cargo</label>
                <input className="input text-xs" value={ap.cargo} onChange={e => sa(i,'cargo',e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Nombre y Apellidos</label>
                <input className="input text-xs" value={ap.nombre} onChange={e => sa(i,'nombre',e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Fecha</label>
                <input className="input text-xs" type="date" value={ap.fecha} onChange={e => sa(i,'fecha',e.target.value)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button onClick={onCancel} className="btn-secondary">Cancelar</button>
        <button onClick={() => onSave(form, score)} className="btn-primary flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4"/>Guardar Cotización
        </button>
      </div>
    </div>
  )
}

/* ─── modal aprobar ganador COT comparativa ──────────────── */

function ModalAprobarGanador({ cot, onConfirm, onCancel }) {
  const [idx, setIdx] = useState(cot.ganadorIdx ?? 0)
  const esUnica = cot.modo === 'unica'
  if (esUnica) {
    return (
      <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-800">Aprobar Cotización Única</h2>
          <p className="text-sm text-gray-600">¿Confirmar aprobación de <strong>{cot.numero}</strong> con el proveedor <strong>{cot.proveedores?.[0]?.razonSocial || cot.proveedores?.[0]?.alias}</strong>?</p>
          <div className="flex justify-end gap-2">
            <button onClick={onCancel} className="btn-secondary">Cancelar</button>
            <button onClick={() => onConfirm(0, cot.proveedores?.[0]?.razonSocial || cot.proveedores?.[0]?.alias || '')} className="btn-primary">Aprobar</button>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-800">Aprobar Proveedor Ganador — {cot.numero}</h2>
        <p className="text-xs text-gray-500">Seleccione el proveedor ganador. Esta acción habilitará la creación de OC.</p>
        <div className="space-y-2">
          {(cot.proveedores||[]).map((p, i) => {
            const total = (cot.totales||[])[i] || 0
            const score = (cot.resultados||[])[i]
            return (
              <label key={i} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${idx === i ? 'border-[#1e3a5f] bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                <input type="radio" name="ganador" checked={idx===i} onChange={() => setIdx(i)} className="accent-[#1e3a5f]"/>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{p.razonSocial || p.alias}</p>
                  <p className="text-xs text-gray-500">Total: {fmtMoney(total)} {score !== undefined ? `· Score: ${(score*100).toFixed(1)}%` : ''}</p>
                </div>
                {i === (cot.ganadorIdx??0) && <TrophyIcon className="w-5 h-5 text-yellow-500 shrink-0"/>}
              </label>
            )
          })}
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="btn-secondary">Cancelar</button>
          <button onClick={() => onConfirm(idx, cot.proveedores?.[idx]?.razonSocial || cot.proveedores?.[idx]?.alias || '')} className="btn-primary flex items-center gap-2">
            <TrophyIcon className="w-4 h-4"/>Confirmar Ganador
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── tab solicitudes SC ─────────────────────────────────── */

const PROV_COLS = ['bg-blue-600','bg-green-600','bg-amber-500']

function TabSolicitudesSC() {
  const { state, dispatch } = useApp()
  const { isGerencia, isAdmin, isCoordLogistica } = useAuth()
  const toast = useToast()

  const [selSC, setSelSC]           = useState(null)
  const [localSC, setLocalSC]       = useState(null) // editable copy
  const [confirmOC, setConfirmOC]   = useState(null)
  const [approveModal, setApprove]  = useState(null)

  const scs = [...(state.solicitudesCotizacion||[])].sort((a,b) => (b.creadoEn||'').localeCompare(a.creadoEn||''))

  const open = (sc) => { setSelSC(sc); setLocalSC(JSON.parse(JSON.stringify(sc))) }
  const close = () => { setSelSC(null); setLocalSC(null) }

  const setItem = (ii, k, v) => setLocalSC(p => ({ ...p, items: p.items.map((it, j) => j===ii ? {...it,[k]:v} : it) }))
  const setPrice = (ii, pi, v) => setLocalSC(p => ({
    ...p, items: p.items.map((it, j) => {
      if (j!==ii) return it
      const precios = [...(it.precios||[])]; precios[pi] = Number(v)||0
      return {...it, precios}
    })
  }))
  const setProvField = (pi, k, v) => setLocalSC(p => ({
    ...p, proveedores: (p.proveedores||[]).map((pr, j) => j===pi ? {...pr,[k]:v} : pr)
  }))
  const handlePDFProv = (pi, file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => setProvField(pi, 'pdfFile', e.target.result)
    reader.readAsDataURL(file)
  }

  const savePrices = () => {
    dispatch({ type: 'UPDATE_SOLICITUD_COT', id: localSC.id, payload: localSC })
    setSelSC(localSC)
    toast('Precios guardados')
  }

  const handleAprobar = (winnerIdx, provNombre) => {
    dispatch({ type: 'APROBAR_SOLICITUD_COT', id: selSC.id, payload: { proveedorGanadorIdx: winnerIdx, proveedorNombre: provNombre } })
    const updated = { ...localSC, estado: 'Aprobada', proveedorGanadorIdx: winnerIdx, proveedorNombre: provNombre }
    setSelSC(updated); setLocalSC(updated); setApprove(null)
    toast('Cotización aprobada')
  }

  const handleCrearOC = () => {
    dispatch({ type: 'SOLICITUD_COT_A_OC', id: selSC.id })
    toast('OC creada exitosamente desde SC')
    setConfirmOC(null); close()
  }

  const handlePDFSIG = () => {
    generarPDFSolicitudCot(localSC, state.logo)
    toast(`PDF SIG-FO-111 descargado`)
  }

  const canApprove = isGerencia || isAdmin
  const canEdit    = isAdmin || isCoordLogistica

  /* ── DETAIL ── */
  if (selSC && localSC) {
    const isUnica   = localSC.modo === 'unica'
    const nProvs    = isUnica ? 1 : (localSC.proveedores||[]).length || 1
    const aprobada  = localSC.estado === 'Aprobada'
    const enOC      = localSC.estado === 'Convertida a OC'
    const winnerIdx = localSC.proveedorGanadorIdx ?? 0
    const empresa   = (state.empresas||[]).find(e => e.id === localSC.empresaId)

    const tienePrecios = (localSC.items||[]).some(it =>
      Array.from({length: nProvs}, (_,pi) => Number(it.precios?.[pi]||0)).some(p => p > 0)
    )

    const totalesProv = Array.from({length: nProvs}, (_, pi) =>
      (localSC.items||[]).reduce((s, it) => s + (Number(it.precios?.[pi]||0) * Number(it.cantidad||it.cant||0)), 0)
    )

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={close} className="btn-secondary flex items-center gap-2">
            <ArrowLeftIcon className="w-4 h-4"/>Volver
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-800">{localSC.numero}</h2>
            <p className="text-xs text-gray-500">{isUnica ? 'Cotización Única' : 'Comparativa'} · {empresa?.razonSocial||empresa?.nombre||'—'}</p>
          </div>
          <span className={`ml-2 text-[11px] font-bold px-2.5 py-1 rounded-full ${
            enOC ? 'bg-green-100 text-green-700' :
            aprobada ? 'bg-blue-100 text-blue-700' :
            'bg-amber-100 text-amber-700'
          }`}>{localSC.estado}</span>
        </div>

        <div className="card grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          <div><p className="text-gray-400 mb-0.5">REQ Origen</p><p className="font-semibold text-[#1e3a5f]">{localSC.reqOrigenNumero||'—'}</p></div>
          <div><p className="text-gray-400 mb-0.5">Fecha Solicitud</p><p className="font-semibold">{fmtDate(localSC.fechaSolicitud)||'—'}</p></div>
          <div><p className="text-gray-400 mb-0.5">Fecha Límite</p><p className="font-semibold">{fmtDate(localSC.fechaLimite)||'—'}</p></div>
          <div><p className="text-gray-400 mb-0.5">Tipo Compra</p><p className="font-semibold">{localSC.tipoCompra||'—'}</p></div>
          <div><p className="text-gray-400 mb-0.5">Contacto</p><p className="font-semibold">{localSC.contactoNombre||'—'}</p></div>
          <div><p className="text-gray-400 mb-0.5">Teléfono</p><p className="font-semibold">{localSC.contactoTelefono||'—'}</p></div>
        </div>

        <div className={`grid gap-3 ${isUnica ? '' : 'md:grid-cols-3'}`}>
          {Array.from({length: nProvs}, (_, pi) => {
            const prov = (localSC.proveedores||[])[pi] || {}
            return (
              <div key={pi} className={`card border-t-4 ${pi===0?'border-blue-500':pi===1?'border-green-500':'border-amber-500'}`}>
                <div className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full text-white mb-2 ${PROV_COLS[pi]}`}>
                  PROVEEDOR {pi+1}{aprobada && winnerIdx===pi && ' 🏆 GANADOR'}
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">Razón Social</label>
                    <input className="input-field text-xs" value={prov.razonSocial||''} onChange={e=>setProvField(pi,'razonSocial',e.target.value)} disabled={!canEdit||enOC}/>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-0.5">RUC</label>
                    <input className="input-field text-xs" value={prov.ruc||''} onChange={e=>setProvField(pi,'ruc',e.target.value)} disabled={!canEdit||enOC}/>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className={`text-[10px] px-2 py-1 rounded-lg border cursor-pointer ${enOC?'opacity-50 pointer-events-none':'hover:bg-gray-50 border-gray-300'}`}>
                    <DocumentArrowDownIcon className="w-3 h-3 inline mr-1"/>Subir PDF cotiz.
                    <input type="file" accept="application/pdf" className="hidden" disabled={!canEdit||enOC} onChange={e=>handlePDFProv(pi, e.target.files[0])}/>
                  </label>
                  {prov.pdfFile && <span className="text-[10px] text-green-600 font-medium">PDF cargado</span>}
                </div>
                <div className="mt-2 border-t border-gray-100 pt-2">
                  <p className="text-[10px] text-gray-500">Total: <span className="font-bold text-[#1e3a5f]">{fmtMoney(totalesProv[pi])}</span></p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Ítems y Precios Recibidos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{minWidth: isUnica ? 480 : 680}}>
              <thead>
                <tr className="bg-gray-50">
                  <th className="table-th">Descripción</th>
                  <th className="table-th text-center">UM</th>
                  <th className="table-th text-center">Cant.</th>
                  {Array.from({length: nProvs}, (_, pi) => (
                    <th key={pi} className={`table-th text-center text-white ${PROV_COLS[pi]}`}>P.U. Prov.{pi+1}</th>
                  ))}
                  {Array.from({length: nProvs}, (_, pi) => (
                    <th key={"t"+pi} className="table-th text-right text-gray-500">Total {pi+1}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(localSC.items||[]).map((it, ii) => (
                  <tr key={ii} className="hover:bg-gray-50/50">
                    <td className="table-td">{it.descripcion}</td>
                    <td className="table-td text-center">{it.unidad||it.und||'UND'}</td>
                    <td className="table-td text-center">{it.cantidad||it.cant||1}</td>
                    {Array.from({length: nProvs}, (_, pi) => (
                      <td key={pi} className="table-td">
                        <input type="number" min="0" step="0.01"
                          className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-center text-xs focus:outline-none focus:ring-1 focus:ring-[#1e3a5f] disabled:bg-gray-50"
                          value={it.precios?.[pi]||0} onChange={e=>setPrice(ii,pi,e.target.value)} disabled={!canEdit||enOC}/>
                      </td>
                    ))}
                    {Array.from({length: nProvs}, (_, pi) => (
                      <td key={"t"+pi} className="table-td text-right font-medium">
                        {fmtMoney(Number(it.precios?.[pi]||0) * Number(it.cantidad||it.cant||0))}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td colSpan={3} className="table-td text-right text-gray-500">TOTAL</td>
                  {Array.from({length: nProvs}, (_, pi) => <td key={pi} className="table-td"/>)}
                  {totalesProv.map((t, pi) => (
                    <td key={pi} className={`table-td text-right ${aprobada && winnerIdx===pi ? 'text-green-700' : 'text-[#1e3a5f]'}`}>
                      {fmtMoney(t)}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={handlePDFSIG} className="btn-secondary flex items-center gap-2 text-sm">
            <DocumentArrowDownIcon className="w-4 h-4"/>PDF SIG-FO-111
          </button>
          {canEdit && !enOC && (
            <button onClick={savePrices} className="btn-primary flex items-center gap-2 text-sm">
              <CheckCircleIcon className="w-4 h-4"/>Guardar Precios
            </button>
          )}
          {canApprove && !aprobada && !enOC && tienePrecios && (
            <button onClick={() => setApprove(localSC)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition">
              <TrophyIcon className="w-4 h-4"/>Aprobar Ganador
            </button>
          )}
          {aprobada && !enOC && (canEdit || canApprove) && (
            <button onClick={() => setConfirmOC(selSC)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition">
              <ShoppingCartIcon className="w-4 h-4"/>Crear Orden de Compra
            </button>
          )}
          {enOC && (
            <span className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 text-green-700 text-sm font-semibold border border-green-200">
              <CheckCircleIcon className="w-4 h-4"/>OC Creada: {localSC.ocNumero}
            </span>
          )}
        </div>

        {approveModal && (
          <ModalAprobarGanador cot={approveModal} onConfirm={handleAprobar} onCancel={() => setApprove(null)}/>
        )}
        {confirmOC && (
          <Confirm
            message={`¿Crear OC desde ${confirmOC.numero}? Se generará con los precios del proveedor ganador.`}
            onConfirm={handleCrearOC} onCancel={() => setConfirmOC(null)}/>
        )}
      </div>
    )
  }

  /* ── LIST ── */
  const estadoBadge = (e) => {
    if (e === 'Convertida a OC') return 'bg-green-100 text-green-700'
    if (e === 'Aprobada')        return 'bg-blue-100 text-blue-700'
    return 'bg-amber-100 text-amber-700'
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Solicitudes de Cotización</h2>
          <p className="text-xs text-gray-500">SC generadas desde Requerimientos (SIG-FO-111)</p>
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead><tr className="bg-gray-50 border-b border-gray-100">
              <th className="table-th">N°</th><th className="table-th">Modo</th>
              <th className="table-th">REQ Origen</th><th className="table-th">Empresa</th>
              <th className="table-th">Fecha Sol.</th><th className="table-th">Estado</th>
              <th className="table-th">Acciones</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {scs.map(sc => {
                const emp = (state.empresas||[]).find(e => e.id === sc.empresaId)
                return (
                  <tr key={sc.id} className="hover:bg-gray-50/50">
                    <td className="table-td font-mono text-xs font-semibold text-[#1e3a5f]">{sc.numero}</td>
                    <td className="table-td">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sc.modo==='unica'?'bg-amber-100 text-amber-700':'bg-blue-100 text-blue-700'}`}>
                        {sc.modo==='unica'?'Única':'Comparativa'}
                      </span>
                    </td>
                    <td className="table-td font-mono text-xs text-gray-600">{sc.reqOrigenNumero||'—'}</td>
                    <td className="table-td text-xs">{emp?.razonSocial||emp?.nombre||'—'}</td>
                    <td className="table-td text-xs">{fmtDate(sc.fechaSolicitud)}</td>
                    <td className="table-td">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${estadoBadge(sc.estado)}`}>{sc.estado}</span>
                    </td>
                    <td className="table-td">
                      <button onClick={() => open(sc)} className="text-blue-500 hover:text-blue-700" title="Ver/Editar">
                        <EyeIcon className="w-4 h-4"/>
                      </button>
                    </td>
                  </tr>
                )
              })}
              {scs.length === 0 && (
                <tr><td colSpan={7} className="table-td text-center text-gray-400 py-8">
                  Sin solicitudes. Crea una desde un Requerimiento con "Enviar a cotizar".
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ─── lista principal ────────────────────────────────────── */

export default function Cotizaciones() {
  const { state, dispatch } = useApp()
  const { isAdmin, isGerencia, isCoordLogistica } = useAuth()
  const toast = useToast()
  const [tab, setTab]         = useState('cot')
  const [view, setView]       = useState('list')
  const [editing, setEditing] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [approveGanador, setApproveGanador] = useState(null)
  const [confirmOCCot, setConfirmOCCot]     = useState(null)

  const cotizaciones = [...(state.cotizaciones || [])].sort(
    (a, b) => new Date(b.fechaSolicitud) - new Date(a.fechaSolicitud)
  )

  const handleSave = (form, score) => {
    const esUnica = form.modo === 'unica'
    const payload = {
      ...form,
      ganador:    esUnica ? (form.proveedores[0]?.alias || form.proveedores[0]?.razonSocial || '') : (form.proveedores[score.ganadorIdx]?.alias || ''),
      ganadorIdx: esUnica ? 0 : score.ganadorIdx,
      resultados: esUnica ? [] : score.resultados,
      totales:    esUnica
        ? [form.items.reduce((s, it) => s + Number(it.precios?.[0] || 0) * Number(it.cant || 0), 0)]
        : score.totales,
    }
    if (editing) {
      dispatch({ type: 'UPDATE_COTIZACION', id: editing.id, payload })
      toast('Cotización actualizada')
    } else {
      dispatch({ type: 'ADD_COTIZACION', payload })
      toast('Cotización guardada')
    }
    setView('list'); setEditing(null)
  }

  const handleDelete = (c) => {
    dispatch({ type: 'DELETE_COTIZACION', id: c.id })
    toast('Cotización eliminada'); setConfirm(null)
  }

  const handlePDF = (c) => {
    generarPDFCotizacion(c, state.logo)
    toast('PDF ' + c.numero + ' descargado')
  }

  const handleAprobarGanadorCOT = (idx, provNombre) => {
    dispatch({ type: 'APROBAR_COT_GANADOR', id: approveGanador.id, proveedorIdx: idx, proveedorNombre: provNombre, aprobadoPor: '' })
    toast('Proveedor ganador aprobado'); setApproveGanador(null)
  }

  const handleCrearOCCot = () => {
    dispatch({ type: 'COTIZACION_A_OC', id: confirmOCCot.id })
    toast('OC creada desde cotización comparativa'); setConfirmOCCot(null)
  }

  if (view === 'form') {
    return (
      <CotizacionForm
        initial={editing}
        onSave={handleSave}
        onCancel={() => { setView('list'); setEditing(null) }}
      />
    )
  }

  return (
    <div>
      <PageHeader
        title="Cotizaciones"
        subtitle="SIG-FO-107 y Solicitudes SC SIG-FO-111"
        action={tab === 'cot' ? (
          <button onClick={() => { setEditing(null); setView('form') }} className="btn-primary flex items-center gap-2">
            <PlusIcon className="w-4 h-4"/>Nueva Cotización
          </button>
        ) : null}
      />

      <div className="flex gap-1 mb-4 bg-gray-100 rounded-xl p-1 w-fit">
        <button onClick={() => setTab('cot')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab==='cot'?'bg-white shadow text-[#1e3a5f]':'text-gray-500 hover:text-gray-700'}`}>
          <ClipboardDocumentListIcon className="w-4 h-4"/>Cotizaciones
        </button>
        <button onClick={() => setTab('sc')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab==='sc'?'bg-white shadow text-[#1e3a5f]':'text-gray-500 hover:text-gray-700'}`}>
          <BuildingOfficeIcon className="w-4 h-4"/>Solicitudes SC
          {(state.solicitudesCotizacion||[]).filter(s=>s.estado==='Pendiente').length > 0 && (
            <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {(state.solicitudesCotizacion||[]).filter(s=>s.estado==='Pendiente').length}
            </span>
          )}
        </button>
      </div>

      {tab === 'sc' && <TabSolicitudesSC/>}

      {tab === 'cot' && (
      <div>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-100">
              <th className="table-th">N°</th>
              <th className="table-th">Modalidad</th>
              <th className="table-th">Fecha Solicitud</th>
              <th className="table-th">Solicitante</th>
              <th className="table-th">Proyecto / Servicio</th>
              <th className="table-th">Proveedor / Ganador</th>
              <th className="table-th text-right">Total s/IGV</th>
              <th className="table-th text-right">% Final</th>
              <th className="table-th">Acciones</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {cotizaciones.map(c => {
                const esUnica  = c.modo === 'unica'
                const ganRes   = c.resultados?.[c.ganadorIdx]
                const totalGan = esUnica ? c.totales?.[0] : c.totales?.[c.ganadorIdx]
                return (
                  <tr key={c.id} className="hover:bg-gray-50/50">
                    <td className="table-td font-mono text-xs font-semibold text-[#1e3a5f]">{c.numero}</td>
                    <td className="table-td">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${esUnica ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                        {esUnica ? 'Única' : 'Comparativa'}
                      </span>
                    </td>
                    <td className="table-td">{fmtDate(c.fechaSolicitud)}</td>
                    <td className="table-td">{c.solicitante}</td>
                    <td className="table-td">{c.proyectoServicio}</td>
                    <td className="table-td">
                      {c.ganador && (
                        <span className="flex items-center gap-1.5 font-semibold text-green-700">
                          {!esUnica && <TrophyIcon className="w-4 h-4 text-yellow-500"/>}{c.ganador}
                        </span>
                      )}
                    </td>
                    <td className="table-td text-right font-medium text-[#1e3a5f]">
                      {totalGan != null && totalGan > 0 ? fmtMoney(totalGan) : '—'}
                    </td>
                    <td className="table-td text-right font-medium">
                      {esUnica ? <span className="text-xs text-gray-400">—</span> : (ganRes !== undefined ? (ganRes * 100).toFixed(1) + '%' : '—')}
                    </td>
                    <td className="table-td">
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => { setEditing(c); setView('form') }} className="text-blue-500 hover:text-blue-700" title="Ver/Editar">
                          <EyeIcon className="w-4 h-4"/>
                        </button>
                        <button onClick={() => handlePDF(c)} className="text-green-500 hover:text-green-700" title="Descargar PDF">
                          <DocumentArrowDownIcon className="w-4 h-4"/>
                        </button>
                        {(isGerencia || isAdmin) && !esUnica && c.estado !== 'Aprobada' && c.estado !== 'Convertida a OC' && (
                          <button onClick={() => setApproveGanador(c)} className="text-amber-500 hover:text-amber-700" title="Aprobar Ganador">
                            <TrophyIcon className="w-4 h-4"/>
                          </button>
                        )}
                        {c.estado === 'Aprobada' && c.estado !== 'Convertida a OC' && (isAdmin || isCoordLogistica) && (
                          <button onClick={() => setConfirmOCCot(c)} className="text-green-600 hover:text-green-800" title="Crear OC">
                            <ShoppingCartIcon className="w-4 h-4"/>
                          </button>
                        )}
                        {isAdmin && (
                          <button onClick={() => setConfirm(c)} className="text-red-400 hover:text-red-600" title="Eliminar">
                            <TrashIcon className="w-4 h-4"/>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {cotizaciones.length === 0 && (
                <tr><td colSpan={9} className="table-td text-center text-gray-400 py-8">Sin cotizaciones registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {confirm && (
          <Confirm
            message={`¿Eliminar cotización "${confirm.numero}"?`}
            onConfirm={() => handleDelete(confirm)}
            onCancel={() => setConfirm(null)}
          />
        )}
        {approveGanador && (
          <ModalAprobarGanador
            cot={approveGanador}
            onConfirm={handleAprobarGanadorCOT}
            onCancel={() => setApproveGanador(null)}
          />
        )}
        {confirmOCCot && (
          <Confirm
            message={`¿Crear OC desde "${confirmOCCot.numero}"? Se usará el proveedor ganador.`}
            onConfirm={handleCrearOCCot}
            onCancel={() => setConfirmOCCot(null)}
          />
        )}
      </div>
      )}
    </div>
  )
}
