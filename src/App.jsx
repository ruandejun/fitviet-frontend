import React, { useState, useEffect } from 'react';
import { apiRequest } from './api';
import Login from './views/Login';
import Register from './views/Register';
import ForgotPassword from './views/ForgotPassword';
import DashboardLayout from './views/DashboardLayout';

export default function App() {
    const [authChecked, setAuthChecked] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [authScreen, setAuthScreen] = useState('login'); // login, register, forgot

    const checkAuth = async () => {
        try {
            const response = await apiRequest('/dashboard/api/me/');
            if (response.ok) {
                const data = await response.json();
                setCurrentUser(data);
            } else {
                setCurrentUser(null);
            }
        } catch (err) {
            console.error("Auth check failed:", err);
            setCurrentUser(null);
        } finally {
            setAuthChecked(true);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const handleLoginSuccess = () => {
        checkAuth();
    };

    const handleLogout = async () => {
        try {
            await apiRequest('/dashboard/logout/', { method: 'POST' });
        } catch (err) {
            console.error(err);
        }
        setCurrentUser(null);
        window.location.reload();
    };

    if (!authChecked) {
        return (
            <div style={{
                display: 'flex',
                height: '100vh',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#070913',
                color: '#f8fafc',
                fontFamily: 'Outfit, sans-serif'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>Fitviet Admin Dashboard 🚀</div>
                    <div style={{ color: '#94a3b8' }}>Đang kết nối hệ thống...</div>
                </div>
            </div>
        );
    }

    if (!currentUser) {
        return (
            <div style={{
                display: 'flex',
                minHeight: '100vh',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#080b11',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Background orbs */}
                <div className="glowing-orb orb-primary"></div>
                <div className="glowing-orb orb-accent"></div>

                {authScreen === 'login' && (
                    <Login onLoginSuccess={handleLoginSuccess} onSwitchForm={setAuthScreen} />
                )}
                {authScreen === 'register' && (
                    <Register onRegisterSuccess={handleLoginSuccess} onSwitchForm={setAuthScreen} />
                )}
                {authScreen === 'forgot' && (
                    <ForgotPassword onSwitchForm={setAuthScreen} />
                )}
            </div>
        );
    }

    return (
        <DashboardLayout currentUser={currentUser} onLogout={handleLogout} />
    );
}
