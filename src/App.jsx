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
    const isDashboardPath = pathname.startsWith('/dashboard');
    const noteIdFromPath = getNoteIdFromPath();
    const [noteId, setNoteId] = useState(noteIdFromPath);
    
    // The current tab name (default to 'overview' if on /dashboard, or 'notes' if on note paths)
    const getInitialTab = () => {
        if (isDashboardPath) {
            const params = new URLSearchParams(window.location.search);
            return params.get('tab') || 'overview';
        }
        return 'notes';
    };
    
    const [activeTab, setActiveTab] = useState(getInitialTab);

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
        const currentId = getNoteIdFromPath();
        if (currentId) {
            setNoteId(currentId);
            if (!isDashboardPath) {
                setActiveTab('notes');
            }
        } else if (pathname === '/' || pathname === '') {
            const generatedId = generateRandomNoteId();
            window.history.replaceState(null, '', `/${generatedId}/`);
            setNoteId(generatedId);
            setActiveTab('notes');
        } else if (isDashboardPath) {
            const params = new URLSearchParams(window.location.search);
            const tabParam = params.get('tab') || 'overview';
            setActiveTab(tabParam);
            const noteIdParam = params.get('note_id');
            if (noteIdParam) {
                setNoteId(noteIdParam);
            }
        }
    }, [pathname, isDashboardPath]);

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
                backgroundColor: '#03050c',
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

    // Protected tabs list
    const isTabProtected = (tabName) => {
        return tabName !== 'notes';
    };

    // If user is visiting a protected tab but is not logged in, show Auth screens
    if (isTabProtected(activeTab) && !currentUser) {
        return (
            <div style={{
                display: 'flex',
                minHeight: '100vh',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#03050c',
                position: 'relative',
                overflow: 'hidden'
            }}>
                {/* Background orbs */}
                <div className="glowing-orb orb-1" style={{ width: '400px', height: '400px', background: '#d946ef', top: '-100px', left: '-100px', opacity: 0.3 }}></div>
                <div className="glowing-orb orb-2" style={{ width: '350px', height: '350px', background: '#00f2fe', bottom: '-80px', right: '-80px', opacity: 0.3 }}></div>

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

    // Render unified DashboardLayout for both guests (tab === 'notes') and logged in users
    return (
        <DashboardLayout 
            currentUser={currentUser} 
            onLogout={handleLogout} 
            initialTab={activeTab}
            initialNoteId={noteId}
        />
    );
}
