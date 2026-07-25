import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import BillingPage from './pages/BillingPage';
import AdminPanel from './pages/AdminPanel';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import './App.css';

function AppContent() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="app-layout">
      {isAuthenticated && <Navbar />}
      <main className="app-main" style={{ padding: !isAuthenticated ? '0' : undefined }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <BillingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPanel />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
