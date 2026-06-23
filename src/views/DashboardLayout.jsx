import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../api';
import Overview from './Overview';
import Cards from './Cards';
import Users from './Users';
import Profiles from './Profiles';
import Proxies from './Proxies';
import Emails from './Emails';
import HWIDs from './HWIDs';
import Notifications from './Notifications';
import GetInfo from './GetInfo';

// QHTD Desktop-only components (only rendered when running inside desktop app)
import QHTDDevice from './QHTDDevice';
import QHTDAutomation from './QHTDAutomation';
import IPADowngrade from './IPADowngrade';
import QHTDRouting from './QHTDRouting';
import TorManager from './TorManager';

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
import { US_ADDRESSES, US_FIRST_NAMES, US_LAST_NAMES, US_AREA_CODES, US_STATE_NAMES, randItem, generateUSPhone } from './usAddressData';
import Login from './Login';
import Register from './Register';
import ForgotPassword from './ForgotPassword';

// Polyfill clipboard for non-secure HTTP contexts
try {
    if (!navigator.clipboard) {
        const fallbackClipboard = {
            writeText: (text) => {
                return new Promise((resolve, reject) => {
                    try {
                        const textArea = document.createElement("textarea");
                        textArea.value = text;
                        textArea.style.top = "0";
                        textArea.style.left = "0";
                        textArea.style.position = "fixed";
                        textArea.style.opacity = "0";
                        document.body.appendChild(textArea);
                        textArea.focus();
                        textArea.select();
                        const successful = document.execCommand('copy');
                        document.body.removeChild(textArea);
                        if (successful) {
                            resolve();
                        } else {
                            reject(new Error("Fallback copy failed"));
                        }
                    } catch (err) {
                        reject(err);
                    }
                });
            }
        };
        try {
            Object.defineProperty(navigator, 'clipboard', {
                value: fallbackClipboard,
                configurable: true,
                writable: true
            });
        } catch (err) {
            navigator.clipboard = fallbackClipboard;
        }
    }
} catch (e) {
    console.warn("Failed to polyfill navigator.clipboard:", e);
}

export default function DashboardLayout({ currentUser, onLogout, initialTab, initialNoteId, theme, toggleTheme }) {
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

    // QHTD Desktop detection via User-Agent or QWebChannel bridge
    const [isDesktopApp, setIsDesktopApp] = useState(() => {
        return navigator.userAgent.includes('QHTD-Desktop') || !!(window.__QHTD_DESKTOP__ || window.qhtdBridge);
    });
    useEffect(() => {
        // Check immediately and also with a small delay (bridge may load async)
        const checkDesktop = () => {
            if (navigator.userAgent.includes('QHTD-Desktop') || window.__QHTD_DESKTOP__ || window.qhtdBridge) {
                setIsDesktopApp(true);
                console.log('[c69.us] QHTD Desktop bridge detected');
            }
        };
        checkDesktop();
        const timer = setTimeout(checkDesktop, 1000);
        const timer2 = setTimeout(checkDesktop, 3000);
        return () => { clearTimeout(timer); clearTimeout(timer2); };
    }, []);

    // Toast state
    const [toastMessage, setToastMessage] = useState('');
    const [showToast, setShowToast] = useState(false);

    const triggerToast = (msg) => {
        setToastMessage(msg);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
    };

    // Address Modal states
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [addressData, setAddressData] = useState({ name: '—', address: '—', city: '—', state: '—', zip: '—', phone: '—' });
    const [copiedField, setCopiedField] = useState(null);

    // Auth Modal states
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [authModalScreen, setAuthModalScreen] = useState('login'); // login, register, forgot

    // User Info Modal states
    const [showUserInfoModal, setShowUserInfoModal] = useState(false);

    // US Address generation logic
    const handleGenerateAddress = () => {
        const addr = randItem(US_ADDRESSES);
        const fullName = `${randItem(US_FIRST_NAMES)} ${randItem(US_LAST_NAMES)}`;
        const phone = generateUSPhone();
        setAddressData({
            name: fullName,
            address: addr.address,
            city: addr.city,
            state: US_STATE_NAMES[addr.state] || addr.state,
            zip: addr.zip,
            phone: phone
        });
        setCopiedField(null);
        triggerToast('🇺🇸 Đã tạo địa chỉ mới!');
    };

    const handleCopyAddressField = (field, text) => {
        if (text === '—') return;
        navigator.clipboard.writeText(text).then(() => {
            setCopiedField(field);
            triggerToast(`Đã copy: ${text}`);
            setTimeout(() => setCopiedField(null), 2000);
        });
    };

    const handleCopyAllAddress = () => {
        if (addressData.name === '—') {
            triggerToast('Vui lòng tạo địa chỉ trước!');
            return;
        }
        const fullText = `${addressData.name}\n${addressData.address}\n${addressData.city}, ${addressData.state} ${addressData.zip}\nPhone: ${addressData.phone}`;
        navigator.clipboard.writeText(fullText).then(() => {
            triggerToast('📑 Đã copy toàn bộ địa chỉ!');
        });
    };

    // Mail retrieval logic mapping Graph API/Local IMAP
    const isMicrosoftEmail = (email) => {
        if (!email) return false;
        const emailLower = email.toLowerCase();
        return ['@hotmail.', '@outlook.', '@live.', '@msn.'].some(dom => emailLower.includes(dom));
    };

    const readMailboxClientSide = async (emailId, emailObj = null) => {
        if (!emailObj) {
            const resp = await apiRequest(`/dashboard/api/emails/${emailId}/`);
            if (!resp.ok) {
                throw new Error(`Không thể lấy thông tin email ID: ${emailId}`);
            }
            emailObj = await resp.json();
        }

        const emailAddr = emailObj.email;
        if (!isMicrosoftEmail(emailAddr)) {
            const resp = await apiRequest(`/dashboard/api/emails/${emailId}/read-mailbox/`);
            const data = await resp.json();
            if (!resp.ok || !data.success) {
                throw new Error(data.message || 'Lỗi IMAP khi đọc hộp thư.');
            }
            return data;
        }

        // Fetch Microsoft Graph token
        const tokenResp = await apiRequest(`/dashboard/api/emails/${emailId}/get-access-token/`);
        if (!tokenResp.ok) {
            let errMsg = 'Không thể lấy access token từ backend.';
            try {
                const errData = await tokenResp.json();
                errMsg = errData.message || errMsg;
            } catch (e) {}
            throw new Error(errMsg);
        }
        const tokenData = await tokenResp.json();
        const accessToken = tokenData.access_token;
        const configFlow = tokenData.flow || 'ropc';
        const hasRefreshToken = tokenData.has_refresh_token;

        let msgUrl = "https://graph.microsoft.com/v1.0/me/messages?$top=15";
        if (!hasRefreshToken && configFlow === 'client_credentials') {
            msgUrl = `https://graph.microsoft.com/v1.0/users/${emailAddr}/messages?$top=15`;
        }

        const msgResp = await fetch(msgUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });

        if (!msgResp.ok) {
            const msgErrText = await msgResp.text();
            throw new Error(`Lỗi Graph API: ${msgErrText}`);
        }

        const msgData = await msgResp.json();
        const emailsList = msgData.value || [];
        
        const parsedEmails = emailsList.map(m => {
            const fromDict = m.from || m.sender || {};
            const emailAddrObj = fromDict.emailAddress || {};
            const fromName = emailAddrObj.name || '';
            const fromEmail = emailAddrObj.address || '';
            const fromSender = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

            const subject = m.subject || '(Không có tiêu đề)';
            const receivedTime = m.receivedDateTime || '';
            let dateStr = receivedTime;
            if (receivedTime.includes('T') && receivedTime.includes('Z')) {
                try {
                    const dt = receivedTime.replace('Z', '').split('.')[0];
                    const parts = dt.split('T');
                    dateStr = `${parts[0]} ${parts[1]}`;
                } catch (err) {}
            }

            const bodyDict = m.body || {};
            const bodyContent = bodyDict.content || '';
            let snippet = m.bodyPreview || '';
            if (!snippet && bodyContent) {
                let cleanBody = bodyContent.trim();
                if (cleanBody.toLowerCase().includes('<html') || cleanBody.toLowerCase().includes('<body') || cleanBody.toLowerCase().includes('<div')) {
                    cleanBody = cleanBody.replace(/<[^>]+>/g, '');
                    cleanBody = cleanBody.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                }
                cleanBody = cleanBody.replace(/\s+/g, ' ').trim();
                snippet = cleanBody.slice(0, 200) + (cleanBody.length > 200 ? '...' : '');
            }

            return {
                from: fromSender,
                subject: subject,
                date: dateStr,
                snippet: snippet,
                body: bodyContent
            };
        });

        // Save results to DB
        const savePayload = {};
        if (parsedEmails.length > 0) {
            savePayload.latest_email = parsedEmails[0];
        }

        const saveResp = await apiRequest(`/dashboard/api/emails/${emailId}/save-mailbox-results/`, {
            method: 'POST',
            body: JSON.stringify(savePayload)
        });

        let updatedEmailData = emailObj;
        if (saveResp.ok) {
            const saveData = await saveResp.json();
            if (saveData.success) {
                updatedEmailData = saveData.email_data;
            }
        }

        return {
            success: true,
            emails: parsedEmails,
            email_data: updatedEmailData
        };
    };

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
            url.pathname = '/';
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
                        
                        if (label && label !== 'STT' && label !== '#' && !td.querySelector('input[type="checkbox"]') && !td.classList.contains('cell-chk')) {
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
        'getinfo': '✉️ Lấy Info',
        'cards': 'Quản lý Thẻ (API & Database)',
        'users': 'Quản lý Người dùng (Client)',
        'profiles': 'MunLogin Profiles',
        'proxies': 'Tor Proxies Management',
        'emails': 'Quản lý Email & Tài khoản',
        'hwids': '🖱️ HWID Manager — Quản lý máy tính được phép',
        'notifications': 'Thông báo của tôi',
        'notes': 'Ghi chú',
        'qhtd-device': '📱 Thiết bị iOS — QHTD Desktop',
        'qhtd-auto': '🤖 Tự Động — QHTD Desktop',
        'ipa-downgrade': '📲 IPA Downgrade',
        'qhtd-routing': '🌐 Định tuyến mạng',
    };

    return (
        <div className="dashboard-container" style={{ display: 'flex', height: '100vh', overflow: 'hidden', width: '100%', position: 'relative' }}>
            {/* Background orbs */}
            <div className="glowing-orb orb-primary" style={{ zIndex: 0 }}></div>
            <div className="glowing-orb orb-accent" style={{ zIndex: 0 }}></div>

            {/* Sidebar Overlay */}
            <div className={`sidebar-overlay ${sidebarVisible ? 'active' : ''}`} onClick={() => setSidebarVisible(false)}></div>

            {/* Sidebar */}
            <div className={`sidebar ${sidebarVisible ? 'active' : ''}`} style={{ display: 'flex' }}>
                <a href="#" onClick={(e) => { e.preventDefault(); handleSwitchTab('overview'); }} className="sidebar-brand" style={{ textDecoration: 'none', color: 'inherit', display: 'flex' }}>
                        <span className="menu-icon" style={{ fontSize: '20px' }}>🚀</span>
                        <h1 className="menu-text">c69</h1>
                    </a>
                    <div className="sidebar-menu">
                        <a className={`menu-item ${currentTab === 'overview' ? 'active' : ''}`} onClick={() => handleSwitchTab('overview')}>
                            <span className="menu-icon">📊</span><span className="menu-text">Tổng quan</span>
                        </a>
                        <a className={`menu-item ${currentTab === 'getinfo' ? 'active' : ''}`} onClick={() => handleSwitchTab('getinfo')}>
                            <span className="menu-icon">✉️</span><span className="menu-text">Lấy Info</span>
                        </a>
                        {currentUser ? (
                            <>
                                <a className={`menu-item ${currentTab === 'cards' ? 'active' : ''}`} onClick={() => handleSwitchTab('cards')}>
                                    <span className="menu-icon">💳</span><span className="menu-text">Quản lý Thẻ</span>
                                </a>
                                {currentUser.is_staff && (
                                    <a className={`menu-item ${currentTab === 'users' ? 'active' : ''}`} onClick={() => handleSwitchTab('users')}>
                                        <span className="menu-icon">👥</span><span className="menu-text">Quản lý User</span>
                                    </a>
                                )}
                                <a className={`menu-item ${currentTab === 'emails' ? 'active' : ''}`} onClick={() => handleSwitchTab('emails')}>
                                    <span className="menu-icon">✉️</span><span className="menu-text">Quản lý Email</span>
                                </a>
                            </>
                        ) : null}
                        <a className={`menu-item ${currentTab === 'notes' ? 'active' : ''}`} onClick={() => handleSwitchTab('notes')}>
                            <span className="menu-icon">📝</span><span className="menu-text">Ghi chú nhanh</span>
                        </a>
                        <a className="menu-item" onClick={() => { setShowAddressModal(true); handleGenerateAddress(); setSidebarVisible(false); }}>
                            <span className="menu-icon">🇺🇸</span><span className="menu-text">USA Địa chỉ</span>
                        </a>
                        <a className="menu-item" onClick={() => { openTwoFaModal(); setSidebarVisible(false); }}>
                            <span className="menu-icon">🔑</span><span className="menu-text">Trình tạo 2FA</span>
                        </a>
                        {currentUser ? (
                            <>
                                <a className={`menu-item ${currentTab === 'profiles' ? 'active' : ''}`} onClick={() => handleSwitchTab('profiles')}>
                                    <span className="menu-icon">🖥️</span><span className="menu-text">Profiles</span>
                                </a>
                                {/* QHTD Desktop-only tabs */}
                                {isDesktopApp && (
                                    <>
                                        <div style={{ padding: '8px 16px', fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px', marginTop: '8px', fontWeight: 700 }}>
                                            <span className="menu-text">⚡ QHTD Desktop</span>
                                        </div>
                                        <a className={`menu-item ${currentTab === 'proxies' ? 'active' : ''}`} onClick={() => handleSwitchTab('proxies')}>
                                            <span className="menu-icon">🌐</span><span className="menu-text">Tor Proxies</span>
                                        </a>
                                        <a className={`menu-item ${currentTab === 'ipa-downgrade' ? 'active' : ''}`} onClick={() => handleSwitchTab('ipa-downgrade')}>
                                            <span className="menu-icon">📲</span><span className="menu-text">IPA Downgrade</span>
                                        </a>
                                        <a className={`menu-item ${currentTab === 'qhtd-device' ? 'active' : ''}`} onClick={() => handleSwitchTab('qhtd-device')}>
                                            <span className="menu-icon">📱</span><span className="menu-text">Thiết bị iOS</span>
                                        </a>
                                        <a className={`menu-item ${currentTab === 'qhtd-auto' ? 'active' : ''}`} onClick={() => handleSwitchTab('qhtd-auto')}>
                                            <span className="menu-icon">🤖</span><span className="menu-text">Tự Động</span>
                                        </a>
                                        <a className={`menu-item ${currentTab === 'qhtd-routing' ? 'active' : ''}`} onClick={() => handleSwitchTab('qhtd-routing')}>
                                            <span className="menu-icon">🌐</span><span className="menu-text">Định tuyến</span>
                                        </a>
                                    </>
                                )}
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
                    </div>
            </div>

            {/* Main Content */}
            <div className="main-content" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', position: 'relative', zIndex: 10 }}>
                {/* Header */}
                <div className="top-header">
                    <button className="sidebar-toggle-btn" onClick={() => setSidebarVisible(!sidebarVisible)}>☰</button>
                    <div className="header-title">
                        <h2>{titleMap[currentTab] || 'Dashboard'}</h2>
                    </div>

                    <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto', position: 'relative' }}>
                        {/* Theme Toggle Button */}
                        <button 
                            onClick={toggleTheme} 
                            style={{ 
                                background: 'rgba(255, 255, 255, 0.02)', 
                                border: '1px solid var(--border-color)', 
                                borderRadius: '50%', 
                                width: '40px', 
                                height: '40px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                cursor: 'pointer', 
                                fontSize: '18px',
                                color: 'var(--text-color)',
                                transition: 'all 0.3s ease'
                            }}
                            title="Chuyển giao diện"
                        >
                            🌓
                        </button>

                        {/* Notification Bell */}
                        {currentUser && (
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
                        )}

                        {/* Login/User Button */}
                        {currentUser ? (
                            <button 
                                onClick={() => setShowUserInfoModal(true)} 
                                style={{ 
                                    background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))', 
                                    border: 'none', 
                                    borderRadius: '10px', 
                                    padding: '8px 16px', 
                                    color: 'white', 
                                    fontWeight: '600', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px', 
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    height: '40px'
                                }}
                                title="Xem thông tin tài khoản"
                            >
                                👤 <span className="header-username">{currentUser.username}</span>
                            </button>
                        ) : (
                            <button 
                                onClick={() => { setAuthModalScreen('login'); setShowAuthModal(true); }}
                                style={{ 
                                    background: 'linear-gradient(135deg, var(--accent), var(--primary))', 
                                    border: 'none',
                                    borderRadius: '10px', 
                                    padding: '8px 16px', 
                                    color: 'white', 
                                    fontWeight: '600', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '6px', 
                                    fontSize: '13px',
                                    height: '40px',
                                    cursor: 'pointer'
                                }}
                            >
                                🔑 <span className="header-login-text">Đăng nhập</span>
                            </button>
                        )}

                        {/* Popover list */}
                        {headerNotifOpen && (
                            <div className="notif-dropdown" style={{ display: 'block', position: 'absolute', top: '50px', right: 0, width: '340px', background: 'var(--modal-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.6)', zIndex: 1000, overflow: 'hidden', padding: '15px 0' }}>
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
                <div className={`view-content-wrapper ${currentTab === 'notes' ? 'notes-tab-content' : ''}`} style={{ 
                    flex: 1, 
                    overflow: currentTab === 'notes' ? 'hidden' : 'auto', 
                    padding: currentTab === 'notes' ? '0' : '24px', 
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{ display: currentTab === 'overview' ? 'block' : 'none' }}>
                        {visitedTabs.has('overview') && (
                            <Overview 
                                currentUser={currentUser} 
                                onSwitchTab={handleSwitchTab} 
                                openEmailGetModal={() => handleSwitchTab('getinfo')}
                                openAddressModal={() => { setShowAddressModal(true); handleGenerateAddress(); }}
                                openTwoFaModal={openTwoFaModal}
                            />
                        )}
                    </div>
                    <div style={{ display: currentTab === 'getinfo' ? 'block' : 'none' }}>
                        {visitedTabs.has('getinfo') && (
                            <GetInfo 
                                currentUser={currentUser} 
                                triggerToast={triggerToast} 
                                isMicrosoftEmail={isMicrosoftEmail} 
                                readMailboxClientSide={readMailboxClientSide} 
                            />
                        )}
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
                    <div style={{ display: currentTab === 'emails' ? 'block' : 'none' }}>
                        {currentUser && visitedTabs.has('emails') && <Emails currentUser={currentUser} page={currentPage} onPageChange={(p) => handleSwitchTab('emails', p)} />}
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
                                theme={theme}
                            />
                        )}
                    </div>
                    {/* QHTD Desktop-only views */}
                    {isDesktopApp && (
                        <>
                            <div style={{ display: currentTab === 'proxies' ? 'block' : 'none' }}>
                                {currentUser && visitedTabs.has('proxies') && <TorManager />}
                            </div>
                            <div style={{ display: currentTab === 'ipa-downgrade' ? 'block' : 'none' }}>
                                {visitedTabs.has('ipa-downgrade') && <IPADowngrade />}
                            </div>
                            <div style={{ display: currentTab === 'qhtd-device' ? 'block' : 'none' }}>
                                {visitedTabs.has('qhtd-device') && <QHTDDevice />}
                            </div>
                            <div style={{ display: currentTab === 'qhtd-auto' ? 'block' : 'none' }}>
                                {visitedTabs.has('qhtd-auto') && <QHTDAutomation />}
                            </div>
                            <div style={{ display: currentTab === 'qhtd-routing' ? 'block' : 'none' }}>
                                {visitedTabs.has('qhtd-routing') && <QHTDRouting />}
                            </div>
                        </>
                    )}
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

            {/* US Address Modal */}
            {showAddressModal && (
                <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowAddressModal(false)}>
                    <div className="addr-modal-box" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                                <span style={{ fontSize: '22px' }}>🇺🇸</span> Địa chỉ Mỹ ngẫu nhiên
                            </h3>
                            <button onClick={() => setShowAddressModal(false)} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer' }}>✕</button>
                        </div>

                        <div>
                            {Object.entries(addressData).map(([key, val]) => (
                                <div className="addr-field" key={key}>
                                    <div className="addr-field-info">
                                        <div className="addr-field-label">
                                            {key === 'name' ? 'Họ và tên (Full Name)' :
                                             key === 'address' ? 'Địa chỉ (Address)' :
                                             key === 'city' ? 'Thành phố (City)' :
                                             key === 'state' ? 'Bang (State)' :
                                             key === 'zip' ? 'Mã bưu chính (Zip Code)' : 'Số điện thoại (Phone)'}
                                        </div>
                                        <div className="addr-field-value">{val}</div>
                                    </div>
                                    <button
                                        className={`addr-copy-btn ${copiedField === key ? 'copied' : ''}`}
                                        onClick={() => handleCopyAddressField(key, val)}
                                    >
                                        {copiedField === key ? '✅ Đã copy' : '📋 Copy'}
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="email-get-buttons" style={{ marginTop: '18px' }}>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleGenerateAddress}>🎲 Tạo địa chỉ mới</button>
                            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleCopyAllAddress}>📑 Copy toàn bộ</button>
                        </div>
                    </div>
                </div>
            )}
            {/* Auth Modal (Login / Register / Forgot Password) */}
            {showAuthModal && (
                <div className="modal-overlay" style={{ display: 'flex', zIndex: 9999 }} onClick={() => setShowAuthModal(false)}>
                    <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', width: '95%', maxWidth: '440px', display: 'flex', flexDirection: 'column' }}>
                        <button onClick={() => setShowAuthModal(false)} style={{ position: 'absolute', top: '25px', right: '25px', background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer', zIndex: 20 }}>✕</button>
                        {authModalScreen === 'login' && (
                            <Login onLoginSuccess={() => { setShowAuthModal(false); window.location.reload(); }} onSwitchForm={setAuthModalScreen} />
                        )}
                        {authModalScreen === 'register' && (
                            <Register onRegisterSuccess={() => { setShowAuthModal(false); window.location.reload(); }} onSwitchForm={setAuthModalScreen} />
                        )}
                        {authModalScreen === 'forgot' && (
                            <ForgotPassword onSwitchForm={setAuthModalScreen} />
                        )}
                    </div>
                </div>
            )}

            {/* User Info Modal */}
            {showUserInfoModal && currentUser && (
                <div className="modal-overlay" style={{ display: 'flex', zIndex: 9999 }} onClick={() => setShowUserInfoModal(false)}>
                    <div className="addr-modal-box" onClick={(e) => e.stopPropagation()} style={{ position: 'relative', maxWidth: '400px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                                👤 Thông tin tài khoản
                            </h3>
                            <button onClick={() => setShowUserInfoModal(false)} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer' }}>✕</button>
                        </div>

                        <div style={{ padding: '10px 0' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Tên đăng nhập:</span>
                                    <strong style={{ color: 'var(--text-color)', fontSize: '13px' }}>{currentUser.username}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Email:</span>
                                    <strong style={{ color: 'var(--text-color)', fontSize: '13px' }}>{currentUser.email || '-'}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Vai trò:</span>
                                    <strong style={{ color: 'var(--text-color)', fontSize: '13px' }}>
                                        {currentUser.is_superuser ? 'Quản trị viên cấp cao' :
                                         currentUser.is_staff ? 'Quản trị viên' : 'Thành viên'}
                                    </strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Ngày tham gia:</span>
                                    <strong style={{ color: 'var(--text-color)', fontSize: '13px' }}>{currentUser.date_joined || '-'}</strong>
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '15px', borderTop: '1px solid var(--border-color)' }}>
                            <a href="/dashboard/" className="btn btn-primary" style={{ textDecoration: 'none', flex: 1, textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '36px', fontSize: '13px' }}>Vào quản trị</a>
                            <button onClick={() => { setShowUserInfoModal(false); onLogout(); }} className="btn btn-danger" style={{ flex: 1, height: '36px', fontSize: '13px', background: '#ef4444', borderColor: '#ef4444', color: 'white' }}>Đăng xuất</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Global Toast component */}
            {showToast && <div className="toast">{toastMessage}</div>}
        </div>
    );
}
