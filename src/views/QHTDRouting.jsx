import React, { useState, useEffect, useCallback } from 'react';

/**
 * QHTDRouting — Tab "Định tuyến" (desktop-only)
 * Quản lý card mạng, DHCP server, Sing-Box proxy và theo dõi thiết bị kết nối.
 * Giao tiếp với Python qua window.qhtdBridge
 */
export default function QHTDRouting() {
    const [isDesktop, setIsDesktop] = useState(() => {
        return navigator.userAgent.includes('QHTD-Desktop') || !!(window.__QHTD_DESKTOP__ || window.qhtdBridge);
    });

    useEffect(() => {
        const checkDesktop = () => {
            if (navigator.userAgent.includes('QHTD-Desktop') || window.__QHTD_DESKTOP__ || window.qhtdBridge) {
                setIsDesktop(true);
            }
        };
        checkDesktop();
        window.addEventListener('qhtdBridgeReady', checkDesktop);
        const timer = setTimeout(checkDesktop, 1000);
        const timer2 = setTimeout(checkDesktop, 3000);
        return () => {
            window.removeEventListener('qhtdBridgeReady', checkDesktop);
            clearTimeout(timer);
            clearTimeout(timer2);
        };
    }, []);

    // Network interfaces
    const [interfaces, setInterfaces] = useState([]);
    const [selectedInterface, setSelectedInterface] = useState('');
    const [loadingInterfaces, setLoadingInterfaces] = useState(false);

    // DHCP settings
    const [dhcpStart, setDhcpStart] = useState('192.168.10.100');
    const [dhcpEnd, setDhcpEnd] = useState('192.168.10.200');
    const [subnetMask, setSubnetMask] = useState('255.255.255.0');
    const [dnsServer, setDnsServer] = useState('8.8.8.8');

    // Statuses
    const [routerActive, setRouterActive] = useState(false);
    const [singboxActive, setSingboxActive] = useState(false);
    const [dhcpActive, setDhcpActive] = useState(false);
    const [error, setError] = useState('');

    // Connected devices
    const [devices, setDevices] = useState([]);
    const [loadingDevices, setLoadingDevices] = useState(false);

    const fetchInterfaces = useCallback(async () => {
        if (!isDesktop || !window.qhtdBridge) return;
        setLoadingInterfaces(true);
        setError('');
        try {
            const res = await window.qhtdBridge.getNetworkInterfaces();
            const parsed = JSON.parse(res);
            if (parsed.error) {
                setError(parsed.error);
            } else if (Array.isArray(parsed)) {
                setInterfaces(parsed);
                if (parsed.length > 0) {
                    setSelectedInterface(parsed[0].name || '');
                }
            }
        } catch (e) {
            setError('Lỗi lấy card mạng: ' + e.message);
        } finally {
            setLoadingInterfaces(false);
        }
    }, [isDesktop]);

    const fetchDHCPLeases = useCallback(async () => {
        if (!isDesktop || !window.qhtdBridge) return;
        setLoadingDevices(true);
        try {
            const res = await window.qhtdBridge.getDHCPLeases();
            const parsed = JSON.parse(res);
            if (!parsed.error && Array.isArray(parsed)) {
                setDevices(parsed);
            }
        } catch (e) {
            console.error('Failed to fetch leases:', e);
        } finally {
            setLoadingDevices(false);
        }
    }, [isDesktop]);

    const handleReloadDevices = useCallback(async () => {
        if (!isDesktop || !window.qhtdBridge) return;
        setLoadingDevices(true);
        try {
            const res = window.qhtdBridge.refreshDHCPLeases 
                ? await window.qhtdBridge.refreshDHCPLeases()
                : await window.qhtdBridge.getDHCPLeases();
            const parsed = JSON.parse(res);
            if (!parsed.error && Array.isArray(parsed)) {
                setDevices(parsed);
            }
        } catch (e) {
            console.error('Failed to refresh leases:', e);
        } finally {
            setLoadingDevices(false);
        }
    }, [isDesktop]);

    // Check if router is active on mount
    useEffect(() => {
        const checkRouterActive = async () => {
            if (!isDesktop || !window.qhtdBridge) return;
            try {
                if (window.qhtdBridge.isRouterActive) {
                    const active = await window.qhtdBridge.isRouterActive();
                    if (active) {
                        setRouterActive(true);
                        setSingboxActive(true);
                        setDhcpActive(true);
                    }
                }
            } catch (e) {
                console.error("Failed to check router status:", e);
            }
        };
        if (isDesktop) {
            checkRouterActive();
        }
    }, [isDesktop]);

    // Load interfaces on mount
    useEffect(() => {
        if (isDesktop) {
            fetchInterfaces();
        }
    }, [isDesktop, fetchInterfaces]);

    // Poll leases when router is active
    useEffect(() => {
        if (!isDesktop || !routerActive) return;
        fetchDHCPLeases();
        const interval = setInterval(fetchDHCPLeases, 4000);
        return () => clearInterval(interval);
    }, [isDesktop, routerActive, fetchDHCPLeases]);

    const handleStartRouter = useCallback(async () => {
        if (!isDesktop || !window.qhtdBridge) return;
        setError('');
        try {
            const config = {
                interface: selectedInterface,
                dhcp_start: dhcpStart,
                dhcp_end: dhcpEnd,
                subnet_mask: subnetMask,
                dns: dnsServer
            };
            const res = await window.qhtdBridge.startRouter(JSON.stringify(config));
            const parsed = JSON.parse(res);
            if (parsed.error) {
                setError(parsed.error);
            } else if (parsed.success) {
                setRouterActive(true);
                setSingboxActive(true);
                setDhcpActive(true);
            }
        } catch (e) {
            setError('Lỗi khởi động router: ' + e.message);
        }
    }, [selectedInterface, dhcpStart, dhcpEnd, subnetMask, dnsServer, isDesktop]);

    const handleStopRouter = useCallback(async () => {
        if (!isDesktop || !window.qhtdBridge) return;
        setError('');
        try {
            const res = await window.qhtdBridge.stopRouter();
            const parsed = JSON.parse(res);
            if (parsed.error) {
                setError(parsed.error);
            } else {
                setRouterActive(false);
                setSingboxActive(false);
                setDhcpActive(false);
                setDevices([]);
            }
        } catch (e) {
            setError('Lỗi dừng router: ' + e.message);
        }
    }, [isDesktop]);

    if (!isDesktop) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🌐</div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>Định tuyến mạng</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                    Tính năng này chỉ khả dụng trong ứng dụng <strong>QHTD Desktop</strong>.<br />
                    Định tuyến yêu cầu cấu hình mạng card vật lý cục bộ và quyền Admin.
                </p>
            </div>
        );
    }

    const connectedDevices = devices.filter(dev => dev.status === 'Online');

    return (
        <div>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                {/* Left side: Router Configuration */}
                <div style={{ flex: '1 1 450px', minWidth: '320px' }}>
                    <div style={{
                        background: 'var(--card-bg, rgba(255,255,255,0.02))',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '20px',
                    }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>⚙️ Cấu hình định tuyến</span>
                            <button className="btn btn-secondary" onClick={fetchInterfaces} disabled={loadingInterfaces} style={{ padding: '4px 10px', fontSize: '12px', minHeight: '26px' }}>
                                🔄 Làm mới card
                            </button>
                        </h3>

                        {error && (
                            <div style={{
                                padding: '10px 14px',
                                marginBottom: '16px',
                                borderRadius: '8px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                color: '#fca5a5',
                                fontSize: '12px'
                            }}>
                                ⚠️ {error}
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Chọn card mạng chia sẻ (LAN)</label>
                            <select className="filter-select" style={{ width: '100%' }} value={selectedInterface} onChange={(e) => setSelectedInterface(e.target.value)} disabled={routerActive}>
                                {interfaces.map((iface) => (
                                    <option key={iface.name} value={iface.name}>
                                        {iface.friendly_name || iface.name} ({iface.ip || 'No IP'})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">DHCP Bắt đầu</label>
                                <input type="text" className="form-input" value={dhcpStart} onChange={(e) => setDhcpStart(e.target.value)} disabled={routerActive} />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">DHCP Kết thúc</label>
                                <input type="text" className="form-input" value={dhcpEnd} onChange={(e) => setDhcpEnd(e.target.value)} disabled={routerActive} />
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">Subnet Mask</label>
                                <input type="text" className="form-input" value={subnetMask} onChange={(e) => setSubnetMask(e.target.value)} disabled={routerActive} />
                            </div>
                            <div className="form-group" style={{ flex: 1 }}>
                                <label className="form-label">DNS Server</label>
                                <input type="text" className="form-input" value={dnsServer} onChange={(e) => setDnsServer(e.target.value)} disabled={routerActive} />
                            </div>
                        </div>

                        <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
                            {routerActive ? (
                                <button className="btn btn-danger" onClick={handleStopRouter} style={{ width: '100%', minHeight: '40px', fontWeight: 600 }}>
                                    ⏹ Dừng Định Tuyến (Stop Router)
                                </button>
                            ) : (
                                <button className="btn btn-primary" onClick={handleStartRouter} style={{ width: '100%', minHeight: '40px', fontWeight: 600, background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}>
                                    ▶ Khởi Chạy Định Tuyến (Start Router)
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right side: Status and leases */}
                <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Status grid */}
                    <div style={{
                        background: 'var(--card-bg, rgba(255,255,255,0.02))',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '20px',
                    }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>🛡️ Trạng thái dịch vụ</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                            <div style={{
                                padding: '12px',
                                borderRadius: '10px',
                                background: routerActive ? 'rgba(16, 185, 129, 0.06)' : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${routerActive ? 'rgba(16, 185, 129, 0.2)' : 'var(--border-color)'}`,
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>ROUTER ROUTING</div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: routerActive ? '#10b981' : '#94a3b8' }}>
                                    {routerActive ? '● ĐANG CHẠY' : '○ ĐÃ DỪNG'}
                                </div>
                            </div>
                            <div style={{
                                padding: '12px',
                                borderRadius: '10px',
                                background: dhcpActive ? 'rgba(16, 185, 129, 0.06)' : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${dhcpActive ? 'rgba(16, 185, 129, 0.2)' : 'var(--border-color)'}`,
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>DHCP SERVER</div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: dhcpActive ? '#10b981' : '#94a3b8' }}>
                                    {dhcpActive ? '● ONLINE' : '○ OFFLINE'}
                                </div>
                            </div>
                            <div style={{
                                padding: '12px',
                                borderRadius: '10px',
                                background: singboxActive ? 'rgba(16, 185, 129, 0.06)' : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${singboxActive ? 'rgba(16, 185, 129, 0.2)' : 'var(--border-color)'}`,
                                textAlign: 'center'
                            }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>SING-BOX PROXY</div>
                                <div style={{ fontSize: '14px', fontWeight: 700, color: singboxActive ? '#10b981' : '#94a3b8' }}>
                                    {singboxActive ? '● CHẠY PROXY' : '○ TRỰC TIẾP'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Connected devices list */}
                    <div style={{
                        background: 'var(--card-bg, rgba(255,255,255,0.02))',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '20px',
                    }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span>🔗 Thiết bị đang kết nối ({connectedDevices.length})</span>
                                <button 
                                    className="btn btn-secondary" 
                                    onClick={handleReloadDevices} 
                                    disabled={loadingDevices} 
                                    style={{ padding: '4px 10px', fontSize: '12px', minHeight: '26px' }}
                                >
                                    🔄 Quét lại
                                </button>
                            </div>
                            {loadingDevices && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>⏳ Đang tải...</span>}
                        </h3>
                        <div className="table-container" style={{ margin: 0, maxHeight: '250px', overflowY: 'auto' }}>
                            <table>
                                <thead>
                                    <tr>
                                        <th>IP Address</th>
                                        <th>MAC Address</th>
                                        <th>Hostname</th>
                                        <th>Thời gian thuê</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {connectedDevices.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                                                {routerActive ? 'Chưa có thiết bị nào kết nối LAN.' : 'Vui lòng khởi chạy Router để quét thiết bị.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        connectedDevices.map((dev, idx) => (
                                            <tr key={dev.mac || idx}>
                                                <td style={{ fontWeight: 600, color: '#06b6d4' }}>{dev.ip}</td>
                                                <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>{dev.mac}</td>
                                                <td>{dev.hostname || '—'}</td>
                                                <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{dev.leased_at || '—'}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
