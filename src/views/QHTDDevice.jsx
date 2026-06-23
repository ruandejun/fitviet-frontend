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
const SCRIPT_TEMPLATES = {
    custom: '',
    scroll_tiktok: 'wait 2\nswipe 180 600 180 200 500\nwait 5\nswipe 180 600 180 200 500\nwait 5',
    fb_interaction: 'wait 2\ntap 180 320\nwait 2\ntype Like bài viết\nwait 1\ntap 320 600\nwait 3',
    app_launch: 'wait 1\nlaunch_app com.apple.mobilesafari\nwait 5\ntap 180 320'
};

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

    // Sub-Tabs selection state
    const [activeSubTab, setActiveSubTab] = useState('apps');

    // Automation States
    const [scriptText, setScriptText] = useState('wait 2\ntap 180 320\nwait 1\ntype test text\nwait 2');
    const [automationLogs, setAutomationLogs] = useState([]);
    const [isAutomationRunning, setIsAutomationRunning] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState('custom');

    // App Store search states
    const [appStoreSearchText, setAppStoreSearchText] = useState('');
    const [appStoreResults, setAppStoreResults] = useState([]);
    const [searchingAppStore, setSearchingAppStore] = useState(false);

    // Jailbreak / TrollStore States
    const [wdaStatus, setWdaStatus] = useState('unknown'); // 'unknown' | 'running' | 'stopped' | 'not_installed'
    const [checkingWda, setCheckingWda] = useState(false);
    const [wdaSetupLogs, setWdaSetupLogs] = useState([]);
    const [wdaSettingUp, setWdaSettingUp] = useState(false);
    const [dopamineLogs, setDopamineLogs] = useState([]);
    const [dopamineInstalling, setDopamineInstalling] = useState(false);
    const [dopamineServerUrl, setDopamineServerUrl] = useState('');

    // Mock bridge helper for testing layout/flows in standard browsers
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('desktop') === 'true' && !window.qhtdBridge) {
            class MockQtSignal {
                constructor() {
                    this.listeners = [];
                }
                connect(fn) {
                    this.listeners.push(fn);
                }
                disconnect(fn) {
                    this.listeners = this.listeners.filter(l => l !== fn);
                }
                emit(...args) {
                    this.listeners.forEach(fn => {
                        try { fn(...args); } catch (e) { console.error(e); }
                    });
                }
            }

            const automationLog = new MockQtSignal();
            const automationFinished = new MockQtSignal();
            const wdaSetupLog = new MockQtSignal();
            const wdaSetupFinished = new MockQtSignal();
            const dopamineLog = new MockQtSignal();
            const dopamineServerUrl = new MockQtSignal();
            const dopamineFinished = new MockQtSignal();

            window.qhtdBridge = {
                automationLog,
                automationFinished,
                wdaSetupLog,
                wdaSetupFinished,
                dopamineLog,
                dopamineServerUrl,
                dopamineFinished,

                getToolInfo: async () => {
                    return JSON.stringify({
                        version: "1.2.3",
                        os: "win32",
                        pymobiledevice3: true,
                        mun_anti_browser: true
                    });
                },
                scanDevices: async () => {
                    return JSON.stringify([
                        {
                            name: "My Test iPhone",
                            model: "iPhone 11 Pro",
                            serial: "ABCDE12345",
                            udid: "00008030-00123456789ABCDE",
                            ios_version: "15.4.1",
                            wifi_address: "192.168.2.55"
                        }
                    ]);
                },
                getDeviceApps: async (serial) => {
                    return JSON.stringify([
                        {name: "Facebook", bundle_id: "com.facebook.Facebook", version: "411.0"},
                        {name: "TikTok", bundle_id: "com.zhiliaoapp.musically", version: "29.3.0"},
                        {name: "Safari", bundle_id: "com.apple.mobilesafari", version: "15.0"}
                    ]);
                },
                activateDevice: async (serial) => {
                    return JSON.stringify({success: true});
                },
                eraseDevice: async (serial) => {
                    return JSON.stringify({success: true});
                },
                backupAppData: async (serial, bundleId) => {
                    return JSON.stringify({success: true, path: "/root/storagon/backup/" + bundleId + ".zip"});
                },
                restoreAppData: async (serial, bundleId) => {
                    return JSON.stringify({success: true});
                },
                clearAppData: async (serial, bundleId) => {
                    return JSON.stringify({success: true});
                },
                checkWDAStatus: async (serial) => {
                    return JSON.stringify({status: "stopped", message: "WebDriverAgent is not running"});
                },
                startWDASetup: (serial) => {
                    wdaSetupLog.emit("Bắt đầu thiết lập WebDriverAgent...", "action");
                    setTimeout(() => wdaSetupLog.emit("Đang cài đặt ipa WDA qua pymobiledevice3...", ""), 400);
                    setTimeout(() => wdaSetupLog.emit("Đang khởi chạy dịch vụ test...", ""), 800);
                    setTimeout(() => {
                        wdaSetupFinished.emit(true, "Thiết lập WebDriverAgent thành công!");
                    }, 1500);
                },
                stopWDASetup: () => {
                    wdaSetupFinished.emit(false, "Người dùng dừng thiết lập.");
                },
                startDopamineInstall: (serial) => {
                    dopamineLog.emit("Bắt đầu tải Dopamine IPA...", "action");
                    setTimeout(() => dopamineLog.emit("Đang mở server cài đặt cục bộ...", ""), 500);
                    setTimeout(() => {
                        dopamineServerUrl.emit("http://192.168.2.55:8889/dopamine-install");
                        dopamineFinished.emit(true, "Mở link tải thành công");
                    }, 1000);
                },
                stopDopamineInstall: () => {
                    dopamineFinished.emit(false, "Đã dừng.");
                },
                runAutomation: (config) => {
                    automationLog.emit("▶ Khởi chạy kịch bản tự động...", "action");
                    setTimeout(() => automationLog.emit("wait 2: Chờ 2 giây...", ""), 500);
                    setTimeout(() => automationLog.emit("tap 180 320: Nhấn tọa độ (180, 320)...", "action"), 1000);
                    setTimeout(() => automationLog.emit("type test text: Nhập chữ 'test text'...", ""), 1500);
                    setTimeout(() => {
                        automationFinished.emit();
                    }, 2000);
                },
                stopAutomation: () => {
                    automationLog.emit("⏹ Dừng kịch bản tự động.", "error");
                    automationFinished.emit();
                },
                searchAppStore: async (text, country, limit) => {
                    return JSON.stringify([
                        {trackId: 1, trackName: "Facebook", bundleId: "com.facebook.Facebook"},
                        {trackId: 2, trackName: "TikTok", bundleId: "com.zhiliaoapp.musically"},
                        {trackId: 3, trackName: "Safari", bundleId: "com.apple.mobilesafari"}
                    ]);
                },
                openUrl: (url) => {
                    window.open(url, '_blank');
                }
            };

            // Notify ready
            window.dispatchEvent(new Event('qhtdBridgeReady'));
            console.log('[Mock Bridge] Simulated QHTD Desktop bridge initialized successfully.');
        }
    }, []);

    // Setup QWebChannel Signals connection
    useEffect(() => {
        let connected = false;
        let handleLog = null;
        let handleFinished = null;
        let handleWdaLog = null;
        let handleWdaFinished = null;
        let handleDopamineLog = null;
        let handleDopamineFinished = null;
        let handleDopamineServerUrl = null;

        const setupBridge = () => {
            if (window.qhtdBridge && !connected) {
                connected = true;

                // 1. Automation script runner signals
                handleLog = (msg, style) => {
                    setAutomationLogs(prev => [...prev, { text: msg, style }]);
                };
                handleFinished = () => {
                    setIsAutomationRunning(false);
                    setAutomationLogs(prev => [...prev, { text: '🟢 Hoàn thành kịch bản tự động.', style: 'success' }]);
                };

                // 2. WDA setup signals
                handleWdaLog = (msg, style) => {
                    setWdaSetupLogs(prev => [...prev, { text: msg, style }]);
                };
                handleWdaFinished = (success, msg) => {
                    setWdaSettingUp(false);
                    setWdaStatus(success ? 'running' : 'stopped');
                    setWdaSetupLogs(prev => [...prev, { text: success ? `✅ ${msg}` : `❌ ${msg}`, style: success ? 'success' : 'error' }]);
                };

                // 3. Dopamine setup signals
                handleDopamineLog = (msg, style) => {
                    setDopamineLogs(prev => [...prev, { text: msg, style }]);
                };
                handleDopamineServerUrl = (url) => {
                    setDopamineServerUrl(url);
                };
                handleDopamineFinished = (success, msg) => {
                    setDopamineInstalling(false);
                    if (success) {
                        setDopamineLogs(prev => [...prev, { text: `✅ Máy chủ tải: ${msg}`, style: 'success' }]);
                    } else {
                        setDopamineLogs(prev => [...prev, { text: `❌ Lỗi: ${msg}`, style: 'error' }]);
                    }
                };

                if (window.qhtdBridge.automationLog) window.qhtdBridge.automationLog.connect(handleLog);
                if (window.qhtdBridge.automationFinished) window.qhtdBridge.automationFinished.connect(handleFinished);
                if (window.qhtdBridge.wdaSetupLog) window.qhtdBridge.wdaSetupLog.connect(handleWdaLog);
                if (window.qhtdBridge.wdaSetupFinished) window.qhtdBridge.wdaSetupFinished.connect(handleWdaFinished);
                if (window.qhtdBridge.dopamineLog) window.qhtdBridge.dopamineLog.connect(handleDopamineLog);
                if (window.qhtdBridge.dopamineServerUrl) window.qhtdBridge.dopamineServerUrl.connect(handleDopamineServerUrl);
                if (window.qhtdBridge.dopamineFinished) window.qhtdBridge.dopamineFinished.connect(handleDopamineFinished);
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
                    if (window.qhtdBridge.automationLog && handleLog) window.qhtdBridge.automationLog.disconnect(handleLog);
                    if (window.qhtdBridge.automationFinished && handleFinished) window.qhtdBridge.automationFinished.disconnect(handleFinished);
                    if (window.qhtdBridge.wdaSetupLog && handleWdaLog) window.qhtdBridge.wdaSetupLog.disconnect(handleWdaLog);
                    if (window.qhtdBridge.wdaSetupFinished && handleWdaFinished) window.qhtdBridge.wdaSetupFinished.disconnect(handleWdaFinished);
                    if (window.qhtdBridge.dopamineLog && handleDopamineLog) window.qhtdBridge.dopamineLog.disconnect(handleDopamineLog);
                    if (window.qhtdBridge.dopamineServerUrl && handleDopamineServerUrl) window.qhtdBridge.dopamineServerUrl.disconnect(handleDopamineServerUrl);
                    if (window.qhtdBridge.dopamineFinished && handleDopamineFinished) window.qhtdBridge.dopamineFinished.disconnect(handleDopamineFinished);
                } catch (e) {
                    // ignore disconnect errors
                }
            }
        };
    }, []);

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

    const handleStartAutomation = useCallback(async () => {
        if (!window.qhtdBridge || !selectedDevice?.serial) return;
        setIsAutomationRunning(true);
        setAutomationLogs([]);
        const config = {
            serial: selectedDevice.serial,
            script_type: 'custom',
            commands: scriptText
        };
        window.qhtdBridge.runAutomation(JSON.stringify(config));
    }, [selectedDevice, scriptText]);

    const handleStopAutomation = useCallback(async () => {
        if (!window.qhtdBridge) return;
        window.qhtdBridge.stopAutomation();
    }, []);

    const handleSearchAppStore = useCallback(async () => {
        if (!window.qhtdBridge || !appStoreSearchText.trim()) return;
        setSearchingAppStore(true);
        setAppStoreResults([]);
        try {
            const res = await window.qhtdBridge.searchAppStore(appStoreSearchText, 'VN', '5');
            const parsed = JSON.parse(res);
            if (parsed.error) {
                alert(parsed.error);
            } else {
                setAppStoreResults(parsed);
            }
        } catch (e) {
            alert('Lỗi truy vấn: ' + e.message);
        } finally {
            setSearchingAppStore(false);
        }
    }, [appStoreSearchText]);

    const handleCheckWDAStatus = useCallback(async (serial) => {
        if (!window.qhtdBridge || !serial) return;
        setCheckingWda(true);
        try {
            const res = await window.qhtdBridge.checkWDAStatus(serial);
            const parsed = JSON.parse(res);
            setWdaStatus(parsed.status);
            alert(parsed.message);
        } catch (e) {
            alert('Lỗi kiểm tra WDA: ' + e.message);
        } finally {
            setCheckingWda(false);
        }
    }, []);

    const handleStartWDASetup = useCallback(async (serial) => {
        if (!window.qhtdBridge || !serial) return;
        setWdaSettingUp(true);
        setWdaSetupLogs([]);
        window.qhtdBridge.startWDASetup(serial);
    }, []);

    const handleStopWDASetup = useCallback(async () => {
        if (!window.qhtdBridge) return;
        window.qhtdBridge.stopWDASetup();
    }, []);

    const handleStartDopamine = useCallback(async (serial) => {
        if (!window.qhtdBridge || !serial) return;
        setDopamineInstalling(true);
        setDopamineLogs([]);
        setDopamineServerUrl('');
        window.qhtdBridge.startDopamineInstall(serial);
    }, []);

    const handleStopDopamine = useCallback(async () => {
        if (!window.qhtdBridge) return;
        window.qhtdBridge.stopDopamineInstall();
    }, []);

    const handleOpenExternalUrl = useCallback((url) => {
        if (window.qhtdBridge && window.qhtdBridge.openUrl) {
            window.qhtdBridge.openUrl(url);
        } else {
            window.open(url, '_blank');
        }
    }, []);

    const handleTemplateChange = (templateName) => {
        setSelectedTemplate(templateName);
        if (SCRIPT_TEMPLATES[templateName] !== undefined) {
            setScriptText(SCRIPT_TEMPLATES[templateName]);
        }
    };

    const handleCopyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text)
            .then(() => alert(`Đã sao chép ${label} vào bộ nhớ tạm!`))
            .catch(err => alert('Lỗi khi sao chép: ' + err));
    };

    const filteredApps = apps.filter(app => 
        app.name.toLowerCase().includes(appSearch.toLowerCase()) || 
        app.bundle_id.toLowerCase().includes(appSearch.toLowerCase())
    );

    const renderAppsSubTab = () => {
        return (
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
        );
    };

    const renderAutomationSubTab = () => {
        return (
            <div style={{ display: 'flex', gap: '16px', flex: 1, overflow: 'hidden', boxSizing: 'border-box' }}>
                {/* Left Side: Script Editor & Bundle lookup (45%) */}
                <div style={{ width: '45%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>
                            ✍️ Soạn thảo kịch bản
                        </span>
                        <select
                            value={selectedTemplate}
                            onChange={(e) => handleTemplateChange(e.target.value)}
                            style={{
                                background: '#0e1630',
                                border: '1px solid var(--border-color)',
                                color: '#f8fafc',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                outline: 'none'
                            }}
                        >
                            <option value="custom">-- Chọn Kịch bản Mẫu --</option>
                            <option value="scroll_tiktok">Lướt Tiktok tự động</option>
                            <option value="fb_interaction">Tương tác Facebook</option>
                            <option value="app_launch">Khởi chạy Safari</option>
                        </select>
                    </div>

                    <textarea
                        value={scriptText}
                        onChange={(e) => setScriptText(e.target.value)}
                        placeholder="Ví dụ:\nwait 2\ntap 100 200\nswipe 100 500 100 200 300\ntype Hello World"
                        style={{
                            flex: 1,
                            minHeight: '120px',
                            background: '#040714',
                            border: '1px solid var(--border-color)',
                            borderRadius: '8px',
                            padding: '12px',
                            color: '#e2e8f0',
                            fontFamily: 'Consolas, monospace',
                            fontSize: '12px',
                            lineHeight: '1.5',
                            resize: 'none',
                            outline: 'none'
                        }}
                    />

                    {/* App Store Bundle Lookup */}
                    <div style={{
                        background: 'rgba(255,255,255,0.01)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                    }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent)' }}>🔍 Tra cứu nhanh Bundle ID từ App Store</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Nhập tên ứng dụng (vd: facebook, tiktok)..."
                                value={appStoreSearchText}
                                onChange={(e) => setAppStoreSearchText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearchAppStore()}
                                style={{ flex: 1, height: '28px', fontSize: '11px', margin: 0, background: '#090d16', border: '1px solid var(--border-color)', color: '#f8fafc', padding: '0 8px', borderRadius: '4px' }}
                            />
                            <button
                                className="btn btn-secondary"
                                onClick={handleSearchAppStore}
                                disabled={searchingAppStore}
                                style={{ padding: '0 12px', fontSize: '11px', minHeight: '28px' }}
                            >
                                {searchingAppStore ? '⏳...' : 'Tìm'}
                            </button>
                        </div>
                        {appStoreResults.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px', maxHeight: '110px', overflowY: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '6px' }}>
                                {appStoreResults.map(app => (
                                    <div key={app.trackId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', padding: '4px', borderRadius: '4px', background: 'rgba(255,255,255,0.01)' }}>
                                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px', color: '#cbd5e1' }}>
                                            {app.trackName}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '10px' }}>{app.bundleId}</span>
                                            <button
                                                onClick={() => {
                                                    handleCopyToClipboard(app.bundleId, 'Bundle ID');
                                                    setScriptText(prev => prev + `\nlaunch_app ${app.bundleId}`);
                                                }}
                                                style={{ background: 'rgba(0, 242, 254, 0.1)', border: 'none', color: 'var(--accent)', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}
                                            >
                                                ➕ Thêm
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Automation control buttons */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {!isAutomationRunning ? (
                            <button
                                className="btn btn-primary"
                                onClick={handleStartAutomation}
                                style={{ flex: 1, minHeight: '36px', justifyContent: 'center' }}
                            >
                                🚀 Bắt đầu chạy Kịch bản
                            </button>
                        ) : (
                            <button
                                className="btn btn-danger"
                                onClick={handleStopAutomation}
                                style={{ flex: 1, minHeight: '36px', justifyContent: 'center' }}
                            >
                                ⏹ Dừng kịch bản
                            </button>
                        )}
                    </div>
                </div>

                {/* Right Side: Black Console (55%) */}
                <div style={{ width: '55%', display: 'flex', flexDirection: 'column', background: '#02040a', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#090d16', padding: '6px 12px', borderBottom: '1px solid var(--border-color)' }}>
                        <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, color: '#f8fafc' }}>
                            💻 CONSOLE LOGS
                        </span>
                        <button
                            onClick={() => setAutomationLogs([])}
                            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '10px' }}
                        >
                            🧹 Clear
                        </button>
                    </div>
                    <div style={{ flex: 1, padding: '12px', overflowY: 'auto', fontFamily: 'Consolas, monospace', fontSize: '11px', lineHeight: '1.6', color: '#a5f3fc' }}>
                        {automationLogs.length === 0 ? (
                            <span style={{ color: '#475569' }}>Logs kịch bản tự động sẽ xuất hiện tại đây...</span>
                        ) : (
                            automationLogs.map((log, idx) => {
                                let styleColor = '#a5f3fc';
                                if (log.style === 'success') styleColor = '#00ff9f';
                                else if (log.style === 'error') styleColor = '#ff073a';
                                else if (log.style === 'warn') styleColor = '#f59e0b';
                                else if (log.style === 'action') styleColor = '#38bdf8';

                                return (
                                    <div key={idx} style={{ color: styleColor, whiteSpace: 'pre-wrap' }}>
                                        {log.text}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderJailbreakSubTab = () => {
        return (
            <div style={{ display: 'flex', gap: '16px', flex: 1, overflowY: 'auto', boxSizing: 'border-box' }}>
                {/* Section A: Guide & Tools (Left, 45%) */}
                <div style={{ width: '45%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                    }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>💡 Hướng dẫn Jailbreak (iPhone 7 / iOS 15-16)</span>
                        <ol style={{ fontSize: '11.5px', color: '#cbd5e1', paddingLeft: '16px', margin: '4px 0', lineHeight: '1.6' }}>
                            <li>Tải Palen1x và Rufus để tạo USB khởi động Palera1n.</li>
                            <li>Cắm USB và khởi động lại PC để chạy môi trường Palen1x.</li>
                            <li>Kết nối iPhone 7 ở chế độ DFU mode để jailbreak.</li>
                            <li>Sau khi jailbreak, cài đặt TrollStore qua TrollHelper.</li>
                        </ol>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '6px' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => handleOpenExternalUrl('https://github.com/palera1n/palen1x/releases')}
                                style={{ padding: '6px', fontSize: '10.5px', minHeight: '30px', justifyContent: 'center' }}
                            >
                                📥 Tải Palen1x
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => handleOpenExternalUrl('https://rufus.ie')}
                                style={{ padding: '6px', fontSize: '10.5px', minHeight: '30px', justifyContent: 'center' }}
                            >
                                🛠 Tải Rufus
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => handleOpenExternalUrl('https://github.com/opa334/TrollStore')}
                                style={{ padding: '6px', fontSize: '10.5px', minHeight: '30px', justifyContent: 'center', gridColumn: 'span 2' }}
                            >
                                📲 Hướng dẫn TrollStore
                            </button>
                        </div>
                    </div>

                    {/* WDA Active status & setup controls */}
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}>🤖 WebDriverAgent (WDA)</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: wdaStatus === 'running' ? '#00ff9f' : wdaStatus === 'stopped' ? '#f59e0b' : wdaStatus === 'not_installed' ? '#ff073a' : '#94a3b8',
                                    boxShadow: wdaStatus === 'running' ? '0 0 8px #00ff9f' : 'none'
                                }} />
                                <span style={{ fontSize: '11px', fontWeight: 600, color: wdaStatus === 'running' ? '#00ff9f' : '#cbd5e1' }}>
                                    {wdaStatus === 'running' ? 'Đang chạy' : wdaStatus === 'stopped' ? 'Chưa chạy' : wdaStatus === 'not_installed' ? 'Chưa cài' : 'Chưa rõ'}
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => handleCheckWDAStatus(selectedDevice.serial)}
                                disabled={checkingWda || wdaSettingUp}
                                style={{ flex: 1, padding: '4px', fontSize: '11px', minHeight: '30px', justifyContent: 'center' }}
                            >
                                {checkingWda ? '⏳...' : '🔎 Kiểm tra'}
                            </button>
                            
                            {!wdaSettingUp ? (
                                <button
                                    className="btn btn-primary"
                                    onClick={() => handleStartWDASetup(selectedDevice.serial)}
                                    disabled={checkingWda}
                                    style={{ flex: 2, padding: '4px', fontSize: '11px', minHeight: '30px', justifyContent: 'center', background: 'linear-gradient(135deg, var(--accent), #2563eb)' }}
                                >
                                    ⚙️ Thiết lập WDA 1-chạm
                                </button>
                            ) : (
                                <button
                                    className="btn btn-danger"
                                    onClick={handleStopWDASetup}
                                    style={{ flex: 2, padding: '4px', fontSize: '11px', minHeight: '30px', justifyContent: 'center' }}
                                >
                                    ⏹ Hủy thiết lập
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Section B: Automated Dopamine Installer & Logs (Right, 55%) */}
                <div style={{ width: '55%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                    }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>🍀 Cài Dopamine Tự động (iOS 15.0 - 16.6.1)</span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {!dopamineInstalling ? (
                                <button
                                    className="btn btn-primary"
                                    onClick={() => handleStartDopamine(selectedDevice.serial)}
                                    style={{ flex: 1, minHeight: '32px', fontSize: '11px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', justifyContent: 'center' }}
                                >
                                    🚀 Khởi chạy Cài Dopamine
                                </button>
                            ) : (
                                <button
                                    className="btn btn-danger"
                                    onClick={handleStopDopamine}
                                    style={{ flex: 1, minHeight: '32px', fontSize: '11px', justifyContent: 'center' }}
                                >
                                    ⏹ Dừng Cài Dopamine
                                </button>
                            )}
                        </div>

                        {/* QR Code and link display */}
                        {dopamineServerUrl && (
                            <div style={{
                                background: '#ffffff',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                padding: '12px',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '8px',
                                color: '#000000',
                                alignSelf: 'center',
                                marginTop: '4px'
                            }}>
                                <img
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(dopamineServerUrl)}`}
                                    alt="Dopamine Install QR"
                                    style={{ width: '130px', height: '130px' }}
                                />
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 700 }}>MỞ CAMERA ĐIỆN THOẠI QUÉT QR ĐỂ CÀI ĐẶT</div>
                                    <div style={{ fontSize: '9px', fontFamily: 'monospace', color: '#1e293b', wordBreak: 'break-all', marginTop: '2px' }}>{dopamineServerUrl}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Log screen for setup & dopamine processes */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '120px', background: '#02040a', border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                        <div style={{ background: '#090d16', padding: '4px 10px', fontSize: '10px', borderBottom: '1px solid var(--border-color)', color: '#f8fafc', fontWeight: 700 }}>
                            📝 TIẾN TRÌNH LOGS
                        </div>
                        <div style={{ flex: 1, padding: '10px', overflowY: 'auto', fontFamily: 'Consolas, monospace', fontSize: '10px', color: '#cbd5e1', lineHeight: '1.5' }}>
                            {wdaSetupLogs.length === 0 && dopamineLogs.length === 0 ? (
                                <span style={{ color: '#475569' }}>Logs cài đặt và cấu hình thiết bị sẽ hiển thị ở đây...</span>
                            ) : (
                                <>
                                    {wdaSetupLogs.map((log, idx) => (
                                        <div key={`wda-${idx}`} style={{ color: log.style === 'success' ? '#00ff9f' : log.style === 'error' ? '#ff073a' : log.style === 'action' ? '#38bdf8' : '#cbd5e1' }}>
                                            [WDA] {log.text}
                                        </div>
                                    ))}
                                    {dopamineLogs.map((log, idx) => (
                                        <div key={`dopamine-${idx}`} style={{ color: log.style === 'success' ? '#00ff9f' : log.style === 'error' ? '#ff073a' : log.style === 'action' ? '#38bdf8' : '#cbd5e1' }}>
                                            [Dopamine] {log.text}
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

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

                {/* Column 2 & 3 Merged: Device Details & Tabs Manager (Right, flex: 1) */}
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
                            {/* Horizontal Device Info Bar */}
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.01)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '10px',
                                padding: '12px 16px',
                                marginBottom: '16px',
                                display: 'flex',
                                gap: '16px',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                flexWrap: 'wrap'
                            }}>
                                {/* Left group: Apple icon, name, model & OS version */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ fontSize: '24px' }}>🍎</div>
                                    <div>
                                        <h3 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: 800, color: '#f8fafc' }}>
                                            {selectedDevice.name || 'iPhone'}
                                        </h3>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                            {selectedDevice.model || 'Unknown Model'} (iOS {selectedDevice.ios_version || '—'})
                                        </div>
                                    </div>
                                </div>

                                {/* Center group: IP, Serial, UDID & status */}
                                <div style={{ display: 'flex', gap: '24px', flex: 1, minWidth: '300px', flexWrap: 'wrap', justifyContent: 'flex-start', paddingLeft: '12px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>IP WiFi</span>
                                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: selectedDevice.wifi_address ? 'var(--success)' : 'var(--text-muted)' }}>
                                            {selectedDevice.wifi_address || 'Offline'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Số Serial</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '11.5px', fontFamily: 'monospace', color: '#cbd5e1', fontWeight: 600 }}>{selectedDevice.serial || '—'}</span>
                                            <button 
                                                className="copy-btn-hover"
                                                onClick={() => handleCopyToClipboard(selectedDevice.serial, 'Serial')}
                                                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '10px', padding: '2px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
                                                title="Sao chép Serial"
                                            >
                                                📋
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Mã UDID</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '11.5px', fontFamily: 'monospace', color: '#cbd5e1', fontWeight: 600, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={selectedDevice.udid}>{selectedDevice.udid || '—'}</span>
                                            <button 
                                                className="copy-btn-hover"
                                                onClick={() => handleCopyToClipboard(selectedDevice.udid, 'UDID')}
                                                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '10px', padding: '2px', borderRadius: '4px', display: 'flex', alignItems: 'center' }}
                                                title="Sao chép UDID"
                                            >
                                                📋
                                            </button>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Trạng thái</span>
                                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#38bdf8' }}>{statusText}</span>
                                    </div>
                                </div>

                                {/* Right group: Device actions */}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button 
                                        className="btn btn-primary" 
                                        style={{ 
                                            height: '32px', 
                                            background: 'linear-gradient(135deg, var(--accent), #3b82f6)',
                                            border: 'none',
                                            fontSize: '12px',
                                            padding: '0 12px',
                                            fontWeight: 600
                                        }}
                                        onClick={() => handleActivate(selectedDevice.serial)}
                                        disabled={!!runningAction}
                                    >
                                        ⚡ Kích hoạt iPhone
                                    </button>
                                    <button 
                                        className="btn" 
                                        style={{ 
                                            height: '32px',
                                            background: 'transparent',
                                            border: '1px solid var(--danger)',
                                            color: 'var(--danger)',
                                            fontSize: '12px',
                                            padding: '0 12px',
                                            fontWeight: 600
                                        }}
                                        onClick={() => handleErase(selectedDevice.serial)}
                                        disabled={!!runningAction}
                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255, 7, 58, 0.05)'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                    >
                                        ⚠️ Xóa sạch
                                    </button>
                                </div>
                            </div>

                            {/* Sub-Tabs Header Selection */}
                            <div style={{
                                display: 'flex',
                                borderBottom: '1px solid var(--border-color)',
                                marginBottom: '14px',
                                gap: '4px'
                            }}>
                                <button
                                    onClick={() => setActiveSubTab('apps')}
                                    style={{
                                        padding: '8px 16px',
                                        background: activeSubTab === 'apps' ? 'rgba(0, 242, 254, 0.08)' : 'transparent',
                                        border: 'none',
                                        borderBottom: activeSubTab === 'apps' ? '2px solid var(--accent)' : '2px solid transparent',
                                        color: activeSubTab === 'apps' ? 'var(--accent)' : 'var(--text-muted)',
                                        fontWeight: 700,
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    📦 Ứng dụng
                                </button>
                                <button
                                    onClick={() => setActiveSubTab('automation')}
                                    style={{
                                        padding: '8px 16px',
                                        background: activeSubTab === 'automation' ? 'rgba(0, 242, 254, 0.08)' : 'transparent',
                                        border: 'none',
                                        borderBottom: activeSubTab === 'automation' ? '2px solid var(--accent)' : '2px solid transparent',
                                        color: activeSubTab === 'automation' ? 'var(--accent)' : 'var(--text-muted)',
                                        fontWeight: 700,
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    🤖 Tự động hóa
                                </button>
                                <button
                                    onClick={() => setActiveSubTab('jailbreak')}
                                    style={{
                                        padding: '8px 16px',
                                        background: activeSubTab === 'jailbreak' ? 'rgba(0, 242, 254, 0.08)' : 'transparent',
                                        border: 'none',
                                        borderBottom: activeSubTab === 'jailbreak' ? '2px solid var(--accent)' : '2px solid transparent',
                                        color: activeSubTab === 'jailbreak' ? 'var(--accent)' : 'var(--text-muted)',
                                        fontWeight: 700,
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    🔓 Jailbreak & TrollStore
                                </button>
                            </div>

                            {/* Render active sub-tab */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                {activeSubTab === 'apps' && renderAppsSubTab()}
                                {activeSubTab === 'automation' && renderAutomationSubTab()}
                                {activeSubTab === 'jailbreak' && renderJailbreakSubTab()}
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
                            <span style={{ fontSize: '48px', marginBottom: '16px' }}>📱</span>
                            <h4 style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 700, color: 'var(--text-color)' }}>Chưa chọn thiết bị</h4>
                            <p style={{ fontSize: '12px', margin: 0, color: 'var(--text-muted)' }}>Vui lòng chọn thiết bị ở danh sách bên trái để cấu hình.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
