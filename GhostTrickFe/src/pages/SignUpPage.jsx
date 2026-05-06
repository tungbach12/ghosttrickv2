import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Mail, Lock, Eye, EyeOff, Phone } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { authService } from '../services/authService'
import { useToast } from '../context/ToastContext'
import '../auth.css'

// Define validation schema
const registerSchema = z.object({
  firstName: z.string().min(1, 'Tên không được để trống'),
  lastName: z.string().min(1, 'Họ không được để trống'),
  email: z.string().email('Email không hợp lệ'),
  phone: z.string().regex(/^(0[3|5|7|8|9])+([0-9]{8})$/, 'Số điện thoại không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu phải ít nhất 8 ký tự'),
  confirmPassword: z.string().min(1, 'Vui lòng nhập lại mật khẩu')
}).refine((data) => data.password === data.confirmPassword, {
  message: "Mật khẩu nhập lại không khớp",
  path: ["confirmPassword"],
});

export default function SignUpPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [step, setStep] = useState(1); // 1: Info, 2: OTP
  const [userEmail, setUserEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isValid }
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: 'onChange'
  });

  const onSubmitInfo = async (data) => {
    setServerError('');
    setLoading(true);
    try {
      const userData = {
        fullName: `${data.lastName} ${data.firstName}`.trim(),
        email: data.email,
        phone: data.phone,
        password: data.password
      };
      await authService.register(userData);
      setUserEmail(data.email);
      setStep(2);
      addToast('Mã OTP đã được gửi đến email của bạn.', 'info');
    } catch (err) {
      setServerError(err.response?.data?.message || 'Có lỗi xảy ra khi đăng ký');
    } finally {
      setLoading(false);
    }
  };

  const onVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      setServerError('Vui lòng nhập mã OTP 6 chữ số');
      return;
    }

    setLoading(true);
    setServerError('');
    try {
      await authService.verifyOtp(userEmail, otpCode);
      addToast('Xác thực thành công! Bạn có thể đăng nhập ngay.', 'success');
      navigate('/sign-in');
    } catch (err) {
      setServerError(err.response?.data?.message || 'Mã OTP không chính xác hoặc đã hết hạn');
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    setLoading(true);
    try {
      await authService.sendOtp(userEmail);
      addToast('Mã OTP mới đã được gửi.', 'success');
    } catch (err) {
      setServerError('Không thể gửi lại mã OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        <div className="auth-brand">Ghosttrick</div>
        <h1 className="auth-title">Welcome to Ghosttrick!</h1>
        <p className="auth-subtitle">
          {step === 1 
            ? 'Đăng kí ngay để có trải nghiệm mua sắm tuyệt vời với chúng mình.' 
            : `Chúng mình đã gửi mã xác thực đến ${userEmail}. Vui lòng kiểm tra hộp thư.`}
        </p>

        {/* Stepper */}
        <div className="auth-stepper">
          <div className={`step-item ${step >= 1 ? 'active' : ''}`}>
            <div className="step-number">1</div>
            <div className="step-label">Nhập thông tin</div>
          </div>
          <div className={`step-item ${step >= 2 ? 'active' : ''}`}>
            <div className="step-number">2</div>
            <div className="step-label">Xác thực OTP</div>
          </div>
          <div className={`step-item ${step === 3 ? 'active' : ''}`}>
            <div className="step-number">3</div>
            <div className="step-label">Đăng nhập</div>
          </div>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSubmit(onSubmitInfo)} className="auth-form">
            {serverError && <div className="alert alert-danger" style={{ fontSize: '0.9rem', marginBottom: '15px', color: 'red' }}>{serverError}</div>}

            <div className="form-row" style={{ display: 'flex', gap: '15px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Họ</label>
                <div className="input-container">
                  <User className="input-icon" size={20} />
                  <input
                    type="text"
                    {...register('lastName')}
                    placeholder="Nhập họ"
                    className={errors.lastName ? 'input-error' : ''}
                  />
                </div>
                {errors.lastName && <span className="error-text" style={{ color: 'red', fontSize: '0.8rem' }}>{errors.lastName.message}</span>}
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label>Tên</label>
                <div className="input-container">
                  <User className="input-icon" size={20} />
                  <input
                    type="text"
                    {...register('firstName')}
                    placeholder="Nhập tên"
                    className={errors.firstName ? 'input-error' : ''}
                  />
                </div>
                {errors.firstName && <span className="error-text" style={{ color: 'red', fontSize: '0.8rem' }}>{errors.firstName.message}</span>}
              </div>
            </div>

            <div className="form-group">
              <label>Email</label>
              <div className="input-container">
                <Mail className="input-icon" size={20} />
                <input
                  type="email"
                  {...register('email')}
                  placeholder="Nhập email của bạn"
                  className={errors.email ? 'input-error' : ''}
                />
              </div>
              {errors.email && <span className="error-text" style={{ color: 'red', fontSize: '0.8rem' }}>{errors.email.message}</span>}
            </div>

            <div className="form-group">
              <label>Số điện thoại</label>
              <div className="input-container">
                <Phone className="input-icon" size={20} />
                <input
                  type="text"
                  {...register('phone')}
                  placeholder="Nhập số điện thoại của bạn"
                  className={errors.phone ? 'input-error' : ''}
                />
              </div>
              {errors.phone && <span className="error-text" style={{ color: 'red', fontSize: '0.8rem' }}>{errors.phone.message}</span>}
            </div>

            <div className="form-group">
              <label>Mật khẩu</label>
              <div className="input-container">
                <Lock className="input-icon" size={20} />
                <input
                  type={showPassword ? "text" : "password"}
                  {...register('password')}
                  placeholder="Nhập mật khẩu của bạn"
                  className={errors.password ? 'input-error' : ''}
                />
                <div className="password-toggle" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </div>
              </div>
              {errors.password && <span className="error-text" style={{ color: 'red', fontSize: '0.8rem' }}>{errors.password.message}</span>}
            </div>

            <div className="form-group">
              <label>Nhập lại mật khẩu</label>
              <div className="input-container">
                <Lock className="input-icon" size={20} />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  {...register('confirmPassword')}
                  placeholder="Nhập lại mật khẩu"
                  className={errors.confirmPassword ? 'input-error' : ''}
                />
                <div className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </div>
              </div>
              {errors.confirmPassword && <span className="error-text" style={{ color: 'red', fontSize: '0.8rem' }}>{errors.confirmPassword.message}</span>}
            </div>

            <button
              type="submit"
              className={`auth-submit-btn ${isValid && !loading ? 'active' : ''}`}
              disabled={!isValid || loading}
            >
              {loading ? 'ĐANG ĐĂNG KÝ...' : 'ĐĂNG KÝ'}
            </button>
          </form>
        ) : (
          <form onSubmit={onVerifyOtp} className="auth-form">
            {serverError && <div className="alert alert-danger" style={{ fontSize: '0.9rem', marginBottom: '15px', color: 'red' }}>{serverError}</div>}
            
            <div className="form-group">
              <label>Mã OTP (6 chữ số)</label>
              <div className="input-container">
                <Lock className="input-icon" size={20} />
                <input
                  type="text"
                  maxLength="6"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="Nhập mã OTP"
                  style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '1.2rem', fontWeight: 'bold' }}
                />
              </div>
            </div>

            <button
              type="submit"
              className={`auth-submit-btn ${otpCode.length === 6 && !loading ? 'active' : ''}`}
              disabled={otpCode.length !== 6 || loading}
            >
              {loading ? 'ĐANG XÁC THỰC...' : 'XÁC THỰC'}
            </button>

            <p style={{ textAlign: 'center', marginTop: '15px', fontSize: '0.9rem' }}>
              Không nhận được mã? <button type="button" onClick={resendOtp} disabled={loading} style={{ background: 'none', border: 'none', color: '#000', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}>Gửi lại ngay</button>
            </p>
            <button type="button" onClick={() => setStep(1)} style={{ width: '100%', marginTop: '10px', background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>Quay lại</button>
          </form>
        )}

        <p className="auth-footer">
          Bạn đã có tài khoản? <Link to="/sign-in">Đăng nhập ngay</Link>
        </p>
      </div>
    </div>
  )
}

