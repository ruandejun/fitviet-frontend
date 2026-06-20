import React, { useState } from 'react';
import { apiRequest } from '../api';

export default function Login({ onLoginSuccess, onSwitchForm }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await apiRequest('/dashboard/login/', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });
            const data = await response.json();

            if (response.ok && data.success) {
                onLoginSuccess();
            } else {
                setError(data.message || 'Sai tài khoản hoặc mật khẩu.');
                setLoading(false);
            }
        } catch (err) {
            setError('Lỗi kết nối máy chủ. Vui lòng kiểm tra mạng.');
            setLoading(false);
        }
    };

    return (
        <div className="login-card">
            <div className="logo-header">
                <h1>Fitviet Portal 🚀</h1>
                <p>Hệ thống quản lý dịch vụ và khách hàng</p>
            </div>

            {error && <div className="error-message" style={{ display: 'block' }}>{error}</div>}

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label" htmlFor="username">TÀI KHOẢN</label>
                    <input
                        className="form-input"
                        type="text"
                        id="username"
                        placeholder="Nhập tên đăng nhập"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        autoComplete="username"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="password">MẬT KHẨU</label>
                    <input
                        className="form-input"
                        type="password"
                        id="password"
                        placeholder="Nhập mật khẩu"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                    />
                </div>

                <button type="submit" className="login-btn" disabled={loading}>
                    {loading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
                </button>

                <div className="auth-links">
                    <a href="#" onClick={(e) => { e.preventDefault(); onSwitchForm('register'); }}>Đăng ký tài khoản</a>
                    <a href="#" onClick={(e) => { e.preventDefault(); onSwitchForm('forgot'); }}>Quên mật khẩu?</a>
                </div>
            </form>

            <p className="footer-note">Fitviet Management Dashboard &copy; 2026. All rights reserved.</p>
        </div>
    );
}
