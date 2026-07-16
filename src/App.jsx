import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { AppProvider, useApp } from './context/AppContext'
import { ToastProvider } from './components/layout/Toast'
import { usePerm } from './hooks/usePerm'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Facturas from './pages/Facturas'
import Maquinas from './pages/Maquinas'
import Maestros from './pages/Maestros'
import EmpresasClientes from './pages/EmpresasClientes'
import FacturacionClientes from './pages/FacturacionClientes'
import EPPs from './pages/EPPs'
import RQs from './pages/RQs'
import Cotizaciones from './pages/Cotizaciones'
import OrdenesCompra from './pages/OrdenesCompra'
import Conformidades from './pages/Conformidades'
import Almacen from './pages/Almacen'
import Auditoria from './pages/Auditoria'
import Requerimientos from './pages/Requerimientos'
import ReqPago from './pages/ReqPago'
import Uniformes from './pages/Uniformes'
import Perfil from './pages/Perfil'
import EvaluacionProveedores from './pages/EvaluacionProveedores'
import RRHH from './pages/RRHH'
import CuentasPorPagar from './pages/CuentasPorPagar'
import Reportes from './pages/Reportes'
import RolesPermisos from './pages/RolesPermisos'

function PrivateRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

function PermRoute({ modulo, children }) {
  const { user } = useAuth()
  const { puedeVer } = usePerm()
  if (!user) return <Navigate to="/login" replace />
  if (puedeVer(modulo)) return children
  return <Navigate to="/" replace />
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="cotizaciones"           element={<PermRoute modulo="cotizaciones"><Cotizaciones /></PermRoute>} />
        <Route path="ordenes-compra"         element={<PermRoute modulo="ordenes-compra"><OrdenesCompra /></PermRoute>} />
        <Route path="facturas"               element={<PermRoute modulo="facturas"><Facturas /></PermRoute>} />
        <Route path="conformidades"          element={<PermRoute modulo="conformidades"><Conformidades /></PermRoute>} />
        <Route path="almacen"                element={<PermRoute modulo="almacen"><Almacen /></PermRoute>} />
        <Route path="maquinas"               element={<PermRoute modulo="maquinas"><Maquinas /></PermRoute>} />
        <Route path="maestros"               element={<PermRoute modulo="maestros"><Maestros /></PermRoute>} />
        <Route path="empresas-clientes"       element={<PermRoute modulo="empresas-clientes"><EmpresasClientes /></PermRoute>} />
        <Route path="epps"                   element={<PermRoute modulo="epps"><EPPs /></PermRoute>} />
        <Route path="rqs"                    element={<PermRoute modulo="requerimientos"><RQs /></PermRoute>} />
        <Route path="requerimientos"         element={<PermRoute modulo="requerimientos"><Requerimientos /></PermRoute>} />
        <Route path="req-pago"               element={<PermRoute modulo="req-pago"><ReqPago /></PermRoute>} />
        <Route path="uniformes"              element={<PermRoute modulo="uniformes"><Uniformes /></PermRoute>} />
        <Route path="perfil"                 element={<Perfil />} />
        <Route path="auditoria"              element={<PermRoute modulo="auditoria"><Auditoria /></PermRoute>} />
        <Route path="evaluacion-proveedores" element={<PermRoute modulo="evaluacion-proveedores"><EvaluacionProveedores /></PermRoute>} />
        <Route path="rrhh"                    element={<PermRoute modulo="rrhh"><RRHH /></PermRoute>} />
        <Route path="cuentas-por-pagar"      element={<PermRoute modulo="cuentas-por-pagar"><CuentasPorPagar /></PermRoute>} />
        <Route path="facturacion-clientes"    element={<PermRoute modulo="facturacion-clientes"><FacturacionClientes /></PermRoute>} />
        <Route path="reportes"               element={<PermRoute modulo="reportes"><Reportes /></PermRoute>} />
        <Route path="roles-permisos"         element={<PermRoute modulo="roles-permisos"><RolesPermisos /></PermRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </AppProvider>
  )
}
