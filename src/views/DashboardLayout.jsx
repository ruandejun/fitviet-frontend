import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../api';
import Overview from './Overview';
import Cards from './Cards';
import Users from './Users';
import Profiles from './Profiles';
import Proxies from './Proxies';
import Emails from './Emails';
import Accounts from './Accounts';
import HWIDs from './HWIDs';
import Notifications from './Notifications';

// 2FA Totp helpers
function base32ToBytes(base32) {
    const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    base32 = base32.replace(/\s/g, "").replace(/=/g, "").toUpperCase();
    const len = base32.length;
    const bytes = new Uint8Array(Math.floor((len * 5) / 8));
    
    let val = 0;
    let bits = 0;
    let index = 0;
    
    for (let i = 0; i < len; i++) {
        const idx = base32chars.indexOf(base32[i]);
        if (idx === -1) continue;
        
        val = (val << 5) | idx;
        bits += 5;
        
        if (bits >= 8) {
            bytes[index++] = (val >>> (bits - 8)) & 255;
            bits -= 8;
        }
    }
    return bytes;
}

async function calculateTotp(secret) {
    try {
        const cleanSecret = secret.replace(/\s/g, "").replace(/=/g, "").toUpperCase();
        if (!cleanSecret) return null;
        
        const keyBytes = base32ToBytes(cleanSecret);
        if (keyBytes.length === 0) return null;
        
        const epoch = Math.floor(Date.now() / 1000 / 30);
        
        const counterBytes = new Uint8Array(8);
        let temp = epoch;
        for (let i = 7; i >= 0; i--) {
            counterBytes[i] = temp & 0xff;
            temp = Math.floor(temp / 256);
        }
        
        const cryptoKey = await window.crypto.subtle.importKey(
            "raw",
            keyBytes,
            { name: "HMAC", hash: { name: "SHA-1" } },
            false,
            ["sign"]
        );
        
        const signature = await window.crypto.subtle.sign(
            "HMAC",
            cryptoKey,
            counterBytes
        );
        
        const hmac = new Uint8Array(signature);
        const offset = hmac[hmac.length - 1] & 0xf;
        const code = ((hmac[offset] & 0x7f) << 24) |
                     ((hmac[offset + 1] & 0xff) << 16) |
                     ((hmac[offset + 2] & 0xff) << 8) |
                     (hmac[offset + 3] & 0xff);
        
        const otp = code % 1000000;
        return otp.toString().padStart(6, '0');
    } catch (err) {
        console.error(err);
        return null;
    }
}

import QuickNotes from './QuickNotes';

export default function DashboardLayout({ currentUser, onLogout, initialTab, initialNoteId }) {
    // Helper to get initial URL parameters synchronously
    const getInitialUrlState = () => {
        const params = new URLSearchParams(window.location.search);
        const tab = initialTab || params.get('tab') || 'overview';
        const page = parseInt(params.get('page')) || 1;
        return { tab, page };
    };

    const urlState = getInitialUrlState();
    const [currentTab, setCurrentTab] = useState(urlState.tab);
    const [currentPage, setCurrentPage] = useState(urlState.page);
    const [noteId, setNoteId] = useState(initialNoteId || '7wrqsn');
    const [visitedTabs, setVisitedTabs] = useState(new Set([urlState.tab]));

    const [unreadNotifCount, setUnreadNotifCount] = useState(0);
    const [headerNotifOpen, setHeaderNotifOpen] = useState(false);
    const [headerNotifs, setHeaderNotifs] = useState([]);
    
    // 2FA Modal states
    const [twoFaOpen, setTwoFaOpen] = useState(false);
    const [twoFaSecret, setTwoFaSecret] = useState('');
    const [twoFaCode, setTwoFaCode] = useState('');
    const [twoFaSeconds, setTwoFaSeconds] = useState(30);
    const twoFaIntervalRef = useRef(null);

    // Sidebar mobile visibility
    const [sidebarVisible, setSidebarVisible] = useState(false);

    // Load initial routing state from URL query parameters
    useEffect(() => {
        const handlePopState = () => {
            const pathname = window.location.pathname;
            const isDashboardPath = pathname.startsWith('/dashboard');
            if (isDashboardPath) {
                const params = new URLSearchParams(window.location.search);
                const tab = params.get('tab') || 'overview';
                const page = parseInt(params.get('page')) || 1;
                setCurrentTab(tab);
                setCurrentPage(page);
            } else {
                const parts = pathname.split('/').filter(Boolean);
                if (parts.length === 1 && /^[a-zA-Z0-9]+$/.test(parts[0])) {
                    setCurrentTab('notes');
                    setNoteId(parts[0]);
                }
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // Sync state changes back to URL query parameters
    const handleSwitchTab = (tabName, pageNum = 1) => {
        setCurrentTab(tabName);
        setCurrentPage(pageNum);
        
        setVisitedTabs(prev => {
            const next = new Set(prev);
            next.add(tabName);
            return next;
        });
        
        if (tabName === 'notes') {
            window.history.replaceState({}, '', `/${noteId}/`);
        } else {
            const url = new URL(window.location.href);
            url.pathname = '/dashboard/';
            url.searchParams.set('tab', tabName);
            url.searchParams.set('page', pageNum);
            // Clean up any note_id parameter if we switch away from notes
            url.searchParams.delete('note_id');
            window.history.replaceState({}, '', url.toString());
        }

        // Close sidebar on mobile
        setSidebarVisible(false);
    };

    // Load notification counts
    const fetchNotificationCount = async () => {
        try {
            const resp = await apiRequest('/dashboard/api/notifications/');
            if (resp.ok) {
                const data = await resp.json();
                const notifications = data.results || data || [];
                const unread = notifications.filter(n => !n.is_read);
                setUnreadNotifCount(unread.length);
                setHeaderNotifs(notifications.slice(0, 5)); // show latest 5
            }
        } catch (err) {
            console.error("Error loading notification badge counts: ", err);
        }
    };

    useEffect(() => {
        fetchNotificationCount();
        const countInterval = setInterval(fetchNotificationCount, 30000);
        return () => clearInterval(countInterval);
    }, []);

    // Automatically apply data-label and cell-chk to table cells for mobile responsive views
    useEffect(() => {
        const updateTableLabels = (table) => {
            const ths = Array.from(table.querySelectorAll('thead th'));
            const rows = table.querySelectorAll('tbody tr');
            rows.forEach(row => {
                const tds = row.querySelectorAll('td');
                tds.forEach((td, idx) => {
                    if (idx < ths.length) {
                        const label = ths[idx].innerText.trim();
                        // Automatically tag checkbox cells with cell-chk
                        if (td.querySelector('input[type="checkbox"]')) {
                            td.classList.add('cell-chk');
                        }
                        
                        if (label && label !== 'STT' && !td.querySelector('input[type="checkbox"]') && !td.classList.contains('cell-chk')) {
                            td.setAttribute('data-label', label);
                        } else {
                            td.removeAttribute('data-label');
                        }
                    }
                });
            });
        };

        const processAllTables = () => {
            document.querySelectorAll('.table-container table').forEach(updateTableLabels);
        };

        // Run immediately
        processAllTables();

        // Observe changes to the DOM to handle dynamic tables/rows rendering
        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) {
                    shouldUpdate = true;
                    break;
                }
            }
            if (shouldUpdate) {
                processAllTables();
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        return () => observer.disconnect();
    }, [currentTab]);

    // Mark notifications as read
    const markAllNotificationsAsRead = async (e) => {
        if (e) e.stopPropagation();
        try {
            const resp = await apiRequest('/dashboard/api/notifications/mark_all_read/', {
                method: 'POST'
            });
            if (resp.ok) {
                fetchNotificationCount();
            }
        } catch (err) {
            console.error(err);
        }
    };

    // 2FA modal handlers
    const openTwoFaModal = () => {
        const saved = localStorage.getItem('last_dashboard_2fa_secret') || '';
        setTwoFaSecret(saved);
        setTwoFaOpen(true);
        if (saved) {
            startTotpGeneration(saved);
        }
    };

    const closeTwoFaModal = () => {
        setTwoFaOpen(false);
        if (twoFaIntervalRef.current) {
            clearInterval(twoFaIntervalRef.current);
            twoFaIntervalRef.current = null;
        }
        setTwoFaCode('');
    };

    const startTotpGeneration = (secretInput) => {
        if (twoFaIntervalRef.current) {
            clearInterval(twoFaIntervalRef.current);
        }

        const updateOtp = async () => {
            const code = await calculateTotp(secretInput);
            if (code) {
                setTwoFaCode(code);
                const remaining = 30 - (Math.floor(Date.now() / 1000) % 30);
                setTwoFaSeconds(remaining);
            } else {
                alert('Mã 2FA không hợp lệ. Vui lòng kiểm tra lại.');
                if (twoFaIntervalRef.current) {
                    clearInterval(twoFaIntervalRef.current);
                    twoFaIntervalRef.current = null;
                }
                setTwoFaCode('');
            }
        };

        updateOtp();
        twoFaIntervalRef.current = setInterval(updateOtp, 1000);
    };

    const handleGetTwoFaCode = () => {
        if (!twoFaSecret.trim()) {
            alert('Vui lòng nhập mã bảo mật 2FA');
            return;
        }
        localStorage.setItem('last_dashboard_2fa_secret', twoFaSecret.trim());
        startTotpGeneration(twoFaSecret.trim());
    };

    const copyTwoFaCode = () => {
        if (!twoFaCode) return;
        navigator.clipboard.writeText(twoFaCode).then(() => {
            alert('Đã sao chép mã 2FA: ' + twoFaCode);
        });
    };

    const titleMap = {
        'overview': 'Tổng quan hệ thống',
        'cards': 'Quản lý Thẻ (API & Database)',
        'users': 'Quản lý Người dùng (Client)',
        'profiles': 'MunLogin Profiles',
        'proxies': 'Tor Proxies Management',
        'emails': 'Email Database Management',
        'accounts': 'Tài khoản MunLogin đã tạo',
        'hwids': '🖱️ HWID Manager — Quản lý máy tính được phép',
        'notifications': 'Thông báo của tôi',
        'notes': `Ghi chú nhanh: ${noteId}`
    };

    return (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', width: '100%' }}>
            {/* Sidebar Overlay */}
            <div className={`sidebar-overlay ${sidebarVisible ? 'active' : ''}`} onClick={() => setSidebarVisible(false)}></div>

            {/* Sidebar */}
            <div className={`sidebar ${sidebarVisible ? 'active' : ''}`} style={{ display: 'flex' }}>
                <div>
                    <a href="#" onClick={(e) => { e.preventDefault(); handleSwitchTab('overview'); }} className="sidebar-brand" style={{ textDecoration: 'none', color: 'inherit', display: 'flex' }}>
                        <span className="menu-icon" style={{ fontSize: '20px' }}>🚀</span>
                        <h1 className="menu-text">fitviet</h1>
                    </a>
                    <div className="sidebar-menu">
                        {currentUser ? (
                            <>
                                <a className={`menu-item ${currentTab === 'overview' ? 'active' : ''}`} onClick={() => handleSwitchTab('overview')}>
                                    <span className="menu-icon">📊</span><span className="menu-text">Tổng quan</span>
                                </a>
                                <a className={`menu-item ${currentTab === 'cards' ? 'active' : ''}`} onClick={() => handleSwitchTab('cards')}>
                                    <span className="menu-icon">💳</span><span className="menu-text">Quản lý Thẻ</span>
                                </a>
                                {currentUser.is_staff && (
                                    <a className={`menu-item ${currentTab === 'users' ? 'active' : ''}`} onClick={() => handleSwitchTab('users')}>
                                        <span className="menu-icon">👥</span><span className="menu-text">Quản lý User</span>
                                    </a>
                                )}
                                <a className={`menu-item ${currentTab === 'profiles' ? 'active' : ''}`} onClick={() => handleSwitchTab('profiles')}>
                                    <span className="menu-icon">🖥️</span><span className="menu-text">Profiles</span>
                                </a>
                                <a className={`menu-item ${currentTab === 'proxies' ? 'active' : ''}`} onClick={() => handleSwitchTab('proxies')}>
                                    <span className="menu-icon">🌐</span><span className="menu-text">Tor Proxies</span>
                                </a>
                                <a className={`menu-item ${currentTab === 'emails' ? 'active' : ''}`} onClick={() => handleSwitchTab('emails')}>
                                    <span className="menu-icon">✉️</span><span className="menu-text">Quản lý Email</span>
                                </a>
                                <a className={`menu-item ${currentTab === 'accounts' ? 'active' : ''}`} onClick={() => handleSwitchTab('accounts')}>
                                    <span className="menu-icon">🔑</span><span className="menu-text">Tài khoản đã tạo</span>
                                </a>
                                {currentUser.is_staff && (
                                    <a className={`menu-item ${currentTab === 'hwids' ? 'active' : ''}`} onClick={() => handleSwitchTab('hwids')}>
                                        <span className="menu-icon">🖱️</span><span className="menu-text">HWID Manager</span>
                                    </a>
                                )}
                                <a className={`menu-item ${currentTab === 'notifications' ? 'active' : ''}`} onClick={() => handleSwitchTab('notifications')}>
                                    <span className="menu-icon">🔔</span>
                                    <span className="menu-text">
                                        Thông báo 
                                        {unreadNotifCount > 0 && (
                                            <span className="badge-unread-count" style={{ display: 'inline-block', background: 'var(--danger)', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '10px', marginLeft: '10px', fontWeight: 700 }}>
                                                {unreadNotifCount}
                                            </span>
                                        )}
                                    </span>
                                </a>
                            </>
                        ) : null}
                        <a className={`menu-item ${currentTab === 'notes' ? 'active' : ''}`} onClick={() => handleSwitchTab('notes')}>
                            <span className="menu-icon">📝</span><span className="menu-text">Ghi chú nhanh</span>
                        </a>
                        <a className="menu-item" onClick={openTwoFaModal}>
                            <span className="menu-icon">🔑</span><span className="menu-text">Trình tạo 2FA</span>
                        </a>
                    </div>
                </div>
                <div className="sidebar-footer" style={{ padding: '15px' }}>
                    {currentUser ? (
                        <>
                            <div className="user-info menu-text">
                                <span className="user-name">{currentUser.username}</span>
                                <span className="user-role">{currentUser.is_staff ? 'Quản trị viên' : 'Khách hàng'}</span>
                            </div>
                            <button className="logout-btn" onClick={onLogout} title="Đăng xuất" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="menu-icon">🚪</span><span className="menu-text">Thoát</span>
                            </button>
                        </>
                    ) : (
                        <a href="/dashboard/" className="menu-item" style={{ width: '100%', justifyContent: 'center', border: '1px dashed var(--border-color)', gap: '8px', padding: '10px' }}>
                            <span>🔑</span><span className="menu-text">Đăng nhập</span>
                        </a>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="main-content" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                {/* Header */}
                <div className="top-header">
                    <button className="sidebar-toggle-btn" onClick={() => setSidebarVisible(!sidebarVisible)}>☰</button>
                    <div className="header-title">
                        <h2>{titleMap[currentTab] || 'Dashboard'}</h2>
                    </div>

                    <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '15px', marginLeft: 'auto', position: 'relative' }}>
                        <div 
                            className="notif-bell-container" 
                            style={{ 
                                position: 'relative', 
                                cursor: 'pointer', 
                                padding: '8px', 
                                borderRadius: '50%', 
                                background: 'rgba(255, 255, 255, 0.02)', 
                                border: '1px solid var(--border-color)', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                width: '40px', 
                                height: '40px', 
                                transition: 'all 0.3s ease' 
                            }}
                            onClick={() => setHeaderNotifOpen(!headerNotifOpen)}
                        >
                            <span style={{ fontSize: '18px' }}>🔔</span>
                            {unreadNotifCount > 0 && (
                                <span className="badge-unread-count" style={{ display: 'block', position: 'absolute', top: '-2px', right: '-2px', background: 'var(--danger)', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '9px', fontWeight: 700, textAlign: 'center', lineHeight: '16px' }}>
                                    {unreadNotifCount}
                                </span>
                            )}
                        </div>

                        {/* Popover list */}
                        {headerNotifOpen && (
                            <div className="notif-dropdown" style={{ display: 'block', position: 'absolute', top: '50px', right: 0, width: '340px', background: '#0f1224', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.6)', zIndex: 1000, overflow: 'hidden', padding: '15px 0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 15px 10px 15px', borderBottom: '1px solid var(--border-color)' }}>
                                    <span style={{ fontWeight: 700, fontSize: '14px' }}>Thông báo mới</span>
                                    <span style={{ fontSize: '11px', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }} onClick={markAllNotificationsAsRead}>Đọc tất cả</span>
                                </div>
                                <div style={{ maxHeight: '280px', overflowY: 'auto', padding: '5px 0' }}>
                                    {headerNotifs.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '15px', color: 'var(--text-muted)' }}>Không có thông báo</div>
                                    ) : (
                                        headerNotifs.map((n, i) => (
                                            <div key={i} className={`notification-item ${n.is_read ? '' : 'unread'}`} style={{ padding: '8px 15px', fontSize: '13px' }}>
                                                <div>{n.message}</div>
                                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{new Date(n.created_at).toLocaleString('vi-VN')}</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div style={{ textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '5px' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }} onClick={() => { setHeaderNotifOpen(false); handleSwitchTab('notifications'); }}>Xem tất cả thông báo</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* View Content Porting - Keep-alive pattern with visited-tabs check */}
                <div style={{ 
                    flex: 1, 
                    overflow: currentTab === 'notes' ? 'hidden' : 'auto', 
                    padding: currentTab === 'notes' ? '0' : '24px', 
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{ display: currentTab === 'overview' ? 'block' : 'none' }}>
                        {currentUser && visitedTabs.has('overview') && <Overview currentUser={currentUser} onSwitchTab={handleSwitchTab} />}
                    </div>
                    <div style={{ display: currentTab === 'cards' ? 'block' : 'none' }}>
                        {currentUser && visitedTabs.has('cards') && <Cards currentUser={currentUser} page={currentPage} onPageChange={(p) => handleSwitchTab('cards', p)} />}
                    </div>
                    {currentUser?.is_staff && (
                        <div style={{ display: currentTab === 'users' ? 'block' : 'none' }}>
                            {visitedTabs.has('users') && <Users currentUser={currentUser} page={currentPage} onPageChange={(p) => handleSwitchTab('users', p)} />}
                         </div>
                    )}
                    <div style={{ display: currentTab === 'profiles' ? 'block' : 'none' }}>
                        {currentUser && visitedTabs.has('profiles') && <Profiles currentUser={currentUser} page={currentPage} onPageChange={(p) => handleSwitchTab('profiles', p)} />}
                    </div>
                    <div style={{ display: currentTab === 'proxies' ? 'block' : 'none' }}>
                        {currentUser && visitedTabs.has('proxies') && <Proxies currentUser={currentUser} page={currentPage} onPageChange={(p) => handleSwitchTab('proxies', p)} />}
                    </div>
                    <div style={{ display: currentTab === 'emails' ? 'block' : 'none' }}>
                        {currentUser && visitedTabs.has('emails') && <Emails currentUser={currentUser} page={currentPage} onPageChange={(p) => handleSwitchTab('emails', p)} />}
                    </div>
                    <div style={{ display: currentTab === 'accounts' ? 'block' : 'none' }}>
                        {currentUser && visitedTabs.has('accounts') && <Accounts currentUser={currentUser} page={currentPage} onPageChange={(p) => handleSwitchTab('accounts', p)} />}
                    </div>
                    {currentUser?.is_staff && (
                        <div style={{ display: currentTab === 'hwids' ? 'block' : 'none' }}>
                            {visitedTabs.has('hwids') && <HWIDs currentUser={currentUser} page={currentPage} onPageChange={(p) => handleSwitchTab('hwids', p)} />}
                        </div>
                    )}
                    <div style={{ display: currentTab === 'notifications' ? 'block' : 'none' }}>
                        {currentUser && visitedTabs.has('notifications') && <Notifications fetchNotificationCount={fetchNotificationCount} />}
                    </div>
                    <div style={{ display: currentTab === 'notes' ? 'block' : 'none', flex: 1, height: '100%' }}>
                        {visitedTabs.has('notes') && (
                            <QuickNotes 
                                noteId={noteId} 
                                currentUser={currentUser} 
                                onLogout={onLogout} 
                                isEmbedded={true} 
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* 2FA Authenticator Modal */}
            {twoFaOpen && (
                <div className="modal-overlay" style={{ display: 'flex' }} onClick={(e) => { if (e.target.className === 'modal-overlay') closeTwoFaModal(); }}>
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>🔑 Trình tạo mã 2FA</h3>
                            <button className="modal-close" onClick={closeTwoFaModal}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
                                Nhập mã bảo mật 2FA (Base32 secret) của bạn để nhận mã xác thực OTP 6 số.
                            </p>
                            <div className="form-group">
                                <label className="form-label" htmlFor="twoFaSecret">Mã bảo mật 2FA (Secret Key)</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    placeholder="Ví dụ: JBSWY3DPEBLW64TBNQ..." 
                                    style={{ textTransform: 'uppercase' }}
                                    value={twoFaSecret}
                                    onChange={(e) => setTwoFaSecret(e.target.value)}
                                />
                            </div>
                            {twoFaCode && (
                                <div className="form-group" style={{ display: 'block', marginTop: '20px' }}>
                                    <label className="form-label">Mã xác thực của bạn (OTP Code)</label>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <input type="text" className="two-fa-code-display" value={twoFaCode} readOnly style={{ letterSpacing: '2px', fontWeight: 'bold' }} />
                                        <button className="btn btn-primary" onClick={copyTwoFaCode} style={{ padding: '10px 16px' }}>Sao chép</button>
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
                                        Hiệu lực còn lại: <strong>{twoFaSeconds}</strong> giây
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={closeTwoFaModal}>Đóng</button>
                            <button className="btn btn-primary" onClick={handleGetTwoFaCode}>Lấy mã (Get Code)</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
