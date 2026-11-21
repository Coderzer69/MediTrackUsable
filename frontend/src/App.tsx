import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import RoleSelection from './pages/RoleSelection';
import LoginPage from './pages/LoginPage';
import PatientSignup from './pages/PatientSignup';
import DoctorSignup from './pages/DoctorSignup';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import DoctorVerification from './pages/DoctorVerification';
import AdminDashboard from './pages/AdminDashboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import { dashboardPathForRole } from './lib/session';
import { canAccessRole } from './lib/access';

const DoctorProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!canAccessRole(user, 'DOCTOR')) return <Navigate to={dashboardPathForRole(user?.role)} replace />;
  return <>{children}</>;
};

const PatientProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!canAccessRole(user, 'PATIENT')) return <Navigate to={dashboardPathForRole(user?.role)} replace />;
  return <>{children}</>;
};

const AdminProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!canAccessRole(user, 'ADMIN')) return <Navigate to={dashboardPathForRole(user?.role)} replace />;
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 font-sans">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/role-selection" element={<RoleSelection />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/patient/signup" element={<PatientSignup />} />
            <Route path="/doctor/signup" element={<DoctorSignup />} />
            <Route
              path="/patient/dashboard"
              element={
                <PatientProtectedRoute>
                  <PatientDashboard />
                </PatientProtectedRoute>
              }
            />
            <Route
              path="/doctor/dashboard"
              element={
                <DoctorProtectedRoute>
                  <DoctorDashboard />
                </DoctorProtectedRoute>
              }
            />
            <Route
              path="/doctor/verify"
              element={
                <DoctorProtectedRoute>
                  <DoctorVerification />
                </DoctorProtectedRoute>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <AdminProtectedRoute>
                  <AdminDashboard />
                </AdminProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
