import React, { useState, useCallback } from 'react';

/**
 * IPADowngrade — Tab "IPA Downgrade" (desktop-only)
 * Login Apple ID → Search App → Select Version → Download IPA
 * Giao tiếp với Python qua window.qhtdBridge
 */
export default function IPADowngrade() {
    const isDesktop = navigator.userAgent.includes('QHTD-Desktop') || !!(window.__QHTD_DESKTOP__ || window.qhtdBridge);

    // Auth state
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [twoFaCode, setTwoFaCode] = useState('');
    const [loggedIn, setLoggedIn] = useState(false);
    const [loggingIn, setLoggingIn] = useState(false);
    const [needs2FA, setNeeds2FA] = useState(false);
    const [authError, setAuthError] = useState('');

    // App search state
    const [appQuery, setAppQuery] = useState('');
    const [appInfo, setAppInfo] = useState(null);
    const [versions, setVersions] = useState([]);
    const [selectedVersion, setSelectedVersion] = useState('');
    const [searching, setSearching] = useState(false);

    // Download state
    const [downloading, setDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [downloadResult, setDownloadResult] = useState('');

    const handleLogin = useCallback(async () => {
        if (!isDesktop || !window.qhtdBridge) return;
        setLoggingIn(true);
        setAuthError('');
        try {
            const result = window.qhtdBridge.loginAppleID(email, password, twoFaCode);
            const parsed = JSON.parse(result);
            if (parsed.error) {
                if (parsed.needs_2fa) {
                    setNeeds2FA(true);
                    setAuthError('Vui lòng nhập mã xác thực 2FA.');
                } else {
                    setAuthError(parsed.error);
                }
            } else if (parsed.success) {
                setLoggedIn(true);
                setNeeds2FA(false);
            }
        } catch (e) {
            setAuthError('Lỗi: ' + e.message);
        } finally {
            setLoggingIn(false);
        }
    }, [email, password, twoFaCode, isDesktop]);

    const handleSearchApp = useCallback(async () => {
        if (!isDesktop || !window.qhtdBridge || !appQuery.trim()) return;
        setSearching(true);
        setAppInfo(null);
        setVersions([]);
        try {
            const result = window.qhtdBridge.lookupApp(appQuery.trim());
            const parsed = JSON.parse(result);
            if (parsed.error) {
                setAuthError(parsed.error);
            } else {
                setAppInfo(parsed.app);
                setVersions(parsed.versions || []);
                if (parsed.versions?.length > 0) {
                    setSelectedVersion(parsed.versions[0].id || '');
                }
            }
        } catch (e) {
            setAuthError('Lỗi tìm kiếm: ' + e.message);
        } finally {
            setSearching(false);
        }
    }, [appQuery, isDesktop]);

    const handleDownload = useCallback(() => {
        if (!isDesktop || !window.qhtdBridge || !selectedVersion) return;
        setDownloading(true);
        setDownloadProgress(0);
        setDownloadResult('');
        try {
            const result = window.qhtdBridge.downloadIPA(appInfo?.appId || appInfo?.bundleId || '', selectedVersion);
            const parsed = JSON.parse(result);
            if (parsed.error) {
                setDownloadResult('❌ ' + parsed.error);
            } else {
                setDownloadResult('✅ Đã tải: ' + (parsed.path || ''));
            }
        } catch (e) {
            setDownloadResult('❌ ' + e.message);
        } finally {
            setDownloading(false);
        }
    }, [selectedVersion, appInfo, isDesktop]);

    if (!isDesktop) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📲</div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>IPA Downgrade</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                    Tính năng này chỉ khả dụng trong ứng dụng <strong>QHTD Desktop</strong>.<br />
                    Tải IPA cần chạy trực tiếp trên máy tính với ipatool.
                </p>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                {/* Left: Auth */}
                <div style={{ flex: '0 0 360px', minWidth: '300px' }}>
                    <div style={{
                        background: 'var(--card-bg, rgba(255,255,255,0.02))',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '20px',
                    }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
                            🍎 Tài khoản Apple ID
                        </h3>
                        {loggedIn ? (
                            <div style={{
                                padding: '16px',
                                borderRadius: '10px',
                                background: 'rgba(16, 185, 129, 0.08)',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '24px', marginBottom: '8px' }}>✅</div>
                                <div style={{ fontWeight: 600, color: '#10b981' }}>Đã đăng nhập</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{email}</div>
                                <button className="btn btn-secondary" onClick={() => { setLoggedIn(false); setEmail(''); setPassword(''); }} style={{ marginTop: '12px', fontSize: '12px' }}>
                                    Đăng xuất
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="form-group">
                                    <label className="form-label">Apple ID (Email)</label>
                                    <input type="email" className="form-input" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Mật khẩu</label>
                                    <input type="password" className="form-input" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                                </div>
                                {needs2FA && (
                                    <div className="form-group">
                                        <label className="form-label">Mã xác thực 2FA</label>
                                        <input type="text" className="form-input" placeholder="123456" value={twoFaCode} onChange={(e) => setTwoFaCode(e.target.value)} maxLength={6} style={{ letterSpacing: '3px', textAlign: 'center', fontWeight: 700 }} />
                                    </div>
                                )}
                                {authError && (
                                    <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#fca5a5', fontSize: '12px', marginBottom: '12px' }}>
                                        {authError}
                                    </div>
                                )}
                                <button className="btn btn-primary" onClick={handleLogin} disabled={loggingIn || !email || !password} style={{ width: '100%' }}>
                                    {loggingIn ? '⏳ Đang xác thực...' : '🔐 Đăng nhập Apple ID'}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Right: Search & Download */}
                <div style={{ flex: '1 1 400px', minWidth: '300px' }}>
                    <div style={{
                        background: 'var(--card-bg, rgba(255,255,255,0.02))',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '20px',
                        opacity: loggedIn ? 1 : 0.5,
                        pointerEvents: loggedIn ? 'auto' : 'none',
                    }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
                            📲 Tải & Hạ cấp ứng dụng
                        </h3>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                            <input type="text" className="form-input" placeholder="Dán link App Store hoặc App ID (ví dụ: 544007664)" value={appQuery} onChange={(e) => setAppQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearchApp()} style={{ flex: 1 }} />
                            <button className="btn btn-secondary" onClick={handleSearchApp} disabled={searching}>
                                {searching ? '⏳' : '🔍 Tìm'}
                            </button>
                        </div>

                        {/* App Info Card */}
                        {appInfo && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                                padding: '14px',
                                borderRadius: '12px',
                                background: 'rgba(217, 70, 239, 0.06)',
                                border: '1px solid rgba(217, 70, 239, 0.15)',
                                marginBottom: '16px',
                            }}>
                                {appInfo.icon && <img src={appInfo.icon} alt="" style={{ width: 56, height: 56, borderRadius: 12 }} />}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, fontSize: '15px' }}>{appInfo.name}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                        {appInfo.bundleId} • v{appInfo.latestVersion}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        {appInfo.seller || ''}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Version Selector */}
                        {versions.length > 0 && (
                            <>
                                <div className="form-group">
                                    <label className="form-label">Chọn phiên bản muốn tải ({versions.length} versions)</label>
                                    <select className="filter-select" style={{ width: '100%' }} value={selectedVersion} onChange={(e) => setSelectedVersion(e.target.value)}>
                                        {versions.map((v) => (
                                            <option key={v.id} value={v.id}>
                                                v{v.version} {v.id === versions[0]?.id ? '(Mới nhất)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <button className="btn btn-primary" onClick={handleDownload} disabled={downloading || !selectedVersion} style={{ width: '100%', marginTop: '8px' }}>
                                    {downloading ? `⏳ Đang tải... ${downloadProgress}%` : '📥 Tải xuống tệp IPA'}
                                </button>
                            </>
                        )}

                        {downloadResult && (
                            <div style={{
                                padding: '10px 14px',
                                marginTop: '12px',
                                borderRadius: '10px',
                                background: downloadResult.startsWith('✅') ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                                border: `1px solid ${downloadResult.startsWith('✅') ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                                fontSize: '13px',
                            }}>
                                {downloadResult}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
