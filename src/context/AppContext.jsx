import { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react'
import { buildSeedData } from '../utils/seedData'
import { genId, nextVale, todayISO } from '../utils/helpers'

const AUDIT_DESC = {
  USER_LOGIN:   a => `Inicio de sesión — ${a.nombre || ''} (${a.rol || ''})`,
  USER_LOGOUT:  a => `Cierre de sesión — ${a.nombre || ''}`,
  PDF_EXPORT:   a => `PDF exportado: ${a.documento || ''}`,
  EXCEL_EXPORT: a => `Excel exportado: ${a.documento || ''}`,
  ELEVAR_GERENCIA:    a => `REQ ${a.id || ''} elevado a Aprobación Gerencial — motivo: ${a.motivoElevacion || ''}`,
  APROBAR_GERENCIA:   a => `REQ ${a.id || ''} Aprobado por Gerencia`,
  RECHAZAR_GERENCIA:  a => `REQ ${a.id || ''} Rechazado por Gerencia`,
  POSPONER_GERENCIA:  a => `REQ ${a.id || ''} Pospuesto al Consolidado Gerencial`,
  CONSOLIDAR_REQ:     a => `REQ ${a.id || ''} puesto En Consolidado`,
  APROBAR_REQ_RRHH:   a => `RRHH procesó REQ ${a.id || ''}`,
  ADD_SEDE:               a => `Nueva sede: ${a.payload?.nombre}`,
  UPDATE_SEDE:            () => `Actualizó sede`,
  DELETE_SEDE:            () => `Eliminó sede`,
  ADD_PRODUCTO:           a => `Nuevo producto: ${a.payload?.nombre} (${a.payload?.codigo||''})`,
  UPDATE_PRODUCTO:        () => `Actualizó producto`,
  DELETE_PRODUCTO:        () => `Eliminó producto`,
  ADD_PROVEEDOR:          a => `Nuevo proveedor: ${a.payload?.nombre}`,
  UPDATE_PROVEEDOR:       () => `Actualizó proveedor`,
  DELETE_PROVEEDOR:       () => `Eliminó proveedor`,
  ADD_EMPRESA:            a => `Nueva empresa: ${a.payload?.razonSocial}`,
  UPDATE_EMPRESA:         () => `Actualizó empresa`,
  DELETE_EMPRESA:         () => `Eliminó empresa`,
  ADD_USUARIO:            a => `Nuevo usuario: ${a.payload?.nombre} - Rol: ${a.payload?.rol}`,
  UPDATE_USUARIO:         () => `Actualizó usuario`,
  DELETE_USUARIO:         () => `Eliminó usuario`,
  ADD_SUPERVISOR:         a => `Nuevo supervisor: ${a.payload?.nombre}`,
  UPDATE_SUPERVISOR:      () => `Actualizó supervisor`,
  DELETE_SUPERVISOR:      () => `Eliminó supervisor`,
  SET_LOGO:               () => `Actualizó logo de empresa`,
  ADD_MAQUINA:            a => `Nueva maquina: ${a.payload?.nombre} (${a.payload?.tipo||''})`,
  UPDATE_MAQUINA:         () => `Actualizó maquina`,
  DELETE_MAQUINA:         () => `Eliminó maquina`,
  ADD_FACTURA:            a => `Nueva factura: ${a.payload?.numero||''} - ${a.payload?.proveedor||''}`,
  UPDATE_FACTURA_ESTADO:  a => `Cambio estado factura a: ${a.estado}`,
  REGISTRAR_PAGO_FACTURA: a => `Pago registrado en factura — S/ ${a.monto?.toFixed(2)||'0.00'}`,
  ADD_TRANSFERENCIA:      () => `Nuevo vale de salida creado`,
  ADD_OC:                 () => `Nueva OC creada`,
  ENVIAR_OC_APROBACION:   a => `OC enviada para aprobación`,
  APROBAR_OC:             a => `OC aprobada por ${a.aprobadoPor||''}`,
  RECHAZAR_OC:            a => `OC rechazada por ${a.rechazadoPor||''}`,
  UPDATE_CONFIG_APROBACIONES: () => `Actualizó configuración de aprobaciones`,
  UPDATE_OC:              a => a.payload?.estado ? `OC cambio estado a: ${a.payload.estado}` : `Actualizó OC`,
  DELETE_OC:              () => `Eliminó OC`,
  ADD_CONFORMIDAD:        () => `Nueva conformidad/recepcion registrada`,
  UPDATE_CONFORMIDAD:     () => `Actualizó conformidad`,
  DELETE_CONFORMIDAD:     () => `Eliminó conformidad`,
  ADD_RQ:                 () => `Nuevo RQ creado`,
  UPDATE_RQ:              a => a.payload?.estado ? `RQ cambio estado a: ${a.payload.estado}` : `Actualizó RQ`,
  DELETE_RQ:              () => `Eliminó RQ`,
  ADD_EPP:                a => `EPP registrado: ${a.payload?.trabajador||''}`,
  ADD_UNIFORME_ENTREGA:   a => `Entrega uniforme: ${a.payload?.trabajadorNombre||''}`,
  ADD_UNIFORME_DEVOLUCION:a => `Devolucion uniforme: ${a.payload?.trabajadorNombre||''}`,
  ADD_UNIFORME_INGRESO:   () => `Ingreso de stock de uniformes`,
  UPDATE_EPP:             () => `Actualizó registro EPP`,
  DELETE_EPP:             () => `Eliminó registro EPP`,
  ADD_INGRESO_ALMACEN:    () => `Nuevo ingreso registrado en almacen`,
  ADD_TRASLADO_SEDES:     () => `Traslado de productos entre sedes`,
  DELETE_TRASLADO_SEDES:  () => `Traslado entre sedes eliminado`,
  DELETE_INGRESO_ALMACEN: () => `Eliminó ingreso de almacen`,
  ADD_SALIDA_ALMACEN:     () => `Nueva salida registrada en almacen`,
  DELETE_SALIDA_ALMACEN:  () => `Eliminó salida de almacen`,
  ADD_COTIZACION:         () => `Nueva cotizacion creada`,
  UPDATE_COTIZACION:      () => `Actualizó cotizacion`,
  DELETE_COTIZACION:      () => `Eliminó cotizacion`,
  ADD_SOLICITUD_COT:      a => `Nueva Solicitud de Cotización: ${a.payload?.numero||''}`,
  UPDATE_SOLICITUD_COT:   () => `Actualizó Solicitud de Cotización`,
  APROBAR_SOLICITUD_COT:  a => `Solicitud Cot ${a.numero||''} aprobada — proveedor ganador seleccionado`,
  SOLICITUD_COT_A_OC:     a => `Solicitud Cot convertida a OC ${a.ocNumero||''}`,
  APROBAR_COT_GANADOR:    a => `Cotización comparativa — ganador aprobado: proveedor ${a.proveedorNombre||''}`,
  COTIZACION_A_OC:        a => `Cotización comparativa convertida a OC ${a.ocNumero||''}`,
  ADD_REQUERIMIENTO:      a => `Nuevo REQ: ${a.payload?.responsable||''} - ${a.payload?.areaSolicitante||''} (${a.payload?.estado||''})`,
  UPDATE_REQUERIMIENTO:   a => a.payload?.estado ? `REQ cambio estado a: ${a.payload.estado}` : `Actualizó REQ de bienes/servicios`,
  DELETE_REQUERIMIENTO:   () => `Eliminó REQ de bienes/servicios`,
  APROBAR_REQUERIMIENTO:  () => `Procesó REQ de bienes/servicios`,
  APROBAR_REQ_JEFE:       a => `Jefe procesó REQ ${a.id}`,
  ADD_REQ_PAGO:           a => `Nuevo Req.Pago #${a.payload?.numero||''}`,
  UPDATE_REQ_PAGO:        () => `Actualizó Req.Pago`,
  DELETE_REQ_PAGO:        () => `Eliminó Req.Pago`,
  ADD_SOLICITUD_MANT:     a => `Solicitud mantenimiento: ${a.payload?.maquinaNombre||''} (${a.payload?.tipo||''})`,
  UPDATE_SOLICITUD_MANT:  () => `Actualizó solicitud de mantenimiento`,
  DELETE_SOLICITUD_MANT:  () => `Eliminó solicitud de mantenimiento`,
  ADD_AREA:               a => `Nueva área: ${a.payload?.nombre}`,
  UPDATE_AREA:            () => `Actualizó área`,
  DELETE_AREA:            () => `Eliminó área`,
  TOGGLE_USUARIO_ACTIVO:  a => `Usuario ${a.nombre||''} — ${a.activo ? 'Activado' : 'Desactivado'}`,
  UPDATE_PERFIL_USUARIO:  a => `Perfil actualizado: ${a.nombre||''} — Cargo: ${a.cargo||''}, Área: ${a.area||''}`,
}

const AUDIT_MODULO = {
  ADD_SEDE:'Maestros', UPDATE_SEDE:'Maestros', DELETE_SEDE:'Maestros',
  ADD_PRODUCTO:'Maestros', UPDATE_PRODUCTO:'Maestros', DELETE_PRODUCTO:'Maestros',
  ADD_PROVEEDOR:'Maestros', UPDATE_PROVEEDOR:'Maestros', DELETE_PROVEEDOR:'Maestros',
  ADD_EMPRESA:'Maestros', UPDATE_EMPRESA:'Maestros', DELETE_EMPRESA:'Maestros',
  ADD_USUARIO:'Maestros', UPDATE_USUARIO:'Maestros', DELETE_USUARIO:'Maestros',
  ADD_SUPERVISOR:'Maestros', UPDATE_SUPERVISOR:'Maestros', DELETE_SUPERVISOR:'Maestros',
  SET_LOGO:'Maestros',
  ADD_MAQUINA:'Maquinas', UPDATE_MAQUINA:'Maquinas', DELETE_MAQUINA:'Maquinas',
  ADD_FACTURA:'Facturas', UPDATE_FACTURA_ESTADO:'Facturas', REGISTRAR_PAGO_FACTURA:'Cuentas por Pagar',
  ADD_TRANSFERENCIA:'Vales de Salida',
  ADD_OC:'Ordenes de Compra', UPDATE_OC:'Ordenes de Compra', DELETE_OC:'Ordenes de Compra',
  ENVIAR_OC_APROBACION:'Ordenes de Compra', APROBAR_OC:'Ordenes de Compra', RECHAZAR_OC:'Ordenes de Compra',
  UPDATE_CONFIG_APROBACIONES:'Maestros',
  ADD_CONFORMIDAD:'Conformidades', UPDATE_CONFORMIDAD:'Conformidades', DELETE_CONFORMIDAD:'Conformidades',
  ADD_RQ:'RQs', UPDATE_RQ:'RQs', DELETE_RQ:'RQs',
  ADD_EPP:'EPPs', UPDATE_EPP:'EPPs', DELETE_EPP:'EPPs',
  ADD_UNIFORME_ENTREGA:'Uniformes', ADD_UNIFORME_DEVOLUCION:'Uniformes', ADD_UNIFORME_INGRESO:'Uniformes',
  DELETE_UNIFORME_ENTREGA:'Uniformes', DELETE_UNIFORME_DEVOLUCION:'Uniformes',
  ADD_INGRESO_ALMACEN:'Almacen', DELETE_INGRESO_ALMACEN:'Almacen',
  ADD_TRASLADO_SEDES:'Almacen', DELETE_TRASLADO_SEDES:'Almacen',
  ADD_SALIDA_ALMACEN:'Almacen', DELETE_SALIDA_ALMACEN:'Almacen',
  ADD_COTIZACION:'Cotizaciones', UPDATE_COTIZACION:'Cotizaciones', DELETE_COTIZACION:'Cotizaciones',
  ADD_SOLICITUD_COT:'Cotizaciones', UPDATE_SOLICITUD_COT:'Cotizaciones', APROBAR_SOLICITUD_COT:'Cotizaciones',
  SOLICITUD_COT_A_OC:'Cotizaciones', APROBAR_COT_GANADOR:'Cotizaciones', COTIZACION_A_OC:'Cotizaciones',
  ADD_REQUERIMIENTO:'Requerimientos', UPDATE_REQUERIMIENTO:'Requerimientos',
  DELETE_REQUERIMIENTO:'Requerimientos', APROBAR_REQUERIMIENTO:'Requerimientos',
  APROBAR_REQ_JEFE:'Requerimientos',
  APROBAR_REQ_JEFE_AJUSTE:'Requerimientos',
  ADD_REQ_PAGO:'Req.Pago', UPDATE_REQ_PAGO:'Req.Pago', DELETE_REQ_PAGO:'Req.Pago',
  ADD_SOLICITUD_MANT:'Maquinas', UPDATE_SOLICITUD_MANT:'Maquinas', DELETE_SOLICITUD_MANT:'Maquinas',
  ADD_AREA:'Maestros', UPDATE_AREA:'Maestros', DELETE_AREA:'Maestros',
  TOGGLE_USUARIO_ACTIVO:'Maestros', UPDATE_PERFIL_USUARIO:'Maestros',
  ADD_FACTURA_CLIENTE:'FacturacionClientes', UPDATE_FACTURA_CLIENTE:'FacturacionClientes', DELETE_FACTURA_CLIENTE:'FacturacionClientes',
  ADD_REPORTE_HISTORIAL:'Reportes',
  ELEVAR_GERENCIA:'Requerimientos', APROBAR_GERENCIA:'Requerimientos', RECHAZAR_GERENCIA:'Requerimientos',
  POSPONER_GERENCIA:'Requerimientos', CONSOLIDAR_REQ:'Requerimientos',
  APROBAR_REQ_RRHH:'Requerimientos',
  USER_LOGIN:'Sistema', USER_LOGOUT:'Sistema', PDF_EXPORT:'Sistema', EXCEL_EXPORT:'Sistema',
}

const AUDIT_TIPO = t =>
  t.startsWith('ADD_') ? 'Crear' :
  t.startsWith('DELETE_') ? 'Eliminar' :
  t.startsWith('APROBAR_') || t.startsWith('ENVIAR_OC_APRO') ? 'Aprobar' :
  t.startsWith('RECHAZAR_') ? 'Rechazar' :
  t === 'USER_LOGIN' ? 'Acceso' :
  t === 'USER_LOGOUT' ? 'Cierre sesión' :
  t === 'PDF_EXPORT' ? 'Exportar PDF' :
  t === 'EXCEL_EXPORT' ? 'Exportar Excel' :
  t === 'ELEVAR_GERENCIA' ? 'Elevar' :
  t === 'CONSOLIDAR_REQ' ? 'Consolidar' :
  'Modificar'

function getUser() {
  try { return JSON.parse(localStorage.getItem('givamic_user')) } catch { return null }
}

// ── Build a notification object ─────────────────────────────────────────────
function mkNotif({ paraRoles, mensaje, tipo = 'sistema', link = '/' }) {
  return { id: genId(), paraRoles, mensaje, tipo, link, leido: false, creadoEn: new Date().toISOString() }
}

const AppContext = createContext(null)
const STORAGE_KEY = 'givamic_data_v2'
const DATA_VERSION = '3.0'

function patchMissing(parsed) {
  // Migración acumulativa: agrega campos nuevos sin borrar datos existentes
  if (!parsed.notificaciones) parsed.notificaciones = []
  if (!parsed.configAprobaciones) parsed.configAprobaciones = { oc: { limiteAdmin: 2000 }, reqPago: { limiteAdmin: 5000 } }
  if (!parsed.configAprobaciones.oc) parsed.configAprobaciones.oc = { limiteAdmin: 2000 }
  if (!parsed.configAprobaciones.reqPago) parsed.configAprobaciones.reqPago = { limiteAdmin: 5000 }
  if (!parsed.configPermisos) parsed.configPermisos = {}
  if (!parsed.solicitudesMantenimiento) parsed.solicitudesMantenimiento = []
  if (!parsed.facturasClientes) parsed.facturasClientes = []
  if (!parsed.reportesHistorial) parsed.reportesHistorial = []
  if (!parsed.evaluacionesProveedor) parsed.evaluacionesProveedor = []
  if (!parsed.uniformeEntregas) parsed.uniformeEntregas = []
  if (!parsed.uniformeDevoluciones) parsed.uniformeDevoluciones = []
  if (!parsed.conformidades) parsed.conformidades = []
  if (!parsed.rqs) parsed.rqs = []
  if (!parsed.epps) parsed.epps = []
  if (!parsed.auditLog) parsed.auditLog = []
  if (!parsed.empresas) parsed.empresas = []
  if (!parsed.maquinas) parsed.maquinas = []
  if (!parsed.inventario) parsed.inventario = []
  if (!parsed.movimientos) parsed.movimientos = []
  if (!parsed.supervisores) parsed.supervisores = []
  if (!parsed.areas) parsed.areas = [
    { id: 'ar1', nombre: 'Operaciones',      activo: true },
    { id: 'ar2', nombre: 'Recursos Humanos', activo: true },
    { id: 'ar3', nombre: 'SOMA y SIG',       activo: true },
    { id: 'ar4', nombre: 'Logística',        activo: true },
    { id: 'ar5', nombre: 'Facturación',      activo: true },
    { id: 'ar6', nombre: 'Administración',   activo: true },
    { id: 'ar7', nombre: 'Gerencia',         activo: true },
  ]
  // Patch usuarios: agregar cargo/area/activo si faltan
  if (parsed.usuarios) {
    parsed.usuarios = parsed.usuarios.map(u => ({
      activo: true,
      cargo: '',
      area: '',
      historialCargos: [],
      ...u,
    }))
  }
  if (!parsed.logo) parsed.logo = 'data:image/png;base64,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'
  if (!parsed.config) parsed.config = {}
  if (!parsed.config.logoBase64) parsed.config.logoBase64 = 'data:image/png;base64,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'
  if (parsed.ultimoOC === undefined) parsed.ultimoOC = 0
  if (parsed.ultimoReq === undefined) parsed.ultimoReq = 0
  if (!parsed.solicitudesCotizacion) parsed.solicitudesCotizacion = []
  if (parsed.ultimoSolicitudCot === undefined) parsed.ultimoSolicitudCot = 0
  if (parsed.ultimoRQ === undefined) parsed.ultimoRQ = 0
  if (parsed.ultimoConformidad === undefined) parsed.ultimoConformidad = 0
  if (parsed.ultimoUnifEnt === undefined) parsed.ultimoUnifEnt = 0
  if (parsed.ultimoUnifDev === undefined) parsed.ultimoUnifDev = 0
  // Migrar facturas existentes: agregar campos de pago si no existen
  if (parsed.facturas) {
    parsed.facturas = parsed.facturas.map(f => {
      const calculatedTotal = (f.items || []).reduce((s, it) => s + (it.cantidad || 0) * (it.precioUnit || 0), 0)
      const total = f.totalGeneral || f.total || calculatedTotal
      return {
        montoPagado: 0,
        estadoPago: f.tipoPago === 'Crédito' ? 'Pendiente' : 'N/A',
        pagos: [],
        ...f,
        total,
        totalGeneral: total,
      }
    })
  }
  // Enriquecer inventario con nombres de productos desde movimientos
  if (parsed.inventario && parsed.movimientos) {
    const nombreMap = {}
    ;(parsed.movimientos || []).forEach(m => {
      if (m.productoId && m.producto) nombreMap[m.productoId] = m.producto
    })
    ;(parsed.transferencias || []).forEach(t => {
      ;(t.items || []).forEach(it => {
        if (it.productoId && it.descripcion) nombreMap[it.productoId] = it.descripcion
      })
    })
    Object.keys(parsed.inventario).forEach(sedeId => {
      Object.keys(parsed.inventario[sedeId] || {}).forEach(pid => {
        if (!parsed.inventario[sedeId][pid].nombre && nombreMap[pid]) {
          parsed.inventario[sedeId][pid].nombre = nombreMap[pid]
        }
      })
    })
  }
  // Sincronizar configPermisos con los roles nuevos
  const ROLES_NUEVOS = ['Coordinador Logística y Compras','Administrador de Empresa','Jefe RRHH','Asistente RRHH','Asistente Logística','Facturación','Auditor','Jefe SSOMA','Asistente SSOMA']

  // Roles ERP configurables
  if (!parsed.rolesERP) parsed.rolesERP = [
    { id: 'rol-admin',     nombre: 'Administrador',                    descripcion: 'Acceso completo al sistema',              esSuperAdmin: true,  activo: true, permisos: {} },
    { id: 'rol-gerencia',  nombre: 'Gerencia General',                 descripcion: 'Visibilidad total y aprobaciones finales', esSuperAdmin: true,  activo: true, permisos: {} },
    { id: 'rol-coord-log', nombre: 'Coordinador Logística y Compras',  descripcion: 'Gestión de almacén, compras y despacho',   esSuperAdmin: false, activo: true, permisos: { dashboard:{ver:true}, requerimientos:{ver:true,aprobar:true}, almacen:{ver:true,ingresar:true,despachar:true}, 'ordenes-compra':{ver:true,crear:true,aprobar:true}, cotizaciones:{ver:true,crear:true}, facturas:{ver:true,crear:true}, 'cuentas-por-pagar':{ver:true,crear:true}, inventario:{ver:true}, epps:{ver:true,crear:true}, maquinas:{ver:true,crear:true}, 'evaluacion-proveedores':{ver:true,crear:true}, reportes:{ver:true} } },
    { id: 'rol-coord-gen', nombre: 'Coordinador General',              descripcion: 'Aprobación ítem por ítem de requerimientos',esSuperAdmin: false, activo: true, permisos: { dashboard:{ver:true}, requerimientos:{ver:true,aprobar:true}, 'ordenes-compra':{ver:true}, reportes:{ver:true} } },
    { id: 'rol-jefe-area', nombre: 'Jefe de Área',                     descripcion: 'Primera aprobación de requerimientos',     esSuperAdmin: false, activo: true, permisos: { dashboard:{ver:true}, requerimientos:{ver:true,crear:true,aprobar:true} } },
    { id: 'rol-colab',     nombre: 'Colaborador',                      descripcion: 'Creación de requerimientos y seguimiento',  esSuperAdmin: false, activo: true, permisos: { dashboard:{ver:true}, requerimientos:{ver:true,crear:true} } },
    { id: 'rol-auditor',   nombre: 'Auditor',                          descripcion: 'Acceso de solo lectura a todos los módulos',esSuperAdmin: false, activo: true, permisos: { dashboard:{ver:true}, requerimientos:{ver:true}, almacen:{ver:true}, 'ordenes-compra':{ver:true}, facturas:{ver:true}, inventario:{ver:true}, reportes:{ver:true} } },
  ]
  // Limpiar roles creados por error: IDs generados (no empiezan con 'rol-'), sin permisos y sin superAdmin
  if (parsed.rolesERP) {
    parsed.rolesERP = parsed.rolesERP.filter(r =>
      r.id.startsWith('rol-') ||
      r.esSuperAdmin ||
      Object.keys(r.permisos || {}).length > 0
    )
  }
  // Migrar permisos: agregar módulos nuevos (conformidades, uniformes, auditoria, req-pago) a roles existentes
  // Solo agrega si el módulo aún no tiene permisos (no sobreescribe configuraciones manuales)
  const ROL_MODULOS_NUEVOS = {
    'rol-coord-log': { conformidades:{ver:true,crear:true,editar:true}, uniformes:{ver:true,crear:true}, 'req-pago':{ver:true,crear:true,aprobar:true}, auditoria:{ver:true} },
    'rol-coord-gen': { conformidades:{ver:true}, 'req-pago':{ver:true,aprobar:true} },
    'rol-jefe-area': { conformidades:{ver:true}, 'req-pago':{ver:true,crear:true} },
    'rol-colab':     { conformidades:{ver:true}, 'req-pago':{ver:true,crear:true} },
    'rol-auditor':   { conformidades:{ver:true}, 'req-pago':{ver:true}, auditoria:{ver:true} },
  }
  if (parsed.rolesERP) {
    parsed.rolesERP = parsed.rolesERP.map(r => {
      const mig = ROL_MODULOS_NUEVOS[r.id]
      if (!mig || r.esSuperAdmin) return r
      const permisos = { ...r.permisos }
      for (const [mod, perms] of Object.entries(mig)) {
        if (!permisos[mod]) permisos[mod] = perms  // solo agrega si no existe
      }
      return { ...r, permisos }
    })
  }
  // Flujos de aprobación configurables
  if (!parsed.flujos) parsed.flujos = {
    requerimientos: [
      { id: 'fq1', tipo: 'dinamico', label: 'Jefe directo del solicitante',           esDespacho: false },
      { id: 'fq2', tipo: 'fijo',     rolId: 'rol-coord-log', label: 'Coordinador Logística (Despacho)', esDespacho: true  },
    ],
    ordenesCompra: [
      { id: 'foc1', tipo: 'fijo', rolId: 'rol-gerencia', label: 'Gerencia General', esDespacho: false },
    ],
  }

  if (!parsed.configPermisos) parsed.configPermisos = {}
  const permisosDefecto = {
    'Coordinador Logística y Compras': { modulos: ['dashboard','requerimientos','cotizaciones','ordenes-compra','facturas','conformidades','almacen','uniformes','maquinas','epps','req-pago','cuentas-por-pagar','evaluacion-proveedores'], acciones: ['crear','editar','anular','aprobar','ver_precios','exportar'] },
    'Administrador de Empresa':        { modulos: ['dashboard','ordenes-compra','req-pago','auditoria'], acciones: ['aprobar','ver_precios','exportar'] },
    'Jefe RRHH':                       { modulos: ['dashboard','requerimientos'], acciones: ['crear','aprobar','exportar'] },
    'Asistente RRHH':                  { modulos: ['dashboard','requerimientos'], acciones: ['crear','exportar'] },
    'Jefe SSOMA':                      { modulos: ['dashboard','requerimientos','epps','evaluacion-proveedores'], acciones: ['crear','aprobar','exportar'] },
    'Asistente SSOMA':                 { modulos: ['dashboard','requerimientos','epps'], acciones: ['crear','exportar'] },
    'Asistente Logística':             { modulos: ['dashboard','uniformes','epps'], acciones: ['crear','editar','exportar'] },
    'Facturación':                     { modulos: ['dashboard','req-pago','cuentas-por-pagar'], acciones: ['crear','editar','exportar'] },
    'Auditor':                         { modulos: ['dashboard','requerimientos','cotizaciones','ordenes-compra','facturas','conformidades','almacen','uniformes','maquinas','epps','req-pago','cuentas-por-pagar','evaluacion-proveedores','auditoria'], acciones: ['ver','exportar'] },
  }
  ROLES_NUEVOS.forEach(rol => {
    if (!parsed.configPermisos[rol]) parsed.configPermisos[rol] = permisosDefecto[rol]
  })
  // Actualizar permisos de roles existentes con módulos nuevos si faltan
  if (parsed.configPermisos['Administrador'] && !parsed.configPermisos['Administrador'].modulos.includes('uniformes')) {
    parsed.configPermisos['Administrador'].modulos.push('uniformes','cuentas-por-pagar','evaluacion-proveedores')
  }
  // Migrar productos kit a IDs estables si aún tienen IDs random
  const kitStable = [
    { id:'kit-camisa-s', codigo:'5001', nombre:'CAMISA S',     categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Camisa',   talla:'S'   },
    { id:'kit-camisa-m', codigo:'5002', nombre:'CAMISA M',     categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Camisa',   talla:'M'   },
    { id:'kit-camisa-l', codigo:'5003', nombre:'CAMISA L',     categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Camisa',   talla:'L'   },
    { id:'kit-camisa-xl',codigo:'5004', nombre:'CAMISA XL',    categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Camisa',   talla:'XL'  },
    { id:'kit-blusa-s',  codigo:'5005', nombre:'BLUSA S',      categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Blusa',    talla:'S'   },
    { id:'kit-blusa-m',  codigo:'5006', nombre:'BLUSA M',      categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Blusa',    talla:'M'   },
    { id:'kit-blusa-l',  codigo:'5007', nombre:'BLUSA L',      categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Blusa',    talla:'L'   },
    { id:'kit-blusa-xl', codigo:'5008', nombre:'BLUSA XL',     categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Blusa',    talla:'XL'  },
    { id:'kit-pant-30',  codigo:'5009', nombre:'PANTALON 30',  categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Pantalon', talla:'30'  },
    { id:'kit-pant-32',  codigo:'5010', nombre:'PANTALON 32',  categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Pantalon', talla:'32'  },
    { id:'kit-pant-34',  codigo:'5011', nombre:'PANTALON 34',  categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Pantalon', talla:'34'  },
    { id:'kit-pant-36',  codigo:'5012', nombre:'PANTALON 36',  categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Pantalon', talla:'36'  },
    { id:'kit-pant-38',  codigo:'5014', nombre:'PANTALON 38',  categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Pantalon', talla:'38'  },
    { id:'kit-pant-40',  codigo:'5015', nombre:'PANTALON 40',  categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Pantalon', talla:'40'  },
    { id:'kit-pant-42',  codigo:'5016', nombre:'PANTALON 42',  categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Pantalon', talla:'42'  },
    { id:'kit-bota-36',  codigo:'5017', nombre:'BOTA 36',      categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Bota',     talla:'36'  },
    { id:'kit-bota-37',  codigo:'5018', nombre:'BOTA 37',      categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Bota',     talla:'37'  },
    { id:'kit-bota-38',  codigo:'5019', nombre:'BOTA 38',      categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Bota',     talla:'38'  },
    { id:'kit-bota-39',  codigo:'5020', nombre:'BOTA 39',      categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Bota',     talla:'39'  },
    { id:'kit-bota-40',  codigo:'5021', nombre:'BOTA 40',      categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Bota',     talla:'40'  },
    { id:'kit-bota-41',  codigo:'5022', nombre:'BOTA 41',      categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Bota',     talla:'41'  },
    { id:'kit-bota-42',  codigo:'5023', nombre:'BOTA 42',      categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Bota',     talla:'42'  },
    { id:'kit-bota-43',  codigo:'5025', nombre:'BOTA 43',      categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Bota',     talla:'43'  },
    { id:'kit-polo-s',   codigo:'5026', nombre:'POLO OPE S',   categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Polo',     talla:'S'   },
    { id:'kit-polo-m',   codigo:'5027', nombre:'POLO OPE M',   categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Polo',     talla:'M'   },
    { id:'kit-polo-l',   codigo:'5028', nombre:'POLO OPE L',   categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Polo',     talla:'L'   },
    { id:'kit-polo-xl',  codigo:'5029', nombre:'POLO OPE XL',  categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Polo',     talla:'XL'  },
    { id:'kit-polo-xxl', codigo:'5030', nombre:'POLO OPE XXL', categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Polo',     talla:'XXL' },
    { id:'kit-buzo-s',   codigo:'5031', nombre:'BUZO OPE S',   categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Buzo',     talla:'S'   },
    { id:'kit-buzo-m',   codigo:'5032', nombre:'BUZO OPE M',   categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Buzo',     talla:'M'   },
    { id:'kit-buzo-l',   codigo:'5033', nombre:'BUZO OPE L',   categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Buzo',     talla:'L'   },
    { id:'kit-buzo-xl',  codigo:'5034', nombre:'BUZO OPE XL',  categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Buzo',     talla:'XL'  },
    { id:'kit-buzo-xxl', codigo:'5035', nombre:'BUZO OPE XXL', categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Buzo',     talla:'XXL' },
    { id:'kit-gorra',    codigo:'5036', nombre:'GORRA',         categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Gorra',    talla:'UNI' },
    { id:'kit-lente',    codigo:'5037', nombre:'LENTES SEG.',   categoria:'UNIFORME', unidad:'UND', ultimoPrecio:0, stockMinimo:0, esKit:true, praneda:'Lente',    talla:'UNI' },
  ]
  const stableIds = new Set(kitStable.map(k => k.id))
  const hasUnstableKit = (parsed.productos||[]).some(p => p.esKit && !stableIds.has(p.id))
  if (hasUnstableKit) {
    parsed.productos = (parsed.productos||[]).filter(p => !p.esKit)
    parsed.productos.push(...kitStable)
    parsed.uniformeStock = {
      'kit-camisa-s':{ nuevo:10, usado:4, desechado:1 }, 'kit-camisa-m':{ nuevo:18, usado:6, desechado:2 },
      'kit-camisa-l':{ nuevo:14, usado:5, desechado:3 }, 'kit-camisa-xl':{ nuevo:8, usado:3, desechado:1 },
      'kit-blusa-s': { nuevo:12, usado:5, desechado:2 }, 'kit-blusa-m': { nuevo:16, usado:7, desechado:1 },
      'kit-blusa-l': { nuevo:9,  usado:4, desechado:2 }, 'kit-blusa-xl':{ nuevo:5,  usado:2, desechado:0 },
      'kit-pant-30': { nuevo:4,  usado:2, desechado:1 }, 'kit-pant-32': { nuevo:7,  usado:3, desechado:2 },
      'kit-pant-34': { nuevo:9,  usado:4, desechado:1 }, 'kit-pant-36': { nuevo:11, usado:5, desechado:2 },
      'kit-pant-38': { nuevo:8,  usado:3, desechado:1 }, 'kit-pant-40': { nuevo:6,  usado:2, desechado:0 },
      'kit-pant-42': { nuevo:4,  usado:1, desechado:1 }, 'kit-bota-36': { nuevo:5,  usado:2, desechado:1 },
      'kit-bota-37': { nuevo:7,  usado:3, desechado:0 }, 'kit-bota-38': { nuevo:9,  usado:4, desechado:2 },
      'kit-bota-39': { nuevo:11, usado:5, desechado:1 }, 'kit-bota-40': { nuevo:8,  usado:6, desechado:3 },
      'kit-bota-41': { nuevo:6,  usado:4, desechado:2 }, 'kit-bota-42': { nuevo:5,  usado:3, desechado:1 },
      'kit-bota-43': { nuevo:3,  usado:1, desechado:0 }, 'kit-polo-s':  { nuevo:10, usado:6, desechado:3 },
      'kit-polo-m':  { nuevo:18, usado:8, desechado:4 }, 'kit-polo-l':  { nuevo:14, usado:7, desechado:3 },
      'kit-polo-xl': { nuevo:8,  usado:4, desechado:2 }, 'kit-polo-xxl':{ nuevo:4,  usado:1, desechado:0 },
      'kit-buzo-s':  { nuevo:7,  usado:3, desechado:1 }, 'kit-buzo-m':  { nuevo:12, usado:5, desechado:2 },
      'kit-buzo-l':  { nuevo:10, usado:4, desechado:1 }, 'kit-buzo-xl': { nuevo:5,  usado:2, desechado:0 },
      'kit-buzo-xxl':{ nuevo:3,  usado:1, desechado:0 }, 'kit-gorra':   { nuevo:28, usado:12,desechado:5 },
      'kit-lente':   { nuevo:35, usado:0, desechado:8 },
    }
  }
  // Siempre forzar permisos correctos para Facturación
  parsed.configPermisos['Facturación'] = { modulos: ['dashboard','req-pago','cuentas-por-pagar'], acciones: ['crear','editar','exportar'] }
  // Forzar módulos correctos para Contador (sin conformidades ni facturas)
  if (parsed.configPermisos['Contador']) {
    parsed.configPermisos['Contador'].modulos = ['dashboard','facturas','req-pago','cuentas-por-pagar']
    const cAcc = parsed.configPermisos['Contador'].acciones || []
    if (!cAcc.includes('aprobar')) cAcc.push('aprobar')
    parsed.configPermisos['Contador'].acciones = cAcc
  }
  // Coordinador General: solo ve Dashboard y Requerimientos (siempre)
  parsed.configPermisos['Coordinador General'] = {
    modulos: ['dashboard', 'requerimientos'],
    acciones: ['ver', 'aprobar', 'rechazar']
  }

  // Demo: inyectar historial de precios en el primer producto si aún no tiene
  if (parsed.productos && parsed.productos.length > 0) {
    parsed.productos = parsed.productos.map((p, idx) => {
      if (idx === 0 && (!p.historialPrecios || p.historialPrecios.length === 0)) {
        return {
          ...p,
          ultimoPrecio: 52.00,
          historialPrecios: [
            { id: 'demo1', fecha: '2026-04-15', precio: 45.00, precioAnterior: 0,     proveedor: 'Proveedor Demo',     factura: 'F001-0023' },
            { id: 'demo2', fecha: '2026-05-10', precio: 38.50, precioAnterior: 45.00, proveedor: 'Distribuidora ABC', factura: 'F001-0045' },
            { id: 'demo3', fecha: '2026-06-20', precio: 52.00, precioAnterior: 38.50, proveedor: 'Proveedor Demo',     factura: 'F001-0071' },
          ]
        }
      }
      return p
    })
  }

  // Migrar estados del REQ al nuevo flujo
  const stateMap = {
    'Pendiente Aprobación Jefe': 'Pendiente de Aprobación',
    'Pendiente Aprobación RRHH': 'Pendiente de Aprobación',
    'Pendiente': 'Aprobado - En Almacén',
    'En Compra': 'En Orden de Compra',
    'Atendido': 'Completado',
    'Atendido Parcial': 'Despachado Parcialmente',
  }
  if (parsed.requerimientos) {
    parsed.requerimientos = parsed.requerimientos.map(r =>
      stateMap[r.estado] ? { ...r, estado: stateMap[r.estado] } : r
    )
  }

  // Inyectar usuarios de prueba si no existen por id
  const USUARIOS_PRUEBA = [
    { id: 'u1',  nombre: 'Administrador ERP',               email: 'admin@givamic.pe',          password: 'admin123',     rol: 'Administrador',                   rolERPId: 'rol-admin',     jefeDirectoId: null,  cargo: 'Administrador del Sistema',          area: 'Administración',   activo: true },
    { id: 'u2',  nombre: 'Oscar Mendoza',                   email: 'logistica@givamic.pe',      password: 'logistica123', rol: 'Coordinador Logística y Compras', rolERPId: 'rol-coord-log', jefeDirectoId: 'u1',  cargo: 'Coordinador de Logística y Compras', area: 'Logística',        activo: true },
    { id: 'u3',  nombre: 'Administradora de Empresa',       email: 'administradora@givamic.pe', password: 'empresa123',   rol: 'Administrador de Empresa',        rolERPId: 'rol-gerencia',  jefeDirectoId: 'u1',  cargo: 'Administradora de Empresa',          area: 'Administración',   activo: true },
    { id: 'u4',  nombre: 'Contador',                        email: 'contador@givamic.pe',       password: 'conta123',     rol: 'Contador',                        rolERPId: 'rol-colab',     jefeDirectoId: 'u3',  cargo: 'Contador General',                   area: 'Administración',   activo: true },
    { id: 'u5',  nombre: 'María García',                    email: 'coord.general@givamic.pe',  password: 'coordgen123',  rol: 'Coordinador General',             rolERPId: 'rol-coord-gen', jefeDirectoId: 'u1',  cargo: 'Coordinador General',                area: 'Operaciones',      activo: true },
    { id: 'u6',  nombre: 'Juan Pérez',                      email: 'coord.ops@givamic.pe',      password: 'coordops123',  rol: 'Coordinador Operaciones',         rolERPId: 'rol-jefe-area', jefeDirectoId: 'u1',  cargo: 'Coordinador de Operaciones',         area: 'Operaciones',      activo: true },
    { id: 'u7',  nombre: 'Jefe RRHH',                       email: 'jefe.rrhh@givamic.pe',      password: 'jrrhh123',     rol: 'Jefe RRHH',                       rolERPId: 'rol-jefe-area', jefeDirectoId: 'u1',  cargo: 'Jefe de Recursos Humanos',           area: 'Recursos Humanos', activo: true },
    { id: 'u8',  nombre: 'Ana López',                       email: 'asist.rrhh@givamic.pe',     password: 'arrhh123',     rol: 'Asistente RRHH',                  rolERPId: 'rol-colab',     jefeDirectoId: 'u7',  cargo: 'Asistente RRHH',                     area: 'Recursos Humanos', activo: true },
    { id: 'u9',  nombre: 'Asistente Logística',             email: 'asist.log@givamic.pe',      password: 'alog123',      rol: 'Asistente Logística',             rolERPId: 'rol-colab',     jefeDirectoId: 'u2',  cargo: 'Asistente de Logística',             area: 'Logística',        activo: true },
    { id: 'u10', nombre: 'Asistente de Facturación',        email: 'facturacion@givamic.pe',    password: 'factura123',   rol: 'Facturación',                     rolERPId: 'rol-colab',     jefeDirectoId: 'u1',  cargo: 'Asistente de Facturación',           area: 'Facturación',      activo: true },
    { id: 'u11', nombre: 'Auditor ISO',                     email: 'auditor@givamic.pe',        password: 'auditor123',   rol: 'Auditor',                         rolERPId: 'rol-auditor',   jefeDirectoId: 'u1',  cargo: 'Auditor ISO',                        area: 'SOMA y SIG',       activo: true },
    { id: 'u12', nombre: 'Carlos Ruiz',                     email: 'soma@givamic.pe',           password: 'soma123',      rol: 'Coordinador Operaciones',         rolERPId: 'rol-colab',     jefeDirectoId: 'u6',  cargo: 'Asistente SOMA',                     area: 'SOMA y SIG',       activo: true },
    { id: 'u13', nombre: 'Patricia Luna',                   email: 'pluna@givamic.pe',          password: 'pluna123',     rol: 'Coordinador Logística y Compras', rolERPId: 'rol-coord-log', jefeDirectoId: 'u2',  cargo: 'Coordinadora de Logística',          area: 'Logística',        activo: true },
    { id: 'u14', nombre: 'Roberto Torres',                  email: 'gerencia@givamic.pe',       password: 'gerencia123',  rol: 'Gerencia',                        rolERPId: 'rol-gerencia',  jefeDirectoId: null,  cargo: 'Gerente General',                    area: 'Gerencia',         activo: true },
  ]
  if (!parsed.usuarios) parsed.usuarios = []
  // Upsert: agrega seed users que no existen; también rellena cargo/area vacíos de seeds existentes
  const seedMap = Object.fromEntries(USUARIOS_PRUEBA.map(u => [u.id, u]))
  const existingIds = new Set(parsed.usuarios.map(u => u.id))
  const missingSeeds = USUARIOS_PRUEBA.filter(u => !existingIds.has(u.id))
  if (missingSeeds.length > 0) parsed.usuarios = [...missingSeeds, ...parsed.usuarios]
  // Rellenar cargo/area/nombre vacíos desde seed data (sin sobreescribir valores editados)
  parsed.usuarios = parsed.usuarios.map(u => {
    const seed = seedMap[u.id]
    if (!seed) return u
    return {
      ...u,
      cargo:  u.cargo  || seed.cargo  || u.cargo,
      area:   u.area   || seed.area   || u.area,
      nombre: u.nombre || seed.nombre || u.nombre,
    }
  })

  return parsed
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      // Migración segura: agrega campos sin borrar datos reales
      patchMissing(parsed)
      // Guardar resultado patcheado de vuelta (para que usuarios por defecto queden actualizados)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
      localStorage.setItem('givamic_data_version', DATA_VERSION)
      return parsed
    }
  } catch {}
  // Primera vez o localStorage vacío → cargar datos demo
  localStorage.setItem('givamic_data_version', DATA_VERSION)
  return buildSeedData()
}

function reducer(state, action) {
  let next
  switch (action.type) {
    // ── Notificaciones ────────────────────────────────────────────────────
    case 'ADD_NOTIF':
      next = { ...state, notificaciones: [action.payload, ...(state.notificaciones || [])].slice(0, 200) }; break
    case 'MARK_READ':
      next = { ...state, notificaciones: (state.notificaciones || []).map(n => n.id === action.id ? { ...n, leido: true } : n) }; break
    case 'MARK_ALL_READ':
      next = { ...state, notificaciones: (state.notificaciones || []).map(n => action.roles?.includes(n.paraRoles?.find(r => action.roles.includes(r))) ? { ...n, leido: true } : { ...n, leido: true }) }; break
    case 'DELETE_NOTIF':
      next = { ...state, notificaciones: (state.notificaciones || []).filter(n => n.id !== action.id) }; break
    case 'CLEAR_NOTIFS':
      next = { ...state, notificaciones: (state.notificaciones || []).filter(n => !action.paraRol || !n.paraRoles?.includes(action.paraRol)) }; break

    // ── Maestros ──────────────────────────────────────────────────────────
    case 'ADD_SEDE':
      next = { ...state, sedes: [...state.sedes, { id: genId(), ...action.payload }] }; break
    case 'UPDATE_SEDE':
      next = { ...state, sedes: state.sedes.map(s => s.id === action.id ? { ...s, ...action.payload } : s) }; break
    case 'DELETE_SEDE':
      next = { ...state, sedes: state.sedes.filter(s => s.id !== action.id) }; break

    case 'ADD_PRODUCTO':
      next = { ...state, productos: [...state.productos, { id: genId(), fechaAlta: todayISO(), ...action.payload }] }; break
    case 'UPDATE_PRODUCTO':
      next = { ...state, productos: state.productos.map(p => p.id === action.id ? { ...p, ...action.payload } : p) }; break
    case 'DELETE_PRODUCTO':
      next = { ...state, productos: state.productos.filter(p => p.id !== action.id) }; break

    case 'ADD_PROVEEDOR':
      next = { ...state, proveedores: [...state.proveedores, { id: genId(), ...action.payload }] }; break
    case 'UPDATE_PROVEEDOR':
      next = { ...state, proveedores: state.proveedores.map(p => p.id === action.id ? { ...p, ...action.payload } : p) }; break
    case 'DELETE_PROVEEDOR':
      next = { ...state, proveedores: state.proveedores.filter(p => p.id !== action.id) }; break

    case 'ADD_FACTURA': {
      const f = { id: genId(), ...action.payload }
      let productos = [...state.productos]
      let inventario = JSON.parse(JSON.stringify(state.inventario))
      const movs = []
      if (f.estado === 'Recibida') {
        f.items.forEach(it => {
          productos = productos.map(p => {
            if (p.id !== it.productoId) return p
            const histAnt = p.historialPrecios || []
            const prevPrecio = p.ultimoPrecio || 0
            const entrada = { id: genId(), fecha: f.fecha, precio: it.precioUnit, precioAnterior: prevPrecio, proveedor: f.proveedor || '', factura: f.numero }
            let alertaPrecio = p.alertaPrecio || null
            if (prevPrecio > 0 && it.precioUnit > prevPrecio * 1.10) {
              const precios = histAnt.map(h => h.precio).filter(v => v > 0)
              const ref = precios.length >= 2 ? precios.reduce((a,b)=>a+b,0)/precios.length : prevPrecio
              if (it.precioUnit > ref * 1.10) {
                const pct = (((it.precioUnit - ref) / ref) * 100).toFixed(1)
                alertaPrecio = { activa: true, pct, precioAnterior: ref, precioNuevo: it.precioUnit, proveedor: f.proveedor || '', factura: f.numero, fecha: f.fecha }
              }
            }
            return { ...p, ultimoPrecio: it.precioUnit, historialPrecios: [...histAnt, entrada], alertaPrecio }
          })
          const sid = 's1'
          if (!inventario[sid]) inventario[sid] = {}
          if (!inventario[sid][it.productoId]) inventario[sid][it.productoId] = { cantidad: 0, precio: it.precioUnit }
          inventario[sid][it.productoId].cantidad += it.cantidad
          inventario[sid][it.productoId].precio = it.precioUnit
          inventario[sid][it.productoId].nombre = it.producto
          movs.push({ id: genId(), tipo: 'INGRESO', fecha: f.fecha, sedeId: sid, productoId: it.productoId, producto: it.producto, cantidad: it.cantidad, referencia: f.numero, observaciones: 'Factura ' + f.numero })
        })
      }
      let ocLinkAdd = state.ordenesCompra || []
      if (f.ocId) ocLinkAdd = ocLinkAdd.map(o => o.id === f.ocId ? { ...o, facturaId: f.id, estado: 'Facturada' } : o)
      next = { ...state, facturas: [...state.facturas, f], productos, inventario, movimientos: [...movs, ...state.movimientos], ordenesCompra: ocLinkAdd }; break
    }
    case 'UPDATE_FACTURA_ESTADO': {
      const f = state.facturas.find(x => x.id === action.id)
      let productos = [...state.productos]
      let inventario = JSON.parse(JSON.stringify(state.inventario))
      const movs = []
      if (action.estado === 'Recibida' && f && f.estado !== 'Recibida') {
        f.items.forEach(it => {
          productos = productos.map(p => {
            if (p.id !== it.productoId) return p
            const histAnt2 = p.historialPrecios || []
            const prevPrecio2 = p.ultimoPrecio || 0
            const entrada = { id: genId(), fecha: f.fecha, precio: it.precioUnit, precioAnterior: prevPrecio2, proveedor: f.proveedor || '', factura: f.numero }
            let alertaPrecio2 = p.alertaPrecio || null
            if (prevPrecio2 > 0 && it.precioUnit > prevPrecio2 * 1.10) {
              const precios2 = histAnt2.map(h => h.precio).filter(v => v > 0)
              const ref2 = precios2.length >= 2 ? precios2.reduce((a,b)=>a+b,0)/precios2.length : prevPrecio2
              if (it.precioUnit > ref2 * 1.10) {
                const pct2 = (((it.precioUnit - ref2) / ref2) * 100).toFixed(1)
                alertaPrecio2 = { activa: true, pct: pct2, precioAnterior: ref2, precioNuevo: it.precioUnit, proveedor: f.proveedor || '', factura: f.numero, fecha: f.fecha }
              }
            }
            return { ...p, ultimoPrecio: it.precioUnit, historialPrecios: [...histAnt2, entrada], alertaPrecio: alertaPrecio2 }
          })
          const sid = 's1'
          if (!inventario[sid]) inventario[sid] = {}
          if (!inventario[sid][it.productoId]) inventario[sid][it.productoId] = { cantidad: 0, precio: it.precioUnit }
          inventario[sid][it.productoId].cantidad += it.cantidad
          inventario[sid][it.productoId].precio = it.precioUnit
          inventario[sid][it.productoId].nombre = it.producto
          movs.push({ id: genId(), tipo: 'INGRESO', fecha: f.fecha, sedeId: sid, productoId: it.productoId, producto: it.producto, cantidad: it.cantidad, referencia: f.numero, observaciones: 'Factura ' + f.numero })
        })
      }
      let ocLinkUpd = state.ordenesCompra || []
      if (f?.ocId && action.estado === 'Recibida') {
        ocLinkUpd = ocLinkUpd.map(o => o.id === f.ocId ? { ...o, estado: 'Pendiente Inspeccion' } : o)
      }
      next = { ...state, facturas: state.facturas.map(x => x.id === action.id ? { ...x, estado: action.estado } : x), productos, inventario, movimientos: [...movs, ...state.movimientos], ordenesCompra: ocLinkUpd }; break
    }

    case 'REGISTRAR_PAGO_FACTURA': {
      next = { ...state, facturas: state.facturas.map(f => {
        if (f.id !== action.id) return f
        const pagosAnt = f.pagos || []
        const nuevoPago = { id: genId(), fecha: action.fecha, monto: action.monto, metodo: action.metodo, referencia: action.referencia || '', observaciones: action.observaciones || '' }
        const todosPagos = [...pagosAnt, nuevoPago]
        const totalPagado = todosPagos.reduce((s, p) => s + (p.monto || 0), 0)
        const totalFactura = f.totalGeneral || f.total || 0
        const estadoPago = totalPagado >= totalFactura ? 'Pagado' : totalPagado > 0 ? 'Parcial' : 'Pendiente'
        return { ...f, pagos: todosPagos, montoPagado: totalPagado, estadoPago }
      }) }; break
    }

    case 'ADD_TRANSFERENCIA': {
      const nuevoNum = state.ultimoVale + 1
      const numeroVale = 'VS-' + String(nuevoNum).padStart(4,'0')
      const t = { id: genId(), numeroVale, ...action.payload }
      let inventario = JSON.parse(JSON.stringify(state.inventario))
      const movs = []
      t.items.forEach(it => {
        if (inventario['s1']?.[it.productoId]) inventario['s1'][it.productoId].cantidad -= it.cantidad
        if (!inventario[t.sedeDestinoId]) inventario[t.sedeDestinoId] = {}
        if (!inventario[t.sedeDestinoId][it.productoId]) inventario[t.sedeDestinoId][it.productoId] = { cantidad: 0, precio: it.precioUnit }
        inventario[t.sedeDestinoId][it.productoId].cantidad += it.cantidad
        inventario[t.sedeDestinoId][it.productoId].precio = it.precioUnit
        inventario[t.sedeDestinoId][it.productoId].nombre = it.descripcion
        if (inventario['s1']?.[it.productoId]) inventario['s1'][it.productoId].nombre = it.descripcion
        movs.push({ id: genId(), tipo: 'TRANSFERENCIA', fecha: t.fecha, sedeId: 's1', sedeDestinoId: t.sedeDestinoId, productoId: it.productoId, producto: it.descripcion, cantidad: -it.cantidad, referencia: numeroVale, observaciones: 'Vale ' + numeroVale })
      })
      next = { ...state, transferencias: [t, ...state.transferencias], ultimoVale: nuevoNum, inventario, movimientos: [...movs, ...state.movimientos] }
      next._lastVale = t
      break
    }

    case 'ADD_MOVIMIENTO': {
      const m = { id: genId(), ...action.payload }
      let inventario = JSON.parse(JSON.stringify(state.inventario))
      const sid = m.sedeId || 's1'
      if (!inventario[sid]) inventario[sid] = {}
      if (!inventario[sid][m.productoId]) inventario[sid][m.productoId] = { cantidad: 0, precio: 0 }
      inventario[sid][m.productoId].cantidad += m.cantidad
      next = { ...state, movimientos: [m, ...state.movimientos], inventario }; break
    }

    case 'ADD_MAQUINA':
      next = { ...state, maquinas: [...state.maquinas, { id: genId(), ...action.payload }] }; break
    case 'UPDATE_MAQUINA':
      next = { ...state, maquinas: state.maquinas.map(m => m.id === action.id ? { ...m, ...action.payload } : m) }; break
    case 'DELETE_MAQUINA':
      next = { ...state, maquinas: state.maquinas.filter(m => m.id !== action.id) }; break

    case 'ADD_OC': {
      const n = (state.ultimoOC || 0) + 1
      const numero = 'OC-' + String(n).padStart(4,'0')
      const newOC = { id: genId(), numero, ...action.payload }
      let reqsUpd = state.requerimientos || []
      if (action.payload.reqOrigenId) {
        reqsUpd = reqsUpd.map(r => r.id === action.payload.reqOrigenId
          ? { ...r, estado: 'En Compra', ocVinculadaId: newOC.id, ocVinculadaNumero: numero }
          : r)
      }
      next = { ...state, ordenesCompra: [...(state.ordenesCompra||[]), newOC], ultimoOC: n, requerimientos: reqsUpd }; break
    }
    case 'UPDATE_OC':
      next = { ...state, ordenesCompra: (state.ordenesCompra||[]).map(o => o.id === action.id ? { ...o, ...action.payload } : o) }; break
    case 'DELETE_OC':
      next = { ...state, ordenesCompra: (state.ordenesCompra||[]).filter(o => o.id !== action.id) }; break

    case 'ADD_CONFORMIDAD': {
      const n = (state.ultimoConformidad || 0) + 1
      const numero = 'CONF-' + String(n).padStart(4,'0')
      const conf = { id: genId(), numero, ...action.payload }
      let ocId = conf.ocId
      if (!ocId && conf.facturaId) {
        const fv = state.facturas.find(f => f.id === conf.facturaId)
        if (fv?.ocId) ocId = fv.ocId
      }
      const ocUpd = (state.ordenesCompra||[]).map(o =>
        o.id === ocId ? { ...o, conformidadId: conf.id, estado: 'Completada' } : o
      )
      next = { ...state, conformidades: [...(state.conformidades||[]), conf], ordenesCompra: ocUpd, ultimoConformidad: n }; break
    }
    case 'UPDATE_CONFORMIDAD':
      next = { ...state, conformidades: (state.conformidades||[]).map(c => c.id === action.id ? { ...c, ...action.payload } : c) }; break
    case 'DELETE_CONFORMIDAD':
      next = { ...state, conformidades: (state.conformidades||[]).filter(c => c.id !== action.id) }; break

    case 'ADD_RQ': {
      const nuevoNum = (state.ultimoRQ || 0) + 1
      const numero = 'RQ-' + String(nuevoNum).padStart(4, '0')
      next = { ...state, rqs: [...(state.rqs||[]), { id: genId(), numero, ...action.payload }], ultimoRQ: nuevoNum }; break
    }
    case 'UPDATE_RQ':
      next = { ...state, rqs: (state.rqs||[]).map(r => r.id === action.id ? { ...r, ...action.payload } : r) }; break
    case 'DELETE_RQ':
      next = { ...state, rqs: (state.rqs||[]).filter(r => r.id !== action.id) }; break

    // ADD_UNIFORME_INGRESO removed - kit stock now auto-updated via ADD_INGRESO_ALMACEN
    case 'ADD_UNIFORME_ENTREGA': {
      const uStockEnt = JSON.parse(JSON.stringify(state.uniformeStock || {}))
      ;(action.payload.items || []).forEach(it => {
        const pid = it.productoId; const cant = Number(it.cantidad)
        if (!uStockEnt[pid]) uStockEnt[pid] = { nuevo:0, usado:0, desechado:0 }
        if (it.condicion === 'Nuevo') uStockEnt[pid].nuevo = Math.max(0, (uStockEnt[pid].nuevo||0) - cant)
        else uStockEnt[pid].usado = Math.max(0, (uStockEnt[pid].usado||0) - cant)
      })
      const nEnt = (state.ultimoUnifEnt || 0) + 1
      const ent = { id: genId(), numero: 'ENT-' + String(nEnt).padStart(4,'0'), ...action.payload }
      next = { ...state, uniformeEntregas: [ent, ...(state.uniformeEntregas||[])], ultimoUnifEnt: nEnt, uniformeStock: uStockEnt }; break
    }
    case 'DELETE_UNIFORME_ENTREGA': {
      const entDel = (state.uniformeEntregas||[]).find(e => e.id === action.id)
      const uStockDelEnt = JSON.parse(JSON.stringify(state.uniformeStock || {}))
      ;(entDel?.items || []).forEach(it => {
        const pid = it.productoId; const cant = Number(it.cantidad)
        if (!uStockDelEnt[pid]) uStockDelEnt[pid] = { nuevo:0, usado:0, desechado:0 }
        if (it.condicion === 'Nuevo') uStockDelEnt[pid].nuevo = (uStockDelEnt[pid].nuevo||0) + cant
        else uStockDelEnt[pid].usado = (uStockDelEnt[pid].usado||0) + cant
      })
      next = { ...state, uniformeEntregas: (state.uniformeEntregas||[]).filter(e => e.id !== action.id), uniformeStock: uStockDelEnt }; break
    }
    case 'ADD_UNIFORME_DEVOLUCION': {
      const uStockDev = JSON.parse(JSON.stringify(state.uniformeStock || {}))
      ;(action.payload.items || []).forEach(it => {
        const pid = it.productoId; const cant = Number(it.cantidad)
        if (!uStockDev[pid]) uStockDev[pid] = { nuevo:0, usado:0, desechado:0 }
        if (it.estadoDevuelta === 'Apto') uStockDev[pid].usado = (uStockDev[pid].usado||0) + cant
        else uStockDev[pid].desechado = (uStockDev[pid].desechado||0) + cant
      })
      let entregasDev = state.uniformeEntregas || []
      if (action.payload.entregaId) {
        entregasDev = entregasDev.map(e => e.id === action.payload.entregaId ? { ...e, estadoPrenda: 'Devuelto' } : e)
      }
      const nDev = (state.ultimoUnifDev || 0) + 1
      const dev = { id: genId(), numero: 'DEV-' + String(nDev).padStart(4,'0'), ...action.payload }
      next = { ...state, uniformeDevoluciones: [dev, ...(state.uniformeDevoluciones||[])], ultimoUnifDev: nDev, uniformeStock: uStockDev, uniformeEntregas: entregasDev }; break
    }
    case 'DELETE_UNIFORME_DEVOLUCION':
      next = { ...state, uniformeDevoluciones: (state.uniformeDevoluciones||[]).filter(d => d.id !== action.id) }; break

    case 'ADD_EPP':
      next = { ...state, epps: [...(state.epps||[]), { id: genId(), ...action.payload }] }; break
    case 'UPDATE_EPP':
      next = { ...state, epps: (state.epps||[]).map(e => e.id === action.id ? { ...e, ...action.payload } : e) }; break
    case 'DELETE_EPP':
      next = { ...state, epps: (state.epps||[]).filter(e => e.id !== action.id) }; break

    case 'ADD_INGRESO_ALMACEN': {
      const n = (state.ultimoIngreso || 0) + 1
      const numero = 'ING-' + String(n).padStart(4,'0')
      const newIng = { id: genId(), numero, ...action.payload }
      // Si es traslado desde sede → descontar inventario de la sede origen
      let invUpd = state.inventario
      if (action.payload.tipo === 'Traslado' && action.payload.sedeOrigenId) {
        const sid = action.payload.sedeOrigenId
        const sedeInv = { ...(invUpd[sid] || {}) }
        ;(action.payload.items || []).forEach(it => {
          if (sedeInv[it.productoId]) {
            sedeInv[it.productoId] = { ...sedeInv[it.productoId], cantidad: Math.max(0, (sedeInv[it.productoId].cantidad||0) - Number(it.cantidadRecibida||0)) }
          }
        })
        invUpd = { ...invUpd, [sid]: sedeInv }
      }
      // Auto-update uniformeStock.nuevo for esKit products
      const prods = state.productos || []
      let uStockIng = JSON.parse(JSON.stringify(state.uniformeStock || {}))
      ;(newIng.items || []).forEach(it => {
        const prod = prods.find(p => p.id === it.productoId)
        if (prod?.esKit) {
          const cant = Number(it.cantidadRecibida || 0)
          if (!uStockIng[it.productoId]) uStockIng[it.productoId] = { nuevo:0, usado:0, desechado:0 }
          uStockIng[it.productoId].nuevo = (uStockIng[it.productoId].nuevo || 0) + cant
        }
      })
      next = { ...state, ingresosAlmacen: [...(state.ingresosAlmacen||[]), newIng], ultimoIngreso: n, inventario: invUpd, uniformeStock: uStockIng }; break
    }
    case 'DELETE_INGRESO_ALMACEN':
      next = { ...state, ingresosAlmacen: (state.ingresosAlmacen||[]).filter(i => i.id !== action.id) }; break

    case 'ADD_TRASLADO_SEDES': {
      const nT = (state.ultimoTrasladoSedes || 0) + 1
      const numeroT = 'TS-' + String(nT).padStart(4,'0')
      const traslado = { id: genId(), numero: numeroT, ...action.payload }
      let invTS = JSON.parse(JSON.stringify(state.inventario))
      const { sedeOrigenId, sedeDestinoId } = action.payload
      ;(action.payload.items || []).forEach(it => {
        const cant = Number(it.cantidad)
        // descontar de origen
        if (invTS[sedeOrigenId]?.[it.productoId]) {
          invTS[sedeOrigenId][it.productoId].cantidad = Math.max(0, (invTS[sedeOrigenId][it.productoId].cantidad||0) - cant)
        }
        // sumar en destino
        if (!invTS[sedeDestinoId]) invTS[sedeDestinoId] = {}
        if (!invTS[sedeDestinoId][it.productoId]) invTS[sedeDestinoId][it.productoId] = { cantidad: 0, precio: 0 }
        invTS[sedeDestinoId][it.productoId].cantidad += cant
      })
      next = { ...state, trasladosSedes: [traslado, ...(state.trasladosSedes||[])], ultimoTrasladoSedes: nT, inventario: invTS }; break
    }
    case 'DELETE_TRASLADO_SEDES':
      next = { ...state, trasladosSedes: (state.trasladosSedes||[]).filter(t => t.id !== action.id) }; break

    case 'ADD_SALIDA_ALMACEN': {
      const n = (state.ultimoSalida || 0) + 1
      const numero = 'SAL-' + String(n).padStart(4,'0')
      next = { ...state, salidasAlmacen: [...(state.salidasAlmacen||[]), { id: genId(), numero, ...action.payload }], ultimoSalida: n }; break
    }
    case 'DELETE_SALIDA_ALMACEN':
      next = { ...state, salidasAlmacen: (state.salidasAlmacen||[]).filter(s => s.id !== action.id) }; break

    case 'ADD_EMPRESA':
      next = { ...state, empresas: [...(state.empresas||[]), { id: genId(), ...action.payload }] }; break
    case 'UPDATE_EMPRESA':
      next = { ...state, empresas: (state.empresas||[]).map(e => e.id === action.id ? { ...e, ...action.payload } : e) }; break
    case 'DELETE_EMPRESA':
      next = { ...state, empresas: (state.empresas||[]).filter(e => e.id !== action.id) }; break

    case 'ADD_COTIZACION': {
      const n = (state.ultimoCot || 0) + 1
      const numero = 'COT-' + String(n).padStart(4,'0')
      next = { ...state, cotizaciones: [...(state.cotizaciones||[]), { id: genId(), numero, ...action.payload }], ultimoCot: n }; break
    }
    case 'UPDATE_COTIZACION':
      next = { ...state, cotizaciones: (state.cotizaciones||[]).map(c => c.id === action.id ? { ...c, ...action.payload } : c) }; break
    case 'DELETE_COTIZACION':
      next = { ...state, cotizaciones: (state.cotizaciones||[]).filter(c => c.id !== action.id) }; break

    // ── Solicitudes de Cotización (SC-XXXX) ─────────────────────────────────
    case 'ADD_SOLICITUD_COT': {
      const nSC = (state.ultimoSolicitudCot || 0) + 1
      const numeroSC = 'SC-' + String(nSC).padStart(4, '0')
      const newSC = { id: genId(), numero: numeroSC, estado: 'Pendiente', creadoEn: todayISO(), ...action.payload }
      next = { ...state, solicitudesCotizacion: [...(state.solicitudesCotizacion||[]), newSC], ultimoSolicitudCot: nSC }; break
    }
    case 'UPDATE_SOLICITUD_COT':
      next = { ...state, solicitudesCotizacion: (state.solicitudesCotizacion||[]).map(sc => sc.id === action.id ? { ...sc, ...action.payload } : sc) }; break

    // Aprueba ganador en SC única (modo unica) o comparativa con 1 proveedor ya ingresado
    case 'APROBAR_SOLICITUD_COT':
      next = { ...state, solicitudesCotizacion: (state.solicitudesCotizacion||[]).map(sc =>
        sc.id === action.id ? { ...sc, estado: 'Aprobada', aprobadoEn: todayISO(), ...action.payload } : sc
      ) }; break

    // Convierte SC (única) a OC automáticamente
    case 'SOLICITUD_COT_A_OC': {
      const sc = (state.solicitudesCotizacion||[]).find(s => s.id === action.id)
      if (!sc) { next = state; break }
      const nOC = (state.ultimoOC || 0) + 1
      const ocNum = 'OC-' + String(nOC).padStart(4, '0')
      const newOC = {
        id: genId(), numero: ocNum,
        estado: 'Pendiente', creadoEn: todayISO(),
        solcotId: sc.id, solcotNumero: sc.numero,
        proveedor: sc.proveedorNombre || '',
        proveedorId: sc.proveedorId || '',
        empresaId: sc.empresaId || '',
        moneda: sc.moneda || 'PEN',
        items: (sc.items||[]).map(it => ({
          ...it,
          precioUnit: it.precioUnitario || 0,
          total: (it.cantidad||0) * (it.precioUnitario||0)
        })),
        totalNeto: (sc.items||[]).reduce((s, it) => s + (it.cantidad||0)*(it.precioUnitario||0), 0),
        totalIGV:  (sc.items||[]).reduce((s, it) => s + (it.cantidad||0)*(it.precioUnitario||0), 0) * 0.18,
        totalGeneral: (sc.items||[]).reduce((s, it) => s + (it.cantidad||0)*(it.precioUnitario||0), 0) * 1.18,
        ...(action.payload || {})
      }
      const scUpd = (state.solicitudesCotizacion||[]).map(s =>
        s.id === action.id ? { ...s, estado: 'Convertida a OC', ocId: newOC.id, ocNumero: ocNum } : s
      )
      let reqsUpd2 = state.requerimientos || []
      if (sc.reqOrigenId) {
        reqsUpd2 = reqsUpd2.map(r => r.id === sc.reqOrigenId
          ? { ...r, estado: 'En Compra', ocVinculadaId: newOC.id, ocVinculadaNumero: ocNum }
          : r)
      }
      next = { ...state, ordenesCompra: [...(state.ordenesCompra||[]), newOC], ultimoOC: nOC, solicitudesCotizacion: scUpd, requerimientos: reqsUpd2 }; break
    }

    // Gerencia aprueba ganador en cotización comparativa (COT)
    case 'APROBAR_COT_GANADOR':
      next = { ...state, cotizaciones: (state.cotizaciones||[]).map(c =>
        c.id === action.id
          ? { ...c, estado: 'Aprobada', proveedorGanadorIdx: action.proveedorIdx, proveedorNombre: action.proveedorNombre, aprobadoEn: todayISO(), aprobadoPor: action.aprobadoPor }
          : c
      ) }; break

    // Convierte cotización comparativa aprobada a OC
    case 'COTIZACION_A_OC': {
      const cot = (state.cotizaciones||[]).find(c => c.id === action.id)
      if (!cot) { next = state; break }
      const idx = cot.proveedorGanadorIdx ?? 0
      const prov = (cot.proveedores||[])[idx] || {}
      const nOC2 = (state.ultimoOC || 0) + 1
      const ocNum2 = 'OC-' + String(nOC2).padStart(4, '0')
      const newOC2 = {
        id: genId(), numero: ocNum2,
        estado: 'Pendiente', creadoEn: todayISO(),
        cotId: cot.id, cotNumero: cot.numero,
        proveedor: prov.nombre || '',
        proveedorId: prov.id || '',
        empresaId: cot.empresaId || '',
        moneda: cot.moneda || 'PEN',
        items: (cot.items||[]).map(it => {
          const precio = (it.precios||[])[idx] || 0
          return { ...it, precioUnit: precio, total: (it.cantidad||0) * precio }
        }),
        totalNeto: (cot.items||[]).reduce((s, it) => s + (it.cantidad||0)*((it.precios||[])[idx]||0), 0),
        totalIGV:  (cot.items||[]).reduce((s, it) => s + (it.cantidad||0)*((it.precios||[])[idx]||0), 0) * 0.18,
        totalGeneral: (cot.items||[]).reduce((s, it) => s + (it.cantidad||0)*((it.precios||[])[idx]||0), 0) * 1.18,
        ...(action.payload || {})
      }
      const cotUpd = (state.cotizaciones||[]).map(c =>
        c.id === action.id ? { ...c, estado: 'Convertida a OC', ocId: newOC2.id, ocNumero: ocNum2 } : c
      )
      let reqsUpd3 = state.requerimientos || []
      if (cot.reqOrigenId) {
        reqsUpd3 = reqsUpd3.map(r => r.id === cot.reqOrigenId
          ? { ...r, estado: 'En Compra', ocVinculadaId: newOC2.id, ocVinculadaNumero: ocNum2 }
          : r)
      }
      next = { ...state, ordenesCompra: [...(state.ordenesCompra||[]), newOC2], ultimoOC: nOC2, cotizaciones: cotUpd, requerimientos: reqsUpd3 }; break
    }

    case 'ADD_SUPERVISOR':
      next = { ...state, supervisores: [...(state.supervisores||[]), { id: genId(), ...action.payload }] }; break
    case 'UPDATE_SUPERVISOR':
      next = { ...state, supervisores: (state.supervisores||[]).map(s => s.id === action.id ? { ...s, ...action.payload } : s) }; break
    case 'DELETE_SUPERVISOR':
      next = { ...state, supervisores: (state.supervisores||[]).filter(s => s.id !== action.id) }; break

    case 'SET_LOGO':
      next = { ...state, logo: action.logo }; break

    case 'ADD_AUDIT_LOG':
      next = { ...state, auditLog: [action.payload, ...(state.auditLog||[])].slice(0, 3000) }; break
    // CLEAR_AUDIT_LOG deshabilitado — log inmutable por política de auditoría

    // ── Limpiar datos operativos (conserva maestros/config) ──────────────
    case 'CLEAR_DATOS_OPERATIVOS':
      next = {
        ...state,
        // Datos operativos → vacío
        facturas: [],
        movimientos: [],
        inventario: [],
        ordenesCompra: [], ultimoOC: 0,
        conformidades: [], ultimoConformidad: 0,
        rqs: [], ultimoRQ: 0,
        requerimientos: [], ultimoReq: 0,
        uniformeEntregas: [], ultimoUnifEnt: 0,
        uniformeDevoluciones: [], ultimoUnifDev: 0,
        solicitudesMantenimiento: [],
        solicitudesCotizacion: [], ultimoSolicitudCot: 0,
        evaluacionesProveedor: [],
        epps: [],
        auditLog: [],
        notificaciones: [],
        // Datos maestros → se conservan:
        // sedes, productos, proveedores, usuarios, empresas, maquinas,
        // supervisores, logo, configAprobaciones, configPermisos, uniformeStock
      }; break

    case 'ADD_REQUERIMIENTO': {
      const existingMax = (state.requerimientos || []).reduce((max, r) => {
        const num = parseInt((r.numero || '').replace('REQ-', ''), 10)
        return isNaN(num) ? max : Math.max(max, num)
      }, 0)
      const n = Math.max(state.ultimoReq || 0, existingMax) + 1
      const numero = 'REQ-' + String(n).padStart(4, '0')
      const req = { id: genId(), numero, createdAt: todayISO(), ...action.payload }
      next = { ...state, requerimientos: [...(state.requerimientos || []), req], ultimoReq: n }; break
    }
    case 'UPDATE_REQUERIMIENTO':
      next = { ...state, requerimientos: (state.requerimientos || []).map(r => r.id === action.id ? { ...r, ...action.payload } : r) }; break
    case 'DELETE_REQUERIMIENTO':
      next = { ...state, requerimientos: (state.requerimientos || []).filter(r => r.id !== action.id) }; break
    case 'APROBAR_REQUERIMIENTO': {
      const req = (state.requerimientos || []).find(r => r.id === action.id)
      if (!req) { next = state; break }
      const itemsUpd = req.items.map(it => {
        const ap = (action.payload.itemsAprobacion || []).find(a => a.itemId === it.id)
        if (!ap) return it
        // Usar productoIdVinculado si el ítem original no tenía productoId
        const productoIdFinal = it.productoId || ap.productoIdVinculado || null
        return { ...it, productoId: productoIdFinal, estadoItem: ap.estadoItem, cantidadAprobada: ap.cantidadAprobada ?? it.cantidad, motivoRechazo: ap.motivoRechazo || '', stockDecision: ap.stockDecision || 'stock' }
      })

      let inventario = JSON.parse(JSON.stringify(state.inventario))
      let ultimoVale = state.ultimoVale
      let ultimoOC = state.ultimoOC || 0
      let transferencias = [...state.transferencias]
      let ordenesCompra = [...(state.ordenesCompra || [])]
      let valeId = null
      let ocAutoId = null
      let ocAutoNumero = null

      const aprobItems = itemsUpd.filter(it => it.estadoItem === 'Aprobado' || it.estadoItem === 'Aprobado Parcial')

      // Separar ítems con stock suficiente vs sin stock, respetando stockDecision del usuario
      const itemsConStock = []
      const itemsSinStock = []
      aprobItems.forEach(it => {
        const cantNec = it.cantidadAprobada ?? it.cantidad
        const stockDisp = it.productoId ? (inventario['s1']?.[it.productoId]?.cantidad || 0) : 0
        const decision = it.stockDecision || 'stock' // 'stock' | 'oc'

        if (!it.productoId || stockDisp >= cantNec) {
          // Sin vinculación o stock suficiente → siempre a Vale
          itemsConStock.push(it)
        } else if (stockDisp === 0) {
          // Sin stock → siempre a OC
          itemsSinStock.push({ ...it, cantidadAprobada: cantNec })
        } else {
          // Stock parcial → depende de decisión del usuario
          if (decision === 'oc') {
            // Enviar todo a OC (no usar stock)
            itemsSinStock.push({ ...it, cantidadAprobada: cantNec })
          } else {
            // Atender con lo que hay + OC por el resto (default)
            itemsConStock.push({ ...it, cantidadAprobada: stockDisp, _stockParcial: true })
            itemsSinStock.push({ ...it, cantidadAprobada: cantNec - stockDisp, _deficit: cantNec - stockDisp })
          }
        }
      })

      // Crear Vale de Salida para ítems con stock
      if (itemsConStock.length > 0) {
        ultimoVale += 1
        const numeroVale = 'VS-' + String(ultimoVale).padStart(4, '0')
        const valeItems = itemsConStock.map(it => {
          const precioUnit = inventario['s1']?.[it.productoId]?.precio || 0
          const cantidad = it.cantidadAprobada ?? it.cantidad
          return {
            id: genId(), productoId: it.productoId || null,
            descripcion: it.descripcion, cantidad,
            unidad: it.unidad || '', precioUnit,
            precioTotal: precioUnit * cantidad,
          }
        })
        const valeTotal = valeItems.reduce((s, it) => s + (it.precioTotal || 0), 0)
        valeItems.forEach(it => {
          if (it.productoId && inventario['s1']?.[it.productoId]) {
            inventario['s1'][it.productoId].cantidad = Math.max(0, (inventario['s1'][it.productoId].cantidad || 0) - it.cantidad)
          }
          const destId = req.sedeId
          if (destId && destId !== 's1' && it.productoId) {
            if (!inventario[destId]) inventario[destId] = {}
            if (!inventario[destId][it.productoId]) inventario[destId][it.productoId] = { cantidad: 0, precio: 0 }
            inventario[destId][it.productoId].cantidad += it.cantidad
          }
        })
        const vale = {
          id: genId(), numeroVale, fecha: todayISO(),
          sedeDestinoId: req.sedeId, items: valeItems, total: valeTotal,
          solicitante: req.responsable,
          observaciones: 'Generado por ' + req.numero,
          requerimientoId: req.id, requerimientoNumero: req.numero,
        }
        valeId = vale.id
        transferencias = [vale, ...transferencias]
      }

      // Crear OC automática para ítems sin stock
      if (itemsSinStock.length > 0) {
        ultimoOC += 1
        ocAutoNumero = 'OC-' + String(ultimoOC).padStart(4, '0')
        ocAutoId = genId()
        const ocItems = itemsSinStock.map(it => ({
          id: genId(), productoId: it.productoId || null,
          descripcion: it.descripcion, cantidad: it.cantidadAprobada ?? it.cantidad,
          unidad: it.unidad || '', precioUnit: 0, subtotal: 0,
        }))
        const ocAuto = {
          id: ocAutoId, numero: ocAutoNumero,
          fecha: todayISO(), estado: 'Borrador',
          proveedor: action.payload.proveedorOC || '', proveedorId: action.payload.proveedorOCId || null, area: req.areaSolicitante || '',
          solicitadoPor: req.responsable,
          reqOrigenId: req.id, reqOrigenNumero: req.numero,
          items: ocItems, totalGeneral: 0,
          observaciones: 'OC generada automáticamente — sin stock para ' + req.numero,
          _autoGenerada: true,
        }
        ordenesCompra = [ocAuto, ...ordenesCompra]
      }

      // Estado final del REQ
      const allRej = itemsUpd.every(it => it.estadoItem === 'Rechazado')
      const tieneVale = itemsConStock.length > 0
      const tieneOC = itemsSinStock.length > 0
      const estadoFinal = allRej
        ? 'Rechazado'
        : tieneOC && !tieneVale
          ? 'En Orden de Compra'
          : tieneOC && tieneVale
            ? 'Despachado Parcialmente'
            : 'Completado'

      const reqUpd = {
        ...req, items: itemsUpd, estado: estadoFinal,
        aprobadoPor: action.payload.aprobadoPor,
        aprobadoPorNombre: action.payload.aprobadoPorNombre || action.payload.aprobadoPor || '',
        aprobadoPorCargo: action.payload.aprobadoPorCargo || '',
        comentarioAprobacion: action.payload.comentario || '',
        motivoRechazo: allRej ? (action.payload.comentario || 'Rechazado por almacen') : '',
        fechaAprobacion: todayISO(), valeId,
        ocVinculadaId: ocAutoId || req.ocVinculadaId,
        ocVinculadaNumero: ocAutoNumero || req.ocVinculadaNumero,
      }
      next = { ...state, requerimientos: (state.requerimientos || []).map(r => r.id === action.id ? reqUpd : r), transferencias, ultimoVale, inventario, ordenesCompra, ultimoOC }; break
    }

    case 'ADD_REQ_PAGO': {
      const existingMax = (state.reqPagos || []).reduce((max, r) => {
        const num = parseInt((r.numero || '').split('-')[0], 10)
        return isNaN(num) ? max : Math.max(max, num)
      }, 0)
      const n = Math.max(state.ultimoReqPago || 0, existingMax) + 1
      const year = new Date().getFullYear()
      const numero = String(n).padStart(3, '0') + '-' + year
      const rp = { id: genId(), numero, createdAt: todayISO(), ...action.payload }
      next = { ...state, reqPagos: [...(state.reqPagos || []), rp], ultimoReqPago: n }; break
    }
    case 'UPDATE_REQ_PAGO':
      next = { ...state, reqPagos: (state.reqPagos || []).map(r => r.id === action.id ? { ...r, ...action.payload } : r) }; break
    case 'DELETE_REQ_PAGO':
      next = { ...state, reqPagos: (state.reqPagos || []).filter(r => r.id !== action.id) }; break

    case 'UPDATE_PERMISOS':
      next = { ...state, configPermisos: { ...state.configPermisos, ...action.payload } }; break

    case 'ADD_ROL_ERP':    next = { ...state, rolesERP: [...(state.rolesERP||[]), { id: genId(), ...action.payload }] }; break
    case 'UPDATE_ROL_ERP': next = { ...state, rolesERP: (state.rolesERP||[]).map(r => r.id === action.id ? { ...r, ...action.payload } : r) }; break
    case 'DELETE_ROL_ERP': next = { ...state, rolesERP: (state.rolesERP||[]).filter(r => r.id !== action.id) }; break
    case 'APROBAR_PASO1_JEFE_DIRECTO': {
      // Jefe directo aprueba el paso 1; el siguiente estado depende del flujo configurado
      const flujoPasos = state.flujos?.requerimientos || []
      const dinIdx = flujoPasos.findIndex(f => f.tipo === 'dinamico')
      const siguientePaso = flujoPasos[dinIdx + 1]
      // Si no hay siguiente paso o es despacho → va directo a almacén
      // Si el siguiente es fijo (ej. Coordinador General) → sigue el flujo normal
      const irDespacho = !siguientePaso || siguientePaso.esDespacho
      const nuevoEstadoP1 = irDespacho ? 'Aprobado - En Almacén' : 'Pendiente de Aprobación'
      next = {
        ...state,
        requerimientos: (state.requerimientos || []).map(r =>
          r.id === action.id
            ? { ...r, estado: nuevoEstadoP1, aprobadoPorJefeDirecto: action.aprobadoPor, comentarioJefeDirecto: action.comentario || '', fechaAprobJefeDirecto: todayISO() }
            : r
        )
      }
      break
    }
    case 'UPDATE_FLUJOS':  next = { ...state, flujos: { ...(state.flujos||{}), ...action.payload } }; break
    case 'ADD_USUARIO':    next = { ...state, usuarios: [...(state.usuarios||[]), { id: genId(), activo: true, cargo: '', area: '', historialCargos: [], ...action.payload }] }; break
    case 'UPDATE_USUARIO':
      next = { ...state, usuarios: state.usuarios.map(u => u.id === action.id ? { ...u, ...action.payload } : u) }; break
    case 'DELETE_USUARIO':
      next = { ...state, usuarios: state.usuarios.filter(u => u.id !== action.id) }; break
    case 'TOGGLE_USUARIO_ACTIVO':
      next = { ...state, usuarios: state.usuarios.map(u => u.id === action.id ? { ...u, activo: !u.activo } : u) }; break
    case 'UPDATE_PERFIL_USUARIO': {
      const usuarioAntes = state.usuarios.find(u => u.id === action.id)
      const historialEntry = (action.payload.cargo && usuarioAntes?.cargo && action.payload.cargo !== usuarioAntes.cargo)
        ? { cargo: usuarioAntes.cargo, area: usuarioAntes.area, hasta: todayISO(), cambiadoPor: action.cambiadoPor || '' }
        : null
      next = { ...state, usuarios: state.usuarios.map(u => {
        if (u.id !== action.id) return u
        return { ...u, ...action.payload, historialCargos: historialEntry ? [...(u.historialCargos||[]), historialEntry] : (u.historialCargos||[]) }
      }) }; break
    }
    case 'ADD_AREA':
      next = { ...state, areas: [...(state.areas||[]), { id: genId(), activo: true, ...action.payload }] }; break
    case 'UPDATE_AREA':
      next = { ...state, areas: (state.areas||[]).map(a => a.id === action.id ? { ...a, ...action.payload } : a) }; break
    case 'DELETE_AREA':
      next = { ...state, areas: (state.areas||[]).filter(a => a.id !== action.id) }; break

    case 'APROBAR_REQ_JEFE': {
      // Coordinador General aprueba (con/sin ajustes) o rechaza el REQ
      const reqJefe = state.requerimientos?.find(r => r.id === action.id)
      const itemsAprob = action.itemsAprob || []

      let nuevoEstadoJefe
      if (!action.aprobado) {
        nuevoEstadoJefe = 'Rechazado'
      } else {
        const tieneAjustes = itemsAprob.some(a => {
          const orig = reqJefe?.items?.find(it => it.id === a.itemId)
          return orig && Number(a.cantidadAprobada) < Number(orig.cantidad)
        })
        nuevoEstadoJefe = tieneAjustes ? 'Aprobado con Ajustes - En Almacén' : 'Aprobado - En Almacén'
      }

      // Actualizar items con decisión del Jefe
      const itemsActualizados = (reqJefe?.items || []).map(it => {
        const aj = itemsAprob.find(a => a.itemId === it.id)
        if (!aj) return it
        const cant = Math.max(0, Number(aj.cantidadAprobada))
        return {
          ...it,
          cantidadAprobadaJefe: cant,
          motivoAjusteJefe: aj.motivoAjuste || '',
          estadoItemJefe: cant === 0 ? 'Rechazado' : cant < Number(it.cantidad) ? 'Aprobado Parcial' : 'Aprobado',
        }
      })

      // Construir detalle ISO para trazabilidad
      const detalleItems = (reqJefe?.items || []).map(it => {
        const aj = itemsAprob.find(a => a.itemId === it.id)
        if (!aj) return null
        const cant = Number(aj.cantidadAprobada)
        const orig = Number(it.cantidad)
        if (cant === orig) return `${it.descripcion}: ✓ completo (${cant})`
        if (cant === 0) return `${it.descripcion}: ✗ rechazado${aj.motivoAjuste ? ' — '+aj.motivoAjuste : ''}`
        return `${it.descripcion}: parcial ${cant}/${orig}${aj.motivoAjuste ? ' — '+aj.motivoAjuste : ''}`
      }).filter(Boolean).join(' | ')

      next = { ...state, requerimientos: (state.requerimientos || []).map(r =>
        r.id === action.id ? {
          ...r,
          estado: nuevoEstadoJefe,
          aprobadoPorJefe: action.aprobado ? (action.aprobadoPor || '') : r.aprobadoPorJefe,
          rechazadoPorJefe: !action.aprobado ? (action.aprobadoPor || '') : undefined,
          comentarioJefe: action.comentario || '',
          fechaAprobacionJefe: todayISO(),
          detalleAprobacionJefe: detalleItems,
          items: action.aprobado ? itemsActualizados : r.items,
        } : r
      ) }; break
    }

    case 'APROBAR_REQ_RRHH': {
      // Jefe RRHH aprueba o rechaza el REQ (submitter: area RRHH)
      const nuevoEstadoRRHH = action.aprobado ? 'Pendiente' : 'Rechazado'
      next = { ...state, requerimientos: (state.requerimientos || []).map(r =>
        r.id === action.id ? {
          ...r,
          estado: nuevoEstadoRRHH,
          aprobadoPorJefe: action.aprobadoPor || '',
          comentarioJefe: action.comentario || '',
          fechaAprobacionJefe: todayISO(),
        } : r
      ) }; break
    }

    case 'CONSOLIDAR_REQ': {
      next = { ...state, requerimientos: (state.requerimientos || []).map(r =>
        r.id === action.id ? {
          ...r,
          estado: 'En Consolidado',
          consolidadoPor: action.consolidadoPor || '',
          motivoConsolidado: action.motivoConsolidado || '',
          fechaConsolidado: todayISO(),
        } : r
      ) }; break
    }

    case 'ELEVAR_GERENCIA': {
      next = { ...state, requerimientos: (state.requerimientos || []).map(r =>
        r.id === action.id ? {
          ...r,
          estado: 'Pendiente de Aprobación Gerencial',
          elevadoPor: action.elevadoPor || '',
          motivoElevacion: action.motivoElevacion || '',
          fechaElevacion: todayISO(),
        } : r
      ) }; break
    }

    case 'APROBAR_GERENCIA': {
      next = { ...state, requerimientos: (state.requerimientos || []).map(r =>
        r.id === action.id ? {
          ...r,
          estado: 'Aprobado por Gerencia',
          aprobadoPorGerencia: action.aprobadoPor || '',
          comentarioGerencia: action.comentario || '',
          fechaAprobacionGerencia: todayISO(),
        } : r
      ) }; break
    }

    case 'RECHAZAR_GERENCIA': {
      next = { ...state, requerimientos: (state.requerimientos || []).map(r =>
        r.id === action.id ? {
          ...r,
          estado: 'Rechazado por Gerencia',
          rechazadoPorGerencia: action.rechazadoPor || '',
          motivoRechazoGerencia: action.motivoRechazo || '',
          fechaRechazoGerencia: todayISO(),
        } : r
      ) }; break
    }

    case 'POSPONER_GERENCIA': {
      next = { ...state, requerimientos: (state.requerimientos || []).map(r =>
        r.id === action.id ? {
          ...r,
          estado: 'Pospuesto - Consolidado Gerencial',
          pospuestoPorGerencia: action.pospuestoPor || '',
          motivoPostergacion: action.motivoPostergacion || '',
          fechaPostergacion: todayISO(),
        } : r
      ) }; break
    }

    case 'UPDATE_CONFIG_APROBACIONES':
      next = { ...state, configAprobaciones: { ...state.configAprobaciones, ...action.payload } }; break

    case 'ENVIAR_OC_APROBACION': {
      const oc = (state.ordenesCompra||[]).find(o => o.id === action.id)
      if (!oc) { next = state; break }
      const cfg = state.configAprobaciones?.oc || {}
      const limite = parseFloat(cfg.limiteAdmin) || 0
      const nuevoEstado = 'Pendiente Aprobación'
      next = { ...state, ordenesCompra: (state.ordenesCompra||[]).map(o => o.id === action.id ? { ...o, estado: nuevoEstado } : o) }; break
    }

    case 'APROBAR_OC': {
      const oc = (state.ordenesCompra||[]).find(o => o.id === action.id)
      if (!oc) { next = state; break }
      next = { ...state, ordenesCompra: (state.ordenesCompra||[]).map(o =>
        o.id === action.id ? { ...o, estado: 'Aprobada', aprobadoPor: action.aprobadoPor || o.aprobadoPor, comentarioAprobacion: action.comentario || '' } : o
      ) }; break
    }

    case 'RECHAZAR_OC': {
      next = { ...state, ordenesCompra: (state.ordenesCompra||[]).map(o =>
        o.id === action.id ? { ...o, estado: 'Rechazada', rechazadoPor: action.rechazadoPor, motivoRechazo: action.motivo || '' } : o
      ) }; break
    }

    // ── Solicitudes de mantenimiento (proveedor externo) ──────────────────
    case 'ADD_SOLICITUD_MANT': {
      const num = 'SM-' + String((state.solicitudesMantenimiento||[]).length + 1).padStart(4,'0')
      next = { ...state, solicitudesMantenimiento: [...(state.solicitudesMantenimiento||[]), { id: genId(), numero: num, ...action.payload }] }; break
    }
    case 'UPDATE_SOLICITUD_MANT':
      next = { ...state, solicitudesMantenimiento: (state.solicitudesMantenimiento||[]).map(s => s.id===action.id ? { ...s, ...action.payload } : s) }; break
    case 'DELETE_SOLICITUD_MANT':
      next = { ...state, solicitudesMantenimiento: (state.solicitudesMantenimiento||[]).filter(s => s.id!==action.id) }; break

    // ── Evaluación de Proveedores ─────────────────────────────────────────
    case 'ADD_EVALUACION_PROV': {
      const ep = { id: genId(), numero: 'EP-' + String((state.evaluacionesProveedor||[]).length+1).padStart(4,'0'), ...action.payload }
      next = { ...state, evaluacionesProveedor: [...(state.evaluacionesProveedor||[]), ep] }; break
    }
    case 'UPDATE_EVALUACION_PROV':
      next = { ...state, evaluacionesProveedor: (state.evaluacionesProveedor||[]).map(e => e.id===action.id ? { ...e, ...action.payload } : e) }; break
    case 'DELETE_EVALUACION_PROV':
      next = { ...state, evaluacionesProveedor: (state.evaluacionesProveedor||[]).filter(e => e.id!==action.id) }; break

    default: next = state
  }
  const { _lastVale, ...toSave } = next
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  return next
}

export function AppProvider({ children }) {
  const [state, rawDispatch] = useReducer(reducer, null, loadState)
  // Keep a live ref to state so dispatch callback can read current state
  const stateRef = useRef(state)
  stateRef.current = state

  const dispatch = useCallback((action) => {
    const s = stateRef.current

    // ── Generate notifications ─────────────────────────────────────────
    if (action.type === 'ADD_REQUERIMIENTO' && action.payload.estado !== 'Borrador') {
      const existingMax = (s.requerimientos || []).reduce((max, r) => {
        const num = parseInt((r.numero || '').replace('REQ-', ''), 10)
        return isNaN(num) ? max : Math.max(max, num)
      }, 0)
      const n = Math.max(s.ultimoReq || 0, existingMax) + 1
      const numero = 'REQ-' + String(n).padStart(4, '0')
      const estadoReq = action.payload.estado
      let paraRolesReq = []
      if (estadoReq === 'Pendiente de Aprobación') {
        paraRolesReq = ['Coordinador General', 'Administrador']
      } else if (estadoReq === 'Aprobado - En Almacén') {
        paraRolesReq = ['Coordinador Logística y Compras', 'Administrador']
      }
      if (paraRolesReq.length > 0) {
        rawDispatch({ type: 'ADD_NOTIF', payload: mkNotif({
          paraRoles: paraRolesReq,
          mensaje: `📋 Nuevo ${numero} de ${action.payload.responsable || 'usuario'} (${action.payload.areaSolicitante || ''}) — requiere tu aprobación`,
          tipo: 'req',
          link: '/requerimientos',
        })})
      }
    }

    if (action.type === 'APROBAR_REQ_JEFE') {
      const req = (s.requerimientos || []).find(r => r.id === action.id)
      if (action.aprobado) {
        // Determinar si hay ajustes comparando cantidades
        const tieneAjustesNotif = (action.itemsAprob || []).some(a => {
          const orig = req?.items?.find(it => it.id === a.itemId)
          return orig && Number(a.cantidadAprobada) < Number(orig.cantidad)
        })
        if (tieneAjustesNotif) {
          // Notificación de aprobado CON ajustes — avisar al solicitante que revise
          rawDispatch({ type: 'ADD_NOTIF', payload: mkNotif({
            paraRoles: ['Coordinador Operaciones', 'Administrador'],
            mensaje: `⚠️ ${req?.numero || 'REQ'} fue APROBADO CON AJUSTES por ${action.aprobadoPor || 'Coordinador General'} — Revisa las cantidades aprobadas`,
            tipo: 'req',
            link: '/requerimientos',
          })})
          rawDispatch({ type: 'ADD_NOTIF', payload: mkNotif({
            paraRoles: ['Coordinador Logística y Compras', 'Administrador'],
            mensaje: `✅ ${req?.numero || 'REQ'} aprobado con ajustes por ${action.aprobadoPor || 'Coordinador General'} — En almacén para atención con cantidades modificadas`,
            tipo: 'req',
            link: '/requerimientos',
          })})
        } else {
          rawDispatch({ type: 'ADD_NOTIF', payload: mkNotif({
            paraRoles: ['Coordinador Logística y Compras', 'Coordinador Operaciones', 'Administrador'],
            mensaje: `✅ ${req?.numero || 'REQ'} aprobado por ${action.aprobadoPor || 'Coordinador General'} — En almacén, pendiente de atención`,
            tipo: 'req',
            link: '/requerimientos',
          })})
        }
      } else {
        rawDispatch({ type: 'ADD_NOTIF', payload: mkNotif({
          paraRoles: ['Coordinador Operaciones', 'Administrador'],
          mensaje: `❌ ${req?.numero || 'REQ'} rechazado por ${action.aprobadoPor || 'Coordinador General'}: ${action.comentario || 'sin motivo'}`,
          tipo: 'req',
          link: '/requerimientos',
        })})
      }
    }

    if (action.type === 'APROBAR_REQ_RRHH') {
      const req = (s.requerimientos || []).find(r => r.id === action.id)
      if (action.aprobado) {
        rawDispatch({ type: 'ADD_NOTIF', payload: mkNotif({
          paraRoles: ['Coordinador Logística y Compras', 'Administrador'],
          mensaje: `✅ ${req?.numero || 'REQ'} aprobado por ${action.aprobadoPor || 'Jefe RRHH'} — listo para decisión logística`,
          tipo: 'req',
          link: '/requerimientos',
        })})
      } else {
        rawDispatch({ type: 'ADD_NOTIF', payload: mkNotif({
          paraRoles: ['Administrador', 'Jefe RRHH'],
          mensaje: `❌ ${req?.numero || 'REQ'} rechazado por ${action.aprobadoPor || 'Jefe RRHH'} — ${action.comentario || ''}`,
          tipo: 'req',
          link: '/requerimientos',
        })})
      }
    }

    if (action.type === 'ELEVAR_GERENCIA') {
      const req = (s.requerimientos || []).find(r => r.id === action.id)
      rawDispatch({ type: 'ADD_NOTIF', payload: mkNotif({
        paraRoles: ['Administrador'],
        mensaje: `⬆️ ${req?.numero || 'REQ'} elevado a aprobación gerencial por ${action.elevadoPor || 'Coord. Logística'} — Motivo: ${action.motivoElevacion || ''}`,
        tipo: 'req',
        link: '/requerimientos',
      })})
    }

    if (action.type === 'APROBAR_GERENCIA') {
      const req = (s.requerimientos || []).find(r => r.id === action.id)
      rawDispatch({ type: 'ADD_NOTIF', payload: mkNotif({
        paraRoles: ['Coordinador Logística y Compras', 'Coordinador General', 'Administrador'],
        mensaje: `✅ ${req?.numero || 'REQ'} APROBADO por Gerencia — listo para despacho u OC`,
        tipo: 'req',
        link: '/requerimientos',
      })})
    }

    if (action.type === 'RECHAZAR_GERENCIA') {
      const req = (s.requerimientos || []).find(r => r.id === action.id)
      rawDispatch({ type: 'ADD_NOTIF', payload: mkNotif({
        paraRoles: ['Coordinador Logística y Compras', 'Coordinador General', 'Coordinador Operaciones', 'Administrador'],
        mensaje: `❌ ${req?.numero || 'REQ'} RECHAZADO por Gerencia: ${action.motivoRechazo || 'sin motivo'}`,
        tipo: 'req',
        link: '/requerimientos',
      })})
    }

    if (action.type === 'POSPONER_GERENCIA') {
      const req = (s.requerimientos || []).find(r => r.id === action.id)
      rawDispatch({ type: 'ADD_NOTIF', payload: mkNotif({
        paraRoles: ['Coordinador Logística y Compras', 'Coordinador General', 'Administrador'],
        mensaje: `⏸️ ${req?.numero || 'REQ'} pospuesto a Consolidado Gerencial — ${action.motivoPostergacion || ''}`,
        tipo: 'req',
        link: '/requerimientos',
      })})
    }

    if (action.type === 'APROBAR_REQUERIMIENTO') {
      const req = (s.requerimientos || []).find(r => r.id === action.id)
      if (req) {
        const allRej = (action.payload.itemsAprobacion || []).every(a => a.estadoItem === 'Rechazado')
        const emoji = allRej ? '❌' : '✅'
        const estadoMsg = allRej ? 'rechazado' : 'completado/despachado'
        const rolesNotifAprob = req.rolSolicitante === 'Asistente RRHH' || req.rolSolicitante === 'Jefe RRHH'
          ? ['Jefe RRHH', 'Administrador']
          : ['Coordinador General', 'Coordinador Operaciones', 'Administrador']
        rawDispatch({ type: 'ADD_NOTIF', payload: mkNotif({
          paraRoles: rolesNotifAprob,
          mensaje: `${emoji} ${req.numero} fue ${estadoMsg} por almacén — ${action.payload.aprobadoPorNombre || 'Almacén'}`,
          tipo: 'req',
          link: '/requerimientos',
        })})
      }
    }

    if (action.type === 'ADD_REQ_PAGO') {
      const existingMax = (s.reqPagos || []).reduce((max, r) => {
        const num = parseInt((r.numero || '').split('-')[0], 10)
        return isNaN(num) ? max : Math.max(max, num)
      }, 0)
      const n = Math.max(s.ultimoReqPago || 0, existingMax) + 1
      const year = new Date().getFullYear()
      const numero = String(n).padStart(3, '0') + '-' + year
      rawDispatch({ type: 'ADD_NOTIF', payload: mkNotif({
        paraRoles: ['Administrador', 'Contador'],
        mensaje: `💰 Req. de Pago ${numero} de ${action.payload.solicitante || 'usuario'} — pendiente de revisión`,
        tipo: 'req_pago',
        link: '/req-pago',
      })})
    }

    if (action.type === 'ADD_OC') {
      rawDispatch({ type: 'ADD_NOTIF', payload: mkNotif({
        paraRoles: ['Administrador', 'Coordinador Logística y Compras'],
        mensaje: `📦 Nueva OC creada en borrador — lista para enviar a aprobación`,
        tipo: 'oc',
        link: '/ordenes-compra',
      })})
    }

    if (action.type === 'ENVIAR_OC_APROBACION') {
      const oc = (s.ordenesCompra||[]).find(o => o.id === action.id)
      rawDispatch({ type: 'ADD_NOTIF', payload: mkNotif({
        paraRoles: ['Administrador de Empresa', 'Administrador'],
        mensaje: `🔔 OC ${oc?.numero || ''} de ${oc?.area || 'área'} requiere tu aprobación — Total: S/ ${(oc?.totalGeneral||0).toFixed(2)}`,
        tipo: 'oc',
        link: '/ordenes-compra',
      })})
    }

    if (action.type === 'APROBAR_OC') {
      const oc = (s.ordenesCompra||[]).find(o => o.id === action.id)
      rawDispatch({ type: 'ADD_NOTIF', payload: mkNotif({
        paraRoles: ['Coordinador Logística y Compras', 'Administrador'],
        mensaje: `✅ OC ${oc?.numero || ''} aprobada por Administración — lista para emisión`,
        tipo: 'oc',
        link: '/ordenes-compra',
      })})
    }

    if (action.type === 'APROBAR_OC_GERENCIA') {
      const oc = (s.ordenesCompra||[]).find(o => o.id === action.id)
      rawDispatch({ type: 'ADD_NOTIF', payload: mkNotif({
        paraRoles: ['Administrador', 'Coordinador Logística y Compras'],
        mensaje: `OC ${oc?.numero || ''} aprobada por Administradora de Empresa — proceder con emisión`,
        tipo: 'oc',
        link: '/ordenes-compra',
      })})
    }

    // Alerta de precio inusual (>10% sobre promedio historico)
    const esFacturaRecibida =
      (action.type === 'ADD_FACTURA' && action.payload?.estado === 'Recibida') ||
      (action.type === 'UPDATE_FACTURA_ESTADO' && action.estado === 'Recibida')

    if (esFacturaRecibida) {
      const fData = action.type === 'ADD_FACTURA'
        ? action.payload
        : (s.facturas || []).find(x => x.id === action.id)

      ;(fData?.items || []).forEach(it => {
        if (!it.productoId || !it.precioUnit) return
        const prod = (s.productos || []).find(p => p.id === it.productoId)
        if (!prod) return
        const historial = prod.historialPrecios || []
        const UMBRAL = 0.10
        let precioRef = null
        let etiquetaRef = ''
        if (historial.length >= 2) {
          const precios = historial.map(h => h.precio).filter(v => v > 0)
          const promedio = precios.reduce((a, b) => a + b, 0) / precios.length
          precioRef = promedio
          etiquetaRef = 'promedio historico S/ ' + promedio.toFixed(2)
        } else if (prod.ultimoPrecio > 0) {
          precioRef = prod.ultimoPrecio
          etiquetaRef = 'ultimo precio S/ ' + prod.ultimoPrecio.toFixed(2)
        }
        if (precioRef && it.precioUnit > precioRef * (1 + UMBRAL)) {
          const pct = (((it.precioUnit - precioRef) / precioRef) * 100).toFixed(1)
          rawDispatch({ type: 'ADD_NOTIF', payload: mkNotif({
            paraRoles: ['Administrador', 'Coordinador Logística y Compras', 'Administrador de Empresa'],
            mensaje: 'ALERTA PRECIO: "' + prod.nombre + '" subio ' + pct + '% vs ' + etiquetaRef + ' - factura ' + (fData.numero || '') + ' registra S/ ' + it.precioUnit.toFixed(2) + ' (' + (it.proveedor || fData.proveedor || 'proveedor') + ')',
            tipo: 'factura',
            link: '/facturas',
          })})
        }
      })
    }

    rawDispatch(action)
  }, [])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch {}
  }, [state])

  // Listener para eventos de auditoría de login/logout (disparados por AuthContext)
  useEffect(() => {
    const handler = (e) => {
      const { type, payload } = e.detail || {}
      if (!type) return
      const u = payload || {}
      const entry = {
        id: genId(),
        timestamp: new Date().toISOString(),
        usuario: u.nombre || u.email || 'Sistema',
        rol: u.rol || '—',
        modulo: 'Sistema',
        tipo: type === 'USER_LOGIN' ? 'Acceso' : type === 'USER_LOGOUT' ? 'Cierre sesión' : 'Exportar PDF',
        descripcion: type === 'USER_LOGIN'
          ? `Inicio de sesión — ${u.nombre || ''} (${u.rol || ''}) ${u.email ? `<${u.email}>` : ''}`
          : type === 'USER_LOGOUT'
            ? `Cierre de sesión — ${u.nombre || ''}`
            : `PDF exportado: ${u.documento || ''}`,
      }
      rawDispatch({ type: 'ADD_AUDIT_LOG', payload: entry })
    }
    window.addEventListener('givamic:audit', handler)
    return () => window.removeEventListener('givamic:audit', handler)
  }, [])

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>
}

export function useApp() {
  return useContext(AppContext)
}
