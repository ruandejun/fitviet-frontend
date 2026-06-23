import React, { useState, useEffect, useCallback } from 'react';

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

    // Action status
    const [runningAction, setRunningAction] = useState('');
    const [statusText, setStatusText] = useState('Sẵn sàng');

    // Load tool info on mount
    useEffect(() => {
        const loadInfo = () => {
            if (window.qhtdBridge) {
                try {
                    const info = window.qhtdBridge.getToolInfo();
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

    const handleScan = useCallback(() => {
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
            const result = window.qhtdBridge.scanDevices();
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

    const handleGetApps = useCallback((serial) => {
        if (!window.qhtdBridge || !serial) return;
        setLoadingApps(true);
        setError('');
        try {
            const result = window.qhtdBridge.getDeviceApps(serial);
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
        } else {
            setApps([]);
        }
    }, [selectedDevice]);

    const handleActivate = useCallback((serial) => {
        if (!window.qhtdBridge || !serial) return;
        if (!window.confirm("Bạn có chắc muốn Kích hoạt thiết bị này không?")) return;
        setRunningAction('activating');
        setStatusText('⏳ Đang kích hoạt thiết bị...');
        try {
            const res = window.qhtdBridge.activateDevice(serial);
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

    const handleErase = useCallback((serial) => {
        if (!window.qhtdBridge || !serial) return;
        if (!window.confirm("CẢNH BÁO NGUY HIỂM: Bạn có chắc chắn muốn XÓA SẠCH thiết bị này không? Toàn bộ dữ liệu sẽ bị xóa vĩnh viễn!")) return;
        setRunningAction('erasing');
        setStatusText('⏳ Đang xóa thiết bị...');
        try {
            const res = window.qhtdBridge.eraseDevice(serial);
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

    const handleBackupApp = useCallback((serial, bundleId) => {
        if (!window.qhtdBridge || !serial || !bundleId) return;
        setRunningAction(`backup-${bundleId}`);
        try {
            const res = window.qhtdBridge.backupAppData(serial, bundleId);
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

    const handleRestoreApp = useCallback((serial, bundleId) => {
        if (!window.qhtdBridge || !serial || !bundleId) return;
        setRunningAction(`restore-${bundleId}`);
        try {
            const res = window.qhtdBridge.restoreAppData(serial, bundleId);
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

    const handleClearApp = useCallback((serial, bundleId) => {
        if (!window.qhtdBridge || !serial || !bundleId) return;
        if (!window.confirm(`Bạn có chắc muốn xóa sạch dữ liệu (Clear App Data) của ${bundleId}?`)) return;
        setRunningAction(`clear-${bundleId}`);
        try {
            const res = window.qhtdBridge.clearAppData(serial, bundleId);
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

    return (
        <div>
            {/* Tool Info Banner */}
            {toolInfo && (
                <div className="stat-cards" style={{ marginBottom: '20px' }}>
                    <div className="stat-card">
                        <div className="stat-label">Phiên bản</div>
                        <div className="stat-value">v{toolInfo.version}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Platform</div>
                        <div className="stat-value">{toolInfo.os === 'win32' ? 'Windows' : toolInfo.os}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">pymobiledevice3</div>
                        <div className="stat-value" style={{ color: toolInfo.pymobiledevice3 ? 'var(--success)' : 'var(--danger)' }}>
                            {toolInfo.pymobiledevice3 ? '✅ Sẵn sàng' : '❌ Chưa cài'}
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">MunLogin</div>
                        <div className="stat-value" style={{ color: toolInfo.mun_anti_browser ? 'var(--success)' : 'var(--danger)' }}>
                            {toolInfo.mun_anti_browser ? '✅ Sẵn sàng' : '❌ Chưa cài'}
                        </div>
                    </div>
                </div>
            )}

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

            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                
                {/* Left side: List of USB devices */}
                <div style={{ flex: '1 1 500px' }}>
                    <div className="control-bar" style={{ marginTop: 0 }}>
                        <div className="control-filters">
                            <span style={{ fontWeight: 600 }}>
                                📱 Thiết bị iOS USB ({devices.length})
                            </span>
                        </div>
                        <div className="action-buttons">
                            <button className="btn btn-primary" onClick={handleScan} disabled={scanning}>
                                {scanning ? '⏳ Đang quét...' : '🔍 Quét thiết bị'}
                            </button>
                        </div>
                    </div>

                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Tên thiết bị</th>
                                    <th>Model</th>
                                    <th>iOS</th>
                                    <th>UDID</th>
                                    <th>Hành động</th>
                                </tr>
                            </thead>
                            <tbody>
                                {devices.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                                            {scanning ? 'Đang quét thiết bị...' : 'Chưa tìm thấy thiết bị nào. Kết nối iPhone qua USB và bấm "Quét thiết bị".'}
                                        </td>
                                    </tr>
                                ) : (
                                    devices.map((dev, idx) => (
                                        <tr key={dev.serial || idx} style={{
                                            background: selectedDevice?.serial === dev.serial ? 'rgba(217, 70, 239, 0.08)' : undefined,
                                            cursor: 'pointer'
                                        }} onClick={() => setSelectedDevice(dev)}>
                                            <td>{idx + 1}</td>
                                            <td style={{ fontWeight: 600 }}>{dev.name || '—'}</td>
                                            <td>{dev.model || '—'}</td>
                                            <td>
                                                <span className="badge badge-info">{dev.ios_version || '—'}</span>
                                            </td>
                                            <td style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)' }}>
                                                {dev.udid ? dev.udid.substring(0, 15) + '...' : '—'}
                                            </td>
                                            <td>
                                                <button
                                                    className="btn btn-secondary"
                                                    onClick={(e) => { e.stopPropagation(); setSelectedDevice(dev); }}
                                                    style={{ padding: '4px 10px', fontSize: '12px', minHeight: '26px' }}
                                                >
                                                    Chọn
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* App List (renders below table) */}
                    {selectedDevice && (
                        <div style={{ marginTop: '24px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>📦 Ứng dụng đã cài ({apps.length})</span>
                                {loadingApps && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>⏳ Đang tải...</span>}
                            </h3>
                            <div className="table-container">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Tên ứng dụng</th>
                                            <th>Bundle ID</th>
                                            <th>Phiên bản</th>
                                            <th style={{ textAlign: 'center', width: '250px' }}>Hành động dữ liệu</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loadingApps ? (
                                            <tr>
                                                <td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>Đang quét ứng dụng...</td>
                                            </tr>
                                        ) : apps.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Không có ứng dụng nào được liệt kê</td>
                                            </tr>
                                        ) : (
                                            apps.map((app, idx) => (
                                                <tr key={app.bundle_id}>
                                                    <td>{idx + 1}</td>
                                                    <td style={{ fontWeight: 600 }}>{app.name}</td>
                                                    <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-muted)' }}>{app.bundle_id}</td>
                                                    <td>{app.version}</td>
                                                    <td style={{ display: 'flex', gap: '6px', justifyContent: 'center', border: 'none' }}>
                                                        <button 
                                                            className="btn btn-secondary" 
                                                            style={{ padding: '3px 8px', fontSize: '11px', minHeight: '22px' }}
                                                            onClick={() => handleBackupApp(selectedDevice.serial, app.bundle_id)}
                                                            disabled={!!runningAction}
                                                        >
                                                            💾 Sao lưu
                                                        </button>
                                                        <button 
                                                            className="btn btn-secondary" 
                                                            style={{ padding: '3px 8px', fontSize: '11px', minHeight: '22px' }}
                                                            onClick={() => handleRestoreApp(selectedDevice.serial, app.bundle_id)}
                                                            disabled={!!runningAction}
                                                        >
                                                            🔄 Phục hồi
                                                        </button>
                                                        <button 
                                                            className="btn btn-danger" 
                                                            style={{ padding: '3px 8px', fontSize: '11px', minHeight: '22px' }}
                                                            onClick={() => handleClearApp(selectedDevice.serial, app.bundle_id)}
                                                            disabled={!!runningAction}
                                                        >
                                                            🗑 Xóa
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right side: Selected Device Mockup */}
                <div style={{ flex: '0 0 340px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {selectedDevice ? (
                        <div style={{
                            width: '320px',
                            background: '#0a0f1d',
                            border: '10px solid #1e293b',
                            borderRadius: '36px',
                            padding: '30px 18px 20px 18px',
                            position: 'relative',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.6), inset 0 0 10px rgba(0,0,0,0.9)',
                            boxSizing: 'border-box'
                        }}>
                            {/* Dynamic Island Notch */}
                            <div style={{
                                width: '100px',
                                height: '22px',
                                background: '#000',
                                borderRadius: '15px',
                                position: 'absolute',
                                top: '8px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                zIndex: 10
                            }} />

                            {/* Phone Screen Container */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                height: '400px',
                                background: 'radial-gradient(circle at top, #1e1b4b 0%, #030712 100%)',
                                borderRadius: '24px',
                                padding: '16px',
                                boxSizing: 'border-box',
                                overflow: 'hidden'
                            }}>
                                <div style={{ textAlign: 'center', marginTop: '20px', marginBottom: '15px' }}>
                                    <div style={{ fontSize: '42px', marginBottom: '8px' }}>📱</div>
                                    <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                                        {selectedDevice.name || 'iPhone'}
                                    </h4>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        {selectedDevice.model || 'Unknown Model'}
                                    </span>
                                </div>

                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: '#cbd5e1' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>iOS:</span>
                                        <span style={{ fontWeight: 600, color: '#a855f7' }}>{selectedDevice.ios_version || '—'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Serial:</span>
                                        <span style={{ fontFamily: 'monospace' }}>{selectedDevice.serial?.substring(0, 15) || '—'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>IP WiFi:</span>
                                        <span>{selectedDevice.wifi_address || 'Not connected'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Apps:</span>
                                        <span>{apps.length}</span>
                                    </div>

                                    <div style={{
                                        marginTop: 'auto',
                                        padding: '8px',
                                        borderRadius: '8px',
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        fontSize: '11px',
                                        textAlign: 'center',
                                        color: '#38bdf8'
                                    }}>
                                        ℹ️ Status: {statusText}
                                    </div>
                                </div>
                            </div>

                            {/* External Controls below mockup screen */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                                <button 
                                    className="btn btn-primary" 
                                    style={{ width: '100%', minHeight: '36px', background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}
                                    onClick={() => handleActivate(selectedDevice.serial)}
                                    disabled={!!runningAction}
                                >
                                    ⚡ Kích hoạt iPhone (USA/EN)
                                </button>
                                <button 
                                    className="btn btn-danger" 
                                    style={{ width: '100%', minHeight: '36px' }}
                                    onClick={() => handleErase(selectedDevice.serial)}
                                    disabled={!!runningAction}
                                >
                                    ⚠️ Xóa sạch thiết bị (Erase)
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            width: '320px',
                            height: '500px',
                            background: '#070b13',
                            border: '1px dashed var(--border-color)',
                            borderRadius: '36px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-muted)',
                            padding: '20px',
                            textAlign: 'center'
                        }}>
                            <span style={{ fontSize: '48px', marginBottom: '16px' }}>📱</span>
                            <p style={{ fontSize: '13px' }}>Chọn một thiết bị từ danh sách để xem thông tin chi tiết và thao tác</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
