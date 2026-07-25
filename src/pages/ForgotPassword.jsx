import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { FiLock, FiMail, FiArrowLeft, FiAlertCircle, FiCheckCircle } from "react-icons/fi";
import { supabase } from "../supabaseClient";
import "./ForgotPassword.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState(1); // 1 = Request link, 2 = Reset password
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  // Listen for recovery redirect event from Supabase
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, _session) => {
      if (event === "PASSWORD_RECOVERY") {
        setStep(2);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Step 1 handler: Send reset link
  const handleRequestLink = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setError("");
    setInfoMessage("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin + "/forgot-password",
      });

      if (error) {
        setError(error.message);
      } else {
        setInfoMessage("A password reset link has been sent to your email address. Please check your inbox.");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to connect to authentication service.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2 handler: Reset password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    setInfoMessage("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setError(error.message);
      } else {
        setInfoMessage("Password reset successfully! Redirecting to login...");
        await supabase.auth.signOut();
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-container">
      <div className="forgot-glass-card">
        <div className="forgot-back-link">
          <Link to="/login" className="btn-back">
            <FiArrowLeft /> Back to Sign In
          </Link>
        </div>

        <div className="forgot-header">
          <div className="forgot-logo-badge">
            <FiLock />
          </div>
          <h1 className="forgot-title">Reset Password</h1>
          <p className="forgot-subtitle">
            {step === 1
              ? "Send a password reset link to your registered email address"
              : "Enter your new password below"}
          </p>
        </div>

        {error && (
          <div className="forgot-error-alert">
            <FiAlertCircle className="alert-icon" />
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="forgot-success-alert">
            <FiCheckCircle className="alert-icon" />
            <div className="alert-content">
              <p className="alert-heading">Success</p>
              <p className="alert-body">{infoMessage}</p>
            </div>
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestLink} className="forgot-form">
            <div className="forgot-input-group">
              <label htmlFor="email">Email Address</label>
              <div className="forgot-input-wrapper">
                <FiMail className="input-icon" />
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your registered email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" className="forgot-submit-btn" disabled={loading}>
              {loading ? "Sending Link..." : "Send Reset Link"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="forgot-form">
            <div className="forgot-input-group">
              <label htmlFor="new-password">New Password</label>
              <div className="forgot-input-wrapper">
                <FiLock className="input-icon" />
                <input
                  id="new-password"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="forgot-input-group">
              <label htmlFor="confirm-password">Confirm Password</label>
              <div className="forgot-input-wrapper">
                <FiLock className="input-icon" />
                <input
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" className="forgot-submit-btn" disabled={loading}>
              {loading ? "Resetting Password..." : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;
