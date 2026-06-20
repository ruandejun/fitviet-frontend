import React, { useState } from 'react';
import { apiRequest } from '../api';

export default function ForgotPassword({ onSwitchForm }) {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const response = await apiRequest('/dashboard/forgot-password/', {
                method: 'POST',
                body: JSON.stringify({ email })
            });
            const data = await response.json();

            if (response.ok && data.success) {
                setMessage(data.message || 'Email khôi phục mật khẩu đã được gửi.');
                setIsSuccess(true);
                setEmail('');
            } else {
                setError(data.message || 'Không thể gửi yêu cầu đặt lại mật khẩu.');
            }
        } catch (err) {
            setError('Lỗi kết nối máy chủ. Vui lòng kiểm tra mạng.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-card">
            <div className="logo-header">
                <h1>Quên Mật Khẩu 🔒</h1>
                <p>Nhập email để khôi phục mật khẩu</p>
            </div>

            {error && <div className="error-message" style={{ display: 'block' }}>{error}</div>}
            {message && (
                <div 
                    className="error-message" 
                    style={{ 
                        display: 'block', 
                        background: 'rgba(16, 185, 129, 0.1)', 
                        borderColor: 'rgba(16, 185, 129, 0.2)', 
                        color: '#10b981' 
                    }}
                >
                    {message}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label" htmlFor="forgotEmail">EMAIL KHÔI PHỤC</label>
                    <input
                        className="form-input"
                        type="email"
                        id="forgotEmail"
                        placeholder="Nhập email đăng ký tài khoản"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                    />
                </div>

                <button type="submit" className="login-btn" disabled={loading}>
                    {loading ? 'Đang gửi yêu cầu...' : 'Gửi Yêu Cầu'}
                </button>

                <div className="auth-links center">
                    <a href="#" onClick={(e) => { e.preventDefault(); onSwitchForm('login'); }}>Quay lại Đăng nhập</a>
                </div>
            </form>

            <p className="footer-note">Fitviet Management Dashboard &copy; 2026. All rights reserved.</p>
        </div>
    );
}
