import React, { useState } from 'react';
import { apiRequest } from '../api';

export default function Register({ onRegisterSuccess, onSwitchForm }) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp.');
            return;
        }

        setLoading(true);

        try {
            const response = await apiRequest('/dashboard/register/', {
                method: 'POST',
                body: JSON.stringify({
                    username,
                    email,
                    password,
                    confirm_password: confirmPassword
                })
            });
            const data = await response.json();

            if (response.ok && data.success) {
                onRegisterSuccess();
            } else {
                setError(data.message || 'Đăng ký thất bại. Vui lòng thử lại.');
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
                <h1>Đăng Ký 📝</h1>
                <p>Tạo tài khoản khách hàng mới</p>
            </div>

            {error && <div className="error-message" style={{ display: 'block' }}>{error}</div>}

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="form-label" htmlFor="regUsername">TÊN ĐĂNG NHẬP</label>
                    <input
                        className="form-input"
                        type="text"
                        id="regUsername"
                        placeholder="Từ 6-30 ký tự (chữ, số, . _)"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        autoComplete="username"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="regEmail">EMAIL</label>
                    <input
                        className="form-input"
                        type="email"
                        id="regEmail"
                        placeholder="Nhập địa chỉ email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="regPassword">MẬT KHẨU</label>
                    <input
                        className="form-input"
                        type="password"
                        id="regPassword"
                        placeholder="Nhập mật khẩu bảo mật"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label" htmlFor="regConfirmPassword">XÁC NHẬN MẬT KHẨU</label>
                    <input
                        className="form-input"
                        type="password"
                        id="regConfirmPassword"
                        placeholder="Nhập lại mật khẩu"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                    />
                </div>

                <button type="submit" className="login-btn" disabled={loading}>
                    {loading ? 'Đang đăng ký...' : 'Đăng Ký'}
                </button>

                <div className="auth-links center">
                    <a href="#" onClick={(e) => { e.preventDefault(); onSwitchForm('login'); }}>Đã có tài khoản? Đăng nhập</a>
                </div>
            </form>

            <p className="footer-note">Fitviet Management Dashboard &copy; 2026. All rights reserved.</p>
        </div>
    );
}
