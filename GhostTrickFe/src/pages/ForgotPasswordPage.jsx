import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, ShieldCheck, ArrowLeft, KeyRound } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import '../styles/pages/auth.css';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP & New Password
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      addToast('Mã OTP đã được gửi tới email của bạn.', 'success');
      setStep(2);
    } catch (error) {
      const msg = error.response?.data?.message || 'Không thể gửi mã OTP. Vui lòng thử lại.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast('Mật khẩu xác nhận không khớp.', 'error');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', {
        email,
        code,
        newPassword
      });
      addToast('Mật khẩu đã được thay đổi thành công.', 'success');
      navigate('/sign-in');
    } catch (error) {
      const msg = error.response?.data?.message || 'Mã OTP không hợp lệ hoặc đã hết hạn.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        <div className="auth-brand">Ghosttrick</div>
        
        <Link to="/sign-in" className="back-to-login">
          <ArrowLeft size={18} />
          Quay lại đăng nhập
        </Link>

        {step === 1 ? (
          <>
            <h1 className="auth-title">Quên mật khẩu?</h1>
            <p className="auth-subtitle">Nhập email của bạn, chúng tôi sẽ gửi mã OTP để đặt lại mật khẩu.</p>

            {error && <div style={{ color: 'red', fontSize: '0.9rem', marginBottom: '15px', textAlign: 'center' }}>{error}</div>}

            <form onSubmit={handleSendOtp} className="auth-form">
              <div className="form-group">
                <label>Email của bạn</label>
                <div className="input-container">
                  <Mail className="input-icon" size={20} />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className={`auth-submit-btn ${email && !loading ? 'active' : ''}`}
                disabled={!email || loading}
              >
                {loading ? 'Đang gửi mã...' : 'Gửi mã OTP'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="auth-title">Đặt lại mật khẩu</h1>
            <p className="auth-subtitle">Nhập mã OTP đã được gửi tới <strong>{email}</strong> và mật khẩu mới.</p>

            {error && <div style={{ color: 'red', fontSize: '0.9rem', marginBottom: '15px', textAlign: 'center' }}>{error}</div>}

            <form onSubmit={handleResetPassword} className="auth-form">
              <div className="form-group">
                <label>Mã OTP (6 chữ số)</label>
                <div className="input-container">
                  <ShieldCheck className="input-icon" size={20} />
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="Nhập mã 6 chữ số"
                    maxLength={6}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Mật khẩu mới</label>
                <div className="input-container">
                  <Lock className="input-icon" size={20} />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 8 ký tự"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Xác nhận mật khẩu</label>
                <div className="input-container">
                  <KeyRound className="input-icon" size={20} />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu mới"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className={`auth-submit-btn ${code && newPassword.length >= 8 && confirmPassword === newPassword && !loading ? 'active' : ''}`}
                disabled={!code || newPassword.length < 8 || confirmPassword !== newPassword || loading}
              >
                {loading ? 'Đang xử lý...' : 'Xác nhận đổi mật khẩu'}
              </button>

              <div className="auth-form-footer">
                <button 
                  type="button" 
                  className="resend-btn" 
                  onClick={handleSendOtp}
                  disabled={loading}
                >
                  Gửi lại mã OTP
                </button>
              </div>
            </form>
          </>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .back-to-login {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #64748b;
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 600;
          margin-bottom: 24px;
          transition: color 0.2s;
        }

        .back-to-login:hover {
          color: #0f172a;
        }

        .auth-form-footer {
          margin-top: 20px;
          text-align: center;
        }

        .resend-btn {
          background: none;
          border: none;
          color: #2563eb;
          font-weight: 600;
          cursor: pointer;
          font-size: 0.875rem;
          padding: 8px;
        }

        .resend-btn:hover {
          text-decoration: underline;
        }

        .resend-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}} />
    </div>
  );
}
