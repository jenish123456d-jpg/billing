import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-state" style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", flexDirection: "column" }}>
        <div className="loader"></div>
        <p style={{ marginTop: "1rem" }}>Verifying session...</p>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default ProtectedRoute;
