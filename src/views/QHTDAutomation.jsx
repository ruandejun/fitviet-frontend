import React, { useState, useEffect, useRef, useCallback } from 'react';

/**
 * QHTDAutomation — Tab "Tự động" cho desktop app
 * Chỉ hiển thị khi chạy trong QHTD Desktop (window.__QHTD_DESKTOP__ === true)
 * Giao tiếp với Python qua window.qhtdBridge (QWebChannel)
 */
export default function QHTDAutomation() {
    const [scriptType, setScriptType] = useState('custom');
    const [customScript, setCustomScript] = useState(
        "# Kịch bản mẫu\nwait 2\ntap 200 400\nwait 1\nswipe 187 600 187 200 400\ntype hello_world"
    );
    const [isRunning, setIsRunning] = useState(false);
    const [logs, setLogs] = useState([]);
    const logEndRef = useRef(null);

    // App Store search state
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    // Auto-scroll logs
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // Listen for bridge signals
    useEffect(() => {
        let connected = false;
        let handleLog = null;
        let handleFinished = null;

        const setupBridge = () => {
            if (window.qhtdBridge && !connected) {
                connected = true;
                
                handleLog = (message, style) => {
                    setLogs(prev => [...prev, { message, style, time: new Date().toLocaleTimeString('vi-VN') }]);
                };
                handleFinished = () => {
                    setIsRunning(false);
                    handleLog('✅ Kịch bản hoàn tất!', 'success');
                };

                if (window.qhtdBridge.automationLog) {
                    window.qhtdBridge.automationLog.connect(handleLog);
                }
                if (window.qhtdBridge.automationFinished) {
                    window.qhtdBridge.automationFinished.connect(handleFinished);
                }
            }
        };

        setupBridge();
        window.addEventListener('qhtdBridgeReady', setupBridge);
        const timer = setTimeout(setupBridge, 1000);
        const timer2 = setTimeout(setupBridge, 3000);

        return () => {
            window.removeEventListener('qhtdBridgeReady', setupBridge);
            clearTimeout(timer);
            clearTimeout(timer2);
            if (connected && window.qhtdBridge) {
                try {
                    if (window.qhtdBridge.automationLog && handleLog) {
                        window.qhtdBridge.automationLog.disconnect(handleLog);
                    }
                    if (window.qhtdBridge.automationFinished && handleFinished) {
                        window.qhtdBridge.automationFinished.disconnect(handleFinished);
                    }
                } catch (e) {
                    // Ignore disconnect errors
                }
            }
        };
    }, []);

    const handleStart = useCallback(() => {
        if (!window.qhtdBridge) return;
        setIsRunning(true);
        setLogs([]);
        const config = JSON.stringify({
            script_type: scriptType,
            commands: customScript,
        });
        window.qhtdBridge.runAutomation(config);
    }, [scriptType, customScript]);

    const handleStop = useCallback(() => {
        if (!window.qhtdBridge) return;
        window.qhtdBridge.stopAutomation();
        setIsRunning(false);
    }, []);

    const handleSearchApp = useCallback(async () => {
        if (!window.qhtdBridge || !searchQuery.trim()) return;
        setSearching(true);
        try {
            const result = window.qhtdBridge.searchAppStore(searchQuery.trim(), 'VN', '10');
            const parsed = JSON.parse(result);
            if (parsed.error) {
                setLogs(prev => [...prev, { message: `❌ ${parsed.error}`, style: 'error', time: new Date().toLocaleTimeString('vi-VN') }]);
            } else {
                setSearchResults(parsed);
            }
        } catch (e) {
            setLogs(prev => [...prev, { message: `❌ Lỗi: ${e.message}`, style: 'error', time: new Date().toLocaleTimeString('vi-VN') }]);
        } finally {
            setSearching(false);
        }
    }, [searchQuery]);

    const handleClearLogs = () => setLogs([]);

    const logColorMap = {
        'info': 'var(--accent, #00f2fe)',
        'success': '#00ff9f',
        'error': '#ff073a',
        'warn': '#fff01f',
        'action': 'var(--primary, #d946ef)',
    };

    return (
        <div>
            {/* Two-column layout */}
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                {/* Left: Script Editor */}
                <div style={{ flex: '1 1 400px', minWidth: '300px' }}>
                    <div className="section-card" style={{
                        background: 'var(--card-bg, rgba(255,255,255,0.02))',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '20px',
                    }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
                            ⚙️ Kịch Bản Tự Động
                        </h3>

                        {/* Script Type Selector */}
                        <div className="form-group">
                            <label className="form-label">Loại kịch bản</label>
                            <select className="filter-select" value={scriptType} onChange={(e) => setScriptType(e.target.value)} style={{ width: '100%' }}>
                                <option value="custom">Kịch bản tùy chỉnh</option>
                                <option value="add_card">Thêm thẻ tự động</option>
                                <option value="check_card">Kiểm tra thẻ</option>
                            </select>
                        </div>

                        {/* Custom Script Editor */}
                        {scriptType === 'custom' && (
                            <div className="form-group">
                                <label className="form-label">Nội dung kịch bản</label>
                                <textarea
                                    value={customScript}
                                    onChange={(e) => setCustomScript(e.target.value)}
                                    style={{
                                        width: '100%',
                                        minHeight: '200px',
                                        background: 'var(--input-bg, #080b17)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '8px',
                                        padding: '12px',
                                        color: 'var(--accent, #00f2fe)',
                                        fontFamily: "'Cascadia Code', 'Consolas', monospace",
                                        fontSize: '13px',
                                        resize: 'vertical',
                                        lineHeight: '1.6',
                                    }}
                                    placeholder="Nhập kịch bản tự động..."
                                    spellCheck={false}
                                />
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                                    Lệnh: <code>wait &lt;giây&gt;</code>, <code>tap &lt;x&gt; &lt;y&gt;</code>, <code>swipe &lt;x1&gt; &lt;y1&gt; &lt;x2&gt; &lt;y2&gt; [duration]</code>, <code>type &lt;text&gt;</code>
                                </div>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                            {!isRunning ? (
                                <button className="btn btn-primary" onClick={handleStart} style={{ flex: 1 }}>
                                    ▶ Bắt đầu chạy
                                </button>
                            ) : (
                                <button className="btn btn-danger" onClick={handleStop} style={{ flex: 1 }}>
                                    ⏹ Dừng
                                </button>
                            )}
                        </div>
                    </div>

                    {/* App Store Search */}
                    <div className="section-card" style={{
                        background: 'var(--card-bg, rgba(255,255,255,0.02))',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '20px',
                        marginTop: '20px',
                    }}>
                        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>
                            🔍 Tìm kiếm App Store
                        </h3>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Tên hoặc Bundle ID..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearchApp()}
                                style={{ flex: 1 }}
                            />
                            <button className="btn btn-secondary" onClick={handleSearchApp} disabled={searching}>
                                {searching ? '⏳' : '🔍'}
                            </button>
                        </div>

                        {searchResults.length > 0 && (
                            <div style={{ marginTop: '12px', maxHeight: '200px', overflowY: 'auto' }}>
                                {searchResults.map((app) => (
                                    <div key={app.trackId} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '8px 0',
                                        borderBottom: '1px solid var(--border-color)',
                                    }}>
                                        <img src={app.artworkUrl60} alt="" style={{ width: 36, height: 36, borderRadius: 8 }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.trackName}</div>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{app.bundleId} • v{app.version}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Log Console */}
                <div style={{ flex: '1 1 400px', minWidth: '300px' }}>
                    <div className="section-card" style={{
                        background: 'var(--card-bg, rgba(255,255,255,0.02))',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '20px',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: 600 }}>
                                📋 Nhật Ký
                            </h3>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{ fontSize: '12px', color: isRunning ? '#00ff9f' : 'var(--text-muted)' }}>
                                    {isRunning ? '● Đang chạy' : '○ Dừng'}
                                </span>
                                <button className="btn btn-secondary" onClick={handleClearLogs} style={{ padding: '4px 10px', fontSize: '11px', minHeight: '24px' }}>
                                    Xóa log
                                </button>
                            </div>
                        </div>

                        <div style={{
                            flex: 1,
                            background: '#020408',
                            border: '1px solid var(--border-color)',
                            borderRadius: '10px',
                            padding: '12px',
                            fontFamily: "'Cascadia Code', 'Consolas', monospace",
                            fontSize: '12px',
                            overflowY: 'auto',
                            minHeight: '300px',
                            maxHeight: '500px',
                        }}>
                            {logs.length === 0 ? (
                                <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                                    Nhật ký sẽ hiển thị ở đây khi chạy kịch bản...
                                </div>
                            ) : (
                                logs.map((log, idx) => (
                                    <div key={idx} style={{ marginBottom: '4px', lineHeight: '1.5' }}>
                                        <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>[{log.time}]</span>{' '}
                                        <span style={{ color: logColorMap[log.style] || '#94a3b8' }}>{log.message}</span>
                                    </div>
                                ))
                            )}
                            <div ref={logEndRef} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
