import { NavLink } from 'react-router-dom'
import { useState, useRef, useEffect, useCallback } from 'react'
import { useApp } from '../../context/AppContext'
import { usePerm } from '../../hooks/usePerm'
import {
  HomeIcon, DocumentTextIcon,
  WrenchScrewdriverIcon, Cog6ToothIcon, ShieldCheckIcon, UserGroupIcon,
  ShoppingCartIcon, ClipboardDocumentCheckIcon,
  BuildingStorefrontIcon, ScaleIcon, MagnifyingGlassCircleIcon,
  ClipboardDocumentListIcon, CurrencyDollarIcon, BanknotesIcon,
  ChevronLeftIcon, ChevronRightIcon, ChevronUpIcon, ChevronDownIcon, XMarkIcon, StarIcon,
  PresentationChartBarIcon, LockClosedIcon
} from '@heroicons/react/24/outline'

const GRUPOS = [
  {
    label: 'INICIO',
    items: [
      { to: '/', label: 'Dashboard', Icon: HomeIcon, modulo: 'dashboard' },
    ]
  },
  {
    label: 'COMPRAS',
    items: [
      { to: '/requerimientos', label: 'Req. Bienes/Serv.',       Icon: ClipboardDocumentListIcon,  modulo: 'requerimientos', badge: 'requerimientos' },
      { to: '/cotizaciones',   label: 'Cotizaciones',            Icon: ScaleIcon,                  modulo: 'cotizaciones' },
      { to: '/ordenes-compra', label: 'Ordenes de Compra',       Icon: ShoppingCartIcon,           modulo: 'ordenes-compra' },
      { to: '/facturas',       label: 'Facturas de Compra',      Icon: DocumentTextIcon,           modulo: 'facturas' },
      { to: '/conformidades',  label: 'Recepciones',             Icon: ClipboardDocumentCheckIcon, modulo: 'conformidades' },
    ]
  },
  {
    label: 'ALMACEN',
    items: [
      { to: '/almacen',   label: 'Almacen Central', Icon: BuildingStorefrontIcon, modulo: 'almacen' },
      { to: '/uniformes', label: 'Kit de Ingreso',  Icon: UserGroupIcon,          modulo: 'uniformes' },
    ]
  },
  {
    label: 'OPERACIONES',
    items: [
      { to: '/maquinas', label: 'Activos y Equipos', Icon: WrenchScrewdriverIcon, modulo: 'maquinas' },
    ]
  },
  {
    label: 'SSOMA',
    items: [
      { to: '/epps',                   label: 'Control SSOMA',     Icon: ShieldCheckIcon,    modulo: 'epps' },
      { to: '/evaluacion-proveedores', label: 'Eval. Proveedores', Icon: StarIcon,           modulo: 'evaluacion-proveedores' },
    ]
  },
  {
    label: 'RRHH',
    items: [
      { to: '/rrhh', label: 'Recursos Humanos', Icon: UserGroupIcon, modulo: 'rrhh' },
    ]
  },
  {
    label: 'FINANZAS',
    items: [
      { to: '/req-pago',               label: 'Req. de Pago',         Icon: CurrencyDollarIcon,           modulo: 'req-pago' },
      { to: '/cuentas-por-pagar',      label: 'Cuentas por Pagar',    Icon: BanknotesIcon,                modulo: 'cuentas-por-pagar' },
    ]
  },
  {
    label: 'ADMINISTRACION',
    items: [
      { to: '/maestros',       label: 'Maestros',        Icon: Cog6ToothIcon,              modulo: 'maestros' },
      { to: '/auditoria',      label: 'Auditoria',       Icon: MagnifyingGlassCircleIcon,  modulo: 'auditoria' },
      { to: '/reportes',       label: 'Reportes',        Icon: PresentationChartBarIcon,   modulo: 'reportes' },
      { to: '/roles-permisos', label: 'Roles y Permisos', Icon: LockClosedIcon,            modulo: 'roles-permisos' },
    ]
  },
]

export default function Sidebar({ onClose }) {
  const { state } = useApp()
  const { puedeVer } = usePerm()
  const [collapsed, setCollapsed] = useState(false)
  const [canScrollUp, setCanScrollUp] = useState(false)
  const [canScrollDown, setCanScrollDown] = useState(false)
  const navRef = useRef(null)
  const pendientesReq = (state.requerimientos || []).filter(r => r.estado === 'Pendiente de Aprobación').length
  const logoSrc = state.logo || state.config?.logoBase64

  const checkScroll = useCallback(() => {
    const el = navRef.current
    if (!el) return
    setCanScrollUp(el.scrollTop > 4)
    setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 4)
  }, [])

  useEffect(() => {
    const el = navRef.current
    if (!el) return
    checkScroll()
    el.addEventListener('scroll', checkScroll)
    const ro = new ResizeObserver(checkScroll)
    ro.observe(el)
    return () => { el.removeEventListener('scroll', checkScroll); ro.disconnect() }
  }, [checkScroll])

  const scrollNav = (dir) => {
    navRef.current?.scrollBy({ top: dir * 80, behavior: 'smooth' })
  }

  return (
    <aside className={`bg-[#1e3a5f] flex flex-col h-full shrink-0 transition-all duration-300 ease-in-out relative
      ${collapsed ? 'w-[68px]' : 'w-60'}`}>

      {/* Header */}
      <div className={`border-b border-white/10 flex items-center py-3.5 transition-all duration-300 ${collapsed ? 'px-3 justify-center' : 'px-4'}`}>
        {!collapsed ? (
          <>
            <div className="shrink-0 mr-3 flex items-center">
              {logoSrc
                ? <img src={logoSrc} alt="Logo" className="h-9 w-9 object-contain" />
                : <div className="w-9 h-9 rounded-xl bg-[#e67e22] flex items-center justify-center">
                    <span className="text-white font-black text-base">G</span>
                  </div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-base leading-tight tracking-wide">GIVAMIC</p>
              <p className="text-blue-300 text-[10px] mt-0.5">Sistema de Gestion</p>
            </div>
            {onClose && (
              <button onClick={onClose} className="md:hidden text-blue-300 hover:text-white p-1 rounded-lg hover:bg-white/10">
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center">
            {logoSrc
              ? <img src={logoSrc} alt="Logo" className="h-9 w-9 object-contain" />
              : <div className="w-9 h-9 rounded-xl bg-[#e67e22] flex items-center justify-center">
                  <span className="text-white font-black text-base">G</span>
                </div>
            }
          </div>
        )}
      </div>

      {/* Scroll up hint */}
      {canScrollUp && (
        <button onClick={() => scrollNav(-1)}
          className="w-full flex justify-center py-1 text-blue-300/60 hover:text-blue-200 hover:bg-white/5 transition-colors">
          <ChevronUpIcon className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Nav */}
      <nav ref={navRef} className="flex-1 py-1 overflow-y-auto overflow-x-hidden space-y-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {GRUPOS.map(grupo => {
          const visibles = grupo.items.filter(l => puedeVer(l.modulo))
          if (visibles.length === 0) return null
          return (
            <div key={grupo.label} className="mb-0.5">
              {!collapsed && (
                <p className="text-[8px] font-bold text-blue-300/50 uppercase tracking-widest px-4 pt-2 pb-1">
                  {grupo.label}
                </p>
              )}
              {collapsed && <div className="border-t border-white/10 mx-3 my-1.5" />}

              <div className={`${collapsed ? 'px-2 space-y-0.5' : 'px-2 space-y-0'}`}>
                {visibles.map(({ to, label, Icon, badge }) => {
                  const badgeCount = badge === 'requerimientos' ? pendientesReq : 0
                  return (
                    <NavLink
                      key={to} to={to} end={to === '/'}
                      title={collapsed ? label : undefined}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded-lg text-sm transition-all duration-150 w-full
                        ${collapsed ? 'px-0 py-2 justify-center' : 'px-2.5 py-1.5'}
                        ${isActive
                          ? 'bg-white text-[#1e3a5f] font-bold shadow-sm'
                          : 'text-blue-100 hover:bg-white/10 hover:text-white'}`
                      }>
                      {({ isActive }) => (
                        <>
                          <div className={`relative shrink-0 flex items-center justify-center rounded-md transition-all
                            ${collapsed ? 'w-8 h-8' : 'w-7 h-7'}
                            ${isActive ? 'bg-[#1e3a5f]/10' : 'bg-white/5'}`}>
                            <Icon className={`${isActive ? 'text-[#1e3a5f]' : 'text-blue-200'}`} style={{ width: '16px', height: '16px' }} />
                            {badgeCount > 0 && (
                              <span className="absolute -top-1 -right-1 bg-amber-400 text-amber-900 text-[8px] font-black rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
                                {badgeCount > 9 ? '9+' : badgeCount}
                              </span>
                            )}
                          </div>
                          {!collapsed && (
                            <span className="flex-1 truncate text-[12px]">{label}</span>
                          )}
                        </>
                      )}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Scroll down hint */}
      {canScrollDown && (
        <button onClick={() => scrollNav(1)}
          className="w-full flex justify-center py-1 text-blue-300/60 hover:text-blue-200 hover:bg-white/5 transition-colors border-t border-white/5">
          <ChevronDownIcon className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Colapsar */}
      <div className="hidden md:flex border-t border-white/10 py-3 justify-center">
        <button onClick={() => setCollapsed(c => !c)}
          className="text-blue-300 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition-colors"
          title={collapsed ? 'Expandir' : 'Colapsar'}
        >
          {collapsed ? <ChevronRightIcon className="w-4 h-4"/> : <ChevronLeftIcon className="w-4 h-4"/>}
        </button>
      </div>
    </aside>
  )
}
