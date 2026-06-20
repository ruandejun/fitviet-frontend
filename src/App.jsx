import React, { useState, useEffect } from 'react';
import { apiRequest } from './api';
import Login from './views/Login';
import Register from './views/Register';
import ForgotPassword from './views/ForgotPassword';
import DashboardLayout from './views/DashboardLayout';
import QuickNotes from './views/QuickNotes';

// Helper to generate a random 6-character alphanumeric note ID
const generateRandomNoteId = (length = 6) => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// Helper to extract note ID from path if it is valid alphanumeric
const getNoteIdFromPath = () => {
    const pathname = window.location.pathname;
    const parts = pathname.split('/').filter(Boolean);
    if (parts.length === 1 && /^[a-zA-Z0-9]+$/.test(parts[0])) {
        return parts[0];
    }
    return null;
};

export default function App() {
    const [authChecked, setAuthChecked] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [authScreen, setAuthScreen] = useState('login'); // login, register, forgot

    const pathname = window.location.pathname;
    const isDashboard = pathname.startsWith('/dashboard');
    const [noteId, setNoteId] = useState(getNoteIdFromPath);

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

    // Redirect or set note ID on root path
    useEffect(() => {
        if (!isDashboard) {
            const currentId = getNoteIdFromPath();
            if (currentId) {
                setNoteId(currentId);
            } else if (pathname === '/' || pathname === '') {
                const generatedId = generateRandomNoteId();
                window.history.replaceState(null, '', `/${generatedId}/`);
                setNoteId(generatedId);
            }
        }
    }, [pathname, isDashboard]);

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

    if (!isDashboard) {
        if (!noteId) {
            return (
                <div style={{
                    display: 'flex',
                    height: '100vh',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#0b0f19',
                    color: '#e2e8f0',
                    fontFamily: 'Outfit, sans-serif'
                }}>
                    <div>Đang tạo ghi chú...</div>
                </div>
            );
        }
        return (
            <QuickNotes
                noteId={noteId}
                currentUser={currentUser}
                onLogout={handleLogout}
            />
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
