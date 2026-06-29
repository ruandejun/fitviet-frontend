import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';

export default function TikTokSubscription({ currentUser, triggerToast }) {
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('accounts'); // 'accounts', 'plans', 'history'
    
    // Mock & State data
    const [stats, setStats] = useState({
        activeCount: 12,
        expiringCount: 2,
        totalSpent: 450.00,
        currency: '$'
    });

    const [plans, setPlans] = useState([
        {
            id: 'plan_starter',
            name: 'TikTok Starter',
            price: 15.00,
            period: 'tháng',
            badge: 'Cơ bản',
            color: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            features: [
                'Tự động tương tác & Follow',
                'Quản lý 1 Tài khoản TikTok',
                'Proxy SOCKS5 Dedicated',
                'Hỗ trợ 24/7 qua Telegram'
            ]
        },
        {
            id: 'plan_pro',
            name: 'TikTok Pro Automation',
            price: 35.00,
            period: 'tháng',
            badge: 'Phổ biến nhất 🔥',
            isPopular: true,
            color: 'linear-gradient(135deg, #fe2c55, #ff0050)',
            features: [
                'Tự động đăng Video & Livestream Sync',
                'Quản lý tới 5 Tài khoản TikTok',
                'Auto Bypass Bot & Anti-Detect Cloud',
                'Proxy IPv6 + SOCKS5 Tốc độ cao',
                'Báo cáo phân tích Analytics nâng cao'
            ]
        },
        {
            id: 'plan_vip',
            name: 'TikTok Enterprise VIP',
            price: 99.00,
            period: 'tháng',
            badge: 'Tiết kiệm 30%',
            color: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            features: [
                'Không giới hạn số lượng tài khoản',
                'Auto Reg/Farm TikTok Clone số lượng lớn',
                'Hệ thống AI Reup Video thông minh',
                'API Kết nối trực tiếp C69 Server & Desktop',
                'Hỗ trợ kỹ thuật ưu tiên 1-1'
            ]
        }
    ]);

    const [tiktokAccounts, setTiktokAccounts] = useState([
        { id: 1, username: '@tok_master_88', planName: 'TikTok Pro Automation', expireDate: '2026-07-25', status: 'active', autoRenew: true, avatar: '🎵', payMethod: 'Apple ID (direct)' },
        { id: 2, username: '@fashion_store_vn', planName: 'TikTok Pro Automation', expireDate: '2026-07-02', status: 'expiring', autoRenew: true, avatar: '🛍️', payMethod: 'iPhone 12 Pro #01' },
        { id: 3, username: '@review_game_99', planName: 'TikTok Starter', expireDate: '2026-06-30', status: 'expiring', autoRenew: false, avatar: '🎮', payMethod: 'iPhone X #02' },
        { id: 4, username: '@dance_studio_sg', planName: 'TikTok Enterprise VIP', expireDate: '2026-08-15', status: 'active', autoRenew: true, avatar: '💃', payMethod: 'Apple ID (direct)' },
        { id: 5, username: '@daily_vlog_hn', planName: 'TikTok Starter', expireDate: '2026-05-10', status: 'expired', autoRenew: false, avatar: '📹', payMethod: 'iPhone 11 #03' }
    ]);

    const [history, setHistory] = useState([
        { id: 'INV-9082', date: '2026-06-25', username: '@tok_master_88', plan: 'TikTok Pro Automation', amount: '$35.00', status: 'Thành công' },
        { id: 'INV-8812', date: '2026-06-15', username: '@dance_studio_sg', plan: 'TikTok Enterprise VIP', amount: '$99.00', status: 'Thành công' },
        { id: 'INV-7621', date: '2026-05-25', username: '@fashion_store_vn', plan: 'TikTok Pro Automation', amount: '$35.00', status: 'Thành công' }
    ]);

    // Modal & Dual-mode state
    const [showSubscribeModal, setShowSubscribeModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [targetUsername, setTargetUsername] = useState('');
    const [authMode, setAuthMode] = useState('apple_id'); // 'apple_id' hoặc 'device'
    
    // Apple ID Auth state
    const [appleId, setAppleId] = useState('');
    const [applePassword, setApplePassword] = useState('');
    const [requires2FA, setRequires2FA] = useState(false);
    const [code2FA, setCode2FA] = useState('');
    
    // Device Selection state
    const [selectedDevice, setSelectedDevice] = useState('dev_01');
    const [availableDevices, setAvailableDevices] = useState([
        { id: 'dev_01', name: '📱 iPhone 12 Pro #01 (Đã đăng nhập App Store)', status: 'online' },
        { id: 'dev_02', name: '📱 iPhone 11 Pro Max #02 (Online - StoreKit OK)', status: 'online' },
        { id: 'dev_03', name: '📱 iPhone X #03 (Farm Node #3)', status: 'online' }
    ]);

    const handleToggleAutoRenew = (id) => {
        setTiktokAccounts(prev => prev.map(acc => {
            if (acc.id === id) {
                const updated = !acc.autoRenew;
                if (triggerToast) triggerToast(`Đã ${updated ? 'bật' : 'tắt'} tự động gia hạn cho ${acc.username}`);
                return { ...acc, autoRenew: updated };
            }
            return acc;
        }));
    };

    const handleOpenSubscribe = (plan) => {
        setSelectedPlan(plan);
        setRequires2FA(false);
        setCode2FA('');
        setShowSubscribeModal(true);
    };

    const handleConfirmSubscribe = () => {
        if (!targetUsername.trim()) {
            alert('Vui lòng nhập TikTok username!');
            return;
        }

        if (authMode === 'apple_id') {
            if (!appleId.trim() || !applePassword.trim()) {
                alert('Vui lòng nhập đầy đủ Apple ID và Mật khẩu!');
                return;
            }
            // Mô phỏng thách thức 2FA ở bước đầu
            if (!requires2FA) {
                setLoading(true);
                setTimeout(() => {
                    setLoading(false);
                    setRequires2FA(true);
                    if (triggerToast) triggerToast('🔑 Đã gửi yêu cầu xác minh! Vui lòng nhập mã 2FA 6 số.');
                }, 800);
                return;
            } else {
                if (!code2FA || code2FA.length < 6) {
                    alert('Vui lòng nhập mã xác minh 2FA 6 chữ số!');
                    return;
                }
            }
        }

        setLoading(true);
        setTimeout(() => {
            const devName = authMode === 'apple_id' ? `Apple ID (${appleId})` : availableDevices.find(d => d.id === selectedDevice)?.name.split('(')[0] || 'Thiết bị iOS';
            const newAcc = {
                id: Date.now(),
                username: targetUsername.startsWith('@') ? targetUsername : `@${targetUsername}`,
                planName: selectedPlan.name,
                expireDate: '2026-07-29',
                status: 'active',
                autoRenew: true,
                avatar: '✨',
                payMethod: devName
            };
            setTiktokAccounts([newAcc, ...tiktokAccounts]);
            setShowSubscribeModal(false);
            setTargetUsername('');
            setAppleId('');
            setApplePassword('');
            setCode2FA('');
            setRequires2FA(false);
            setLoading(false);
            if (triggerToast) triggerToast(`🎉 Đăng ký thành công gói ${selectedPlan.name} qua Apple API!`);
        }, 1200);
    };

    return (
        <div className="tiktok-subscription-container" style={{ color: 'var(--text-color)', fontFamily: 'Inter, Roboto, sans-serif' }}>
            {/* Top Header Card */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(254, 44, 85, 0.15), rgba(37, 244, 238, 0.1))',
                border: '1px solid rgba(254, 44, 85, 0.3)',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                backdropFilter: 'blur(10px)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '16px',
                        background: 'linear-gradient(135deg, #fe2c55, #25f4ee)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '28px',
                        boxShadow: '0 8px 20px rgba(254, 44, 85, 0.4)'
                    }}>
                        🎵
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', letterSpacing: '-0.5px' }}>
                            TikTok Subscriptions & Apple Automation
                        </h2>
                        <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                            Đăng ký tự động hóa TikTok qua Apple Storefront API, hỗ trợ xác thực 2FA & Phone Farm iOS.
                        </p>
                    </div>
                </div>

                {/* Stat Badges */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '10px 18px', borderRadius: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Tài khoản Sub</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>{stats.activeCount} Active</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', padding: '10px 18px', borderRadius: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Sắp hết hạn</div>
                        <div style={{ fontSize: '20px', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>{stats.expiringCount} Cần gia hạn</div>
                    </div>
                </div>
            </div>

            {/* Navigation Sub-tabs */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <button 
                    onClick={() => setActiveTab('accounts')}
                    className={`btn ${activeTab === 'accounts' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ borderRadius: '10px', padding: '10px 20px', fontWeight: '600', fontSize: '13px' }}
                >
                    📱 Tài khoản TikTok Sub ({tiktokAccounts.length})
                </button>
                <button 
                    onClick={() => setActiveTab('plans')}
                    className={`btn ${activeTab === 'plans' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ borderRadius: '10px', padding: '10px 20px', fontWeight: '600', fontSize: '13px' }}
                >
                    💎 Các gói Subscription
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ borderRadius: '10px', padding: '10px 20px', fontWeight: '600', fontSize: '13px' }}
                >
                    📜 Lịch sử thanh toán
                </button>
            </div>

            {/* TAB 1: ACCOUNTS LIST */}
            {activeTab === 'accounts' && (
                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>Danh sách tài khoản đang đăng ký gói</h3>
                        <button 
                            onClick={() => setActiveTab('plans')}
                            style={{
                                background: 'linear-gradient(135deg, #fe2c55, #ff0050)',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '8px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontSize: '13px',
                                boxShadow: '0 4px 12px rgba(254, 44, 85, 0.3)'
                            }}
                        >
                            + Đăng ký tài khoản mới
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                        {tiktokAccounts.map(acc => (
                            <div key={acc.id} style={{
                                background: 'var(--modal-bg, rgba(15, 23, 42, 0.6))',
                                border: `1px solid ${acc.status === 'expiring' ? '#f59e0b' : acc.status === 'expired' ? '#ef4444' : 'var(--border-color)'}`,
                                borderRadius: '14px',
                                padding: '18px',
                                position: 'relative',
                                transition: 'all 0.3s ease',
                                boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                                    <div style={{ fontSize: '24px', background: 'rgba(255,255,255,0.08)', width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {acc.avatar}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, fontSize: '15px' }}>{acc.username}</div>
                                        <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600, marginTop: '2px' }}>{acc.planName}</div>
                                    </div>
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        padding: '4px 10px',
                                        borderRadius: '20px',
                                        textTransform: 'uppercase',
                                        background: acc.status === 'active' ? 'rgba(16, 185, 129, 0.15)' : acc.status === 'expiring' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                        color: acc.status === 'active' ? '#10b981' : acc.status === 'expiring' ? '#f59e0b' : '#ef4444',
                                        border: `1px solid ${acc.status === 'active' ? 'rgba(16, 185, 129, 0.3)' : acc.status === 'expiring' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                                    }}>
                                        {acc.status === 'active' ? 'Hoạt động' : acc.status === 'expiring' ? 'Sắp hết hạn' : 'Đã hết hạn'}
                                    </span>
                                </div>

                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                                    🍏 Nguồn thanh toán: <span style={{ color: 'var(--text-color)', fontWeight: 600 }}>{acc.payMethod}</span>
                                </div>

                                <div style={{ fontSize: '13px', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: 'var(--text-muted)' }}>Ngày hết hạn:</span>
                                    <span style={{ fontWeight: 600 }}>{acc.expireDate}</span>
                                </div>

                                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Tự động gia hạn:</span>
                                    <label style={{ position: 'relative', display: 'inline-block', width: '40px', height: '22px', cursor: 'pointer' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={acc.autoRenew} 
                                            onChange={() => handleToggleAutoRenew(acc.id)}
                                            style={{ opacity: 0, width: 0, height: 0 }}
                                        />
                                        <span style={{
                                            position: 'absolute',
                                            top: 0, left: 0, right: 0, bottom: 0,
                                            backgroundColor: acc.autoRenew ? '#fe2c55' : 'rgba(255,255,255,0.2)',
                                            borderRadius: '22px',
                                            transition: '0.3s'
                                        }}>
                                            <span style={{
                                                position: 'absolute',
                                                content: '""',
                                                height: '16px', width: '16px',
                                                left: acc.autoRenew ? '21px' : '3px',
                                                bottom: '3px',
                                                backgroundColor: 'white',
                                                borderRadius: '50%',
                                                transition: '0.3s'
                                            }}></span>
                                        </span>
                                    </label>
                                </div>

                                <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
                                    <button 
                                        onClick={() => handleOpenSubscribe(plans.find(p => p.name === acc.planName) || plans[0])}
                                        style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-color)', fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                                    >
                                        🔄 Gia hạn ngay
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 2: PLANS PICKER */}
            {activeTab === 'plans' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                    {plans.map(plan => (
                        <div key={plan.id} style={{
                            background: 'var(--modal-bg, rgba(15, 23, 42, 0.7))',
                            border: plan.isPopular ? '2px solid #fe2c55' : '1px solid var(--border-color)',
                            borderRadius: '20px',
                            padding: '28px',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            boxShadow: plan.isPopular ? '0 10px 30px rgba(254, 44, 85, 0.25)' : '0 4px 15px rgba(0,0,0,0.1)',
                            backdropFilter: 'blur(10px)'
                        }}>
                            {plan.badge && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-12px',
                                    right: '20px',
                                    background: plan.color,
                                    color: 'white',
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}>
                                    {plan.badge}
                                </div>
                            )}

                            <h3 style={{ margin: '0 0 12px 0', fontSize: '20px', fontWeight: 800 }}>{plan.name}</h3>
                            
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '20px' }}>
                                <span style={{ fontSize: '36px', fontWeight: 900, color: 'var(--text-color)' }}>${plan.price}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>/{plan.period}</span>
                            </div>

                            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px 0', flex: 1 }}>
                                {plan.features.map((feat, idx) => (
                                    <li key={idx} style={{ padding: '8px 0', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-color)' }}>
                                        <span style={{ color: '#10b981', fontWeight: 800 }}>✓</span> {feat}
                                    </li>
                                ))}
                            </ul>

                            <button 
                                onClick={() => handleOpenSubscribe(plan)}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: plan.color,
                                    color: 'white',
                                    fontWeight: 800,
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                                    transition: 'transform 0.2s ease'
                                }}
                            >
                                Đăng ký gói ngay
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* TAB 3: TRANSACTION HISTORY */}
            {activeTab === 'history' && (
                <div style={{ background: 'var(--modal-bg, rgba(15, 23, 42, 0.6))', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 700 }}>Nhật ký gia hạn & Hóa đơn</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                <th style={{ padding: '12px' }}>Mã Hóa đơn</th>
                                <th style={{ padding: '12px' }}>Thời gian</th>
                                <th style={{ padding: '12px' }}>Tài khoản TikTok</th>
                                <th style={{ padding: '12px' }}>Gói dịch vụ</th>
                                <th style={{ padding: '12px' }}>Số tiền</th>
                                <th style={{ padding: '12px' }}>Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map(item => (
                                <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '12px', fontWeight: 700, fontFamily: 'monospace' }}>{item.id}</td>
                                    <td style={{ padding: '12px' }}>{item.date}</td>
                                    <td style={{ padding: '12px', fontWeight: 600 }}>{item.username}</td>
                                    <td style={{ padding: '12px' }}>{item.plan}</td>
                                    <td style={{ padding: '12px', fontWeight: 700, color: '#10b981' }}>{item.amount}</td>
                                    <td style={{ padding: '12px' }}>
                                        <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>
                                            {item.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* DUAL-MODE MODAL: SUBSCRIBE PLAN & APPLE AUTH */}
            {showSubscribeModal && selectedPlan && (
                <div className="modal-overlay" style={{ display: 'flex', zIndex: 9999 }} onClick={() => setShowSubscribeModal(false)}>
                    <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', width: '90%' }}>
                        <div className="modal-header">
                            <h3>🎵 Đăng ký {selectedPlan.name}</h3>
                            <button className="modal-close" onClick={() => setShowSubscribeModal(false)}>&times;</button>
                        </div>
                        <div className="modal-body" style={{ padding: '20px' }}>
                            <div style={{ background: 'rgba(254, 44, 85, 0.1)', border: '1px solid rgba(254, 44, 85, 0.3)', padding: '14px', borderRadius: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontWeight: 800 }}>{selectedPlan.name}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Thời hạn 1 tháng</div>
                                </div>
                                <div style={{ fontSize: '22px', fontWeight: 900, color: '#fe2c55' }}>${selectedPlan.price}</div>
                            </div>

                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label className="form-label" style={{ fontWeight: 700, marginBottom: '8px', display: 'block' }}>TikTok Username nhận Sub</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    placeholder="Nhập username (ví dụ: @tok_master_88)"
                                    value={targetUsername}
                                    onChange={e => setTargetUsername(e.target.value)}
                                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.2)', color: 'var(--text-color)' }}
                                />
                            </div>

                            {/* DUAL-MODE AUTH TABS */}
                            <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                                <label className="form-label" style={{ fontWeight: 700, marginBottom: '10px', display: 'block' }}>Phương thức xác thực thanh toán Apple</label>
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                                    <button 
                                        onClick={() => setAuthMode('apple_id')}
                                        style={{
                                            flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                                            background: authMode === 'apple_id' ? '#fe2c55' : 'rgba(255,255,255,0.05)',
                                            color: 'white', fontWeight: 700, fontSize: '12px', cursor: 'pointer'
                                        }}
                                    >
                                        🔑 1. Apple ID Trực tiếp
                                    </button>
                                    <button 
                                        onClick={() => setAuthMode('device')}
                                        style={{
                                            flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                                            background: authMode === 'device' ? '#fe2c55' : 'rgba(255,255,255,0.05)',
                                            color: 'white', fontWeight: 700, fontSize: '12px', cursor: 'pointer'
                                        }}
                                    >
                                        📱 2. Thiết bị iOS có sẵn
                                    </button>
                                </div>

                                {/* PHƯƠNG ÁN 1: APPLE ID & 2FA */}
                                {authMode === 'apple_id' && (
                                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                        <div style={{ marginBottom: '12px' }}>
                                            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Apple ID (Email)</label>
                                            <input 
                                                type="email" 
                                                className="form-input" 
                                                placeholder="example@icloud.com"
                                                value={appleId}
                                                onChange={e => setAppleId(e.target.value)}
                                                disabled={requires2FA}
                                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-color)' }}
                                            />
                                        </div>
                                        <div style={{ marginBottom: requires2FA ? '12px' : '0' }}>
                                            <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Mật khẩu (Password)</label>
                                            <input 
                                                type="password" 
                                                className="form-input" 
                                                placeholder="••••••••••••"
                                                value={applePassword}
                                                onChange={e => setApplePassword(e.target.value)}
                                                disabled={requires2FA}
                                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-color)' }}
                                            />
                                        </div>

                                        {/* BƯỚC XÁC THỰC 2FA KHI CẦN */}
                                        {requires2FA && (
                                            <div style={{ marginTop: '12px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid #f59e0b', padding: '12px', borderRadius: '8px' }}>
                                                <label style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 700, display: 'block', marginBottom: '6px' }}>
                                                    📲 Mã xác minh Apple 2FA (6 chữ số)
                                                </label>
                                                <input 
                                                    type="text" 
                                                    maxLength="6"
                                                    className="form-input" 
                                                    placeholder="Ví dụ: 849201"
                                                    value={code2FA}
                                                    onChange={e => setCode2FA(e.target.value)}
                                                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #f59e0b', background: 'rgba(0,0,0,0.3)', color: 'white', fontWeight: 800, letterSpacing: '3px', textAlign: 'center', fontSize: '16px' }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* PHƯƠNG ÁN 2: THIẾT BỊ IOS SẴN CÓ */}
                                {authMode === 'device' && (
                                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                                        <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Chọn iPhone / Node đảm nhận thanh toán</label>
                                        <select 
                                            value={selectedDevice}
                                            onChange={e => setSelectedDevice(e.target.value)}
                                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.08)', color: 'var(--text-color)', fontWeight: 600 }}
                                        >
                                            {availableDevices.map(dev => (
                                                <option key={dev.id} value={dev.id} style={{ background: '#1e293b', color: 'white' }}>
                                                    {dev.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowSubscribeModal(false)} disabled={loading}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleConfirmSubscribe} disabled={loading} style={{ background: 'linear-gradient(135deg, #fe2c55, #ff0050)', border: 'none' }}>
                                {loading ? 'Đang xác thực...' : requires2FA ? 'Xác nhận 2FA & Mua' : 'Xác nhận thanh toán'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
