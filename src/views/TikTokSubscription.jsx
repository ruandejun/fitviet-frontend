import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../api';

export default function TikTokSubscription({ currentUser, triggerToast }) {
    // ── Apple Accounts State ──
    const [appleAccounts, setAppleAccounts] = useState([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);
    
    // ── Login Modal State ──
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [loginStep, setLoginStep] = useState('credentials'); // 'credentials', '2fa', 'success'
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginForm, setLoginForm] = useState({ apple_id: '', password: '', proxy: '' });
    const [loginSessionId, setLoginSessionId] = useState('');
    const [code2FA, setCode2FA] = useState('');
    const [loginMessage, setLoginMessage] = useState('');
    
    // ── Subscription Task State ──
    const [showSubModal, setShowSubModal] = useState(false);
    const [subLoading, setSubLoading] = useState(false);
    const [subForm, setSubForm] = useState({ session_id: '', tiktok_username: '', tier_id: '' });
    const [tiktokUserInfo, setTiktokUserInfo] = useState(null);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [subTiers, setSubTiers] = useState([]);
    
    // ── Task History State ──
    const [taskHistory, setTaskHistory] = useState([]);
    const [taskLogs, setTaskLogs] = useState([]);
    
    // ── Payment Card Modal State ──
    const [showCardModal, setShowCardModal] = useState(false);
    const [cardLoading, setCardLoading] = useState(false);
    const [cardSessionId, setCardSessionId] = useState('');
    const [cardForm, setCardForm] = useState({
        card_number: '', expiry_month: '', expiry_year: '',
        cvv: '', first_name: '', last_name: '',
        address_line1: '', city: '', zip_code: '', country_code: 'VN', phone: ''
    });
    const [cardMessage, setCardMessage] = useState('');
    const [accountPaymentInfo, setAccountPaymentInfo] = useState(null);
    
    // ── Active Tab ──
    const [activePanel, setActivePanel] = useState('accounts'); // 'accounts', 'tasks', 'history'
    
    const lookupTimeout = useRef(null);

    // ── Load accounts on mount ──
    useEffect(() => {
        fetchAccounts();
        fetchDefaultTiers();
    }, []);
    
    const fetchAccounts = async () => {
        setLoadingAccounts(true);
        try {
            const res = await apiRequest('/dashboard/api/apple-sub/accounts/');
            if (res.ok) {
                const data = await res.json();
                setAppleAccounts(data.accounts || []);
            }
        } catch (e) {
            console.error('Fetch accounts error:', e);
        } finally {
            setLoadingAccounts(false);
        }
    };
    
    const fetchDefaultTiers = async () => {
        try {
            const res = await apiRequest('/dashboard/api/apple-sub/tiktok-tiers/');
            if (res.ok) {
                const data = await res.json();
                setSubTiers(data.tiers || []);
            }
        } catch (e) {
            console.error('Fetch tiers error:', e);
        }
    };

    // ── Apple Login Flow ──
    const handleLoginSubmit = async () => {
        if (!loginForm.apple_id || !loginForm.password) {
            setLoginMessage('⚠️ Vui lòng nhập đầy đủ Apple ID và Password!');
            return;
        }
        setLoginLoading(true);
        setLoginMessage('');
        
        try {
            const res = await apiRequest('/dashboard/api/apple-sub/login/', {
                method: 'POST',
                body: JSON.stringify({
                    apple_id: loginForm.apple_id,
                    password: loginForm.password,
                    proxy: loginForm.proxy || undefined,
                })
            });
            const data = await res.json();
            
            if (data.requires_2fa) {
                setLoginSessionId(data.session_id);
                setLoginStep('2fa');
                setLoginMessage('📲 Mã xác minh 2FA đã được gửi tới thiết bị tin cậy. Vui lòng nhập mã 6 số.');
                addLog('🔑 Apple yêu cầu xác minh 2FA cho ' + loginForm.apple_id);
            } else if (data.success) {
                setLoginStep('success');
                setLoginMessage('✅ Đăng nhập thành công!');
                addLog('✅ Apple ID ' + loginForm.apple_id + ' đã đăng nhập thành công!');
                fetchAccounts();
            } else {
                setLoginMessage('❌ ' + (data.message || 'Đăng nhập thất bại'));
                addLog('❌ Login failed: ' + (data.message || 'Unknown error'));
            }
        } catch (e) {
            setLoginMessage('❌ Lỗi kết nối: ' + e.message);
        } finally {
            setLoginLoading(false);
        }
    };
    
    const handleVerify2FA = async () => {
        if (!code2FA || code2FA.length !== 6) {
            setLoginMessage('⚠️ Mã 2FA phải đúng 6 chữ số!');
            return;
        }
        setLoginLoading(true);
        setLoginMessage('');
        
        try {
            const res = await apiRequest('/dashboard/api/apple-sub/verify-2fa/', {
                method: 'POST',
                body: JSON.stringify({
                    session_id: loginSessionId,
                    code_2fa: code2FA,
                })
            });
            const data = await res.json();
            
            if (data.success) {
                setLoginStep('success');
                setLoginMessage('✅ Xác minh 2FA thành công! Token đã được lưu.');
                addLog('✅ 2FA verified for ' + loginForm.apple_id);
                fetchAccounts();
                setTimeout(() => {
                    setShowLoginModal(false);
                    resetLoginForm();
                    if (triggerToast) triggerToast('🎉 Apple Account đã xác thực thành công!');
                }, 1500);
            } else {
                setLoginMessage('❌ ' + (data.message || 'Mã 2FA không chính xác'));
            }
        } catch (e) {
            setLoginMessage('❌ Lỗi: ' + e.message);
        } finally {
            setLoginLoading(false);
        }
    };
    
    const resetLoginForm = () => {
        setLoginForm({ apple_id: '', password: '', proxy: '' });
        setLoginStep('credentials');
        setCode2FA('');
        setLoginMessage('');
        setLoginSessionId('');
    };

    // ── Payment Card Flow ──
    const openCardModal = async (sessionId) => {
        setCardSessionId(sessionId);
        setCardForm({ card_number: '', expiry_month: '', expiry_year: '', cvv: '', first_name: '', last_name: '', address_line1: '', city: '', zip_code: '', country_code: 'VN', phone: '' });
        setCardMessage('');
        setAccountPaymentInfo(null);
        setShowCardModal(true);
        
        // Fetch current payment info
        try {
            const res = await apiRequest('/dashboard/api/apple-sub/account-info/', {
                method: 'POST', body: JSON.stringify({ session_id: sessionId })
            });
            if (res.ok) {
                const data = await res.json();
                setAccountPaymentInfo(data);
            }
        } catch (e) { console.error('Account info error:', e); }
    };
    
    const handleAddCard = async () => {
        if (!cardForm.card_number || !cardForm.expiry_month || !cardForm.expiry_year || !cardForm.cvv || !cardForm.first_name || !cardForm.last_name) {
            setCardMessage('⚠️ Vui lòng nhập đầy đủ thông tin thẻ!');
            return;
        }
        setCardLoading(true);
        setCardMessage('');
        addLog(`💳 Đang thêm thẻ ****${cardForm.card_number.replace(/\s/g, '').slice(-4)} vào Apple Account...`);
        
        try {
            const res = await apiRequest('/dashboard/api/apple-sub/add-payment/', {
                method: 'POST',
                body: JSON.stringify({ session_id: cardSessionId, ...cardForm })
            });
            const data = await res.json();
            
            if (data.success) {
                setCardMessage(`✅ ${data.message}`);
                addLog(`✅ Thêm thẻ ${data.card_type} ****${data.last_four} thành công!`);
                if (triggerToast) triggerToast(`🎉 Thêm thẻ ${data.card_type} ****${data.last_four} thành công!`);
                setTimeout(() => setShowCardModal(false), 2000);
            } else {
                setCardMessage(`❌ ${data.message}`);
                addLog(`❌ Thêm thẻ thất bại: ${data.message}`);
            }
        } catch (e) {
            setCardMessage(`❌ Lỗi: ${e.message}`);
        } finally {
            setCardLoading(false);
        }
    };
    
    const detectCardType = (num) => {
        const n = num.replace(/\s/g, '');
        if (n.startsWith('4')) return { type: 'Visa', color: '#1a1f71', icon: '💳' };
        if (/^5[1-5]/.test(n) || /^2[2-7]/.test(n)) return { type: 'MasterCard', color: '#eb001b', icon: '🔴' };
        if (/^3[47]/.test(n)) return { type: 'Amex', color: '#006fcf', icon: '💎' };
        if (/^62/.test(n)) return { type: 'UnionPay', color: '#e21836', icon: '🏦' };
        if (/^35/.test(n)) return { type: 'JCB', color: '#0e4c96', icon: '🗾' };
        return { type: '', color: '#666', icon: '💳' };
    };
    
    const formatCardNumber = (val) => {
        const nums = val.replace(/\D/g, '').slice(0, 16);
        return nums.replace(/(\d{4})(?=\d)/g, '$1 ');
    };

    // ── TikTok Username Lookup ──
    const handleTiktokLookup = (username) => {
        setSubForm(prev => ({ ...prev, tiktok_username: username }));
        setTiktokUserInfo(null);
        
        if (lookupTimeout.current) clearTimeout(lookupTimeout.current);
        
        const clean = username.replace('@', '').trim();
        if (clean.length < 2) return;
        
        lookupTimeout.current = setTimeout(async () => {
            setLookupLoading(true);
            try {
                const res = await apiRequest(`/dashboard/api/apple-sub/tiktok-lookup/?username=${encodeURIComponent(clean)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setTiktokUserInfo(data);
                    }
                }
            } catch (e) {
                console.error('TikTok lookup error:', e);
            } finally {
                setLookupLoading(false);
            }
        }, 600);
    };

    // ── Subscription Purchase ──
    const handlePurchase = async () => {
        if (!subForm.session_id) {
            if (triggerToast) triggerToast('⚠️ Vui lòng chọn Apple Account!');
            return;
        }
        if (!subForm.tiktok_username.replace('@', '').trim()) {
            if (triggerToast) triggerToast('⚠️ Vui lòng nhập TikTok Username!');
            return;
        }
        
        setSubLoading(true);
        addLog(`🚀 Bắt đầu đăng ký subscription cho @${subForm.tiktok_username.replace('@', '')}...`);
        
        try {
            const res = await apiRequest('/dashboard/api/apple-sub/purchase/', {
                method: 'POST',
                body: JSON.stringify({
                    session_id: subForm.session_id,
                    tiktok_username: subForm.tiktok_username,
                    tier_id: subForm.tier_id || undefined,
                })
            });
            const data = await res.json();
            
            if (data.success) {
                addLog(`🎉 Subscription thành công! TxID: ${data.purchase_result?.transaction_id || 'N/A'}`);
                if (triggerToast) triggerToast('🎉 Đăng ký subscription thành công!');
                
                // Add to history
                setTaskHistory(prev => [{
                    id: `SUB-${Date.now()}`,
                    date: new Date().toISOString().split('T')[0],
                    tiktok_user: data.tiktok_user?.username || subForm.tiktok_username,
                    apple_id: appleAccounts.find(a => a.session_id === subForm.session_id)?.apple_id || '',
                    tier: subForm.tier_id || 'Tier 1',
                    status: 'success',
                    transaction_id: data.purchase_result?.transaction_id || '',
                }, ...prev]);
                
                setShowSubModal(false);
            } else {
                addLog(`❌ Lỗi tại bước "${data.step || 'unknown'}": ${data.message}`);
                if (triggerToast) triggerToast(`❌ ${data.message}`);
            }
        } catch (e) {
            addLog(`❌ Connection error: ${e.message}`);
        } finally {
            setSubLoading(false);
        }
    };

    // ── Log Helper ──
    const addLog = (msg) => {
        setTaskLogs(prev => [{ time: new Date().toLocaleTimeString(), msg }, ...prev].slice(0, 50));
    };

    // ── Inline Styles ──
    const cardStyle = {
        background: 'var(--modal-bg, rgba(15, 23, 42, 0.6))',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '20px',
        backdropFilter: 'blur(10px)',
    };
    
    const inputStyle = {
        width: '100%',
        padding: '10px 14px',
        borderRadius: '8px',
        border: '1px solid var(--border-color)',
        background: 'rgba(0,0,0,0.25)',
        color: 'var(--text-color)',
        fontSize: '13px',
        outline: 'none',
        transition: 'border-color 0.2s',
        boxSizing: 'border-box',
    };
    
    const btnPrimary = {
        background: 'linear-gradient(135deg, #fe2c55, #ff0050)',
        color: 'white',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '10px',
        fontWeight: 700,
        fontSize: '13px',
        cursor: 'pointer',
        boxShadow: '0 4px 15px rgba(254, 44, 85, 0.3)',
        transition: 'all 0.2s ease',
    };
    
    const btnSecondary = {
        background: 'rgba(255,255,255,0.05)',
        color: 'var(--text-color)',
        border: '1px solid var(--border-color)',
        padding: '10px 20px',
        borderRadius: '10px',
        fontWeight: 600,
        fontSize: '13px',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
    };

    const authenticatedAccounts = appleAccounts.filter(a => a.authenticated);

    return (
        <div style={{ color: 'var(--text-color)', fontFamily: 'Inter, Roboto, sans-serif' }}>
            
            {/* ═══════ TOP HEADER ═══════ */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(254, 44, 85, 0.12), rgba(37, 244, 238, 0.08))',
                border: '1px solid rgba(254, 44, 85, 0.25)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                backdropFilter: 'blur(12px)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '56px', height: '56px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #fe2c55, #25f4ee)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '28px',
                        boxShadow: '0 8px 24px rgba(254, 44, 85, 0.4)'
                    }}>
                        🎵
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800, letterSpacing: '-0.5px' }}>
                            TikTok Subscription Automation
                        </h2>
                        <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                            Đăng ký tự động TikTok LIVE Sub qua Apple ID • GrandSlam SRP-6a Auth • Anisette Server
                        </p>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '8px 16px', borderRadius: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Apple Accounts</div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#10b981' }}>{authenticatedAccounts.length}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '8px 16px', borderRadius: '10px', textAlign: 'center' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Tasks Done</div>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: '#3b82f6' }}>{taskHistory.filter(t => t.status === 'success').length}</div>
                    </div>
                </div>
            </div>

            {/* ═══════ NAVIGATION TABS ═══════ */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                {[
                    { key: 'accounts', icon: '🍎', label: `Apple Accounts (${appleAccounts.length})` },
                    { key: 'tasks', icon: '⚡', label: 'Tạo Subscription' },
                    { key: 'history', icon: '📜', label: `Lịch sử (${taskHistory.length})` },
                ].map(tab => (
                    <button key={tab.key}
                        onClick={() => setActivePanel(tab.key)}
                        style={{
                            padding: '10px 20px',
                            borderRadius: '10px',
                            border: activePanel === tab.key ? 'none' : '1px solid var(--border-color)',
                            background: activePanel === tab.key ? 'linear-gradient(135deg, #fe2c55, #ff0050)' : 'rgba(255,255,255,0.03)',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '13px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: activePanel === tab.key ? '0 4px 15px rgba(254, 44, 85, 0.3)' : 'none',
                        }}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            {/* ═══════ PANEL 1: APPLE ACCOUNTS ═══════ */}
            {activePanel === 'accounts' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
                            Apple ID đã xác thực
                        </h3>
                        <button onClick={() => { resetLoginForm(); setShowLoginModal(true); }} style={btnPrimary}>
                            + Thêm Apple Account
                        </button>
                    </div>
                    
                    {appleAccounts.length === 0 ? (
                        <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 20px' }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>🍎</div>
                            <h3 style={{ margin: '0 0 8px', fontWeight: 700, color: 'var(--text-muted)' }}>Chưa có Apple Account nào</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '0 0 20px' }}>
                                Thêm Apple ID để bắt đầu tự động đăng ký TikTok Subscription
                            </p>
                            <button onClick={() => { resetLoginForm(); setShowLoginModal(true); }} style={btnPrimary}>
                                Thêm Apple Account đầu tiên
                            </button>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                            {appleAccounts.map(acc => (
                                <div key={acc.session_id} style={{
                                    ...cardStyle,
                                    border: `1px solid ${acc.authenticated ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                                    position: 'relative'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                                        <div style={{
                                            width: '44px', height: '44px', borderRadius: '50%',
                                            background: acc.authenticated ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px'
                                        }}>
                                            {acc.authenticated ? '🟢' : '🟡'}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: '14px' }}>{acc.apple_id}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                {acc.authenticated ? 'Đã xác thực ✓' : 'Chờ 2FA...'}
                                            </div>
                                        </div>
                                        <span style={{
                                            fontSize: '10px', fontWeight: 700, padding: '4px 8px', borderRadius: '20px',
                                            textTransform: 'uppercase',
                                            background: acc.authenticated ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                            color: acc.authenticated ? '#10b981' : '#f59e0b',
                                        }}>
                                            {acc.authenticated ? 'Active' : 'Pending'}
                                        </span>
                                    </div>
                                    
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                                        🌐 Proxy: <span style={{ color: 'var(--text-color)', fontWeight: 600 }}>{acc.proxy || 'Direct'}</span>
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                                        🔑 Token: <span style={{ color: 'var(--text-color)', fontWeight: 600, fontFamily: 'monospace' }}>
                                            {acc.account_info?.token_preview || 'N/A'}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '10px' }}>
                                        🕐 Kết nối lúc: {acc.created_at}
                                    </div>
                                    
                                    {acc.authenticated && (
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                            <button 
                                                onClick={() => { 
                                                    setSubForm(prev => ({ ...prev, session_id: acc.session_id }));
                                                    setActivePanel('tasks');
                                                }}
                                                style={{ ...btnSecondary, flex: 1, fontSize: '12px' }}
                                            >
                                                ⚡ Subscribe
                                            </button>
                                            <button 
                                                onClick={() => openCardModal(acc.session_id)}
                                                style={{ ...btnSecondary, flex: 1, fontSize: '12px', borderColor: 'rgba(59,130,246,0.4)', color: '#3b82f6' }}
                                            >
                                                💳 Thêm thẻ
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ═══════ PANEL 2: CREATE SUBSCRIPTION TASK ═══════ */}
            {activePanel === 'tasks' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                    {/* LEFT: Task Form */}
                    <div style={cardStyle}>
                        <h3 style={{ margin: '0 0 20px', fontSize: '16px', fontWeight: 700 }}>
                            ⚡ Tạo Subscription Task
                        </h3>
                        
                        {/* Select Apple Account */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                                🍎 Apple Account
                            </label>
                            {authenticatedAccounts.length === 0 ? (
                                <div style={{ padding: '12px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '8px', fontSize: '12px', color: '#f59e0b' }}>
                                    ⚠️ Chưa có Apple Account. <span style={{ textDecoration: 'underline', cursor: 'pointer' }} onClick={() => { setActivePanel('accounts'); setTimeout(() => { resetLoginForm(); setShowLoginModal(true); }, 100); }}>Thêm ngay →</span>
                                </div>
                            ) : (
                                <select
                                    value={subForm.session_id}
                                    onChange={e => setSubForm(prev => ({ ...prev, session_id: e.target.value }))}
                                    style={{ ...inputStyle, cursor: 'pointer' }}
                                >
                                    <option value="">-- Chọn Apple Account --</option>
                                    {authenticatedAccounts.map(acc => (
                                        <option key={acc.session_id} value={acc.session_id} style={{ background: '#1e293b' }}>
                                            🍎 {acc.apple_id} ({acc.proxy || 'Direct'})
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                        
                        {/* TikTok Username */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                                🎵 TikTok Username nhận Sub
                            </label>
                            <input
                                type="text"
                                placeholder="@creator_name"
                                value={subForm.tiktok_username}
                                onChange={e => handleTiktokLookup(e.target.value)}
                                style={inputStyle}
                            />
                            
                            {/* Lookup Result */}
                            {lookupLoading && (
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>⏳ Đang tra cứu...</div>
                            )}
                            {tiktokUserInfo && (
                                <div style={{
                                    marginTop: '8px', padding: '10px',
                                    background: 'rgba(16, 185, 129, 0.08)',
                                    border: '1px solid rgba(16, 185, 129, 0.2)',
                                    borderRadius: '8px',
                                    display: 'flex', alignItems: 'center', gap: '10px'
                                }}>
                                    {tiktokUserInfo.avatar && (
                                        <img src={tiktokUserInfo.avatar} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                                    )}
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: '13px' }}>
                                            @{tiktokUserInfo.username}
                                            {tiktokUserInfo.verified && <span style={{ color: '#3b82f6', marginLeft: '4px' }}>✓</span>}
                                        </div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                            {tiktokUserInfo.nickname} • {(tiktokUserInfo.followers || 0).toLocaleString()} followers
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>
                                        ID: {tiktokUserInfo.user_id}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Subscription Tier */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                                💎 Gói Subscription
                            </label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {subTiers.map(tier => (
                                    <label key={tier.tier_id} style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '10px 14px',
                                        background: subForm.tier_id === tier.tier_id ? 'rgba(254, 44, 85, 0.1)' : 'rgba(255,255,255,0.02)',
                                        border: `1px solid ${subForm.tier_id === tier.tier_id ? 'rgba(254, 44, 85, 0.4)' : 'var(--border-color)'}`,
                                        borderRadius: '10px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}>
                                        <input
                                            type="radio"
                                            name="sub_tier"
                                            value={tier.tier_id}
                                            checked={subForm.tier_id === tier.tier_id}
                                            onChange={e => setSubForm(prev => ({ ...prev, tier_id: e.target.value }))}
                                            style={{ accentColor: '#fe2c55' }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 700, fontSize: '13px' }}>{tier.name}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{tier.description}</div>
                                        </div>
                                        <div style={{ fontWeight: 800, fontSize: '15px', color: '#fe2c55' }}>
                                            ${tier.price}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                        
                        {/* Submit */}
                        <button
                            onClick={handlePurchase}
                            disabled={subLoading || !subForm.session_id || !subForm.tiktok_username.replace('@', '').trim()}
                            style={{
                                ...btnPrimary,
                                width: '100%',
                                padding: '14px',
                                fontSize: '14px',
                                opacity: subLoading ? 0.7 : 1,
                            }}
                        >
                            {subLoading ? '⏳ Đang xử lý...' : '🚀 Bắt đầu đăng ký Subscription'}
                        </button>
                    </div>
                    
                    {/* RIGHT: Live Logs */}
                    <div style={cardStyle}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700 }}>
                            📋 Logs thời gian thực
                        </h3>
                        <div style={{
                            background: 'rgba(0,0,0,0.3)',
                            borderRadius: '10px',
                            padding: '14px',
                            height: '400px',
                            overflowY: 'auto',
                            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                            fontSize: '12px',
                            lineHeight: '1.8',
                        }}>
                            {taskLogs.length === 0 ? (
                                <div style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: '150px' }}>
                                    Chưa có hoạt động nào. Tạo task để xem logs.
                                </div>
                            ) : (
                                taskLogs.map((log, i) => (
                                    <div key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', padding: '3px 0' }}>
                                        <span style={{ color: '#64748b', marginRight: '8px' }}>[{log.time}]</span>
                                        <span>{log.msg}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════ PANEL 3: HISTORY ═══════ */}
            {activePanel === 'history' && (
                <div style={cardStyle}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700 }}>
                        📜 Lịch sử Subscription
                    </h3>
                    {taskHistory.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            <div style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.4 }}>📋</div>
                            Chưa có giao dịch nào. Tạo subscription task đầu tiên!
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', textAlign: 'left' }}>
                                    <th style={{ padding: '12px' }}>ID</th>
                                    <th style={{ padding: '12px' }}>Ngày</th>
                                    <th style={{ padding: '12px' }}>TikTok User</th>
                                    <th style={{ padding: '12px' }}>Apple ID</th>
                                    <th style={{ padding: '12px' }}>Gói</th>
                                    <th style={{ padding: '12px' }}>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {taskHistory.map(item => (
                                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                        <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 700 }}>{item.id}</td>
                                        <td style={{ padding: '12px' }}>{item.date}</td>
                                        <td style={{ padding: '12px', fontWeight: 600 }}>@{item.tiktok_user}</td>
                                        <td style={{ padding: '12px' }}>{item.apple_id}</td>
                                        <td style={{ padding: '12px' }}>{item.tier}</td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{
                                                padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                                                background: item.status === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                                color: item.status === 'success' ? '#10b981' : '#ef4444',
                                            }}>
                                                {item.status === 'success' ? '✅ Thành công' : '❌ Thất bại'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* ═══════ MODAL: ADD APPLE ACCOUNT ═══════ */}
            {showLoginModal && (
                <div className="modal-overlay" style={{ display: 'flex', zIndex: 9999 }} onClick={() => setShowLoginModal(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '460px', width: '92%' }}>
                        <div className="modal-header">
                            <h3>🍎 {loginStep === 'success' ? 'Xác thực thành công!' : loginStep === '2fa' ? 'Nhập mã 2FA' : 'Đăng nhập Apple ID'}</h3>
                            <button className="modal-close" onClick={() => setShowLoginModal(false)}>&times;</button>
                        </div>
                        <div className="modal-body" style={{ padding: '20px' }}>
                            
                            {/* Step Indicator */}
                            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
                                {['Credentials', '2FA Verify', 'Done'].map((step, i) => {
                                    const stepKeys = ['credentials', '2fa', 'success'];
                                    const currentIdx = stepKeys.indexOf(loginStep);
                                    const isActive = i <= currentIdx;
                                    return (
                                        <div key={step} style={{
                                            flex: 1, height: '4px', borderRadius: '4px',
                                            background: isActive ? 'linear-gradient(135deg, #fe2c55, #ff0050)' : 'rgba(255,255,255,0.1)',
                                            transition: 'all 0.3s',
                                        }} />
                                    );
                                })}
                            </div>
                            
                            {/* Step 1: Credentials */}
                            {loginStep === 'credentials' && (
                                <div>
                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Apple ID (Email)</label>
                                        <input
                                            type="email"
                                            placeholder="example@icloud.com"
                                            value={loginForm.apple_id}
                                            onChange={e => setLoginForm(prev => ({ ...prev, apple_id: e.target.value }))}
                                            style={inputStyle}
                                            autoFocus
                                        />
                                    </div>
                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>Password</label>
                                        <input
                                            type="password"
                                            placeholder="••••••••••••"
                                            value={loginForm.password}
                                            onChange={e => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                                            style={inputStyle}
                                        />
                                    </div>
                                    <div style={{ marginBottom: '14px' }}>
                                        <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                                            Proxy <span style={{ fontWeight: 400, opacity: 0.6 }}>(tùy chọn)</span>
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="socks5://user:pass@ip:port"
                                            value={loginForm.proxy}
                                            onChange={e => setLoginForm(prev => ({ ...prev, proxy: e.target.value }))}
                                            style={inputStyle}
                                        />
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                            Hỗ trợ: socks5:// • http:// • https://
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            {/* Step 2: 2FA Code */}
                            {loginStep === '2fa' && (
                                <div>
                                    <div style={{
                                        background: 'rgba(245, 158, 11, 0.1)',
                                        border: '1px solid rgba(245, 158, 11, 0.3)',
                                        borderRadius: '10px',
                                        padding: '14px',
                                        marginBottom: '16px',
                                        textAlign: 'center'
                                    }}>
                                        <div style={{ fontSize: '32px', marginBottom: '8px' }}>📲</div>
                                        <div style={{ fontWeight: 700, fontSize: '14px', color: '#f59e0b' }}>
                                            Mã xác minh 2FA đã được gửi
                                        </div>
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                            Kiểm tra thiết bị tin cậy hoặc SMS và nhập mã 6 chữ số
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        maxLength="6"
                                        placeholder="000000"
                                        value={code2FA}
                                        onChange={e => setCode2FA(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        style={{
                                            ...inputStyle,
                                            textAlign: 'center',
                                            fontSize: '24px',
                                            fontWeight: 800,
                                            letterSpacing: '8px',
                                            padding: '16px',
                                            border: '2px solid #f59e0b',
                                        }}
                                        autoFocus
                                    />
                                </div>
                            )}
                            
                            {/* Step 3: Success */}
                            {loginStep === 'success' && (
                                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                    <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
                                    <h3 style={{ margin: '0 0 8px', fontWeight: 800, color: '#10b981' }}>
                                        Xác thực thành công!
                                    </h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                                        Apple Account <strong>{loginForm.apple_id}</strong> đã sẵn sàng sử dụng.
                                    </p>
                                </div>
                            )}
                            
                            {/* Message */}
                            {loginMessage && (
                                <div style={{
                                    marginTop: '12px',
                                    padding: '10px 14px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    background: loginMessage.includes('✅') || loginMessage.includes('🎉')
                                        ? 'rgba(16, 185, 129, 0.1)' 
                                        : loginMessage.includes('❌')
                                            ? 'rgba(239, 68, 68, 0.1)'
                                            : 'rgba(245, 158, 11, 0.1)',
                                    color: loginMessage.includes('✅') || loginMessage.includes('🎉')
                                        ? '#10b981'
                                        : loginMessage.includes('❌')
                                            ? '#ef4444'
                                            : '#f59e0b',
                                    border: `1px solid ${loginMessage.includes('✅') || loginMessage.includes('🎉') ? 'rgba(16,185,129,0.3)' : loginMessage.includes('❌') ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                                }}>
                                    {loginMessage}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowLoginModal(false)} disabled={loginLoading}>
                                {loginStep === 'success' ? 'Đóng' : 'Hủy'}
                            </button>
                            {loginStep === 'credentials' && (
                                <button
                                    onClick={handleLoginSubmit}
                                    disabled={loginLoading || !loginForm.apple_id || !loginForm.password}
                                    style={{ ...btnPrimary, opacity: loginLoading ? 0.7 : 1 }}
                                >
                                    {loginLoading ? '⏳ Đang xác thực...' : '🔑 Đăng nhập Apple ID'}
                                </button>
                            )}
                            {loginStep === '2fa' && (
                                <button
                                    onClick={handleVerify2FA}
                                    disabled={loginLoading || code2FA.length !== 6}
                                    style={{ ...btnPrimary, opacity: loginLoading ? 0.7 : 1 }}
                                >
                                    {loginLoading ? '⏳ Đang xác minh...' : '✅ Xác nhận 2FA'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* ══════ PAYMENT CARD MODAL ══════ */}
            {showCardModal && (
                <div className="modal-overlay" style={{ display: 'flex', zIndex: 9999 }} onClick={() => setShowCardModal(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px', width: '92%' }}>
                        <div className="modal-header">
                            <h3 style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '16px', margin: 0 }}>
                                💳 Quản lý Phương thức Thanh toán
                            </h3>
                            <button className="modal-close" onClick={() => setShowCardModal(false)}>&times;</button>
                        </div>
                            
                            <div className="modal-body" style={{ padding: '20px 24px' }}>
                                {/* Current Payment Info */}
                                {accountPaymentInfo && (
                                    <div style={{
                                        padding: '14px 16px',
                                        borderRadius: '10px',
                                        background: accountPaymentInfo.has_payment_method 
                                            ? 'rgba(16, 185, 129, 0.08)' 
                                            : 'rgba(245, 158, 11, 0.08)',
                                        border: `1px solid ${accountPaymentInfo.has_payment_method ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
                                        marginBottom: '20px',
                                        fontSize: '13px',
                                    }}>
                                        <div style={{ fontWeight: 600, color: accountPaymentInfo.has_payment_method ? '#10b981' : '#f59e0b', marginBottom: '6px' }}>
                                            {accountPaymentInfo.has_payment_method 
                                                ? `✅ Thẻ hiện tại: ${accountPaymentInfo.payment_info?.type || ''} ****${accountPaymentInfo.payment_info?.last_four || ''}` 
                                                : '⚠️ Chưa có phương thức thanh toán'}
                                        </div>
                                        {accountPaymentInfo.account && (
                                            <div style={{ color: '#94a3b8' }}>
                                                {accountPaymentInfo.account.email} • {accountPaymentInfo.account.country || 'N/A'}
                                            </div>
                                        )}
                                    </div>
                                )}
                                
                                <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '16px', fontWeight: 500 }}>
                                    THÔNG TIN THẺ
                                </div>
                                
                                {/* Card Number */}
                                <div style={{ position: 'relative', marginBottom: '14px' }}>
                                    <input 
                                        type="text"
                                        placeholder="Số thẻ (VD: 4242 4242 4242 4242)"
                                        value={cardForm.card_number}
                                        onChange={(e) => setCardForm(prev => ({ ...prev, card_number: formatCardNumber(e.target.value) }))}
                                        maxLength={19}
                                        style={{ ...inputStyle, paddingRight: '100px', fontFamily: 'monospace', fontSize: '15px', letterSpacing: '1px' }}
                                    />
                                    {cardForm.card_number.replace(/\s/g, '').length >= 1 && (() => {
                                        const ct = detectCardType(cardForm.card_number);
                                        return (
                                            <span style={{
                                                position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                                fontSize: '13px', fontWeight: 700, color: ct.color,
                                                background: 'rgba(255,255,255,0.05)', padding: '3px 10px', borderRadius: '6px',
                                            }}>
                                                {ct.icon} {ct.type}
                                            </span>
                                        );
                                    })()}
                                </div>
                                
                                {/* Expiry + CVV row */}
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                                    <input 
                                        type="text" placeholder="MM" maxLength={2}
                                        value={cardForm.expiry_month}
                                        onChange={(e) => setCardForm(prev => ({ ...prev, expiry_month: e.target.value.replace(/\D/g, '').slice(0, 2) }))}
                                        style={{ ...inputStyle, flex: 1, textAlign: 'center', fontFamily: 'monospace', fontSize: '15px' }}
                                    />
                                    <span style={{ color: '#475569', alignSelf: 'center', fontSize: '18px' }}>/</span>
                                    <input 
                                        type="text" placeholder="YY" maxLength={2}
                                        value={cardForm.expiry_year}
                                        onChange={(e) => setCardForm(prev => ({ ...prev, expiry_year: e.target.value.replace(/\D/g, '').slice(0, 2) }))}
                                        style={{ ...inputStyle, flex: 1, textAlign: 'center', fontFamily: 'monospace', fontSize: '15px' }}
                                    />
                                    <input 
                                        type="password" placeholder="CVV" maxLength={4}
                                        value={cardForm.cvv}
                                        onChange={(e) => setCardForm(prev => ({ ...prev, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                                        style={{ ...inputStyle, flex: 1.5, textAlign: 'center', fontFamily: 'monospace', fontSize: '15px' }}
                                    />
                                </div>
                                
                                {/* Cardholder Name */}
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                                    <input 
                                        type="text" placeholder="Tên (First Name)"
                                        value={cardForm.first_name}
                                        onChange={(e) => setCardForm(prev => ({ ...prev, first_name: e.target.value }))}
                                        style={{ ...inputStyle, flex: 1 }}
                                    />
                                    <input 
                                        type="text" placeholder="Họ (Last Name)"
                                        value={cardForm.last_name}
                                        onChange={(e) => setCardForm(prev => ({ ...prev, last_name: e.target.value }))}
                                        style={{ ...inputStyle, flex: 1 }}
                                    />
                                </div>
                                
                                <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '12px', marginTop: '20px', fontWeight: 500 }}>
                                    ĐỊA CHỈ THANH TOÁN (tùy chọn)
                                </div>
                                
                                <input 
                                    type="text" placeholder="Địa chỉ"
                                    value={cardForm.address_line1}
                                    onChange={(e) => setCardForm(prev => ({ ...prev, address_line1: e.target.value }))}
                                    style={{ ...inputStyle, marginBottom: '10px' }}
                                />
                                
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                    <input 
                                        type="text" placeholder="Thành phố"
                                        value={cardForm.city}
                                        onChange={(e) => setCardForm(prev => ({ ...prev, city: e.target.value }))}
                                        style={{ ...inputStyle, flex: 1 }}
                                    />
                                    <input 
                                        type="text" placeholder="Mã bưu điện"
                                        value={cardForm.zip_code}
                                        onChange={(e) => setCardForm(prev => ({ ...prev, zip_code: e.target.value }))}
                                        style={{ ...inputStyle, flex: 1 }}
                                    />
                                </div>
                                
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                    <select 
                                        value={cardForm.country_code}
                                        onChange={(e) => setCardForm(prev => ({ ...prev, country_code: e.target.value }))}
                                        style={{ ...inputStyle, flex: 1 }}
                                    >
                                        <option value="VN">🇻🇳 Việt Nam</option>
                                        <option value="US">🇺🇸 United States</option>
                                        <option value="SG">🇸🇬 Singapore</option>
                                        <option value="JP">🇯🇵 Japan</option>
                                        <option value="KR">🇰🇷 South Korea</option>
                                        <option value="TH">🇹🇭 Thailand</option>
                                        <option value="MY">🇲🇾 Malaysia</option>
                                        <option value="ID">🇮🇩 Indonesia</option>
                                        <option value="PH">🇵🇭 Philippines</option>
                                        <option value="TW">🇹🇼 Taiwan</option>
                                        <option value="HK">🇭🇰 Hong Kong</option>
                                        <option value="CN">🇨🇳 China</option>
                                        <option value="GB">🇬🇧 United Kingdom</option>
                                        <option value="AU">🇦🇺 Australia</option>
                                    </select>
                                    <input 
                                        type="text" placeholder="Số điện thoại"
                                        value={cardForm.phone}
                                        onChange={(e) => setCardForm(prev => ({ ...prev, phone: e.target.value }))}
                                        style={{ ...inputStyle, flex: 1 }}
                                    />
                                </div>
                                
                                {/* Message */}
                                {cardMessage && (
                                    <div style={{
                                        marginTop: '14px',
                                        padding: '10px 14px',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        background: cardMessage.includes('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                                        color: cardMessage.includes('✅') ? '#10b981' : '#ef4444',
                                        border: `1px solid ${cardMessage.includes('✅') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                    }}>
                                        {cardMessage}
                                    </div>
                                )}
                            </div>
                            
                            <div className="modal-footer" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px' }}>
                                <button className="btn btn-secondary" onClick={() => setShowCardModal(false)} disabled={cardLoading}>
                                    Hủy
                                </button>
                                <button
                                    onClick={handleAddCard}
                                    disabled={cardLoading || !cardForm.card_number || !cardForm.first_name}
                                    style={{ ...btnPrimary, opacity: cardLoading ? 0.7 : 1, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
                                >
                                    {cardLoading ? '⏳ Đang xử lý...' : '💳 Thêm thẻ thanh toán'}
                                </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
