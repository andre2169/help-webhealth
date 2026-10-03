import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NotificationsProvider } from "./context/NotificationsContext";
import { RequireAuth, RequireRole } from "./components/RequireAuth";
import AppLayout from "./components/AppLayout";
import PwaInstallPrompt from "./components/PwaInstallPrompt";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Tickets from "./pages/Tickets";
import CreateTicket from "./pages/CreateTicket";
import TicketDetail from "./pages/TicketDetail";
import ServiceDesk from "./pages/ServiceDesk";
import Reports from "./pages/Reports";
import Profile from "./pages/Profile";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminNotificationEvents from "./pages/admin/AdminNotificationEvents";
import AdminMaintenanceNotices from "./pages/admin/AdminMaintenanceNotices";
import AdminTicketCatalog from "./pages/admin/AdminTicketCatalog";
import "./style.css";

function PublicOnly({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <PwaInstallPrompt />
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnly>
                <Login />
              </PublicOnly>
            }
          />
          <Route
            path="/cadastro"
            element={
              <PublicOnly>
                <Register />
              </PublicOnly>
            }
          />

          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/tickets" element={<Tickets />} />
              <Route path="/admin/excluidos" element={<Navigate to="/tickets?status=deleted" replace />} />
              <Route path="/tickets/novo" element={<CreateTicket />} />
              <Route path="/tickets/:id" element={<TicketDetail />} />
              <Route path="/perfil" element={<Profile />} />

              <Route element={<RequireRole roles={["technician", "admin"]} />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/atendimento" element={<ServiceDesk />} />
                <Route path="/relatorios" element={<Reports />} />
              </Route>

              <Route element={<RequireRole roles={["admin"]} />}>
                <Route path="/admin/usuarios" element={<AdminUsers />} />
                <Route path="/admin/eventos" element={<AdminNotificationEvents />} />
                <Route path="/admin/avisos" element={<AdminMaintenanceNotices />} />
                <Route path="/admin/catalogo" element={<AdminTicketCatalog />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </NotificationsProvider>
    </AuthProvider>
  );
}

