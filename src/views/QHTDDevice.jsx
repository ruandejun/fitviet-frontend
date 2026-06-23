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

    const filteredApps = apps.filter(app => 
        app.name.toLowerCase().includes(appSearch.toLowerCase()) || 
        app.bundle_id.toLowerCase().includes(appSearch.toLowerCase())
    );

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

            <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch', height: 'calc(100vh - 180px)', minHeight: '620px' }}>
                
                {/* Column 1: USB Devices List (Left, 280px) */}
                <div style={{ 
                    width: '280px', 
                    minWidth: '280px',
                    background: 'var(--card-bg, rgba(255,255,255,0.01))',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    boxSizing: 'border-box'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>
                            📱 Thiết bị USB ({devices.length})
                        </span>
                        <button 
                            className="btn btn-primary" 
                            onClick={handleScan} 
                            disabled={scanning}
                            style={{ padding: '4px 10px', fontSize: '12px', minHeight: '28px' }}
                        >
                            {scanning ? '⏳' : '🔄 Quét'}
                        </button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
                        {devices.length === 0 ? (
                            <div style={{ 
                                textAlign: 'center', 
                                padding: '40px 10px', 
                                color: 'var(--text-muted)', 
                                fontSize: '13px',
                                border: '1px dashed var(--border-color)',
                                borderRadius: '8px',
                                background: 'rgba(255,255,255,0.01)'
                            }}>
                                {scanning ? 'Đang tìm kiếm...' : 'Chưa có thiết bị. Cắm iPhone qua cáp USB và bấm Quét.'}
                            </div>
                        ) : (
                            devices.map((dev, idx) => (
                                <div 
                                    key={dev.serial || idx} 
                                    onClick={() => setSelectedDevice(dev)}
                                    style={{
                                        padding: '12px 14px',
                                        borderRadius: '10px',
                                        background: selectedDevice?.serial === dev.serial ? 'rgba(217, 70, 239, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                                        border: `1px solid ${selectedDevice?.serial === dev.serial ? 'rgba(217, 70, 239, 0.4)' : 'var(--border-color)'}`,
                                        cursor: 'pointer',
                                        marginBottom: '8px',
                                        transition: 'all 0.2s ease',
                                        boxShadow: selectedDevice?.serial === dev.serial ? '0 0 12px rgba(217, 70, 239, 0.15)' : 'none'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (selectedDevice?.serial !== dev.serial) {
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (selectedDevice?.serial !== dev.serial) {
                                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                                            e.currentTarget.style.borderColor = 'var(--border-color)';
                                        }
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                                        <div style={{ fontWeight: 600, fontSize: '13px', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '160px' }}>
                                            {dev.name || 'iPhone'}
                                        </div>
                                        <span className="badge badge-info" style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
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
                            ))
                        )}
                    </div>
                </div>

                {/* Column 2: Selected Device Control Panel (Center, 340px) */}
                <div style={{ 
                    width: '340px',
                    minWidth: '340px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}>
                    {selectedDevice ? (
                        <div style={{
                            width: '100%',
                            background: '#0a0f1d',
                            border: '1px solid var(--border-color)',
                            borderRadius: '16px',
                            padding: '24px 20px 20px 20px',
                            position: 'relative',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                            boxSizing: 'border-box',
                            display: 'flex',
                            flexDirection: 'column',
                            flex: 1
                        }}>
                            {/* Phone Screen Container inside the card */}
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                flex: 1,
                                background: 'radial-gradient(circle at top, #1e1b4b 0%, #030712 100%)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                borderRadius: '14px',
                                padding: '20px',
                                boxSizing: 'border-box',
                                overflow: 'hidden'
                            }}>
                                <div style={{ textAlign: 'center', marginTop: '10px', marginBottom: '20px' }}>
                                    <div style={{ fontSize: '48px', marginBottom: '8px' }}>📱</div>
                                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                                        {selectedDevice.name || 'iPhone'}
                                    </h4>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                        {selectedDevice.model || 'Unknown Model'}
                                    </span>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px', color: '#cbd5e1' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Hệ điều hành:</span>
                                        <span style={{ fontWeight: 600, color: '#c084fc' }}>iOS {selectedDevice.ios_version || '—'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Mã Serial:</span>
                                        <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>
                                            {selectedDevice.serial || '—'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Địa chỉ IP WiFi:</span>
                                        <span style={{ color: selectedDevice.wifi_address ? '#38bdf8' : 'var(--text-muted)' }}>
                                            {selectedDevice.wifi_address || 'Không kết nối'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                                        <span style={{ color: 'var(--text-muted)' }}>Số lượng Apps:</span>
                                        <span style={{ fontWeight: 600, color: '#34d399' }}>{apps.length} ứng dụng</span>
                                    </div>
                                </div>

                                <div style={{
                                    marginTop: 'auto',
                                    padding: '10px',
                                    borderRadius: '8px',
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    fontSize: '12px',
                                    textAlign: 'center',
                                    color: '#38bdf8'
                                }}>
                                    ℹ️ Trạng thái: {statusText}
                                </div>
                            </div>

                            {/* Actions Group right below details */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                                <button 
                                    className="btn btn-primary" 
                                    style={{ width: '100%', minHeight: '38px', background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}
                                    onClick={() => handleActivate(selectedDevice.serial)}
                                    disabled={!!runningAction}
                                >
                                    ⚡ Kích hoạt iPhone (USA/EN)
                                </button>
                                <button 
                                    className="btn btn-danger" 
                                    style={{ width: '100%', minHeight: '38px' }}
                                    onClick={() => handleErase(selectedDevice.serial)}
                                    disabled={!!runningAction}
                                >
                                    ⚠️ Xóa sạch thiết bị (Erase)
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            width: '100%',
                            background: 'var(--card-bg, rgba(255,255,255,0.01))',
                            border: '1px dashed var(--border-color)',
                            borderRadius: '16px',
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
                            <span style={{ fontSize: '48px', marginBottom: '16px' }}>📱</span>
                            <p style={{ fontSize: '13px', margin: 0 }}>Chọn một thiết bị từ danh sách để xem thông tin chi tiết và thao tác</p>
                        </div>
                    )}
                </div>

                {/* Column 3: Installed Apps Manager (Right, flex: 1) */}
                <div style={{ 
                    flex: 1,
                    background: 'var(--card-bg, rgba(255,255,255,0.01))',
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
                                <span style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>
                                    📦 Ứng dụng đã cài ({filteredApps.length}/{apps.length})
                                </span>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: '0 1 300px' }}>
                                    <input 
                                        type="text" 
                                        className="form-input" 
                                        placeholder="🔍 Lọc theo tên hoặc bundle ID..." 
                                        value={appSearch} 
                                        onChange={(e) => setAppSearch(e.target.value)}
                                        style={{ height: '30px', fontSize: '12px', margin: 0, padding: '4px 10px', flex: 1 }}
                                    />
                                    {loadingApps && <span style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>⏳ Loading...</span>}
                                </div>
                            </div>

                            <div className="table-container" style={{ flex: 1, overflowY: 'auto', maxHeight: 'none', margin: 0 }}>
                                <table style={{ width: '100%' }}>
                                    <thead>
                                        <tr style={{ position: 'sticky', top: 0, background: '#080d1a', zIndex: 1 }}>
                                            <th>#</th>
                                            <th>Tên ứng dụng</th>
                                            <th>Bundle ID</th>
                                            <th>Phiên bản</th>
                                            <th style={{ textAlign: 'center', width: '220px' }}>Thao tác dữ liệu</th>
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
                                                <tr key={app.bundle_id}>
                                                    <td>{idx + 1}</td>
                                                    <td style={{ fontWeight: 600, color: '#f1f5f9' }}>{app.name}</td>
                                                    <td style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-muted)' }}>{app.bundle_id}</td>
                                                    <td>
                                                        <span style={{ fontSize: '11px', padding: '2px 6px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                            {app.version || '1.0'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                            <button 
                                                                className="btn btn-secondary" 
                                                                style={{ padding: '2px 8px', fontSize: '10px', minHeight: '22px' }}
                                                                onClick={() => handleBackupApp(selectedDevice.serial, app.bundle_id)}
                                                                disabled={!!runningAction}
                                                            >
                                                                💾 Lưu
                                                            </button>
                                                            <button 
                                                                className="btn btn-secondary" 
                                                                style={{ padding: '2px 8px', fontSize: '10px', minHeight: '22px' }}
                                                                onClick={() => handleRestoreApp(selectedDevice.serial, app.bundle_id)}
                                                                disabled={!!runningAction}
                                                            >
                                                                🔄 Nạp
                                                            </button>
                                                            <button 
                                                                className="btn btn-danger" 
                                                                style={{ padding: '2px 8px', fontSize: '10px', minHeight: '22px' }}
                                                                onClick={() => handleClearApp(selectedDevice.serial, app.bundle_id)}
                                                                disabled={!!runningAction}
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
                            textAlign: 'center'
                        }}>
                            <span style={{ fontSize: '48px', marginBottom: '16px' }}>📦</span>
                            <p style={{ fontSize: '13px', margin: 0 }}>Vui lòng chọn thiết bị ở danh sách bên trái để quản lý ứng dụng</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
