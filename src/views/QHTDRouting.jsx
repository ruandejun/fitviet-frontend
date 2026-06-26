import React, { useState, useEffect, useCallback } from 'react';

/**
 * QHTDRouting — Tab "Định tuyến" (desktop-only)
 * Quản lý card mạng, DHCP server, Sing-Box proxy và theo dõi thiết bị kết nối.
 * Giao tiếp với Python qua window.qhtdBridge và FastAPI local (port 8000)
 */
export default function QHTDRouting() {
    const [isDesktop, setIsDesktop] = useState(() => {
        return navigator.userAgent.includes('QHTD-Desktop') || !!(window.__QHTD_DESKTOP__ || window.qhtdBridge);
    });

    const localFetch = async (url, options = {}) => {
        if (typeof url === 'string' && url.startsWith('http://127.0.0.1:8000') && isDesktop && window.qhtdBridge && typeof window.qhtdBridge.apiProxyGet === 'function') {
            const path = url.replace('http://127.0.0.1:8000', '');
            try {
                if (options.method === 'POST') {
                    const body = options.body || '{}';
                    const res = await window.qhtdBridge.apiProxyPost(path, body);
                    const parsed = JSON.parse(res);
                    if (parsed.error) throw new Error(parsed.error);
                    return {
                        ok: true,
                        json: async () => parsed
                    };
                } else {
                    const res = await window.qhtdBridge.apiProxyGet(path);
                    const parsed = JSON.parse(res);
                    if (parsed.error) throw new Error(parsed.error);
                    return {
                        ok: true,
                        json: async () => parsed
                    };
                }
            } catch (err) {
                const errMsg = err.message || "";
                if (errMsg.includes("closed") || errMsg.includes("offline") || errMsg.includes("10061") || errMsg.includes("actively refused")) {
                    console.log("Bridge proxy: " + path + " is offline");
                } else {
                    console.warn("Bridge proxy error for " + path + ":", err);
                }
                // Do NOT fallback to window.fetch for 127.0.0.1:8000 because it will fail with CORS / connection refused and cause lag!
                throw err;
            }
        }
        return window.fetch(url, options);
    };
    const fetch = localFetch;

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
    const [wanInterface, setWanInterface] = useState('Wi-Fi');
    const [lanGatewayIp, setLanGatewayIp] = useState('192.168.10.1');
    const [autoRotateMinutes, setAutoRotateMinutes] = useState(0);

    // Config Panel toggle
    const [showConfig, setShowConfig] = useState(false);

    // Statuses
    const [routerActive, setRouterActive] = useState(false);
    const [singboxActive, setSingboxActive] = useState(false);
    const [dhcpActive, setDhcpActive] = useState(false);
    const [error, setError] = useState('');
    
    // API Local Port 8000 status
    const [localApiOnline, setLocalApiOnline] = useState(false);
    const [activeProxies, setActiveProxies] = useState([]);
    const [bypassCidrs, setBypassCidrs] = useState([]);
    const [checkingProxies, setCheckingProxies] = useState(false);

    // Connected devices & list state
    const [devices, setDevices] = useState([]);
    const [loadingDevices, setLoadingDevices] = useState(false);
    const [selectedDeviceMacs, setSelectedDeviceMacs] = useState(new Set());
    const [searchQuery, setSearchQuery] = useState('');

    // Tabs
    const [subTab, setSubTab] = useState('devices'); // 'devices' | 'proxies' | 'bypass'

    // Inline rename state
    const [renamingMac, setRenamingMac] = useState('');
    const [renamingName, setRenamingName] = useState('');

    // Modals
    const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
    const [bulkAssignProxyId, setBulkAssignProxyId] = useState('');
    const [bulkAssignRawText, setBulkAssignRawText] = useState('');

    const [showAddProxyModal, setShowAddProxyModal] = useState(false);
    const [addProxyRawText, setAddProxyRawText] = useState('');

    const [showBulkImportModal, setShowBulkImportModal] = useState(false);
    const [bulkImportRawText, setBulkImportRawText] = useState('');
    
    const [bypassInputText, setBypassInputText] = useState('');

    // Helpers
    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            alert('Đã sao chép: ' + text);
        });
    };

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

    // Main status update
    const fetchLocalStatus = useCallback(async () => {
        if (!isDesktop) return;
        
        // Fast-path: check if router is active via bridge first to avoid useless HTTP requests
        if (window.qhtdBridge && typeof window.qhtdBridge.isRouterActive === 'function') {
            try {
                const active = await window.qhtdBridge.isRouterActive();
                setRouterActive(active);
                if (!active) {
                    setLocalApiOnline(false);
                    setDhcpActive(false);
                    setSingboxActive(false);
                    // Fallback to bridge DHCP leases offline
                    const res = await window.qhtdBridge.getDHCPLeases();
                    const parsed = JSON.parse(res);
                    if (!parsed.error && Array.isArray(parsed)) {
                        setDevices(parsed);
                    }
                    return; // Avoid checking /status completely
                }
            } catch (bridgeErr) {
                console.error('Bridge status query failed:', bridgeErr);
            }
        }

        try {
            const res = await fetch('http://127.0.0.1:8000/status');
            if (!res.ok) throw new Error('API server offline');
            
            const data = await res.json();
            setLocalApiOnline(true);
            setActiveProxies(data.active_proxies || []);
            setBypassCidrs(data.bypass_cidrs || []);
            setAutoRotateMinutes(data.auto_rotate_minutes || 0);
            setWanInterface(data.wan_interface || '');
            setLanGatewayIp(data.lan_gateway_ip || '');
            
            // Map devices to standard format
            const mappedDevices = (data.devices || []).map(d => ({
                ip: d.ip,
                mac: d.mac,
                hostname: d.name || '',
                leased_at: d.leased_at || '',
                status: d.status,
                proxy_id: d.proxy_id || ''
            }));
            
            setDevices(mappedDevices);
            setDhcpActive(data.dhcp_running);
            setSingboxActive(data.singbox_running);
            setRouterActive(true);
        } catch (e) {
            setLocalApiOnline(false);
            // Fallback to bridge
            if (window.qhtdBridge) {
                try {
                    const res = await window.qhtdBridge.getDHCPLeases();
                    const parsed = JSON.parse(res);
                    if (!parsed.error && Array.isArray(parsed)) {
                        setDevices(parsed);
                    }
                    if (window.qhtdBridge.isRouterActive) {
                        const active = await window.qhtdBridge.isRouterActive();
                        setRouterActive(active);
                        setDhcpActive(active);
                        setSingboxActive(active);
                    }
                } catch (bridgeErr) {
                    console.error('Bridge lease query failed:', bridgeErr);
                }
            }
        }
    }, [isDesktop]);

    // Initial load and polling
    useEffect(() => {
        if (isDesktop) {
            fetchInterfaces();
            fetchLocalStatus();
            const interval = setInterval(fetchLocalStatus, 4000);
            return () => clearInterval(interval);
        }
    }, [isDesktop, fetchInterfaces, fetchLocalStatus]);

    // Set bypass text when bypass data loads
    useEffect(() => {
        if (bypassCidrs.length > 0) {
            setBypassInputText(bypassCidrs.join('\n'));
        }
    }, [bypassCidrs]);

    // Start/Stop Actions
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
                setTimeout(fetchLocalStatus, 1500);
            }
        } catch (e) {
            setError('Lỗi khởi động router: ' + e.message);
        }
    }, [selectedInterface, dhcpStart, dhcpEnd, subnetMask, dnsServer, isDesktop, fetchLocalStatus]);

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
                setLocalApiOnline(false);
                setDevices([]);
            }
        } catch (e) {
            setError('Lỗi dừng router: ' + e.message);
        }
    }, [isDesktop]);

    // Proxy Assignment Actions
    const handleAssignProxy = async (mac, proxyId) => {
        try {
            const res = await fetch('http://127.0.0.1:8000/api/devices/assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mac, proxy_id: proxyId || null })
            });
            if (res.ok) {
                fetchLocalStatus();
            } else {
                const data = await res.json();
                alert('Lỗi: ' + (data.detail || 'Không thể gán proxy'));
            }
        } catch (e) {
            alert('Lỗi kết nối API local: ' + e.message);
        }
    };

    const handleBulkAssign = async () => {
        const macs = Array.from(selectedDeviceMacs);
        if (macs.length === 0) return;
        try {
            if (bulkAssignRawText.trim()) {
                const rawList = bulkAssignRawText.split('\n').map(l => l.trim()).filter(Boolean);
                const res = await fetch('http://127.0.0.1:8000/api/devices/bulk-assign-raw', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ macs, proxy_raw_list: rawList })
                });
                if (res.ok) {
                    setSelectedDeviceMacs(new Set());
                    setBulkAssignRawText('');
                    setShowBulkAssignModal(false);
                    fetchLocalStatus();
                } else {
                    const data = await res.json();
                    alert('Lỗi: ' + (data.detail || 'Không thể gán proxy'));
                }
            } else {
                const res = await fetch('http://127.0.0.1:8000/api/devices/bulk-assign', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ macs, proxy_id: bulkAssignProxyId || null })
                });
                if (res.ok) {
                    setSelectedDeviceMacs(new Set());
                    setShowBulkAssignModal(false);
                    fetchLocalStatus();
                } else {
                    const data = await res.json();
                    alert('Lỗi: ' + (data.detail || 'Không thể gán proxy'));
                }
            }
        } catch (e) {
            alert('Lỗi kết nối API local: ' + e.message);
        }
    };

    const handleBulkResetDirect = async () => {
        const macs = Array.from(selectedDeviceMacs);
        if (macs.length === 0) return;
        if (!confirm(`Reset ${macs.length} thiết bị về mạng trực tiếp (Direct)?`)) return;
        try {
            const res = await fetch('http://127.0.0.1:8000/api/devices/bulk-assign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ macs, proxy_id: null })
            });
            if (res.ok) {
                setSelectedDeviceMacs(new Set());
                fetchLocalStatus();
            }
        } catch (e) {
            alert('Lỗi kết nối API local: ' + e.message);
        }
    };

    const handleSelectRow = (mac, checked) => {
        setSelectedDeviceMacs(prev => {
            const next = new Set(prev);
            if (checked) {
                next.add(mac);
            } else {
                next.delete(mac);
            }
            return next;
        });
    };

    const handleSelectAll = (e) => {
        const checked = e.target.checked;
        if (checked) {
            const allMacs = devices.map(d => d.mac).filter(Boolean);
            setSelectedDeviceMacs(new Set(allMacs));
        } else {
            setSelectedDeviceMacs(new Set());
        }
    };

    const handleRemoveDevice = async (mac) => {
        if (!confirm(`Xóa thiết bị có MAC: ${mac}?`)) return;
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/devices/remove/${encodeURIComponent(mac)}`, {
                method: 'POST'
            });
            if (res.ok) {
                fetchLocalStatus();
            }
        } catch (e) {
            alert('Lỗi kết nối API local: ' + e.message);
        }
    };

    const handleRemoveOfflineDevices = async () => {
        if (!confirm('Xóa tất cả các thiết bị Offline khỏi danh sách?')) return;
        try {
            const res = await fetch('http://127.0.0.1:8000/api/devices/remove-offline', {
                method: 'POST'
            });
            if (res.ok) {
                const data = await res.json();
                alert(`Đã xóa ${data.removed_count || 0} thiết bị offline.`);
                fetchLocalStatus();
            }
        } catch (e) {
            alert('Lỗi kết nối API local: ' + e.message);
        }
    };

    const handleRenameDevice = async (mac, newName) => {
        try {
            const res = await fetch('http://127.0.0.1:8000/api/devices/rename', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mac, name: newName })
            });
            if (res.ok) {
                setRenamingMac('');
                fetchLocalStatus();
            }
        } catch (e) {
            alert('Lỗi kết nối API local: ' + e.message);
        }
    };

    // Proxy CRUD Actions
    const handleAddProxy = async () => {
        if (!addProxyRawText.trim()) return;
        try {
            const res = await fetch('http://127.0.0.1:8000/api/proxies/bulk-import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: addProxyRawText })
            });
            if (res.ok) {
                setAddProxyRawText('');
                setShowAddProxyModal(false);
                fetchLocalStatus();
            } else {
                const data = await res.json();
                alert('Lỗi: ' + (data.detail || 'Không thể thêm proxy'));
            }
        } catch (e) {
            alert('Lỗi kết nối API local: ' + e.message);
        }
    };

    const handleBulkImportProxies = async () => {
        if (!bulkImportRawText.trim()) return;
        try {
            const res = await fetch('http://127.0.0.1:8000/api/proxies/bulk-import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: bulkImportRawText })
            });
            if (res.ok) {
                setBulkImportRawText('');
                setShowBulkImportModal(false);
                fetchLocalStatus();
            } else {
                const data = await res.json();
                alert('Lỗi: ' + (data.detail || 'Không thể import proxy'));
            }
        } catch (e) {
            alert('Lỗi kết nối API local: ' + e.message);
        }
    };

    const handleCheckProxiesStatus = async () => {
        setCheckingProxies(true);
        try {
            const res = await fetch('http://127.0.0.1:8000/api/proxies/check-all', {
                method: 'POST'
            });
            if (res.ok) {
                const data = await res.json();
                const results = data.results || [];
                const liveCount = results.filter(r => r.status === 'Live').length;
                alert(`Kiểm tra hoàn tất: ${liveCount}/${results.length} Live`);
                fetchLocalStatus();
            }
        } catch (e) {
            alert('Lỗi kết nối API local: ' + e.message);
        } finally {
            setCheckingProxies(false);
        }
    };

    const handleRemoveProxy = async (proxyId) => {
        if (!confirm(`Xóa proxy ${proxyId}?`)) return;
        try {
            const res = await fetch(`http://127.0.0.1:8000/api/proxies/remove/${encodeURIComponent(proxyId)}`, {
                method: 'POST'
            });
            if (res.ok) {
                fetchLocalStatus();
            }
        } catch (e) {
            alert('Lỗi kết nối API local: ' + e.message);
        }
    };

    const handleUpdateBypass = async () => {
        const bypass = bypassInputText.split('\n').map(l => l.trim()).filter(Boolean);
        try {
            const res = await fetch('http://127.0.0.1:8000/api/settings/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lan_interface: selectedInterface || 'Ethernet 3',
                    lan_gateway_ip: lanGatewayIp || '192.168.10.1',
                    wan_interface: wanInterface || 'Wi-Fi',
                    dhcp_range_start: dhcpStart,
                    dhcp_range_end: dhcpEnd,
                    dns_server: dnsServer,
                    auto_rotate_minutes: autoRotateMinutes,
                    bypass_cidrs: bypass
                })
            });
            if (res.ok) {
                alert('Cấu hình bypass đã được cập nhật thành công!');
                fetchLocalStatus();
            } else {
                const data = await res.json();
                alert('Lỗi: ' + (data.detail || 'Không thể cập nhật cấu hình'));
            }
        } catch (e) {
            alert('Lỗi kết nối API local: ' + e.message);
        }
    };

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

    // Filter devices
    const filteredDevices = devices.filter(d => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (d.ip || '').includes(q) ||
               (d.mac || '').toLowerCase().includes(q) ||
               (d.hostname || '').toLowerCase().includes(q);
    });

    const onlineDevicesCount = devices.filter(d => d.status === 'Online').length;
    const offlineDevicesCount = devices.length - onlineDevicesCount;
    const proxiedDevicesCount = devices.filter(d => d.proxy_id).length;
    const directDevicesCount = devices.length - proxiedDevicesCount;

    return (
        <div style={{ paddingBottom: '40px' }}>
            {/* Box 1: Compact Unified Header (Optimized Space) */}
            <div style={{
                background: 'var(--card-bg, rgba(255,255,255,0.02))',
                border: '1px solid var(--border-color)',
                borderRadius: '12px',
                padding: '12px 20px',
                marginBottom: '16px'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    {/* Left: Quick Actions & Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        {routerActive ? (
                            <button className="btn btn-danger" onClick={handleStopRouter} style={{ minHeight: '34px', padding: '0 16px', fontSize: '13px', fontWeight: 600 }}>
                                ⏹ Dừng Định Tuyến
                            </button>
                        ) : (
                            <button className="btn btn-primary" onClick={handleStartRouter} style={{ minHeight: '34px', padding: '0 16px', fontSize: '13px', fontWeight: 600, background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}>
                                ▶ Khởi Chạy Định Tuyến
                            </button>
                        )}
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>LAN:</span>
                            <select 
                                className="filter-select" 
                                style={{ minHeight: '30px', padding: '2px 8px', fontSize: '12px', width: '160px' }} 
                                value={selectedInterface} 
                                onChange={(e) => setSelectedInterface(e.target.value)} 
                                disabled={routerActive}
                            >
                                {interfaces.map((iface) => (
                                    <option key={iface.name} value={iface.name}>
                                        {iface.friendly_name || iface.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        <button 
                            className="btn btn-secondary" 
                            style={{ minHeight: '30px', padding: '4px 10px', fontSize: '12px' }}
                            onClick={() => setShowConfig(!showConfig)}
                        >
                            {showConfig ? '🔼 Ẩn Cấu hình' : '⚙️ Cấu hình DHCP/DNS'}
                        </button>
                        
                        <button 
                            className="btn btn-secondary" 
                            style={{ minHeight: '30px', padding: '4px 8px', fontSize: '12px' }}
                            onClick={fetchInterfaces} 
                            disabled={loadingInterfaces}
                        >
                            🔄 Làm mới
                        </button>
                    </div>

                    {/* Right: Tiny Status Dots */}
                    <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                            <span style={{
                                width: '8px', height: '8px', borderRadius: '50%',
                                background: routerActive ? '#10b981' : '#ef4444',
                                display: 'inline-block',
                                boxShadow: routerActive ? '0 0 6px #10b981' : 'none'
                            }}></span>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Router</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                            <span style={{
                                width: '8px', height: '8px', borderRadius: '50%',
                                background: dhcpActive ? '#10b981' : '#ef4444',
                                display: 'inline-block',
                                boxShadow: dhcpActive ? '0 0 6px #10b981' : 'none'
                            }}></span>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>DHCP</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                            <span style={{
                                width: '8px', height: '8px', borderRadius: '50%',
                                background: singboxActive ? '#10b981' : '#ef4444',
                                display: 'inline-block',
                                boxShadow: singboxActive ? '0 0 6px #10b981' : 'none'
                            }}></span>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Proxy</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                            <span style={{
                                width: '8px', height: '8px', borderRadius: '50%',
                                background: localApiOnline ? '#06b6d4' : '#ef4444',
                                display: 'inline-block',
                                boxShadow: localApiOnline ? '0 0 6px #06b6d4' : 'none'
                            }}></span>
                            <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>API Local</span>
                        </div>
                    </div>
                </div>

                {/* Advanced Config Section */}
                {showConfig && (
                    <div style={{ 
                        marginTop: '12px', 
                        paddingTop: '12px', 
                        borderTop: '1px solid var(--border-color)',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '12px'
                    }}>
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>DHCP Bắt đầu</label>
                            <input type="text" className="form-input" style={{ fontSize: '12px', minHeight: '28px' }} value={dhcpStart} onChange={(e) => setDhcpStart(e.target.value)} disabled={routerActive} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>DHCP Kết thúc</label>
                            <input type="text" className="form-input" style={{ fontSize: '12px', minHeight: '28px' }} value={dhcpEnd} onChange={(e) => setDhcpEnd(e.target.value)} disabled={routerActive} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>Subnet Mask</label>
                            <input type="text" className="form-input" style={{ fontSize: '12px', minHeight: '28px' }} value={subnetMask} onChange={(e) => setSubnetMask(e.target.value)} disabled={routerActive} />
                        </div>
                        <div className="form-group">
                            <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>DNS Server</label>
                            <input type="text" className="form-input" style={{ fontSize: '12px', minHeight: '28px' }} value={dnsServer} onChange={(e) => setDnsServer(e.target.value)} disabled={routerActive} />
                        </div>
                    </div>
                )}

                {error && (
                    <div style={{
                        padding: '8px 12px',
                        marginTop: '10px',
                        borderRadius: '6px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: '#fca5a5',
                        fontSize: '12px'
                    }}>
                        ⚠️ {error}
                    </div>
                )}
            </div>

            {/* Sub navigation tabs */}
            <div style={{
                display: 'flex',
                gap: '6px',
                marginBottom: '16px',
                borderBottom: '1px solid var(--border-color)',
                paddingBottom: '8px'
            }}>
                <button 
                    style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        background: subTab === 'devices' ? 'var(--active-bg, rgba(0, 242, 254, 0.08))' : 'transparent',
                        color: subTab === 'devices' ? 'var(--accent, #00f2fe)' : 'var(--text-muted, #94a3b8)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        fontSize: '13.5px'
                    }}
                    onClick={() => setSubTab('devices')}
                >
                    🔗 Thiết bị ({devices.length})
                </button>
                <button 
                    style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        background: subTab === 'proxies' ? 'var(--active-bg, rgba(0, 242, 254, 0.08))' : 'transparent',
                        color: subTab === 'proxies' ? 'var(--accent, #00f2fe)' : 'var(--text-muted, #94a3b8)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        fontSize: '13.5px'
                    }}
                    onClick={() => setSubTab('proxies')}
                >
                    🌐 Danh sách Proxy ({activeProxies.length})
                </button>
                <button 
                    style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: 'none',
                        background: subTab === 'bypass' ? 'var(--active-bg, rgba(0, 242, 254, 0.08))' : 'transparent',
                        color: subTab === 'bypass' ? 'var(--accent, #00f2fe)' : 'var(--text-muted, #94a3b8)',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        fontSize: '13.5px'
                    }}
                    onClick={() => setSubTab('bypass')}
                >
                    🛡️ Bypass CIDRs
                </button>
            </div>

            {/* TAB CONTENT: Connected Devices */}
            {subTab === 'devices' && (
                <div style={{
                    background: 'var(--card-bg, rgba(255,255,255,0.02))',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '20px',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 600 }}>🔗 Thiết bị đang kết nối</h3>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                (Tổng: <strong style={{ color: 'var(--accent)' }}>{devices.length}</strong> | 
                                Online: <strong style={{ color: '#10b981' }}>{onlineDevicesCount}</strong> | 
                                Offline: <strong style={{ color: '#ef4444' }}>{offlineDevicesCount}</strong> | 
                                Proxy: <strong style={{ color: '#a78bfa' }}>{proxiedDevicesCount}</strong> | 
                                Direct: <strong style={{ color: '#06b6d4' }}>{directDevicesCount}</strong>)
                            </span>
                        </div>
                        {/* Search bar */}
                        <div style={{ position: 'relative', minWidth: '220px' }}>
                            <input 
                                type="text" 
                                className="form-input" 
                                style={{ width: '100%', paddingLeft: '32px', minHeight: '30px', fontSize: '13px' }} 
                                placeholder="Tìm kiếm IP, MAC, Tên..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                        </div>
                    </div>

                    {/* Action buttons bar */}
                    {localApiOnline && (
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                            <button className="btn btn-secondary" onClick={fetchLocalStatus} style={{ padding: '4px 10px', fontSize: '12px', minHeight: '28px' }}>
                                🔄 Quét lại
                            </button>
                            <button 
                                className="btn btn-primary" 
                                onClick={() => {
                                    if (selectedDeviceMacs.size === 0) {
                                        alert('Vui lòng chọn ít nhất một thiết bị!');
                                        return;
                                    }
                                    setBulkAssignProxyId('');
                                    setBulkAssignRawText('');
                                    setShowBulkAssignModal(true);
                                }} 
                                style={{ padding: '4px 10px', fontSize: '12px', minHeight: '28px' }}
                            >
                                🔗 Gán Proxy Hàng Loạt
                            </button>
                            <button 
                                className="btn btn-danger" 
                                onClick={handleBulkResetDirect} 
                                style={{ padding: '4px 10px', fontSize: '12px', minHeight: '28px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                                disabled={selectedDeviceMacs.size === 0}
                            >
                                🚫 Reset Direct
                            </button>
                            <button 
                                className="btn btn-secondary" 
                                onClick={handleRemoveOfflineDevices} 
                                style={{ padding: '4px 10px', fontSize: '12px', minHeight: '28px', marginLeft: 'auto' }}
                            >
                                🗑️ Xóa Offline
                            </button>
                        </div>
                    )}

                    <div className="table-container" style={{ margin: 0, maxHeight: '420px', overflowY: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    {localApiOnline && <th width="40">
                                        <input 
                                            type="checkbox" 
                                            onChange={handleSelectAll} 
                                            checked={devices.length > 0 && selectedDeviceMacs.size === devices.length}
                                        />
                                    </th>}
                                    <th>Tên thiết bị</th>
                                    <th>IP Address</th>
                                    <th>MAC Address</th>
                                    <th>Trạng thái</th>
                                    <th>Proxy Giao Tiếp</th>
                                    {localApiOnline && <th>Thao tác</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredDevices.length === 0 ? (
                                    <tr>
                                        <td colSpan={localApiOnline ? 7 : 5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                            {routerActive ? 'Không tìm thấy thiết bị nào phù hợp.' : 'Vui lòng khởi chạy Router để quét thiết bị.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredDevices.map((dev, idx) => {
                                        const isChecked = selectedDeviceMacs.has(dev.mac);
                                        return (
                                            <tr key={dev.mac || idx}>
                                                {localApiOnline && <td>
                                                    <input 
                                                        type="checkbox" 
                                                        checked={isChecked}
                                                        onChange={(e) => handleSelectRow(dev.mac, e.target.checked)}
                                                    />
                                                </td>}
                                                <td>
                                                    {renamingMac === dev.mac ? (
                                                        <div style={{ display: 'flex', gap: '4px' }}>
                                                            <input 
                                                                type="text" 
                                                                className="form-input" 
                                                                style={{ padding: '2px 6px', fontSize: '12px', minHeight: '24px', flex: 1 }}
                                                                value={renamingName}
                                                                onChange={(e) => setRenamingName(e.target.value)}
                                                                onBlur={() => handleRenameDevice(dev.mac, renamingName)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleRenameDevice(dev.mac, renamingName);
                                                                    if (e.key === 'Escape') setRenamingMac('');
                                                                }}
                                                                autoFocus
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span style={{ fontWeight: 500 }}>{dev.hostname || '—'}</span>
                                                            {localApiOnline && (
                                                                <span 
                                                                    style={{ cursor: 'pointer', fontSize: '11px', opacity: 0.6 }} 
                                                                    title="Sửa tên"
                                                                    onClick={() => {
                                                                        setRenamingMac(dev.mac);
                                                                        setRenamingName(dev.hostname || '');
                                                                    }}
                                                                >
                                                                    ✏️
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td style={{ fontWeight: 600, color: '#06b6d4' }}>
                                                    <span style={{ cursor: 'pointer' }} onClick={() => copyToClipboard(dev.ip)} title="Click để copy">
                                                        {dev.ip}
                                                    </span>
                                                </td>
                                                <td style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                                                    <span style={{ cursor: 'pointer' }} onClick={() => copyToClipboard(dev.mac)} title="Click để copy">
                                                        {dev.mac}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span style={{
                                                        padding: '3px 8px',
                                                        borderRadius: '12px',
                                                        fontSize: '11px',
                                                        fontWeight: 600,
                                                        background: dev.status === 'Online' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                                                        color: dev.status === 'Online' ? '#10b981' : '#ef4444',
                                                        border: `1px solid ${dev.status === 'Online' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                                                    }}>
                                                        ● {dev.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <select 
                                                        className="filter-select"
                                                        style={{ padding: '4px 8px', fontSize: '12px', minHeight: '26px', width: '100%', background: 'var(--input-bg)' }}
                                                        value={dev.proxy_id || ''}
                                                        onChange={(e) => handleAssignProxy(dev.mac, e.target.value)}
                                                        disabled={!localApiOnline}
                                                    >
                                                        <option value="">Direct (Mạng trực tiếp)</option>
                                                        {activeProxies.map(p => (
                                                            <option key={p.id} value={p.id}>{p.host}:{p.port}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                {localApiOnline && <td>
                                                    <button 
                                                        className="btn btn-danger" 
                                                        style={{ padding: '2px 8px', fontSize: '11px', minHeight: '24px' }}
                                                        onClick={() => handleRemoveDevice(dev.mac)}
                                                        title="Xóa thiết bị"
                                                    >
                                                        🗑️
                                                    </button>
                                                </td>}
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: Proxies */}
            {subTab === 'proxies' && (
                <div style={{
                    background: 'var(--card-bg, rgba(255,255,255,0.02))',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '20px',
                }}>
                    {!localApiOnline ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                            <span style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}>⚠️</span>
                            <strong>Chưa kết nối tới API cục bộ</strong>
                            <p style={{ fontSize: '12px', marginTop: '6px' }}>Vui lòng bấm nút <strong>Khởi chạy định tuyến</strong> ở trên để khởi động dịch vụ và quản lý Proxy.</p>
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>🌐 Danh sách Proxy</h3>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <button className="btn btn-primary" onClick={() => setShowAddProxyModal(true)} style={{ padding: '4px 10px', fontSize: '12px', minHeight: '28px' }}>
                                        ➕ Thêm Proxy
                                    </button>
                                    <button className="btn btn-secondary" onClick={() => setShowBulkImportModal(true)} style={{ padding: '4px 10px', fontSize: '12px', minHeight: '28px' }}>
                                        📥 Import Hàng Loạt
                                    </button>
                                    <button 
                                        className="btn btn-secondary" 
                                        onClick={handleCheckProxiesStatus} 
                                        disabled={checkingProxies}
                                        style={{ padding: '4px 10px', fontSize: '12px', minHeight: '28px', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: '1px solid rgba(34, 197, 94, 0.2)' }}
                                    >
                                        {checkingProxies ? '⏳ Đang kiểm tra...' : '⚡ Check Live/Die'}
                                    </button>
                                </div>
                            </div>

                            <div className="table-container" style={{ margin: 0, maxHeight: '420px', overflowY: 'auto' }}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Proxy ID</th>
                                            <th>Giao thức</th>
                                            <th>Host:Port</th>
                                            <th>Tài khoản</th>
                                            <th>Trạng thái</th>
                                            <th>Độ trễ (Latency)</th>
                                            <th>Thao tác</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {activeProxies.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                                    Chưa có proxy nào. Hãy nhấp "Thêm Proxy" để bắt đầu.
                                                </td>
                                            </tr>
                                        ) : (
                                            activeProxies.map((p) => (
                                                <tr key={p.id}>
                                                    <td style={{ fontWeight: 600 }}>{p.id}</td>
                                                    <td>
                                                        <span style={{
                                                            padding: '2px 6px',
                                                            borderRadius: '6px',
                                                            fontSize: '11px',
                                                            background: 'rgba(0, 242, 254, 0.08)',
                                                            color: 'var(--accent)',
                                                            fontWeight: 600
                                                        }}>
                                                            {String(p.type).toUpperCase()}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span style={{ cursor: 'pointer', fontFamily: 'monospace' }} onClick={() => copyToClipboard(`${p.host}:${p.port}`)}>
                                                            {p.host}:{p.port}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {p.username ? (
                                                            <span style={{ fontSize: '12px' }}>{p.username}:*****</span>
                                                        ) : (
                                                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Không có</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <span style={{
                                                            padding: '3px 8px',
                                                            borderRadius: '12px',
                                                            fontSize: '11px',
                                                            fontWeight: 600,
                                                            background: p.status === 'Live' ? 'rgba(16, 185, 129, 0.1)' : p.status === 'Die' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.03)',
                                                            color: p.status === 'Live' ? '#10b981' : p.status === 'Die' ? '#ef4444' : 'var(--text-muted)',
                                                            border: `1px solid ${p.status === 'Live' ? 'rgba(16, 185, 129, 0.2)' : p.status === 'Die' ? 'rgba(239, 68, 68, 0.2)' : 'var(--border-color)'}`
                                                        }}>
                                                            ● {p.status || 'Chưa kiểm tra'}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontFamily: 'monospace' }}>
                                                        {p.latency > 0 ? (
                                                            <strong style={{ color: p.latency < 500 ? '#10b981' : '#f59e0b' }}>{p.latency} ms</strong>
                                                        ) : (
                                                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <button 
                                                            className="btn btn-danger" 
                                                            style={{ padding: '2px 8px', fontSize: '11px', minHeight: '24px' }}
                                                            onClick={() => handleRemoveProxy(p.id)}
                                                            title="Xóa proxy"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* TAB CONTENT: Bypass CIDRs */}
            {subTab === 'bypass' && (
                <div style={{
                    background: 'var(--card-bg, rgba(255,255,255,0.02))',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '20px',
                }}>
                    {!localApiOnline ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                            <span style={{ fontSize: '32px', display: 'block', marginBottom: '12px' }}>⚠️</span>
                            <strong>Chưa kết nối tới API cục bộ</strong>
                            <p style={{ fontSize: '12px', marginTop: '6px' }}>Vui lòng bấm nút <strong>Khởi chạy định tuyến</strong> ở trên để khởi động dịch vụ và cấu hình Bypass.</p>
                        </div>
                    ) : (
                        <>
                            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>🛡️ Bypass (Không đi qua Proxy)</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>
                                Các dải IP (CIDR) bên dưới sẽ được định tuyến trực tiếp đi thẳng mạng nhà mạng (Direct), hoàn toàn bỏ qua Sing-Box proxy tunnel.
                            </p>
                            
                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <textarea 
                                    className="form-input" 
                                    rows="10" 
                                    style={{ width: '100%', fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.6', resize: 'vertical' }}
                                    placeholder={"10.0.0.0/8\n172.16.0.0/12\n192.168.0.0/16"}
                                    value={bypassInputText}
                                    onChange={(e) => setBypassInputText(e.target.value)}
                                />
                            </div>
                            
                            <button className="btn btn-primary" onClick={handleUpdateBypass} style={{ minHeight: '38px', padding: '0 20px', fontWeight: 600 }}>
                                💾 Cập nhật danh sách Bypass
                            </button>
                        </>
                    )}
                </div>
            )}

            {/* ═══ MODAL: Bulk Assign ═══ */}
            {showBulkAssignModal && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        background: '#0f1224',
                        border: '1px solid var(--border-color)',
                        borderRadius: '16px',
                        padding: '24px',
                        width: '90%',
                        maxWidth: '500px',
                        color: 'var(--text-color)'
                    }}>
                        <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>Gán Proxy Hàng Loạt</h3>
                        <p style={{ marginBottom: '12px', fontSize: '14px', color: 'var(--text-muted)' }}>
                            Đang chọn: <strong style={{ color: 'var(--accent)' }}>{selectedDeviceMacs.size}</strong> thiết bị.
                        </p>
                        <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label className="form-label">Chọn Proxy:</label>
                            <select className="filter-select" style={{ width: '100%' }} value={bulkAssignProxyId} onChange={(e) => setBulkAssignProxyId(e.target.value)}>
                                <option value="">Direct (Mạng nhà mạng)</option>
                                {activeProxies.map(p => (
                                    <option key={p.id} value={p.id}>{p.host}:{p.port} ({p.status || 'Unknown'})</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label className="form-label">Hoặc nhập danh sách proxy (mỗi dòng gán cho 1 máy tương ứng):</label>
                            <textarea 
                                className="form-input" 
                                rows="4" 
                                style={{ width: '100%', resize: 'vertical', fontFamily: 'monospace' }} 
                                placeholder={"socks5://103.45.67.89:1080\nhttp://user:pass@host:port"}
                                value={bulkAssignRawText}
                                onChange={(e) => setBulkAssignRawText(e.target.value)}
                            />
                            <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>Dòng 1 → máy 1, Dòng 2 → máy 2...</small>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setShowBulkAssignModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleBulkAssign}>Áp dụng</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ MODAL: Add Single Proxy ═══ */}
            {showAddProxyModal && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        background: '#0f1224',
                        border: '1px solid var(--border-color)',
                        borderRadius: '16px',
                        padding: '24px',
                        width: '90%',
                        maxWidth: '450px',
                        color: 'var(--text-color)'
                    }}>
                        <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>Thêm Proxy Mới</h3>
                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <label className="form-label">Nhập Proxy thô (host:port hoặc url):</label>
                            <input 
                                type="text" 
                                className="form-input" 
                                style={{ width: '100%' }} 
                                placeholder="socks5://user:pass@host:port"
                                value={addProxyRawText}
                                onChange={(e) => setAddProxyRawText(e.target.value)}
                            />
                            <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>Định dạng: `socks5://host:port` hoặc `host:port:user:pass`</small>
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setShowAddProxyModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleAddProxy}>Lưu</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ MODAL: Bulk Import Proxies ═══ */}
            {showBulkImportModal && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    zIndex: 9999
                }}>
                    <div style={{
                        background: '#0f1224',
                        border: '1px solid var(--border-color)',
                        borderRadius: '16px',
                        padding: '24px',
                        width: '90%',
                        maxWidth: '500px',
                        color: 'var(--text-color)'
                    }}>
                        <h3 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>Import Proxy Hàng Loạt</h3>
                        <p style={{ marginBottom: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>Nhập danh sách proxy, mỗi dòng là một proxy.</p>
                        <div className="form-group" style={{ marginBottom: '20px' }}>
                            <textarea 
                                className="form-input" 
                                rows="8" 
                                style={{ width: '100%', fontFamily: 'monospace' }} 
                                placeholder={"103.45.67.2:1080\n103.45.67.3:1080:user:pass\nsocks5://user:pass@host:port"}
                                value={bulkImportRawText}
                                onChange={(e) => setBulkImportRawText(e.target.value)}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setShowBulkImportModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleBulkImportProxies}>Import</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
