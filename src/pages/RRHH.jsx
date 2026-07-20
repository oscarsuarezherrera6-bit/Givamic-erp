import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useApp } from '../context/AppContext'
import { useAuth } from '../context/AuthContext'
import { usePerm } from '../hooks/usePerm'
import { useToast } from '../components/layout/Toast'
import Modal from '../components/common/Modal'
import Confirm from '../components/common/Confirm'
import PageHeader from '../components/common/PageHeader'
import { PlusIcon, MagnifyingGlassIcon, ArrowLeftIcon, PencilIcon, TrashIcon,
  DocumentArrowDownIcon, UserIcon, BellAlertIcon, ExclamationTriangleIcon,
  CheckCircleIcon, ClockIcon, ArrowUpTrayIcon, EyeIcon, XMarkIcon } from '@heroicons/react/24/outline'
import jsPDF from 'jspdf'

// ── Utilidades ─────────────────────────────────────────────────────────────────
const genId = () => Math.random().toString(36).slice(2,10)
const todayStr = () => new Date().toISOString().slice(0,10)
// Nombre completo apellidos compatible con registros viejos (apellidos) y nuevos (apellidoPaterno/Materno)
const fullApellidos = (t) => {
  if (t?.apellidoPaterno || t?.apellidoMaterno)
    return [t.apellidoPaterno, t.apellidoMaterno].filter(Boolean).join(' ')
  return t?.apellidos || ''
}

function calcEdad(fecha) {
  if (!fecha) return null
  const hoy = new Date(), nac = new Date(fecha)
  let edad = hoy.getFullYear() - nac.getFullYear()
  const m = hoy.getMonth() - nac.getMonth()
  if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--
  return edad
}

function calcTiempoActivo(trabajador) {
  if (!trabajador.fechaIngreso) return null
  // Suma períodos activos (desde Alta hasta Baja, si hubo)
  const movs = [...(trabajador.movimientos || [])].sort((a,b) => a.fecha.localeCompare(b.fecha))
  let totalDias = 0; let inicioActual = null
  movs.forEach(m => {
    if (m.tipo === 'Alta' || m.tipo === 'Reactivación') inicioActual = new Date(m.fecha)
    if ((m.tipo === 'Baja') && inicioActual) {
      totalDias += Math.floor((new Date(m.fecha) - inicioActual) / 86400000)
      inicioActual = null
    }
  })
  if (trabajador.estado === 'Activo' && inicioActual) {
    totalDias += Math.floor((new Date() - inicioActual) / 86400000)
  }
  if (!totalDias) return null
  const anios = Math.floor(totalDias / 365); const meses = Math.floor((totalDias % 365) / 30)
  return `${anios > 0 ? anios + (anios===1?' año':' años') + (meses>0?', ':''):''} ${meses > 0 ? meses + (meses===1?' mes':' meses') : (anios>0?'':' < 1 mes')}`.trim()
}

function diasHastaVencer(fecha) {
  if (!fecha) return null
  return Math.ceil((new Date(fecha) - new Date()) / 86400000)
}

function Semaforo({ fecha, label }) {
  if (!fecha) return <span className="text-gray-400 text-xs">Sin fecha</span>
  const dias = diasHastaVencer(fecha)
  const color = dias < 0 ? 'text-red-600 bg-red-50 border-red-200'
    : dias <= 30 ? 'text-amber-600 bg-amber-50 border-amber-200'
    : 'text-green-600 bg-green-50 border-green-200'
  const icono = dias < 0 ? '🔴' : dias <= 30 ? '🟡' : '🟢'
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {icono} {label || fecha} {dias < 0 ? `(vencido ${Math.abs(dias)}d)` : dias <= 30 ? `(${dias}d)` : ''}
    </span>
  )
}

function fmtFecha(f) { return f ? new Date(f+'T00:00:00').toLocaleDateString('es-PE', {day:'2-digit',month:'2-digit',year:'numeric'}) : '—' }

const BANCOS = ['BCP','BBVA','Interbank','Scotiabank','Banco de la Nación','Otro']
const ESTADOS_CIVILES = ['Soltero/a','Casado/a','Conviviente','Divorciado/a','Viudo/a']
const TIPO_VINCULO = ['Planilla','Locación','SOS']
const TIPO_DOCS = ['DNI','CE','Pasaporte']
const AFP_SNP = ['AFP Prima','AFP Integra','AFP Habitat','AFP Profuturo','ONPE']
const GRADO_INS = ['Primaria completa','Secundaria incompleta','Secundaria completa','Técnica incompleta','Técnica completa','Superior universitaria incompleta','Superior universitaria completa','Postgrado']
const CATEGORIAS_TRABAJADOR = ['Operativo','Administrativo','Supervisor','Técnico','Otro']
const TURNOS = ['Mañana','Tarde','Amanecida','Retén']

const LEGAJO_CATS = [
  { key:'dni',            label:'Documentos de identidad (DNI/CE)' },
  { key:'cv',             label:'CV firmado' },
  { key:'contratoFirmado',label:'Contrato / OS firmado' },
  { key:'induccionFirmada',label:'Ficha de inducción firmada' },
  { key:'emoResultados',  label:'EMO (resultados)' },
  { key:'sctrPolizas',    label:'SCTR (pólizas)' },
  { key:'certificados',   label:'Certificados y licencias' },
  { key:'declaraciones',  label:'Declaraciones juradas' },
  { key:'otros',          label:'Otros documentos' },
]

// ── Componente Campo (fuera del form para no perder foco en cada keystroke) ────
function Campo({ label, children, half }) {
  return (
    <div className={half ? 'col-span-1' : 'col-span-2 md:col-span-1'}>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">{label}</label>
      {children}
    </div>
  )
}

// ── Formulario de trabajador (crear / editar) ──────────────────────────────────
function FormTrabajador({ initial, onSave, onClose, empresasGrupo, clientesRRHH }) {
  const init = initial || {}
  // Compatibilidad: si el registro tiene apellidos (campo viejo), partir en paterno/materno
  const initCompat = init ? {
    ...init,
    apellidoPaterno: init.apellidoPaterno || (init.apellidos ? init.apellidos.split(' ')[0] : ''),
    apellidoMaterno: init.apellidoMaterno || (init.apellidos ? init.apellidos.split(' ').slice(1).join(' ') : ''),
  } : {}

  const [form, setForm] = useState({
    apellidoPaterno: '', apellidoMaterno: '', nombres: '', tipoDocumento: 'DNI', documento: '',
    fechaRegistro: todayStr(), fechaIngreso: '',
    antecedentesLaborales: [],
    tipoMovimiento: 'Alta', tipoVinculo: 'Planilla', empresaProveedora: '',
    empresaGrupoId: '', clienteRRHHId: '', localRRHHId: '',
    area: '', celular: '', correo: '',
    numeroCuenta: '', banco: 'BCP', cci: '',
    fechaNacimiento: '', estadoCivil: 'Soltero/a', hijos: [],
    contactoEmergencia: '', gradoRelacionCE: '',
    direccion: '', afpSnp: 'AFP Prima',
    gradoInstruccion: 'Secundaria completa', carreraProfesional: '',
    ruc: '', claveSol: '', servicioCargo: '', partida: '',
    categoria: 'Operativo',
    turno: '',
    remuneracionPlanilla: 0, remuneracionLocacion: 0, remuneracionSOS: 0, valorJornal: 0,
    tallaPolo: '', tallaBuzo: '', tallaBotas: '', tallaGuantes: '',
    ...initCompat
  })
  const [hijosTmp, setHijosTmp] = useState(init.hijos || [])
  const [antecTmp, setAntecTmp] = useState(
    initCompat.antecedentesLaborales || []
  )
  const addAntec  = () => setAntecTmp(p=>[...p,{id:genId(),empresa:'',tiempo:'',cargo:'',motivoSalida:''}])
  const delAntec  = (id) => setAntecTmp(p=>p.filter(a=>a.id!==id))
  const setAntec  = (id,k,v) => setAntecTmp(p=>p.map(a=>a.id===id?{...a,[k]:v}:a))
  const set = (k,v) => setForm(p => ({...p,[k]:v}))

  // Locales filtrados por empresa: todos los locales de todos los clientes vinculados
  const localesDeEmpresa = (() => {
    const eg = empresasGrupo.find(x => x.id === form.empresaGrupoId)
    const ids = eg?.clienteIds || []
    const clis = ids.length > 0 ? clientesRRHH.filter(c => ids.includes(c.id)) : []
    return clis.flatMap(c => (c.locales||[]).map(l => ({ ...l, _clienteId: c.id, _clienteNombre: c.nombre })))
  })()
  const remuTotal = Number(form.remuneracionPlanilla||0)+Number(form.remuneracionLocacion||0)+Number(form.remuneracionSOS||0)

  const addHijo = () => setHijosTmp(p=>[...p,{id:genId(),sexo:'M',edad:''}])
  const delHijo = (id) => setHijosTmp(p=>p.filter(h=>h.id!==id))
  const setHijo = (id,k,v) => setHijosTmp(p=>p.map(h=>h.id===id?{...h,[k]:v}:h))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.apellidoPaterno.trim() || !form.documento.trim()) return
    onSave({ ...form, hijos: hijosTmp, antecedentesLaborales: antecTmp })
    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-h-[78vh] overflow-y-auto pr-1">
      {/* Sección 1: Identificación */}
      <div className="bg-[#1e3a5f] text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg">Identificación</div>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Apellido Paterno *"><input className="input" value={form.apellidoPaterno} onChange={e=>set('apellidoPaterno',e.target.value)} required /></Campo>
        <Campo label="Apellido Materno"><input className="input" value={form.apellidoMaterno} onChange={e=>set('apellidoMaterno',e.target.value)} /></Campo>
        <Campo label="Nombres *"><input className="input" value={form.nombres} onChange={e=>set('nombres',e.target.value)} required /></Campo>
        <Campo label="Tipo documento">
          <select className="input" value={form.tipoDocumento} onChange={e=>set('tipoDocumento',e.target.value)}>
            {TIPO_DOCS.map(d=><option key={d}>{d}</option>)}
          </select>
        </Campo>
        <Campo label="Número documento *"><input className="input" value={form.documento} onChange={e=>set('documento',e.target.value)} required /></Campo>
        <Campo label="Fecha de registro"><input type="date" className="input" value={form.fechaRegistro} onChange={e=>set('fechaRegistro',e.target.value)} /></Campo>
        <Campo label="Fecha de ingreso *">
          <input type="date" className="input" value={form.fechaIngreso} onChange={e=>set('fechaIngreso',e.target.value)}
            title="Fecha en que el trabajador empieza a trabajar (puede ser distinta al registro)" />
        </Campo>
        <Campo label="Tipo movimiento">
          <select className="input" value={form.tipoMovimiento} onChange={e=>set('tipoMovimiento',e.target.value)}>
            {['Alta','Reingreso','Baja'].map(t=><option key={t}>{t}</option>)}
          </select>
        </Campo>
        <Campo label="Tipo vínculo">
          <select className="input" value={form.tipoVinculo} onChange={e=>set('tipoVinculo',e.target.value)}>
            {TIPO_VINCULO.map(t=><option key={t}>{t}</option>)}
          </select>
        </Campo>
        {form.tipoVinculo !== 'Planilla' && <Campo label="Empresa proveedora"><input className="input" value={form.empresaProveedora} onChange={e=>set('empresaProveedora',e.target.value)} /></Campo>}
      </div>

      {/* Sección 2: Asignación */}
      <div className="bg-[#1e3a5f] text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg">Asignación</div>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Empresa del Grupo">
          <select className="input" value={form.empresaGrupoId} onChange={e => {
            setForm(p => ({ ...p, empresaGrupoId: e.target.value, clienteRRHHId: '', localRRHHId: '' }))
          }}>
            <option value="">— Sin asignar —</option>
            {empresasGrupo.map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </Campo>
        <Campo label="Local / Sede">
          <select className="input" value={form.localRRHHId}
            onChange={e => {
              const locObj = localesDeEmpresa.find(l => l.id === e.target.value)
              setForm(p => ({ ...p, localRRHHId: e.target.value, clienteRRHHId: locObj?._clienteId || p.clienteRRHHId }))
            }}
            disabled={!form.empresaGrupoId || localesDeEmpresa.length === 0}>
            <option value="">— Seleccionar local —</option>
            {localesDeEmpresa.map(l=>(
              <option key={l.id} value={l.id}>{l.nombre}{l._clienteNombre ? ` (${l._clienteNombre})` : ''}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Área / Servicio"><input className="input" value={form.area} onChange={e=>set('area',e.target.value)} /></Campo>
        <Campo label="Servicio / Cargo"><input className="input" value={form.servicioCargo} onChange={e=>set('servicioCargo',e.target.value)} /></Campo>
        <Campo label="Categoría">
          <select className="input" value={form.categoria} onChange={e=>set('categoria',e.target.value)}>
            {CATEGORIAS_TRABAJADOR.map(c=><option key={c}>{c}</option>)}
          </select>
        </Campo>
        <Campo label="Turno">
          <select className="input" value={form.turno} onChange={e=>set('turno',e.target.value)}>
            <option value="">— Sin asignar —</option>
            {TURNOS.map(t=><option key={t}>{t}</option>)}
          </select>
        </Campo>
      </div>

      {/* Sección 3: Datos personales */}
      <div className="bg-[#1e3a5f] text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg">Datos Personales</div>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Fecha de nacimiento"><input type="date" className="input" value={form.fechaNacimiento} onChange={e=>set('fechaNacimiento',e.target.value)} /></Campo>
        <Campo label={`Edad${form.fechaNacimiento?' : '+calcEdad(form.fechaNacimiento)+' años':''}`}><div className="input bg-gray-50 text-gray-400">{form.fechaNacimiento ? calcEdad(form.fechaNacimiento)+' años' : '—'}</div></Campo>
        <Campo label="Estado civil">
          <select className="input" value={form.estadoCivil} onChange={e=>set('estadoCivil',e.target.value)}>
            {ESTADOS_CIVILES.map(e=><option key={e}>{e}</option>)}
          </select>
        </Campo>
        <Campo label="Celular"><input className="input" value={form.celular} onChange={e=>set('celular',e.target.value)} /></Campo>
        <Campo label="Correo electrónico"><input type="email" className="input" value={form.correo} onChange={e=>set('correo',e.target.value)} /></Campo>
        <Campo label="Dirección de vivienda"><input className="input" value={form.direccion} onChange={e=>set('direccion',e.target.value)} /></Campo>
        <Campo label="Contacto emergencia"><input className="input" value={form.contactoEmergencia} onChange={e=>set('contactoEmergencia',e.target.value)} /></Campo>
        <Campo label="Grado de relación c.e."><input className="input" value={form.gradoRelacionCE} onChange={e=>set('gradoRelacionCE',e.target.value)} /></Campo>
        <Campo label="Grado de instrucción">
          <select className="input" value={form.gradoInstruccion} onChange={e=>set('gradoInstruccion',e.target.value)}>
            {GRADO_INS.map(g=><option key={g}>{g}</option>)}
          </select>
        </Campo>
        <Campo label="Carrera profesional"><input className="input" value={form.carreraProfesional} onChange={e=>set('carreraProfesional',e.target.value)} /></Campo>
        <Campo label="AFP o SNP">
          <select className="input" value={form.afpSnp} onChange={e=>set('afpSnp',e.target.value)}>
            {AFP_SNP.map(a=><option key={a}>{a}</option>)}
          </select>
        </Campo>
        <Campo label="RUC (si tiene)"><input className="input" value={form.ruc} onChange={e=>set('ruc',e.target.value)} /></Campo>
        <Campo label="Clave SOL"><input type="password" className="input" value={form.claveSol} onChange={e=>set('claveSol',e.target.value)} /></Campo>
      </div>

      {/* Hijos */}
      <div className="border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Hijos ({hijosTmp.length})</span>
          <button type="button" onClick={addHijo} className="text-blue-600 text-xs hover:underline">+ Agregar hijo</button>
        </div>
        {hijosTmp.map(h=>(
          <div key={h.id} className="grid grid-cols-3 gap-2 items-center">
            <select className="input text-sm" value={h.sexo} onChange={e=>setHijo(h.id,'sexo',e.target.value)}>
              <option value="M">Masculino</option><option value="F">Femenino</option>
            </select>
            <div className="flex items-center gap-1">
              <input type="number" min="0" max="25" placeholder="Edad" className="input text-sm w-full"
                value={h.edad||''} onChange={e=>setHijo(h.id,'edad',e.target.value)} />
              <span className="text-xs text-gray-400 shrink-0">años</span>
            </div>
            <div className="flex items-center justify-end">
              <button type="button" onClick={()=>delHijo(h.id)} className="text-red-400 hover:text-red-600"><XMarkIcon className="w-4 h-4"/></button>
            </div>
          </div>
        ))}
      </div>

      {/* Sección 4: Antecedentes Laborales */}
      <div className="bg-[#1e3a5f] text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg">Antecedentes Laborales</div>
      <div className="border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Empleos anteriores ({antecTmp.length})
          </span>
          <button type="button" onClick={addAntec} className="text-blue-600 text-xs hover:underline">
            + Agregar empleo
          </button>
        </div>
        {antecTmp.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-2">Sin antecedentes laborales registrados</p>
        )}
        {antecTmp.map((a,i) => (
          <div key={a.id} className="border border-gray-100 rounded-lg p-3 space-y-2 bg-gray-50/60">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-500">Empleo {i+1}</span>
              <button type="button" onClick={()=>delAntec(a.id)} className="text-red-400 hover:text-red-600">
                <XMarkIcon className="w-4 h-4"/>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-gray-500 block mb-0.5">Empresa</label>
                <input className="input text-sm" placeholder="Nombre de la empresa"
                  value={a.empresa} onChange={e=>setAntec(a.id,'empresa',e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 block mb-0.5">Tiempo de trabajo</label>
                <input className="input text-sm" placeholder="Ej: 2 años, 6 meses"
                  value={a.tiempo} onChange={e=>setAntec(a.id,'tiempo',e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 block mb-0.5">Cargo</label>
                <input className="input text-sm" placeholder="Cargo desempeñado"
                  value={a.cargo} onChange={e=>setAntec(a.id,'cargo',e.target.value)} />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 block mb-0.5">Motivo de salida</label>
                <input className="input text-sm" placeholder="Ej: Renuncia, término de contrato"
                  value={a.motivoSalida} onChange={e=>setAntec(a.id,'motivoSalida',e.target.value)} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sección 5: Banco y remuneración */}
      <div className="bg-[#1e3a5f] text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg">Banco y Remuneración</div>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Banco">
          <select className="input" value={form.banco} onChange={e=>set('banco',e.target.value)}>
            {BANCOS.map(b=><option key={b}>{b}</option>)}
          </select>
        </Campo>
        <Campo label="N° cuenta"><input className="input" value={form.numeroCuenta} onChange={e=>set('numeroCuenta',e.target.value)} /></Campo>
        <Campo label="CCI"><input className="input" value={form.cci} onChange={e=>set('cci',e.target.value)} /></Campo>
        <div></div>
        <Campo label="Rem. Planilla (S/)"><input type="number" min="0" className="input" value={form.remuneracionPlanilla} onChange={e=>set('remuneracionPlanilla',e.target.value)} /></Campo>
        <Campo label="Rem. Locación (S/)"><input type="number" min="0" className="input" value={form.remuneracionLocacion} onChange={e=>set('remuneracionLocacion',e.target.value)} /></Campo>
        <Campo label="Rem. SOS (S/)"><input type="number" min="0" className="input" value={form.remuneracionSOS} onChange={e=>set('remuneracionSOS',e.target.value)} /></Campo>
        <Campo label="Rem. TOTAL (auto)"><div className="input bg-gray-50 font-semibold text-[#1e3a5f]">S/ {remuTotal.toLocaleString('es-PE',{minimumFractionDigits:2})}</div></Campo>
        <Campo label="Valor Jornal (S/)"><input type="number" min="0" className="input" value={form.valorJornal} onChange={e=>set('valorJornal',e.target.value)} /></Campo>
        <Campo label="Partida"><input className="input" value={form.partida} onChange={e=>set('partida',e.target.value)} /></Campo>
      </div>

      {/* Sección 5: Tallas SSOMA */}
      <div className="bg-[#1e3a5f] text-white text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-lg">Tallas EPPs / SSOMA</div>
      <div className="grid grid-cols-2 gap-3">
        <Campo label="Talla Polo"><input className="input" value={form.tallaPolo} onChange={e=>set('tallaPolo',e.target.value)} placeholder="XS / S / M / L / XL / XXL" /></Campo>
        <Campo label="Talla Buzo"><input className="input" value={form.tallaBuzo} onChange={e=>set('tallaBuzo',e.target.value)} placeholder="XS / S / M / L / XL / XXL" /></Campo>
        <Campo label="Talla Botas (N°)"><input className="input" value={form.tallaBotas} onChange={e=>set('tallaBotas',e.target.value)} placeholder="38 / 39 / 40 / 41..." /></Campo>
        <Campo label="Talla Guantes"><input className="input" value={form.tallaGuantes} onChange={e=>set('tallaGuantes',e.target.value)} placeholder="S / M / L / XL" /></Campo>
      </div>

      <div className="flex gap-3 justify-end pt-3 border-t border-gray-100">
        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
        <button type="submit" className="btn-primary">{initial ? 'Actualizar' : 'Registrar Trabajador'}</button>
      </div>
    </form>
  )
}

// ── Parte 2: Ficha SIG-MZ-011 (vista) ─────────────────────────────────────────
function TabDatosGenerales({ t, isRemu, onEdit, onBaja, onReactivar, isAdmin }) {
  const tiempoActivo = calcTiempoActivo(t)
  const edad = calcEdad(t.fechaNacimiento)
  const hijosMasc = (t.hijos||[]).filter(h=>h.sexo==='M').length
  const hijosFem  = (t.hijos||[]).filter(h=>h.sexo==='F').length
  const edadesHijos = (t.hijos||[]).map(h=>h.edad||null).filter(Boolean).map(Number).sort((a,b)=>a-b)
  const remuTotal = Number(t.remuneracionPlanilla||0)+Number(t.remuneracionLocacion||0)+Number(t.remuneracionSOS||0)

  const Fila = ({izq,derIzq,der,derDer}) => (
    <tr className="border-b border-gray-100">
      <td className="px-3 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wide w-1/4">{izq}</td>
      <td className="px-3 py-2 text-sm text-gray-800 w-1/4">{derIzq}</td>
      <td className="px-3 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wide w-1/4">{der}</td>
      <td className="px-3 py-2 text-sm text-gray-800 w-1/4">{derDer}</td>
    </tr>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          {tiempoActivo && <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full border border-blue-100 font-medium">⏱ Tiempo activo: {tiempoActivo}</span>}
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${t.estado==='Activo'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-500'}`}>{t.estado}</span>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <button onClick={onEdit} className="btn-secondary text-sm flex items-center gap-1"><PencilIcon className="w-3.5 h-3.5"/>Editar</button>
            {t.estado==='Activo'
              ? <button onClick={onBaja} className="text-red-600 border border-red-200 bg-red-50 text-sm px-3 py-1.5 rounded-lg hover:bg-red-100">Dar de Baja</button>
              : <button onClick={onReactivar} className="text-green-600 border border-green-200 bg-green-50 text-sm px-3 py-1.5 rounded-lg hover:bg-green-100">Reactivar</button>
            }
          </div>
        )}
      </div>

      {/* Tabla SIG-MZ-011 */}
      <div className="rounded-xl overflow-hidden border border-gray-200">
        <div className="bg-[#1e3a5f] text-white text-xs font-bold uppercase tracking-widest px-4 py-2.5">Datos Generales — SIG-MZ-011</div>
        <table className="w-full text-sm">
          <tbody>
            <Fila izq="Fecha de Registro"  derIzq={fmtFecha(t.fechaRegistro)} der="Tipo de Movimiento" derDer={t.tipoMovimiento||'—'} />
            <Fila izq="Apellidos y Nombres" derIzq={`${fullApellidos(t)}, ${t.nombres||''}`} der="Tipo de Vínculo" derDer={t.tipoVinculo||'—'} />
            <Fila izq="Tipo de Documento"  derIzq={t.tipoDocumento||'—'} der="Documento" derDer={t.documento||'—'} />
            <Fila izq="Empresa Principal"  derIzq={t._empresa?.nombre||'—'} der="Empresa Proveedora" derDer={t.empresaProveedora||'—'} />
            <Fila izq="Sede / Proyecto"    derIzq={t._local?.nombre||'—'} der="Área" derDer={t.area||'—'} />
            <Fila izq="Celular"           derIzq={t.celular||'—'} der="Correo" derDer={t.correo||'—'} />
            <Fila izq="N° de Cuenta"      derIzq={t.numeroCuenta ? `${t.banco} - ${t.numeroCuenta}` : '—'} der="Banco" derDer={t.banco||'—'} />
            <Fila izq="Fecha de Nacimiento" derIzq={fmtFecha(t.fechaNacimiento)} der="Edad" derDer={edad != null ? `${edad} años` : '—'} />
            <Fila izq="Estado Civil"      derIzq={t.estadoCivil||'—'} der="N° de Hijos" derDer={
              (t.hijos||[]).length > 0
                ? `${(t.hijos||[]).length} (${hijosMasc>0?hijosMasc+' hombre'+(hijosMasc>1?'s':''):''}${hijosMasc>0&&hijosFem>0?', ':''}${hijosFem>0?hijosFem+' mujer'+(hijosFem>1?'es':''):''}) — edades: ${edadesHijos.join(', ')} años`
                : '0'
            } />
            <Fila izq="Contacto Emergencia" derIzq={t.contactoEmergencia||'—'} der="Grado de Relación C.E." derDer={t.gradoRelacionCE||'—'} />
            <Fila izq="Dirección Vivienda" derIzq={t.direccion||'—'} der="AFP o SNP" derDer={t.afpSnp||'—'} />
            <Fila izq="Grado de Instrucción" derIzq={t.gradoInstruccion||'—'} der="Carrera Profesional" derDer={t.carreraProfesional||'—'} />
            <Fila izq="RUC"               derIzq={t.ruc||'—'} der="Clave SOL" derDer={isRemu ? (t.claveSol||'—') : '••••••'} />
            <Fila izq="Servicio / Cargo"  derIzq={t.servicioCargo||'—'} der="Partida" derDer={t.partida||'—'} />
            <Fila izq="Categoría"         derIzq={t.categoria||'—'} der="Rem. Planilla" derDer={isRemu ? `S/ ${Number(t.remuneracionPlanilla||0).toFixed(2)}` : '—'} />
            <Fila izq="Rem. Locación"     derIzq={isRemu ? `S/ ${Number(t.remuneracionLocacion||0).toFixed(2)}` : '—'} der="Rem. SOS" derDer={isRemu ? `S/ ${Number(t.remuneracionSOS||0).toFixed(2)}` : '—'} />
            <tr className="bg-gray-50 border-b border-gray-100">
              <td className="px-3 py-2 text-[11px] font-bold text-gray-500 uppercase tracking-wide">Rem. Mensual Total</td>
              <td colSpan={3} className="px-3 py-2 font-bold text-[#1e3a5f]">
                {isRemu ? `S/ ${remuTotal.toFixed(2)} (Planilla + Locación + SOS)` : '—'}
              </td>
            </tr>
            {isRemu && <Fila izq="Valor de Jornal"  derIzq={`S/ ${Number(t.valorJornal||0).toFixed(2)}`} der="" derDer="" />}
            {(t.tallaPolo||t.tallaBuzo||t.tallaBotas||t.tallaGuantes) && (
              <Fila izq="Talla Polo / Buzo" derIzq={t.tallaPolo||'—'} der="Talla Botas / Guantes" derDer={`${t.tallaBotas||'—'} / ${t.tallaGuantes||'—'}`} />
            )}
            {t.motivoBaja && <Fila izq="Fecha de Baja" derIzq={fmtFecha(t.fechaBaja)} der="Motivo de Baja" derDer={t.motivoBaja} />}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Parte 3: Control Documentario ──────────────────────────────────────────────
function TabControlDocumentario({ t, dispatch, isAdmin, isSoma, user, toast }) {
  const [modalDoc, setModalDoc] = useState(null) // {key, data}
  const fileRefs = { emo: useRef(), induccion: useRef(), sctr: useRef(), contrato: useRef() }

  const doc = t.documentos || {}

  const uploadFile = (docKey, file) => {
    if (!file) return
    if (file.size > 10_000_000) { toast('Archivo mayor a 10MB', 'error'); return }
    const reader = new FileReader()
    reader.onload = e => {
      const arch = { id: genId(), nombre: file.name, tipo: file.type, tamaño: file.size, base64: e.target.result, subidoPor: user?.nombre || '', subidoEn: new Date().toISOString() }
      dispatch({ type: 'ADD_ARCHIVO_DOC_TRABAJADOR', id: t.id, docKey, archivo: arch })
      toast(`Archivo adjuntado a ${docKey}`)
    }
    reader.readAsDataURL(file)
  }

  const saveDoc = (key, data) => {
    dispatch({ type: 'UPDATE_DOCS_TRABAJADOR', id: t.id, docKey: key, payload: data, actualizadoPor: user?.nombre || '' })
    toast('Documento actualizado')
    setModalDoc(null)
  }

  const DocCard = ({ docKey, label, docData, canEdit, campos }) => {
    const archivos = docData?.archivos || []
    const dias = diasHastaVencer(docData?.fechaVencimiento)
    const estadoColor = docData?.estado === 'Aprobado' || docData?.estado === 'Vigente' || docData?.estado === 'Realizada' || docData?.estado === 'Activo'
      ? 'bg-green-100 text-green-700'
      : docData?.estado === 'Vencido' || docData?.estado === 'No aprobado'
      ? 'bg-red-100 text-red-700'
      : docData?.estado === 'Por vencer'
      ? 'bg-amber-100 text-amber-700'
      : 'bg-gray-100 text-gray-500'

    return (
      <div className="card p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-gray-800 text-sm">{label}</p>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium mt-1 inline-block ${estadoColor}`}>{docData?.estado || 'Pendiente'}</span>
          </div>
          {canEdit && <button onClick={() => setModalDoc({ key: docKey, data: docData || {} })} className="btn-secondary text-xs flex items-center gap-1"><PencilIcon className="w-3 h-3"/>Editar</button>}
        </div>

        {docData?.fechaVencimiento && <Semaforo fecha={docData.fechaVencimiento} label={`Vence: ${fmtFecha(docData.fechaVencimiento)}`} />}
        {docData?.fechaRealizacion && <p className="text-xs text-gray-500">Realizado: {fmtFecha(docData.fechaRealizacion)}</p>}
        {docData?.fechaInicio && <p className="text-xs text-gray-500">Inicio: {fmtFecha(docData.fechaInicio)}</p>}

        {/* Archivos */}
        <div className="space-y-1">
          {archivos.length === 0 && <p className="text-xs text-gray-400">Sin archivos adjuntos</p>}
          {archivos.map((a,i) => (
            <div key={a.id||i} className="flex items-center gap-2 text-xs bg-gray-50 rounded-lg px-3 py-1.5">
              <span className="text-gray-600 flex-1 truncate">📎 {a.nombre}</span>
              <span className="text-gray-400">{a.subidoPor}</span>
              {a.base64 && <a href={a.base64} download={a.nombre} className="text-blue-600 hover:underline">⬇</a>}
            </div>
          ))}
        </div>

        {canEdit && (
          <div>
            <input type="file" ref={fileRefs[docKey]} className="hidden" accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => { uploadFile(docKey, e.target.files[0]); e.target.value = '' }} />
            <button onClick={() => fileRefs[docKey].current?.click()} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              <ArrowUpTrayIcon className="w-3.5 h-3.5"/> Adjuntar archivo
            </button>
          </div>
        )}

        {docData?.actualizadoPor && (
          <p className="text-[10px] text-gray-400 border-t border-gray-100 pt-2">
            Actualizado por {docData.actualizadoPor} · {docData.actualizadoEn ? new Date(docData.actualizadoEn).toLocaleDateString('es-PE') : ''}
          </p>
        )}
      </div>
    )
  }

  const canEditSoma = isAdmin || isSoma
  const canEditContr = isAdmin

  const activarSCTR = () => {
    const hoy = new Date()
    const vence = new Date(hoy); vence.setDate(vence.getDate() + 30)
    const fmt = d => d.toISOString().split('T')[0]
    dispatch({ type: 'UPDATE_DOCS_TRABAJADOR', id: t.id, docKey: 'sctr',
      payload: { estado: 'Vigente', fechaInicio: fmt(hoy), fechaVencimiento: fmt(vence) },
      actualizadoPor: user?.nombre || '' })
    toast('SCTR activado — vence en 30 días')
  }

  const SctrCard = () => {
    const sctr = doc.sctr || {}
    const vigente = sctr.estado === 'Vigente' || sctr.estado === 'Por vencer'
    const vencido = sctr.estado === 'Vencido'
    const estadoColor = vigente ? 'bg-green-100 text-green-700'
      : vencido ? 'bg-red-100 text-red-700'
      : 'bg-gray-100 text-gray-500'
    return (
      <div className="card p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-gray-800 text-sm">SCTR — Seguro Complementario</p>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium mt-1 inline-block ${estadoColor}`}>
              {sctr.estado || 'Pendiente'}
            </span>
          </div>
          {canEditSoma && vigente && (
            <button onClick={activarSCTR} className="btn-secondary text-xs">Renovar (30 días)</button>
          )}
        </div>

        {sctr.fechaInicio && (
          <p className="text-xs text-gray-500">Inicio: <strong>{fmtFecha(sctr.fechaInicio)}</strong></p>
        )}
        {sctr.fechaVencimiento && (
          <Semaforo fecha={sctr.fechaVencimiento} label={`Vence: ${fmtFecha(sctr.fechaVencimiento)}`} />
        )}

        {canEditSoma && !vigente && (
          <button
            onClick={activarSCTR}
            className="w-full py-2 rounded-lg bg-[#1e3a5f] hover:bg-[#16304f] text-white text-xs font-semibold transition-colors"
          >
            ✓ Activar SCTR — 30 días desde hoy
          </button>
        )}

        {sctr.actualizadoPor && (
          <p className="text-[10px] text-gray-400 border-t border-gray-100 pt-2">
            Actualizado por {sctr.actualizadoPor} · {sctr.actualizadoEn ? new Date(sctr.actualizadoEn).toLocaleDateString('es-PE') : ''}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-400">Solo SOMA y Admin pueden actualizar EMO, SCTR e Inducción. Solo Admin puede actualizar Contratos.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <DocCard docKey="emo" label="EMO — Examen Médico Ocupacional" docData={doc.emo} canEdit={canEditSoma} />
        <DocCard docKey="induccion" label="Inducción" docData={doc.induccion} canEdit={canEditSoma} />
        <SctrCard />
        <DocCard docKey="contrato" label="Contrato / Orden de Servicio" docData={doc.contrato} canEdit={canEditContr} />
      </div>

      {/* Certificados */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="font-semibold text-gray-800 text-sm">Certificados y Licencias</p>
          {canEditSoma && (
            <button onClick={() => setModalDoc({ key:'cert-new', data:{} })} className="text-xs text-blue-600 hover:underline">+ Agregar certificado</button>
          )}
        </div>
        {(doc.certificados||[]).length === 0 && <p className="text-xs text-gray-400">Sin certificados registrados</p>}
        {(doc.certificados||[]).map(cert => (
          <div key={cert.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">{cert.nombre}</p>
              <div className="flex gap-3 mt-0.5">
                {cert.fechaEmision && <span className="text-xs text-gray-500">Emitido: {fmtFecha(cert.fechaEmision)}</span>}
                {cert.fechaVencimiento && <Semaforo fecha={cert.fechaVencimiento} label={`Vence: ${fmtFecha(cert.fechaVencimiento)}`} />}
              </div>
            </div>
            <span className="text-xs text-gray-400">{(cert.archivos||[]).length} arch.</span>
          </div>
        ))}
      </div>

      {/* Modal edición documentos */}
      {modalDoc && (
        <Modal title={`Actualizar ${modalDoc.key === 'cert-new' ? 'Certificado' : modalDoc.key.toUpperCase()}`} onClose={() => setModalDoc(null)}>
          <DocEditForm docKey={modalDoc.key} data={modalDoc.data} onSave={saveDoc} onClose={() => setModalDoc(null)} dispatch={dispatch} trabajadorId={t.id} />
        </Modal>
      )}
    </div>
  )
}

function DocEditForm({ docKey, data, onSave, onClose, dispatch, trabajadorId }) {
  const isCertNew = docKey === 'cert-new'
  const [form, setForm] = useState(isCertNew
    ? { nombre:'', fechaEmision:'', fechaVencimiento:'' }
    : { estado: data.estado||'Pendiente', fechaRealizacion: data.fechaRealizacion||'', fechaVencimiento: data.fechaVencimiento||'', fechaInicio: data.fechaInicio||'', tipo: data.tipo||'' }
  )
  const set = (k,v) => setForm(p=>({...p,[k]:v}))

  const ESTADOS = {
    emo:       ['Pendiente','Aprobado','No aprobado','No aplica'],
    induccion: ['Pendiente','Realizada'],
    sctr:      ['Pendiente','Vigente','Por vencer','Vencido'],
    contrato:  ['Pendiente','Activo','Finalizado','Rescindido'],
  }

  const handleSave = () => {
    if (isCertNew) { dispatch({ type:'ADD_CERT_TRABAJADOR', id:trabajadorId, payload: form }); onClose() }
    else onSave(docKey, form)
  }

  return (
    <div className="space-y-3">
      {isCertNew ? (
        <>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Nombre del certificado *</label><input className="input" value={form.nombre} onChange={e=>set('nombre',e.target.value)} required /></div>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Fecha de emisión</label><input type="date" className="input" value={form.fechaEmision} onChange={e=>set('fechaEmision',e.target.value)} /></div>
          <div><label className="text-xs font-medium text-gray-600 block mb-1">Fecha de vencimiento</label><input type="date" className="input" value={form.fechaVencimiento} onChange={e=>set('fechaVencimiento',e.target.value)} /></div>
        </>
      ) : (
        <>
          {ESTADOS[docKey] && <div><label className="text-xs font-medium text-gray-600 block mb-1">Estado</label>
            <select className="input" value={form.estado} onChange={e=>set('estado',e.target.value)}>
              {ESTADOS[docKey].map(e=><option key={e}>{e}</option>)}
            </select></div>}
          {(docKey==='emo'||docKey==='induccion') && <div><label className="text-xs font-medium text-gray-600 block mb-1">Fecha de realización</label><input type="date" className="input" value={form.fechaRealizacion} onChange={e=>set('fechaRealizacion',e.target.value)} /></div>}
          {(docKey==='sctr') && <div><label className="text-xs font-medium text-gray-600 block mb-1">Fecha de inicio</label><input type="date" className="input" value={form.fechaInicio} onChange={e=>set('fechaInicio',e.target.value)} /></div>}
          {docKey==='contrato' && <div><label className="text-xs font-medium text-gray-600 block mb-1">Tipo de contrato</label><input className="input" value={form.tipo} onChange={e=>set('tipo',e.target.value)} placeholder="Indefinido, Por servicio, etc."/></div>}
          {(docKey==='sctr'||docKey==='emo'||docKey==='contrato') && <div><label className="text-xs font-medium text-gray-600 block mb-1">Fecha de vencimiento</label><input type="date" className="input" value={form.fechaVencimiento} onChange={e=>set('fechaVencimiento',e.target.value)} /></div>}
        </>
      )}
      <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
        <button onClick={handleSave} className="btn-primary">Guardar</button>
      </div>
    </div>
  )
}

// ── Parte 4: Legajo Digital ────────────────────────────────────────────────────
function TabLegajo({ t, dispatch, isAdmin, isSoma, isRRHH, user, toast }) {
  const fileRef = useRef()
  const [catActiva, setCatActiva] = useState(null) // key de la categoría para subir

  const legajo = t.legajo || {}
  const completadas = LEGAJO_CATS.filter(c => (legajo[c.key]||[]).length > 0).length
  const pct = Math.round((completadas / LEGAJO_CATS.length) * 100)

  const canEdit = isAdmin || isSoma || isRRHH

  const uploadLegajo = (file) => {
    if (!file || !catActiva) return
    if (file.size > 10_000_000) { toast('Archivo mayor a 10MB', 'error'); return }
    const reader = new FileReader()
    reader.onload = e => {
      const arch = { id: genId(), nombre: file.name, tipo: file.type, tamaño: file.size, base64: e.target.result, subidoPor: user?.nombre||'', subidoEn: new Date().toISOString(), activo: true }
      dispatch({ type: 'ADD_ARCHIVO_LEGAJO', id: t.id, categoria: catActiva, archivo: arch })
      toast('Archivo subido al legajo')
      setCatActiva(null)
    }
    reader.readAsDataURL(file)
  }

  const downloadAll = () => {
    // En demo: abre primer archivo disponible como muestra
    const allFiles = LEGAJO_CATS.flatMap(c => legajo[c.key]||[])
    if (allFiles.length === 0) { toast('Sin archivos en el legajo', 'error'); return }
    toast(`Demo: ${allFiles.length} archivo(s) en el legajo — integración ZIP disponible con Supabase`)
  }

  return (
    <div className="space-y-4">
      {/* Completitud */}
      <div className="card p-4 flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold text-gray-700">Completitud del Legajo</span>
            <span className={`text-sm font-bold ${pct===100?'text-green-600':pct>=60?'text-amber-600':'text-red-600'}`}>{completadas}/{LEGAJO_CATS.length} categorías — {pct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div className={`h-2 rounded-full transition-all ${pct===100?'bg-green-500':pct>=60?'bg-amber-500':'bg-red-500'}`} style={{width:`${pct}%`}} />
          </div>
          {pct < 100 && (
            <p className="text-xs text-gray-400 mt-1">Faltantes: {LEGAJO_CATS.filter(c=>(legajo[c.key]||[]).length===0).map(c=>c.label).join(', ')}</p>
          )}
        </div>
        {canEdit && (
          <button onClick={downloadAll} className="btn-secondary text-xs flex items-center gap-1 shrink-0">
            <DocumentArrowDownIcon className="w-4 h-4"/> Descargar legajo
          </button>
        )}
      </div>

      {/* Categorías */}
      <div className="space-y-2">
        {LEGAJO_CATS.map(cat => {
          const archivos = legajo[cat.key] || []
          const tieneArchivos = archivos.length > 0
          return (
            <div key={cat.key} className={`card p-3 ${!tieneArchivos ? 'border-dashed border-gray-200 bg-gray-50/50' : ''}`}>
              <div className="flex items-center gap-3">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs ${tieneArchivos?'bg-green-100 text-green-700':'bg-gray-100 text-gray-400'}`}>
                  {tieneArchivos ? '✓' : '○'}
                </span>
                <span className="text-sm font-medium text-gray-700 flex-1">{cat.label}</span>
                <span className="text-xs text-gray-400">{archivos.length} archivo{archivos.length!==1?'s':''}</span>
                {canEdit && (
                  <button onClick={() => { setCatActiva(cat.key); fileRef.current?.click() }}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                    <ArrowUpTrayIcon className="w-3.5 h-3.5"/> Subir
                  </button>
                )}
              </div>
              {archivos.length > 0 && (
                <div className="mt-2 ml-8 space-y-1">
                  {archivos.map((a,i) => (
                    <div key={a.id||i} className="flex items-center gap-2 text-xs text-gray-600">
                      <span className="flex-1 truncate">📎 {a.nombre}</span>
                      <span className="text-gray-400 shrink-0">{a.subidoPor} · {a.subidoEn ? new Date(a.subidoEn).toLocaleDateString('es-PE') : ''}</span>
                      {a.base64 && (
                        <>
                          <a href={a.base64} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline"><EyeIcon className="w-3.5 h-3.5"/></a>
                          <a href={a.base64} download={a.nombre} className="text-gray-500 hover:text-gray-700">⬇</a>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <input type="file" ref={fileRef} className="hidden" accept=".pdf,.jpg,.jpeg,.png"
        onChange={e => { uploadLegajo(e.target.files[0]); e.target.value='' }} />

      <p className="text-xs text-gray-400 text-center">📌 Nota: Los documentos no se eliminan. Se marcan como "obsoletos" para cumplimiento ISO.</p>
    </div>
  )
}

// ── Tab Movimientos ────────────────────────────────────────────────────────────
function TabMovimientos({ t }) {
  const movs = [...(t.movimientos||[])].sort((a,b)=>b.fecha.localeCompare(a.fecha))
  const COLOR = { Alta:'bg-green-100 text-green-700', Baja:'bg-red-100 text-red-700', Rotación:'bg-blue-100 text-blue-700', Reactivación:'bg-amber-100 text-amber-700', default:'bg-gray-100 text-gray-600' }
  return (
    <div className="space-y-3">
      {movs.length === 0 && <p className="text-gray-400 text-sm text-center py-8">Sin movimientos registrados</p>}
      {movs.map((m,i) => (
        <div key={m.id||i} className="flex gap-3 items-start">
          <div className="flex flex-col items-center">
            <div className={`px-2 py-0.5 rounded-full text-xs font-medium ${COLOR[m.tipo]||COLOR.default}`}>{m.tipo}</div>
            {i < movs.length-1 && <div className="w-0.5 h-4 bg-gray-200 mt-1"/>}
          </div>
          <div className="flex-1 pb-2">
            <p className="text-xs text-gray-400">{fmtFecha(m.fecha)} · Por: {m.registradoPor||'Sistema'}</p>
            <p className="text-sm text-gray-700 mt-0.5">{m.detalle||'—'}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Ficha del Trabajador (contenedor con pestañas) ─────────────────────────────
function FichaTrabajador({ t, onBack, isAdmin, isSoma, isRRHH, isRemu, dispatch, toast, user }) {
  const [subTab, setSubTab] = useState('datos')
  const [showForm, setShowForm] = useState(false)
  const [confirmBaja, setConfirmBaja] = useState(false)
  const [confirmReact, setConfirmReact] = useState(false)
  const [motivoBaja, setMotivoBaja] = useState('')
  const [tipoCese, setTipoCese] = useState('')
  const [especificacionCese, setEspecificacionCese] = useState('')
  const { state } = useApp()

  const empresasGrupo = state.empresasGrupo || []
  const clientesRRHH  = state.clientesRRHH  || []
  const empresa = empresasGrupo.find(e=>e.id===t.empresaGrupoId)
  const cliente = clientesRRHH.find(c=>c.id===t.clienteRRHHId)
  const local   = (cliente?.locales||[]).find(l=>l.id===t.localRRHHId)
  const enriched = { ...t, _empresa: empresa, _cliente: cliente, _local: local }

  const exportPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(14); doc.setFont('helvetica','bold')
    doc.text('FICHA DEL TRABAJADOR — GIVAMIC RRHH', 14, 20)
    doc.setFontSize(9); doc.setFont('helvetica','normal')
    const lines = [
      `Trabajador: ${fullApellidos(t)}, ${t.nombres}`, `DNI: ${t.documento}`, `Estado: ${t.estado}`,
      '', `Empresa: ${empresa?.nombre||'—'}`, `Cliente: ${cliente?.nombre||'—'}`, `Local: ${local?.nombre||'—'}`,
      `Cargo: ${t.servicioCargo||'—'}`, `Área: ${t.area||'—'}`, `Vínculo: ${t.tipoVinculo||'—'}`,
      '', 'CONTROL DOCUMENTARIO',
      `EMO: ${t.documentos?.emo?.estado||'—'} — vence: ${t.documentos?.emo?.fechaVencimiento||'—'}`,
      `SCTR: ${t.documentos?.sctr?.estado||'—'} — vence: ${t.documentos?.sctr?.fechaVencimiento||'—'}`,
      `Inducción: ${t.documentos?.induccion?.estado||'—'}`,
      `Contrato: ${t.documentos?.contrato?.tipo||''} ${t.documentos?.contrato?.estado||'—'}`,
    ]
    let y=32; lines.forEach(l=>{ if(y>270){doc.addPage();y=20}; doc.text(l,14,y); y+=5.5 })
    doc.save(`ficha-${fullApellidos(t).replace(' ','-')}-${t.documento}.pdf`)
  }

  const SUBTABS = [
    { id:'datos',     label:'Datos Generales' },
    { id:'docs',      label:'Control Documentario' },
    { id:'legajo',    label:'Legajo Digital' },
    { id:'movimientos',label:'Movimientos' },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
          <ArrowLeftIcon className="w-4 h-4"/> Volver
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-800">{fullApellidos(t)}, {t.nombres}</h2>
          <p className="text-sm text-gray-500">{t.documento} · {t.servicioCargo||'—'} · {cliente?.nombre||'—'} / {local?.nombre||'—'}</p>
        </div>
        <button onClick={exportPDF} className="btn-secondary text-sm flex items-center gap-1"><DocumentArrowDownIcon className="w-4 h-4"/> PDF</button>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {SUBTABS.map(s=>(
          <button key={s.id} onClick={()=>setSubTab(s.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${subTab===s.id?'border-[#1e3a5f] text-[#1e3a5f]':'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {subTab==='datos' && <TabDatosGenerales t={enriched} isRemu={isRemu} isAdmin={isAdmin}
        onEdit={()=>setShowForm(true)} onBaja={()=>setConfirmBaja(true)} onReactivar={()=>setConfirmReact(true)} />}
      {subTab==='docs' && <TabControlDocumentario t={t} dispatch={dispatch} isAdmin={isAdmin} isSoma={isSoma} user={user} toast={toast} />}
      {subTab==='legajo' && <TabLegajo t={t} dispatch={dispatch} isAdmin={isAdmin} isSoma={isSoma} isRRHH={isRRHH} user={user} toast={toast} />}
      {subTab==='movimientos' && <TabMovimientos t={t} />}

      {/* Modal editar */}
      {showForm && (
        <Modal title="Editar Trabajador" onClose={()=>setShowForm(false)} wide>
          <FormTrabajador initial={t} empresasGrupo={state.empresasGrupo||[]} clientesRRHH={state.clientesRRHH||[]}
            onSave={data=>{ dispatch({type:'UPDATE_TRABAJADOR',id:t.id,payload:data}); toast('Trabajador actualizado'); setShowForm(false) }}
            onClose={()=>setShowForm(false)} />
        </Modal>
      )}

      {/* Confirm baja */}
      {confirmBaja && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
            <h3 className="font-semibold text-gray-800 text-red-700">Dar de Baja — {fullApellidos(t)}</h3>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Tipo de cese *</label>
              <select className="input" value={tipoCese} onChange={e=>{ setTipoCese(e.target.value); setEspecificacionCese('') }} required>
                <option value="">— Seleccionar —</option>
                <option value="Motivos familiares">Motivos familiares</option>
                <option value="Inasistencia">Inasistencia</option>
                <option value="Evaluación">Evaluación</option>
                <option value="Mejor oferta">Mejor oferta</option>
                <option value="Otros">Otros (especificar)</option>
              </select>
            </div>
            {tipoCese === 'Otros' && (
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Especificar motivo *</label>
                <textarea className="input" rows={2} placeholder="Describe el motivo..." value={especificacionCese} onChange={e=>setEspecificacionCese(e.target.value)} required />
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Observaciones adicionales</label>
              <textarea className="input" rows={2} placeholder="Opcional..." value={motivoBaja} onChange={e=>setMotivoBaja(e.target.value)} />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={()=>{ setConfirmBaja(false); setTipoCese(''); setEspecificacionCese(''); setMotivoBaja('') }} className="btn-secondary">Cancelar</button>
              <button onClick={()=>{
                if(!tipoCese) return;
                if(tipoCese==='Otros' && !especificacionCese.trim()) return;
                const ceseLabel = tipoCese==='Otros' ? especificacionCese.trim() : tipoCese;
                dispatch({type:'BAJA_TRABAJADOR',id:t.id,fecha:todayStr(),tipoCese,motivo:ceseLabel+(motivoBaja.trim()?` — ${motivoBaja.trim()}`:''),registradoPor:user?.nombre||''});
                toast('Trabajador dado de baja');
                setConfirmBaja(false); setTipoCese(''); setEspecificacionCese(''); setMotivoBaja('');
                onBack()
              }} className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg font-medium">Confirmar Baja</button>
            </div>
          </div>
        </div>
      )}

      {confirmReact && (
        <Confirm message={`¿Reactivar a ${fullApellidos(t)}, ${t.nombres}?`} confirmLabel="Reactivar"
          onConfirm={()=>{ dispatch({type:'REACTIVAR_TRABAJADOR',id:t.id,fecha:todayStr(),registradoPor:user?.nombre||''}); toast('Trabajador reactivado'); setConfirmReact(false) }}
          onCancel={()=>setConfirmReact(false)} />
      )}
    </div>
  )
}

// ── Parte 1: Listado Maestro de Trabajadores ───────────────────────────────────
function TabListadoTrabajadores({ onSelectTrabajador, isAdmin, isSoma, isRRHH, dispatch, toast }) {
  const { state } = useApp()
  const trabajadores = state.trabajadores || []
  const empresasGrupo = state.empresasGrupo || []
  const clientesRRHH  = state.clientesRRHH  || []

  const [busq, setBusq] = useState('')
  const [filtEmpresa, setFiltEmpresa] = useState('')
  const [filtCliente, setFiltCliente] = useState('')
  const [filtEstado, setFiltEstado]   = useState('')
  const [pagina, setPagina] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const POR_PAG = 25

  const listaFiltrada = useMemo(() => {
    const q = busq.toLowerCase()
    return trabajadores.filter(t => {
      const fullName = `${fullApellidos(t)} ${t.nombres||''}`.toLowerCase()
      const coincideBusq = !q || fullName.includes(q) || (t.documento||'').includes(q)
      const empresa = empresasGrupo.find(e=>e.id===t.empresaGrupoId)
      const coincideEmp = !filtEmpresa || t.empresaGrupoId === filtEmpresa
      const coincideCli = !filtCliente || t.clienteRRHHId === filtCliente
      const coincideEst = !filtEstado  || t.estado === filtEstado
      return coincideBusq && coincideEmp && coincideCli && coincideEst
    }).sort((a,b) => `${fullApellidos(a)} ${a.nombres}`.localeCompare(`${fullApellidos(b)} ${b.nombres}`))
  }, [trabajadores, busq, filtEmpresa, filtCliente, filtEstado, empresasGrupo])

  const totalPags = Math.max(1, Math.ceil(listaFiltrada.length / POR_PAG))
  const pagActual = Math.min(pagina, totalPags)
  const items = listaFiltrada.slice((pagActual-1)*POR_PAG, pagActual*POR_PAG)

  const ESTADO_BADGE = {
    Activo: 'bg-green-100 text-green-700',
    Baja:   'bg-red-100 text-red-700',
    default:'bg-gray-100 text-gray-600',
  }

  const canAdd = isAdmin || isRRHH

  return (
    <div className="space-y-4">
      {/* Barra superior */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Búsqueda */}
          <div className="relative flex-1 min-w-52">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
            <input className="input pl-9 text-sm h-9" placeholder="Buscar por nombre o DNI…"
              value={busq} onChange={e=>{ setBusq(e.target.value); setPagina(1) }} />
          </div>
          {/* Filtros */}
          <select className="input text-sm h-9 min-w-[160px]" value={filtEmpresa} onChange={e=>{ setFiltEmpresa(e.target.value); setPagina(1) }}>
            <option value="">Empresa: Todas</option>
            {empresasGrupo.map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
          <select className="input text-sm h-9 min-w-[160px]" value={filtCliente} onChange={e=>{ setFiltCliente(e.target.value); setPagina(1) }}>
            <option value="">Cliente: Todos</option>
            {clientesRRHH.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <div className="flex gap-1.5">
            {['','Activo','Baja'].map(est=>(
              <button key={est} onClick={()=>{ setFiltEstado(est); setPagina(1) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  filtEstado===est
                    ? est===''       ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                    : est==='Activo' ? 'bg-green-600 text-white border-green-600'
                    :                  'bg-red-600 text-white border-red-600'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                }`}>
                {est==='' ? 'Todos' : est}
              </button>
            ))}
          </div>
          {canAdd && (
            <button onClick={()=>setShowForm(true)} className="btn-primary flex items-center gap-1.5 text-sm h-9 px-4 shrink-0 ml-auto">
              <PlusIcon className="w-4 h-4"/> Agregar
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2 pl-1">
          {listaFiltrada.length} trabajador{listaFiltrada.length!==1?'es':''} · Página {pagActual}/{totalPags}
        </p>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#1e3a5f] text-white text-xs">
              <th className="px-4 py-3 text-left font-semibold">Trabajador</th>
              <th className="px-4 py-3 text-left font-semibold">DNI / Doc.</th>
              <th className="px-4 py-3 text-left font-semibold">Empresa</th>
              <th className="px-4 py-3 text-left font-semibold">Cliente / Local</th>
              <th className="px-4 py-3 text-left font-semibold">Fecha Registro</th>
              <th className="px-4 py-3 text-center font-semibold">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 && (
              <tr><td colSpan={6} className="text-center text-gray-400 py-12">Sin trabajadores</td></tr>
            )}
            {items.map(t => {
              const emp = empresasGrupo.find(e=>e.id===t.empresaGrupoId)
              const cli = clientesRRHH.find(c=>c.id===t.clienteRRHHId)
              const loc = (cli?.locales||[]).find(l=>l.id===t.localRRHHId)
              return (
                <tr key={t.id} onClick={()=>onSelectTrabajador(t.id)}
                  className="hover:bg-blue-50/50 cursor-pointer transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{fullApellidos(t)}, {t.nombres}</p>
                    <p className="text-xs text-gray-400">{t.servicioCargo||'—'}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700 font-mono text-xs">{t.documento||'—'}</td>
                  <td className="px-4 py-3 text-gray-600">{emp?.nombre||'—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-gray-700">{cli?.nombre||'—'}</span>
                    {loc && <span className="text-gray-400"> / {loc.nombre}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{fmtFecha(t.fechaRegistro)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_BADGE[t.estado]||ESTADO_BADGE.default}`}>{t.estado||'—'}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPags > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={pagActual===1} onClick={()=>setPagina(p=>p-1)} className="btn-secondary text-sm disabled:opacity-40">← Anterior</button>
          <span className="text-sm text-gray-600">{pagActual} / {totalPags}</span>
          <button disabled={pagActual===totalPags} onClick={()=>setPagina(p=>p+1)} className="btn-secondary text-sm disabled:opacity-40">Siguiente →</button>
        </div>
      )}

      {/* Modal agregar */}
      {showForm && (
        <Modal title="Nuevo Trabajador" onClose={()=>setShowForm(false)} wide>
          <FormTrabajador initial={null} empresasGrupo={state.empresasGrupo||[]} clientesRRHH={state.clientesRRHH||[]}
            onSave={data=>{ dispatch({type:'ADD_TRABAJADOR',payload:data}); toast('Trabajador registrado'); setShowForm(false) }}
            onClose={()=>setShowForm(false)} />
        </Modal>
      )}
    </div>
  )
}

// ── Parte 6: Consulta DNI ──────────────────────────────────────────────────────
function ConsultaDNI({ isRemu }) {
  const { state } = useApp()
  const [query, setQuery]   = useState('')
  const [result, setResult] = useState(null)
  const [notFound, setNotFound] = useState(false)

  const trabajadores  = state.trabajadores  || []
  const empresasGrupo = state.empresasGrupo || []
  const clientesRRHH  = state.clientesRRHH  || []

  const buscar = () => {
    const q = query.trim()
    if (!q) return
    const t = trabajadores.find(t => t.documento === q || `${fullApellidos(t)} ${t.nombres}`.toLowerCase().includes(q.toLowerCase()))
    if (t) { setResult(t); setNotFound(false) }
    else { setResult(null); setNotFound(true) }
  }

  const t = result
  const emp = t ? empresasGrupo.find(e=>e.id===t.empresaGrupoId) : null
  const cli = t ? clientesRRHH.find(c=>c.id===t.clienteRRHHId) : null
  const loc = t && cli ? (cli.locales||[]).find(l=>l.id===t.localRRHHId) : null

  const DOCS_CHECK = ['emo','sctr','induccion','contrato']

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div className="flex gap-3">
        <input className="input flex-1" placeholder="DNI o nombre del trabajador…"
          value={query} onChange={e=>setQuery(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&buscar()} />
        <button onClick={buscar} className="btn-primary flex items-center gap-2">
          <MagnifyingGlassIcon className="w-4 h-4"/> Buscar
        </button>
      </div>

      {notFound && <p className="text-red-500 text-sm text-center">No se encontró ningún trabajador.</p>}

      {t && (
        <div className="space-y-3">
          {/* Bloque 1: Estado actual */}
          <div className="card p-4 border-l-4 border-[#1e3a5f]">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Estado Actual</p>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${t.estado==='Activo'?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{t.estado||'—'}</span>
              <span className="text-gray-700 font-semibold">{fullApellidos(t)}, {t.nombres}</span>
              {t.correlativo && <span className="text-xs text-gray-400">#{t.correlativo}</span>}
            </div>
            <p className="text-sm text-gray-500 mt-1">{t.servicioCargo||'—'} · {emp?.nombre||'—'} → {cli?.nombre||'—'} / {loc?.nombre||'—'}</p>
          </div>

          {/* Bloque 2: Datos personales */}
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Datos Personales</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
              <span className="text-gray-500">DNI/Doc.</span><span className="text-gray-800 font-mono">{t.documento||'—'}</span>
              <span className="text-gray-500">Fecha nac.</span><span>{fmtFecha(t.fechaNacimiento)} {t.fechaNacimiento&&<span className="text-gray-400">({calcEdad(t.fechaNacimiento)} años)</span>}</span>
              <span className="text-gray-500">Sexo</span><span>{t.sexo||'—'}</span>
              <span className="text-gray-500">E. civil</span><span>{t.estadoCivil||'—'}</span>
              <span className="text-gray-500">Teléfono</span><span>{t.telefono||'—'}</span>
              <span className="text-gray-500">Correo</span><span className="break-all">{t.correo||'—'}</span>
              <span className="text-gray-500">Grado ins.</span><span>{t.gradoInstruccion||'—'}</span>
              <span className="text-gray-500">Profesión</span><span>{t.profesion||'—'}</span>
            </div>
          </div>

          {/* Bloque 3: Datos bancarios (solo si isRemu) */}
          {isRemu ? (
            <div className="card p-4 border border-amber-200 bg-amber-50/30">
              <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">🔒 Datos Bancarios / Remuneración</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                <span className="text-gray-500">Banco</span><span>{t.banco||'—'}</span>
                <span className="text-gray-500">N° cuenta</span><span className="font-mono">{t.numeroCuenta||'—'}</span>
                <span className="text-gray-500">CCI</span><span className="font-mono">{t.cci||'—'}</span>
                <span className="text-gray-500">Remuneración</span><span className="font-semibold">{t.remuneracion?`S/ ${parseFloat(t.remuneracion).toLocaleString('es-PE',{minimumFractionDigits:2})}`:'—'}</span>
                <span className="text-gray-500">AFP/SNP</span><span>{t.afpSnp||'—'}</span>
                <span className="text-gray-500">CLAVE SOL</span><span className="font-mono">{t.claveSol||'—'}</span>
              </div>
            </div>
          ) : (
            <div className="card p-4 bg-gray-50 text-center text-gray-400 text-sm">🔒 Datos bancarios y remuneración — acceso restringido</div>
          )}

          {/* Bloque 4: Seguimiento semáforo */}
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Seguimiento Documentario</p>
            <div className="space-y-2">
              {[
                { key:'emo',       label:'EMO',        vField:'fechaVencimiento' },
                { key:'sctr',      label:'SCTR',       vField:'fechaVencimiento' },
                { key:'induccion', label:'Inducción',  vField:'fechaRealizado'   },
                { key:'contrato',  label:'Contrato',   vField:'fechaVencimiento' },
              ].map(d => {
                const doc = (t.documentos||{})[d.key]
                return (
                  <div key={d.key} className="flex items-center gap-3">
                    <span className="text-sm text-gray-600 w-20">{d.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      doc?.estado==='Vigente'?'bg-green-50 text-green-700 border-green-200':
                      doc?.estado==='Vencido'?'bg-red-50 text-red-700 border-red-200':
                      'bg-gray-50 text-gray-500 border-gray-200'}`}>{doc?.estado||'Sin datos'}</span>
                    {doc?.[d.vField] && <Semaforo fecha={doc[d.vField]} label={fmtFecha(doc[d.vField])} />}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bloque 5: Accesos rápidos */}
          <div className="card p-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Accesos Rápidos</p>
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Vínculo: {t.tipoVinculo||'—'}</span>
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Categoría: {t.categoria||'—'}</span>
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Ingreso: {fmtFecha(t.fechaIngreso)}</span>
              {t.tiempoActivo && <span className="text-xs text-blue-600 bg-blue-50 px-3 py-1 rounded-full">⏱ {t.tiempoActivo}</span>}
              {t.estado==='Baja' && <span className="text-xs text-red-600 bg-red-50 px-3 py-1 rounded-full">Baja: {fmtFecha(t.fechaBaja)}</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── TabDashboard (con alertas Parte 5) ────────────────────────────────────────
function TabDashboard({ isRRHH, isAdmin, isSoma, isRemu }) {
  const { state } = useApp()
  const trabajadores  = state.trabajadores  || []
  const empresasGrupo = state.empresasGrupo || []
  const clientesRRHH  = state.clientesRRHH  || []

  const activos = trabajadores.filter(t=>t.estado==='Activo')
  const bajas   = trabajadores.filter(t=>t.estado==='Baja')

  // Generar alertas (Parte 5)
  const alertas = useMemo(() => {
    const lista = []
    activos.forEach(t => {
      const docs = t.documentos || {}
      const checks = [
        { doc: docs.sctr,      key:'sctr',     label:'SCTR',        field:'fechaVencimiento' },
        { doc: docs.emo,       key:'emo',       label:'EMO',         field:'fechaVencimiento' },
        { doc: docs.contrato,  key:'contrato',  label:'Contrato',    field:'fechaVencimiento' },
      ]
      ;(docs.certificados||[]).forEach((c,i) => {
        checks.push({ doc: c, key:`cert-${i}`, label:`Cert: ${c.nombre||'—'}`, field:'fechaVencimiento' })
      })
      checks.forEach(({ doc, key, label, field }) => {
        if (!doc) return
        const fecha = doc[field]
        if (!fecha) return
        const dias = diasHastaVencer(fecha)
        if (dias <= 30) {
          const emp = empresasGrupo.find(e=>e.id===t.empresaGrupoId)
          const cli = clientesRRHH.find(c=>c.id===t.clienteRRHHId)
          lista.push({
            id: `${t.id}-${key}`,
            trabajador: `${fullApellidos(t)}, ${t.nombres}`,
            empresa: emp?.nombre||'—',
            cliente: cli?.nombre||'—',
            documento: label,
            fecha,
            dias,
            nivel: dias < 0 ? 'vencido' : dias <= 7 ? 'critico' : 'proximo',
          })
        }
      })
    })
    return lista.sort((a,b)=>a.dias-b.dias)
  }, [activos, empresasGrupo, clientesRRHH])

  const vencidos  = alertas.filter(a=>a.nivel==='vencido')
  const criticos  = alertas.filter(a=>a.nivel==='critico')
  const proximos  = alertas.filter(a=>a.nivel==='proximo')

  const ALERT_ROW = ({ a }) => (
    <div className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-800">{a.trabajador}</p>
        <p className="text-xs text-gray-400">{a.empresa} · {a.cliente}</p>
      </div>
      <span className="text-xs text-gray-500">{a.documento}</span>
      <Semaforo fecha={a.fecha} label={fmtFecha(a.fecha)} />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'Total trabajadores', value:trabajadores.length, color:'text-[#1e3a5f]', bg:'bg-blue-50' },
          { label:'Activos',            value:activos.length,     color:'text-green-700', bg:'bg-green-50' },
          { label:'Bajas',              value:bajas.length,       color:'text-red-700',   bg:'bg-red-50'   },
          { label:'Alertas activas',    value:alertas.length,     color:'text-amber-700', bg:'bg-amber-50' },
        ].map(kpi=>(
          <div key={kpi.label} className={`card p-4 ${kpi.bg} border-0`}>
            <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs text-gray-500 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="space-y-3">
          {vencidos.length > 0 && (
            <div className="card border-l-4 border-red-500 p-4">
              <div className="flex items-center gap-2 mb-3">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500"/>
                <h3 className="font-semibold text-red-700">🔴 Documentos Vencidos ({vencidos.length})</h3>
              </div>
              {vencidos.map(a=><ALERT_ROW key={a.id} a={a}/>)}
            </div>
          )}
          {criticos.length > 0 && (
            <div className="card border-l-4 border-amber-500 p-4">
              <div className="flex items-center gap-2 mb-3">
                <BellAlertIcon className="w-5 h-5 text-amber-500"/>
                <h3 className="font-semibold text-amber-700">🟡 Vencen en ≤7 días ({criticos.length})</h3>
              </div>
              {criticos.map(a=><ALERT_ROW key={a.id} a={a}/>)}
            </div>
          )}
          {proximos.length > 0 && (
            <div className="card border-l-4 border-blue-300 p-4">
              <div className="flex items-center gap-2 mb-3">
                <ClockIcon className="w-5 h-5 text-blue-400"/>
                <h3 className="font-semibold text-blue-700">⏳ Vencen en ≤30 días ({proximos.length})</h3>
              </div>
              {proximos.map(a=><ALERT_ROW key={a.id} a={a}/>)}
            </div>
          )}
        </div>
      )}

      {alertas.length === 0 && (
        <div className="card p-8 text-center text-gray-400">
          <CheckCircleIcon className="w-12 h-12 mx-auto mb-3 text-green-400"/>
          <p className="font-medium text-gray-600">Todo en orden</p>
          <p className="text-sm">No hay documentos próximos a vencer ni vencidos.</p>
        </div>
      )}

      {/* Distribución por empresa */}
      <div className="card p-4">
        <h3 className="font-semibold text-gray-700 mb-3">Distribución por empresa</h3>
        <div className="space-y-2">
          {empresasGrupo.map(emp => {
            const cnt = activos.filter(t=>t.empresaGrupoId===emp.id).length
            const pct = activos.length > 0 ? Math.round(cnt/activos.length*100) : 0
            return (
              <div key={emp.id} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-40 truncate">{emp.nombre}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="h-2 rounded-full bg-[#1e3a5f]" style={{width:`${pct}%`}}/>
                </div>
                <span className="text-xs text-gray-500 w-16 text-right">{cnt} ({pct}%)</span>
              </div>
            )
          })}
          {empresasGrupo.length === 0 && <p className="text-sm text-gray-400">Sin empresas registradas.</p>}
        </div>
      </div>

      {/* Rotación: tipo de cese */}
      <div className="card p-4">
        <h3 className="font-semibold text-gray-700 mb-1">Motivos de cese</h3>
        <p className="text-xs text-gray-400 mb-3">Total bajas registradas: {bajas.length}</p>
        {bajas.length === 0
          ? <p className="text-sm text-gray-400">Sin bajas registradas.</p>
          : (() => {
              const OPCIONES = ['Motivos familiares','Inasistencia','Evaluación','Mejor oferta','Otros']
              const COLORES  = ['bg-blue-500','bg-amber-500','bg-purple-500','bg-green-500','bg-gray-400']
              const counts = OPCIONES.map(op => ({
                label: op,
                cnt: bajas.filter(t => (t.tipoCese || 'Otros') === op).length
              }))
              const max = Math.max(...counts.map(c=>c.cnt), 1)
              return (
                <div className="space-y-2">
                  {counts.map((c, i) => (
                    <div key={c.label} className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 w-36 shrink-0">{c.label}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                        <div className={`h-2.5 rounded-full ${COLORES[i]} transition-all`} style={{width: c.cnt > 0 ? `${Math.round(c.cnt/max*100)}%` : '0%'}}/>
                      </div>
                      <span className="text-sm font-semibold text-gray-700 w-6 text-right">{c.cnt}</span>
                    </div>
                  ))}
                </div>
              )
            })()
        }
      </div>

      {/* Rotación por sede */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-800">Rotación por sede / local</h3>
            <p className="text-xs text-gray-400 mt-0.5">Bajas agrupadas por lugar de asignación</p>
          </div>
          {bajas.length > 0 && (
            <span className="text-xs font-semibold bg-red-50 text-red-600 border border-red-100 px-3 py-1 rounded-full">
              {bajas.length} baja{bajas.length !== 1 ? 's' : ''} total{bajas.length !== 1 ? 'es' : ''}
            </span>
          )}
        </div>
        {bajas.length === 0
          ? (
            <div className="text-center py-6 text-gray-400 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200">
              Sin bajas registradas
            </div>
          )
          : (() => {
              // Construir mapas de resolución
              const localMap = {}
              const clienteMap = {}
              const empresaMap = {}
              clientesRRHH.forEach(cli => {
                clienteMap[cli.id] = cli.nombre
                ;(cli.locales || []).forEach(loc => {
                  localMap[loc.id] = { nombre: loc.nombre, cliente: cli.nombre }
                })
              })
              empresasGrupo.forEach(eg => { empresaMap[eg.id] = eg.nombre })
              ;(state.sedes || []).forEach(s => {
                if (!localMap[s.id]) localMap[s.id] = { nombre: s.nombre, cliente: '' }
              })

              // Agrupar bajas — usar clienteRRHHId como fallback cuando el local no resuelve
              const grouped = {}
              bajas.forEach(t => {
                const localInfo = localMap[t.localRRHHId]
                const key = localInfo
                  ? (t.localRRHHId || '__sin__')
                  : (t.clienteRRHHId ? `cli_${t.clienteRRHHId}` : (t.empresaGrupoId ? `eg_${t.empresaGrupoId}` : '__sin__'))
                if (!grouped[key]) grouped[key] = { key, trabajadores: [], localInfo, t }
                grouped[key].trabajadores.push(t)
              })

              const TAG_COLOR = {
                'Motivos familiares': 'bg-blue-50 text-blue-700 border border-blue-100',
                'Inasistencia':       'bg-amber-50 text-amber-700 border border-amber-100',
                'Evaluación':         'bg-purple-50 text-purple-700 border border-purple-100',
                'Mejor oferta':       'bg-green-50 text-green-700 border border-green-100',
                'Otros':              'bg-gray-100 text-gray-600 border border-gray-200',
              }

              const rows = Object.values(grouped).map(g => {
                let nombre = 'Sin sede asignada'
                let subtitulo = ''
                if (g.localInfo) {
                  nombre = g.localInfo.nombre
                  subtitulo = g.localInfo.cliente
                } else if (g.key.startsWith('cli_')) {
                  const cliId = g.key.replace('cli_', '')
                  nombre = clienteMap[cliId] || 'Cliente sin nombre'
                  subtitulo = empresaMap[g.trabajadores[0]?.empresaGrupoId] || ''
                } else if (g.key.startsWith('eg_')) {
                  const egId = g.key.replace('eg_', '')
                  nombre = empresaMap[egId] || 'Empresa sin nombre'
                }
                const ceseDetalle = g.trabajadores.reduce((acc, t) => {
                  const c = t.tipoCese || 'Otros'
                  acc[c] = (acc[c] || 0) + 1
                  return acc
                }, {})
                return { key: g.key, nombre, subtitulo, cnt: g.trabajadores.length, ceseDetalle }
              }).sort((a,b) => b.cnt - a.cnt)

              const maxR = Math.max(...rows.map(r=>r.cnt), 1)

              return (
                <div className="space-y-2">
                  {rows.map((r, i) => (
                    <div key={r.key} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-sm font-bold text-gray-500 shrink-0 mt-0.5">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">{r.nombre}</p>
                              {r.subtitulo && <p className="text-xs text-gray-400">{r.subtitulo}</p>}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-xl font-extrabold text-red-600">{r.cnt}</span>
                              <span className="text-xs text-gray-400">baja{r.cnt !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2.5">
                            <div className="h-1.5 rounded-full bg-red-400 transition-all" style={{width:`${Math.round(r.cnt/maxR*100)}%`}}/>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(r.ceseDetalle).map(([tipo, n]) => (
                              <span key={tipo} className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${TAG_COLOR[tipo] || 'bg-gray-100 text-gray-600'}`}>
                                {tipo} · {n}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()
        }
      </div>
    </div>
  )
}

// ── TabRotaciones (simplificado, preservado del diseño original) ───────────────
function TabRotaciones({ isAdmin, isSoma, isRRHH, dispatch, toast }) {
  const { state } = useApp()
  const trabajadores  = state.trabajadores  || []
  const empresasGrupo = state.empresasGrupo || []
  const clientesRRHH  = state.clientesRRHH  || []

  const [busq, setBusq] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [tSelected, setTSelected] = useState(null)
  const [nuevaAsig, setNuevaAsig] = useState({ empresaGrupoId:'', clienteRRHHId:'', localRRHHId:'', servicioCargo:'', area:'', detalle:'' })

  const activos = trabajadores.filter(t=>t.estado==='Activo')
  const filtrados = activos.filter(t=>{
    const q = busq.toLowerCase()
    return !q || `${fullApellidos(t)} ${t.nombres}`.toLowerCase().includes(q) || (t.documento||'').includes(q)
  })

  const clienteSeleccionado = clientesRRHH.find(c=>c.id===nuevaAsig.clienteRRHHId)

  const saveRotacion = () => {
    if (!tSelected || !nuevaAsig.empresaGrupoId || !nuevaAsig.clienteRRHHId) return
    dispatch({
      type: 'ADD_MOV_TRABAJADOR',
      id: tSelected.id,
      movimiento: {
        id: genId(),
        tipo: 'Rotación',
        fecha: todayStr(),
        detalle: `${nuevaAsig.detalle||'Rotación de sede'} → ${clientesRRHH.find(c=>c.id===nuevaAsig.clienteRRHHId)?.nombre||'—'}`,
        registradoPor: 'Admin',
      }
    })
    dispatch({ type:'UPDATE_TRABAJADOR', id:tSelected.id, payload:{ ...nuevaAsig } })
    toast('Rotación registrada')
    setShowForm(false)
    setTSelected(null)
    setNuevaAsig({ empresaGrupoId:'', clienteRRHHId:'', localRRHHId:'', servicioCargo:'', area:'', detalle:'' })
  }

  const canEdit = isAdmin || isSoma || isRRHH

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
          <input className="input pl-9 text-sm" placeholder="Buscar trabajador activo…"
            value={busq} onChange={e=>setBusq(e.target.value)} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#1e3a5f] text-white text-xs">
              <th className="px-4 py-3 text-left">Trabajador</th>
              <th className="px-4 py-3 text-left">Empresa actual</th>
              <th className="px-4 py-3 text-left">Cliente / Local actual</th>
              <th className="px-4 py-3 text-left">Cargo</th>
              {canEdit && <th className="px-4 py-3 text-center">Acción</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtrados.length===0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">Sin trabajadores activos</td></tr>}
            {filtrados.map(t=>{
              const emp = empresasGrupo.find(e=>e.id===t.empresaGrupoId)
              const cli = clientesRRHH.find(c=>c.id===t.clienteRRHHId)
              const loc = (cli?.locales||[]).find(l=>l.id===t.localRRHHId)
              return (
                <tr key={t.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{fullApellidos(t)}, {t.nombres}</td>
                  <td className="px-4 py-3 text-gray-600">{emp?.nombre||'—'}</td>
                  <td className="px-4 py-3 text-gray-600">{cli?.nombre||'—'}{loc&&<span className="text-gray-400"> / {loc.nombre}</span>}</td>
                  <td className="px-4 py-3 text-gray-600">{t.servicioCargo||'—'}</td>
                  {canEdit && (
                    <td className="px-4 py-3 text-center">
                      <button onClick={()=>{ setTSelected(t); setNuevaAsig({ empresaGrupoId:t.empresaGrupoId||'', clienteRRHHId:t.clienteRRHHId||'', localRRHHId:t.localRRHHId||'', servicioCargo:t.servicioCargo||'', area:t.area||'', detalle:'' }); setShowForm(true) }}
                        className="text-blue-600 hover:underline text-xs">Rotar / Reasignar</button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {showForm && tSelected && (
        <Modal title={`Rotación — ${fullApellidos(tSelected)}, ${tSelected.nombres}`} onClose={()=>setShowForm(false)} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-medium text-gray-600 block mb-1">Empresa destino *</label>
                <select className="input" value={nuevaAsig.empresaGrupoId}
                  onChange={e=>setNuevaAsig(p=>({...p,empresaGrupoId:e.target.value,clienteRRHHId:'',localRRHHId:''}))}>
                  <option value="">Seleccionar…</option>{empresasGrupo.map(e=><option key={e.id} value={e.id}>{e.nombre}</option>)}
                </select></div>
              <div><label className="text-xs font-medium text-gray-600 block mb-1">Local / sede destino</label>
                {(() => {
                  const egRot = empresasGrupo.find(x=>x.id===nuevaAsig.empresaGrupoId)
                  const idsRot = egRot?.clienteIds||[]
                  const localesRot = clientesRRHH
                    .filter(c=>idsRot.includes(c.id))
                    .flatMap(c=>(c.locales||[]).map(l=>({...l,_cid:c.id,_cnombre:c.nombre})))
                  return (
                    <select className="input" value={nuevaAsig.localRRHHId}
                      disabled={!nuevaAsig.empresaGrupoId||localesRot.length===0}
                      onChange={e=>{
                        const lObj=localesRot.find(l=>l.id===e.target.value)
                        setNuevaAsig(p=>({...p,localRRHHId:e.target.value,clienteRRHHId:lObj?._cid||p.clienteRRHHId}))
                      }}>
                      <option value="">Sin local</option>
                      {localesRot.map(l=><option key={l.id} value={l.id}>{l.nombre}{l._cnombre?` (${l._cnombre})`:''}</option>)}
                    </select>
                  )
                })()}
              </div>
              <div><label className="text-xs font-medium text-gray-600 block mb-1">Cargo destino</label>
                <input className="input" value={nuevaAsig.servicioCargo} onChange={e=>setNuevaAsig(p=>({...p,servicioCargo:e.target.value}))} /></div>
            </div>
            <div><label className="text-xs font-medium text-gray-600 block mb-1">Detalle / motivo</label>
              <textarea className="input" rows={2} value={nuevaAsig.detalle} onChange={e=>setNuevaAsig(p=>({...p,detalle:e.target.value}))} /></div>
            <div className="flex gap-3 justify-end">
              <button onClick={()=>setShowForm(false)} className="btn-secondary">Cancelar</button>
              <button onClick={saveRotacion} className="btn-primary">Guardar rotación</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}



// ── Componente Principal RRHH ──────────────────────────────────────────────────
const TABS = ['Dashboard','Trabajadores','Rotaciones / Historial','Consulta DNI']

export default function RRHH() {
  const { state, dispatch } = useApp()
  const { user, isAdmin } = useAuth()
  const { puedeHacer } = usePerm()
  const toast = useToast()

  // Permisos RRHH — usePerm lee directamente de Roles y Permisos (igual que el sidebar)
  const isRRHH = puedeHacer('rrhh', 'crear') || puedeHacer('rrhh', 'editar')
    || ['Jefe RRHH', 'Asistente RRHH'].includes(user?.rol)
  const isSoma = puedeHacer('epps', 'editar')
    || ['Jefe SOMA/SIG', 'Asistente SOMA'].includes(user?.rol)
  const isRemu = isAdmin || isRRHH || user?.rol === 'Gerencia'

  const [tab, setTab] = useState('Dashboard')
  const [trabajadorId, setTrabajadorId] = useState(null)

  const trabajador = trabajadorId ? (state.trabajadores||[]).find(t=>t.id===trabajadorId) : null

  const seleccionarTrabajador = (id) => {
    setTrabajadorId(id)
    setTab('__ficha__')
  }

  const volverAlListado = () => {
    setTrabajadorId(null)
    setTab('Trabajadores')
  }

  const props = { isAdmin, isSoma, isRRHH, isRemu, dispatch, toast, user }

  return (
    <div className="space-y-6">
      <PageHeader title="Recursos Humanos" subtitle="Gestión de personal, rotaciones y asignaciones" />

      {/* Pestañas principales (se ocultan cuando se ve ficha) */}
      {tab !== '__ficha__' && (
        <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
          {TABS.map(t=>(
            <button key={t} onClick={()=>{ setTab(t); setTrabajadorId(null) }}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${tab===t?'border-[#1e3a5f] text-[#1e3a5f]':'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t}
            </button>
          ))}
        </div>
      )}

      {/* Contenido */}
      {tab === 'Dashboard'              && <TabDashboard {...props} />}
      {tab === 'Trabajadores'           && <TabListadoTrabajadores {...props} onSelectTrabajador={seleccionarTrabajador} />}
      {tab === 'Rotaciones / Historial' && <TabRotaciones {...props} />}
      {tab === 'Consulta DNI'           && <ConsultaDNI isRemu={isRemu} />}
      {tab === '__ficha__' && trabajador && (
        <FichaTrabajador t={trabajador} onBack={volverAlListado} {...props} />
      )}
    </div>
  )
}
