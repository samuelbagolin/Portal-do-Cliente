import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import { LoginPage } from './LoginPage';
import { Dashboard } from './pages/Dashboard';
import { ClientsPage } from './pages/Clients';
import { UsersPage } from './pages/Users';
import { TicketsPage } from './pages/Tickets';
import { AgendaPage } from './pages/Agenda';
import { MaterialsPage } from './pages/Materials';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/tickets" element={<TicketsPage />} />
            <Route path="/agenda" element={<AgendaPage />} />
            <Route path="/materiais" element={<MaterialsPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/clientes" element={<ClientsPage />} />
            <Route path="/usuarios" element={<UsersPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
