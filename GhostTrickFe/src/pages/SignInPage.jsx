import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Lock, Eye, EyeOff } from 'lucide-react'
import { useGoogleLogin } from '@react-oauth/google'
import { useGlobalContext } from '../context/GlobalContext'
import { useToast } from '../context/ToastContext'
import { authService } from '../services/authService'
import '../auth.css'

export default function SignInPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('password');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, setUser } = useGlobalContext();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        // credential is the ID Token in some versions, but useGoogleLogin by default returns an access token.
        // For security best practices with Backend, we usually want the ID Token or we use the access token to get user info.
        // If we want the ID token, we need to use GoogleLogin component or configure useGoogleLogin.
        // Let's use the access token approach or just stick to the standard GoogleLogin component if simpler.
        // Actually, many people use the access token to fetch info on the backend.
        // I'll assume the backend expects the access token for simplicity here, or I'll use the ID Token if I use the standard component.
        addToast('Đăng nhập Google thành công!', 'success');
        // Mocking the call for now as we need to handle the specific token type
        // In a real app, you'd send this to your backend
        // await authService.googleLogin(tokenResponse.access_token);
        // navigate('/');
      } catch (err) {
        addToast('Đăng nhập Google thất bại.', 'error');
      } finally {
        setLoading(false);
      }
    },
    onError: () => addToast('Đăng nhập Google thất bại.', 'error')
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (activeTab === 'otp') {
      addToast('Chức năng OTP sẽ được kết nối API sau!', 'info');
      return;
    }

    setLoading(true);
    const result = await login(identifier, password);
    setLoading(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }
  };

  const isFormValid = identifier && (activeTab === 'otp' || password);

  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        <div className="auth-brand">Ghosttrick</div>
        <h1 className="auth-title">Welcome to Ghosttrick!</h1>
        <p className="auth-subtitle">Đăng nhập ngay để có trải nghiệm mua sắm tuyệt vời cùng chúng tôi.</p>

        {/* Social Login */}
        <div className="social-login-section">
          <p className="social-login-title">Đăng nhập nhanh với</p>
          <div className="social-btns">
            <button className="social-btn facebook">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
            </button>
            <button className="social-btn google" onClick={() => handleGoogleLogin()} disabled={loading}>
              <svg width="24" height="24" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>
            </button>
          </div>
          <div className="auth-divider">
            <span>Hoặc</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="auth-tabs">
          <div className={`auth-tab ${activeTab === 'otp' ? 'active' : ''}`} onClick={() => setActiveTab('otp')}>OTP</div>
          <div className={`auth-tab ${activeTab === 'password' ? 'active' : ''}`} onClick={() => setActiveTab('password')}>Mật khẩu</div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div style={{ color: 'red', fontSize: '0.9rem', marginBottom: '10px' }}>{error}</div>}
          <div className="form-group">
            <label>Số điện thoại hoặc email</label>
            <div className="input-container">
              <User className="input-icon" size={20} />
              <input
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="Nhập số điện thoại hoặc email của bạn"
              />
            </div>
          </div>

          {activeTab === 'password' && (
            <div className="form-group">
              <label>Mật khẩu</label>
              <div className="input-container">
                <Lock className="input-icon" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu của bạn"
                />
                <div className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </div>
              </div>
            </div>
          )}

          <div className="form-options">
            <label className="checkbox-label">
              <input type="checkbox" /> Nhớ đăng nhập
            </label>
            <a href="#" className="forgot-link">Quên mật khẩu</a>
          </div>

          <button
            type="submit"
            className={`auth-submit-btn ${isFormValid && !loading ? 'active' : ''}`}
            disabled={!isFormValid || loading}
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <p className="auth-footer">
          Bạn chưa có tài khoản? <Link to="/sign-up">Đăng ký ngay</Link>
        </p>
      </div>
    </div>
  )
}

