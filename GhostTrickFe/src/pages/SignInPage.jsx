import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Lock, Eye, EyeOff } from 'lucide-react'
import { GoogleLogin } from '@react-oauth/google'
import { useGlobalContext } from '../context/GlobalContext'
import { useToast } from '../context/ToastContext'
import { authService } from '../services/authService'
import '../styles/pages/auth.css'

export default function SignInPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, setUser } = useGlobalContext();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const onGoogleSuccess = async (credentialResponse) => {
    setLoading(true);
    try {
      const result = await authService.googleLogin(credentialResponse.credential);
      // setUser sẽ tự động cập nhật GlobalState và LocalStorage
      setUser(result.user);
      addToast('Đăng nhập Google thành công!', 'success');
      navigate('/');
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Đăng nhập Google thất bại.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const onGoogleError = () => {
    setError('Đăng nhập Google thất bại. Vui lòng thử lại.');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    setLoading(true);
    const result = await login(identifier, password);
    setLoading(false);

    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }
  };

  const isFormValid = identifier && password;

  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        <div className="auth-brand">Ghosttrick</div>
        <h1 className="auth-title">Welcome to Ghosttrick!</h1>
        <p className="auth-subtitle">Đăng nhập ngay để có trải nghiệm mua sắm tuyệt vời cùng chúng tôi.</p>

        {/* Social Login */}
        <div className="social-login-section">
          <p className="social-login-title">Đăng nhập nhanh với</p>
          <div className="social-btns" style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
            <GoogleLogin
              onSuccess={onGoogleSuccess}
              onError={onGoogleError}
              useOneTap
              theme="outline"
              size="large"
              shape="pill"
              text="continue_with"
              width="100%"
            />
          </div>
          <div className="auth-divider">
            <span>Hoặc</span>
          </div>
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

          <div className="form-options">
            <label className="checkbox-label">
              <input type="checkbox" /> Nhớ đăng nhập
            </label>
            <Link to="/forgot-password" size="small" className="forgot-link">Quên mật khẩu</Link>
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
