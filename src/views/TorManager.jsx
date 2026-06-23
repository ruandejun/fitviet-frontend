import React, { useState, useEffect, useCallback } from 'react';

export default function TorManager() {
    const [isDesktop, setIsDesktop] = useState(false);
    const [torInstalled, setTorInstalled] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [downloadLog, setDownloadLog] = useState([]);
    const [downloadPercent, setDownloadPercent] = useState(0);
    const [proxyCount, setProxyCount] = useState(3);
    const [startPort, setStartPort] = useState(9050);
    const [proxies, setProxies] = useState([]);
    
    // Check if running inside desktop PyQt6 application
    useEffect(() => {
        if (window.__QHTD_DESKTOP__ && window.qhtdBridge) {
            setIsDesktop(true);
            checkTorStatus();
            loadActiveProxies();
        } else {
            setIsDesktop(false);
        }
    }, []);

    // Load active proxies list from backend
    const loadActiveProxies = async () => {
        if (!window.qhtdBridge) return;
        try {
            const res = await window.qhtdBridge.getActiveTorProxies();
            const list = JSON.parse(res);
            if (Array.isArray(list)) {
                setProxies(list.map(p => ({
                    socksPort: p.socks_port,
                    controlPort: p.control_port,
                    status: p.status,
                    ip: p.ip || '—'
                })));
            }
        } catch (e) {
            console.error("Failed to load active proxies:", e);
        }
    };

    // Check if Tor is installed
    const checkTorStatus = async () => {
        if (!window.qhtdBridge) return;
        try {
            const installed = await window.qhtdBridge.isTorInstalled();
            setTorInstalled(installed);
        } catch (e) {
            console.error("Failed to check Tor installation status:", e);
        }
    };

    // Callback listeners for signals
    const handleDownloadLog = useCallback((msg) => {
        setDownloadLog(prev => [...prev.slice(-49), msg]); // Keep last 50 lines
        
        // Extract percent if message matches progress pattern
        const match = msg.match(/Đang tải:\s*(\d+)%/);
        if (match) {
            setDownloadPercent(parseInt(match[1]));
        }
    }, []);

    const handleDownloadFinished = useCallback((success, msg) => {
        setDownloading(false);
        if (success) {
            setTorInstalled(true);
            setDownloadPercent(100);
            setDownloadLog(prev => [...prev, "🟢 Cài đặt Tor hoàn tất!"]);
        } else {
            alert(`Lỗi cài đặt Tor: ${msg}`);
            setDownloadLog(prev => [...prev, `❌ Thất bại: ${msg}`]);
        }
    }, []);

    const handleTorStatus = useCallback((jsonStr) => {
        try {
            const list = JSON.parse(jsonStr);
            if (Array.isArray(list)) {
                setProxies(list.map(p => ({
                    socksPort: p.socks_port,
                    controlPort: p.control_port,
                    status: p.status,
                    ip: p.ip || '—'
                })));
            }
        } catch (e) {
            console.error("Failed to parse tor status update:", e);
        }
    }, []);

    // Bind and unbind PyQt6 signals
    useEffect(() => {
        if (window.qhtdBridge) {
            window.qhtdBridge.torDownloadLog.connect(handleDownloadLog);
            window.qhtdBridge.torDownloadFinished.connect(handleDownloadFinished);
            window.qhtdBridge.torStatus.connect(handleTorStatus);
        }
        return () => {
            if (window.qhtdBridge) {
                try {
                    window.qhtdBridge.torDownloadLog.disconnect(handleDownloadLog);
                    window.qhtdBridge.torDownloadFinished.disconnect(handleDownloadFinished);
                    window.qhtdBridge.torStatus.disconnect(handleTorStatus);
                } catch (e) {
                    // Ignore disconnect failures on exit
                }
            }
        };
    }, [handleDownloadLog, handleDownloadFinished, handleTorStatus]);

    // Handle actions
    const handleInstallTor = () => {
        if (!window.qhtdBridge) return;
        setDownloading(true);
        setDownloadLog(["Bắt đầu tiến trình tải Tor..."]);
        setDownloadPercent(0);
        window.qhtdBridge.startTorDownload();
    };

    const handleStartAll = async () => {
        if (!window.qhtdBridge) return;
        if (!torInstalled) {
            alert("Vui lòng cài đặt Tor Expert Bundle trước!");
            return;
        }
        
        let count = parseInt(proxyCount);
        let start = parseInt(startPort);
        
        if (isNaN(count) || count < 1 || count > 20) {
            alert("Số lượng proxy phải từ 1 đến 20!");
            return;
        }
        if (isNaN(start) || start < 1024 || start > 65000) {
            alert("Cổng SOCKS bắt đầu không hợp lệ!");
            return;
        }

        // Generate port maps (SocksPort is even, ControlPort is odd / SocksPort + 1)
        const newProxies = [];
        for (let i = 0; i < count; i++) {
            const sPort = start + (i * 2);
            const cPort = sPort + 1;
            newProxies.push({
                socksPort: sPort,
                controlPort: cPort,
                status: 'Loading',
                ip: 'Đang khởi động...'
            });
        }
        setProxies(newProxies);

        // Start each port sequentially
        for (let i = 0; i < count; i++) {
            const sPort = start + (i * 2);
            const cPort = sPort + 1;
            await window.qhtdBridge.startTorProxy(sPort, cPort);
        }
    };

    const handleStopAll = () => {
        if (!window.qhtdBridge) return;
        window.qhtdBridge.stopAllTorProxies();
        setProxies([]);
    };

    const handleRotateIp = async (controlPort, index) => {
        if (!window.qhtdBridge) return;
        
        // Update specific row to Loading
        setProxies(prev => prev.map((p, idx) => 
            idx === index ? { ...p, ip: 'Đang đổi IP...' } : p
        ));
        
        const success = await window.qhtdBridge.rotateTorIp(controlPort);
        if (!success) {
            setProxies(prev => prev.map((p, idx) => 
                idx === index ? { ...p, ip: 'Đổi IP thất bại' } : p
            ));
        }
    };

    const handleCopyProxy = (port) => {
        const proxyStr = `socks5://127.0.0.1:${port}`;
        if (window.qhtdBridge && typeof window.qhtdBridge.writeClipboard === 'function') {
            window.qhtdBridge.writeClipboard(proxyStr);
            alert(`Đã copy: ${proxyStr}`);
        } else {
            navigator.clipboard.writeText(proxyStr);
            alert(`Đã copy: ${proxyStr}`);
        }
    };

    if (!isDesktop) {
        return (
            <div className="tor-non-desktop">
                <h2>⚠️ Chức năng chỉ khả dụng trên Ứng dụng Desktop</h2>
                <p>Trình quản lý Tor Proxy yêu cầu chạy các tiến trình hệ thống cục bộ (tor.exe), chức năng này không thể thực thi trực tiếp trên trình duyệt web.</p>
            </div>
        );
    }

    return (
        <div className="tor-container">
            {/* Scoped Custom Styling */}
            <style>{`
                .tor-container {
                    padding: 24px;
                    background: var(--bg-color, #040815);
                    min-height: calc(100vh - 120px);
                    color: var(--text-color, #f8fafc);
                    font-family: 'Outfit', sans-serif;
                }
                .tor-non-desktop {
                    padding: 40px;
                    text-align: center;
                    color: var(--text-muted, #94a3b8);
                    border: 1px dashed rgba(255,255,255,0.08);
                    border-radius: 16px;
                    background: rgba(13,18,36,0.5);
                    margin: 40px;
                }
                .tor-non-desktop h2 {
                    color: #f59e0b;
                    margin-bottom: 12px;
                }
                .tor-header {
                    margin-bottom: 24px;
                    border-bottom: 1px solid rgba(255,255,255,0.05);
                    padding-bottom: 16px;
                }
                .tor-title {
                    font-size: 24px;
                    font-weight: 800;
                    background: linear-gradient(to right, #00f2fe, #4facfe);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .tor-subtitle {
                    color: var(--text-muted, #94a3b8);
                    font-size: 13.5px;
                    margin-top: 4px;
                }
                .tor-setup-box {
                    background: rgba(13, 18, 36, 0.7);
                    border: 1px solid rgba(6, 182, 212, 0.15);
                    border-radius: 16px;
                    padding: 20px;
                    margin-bottom: 24px;
                }
                .tor-status-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 10px;
                    border-radius: 8px;
                    font-size: 12.5px;
                    font-weight: bold;
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.05);
                }
                .tor-status-pill.installed {
                    color: #10b981;
                    background: rgba(16, 185, 129, 0.08);
                    border-color: rgba(16, 185, 129, 0.2);
                }
                .tor-status-pill.not-installed {
                    color: #ef4444;
                    background: rgba(239, 68, 68, 0.08);
                    border-color: rgba(239, 68, 68, 0.2);
                }
                .tor-btn {
                    padding: 8px 16px;
                    border-radius: 10px;
                    font-weight: bold;
                    font-size: 13.5px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: none;
                }
                .tor-btn-primary {
                    background: linear-gradient(135deg, #06b6d4, #3b82f6);
                    color: white;
                    box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);
                }
                .tor-btn-primary:hover {
                    box-shadow: 0 6px 16px rgba(6, 182, 212, 0.5);
                    transform: translateY(-1px);
                }
                .tor-btn-secondary {
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    color: #cbd5e1;
                }
                .tor-btn-secondary:hover {
                    background: rgba(255, 255, 255, 0.08);
                    color: white;
                }
                .tor-btn-danger {
                    background: rgba(239, 68, 68, 0.12);
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    color: #fca5a5;
                }
                .tor-btn-danger:hover {
                    background: rgba(239, 68, 68, 0.2);
                    color: white;
                }
                .tor-progress-container {
                    margin-top: 15px;
                }
                .tor-progress-bar-bg {
                    background: rgba(255,255,255,0.05);
                    height: 8px;
                    border-radius: 4px;
                    overflow: hidden;
                    margin-bottom: 6px;
                }
                .tor-progress-bar-fill {
                    background: linear-gradient(to right, #06b6d4, #10b981);
                    height: 100%;
                    transition: width 0.3s ease;
                }
                .tor-console {
                    background: #02040a;
                    border: 1px solid rgba(255,255,255,0.03);
                    border-radius: 12px;
                    font-family: 'Consolas', monospace;
                    font-size: 11.5px;
                    padding: 12px;
                    height: 120px;
                    overflow-y: auto;
                    color: #10b981;
                    margin-top: 12px;
                    text-align: left;
                    line-height: 1.5;
                }
                .tor-control-panel {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin-bottom: 24px;
                }
                @media (max-width: 900px) {
                    .tor-control-panel {
                        grid-template-columns: 1fr;
                    }
                }
                .tor-control-box {
                    background: rgba(13, 18, 36, 0.5);
                    border: 1px solid rgba(255,255,255,0.03);
                    border-radius: 16px;
                    padding: 20px;
                }
                .tor-input-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                    margin-bottom: 15px;
                }
                .tor-input-group label {
                    font-size: 12.5px;
                    color: var(--text-muted, #94a3b8);
                    text-transform: uppercase;
                    font-weight: bold;
                    letter-spacing: 0.5px;
                }
                .tor-input {
                    background: #080b17;
                    border: 1px solid rgba(255,255,255,0.06);
                    border-radius: 10px;
                    padding: 10px 14px;
                    color: white;
                    font-size: 14px;
                    font-family: monospace;
                    outline: none;
                    transition: border-color 0.2s;
                }
                .tor-input:focus {
                    border-color: #06b6d4;
                }
                .tor-table-box {
                    background: rgba(13, 18, 36, 0.5);
                    border: 1px solid rgba(255,255,255,0.03);
                    border-radius: 16px;
                    overflow: hidden;
                }
                .tor-table {
                    width: 100%;
                    border-collapse: collapse;
                    text-align: left;
                    font-size: 13.5px;
                }
                .tor-table th {
                    background: rgba(255,255,255,0.02);
                    padding: 14px 16px;
                    color: var(--text-muted, #94a3b8);
                    font-weight: bold;
                    border-bottom: 1px solid rgba(255,255,255,0.04);
                }
                .tor-table td {
                    padding: 14px 16px;
                    border-bottom: 1px solid rgba(255,255,255,0.02);
                }
                .tor-table tr:last-child td {
                    border-bottom: none;
                }
                .proxy-status-indicator {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-weight: bold;
                    font-size: 12.5px;
                }
                .proxy-status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                }
                .proxy-status-indicator.Live {
                    color: #10b981;
                }
                .proxy-status-indicator.Live .proxy-status-dot {
                    background: #10b981;
                    box-shadow: 0 0 8px #10b981;
                }
                .proxy-status-indicator.Loading {
                    color: #f59e0b;
                }
                .proxy-status-indicator.Loading .proxy-status-dot {
                    background: #f59e0b;
                    animation: pulse-orange 1.2s infinite;
                }
                .proxy-status-indicator.Off {
                    color: #64748b;
                }
                .proxy-status-indicator.Off .proxy-status-dot {
                    background: #64748b;
                }
                @keyframes pulse-orange {
                    0% { opacity: 0.4; }
                    50% { opacity: 1; }
                    100% { opacity: 0.4; }
                }
                .action-row {
                    display: flex;
                    gap: 8px;
                }
                .btn-icon {
                    background: rgba(255,255,255,0.03);
                    border: 1px solid rgba(255,255,255,0.06);
                    color: #94a3b8;
                    width: 32px;
                    height: 32px;
                    border-radius: 8px;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                    font-size: 13.5px;
                }
                .btn-icon:hover {
                    background: rgba(6, 182, 212, 0.12);
                    border-color: rgba(6, 182, 212, 0.3);
                    color: #a5f3fc;
                }
                .btn-icon.rotate:hover {
                    background: rgba(16, 185, 129, 0.12);
                    border-color: rgba(16, 185, 129, 0.3);
                    color: #a7f3d0;
                }
            `}</style>

            <div className="tor-header">
                <div className="tor-title">
                    🧅 Quản lý Tor Proxies
                </div>
                <div className="tor-subtitle">
                    Tạo các cổng SOCKS5 proxy cục bộ đổi IP liên tục thông qua mạng ẩn danh Tor
                </div>
            </div>

            {/* Tor Bundle Installation Check */}
            <div className="tor-setup-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <span style={{ fontSize: '15px', fontWeight: 'bold' }}>Trạng thái Tor Engine:</span>
                        <div style={{ marginTop: '6px' }}>
                            {torInstalled ? (
                                <span className="tor-status-pill installed">● Đã cài đặt Tor Expert Bundle</span>
                            ) : (
                                <span className="tor-status-pill not-installed">● Chưa cài đặt Tor Engine</span>
                            )}
                        </div>
                    </div>
                    <div>
                        {!torInstalled && !downloading && (
                            <button className="tor-btn tor-btn-primary" onClick={handleInstallTor}>
                                📥 Tải & Giải nén tự động Tor Engine
                            </button>
                        )}
                        {downloading && (
                            <span style={{ fontSize: '13.5px', color: '#94a3b8', fontWeight: 'bold' }}>
                                🔄 Đang tải xuống...
                            </span>
                        )}
                    </div>
                </div>

                {downloading && (
                    <div className="tor-progress-container">
                        <div className="tor-progress-bar-bg">
                            <div className="tor-progress-bar-fill" style={{ width: `${downloadPercent}%` }}></div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                            <span>{downloadPercent}% hoàn thành</span>
                            <span>tor-expert-bundle-windows-x86_64.tar.gz</span>
                        </div>
                    </div>
                )}

                {(downloadLog.length > 0) && (
                    <div className="tor-console">
                        {downloadLog.map((line, i) => <div key={i}>{line}</div>)}
                    </div>
                )}
            </div>

            {/* Tor Controls */}
            <div className="tor-control-panel">
                <div className="tor-control-box">
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '15px' }}>⚙️ Cấu hình Proxy</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <div className="tor-input-group">
                            <label>Số lượng cổng proxy</label>
                            <input 
                                type="number" 
                                className="tor-input" 
                                min="1" 
                                max="20" 
                                value={proxyCount} 
                                onChange={(e) => setProxyCount(e.target.value)}
                            />
                        </div>
                        <div className="tor-input-group">
                            <label>Cổng SOCKS bắt đầu</label>
                            <input 
                                type="number" 
                                className="tor-input" 
                                min="1024" 
                                max="65000" 
                                value={startPort} 
                                onChange={(e) => setStartPort(e.target.value)}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                        <button className="tor-btn tor-btn-primary" onClick={handleStartAll} style={{ flex: 1 }}>
                            ▶ Khởi động Proxy
                        </button>
                        <button className="tor-btn tor-btn-danger" onClick={handleStopAll}>
                            ⏹ Dừng toàn bộ
                        </button>
                    </div>
                </div>

                <div className="tor-control-box" style={{ fontSize: '13.5px', color: '#94a3b8', lineHeight: '1.6' }}>
                    <h3 style={{ margin: '0 0 10px 0', fontSize: '15px', color: 'white' }}>💡 Hướng dẫn sử dụng</h3>
                    <ul style={{ margin: 0, paddingLeft: '18px' }}>
                        <li>Cổng điều khiển (ControlPort) sẽ tự động được gán bằng cổng SOCKS + 1. Ví dụ: SOCKS <code>9050</code> sẽ dùng ControlPort <code>9051</code>.</li>
                        <li>Trình duyệt chống phát hiện (MunLogin) hoặc các thiết bị di động có thể gán proxy trực tiếp qua địa chỉ: <code>socks5://127.0.0.1:[SocksPort]</code>.</li>
                        <li>Mạng Tor tự động đổi IP sau mỗi vài phút, hoặc bạn có thể nhấp vào nút xoay 🔄 để đổi IP ngay lập tức thông qua ControlPort.</li>
                    </ul>
                </div>
            </div>

            {/* Proxies Table */}
            {proxies.length > 0 && (
                <div className="tor-table-box">
                    <table className="tor-table">
                        <thead>
                            <tr>
                                <th>CỔNG SOCKS5</th>
                                <th>CỔNG CONTROL</th>
                                <th>TRẠNG THÁI</th>
                                <th>IP HIỆN TẠI</th>
                                <th>HÀNH ĐỘNG</th>
                            </tr>
                        </thead>
                        <tbody>
                            {proxies.map((p, index) => (
                                <tr key={p.socksPort}>
                                    <td style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>
                                        127.0.0.1:{p.socksPort}
                                    </td>
                                    <td style={{ fontFamily: 'monospace', color: '#64748b' }}>
                                        {p.controlPort}
                                    </td>
                                    <td>
                                        <div className={`proxy-status-indicator ${p.status}`}>
                                            <span className="proxy-status-dot"></span>
                                            {p.status === 'Live' ? 'Đang chạy' : p.status === 'Loading' ? 'Đang tải...' : 'Đã dừng'}
                                        </div>
                                    </td>
                                    <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: p.status === 'Live' && p.ip !== '—' ? '#00f2fe' : '#64748b' }}>
                                        {p.ip}
                                    </td>
                                    <td>
                                        <div className="action-row">
                                            <button 
                                                className="btn-icon rotate" 
                                                onClick={() => handleRotateIp(p.controlPort, index)} 
                                                title="Yêu cầu Đổi IP mới"
                                                disabled={p.status !== 'Live'}
                                            >
                                                🔄
                                            </button>
                                            <button 
                                                className="btn-icon" 
                                                onClick={() => handleCopyProxy(p.socksPort)} 
                                                title="Copy địa chỉ Proxy"
                                            >
                                                📋
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
