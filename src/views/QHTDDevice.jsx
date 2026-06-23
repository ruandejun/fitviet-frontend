import React, { useState, useEffect, useCallback } from 'react';

const APP_GRADIENTS = [
    'linear-gradient(135deg, #ec4899, #8b5cf6)',
    'linear-gradient(135deg, #3b82f6, #06b6d4)',
    'linear-gradient(135deg, #10b981, #3b82f6)',
    'linear-gradient(135deg, #f59e0b, #ec4899)',
    'linear-gradient(135deg, #8b5cf6, #3b82f6)',
    'linear-gradient(135deg, #06b6d4, #10b981)',
];

const getAppGradient = (bundleId) => {
    if (!bundleId) return APP_GRADIENTS[0];
    let hash = 0;
    for (let i = 0; i < bundleId.length; i++) {
        hash = bundleId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % APP_GRADIENTS.length;
    return APP_GRADIENTS[index];
};

/**
 * QHTDDevice — Tab "Thiết bị iOS" cho desktop app
 * Chỉ hiển thị khi chạy trong QHTD Desktop (window.__QHTD_DESKTOP__ === true)
 * Giao tiếp với Python qua window.qhtdBridge (QWebChannel)
 */
export default function QHTDDevice() {
    const [devices, setDevices] = useState([]);
    const [scanning, setScanning] = useState(false);
    const [error, setError] = useState('');
    const [selectedDevice, setSelectedDevice] = useState(null);
    const [apps, setApps] = useState([]);
    const [loadingApps, setLoadingApps] = useState(false);
    const [toolInfo, setToolInfo] = useState(null);
    const [appSearch, setAppSearch] = useState('');

    // Action status
    const [runningAction, setRunningAction] = useState('');
    const [statusText, setStatusText] = useState('Sẵn sàng');

    // Load tool info on mount
    useEffect(() => {
        const loadInfo = async () => {
            if (window.qhtdBridge) {
                try {
                    const info = await window.qhtdBridge.getToolInfo();
                    setToolInfo(JSON.parse(info));
                } catch (e) {
                    console.error('Failed to get tool info:', e);
                }
            }
        };
        loadInfo();
        
        window.addEventListener('qhtdBridgeReady', loadInfo);
        const timer = setTimeout(loadInfo, 1000);
        const timer2 = setTimeout(loadInfo, 3000);
        return () => {
            window.removeEventListener('qhtdBridgeReady', loadInfo);
            clearTimeout(timer);
            clearTimeout(timer2);
        };
    }, []);

    const handleScan = useCallback(async () => {
        if (!window.qhtdBridge) {
            setError('Bridge chưa sẵn sàng. Vui lòng khởi động lại ứng dụng.');
            return;
        }
        setScanning(true);
        setError('');
        setDevices([]);
        setSelectedDevice(null);
        setApps([]);
        setStatusText('Đang quét USB...');

        try {
            const result = await window.qhtdBridge.scanDevices();
            const parsed = JSON.parse(result);
            if (parsed.error) {
                setError(parsed.error);
                setStatusText('Lỗi quét thiết bị');
            } else if (Array.isArray(parsed)) {
                setDevices(parsed);
                if (parsed.length > 0) {
                    setSelectedDevice(parsed[0]);
                    setStatusText(`Đã tìm thấy ${parsed.length} thiết bị`);
                } else {
                    setStatusText('Không tìm thấy thiết bị');
                }
            }
        } catch (e) {
            setError('Lỗi quét thiết bị: ' + e.message);
            setStatusText('Lỗi: ' + e.message);
        } finally {
            setScanning(false);
        }
    }, []);

    const handleGetApps = useCallback(async (serial) => {
        if (!window.qhtdBridge || !serial) return;
        setLoadingApps(true);
        setError('');
        try {
            const result = await window.qhtdBridge.getDeviceApps(serial);
            const parsed = JSON.parse(result);
            if (parsed.error) {
                setError(parsed.error);
            } else {
                setApps(parsed);
            }
        } catch (e) {
            setError('Lỗi lấy danh sách app: ' + e.message);
        } finally {
            setLoadingApps(false);
        }
    }, []);

    useEffect(() => {
        if (selectedDevice?.serial) {
            handleGetApps(selectedDevice.serial);
            setAppSearch('');
        } else {
            setApps([]);
            setAppSearch('');
        }
    }, [selectedDevice, handleGetApps]);

    const handleActivate = useCallback(async (serial) => {
        if (!window.qhtdBridge || !serial) return;
        if (!window.confirm("Bạn có chắc muốn Kích hoạt thiết bị này không?")) return;
        setRunningAction('activating');
        setStatusText('⏳ Đang kích hoạt thiết bị...');
        try {
            const res = await window.qhtdBridge.activateDevice(serial);
            const parsed = JSON.parse(res);
            if (parsed.success) {
                setStatusText('✅ Kích hoạt thành công!');
                alert('Kích hoạt thiết bị thành công!');
            } else {
                setError(parsed.error || 'Lỗi kích hoạt');
                setStatusText('❌ Thất bại');
            }
        } catch (e) {
            setError(e.message);
            setStatusText('❌ Thất bại: ' + e.message);
        } finally {
            setRunningAction('');
        }
    }, []);

    const handleErase = useCallback(async (serial) => {
        if (!window.qhtdBridge || !serial) return;
        if (!window.confirm("CẢNH BÁO NGUY HIỂM: Bạn có chắc chắn muốn XÓA SẠCH thiết bị này không? Toàn bộ dữ liệu sẽ bị xóa vĩnh viễn!")) return;
        setRunningAction('erasing');
        setStatusText('⏳ Đang xóa thiết bị...');
        try {
            const res = await window.qhtdBridge.eraseDevice(serial);
            const parsed = JSON.parse(res);
            if (parsed.success) {
                setStatusText('✅ Đã xóa sạch thiết bị thành công!');
                alert('Thiết bị đang được xóa và khôi phục cài đặt gốc!');
            } else {
                setError(parsed.error || 'Lỗi xóa thiết bị');
                setStatusText('❌ Thất bại');
            }
        } catch (e) {
            setError(e.message);
            setStatusText('❌ Thất bại: ' + e.message);
        } finally {
            setRunningAction('');
        }
    }, []);

    const handleBackupApp = useCallback(async (serial, bundleId) => {
        if (!window.qhtdBridge || !serial || !bundleId) return;
        setRunningAction(`backup-${bundleId}`);
        try {
            const res = await window.qhtdBridge.backupAppData(serial, bundleId);
            const parsed = JSON.parse(res);
            if (parsed.success) {
                alert(`✅ Đã backup App Data cho: ${bundleId}\nLưu tại: ${parsed.path || ''}`);
            } else {
                alert(`❌ Lỗi backup: ${parsed.error}`);
            }
        } catch (e) {
            alert(`❌ Lỗi: ${e.message}`);
        } finally {
            setRunningAction('');
        }
    }, []);

    const handleRestoreApp = useCallback(async (serial, bundleId) => {
        if (!window.qhtdBridge || !serial || !bundleId) return;
        setRunningAction(`restore-${bundleId}`);
        try {
            const res = await window.qhtdBridge.restoreAppData(serial, bundleId);
            const parsed = JSON.parse(res);
            if (parsed.success) {
                alert(`✅ Đã restore App Data cho: ${bundleId}`);
            } else {
                alert(`❌ Lỗi restore: ${parsed.error}`);
            }
        } catch (e) {
            alert(`❌ Lỗi: ${e.message}`);
        } finally {
            setRunningAction('');
        }
    }, []);

    const handleClearApp = useCallback(async (serial, bundleId) => {
        if (!window.qhtdBridge || !serial || !bundleId) return;
        if (!window.confirm(`Bạn có chắc muốn xóa sạch dữ liệu (Clear App Data) của ${bundleId}?`)) return;
        setRunningAction(`clear-${bundleId}`);
        try {
            const res = await window.qhtdBridge.clearAppData(serial, bundleId);
            const parsed = JSON.parse(res);
            if (parsed.success) {
                alert(`✅ Đã xóa sạch dữ liệu cho: ${bundleId}`);
            } else {
                alert(`❌ Lỗi clear: ${parsed.error}`);
            }
        } catch (e) {
            alert(`❌ Lỗi: ${e.message}`);
        } finally {
            setRunningAction('');
        }
    }, []);

    const handleCopyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text)
            .then(() => alert(`Đã sao chép ${label} vào bộ nhớ tạm!`))
            .catch(err => alert('Lỗi khi sao chép: ' + err));
    };

    const filteredApps = apps.filter(app => 
        app.name.toLowerCase().includes(appSearch.toLowerCase()) || 
        app.bundle_id.toLowerCase().includes(appSearch.toLowerCase())
    );

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
            <style>{`
                @keyframes devicePulse {
                    0% { transform: scale(0.95); opacity: 0.5; }
                    50% { transform: scale(1.1); opacity: 1; box-shadow: 0 0 10px var(--success); }
                    100% { transform: scale(0.95); opacity: 0.5; }
                }
                .device-pulse-dot {
                    animation: devicePulse 1.5s infinite ease-in-out;
                }
                .copy-btn-hover:hover {
                    color: var(--accent) !important;
                    background: rgba(0, 242, 254, 0.08) !important;
                }
                .app-row-hover:hover {
                    background: var(--table-hover) !important;
                }
            `}</style>

            {/* Header / Title & System Status Pills */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                flexWrap: 'wrap',
                gap: '12px'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, background: 'linear-gradient(135deg, var(--accent), var(--primary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        📱 THIẾT BỊ IOS
                    </h2>
                    {scanning && (
                        <div className="device-pulse-dot" style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: 'var(--success)'
                        }} />
                    )}
                </div>

                {toolInfo && (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                            fontSize: '11px',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-muted)'
                        }}>
                            Client: <strong>v{toolInfo.version}</strong>
                        </span>
                        <span style={{
                            fontSize: '11px',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-muted)'
                        }}>
                            OS: <strong>{toolInfo.os === 'win32' ? 'Windows' : toolInfo.os}</strong>
                        </span>
                        <span style={{
                            fontSize: '11px',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            background: toolInfo.pymobiledevice3 ? 'rgba(0, 255, 159, 0.08)' : 'rgba(255, 7, 58, 0.08)',
                            border: `1px solid ${toolInfo.pymobiledevice3 ? 'rgba(0, 255, 159, 0.2)' : 'rgba(255, 7, 58, 0.2)'}`,
                            color: toolInfo.pymobiledevice3 ? 'var(--success)' : 'var(--danger)'
                        }}>
                            pymobiledevice3: {toolInfo.pymobiledevice3 ? 'Sẵn sàng' : 'Chưa cài'}
                        </span>
                        <span style={{
                            fontSize: '11px',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            background: toolInfo.mun_anti_browser ? 'rgba(0, 255, 159, 0.08)' : 'rgba(255, 7, 58, 0.08)',
                            border: `1px solid ${toolInfo.mun_anti_browser ? 'rgba(0, 255, 159, 0.2)' : 'rgba(255, 7, 58, 0.2)'}`,
                            color: toolInfo.mun_anti_browser ? 'var(--success)' : 'var(--danger)'
                        }}>
                            MunLogin: {toolInfo.mun_anti_browser ? 'Sẵn sàng' : 'Chưa cài'}
                        </span>
                    </div>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div style={{
                    padding: '12px 16px',
                    marginBottom: '16px',
                    borderRadius: '10px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#fca5a5',
                    fontSize: '13px'
                }}>
                    ⚠️ {error}
                </div>
            )}

            <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch', height: 'calc(100vh - 150px)', minHeight: '580px', boxSizing: 'border-box' }}>
                
                {/* Column 1: USB Devices List (Left, 280px) */}
                <div style={{ 
                    width: '280px', 
                    minWidth: '280px',
                    background: 'var(--panel-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxSizing: 'border-box'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            📱 Thiết bị USB ({devices.length})
                        </span>
                        <button 
                            className="btn btn-primary" 
                            onClick={handleScan} 
                            disabled={scanning}
                            style={{ padding: '4px 10px', fontSize: '12px', minHeight: '28px' }}
                        >
                            {scanning ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <div className="device-pulse-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ffffff' }} />
                                    Quét
                                </span>
                            ) : '🔄 Quét'}
                        </button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                        {devices.length === 0 ? (
                            <div style={{ 
                                textAlign: 'center', 
                                padding: '40px 10px', 
                                color: 'var(--text-muted)', 
                                fontSize: '12px',
                                border: '1px dashed var(--border-color)',
                                borderRadius: '8px',
                                background: 'rgba(255,255,255,0.01)',
                                lineHeight: '1.6'
                            }}>
                                {scanning ? 'Đang tìm kiếm thiết bị...' : 'Chưa nhận diện được iPhone. Hãy cắm cáp USB và bấm nút Quét ở trên.'}
                            </div>
                        ) : (
                            devices.map((dev, idx) => {
                                const isActive = selectedDevice?.serial === dev.serial;
                                return (
                                    <div 
                                        key={dev.serial || idx} 
                                        onClick={() => setSelectedDevice(dev)}
                                        style={{
                                            padding: '12px 14px',
                                            borderRadius: '10px',
                                            background: isActive ? 'rgba(0, 242, 254, 0.04)' : 'rgba(255, 255, 255, 0.01)',
                                            border: `1px solid ${isActive ? 'rgba(0, 242, 254, 0.3)' : 'var(--border-color)'}`,
                                            cursor: 'pointer',
                                            marginBottom: '8px',
                                            transition: 'all 0.2s ease',
                                            boxShadow: isActive ? '0 0 10px rgba(0, 242, 254, 0.1)' : 'none',
                                            position: 'relative'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isActive) {
                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isActive) {
                                                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)';
                                                e.currentTarget.style.borderColor = 'var(--border-color)';
                                            }
                                        }}
                                    >
                                        {isActive && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '12px',
                                                right: '12px',
                                                width: '6px',
                                                height: '6px',
                                                borderRadius: '50%',
                                                backgroundColor: 'var(--accent)',
                                                boxShadow: '0 0 6px var(--accent)'
                                            }} />
                                        )}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px', paddingRight: isActive ? '12px' : '0' }}>
                                            <div style={{ fontWeight: 700, fontSize: '13px', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>
                                                {dev.name || 'iPhone'}
                                            </div>
                                            <span className="badge badge-info" style={{ fontSize: '9px', padding: '2px 6px', background: 'rgba(0, 242, 254, 0.1)', color: 'var(--accent)', border: '1px solid rgba(0, 242, 254, 0.15)' }}>
                                                iOS {dev.ios_version || '—'}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                                            <span>{dev.model || 'Unknown'}</span>
                                            <span style={{ fontFamily: 'monospace' }}>
                                                {dev.udid ? dev.udid.substring(0, 8) + '...' : '—'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Column 2: Selected Device Control Panel (Center, 340px) */}
                <div style={{ 
                    width: '340px',
                    minWidth: '340px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxSizing: 'border-box'
                }}>
                    {selectedDevice ? (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            flex: 1,
                            background: 'var(--panel-bg)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '12px',
                            padding: '16px',
                            boxSizing: 'border-box'
                        }}>
                            {/* Device Overview Header */}
                            <div style={{ 
                                textAlign: 'center', 
                                padding: '16px 0',
                                borderBottom: '1px solid var(--border-color)',
                                marginBottom: '16px'
                            }}>
                                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🍎</div>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: 800, color: '#f8fafc' }}>
                                    {selectedDevice.name || 'iPhone'}
                                </h3>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                                    {selectedDevice.model || 'Unknown Model'}
                                </div>
                            </div>

                            {/* Info Grid (2x2 grid-cards) */}
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: '1fr 1fr', 
                                gap: '10px', 
                                flex: 1,
                                overflowY: 'auto',
                                paddingRight: '2px',
                                alignContent: 'start',
                                marginBottom: '16px'
                            }}>
                                {/* Card 1: iOS Version */}
                                <div style={{
                                    background: 'rgba(255,255,255,0.01)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    padding: '10px 12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px'
                                }}>
                                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Hệ điều hành</span>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent)' }}>iOS {selectedDevice.ios_version || '—'}</span>
                                </div>

                                {/* Card 2: IP Address */}
                                <div style={{
                                    background: 'rgba(255,255,255,0.01)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    padding: '10px 12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px'
                                }}>
                                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>IP WiFi</span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <div style={{ 
                                            width: '6px', 
                                            height: '6px', 
                                            borderRadius: '50%', 
                                            backgroundColor: selectedDevice.wifi_address ? 'var(--success)' : 'var(--text-muted)' 
                                        }} />
                                        <span style={{ 
                                            fontSize: '12px', 
                                            fontWeight: 600, 
                                            color: selectedDevice.wifi_address ? 'var(--success)' : 'var(--text-muted)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            maxWidth: '100px'
                                        }} title={selectedDevice.wifi_address || 'Chưa kết nối'}>
                                            {selectedDevice.wifi_address || 'Offline'}
                                        </span>
                                    </div>
                                </div>

                                {/* Card 3: Serial Number */}
                                <div style={{
                                    background: 'rgba(255,255,255,0.01)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    padding: '10px 12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                    gridColumn: 'span 2',
                                    position: 'relative'
                                }}>
                                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Số Serial</span>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '12px', fontFamily: 'monospace', color: '#cbd5e1', fontWeight: 600 }}>
                                            {selectedDevice.serial || '—'}
                                        </span>
                                        {selectedDevice.serial && (
                                            <button 
                                                className="copy-btn-hover"
                                                onClick={() => handleCopyToClipboard(selectedDevice.serial, 'Serial')}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'var(--text-muted)',
                                                    cursor: 'pointer',
                                                    fontSize: '11px',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    transition: 'all 0.2s',
                                                    fontWeight: 600
                                                }}
                                            >
                                                📋 Sao chép
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Card 4: UDID */}
                                <div style={{
                                    background: 'rgba(255,255,255,0.01)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    padding: '10px 12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                    gridColumn: 'span 2',
                                    position: 'relative'
                                }}>
                                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Mã UDID</span>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ 
                                            fontSize: '11px', 
                                            fontFamily: 'monospace', 
                                            color: '#cbd5e1', 
                                            fontWeight: 600,
                                            maxWidth: '190px',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap'
                                        }} title={selectedDevice.udid}>
                                            {selectedDevice.udid || '—'}
                                        </span>
                                        {selectedDevice.udid && (
                                            <button 
                                                className="copy-btn-hover"
                                                onClick={() => handleCopyToClipboard(selectedDevice.udid, 'UDID')}
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'var(--text-muted)',
                                                    cursor: 'pointer',
                                                    fontSize: '11px',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    transition: 'all 0.2s',
                                                    fontWeight: 600
                                                }}
                                            >
                                                📋 Sao chép
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Card 5: App Counts */}
                                <div style={{
                                    background: 'rgba(255,255,255,0.01)',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '8px',
                                    padding: '10px 12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                    gridColumn: 'span 2'
                                }}>
                                    <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Ứng dụng cài đặt</span>
                                    <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--success)' }}>
                                        {loadingApps ? '⏳ Đang quét...' : `${apps.length} ứng dụng`}
                                    </span>
                                </div>
                            </div>

                            {/* System Status Alert Panel */}
                            <div style={{
                                padding: '10px 12px',
                                borderRadius: '8px',
                                background: 'rgba(0, 242, 254, 0.02)',
                                border: '1px solid rgba(0, 242, 254, 0.1)',
                                fontSize: '11px',
                                color: '#38bdf8',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginBottom: '16px'
                            }}>
                                <span>ℹ️</span>
                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    Trạng thái: <strong>{statusText}</strong>
                                </div>
                            </div>

                            {/* System Actions Area */}
                            <div style={{ 
                                borderTop: '1px solid var(--border-color)', 
                                paddingTop: '16px',
                                display: 'flex', 
                                flexDirection: 'column', 
                                gap: '10px'
                            }}>
                                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.5px' }}>
                                    ⚙️ Thao tác thiết bị
                                </span>
                                <button 
                                    className="btn btn-primary" 
                                    style={{ 
                                        width: '100%', 
                                        minHeight: '38px', 
                                        background: 'linear-gradient(135deg, var(--accent), #3b82f6)',
                                        border: 'none',
                                        justifyContent: 'center',
                                        fontSize: '13px',
                                        boxShadow: '0 4px 12px rgba(0, 242, 254, 0.15)'
                                    }}
                                    onClick={() => handleActivate(selectedDevice.serial)}
                                    disabled={!!runningAction}
                                >
                                    ⚡ Kích hoạt iPhone (USA/EN)
                                </button>
                                <button 
                                    className="btn" 
                                    style={{ 
                                        width: '100%', 
                                        minHeight: '38px',
                                        background: 'transparent',
                                        border: '1px solid var(--danger)',
                                        color: 'var(--danger)',
                                        justifyContent: 'center',
                                        fontSize: '13px'
                                    }}
                                    onClick={() => handleErase(selectedDevice.serial)}
                                    disabled={!!runningAction}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = 'rgba(255, 7, 58, 0.05)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    ⚠️ Xóa sạch thiết bị (Erase)
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            width: '100%',
                            background: 'var(--panel-bg)',
                            border: '1px dashed var(--border-color)',
                            borderRadius: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-muted)',
                            padding: '40px 20px',
                            textAlign: 'center',
                            flex: 1,
                            boxSizing: 'border-box'
                        }}>
                            <span style={{ fontSize: '48px', marginBottom: '16px' }}>🍎</span>
                            <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 700, color: 'var(--text-color)' }}>Chưa chọn thiết bị</h4>
                            <p style={{ fontSize: '12px', margin: 0, color: 'var(--text-muted)', lineHeight: '1.5' }}>
                                Vui lòng chọn một thiết bị USB bên trái để thực hiện cấu hình và thao tác.
                            </p>
                        </div>
                    )}
                </div>

                {/* Column 3: Installed Apps Manager (Right, flex: 1) */}
                <div style={{ 
                    flex: 1,
                    background: 'var(--panel-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxSizing: 'border-box',
                    overflow: 'hidden'
                }}>
                    {selectedDevice ? (
                        <>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '14px', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 700, fontSize: '13px', color: '#f8fafc', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    📦 Ứng dụng ({filteredApps.length}/{apps.length})
                                </span>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: '0 1 320px', position: 'relative' }}>
                                    <div style={{ position: 'relative', width: '100%' }}>
                                        <input 
                                            type="text" 
                                            className="form-input" 
                                            placeholder="🔍 Lọc theo tên hoặc bundle ID..." 
                                            value={appSearch} 
                                            onChange={(e) => setAppSearch(e.target.value)}
                                            style={{ height: '30px', fontSize: '12px', margin: 0, padding: '4px 28px 4px 10px', width: '100%', boxSizing: 'border-box' }}
                                        />
                                        {appSearch && (
                                            <button 
                                                onClick={() => setAppSearch('')}
                                                style={{
                                                    position: 'absolute',
                                                    right: '8px',
                                                    top: '50%',
                                                    transform: 'translateY(-50%)',
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: 'var(--text-muted)',
                                                    cursor: 'pointer',
                                                    fontSize: '14px',
                                                    padding: '2px'
                                                }}
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                    {loadingApps && <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>⏳ Quét...</span>}
                                </div>
                            </div>

                            <div className="table-container" style={{ flex: 1, overflowY: 'auto', maxHeight: 'none', margin: 0 }}>
                                <table style={{ width: '100%' }}>
                                    <thead>
                                        <tr style={{ position: 'sticky', top: 0, background: 'var(--modal-bg)', zIndex: 1, boxShadow: '0 1px 0 var(--border-color)' }}>
                                            <th style={{ width: '40px', padding: '10px' }}>#</th>
                                            <th style={{ padding: '10px' }}>Ứng dụng</th>
                                            <th style={{ padding: '10px' }}>Bundle ID</th>
                                            <th style={{ padding: '10px', width: '90px' }}>Phiên bản</th>
                                            <th style={{ textAlign: 'center', width: '190px', padding: '10px' }}>Thao tác dữ liệu</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loadingApps ? (
                                            <tr>
                                                <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Đang quét danh sách ứng dụng...</td>
                                            </tr>
                                        ) : filteredApps.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                                    {appSearch ? 'Không tìm thấy ứng dụng phù hợp' : 'Không có ứng dụng nào được cài đặt'}
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredApps.map((app, idx) => (
                                                <tr key={app.bundle_id} className="app-row-hover">
                                                    <td style={{ padding: '8px 10px', color: 'var(--text-muted)' }}>{idx + 1}</td>
                                                    <td style={{ padding: '8px 10px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                            {/* Custom Colored App Icon */}
                                                            <div style={{
                                                                width: '28px',
                                                                height: '28px',
                                                                borderRadius: '6px',
                                                                background: getAppGradient(app.bundle_id),
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: '#ffffff',
                                                                fontWeight: '800',
                                                                fontSize: '12px',
                                                                textTransform: 'uppercase',
                                                                boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                                                                flexShrink: 0
                                                            }}>
                                                                {app.name ? app.name.charAt(0) : '?'}
                                                            </div>
                                                            <div style={{ fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }} title={app.name}>
                                                                {app.name}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }} title={app.bundle_id}>
                                                        {app.bundle_id}
                                                    </td>
                                                    <td style={{ padding: '8px 10px' }}>
                                                        <span style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }}>
                                                            {app.version || '1.0'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '8px 10px' }}>
                                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                            <button 
                                                                className="btn btn-secondary" 
                                                                style={{ padding: '3px 8px', fontSize: '10px', minHeight: '24px', flex: 1, justifyContent: 'center' }}
                                                                onClick={() => handleBackupApp(selectedDevice.serial, app.bundle_id)}
                                                                disabled={!!runningAction}
                                                                title="Sao lưu dữ liệu ứng dụng về máy tính local"
                                                            >
                                                                💾 Lưu
                                                            </button>
                                                            <button 
                                                                className="btn btn-secondary" 
                                                                style={{ padding: '3px 8px', fontSize: '10px', minHeight: '24px', flex: 1, justifyContent: 'center' }}
                                                                onClick={() => handleRestoreApp(selectedDevice.serial, app.bundle_id)}
                                                                disabled={!!runningAction}
                                                                title="Nạp dữ liệu sao lưu trước đó vào ứng dụng"
                                                            >
                                                                🔄 Nạp
                                                            </button>
                                                            <button 
                                                                className="btn btn-danger" 
                                                                style={{ padding: '3px 8px', fontSize: '10px', minHeight: '24px', flex: 1, justifyContent: 'center', background: 'rgba(255, 7, 58, 0.1)', border: '1px solid rgba(255, 7, 58, 0.2)', color: 'var(--danger)' }}
                                                                onClick={() => handleClearApp(selectedDevice.serial, app.bundle_id)}
                                                                disabled={!!runningAction}
                                                                title="Xóa sạch dữ liệu bộ nhớ cache/dữ liệu người dùng của ứng dụng"
                                                                onMouseEnter={(e) => {
                                                                    e.currentTarget.style.backgroundColor = 'var(--danger)';
                                                                    e.currentTarget.style.color = '#ffffff';
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.backgroundColor = 'rgba(255, 7, 58, 0.1)';
                                                                    e.currentTarget.style.color = 'var(--danger)';
                                                                }}
                                                            >
                                                                🗑 Xóa
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-muted)',
                            flex: 1,
                            textAlign: 'center',
                            border: '1px dashed var(--border-color)',
                            borderRadius: '12px'
                        }}>
                            <span style={{ fontSize: '48px', marginBottom: '16px' }}>📦</span>
                            <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 700, color: 'var(--text-color)' }}>Quản lý ứng dụng</h4>
                            <p style={{ fontSize: '12px', margin: 0, color: 'var(--text-muted)' }}>Vui lòng chọn thiết bị ở danh sách bên trái để tải danh sách và quản lý.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
