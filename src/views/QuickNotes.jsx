import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../api';

export default function QuickNotes({ noteId, currentUser, onLogout, isEmbedded = false, theme: themeProp }) {
    const [content, setContent] = useState('');
    const [hasPasswordState, setHasPasswordState] = useState(false);
    const [passwordRequired, setPasswordRequired] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const [statusState, setStatusState] = useState('saved'); // typing, saving, saved, offline
    const [statusMessage, setStatusMessage] = useState('Ghi chú sẵn sàng');
    const [isSaving, setIsSaving] = useState(false);

    // Metrics
    const [metrics, setMetrics] = useState({ chars: 0, words: 0, lines: 0 });

    // Preferences
    const [localTheme, setLocalTheme] = useState(() => localStorage.getItem('ghi_theme') || 'dark');
    const theme = themeProp || localTheme;
    const [font, setFont] = useState(() => localStorage.getItem('ghi_font') || 'sans');

    // Toast
    const [toastMessage, setToastMessage] = useState('');
    const [showToast, setShowToast] = useState(false);

    // Modals
    const [showUserInfoModal, setShowUserInfoModal] = useState(false);
    const [showQuickLoginModal, setShowQuickLoginModal] = useState(false);
    const [showLockModal, setShowLockModal] = useState(false);
    const [lockPasswordInput, setLockPasswordInput] = useState('');

    // Quick Auth Screen (inside Login modal)
    const [authTab, setAuthTab] = useState('login'); // login, register
    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [btnSubmitLoginDisabled, setBtnSubmitLoginDisabled] = useState(false);

    const [registerUsername, setRegisterUsername] = useState('');
    const [registerEmail, setRegisterEmail] = useState('');
    const [registerPassword, setRegisterPassword] = useState('');
    const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
    const [registerError, setRegisterError] = useState('');
    const [btnSubmitRegisterDisabled, setBtnSubmitRegisterDisabled] = useState(false);

    const lastServerContentRef = useRef('');
    const lastTypedTimeRef = useRef(0);
    const textareaRef = useRef(null);

    // Trigger toast
    const triggerToast = (msg) => {
        setToastMessage(msg);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
    };

    // Calculate metrics
    const calculateMetrics = (txt) => {
        const chars = txt.length;
        const words = txt.trim() ? txt.trim().split(/\s+/).length : 0;
        const lines = txt ? txt.split('\n').length : 0;
        setMetrics({ chars, words, lines });
    };

    // Load initial note info
    const fetchNote = async () => {
        try {
            const resp = await apiRequest(`/ghi/api/get/${noteId}/`);
            if (resp.status === 403) {
                const data = await resp.json();
                if (data.password_required) {
                    setPasswordRequired(true);
                    setHasPasswordState(true);
                    return;
                }
            }

            if (resp.ok) {
                const data = await resp.json();
                setContent(data.content || '');
                lastServerContentRef.current = data.content || '';
                setHasPasswordState(data.has_password);
                calculateMetrics(data.content || '');
                setPasswordRequired(false);

                // Local backup recovery check
                const backup = localStorage.getItem(`ghi_backup_${noteId}`);
                if (backup && backup !== (data.content || '')) {
                    if (window.confirm('Phát hiện có nội dung ghi chú chưa được lưu từ phiên trước của bạn. Khôi phục lại?')) {
                        setContent(backup);
                        calculateMetrics(backup);
                        setTimeout(() => handleSave(backup), 100);
                    } else {
                        localStorage.removeItem(`ghi_backup_${noteId}`);
                    }
                }
                setStatusState('saved');
                setStatusMessage('Ghi chú sẵn sàng');
            } else {
                setStatusState('offline');
                setStatusMessage('Lỗi tải dữ liệu ghi chú');
            }
        } catch (err) {
            console.error(err);
            setStatusState('offline');
            setStatusMessage('Mất kết nối máy chủ');
        }
    };

    useEffect(() => {
        fetchNote();
    }, [noteId]);

    // Handle verification
    const handleVerifyPassword = async (e) => {
        e?.preventDefault();
        if (!passwordInput) return;
        setPasswordError('');
        try {
            const resp = await apiRequest(`/ghi/api/verify-password/${noteId}/`, {
                method: 'POST',
                body: JSON.stringify({ password: passwordInput })
            });
            if (resp.ok) {
                setPasswordRequired(false);
                setPasswordInput('');
                fetchNote();
            } else {
                const err = await resp.json();
                setPasswordError(err.message || 'Mật khẩu không chính xác');
                setPasswordInput('');
            }
        } catch (err) {
            setPasswordError('Lỗi kết nối máy chủ');
        }
    };

    // Local backup logic
    const saveToLocalBackup = (val) => {
        localStorage.setItem(`ghi_backup_${noteId}`, val);
        setStatusState('offline');
        setStatusMessage('Đã lưu trữ ngoại tuyến (Lỗi mạng)');
    };

    // Save note function
    const handleSave = async (currentVal = content) => {
        if (isSaving) return;
        setIsSaving(true);
        setStatusState('saving');
        setStatusMessage('Đang lưu...');

        try {
            const resp = await apiRequest(`/ghi/api/save/${noteId}/`, {
                method: 'POST',
                body: JSON.stringify({ content: currentVal })
            });

            if (resp.ok) {
                const res = await resp.json();
                lastServerContentRef.current = currentVal;
                localStorage.removeItem(`ghi_backup_${noteId}`);
                const timeStr = res.updated_at.split(' ')[1] || '';
                setStatusState('saved');
                setStatusMessage(`Đã lưu ghi chú (${timeStr})`);
                triggerToast('Đã lưu ghi chú thành công! 💾');
            } else {
                saveToLocalBackup(currentVal);
            }
        } catch (err) {
            saveToLocalBackup(currentVal);
        } finally {
            setIsSaving(false);
        }
    };

    // Polling Collaboration
    useEffect(() => {
        const interval = setInterval(async () => {
            if (passwordRequired) return;
            // Idle time check (> 2s since last type)
            if (Date.now() - lastTypedTimeRef.current < 2000) return;
            // Content must match server content
            if (content !== lastServerContentRef.current) return;

            try {
                const resp = await apiRequest(`/ghi/api/get/${noteId}/`);
                if (resp.ok) {
                    const data = await resp.json();
                    if (data.success && data.content !== content) {
                        const selStart = textareaRef.current?.selectionStart;
                        const selEnd = textareaRef.current?.selectionEnd;
                        const hasFocus = document.activeElement === textareaRef.current;

                        setContent(data.content);
                        lastServerContentRef.current = data.content;
                        calculateMetrics(data.content);

                        if (hasFocus && textareaRef.current) {
                            setTimeout(() => {
                                textareaRef.current.setSelectionRange(selStart, selEnd);
                            }, 0);
                        }
                        const timeStr = data.updated_at.split(' ')[1] || '';
                        setStatusState('saved');
                        setStatusMessage(`Đồng bộ trực tiếp lúc ${timeStr}`);
                    }
                    if (data.has_password !== hasPasswordState) {
                        setHasPasswordState(data.has_password);
                    }
                }
            } catch (err) {
                console.warn('Lỗi kết nối đồng bộ trực tiếp:', err);
            }
        }, 2500);

        return () => clearInterval(interval);
    }, [content, noteId, passwordRequired, hasPasswordState]);

    // Input listeners & Ctrl+S key shortcut
    const handleTextareaChange = (e) => {
        const val = e.target.value;
        setContent(val);
        calculateMetrics(val);
        lastTypedTimeRef.current = Date.now();
        setStatusState('typing');
        setStatusMessage('Có thay đổi chưa lưu...');
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave(content);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [content]);

    // Fonts & Theme toggler
    const toggleTheme = () => {
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        setLocalTheme(nextTheme);
        localStorage.setItem('ghi_theme', nextTheme);
        triggerToast(`Đã chuyển sang giao diện ${nextTheme === 'dark' ? 'Tối' : 'Sáng'}`);
    };

    const toggleFont = () => {
        const nextFont = font === 'sans' ? 'mono' : 'sans';
        setFont(nextFont);
        localStorage.setItem('ghi_font', nextFont);
        triggerToast(`Đã chuyển sang kiểu chữ ${nextFont === 'sans' ? 'Sans-serif' : 'Monospace'}`);
    };

    // Download note
    const downloadNote = () => {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `ghi-note-${noteId}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        triggerToast('Tải xuống file note thành công!');
    };

    // Share link
    const copyShareLink = () => {
        const link = window.location.href;
        navigator.clipboard.writeText(link).then(() => {
            triggerToast('Đã sao chép liên kết chia sẻ!');
        }).catch(() => {
            alert('Không thể sao chép. Vui lòng tự copy link trình duyệt.');
        });
    };

    // Quick Auth inside note editor
    const handleQuickLogin = async () => {
        if (!loginUsername || !loginPassword) {
            setLoginError('Vui lòng điền đầy đủ tên đăng nhập và mật khẩu.');
            return;
        }
        setBtnSubmitLoginDisabled(true);
        setLoginError('');
        try {
            const resp = await apiRequest('/dashboard/login/', {
                method: 'POST',
                body: JSON.stringify({ username: loginUsername, password: loginPassword })
            });
            const data = await resp.json();
            if (resp.ok && data.success) {
                triggerToast('Đăng nhập thành công! Đang tải lại...');
                setTimeout(() => window.location.reload(), 1000);
            } else {
                setLoginError(data.message || 'Tài khoản hoặc mật khẩu không chính xác.');
            }
        } catch (err) {
            setLoginError('Lỗi kết nối máy chủ.');
        } finally {
            setBtnSubmitLoginDisabled(false);
        }
    };

    const handleQuickRegister = async () => {
        if (!registerUsername || !registerEmail || !registerPassword || !registerConfirmPassword) {
            setRegisterError('Vui lòng điền đầy đủ thông tin đăng ký.');
            return;
        }
        if (registerPassword !== registerConfirmPassword) {
            setRegisterError('Mật khẩu xác nhận không khớp.');
            return;
        }
        setBtnSubmitRegisterDisabled(true);
        setRegisterError('');
        try {
            const resp = await apiRequest('/dashboard/register/', {
                method: 'POST',
                body: JSON.stringify({
                    username: registerUsername,
                    email: registerEmail,
                    password: registerPassword,
                    confirm_password: registerConfirmPassword
                })
            });
            const data = await resp.json();
            if (resp.ok && data.success) {
                triggerToast('Đăng ký thành công! Đang tự động đăng nhập...');
                setTimeout(() => window.location.reload(), 1000);
            } else {
                setRegisterError(data.message || 'Lỗi khi đăng ký tài khoản.');
            }
        } catch (err) {
            setRegisterError('Lỗi kết nối máy chủ.');
        } finally {
            setBtnSubmitRegisterDisabled(false);
        }
    };

    // Password Protected view
    if (passwordRequired) {
        return (
            <div data-theme={theme} style={{
                backgroundColor: 'var(--bg-color)',
                color: 'var(--text-color)',
                minHeight: '100vh',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative'
            }}>
                <style>{`
                    :root {
                        --bg-color: #03050c;
                        --panel-bg: rgba(6, 10, 26, 0.6);
                        --border-color: rgba(0, 242, 254, 0.08);
                        --primary-glow: #d946ef;
                        --accent-glow: #00f2fe;
                        --text-color: #f1f5f9;
                        --text-muted: #94a3b8;
                        --error-color: #ff073a;
                    }
                    [data-theme="light"] {
                        --bg-color: #f8fafc;
                        --panel-bg: rgba(255, 255, 255, 0.85);
                        --border-color: rgba(0, 0, 0, 0.06);
                        --primary-glow: #4f46e5;
                        --accent-glow: #0ea5e9;
                        --text-color: #0f172a;
                        --text-muted: #94a3b8;
                    }
                    .glowing-orb {
                        position: absolute;
                        border-radius: 50%;
                        filter: blur(140px);
                        z-index: 1;
                        opacity: 0.35;
                        pointer-events: none;
                    }
                    .orb-primary {
                        width: 400px;
                        height: 400px;
                        background: var(--primary-glow);
                        top: -100px;
                        left: -100px;
                    }
                    .orb-accent {
                        width: 350px;
                        height: 350px;
                        background: var(--accent-glow);
                        bottom: -80px;
                        right: -80px;
                    }
                    .lock-card {
                        width: 100%;
                        max-width: 400px;
                        background: var(--panel-bg);
                        backdrop-filter: blur(25px) saturate(190%);
                        -webkit-backdrop-filter: blur(25px) saturate(190%);
                        border: 1px solid var(--border-color);
                        border-radius: 20px;
                        padding: 40px;
                        z-index: 10;
                        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
                        text-align: center;
                    }
                    .btn {
                        width: 100%;
                        background: linear-gradient(135deg, #6366f1, #4f46e5);
                        border: none;
                        border-radius: 10px;
                        padding: 14px;
                        color: white;
                        font-size: 15px;
                        font-weight: 600;
                        cursor: pointer;
                        box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
                        transition: all 0.3s ease;
                    }
                    .btn:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
                    }
                    .form-input {
                        width: 100%;
                        background: rgba(8, 12, 22, 0.8);
                        border: 1px solid var(--border-color);
                        border-radius: 10px;
                        padding: 12px 16px;
                        color: var(--text-color);
                        font-size: 15px;
                        outline: none;
                        transition: all 0.3s ease;
                        text-align: center;
                        letter-spacing: 4px;
                    }
                `}</style>
                <div className="glowing-orb orb-primary"></div>
                <div className="glowing-orb orb-accent"></div>

                <div className="lock-card">
                    <span style={{ fontSize: '48px', marginBottom: '20px', display: 'inline-block' }}>🔐</span>
                    <h2 style={{
                        fontSize: '22px',
                        fontWeight: '800',
                        marginBottom: '10px',
                        letterSpacing: '0.5px',
                        background: 'linear-gradient(135deg, #f43f5e, #6366f1)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>Ghi chú đã bị khóa</h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '30px', lineHeight: '1.5' }}>
                        Ghi chú <strong>{noteId}</strong> đã được thiết lập mật khẩu bảo vệ. Vui lòng nhập mật khẩu để mở khóa và chỉnh sửa.
                    </p>

                    {passwordError && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: 'var(--error-color)',
                            padding: '10px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            marginBottom: '20px'
                        }}>{passwordError}</div>
                    )}

                    <form onSubmit={handleVerifyPassword}>
                        <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                            <input
                                type="password"
                                className="form-input"
                                value={passwordInput}
                                onChange={(e) => setPasswordInput(e.target.value)}
                                placeholder="••••••"
                                required
                                autoFocus
                            />
                        </div>
                        <button type="submit" className="btn">Mở khóa ghi chú</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div data-theme={theme} style={{
            height: isEmbedded ? '100%' : '100dvh',
            width: '100%',
            overflow: 'hidden',
            backgroundColor: isEmbedded ? 'transparent' : 'var(--bg-color)',
            color: 'var(--text-color)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            fontFamily: "'Outfit', sans-serif"
        }}>
            <style>{`
                :root {
                    --bg-color: #03050c;
                    --container-bg: rgba(6, 10, 26, 0.6);
                    --border-color: rgba(0, 242, 254, 0.08);
                    --text-color: #e2e8f0;
                    --text-muted: #94a3b8;
                    --primary-glow: #d946ef;
                    --accent-glow: #00f2fe;
                    --card-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
                    --editor-bg: transparent;
                    --toolbar-bg: rgba(5, 8, 20, 0.7);
                    --modal-bg: rgba(5, 8, 20, 0.95);
                    --btn-hover: rgba(255, 255, 255, 0.08);
                    --toast-bg: rgba(217, 70, 239, 0.9);
                    --otp-text: #34d399;
                    --otp-bg: rgba(16, 185, 129, 0.15);
                    --otp-border: rgba(16, 185, 129, 0.3);
                }
                [data-theme="light"] {
                    --bg-color: #ffffff;
                    --container-bg: #ffffff;
                    --border-color: rgba(0, 0, 0, 0.08);
                    --text-color: #0f172a;
                    --text-muted: #475569;
                    --primary-glow: #6366f1;
                    --accent-glow: #0ea5e9;
                    --card-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.05);
                    --editor-bg: transparent;
                    --toolbar-bg: #ffffff;
                    --modal-bg: #ffffff;
                    --btn-hover: rgba(0, 0, 0, 0.03);
                    --toast-bg: rgba(99, 102, 241, 0.95);
                    --otp-text: #047857;
                    --otp-bg: rgba(16, 185, 129, 0.08);
                    --otp-border: rgba(16, 185, 129, 0.2);
                }
                .glowing-orb {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(130px);
                    opacity: 0.3;
                    pointer-events: none;
                    z-index: 1;
                }
                .orb-1 { width: 500px; height: 500px; background: var(--primary-glow); top: -200px; left: -100px; }
                .orb-2 { width: 400px; height: 400px; background: var(--accent-glow); bottom: -100px; right: -100px; }
                
                .toolbar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 14px 24px;
                    background: var(--toolbar-bg);
                    backdrop-filter: blur(25px) saturate(190%);
                    -webkit-backdrop-filter: blur(25px) saturate(190%);
                    border-bottom: 1px solid var(--border-color);
                    z-index: 10;
                }
                .btn-tool {
                    background: transparent;
                    border: 1px solid var(--border-color);
                    color: var(--text-color);
                    padding: 8px 14px;
                    border-radius: 10px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.2s ease;
                }
                .btn-tool:hover {
                    background: var(--btn-hover);
                    border-color: rgba(99, 102, 241, 0.3);
                    transform: translateY(-1px);
                }
                .btn-tool.active {
                    background: rgba(99, 102, 241, 0.12);
                    border-color: var(--primary-glow);
                    color: var(--primary-glow);
                }
                .btn-login {
                    background: linear-gradient(135deg, #0ea5e9, #6366f1);
                    color: white !important;
                    border: none !important;
                }
                .btn-login:hover {
                    background: linear-gradient(135deg, #38bdf8, #818cf8) !important;
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
                }
                .editor-container {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    padding: 24px;
                    z-index: 5;
                }
                .editor-container.embedded {
                    padding: 16px;
                }
                .editor-card {
                    flex: 1;
                    background: var(--container-bg);
                    backdrop-filter: blur(25px) saturate(190%);
                    -webkit-backdrop-filter: blur(25px) saturate(190%);
                    border: 1px solid var(--border-color);
                    border-radius: 16px;
                    display: flex;
                    flex-direction: column;
                    box-shadow: var(--card-shadow), 0 0 20px rgba(0, 242, 254, 0.05);
                    overflow: hidden;
                    transition: border-color 0.3s, box-shadow 0.3s;
                }
                .editor-card:focus-within {
                    border-color: rgba(0, 242, 254, 0.3);
                    box-shadow: var(--card-shadow), 0 0 25px rgba(0, 242, 254, 0.15);
                }
                .editor-textarea {
                    flex: 1;
                    background: var(--editor-bg);
                    border: none;
                    outline: none;
                    resize: none;
                    padding: 24px;
                    color: var(--text-color);
                    font-size: 16px;
                    line-height: 1.6;
                    transition: all 0.3s ease;
                    width: 100%;
                    overflow-wrap: break-word;
                }
                .editor-textarea.font-sans { font-family: 'Outfit', sans-serif; }
                .editor-textarea.font-mono { font-family: 'JetBrains Mono', monospace; font-size: 15px; }

                .modal-overlay {
                    position: fixed;
                    top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 100;
                }
                .modal-box {
                    background: var(--modal-bg);
                    border: 1px solid var(--border-color);
                    border-radius: 20px;
                    width: 90%;
                    max-width: 400px;
                    padding: 30px;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
                    position: relative;
                }
                .form-group { margin-bottom: 16px; }
                .form-label { display: block; font-size: 13px; color: var(--text-muted); margin-bottom: 6px; font-weight: 600; }
                .form-input {
                    width: 100%;
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    padding: 10px 14px;
                    color: var(--text-color);
                    font-size: 14px;
                    outline: none;
                }
                .form-input:focus {
                    border-color: var(--primary-glow);
                    box-shadow: 0 0 10px rgba(217, 70, 239, 0.3);
                }
                .btn {
                    border: none;
                    padding: 10px 16px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .btn-secondary { background: var(--btn-hover); color: var(--text-color); }
                .btn-primary { background: linear-gradient(135deg, #d946ef, #a855f7); color: white; }
                .btn-danger { background: #e11d48; color: white; }
                
                .addr-modal-box {
                    background: var(--modal-bg);
                    border: 1px solid var(--border-color);
                    border-radius: 20px;
                    width: 90%;
                    max-width: 480px;
                    padding: 30px;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
                }
                .addr-field {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid var(--border-color);
                    border-radius: 10px;
                    padding: 12px 14px;
                    margin-bottom: 10px;
                }
                .addr-field-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 600; margin-bottom: 3px; }
                .addr-field-value { font-size: 15px; font-weight: 600; color: var(--text-color); word-break: break-word; }
                .addr-copy-btn {
                    background: transparent;
                    border: 1px solid var(--border-color);
                    color: var(--text-muted);
                    padding: 6px 10px;
                    border-radius: 8px;
                    font-size: 12px;
                    cursor: pointer;
                }
                .addr-copy-btn.copied { background: rgba(16, 185, 129, 0.15); border-color: #10b981; color: #10b981; }

                .email-get-grid-2col {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                }
                
                .toast {
                    position: fixed;
                    bottom: 40px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: var(--toast-bg);
                    color: white;
                    padding: 12px 24px;
                    border-radius: 12px;
                    font-size: 14px;
                    font-weight: 600;
                    z-index: 1000;
                    box-shadow: 0 10px 30px rgba(99, 102, 241, 0.4);
                }

                .status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    display: inline-block;
                    background-color: #64748b;
                }
                .status-dot.saving { background-color: #eab308; }
                .status-dot.saved { background-color: #10b981; }
                .status-dot.offline { background-color: #ef4444; }
                .status-dot.typing { background-color: #6366f1; }

                .right-section {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .actions-section {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .modal-tabs {
                    display: flex;
                    border-bottom: 1px solid var(--border-color);
                    margin-bottom: 15px;
                    gap: 16px;
                }
                .modal-tab {
                    background: transparent;
                    border: none;
                    color: var(--text-muted);
                    font-size: 16px;
                    font-weight: 700;
                    padding-bottom: 8px;
                    cursor: pointer;
                    position: relative;
                }
                .modal-tab.active {
                    color: var(--primary-glow);
                }
                .modal-tab.active::after {
                    content: '';
                    position: absolute;
                    bottom: -1px;
                    left: 0;
                    width: 100%;
                    height: 2px;
                    background: var(--primary-glow);
                }

                /* ====== TABLET / SMALL DESKTOP ====== */
                @media (max-width: 768px) {
                    .toolbar {
                        flex-wrap: wrap;
                        padding: 10px 12px;
                        gap: 8px;
                    }
                    .logo-section {
                        order: 1;
                        flex: 1 1 auto;
                        min-width: 0;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    .logo-title {
                        font-size: 17px;
                    }
                    .note-badge {
                        font-size: 11px;
                        padding: 3px 7px;
                        max-width: 80px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }
                    .status-section {
                        order: 2;
                        flex: 0 0 auto;
                        font-size: 11px;
                        gap: 4px;
                    }
                    .right-section {
                        display: contents;
                    }
                    .btn-login {
                        order: 3;
                        flex-shrink: 0;
                        padding: 7px 12px;
                        font-size: 12px;
                        border-radius: 8px;
                        white-space: nowrap;
                    }
                    .actions-section {
                        order: 4;
                        width: 100%;
                        display: flex;
                        overflow-x: auto;
                        gap: 12px;
                        padding: 8px 4px;
                        -webkit-overflow-scrolling: touch;
                        scrollbar-width: none;
                    }
                    .actions-section::-webkit-scrollbar {
                        display: none;
                    }
                    .btn-tool {
                        flex-shrink: 0;
                        padding: 10px 16px;
                        font-size: 13px;
                        border-radius: 10px;
                        gap: 6px;
                        white-space: nowrap;
                        min-height: 44px;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .editor-container {
                        padding: 8px;
                    }
                    .editor-card {
                        border-radius: 12px;
                    }
                    .editor-textarea {
                        padding: 14px;
                        font-size: 16px;
                    }
                    .metrics-bar {
                        padding: 8px 12px;
                        font-size: 11px;
                        flex-wrap: wrap;
                        gap: 4px;
                        justify-content: center;
                        text-align: center;
                    }
                    .metrics-left {
                        gap: 10px;
                        justify-content: center;
                        width: 100%;
                    }
                    .modal-box {
                        padding: 20px;
                        width: 95%;
                        max-height: 90vh;
                        overflow-y: auto;
                    }
                    .orb-1 {
                        width: 250px;
                        height: 250px;
                    }
                    .orb-2 {
                        width: 200px;
                        height: 200px;
                    }
                }

                /* ====== PHONE SMALL ====== */
                @media (max-width: 480px) {
                    .toolbar {
                        padding: 8px 10px;
                        gap: 6px;
                    }
                    .logo-title {
                        font-size: 15px;
                    }
                    .note-badge {
                        font-size: 10px;
                        padding: 2px 6px;
                        max-width: 60px;
                    }
                    .status-text {
                        display: none;
                    }
                    .status-section {
                        gap: 0;
                    }
                    .btn-login {
                        padding: 8px 14px;
                        font-size: 12px;
                        min-height: 40px;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .btn-tool {
                        padding: 10px 14px;
                        font-size: 13px;
                        min-height: 44px;
                    }
                    .editor-container {
                        padding: 6px;
                    }
                    .editor-textarea {
                        padding: 12px;
                        font-size: 16px;
                    }
                    .metrics-bar {
                        padding: 6px 10px;
                        font-size: 10px;
                    }
                    .toast {
                        bottom: 20px;
                        font-size: 13px;
                        padding: 10px 18px;
                        max-width: 90vw;
                    }
                }

                /* ====== VERY SMALL PHONE (320px) ====== */
                @media (max-width: 360px) {
                    .logo-title {
                        font-size: 14px;
                    }
                    .note-badge {
                        display: none;
                    }
                    .btn-login {
                        padding: 5px 8px;
                        font-size: 11px;
                        gap: 2px;
                    }
                    .btn-tool {
                        padding: 5px 7px;
                        font-size: 10px;
                    }
                }

                /* Email retrieval modal responsive overrides */
                @media (max-width: 576px) {
                    #emailGetModal .modal-box {
                        padding: 14px 16px;
                        max-width: 95%;
                        margin: 10px;
                    }
                    .email-get-grid-2col {
                        gap: 8px;
                    }
                    #emailGetModal .form-group {
                        margin-bottom: 6px !important;
                    }
                    #emailGetModal .form-label {
                        font-size: 11px;
                        margin-bottom: 2px;
                    }
                    #emailGetModal .form-input {
                        padding: 6px 8px;
                        font-size: 13px;
                        height: 34px;
                    }
                    #emailGetModal p {
                        font-size: 12px !important;
                        margin-bottom: 8px !important;
                    }
                    #emailGetModal .btn {
                        padding: 6px 10px;
                        font-size: 12px;
                        height: 34px !important;
                    }
                }
                [data-theme="light"] .form-input,
                [data-theme="light"] .addr-field {
                    background: #f8fafc;
                }
            `}</style>

            {!isEmbedded && (
                <>
                    <div className="glowing-orb orb-1"></div>
                    <div className="glowing-orb orb-2"></div>
                </>
            )}

            {/* Header Toolbar */}
            <header className="toolbar" style={isEmbedded ? {
                background: 'transparent',
                borderBottom: 'none',
                padding: '10px 16px 0 16px'
            } : {}}>
                {!isEmbedded && (
                    <div className="logo-section">
                        <a href="/" className="logo-title" style={{
                            fontWeight: '700',
                            fontSize: '20px',
                            letterSpacing: '0.5px',
                            background: 'linear-gradient(135deg, var(--accent-glow), var(--primary-glow))',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            textTransform: 'uppercase',
                            textDecoration: 'none'
                        }}>Ghi chú</a>
                        <span className="note-badge" style={{
                            background: 'rgba(99, 102, 241, 0.15)',
                            color: 'var(--primary-glow)',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '600',
                            border: '1px solid rgba(99, 102, 241, 0.2)'
                        }}>{noteId}</span>
                    </div>
                )}

                <div className="status-section" style={isEmbedded ? { marginLeft: 0 } : {}}>
                    <span className={`status-dot ${statusState}`}></span>
                    <span className="status-text">{statusMessage}</span>
                </div>

                <div className="right-section" style={isEmbedded ? { flex: 1, justifyContent: 'flex-end' } : {}}>
                    <div className="actions-section">
                        <button className="btn-tool" onClick={() => handleSave(content)} style={{ background: 'var(--primary-glow)', color: 'white', borderColor: 'var(--primary-glow)' }}>
                            💾 Lưu
                        </button>
                        <button className="btn-tool" onClick={copyShareLink}>
                            🔗 Chia sẻ
                        </button>
                        <button className={`btn-tool ${hasPasswordState ? 'active' : ''}`} onClick={() => setShowLockModal(true)}>
                            🔒 {hasPasswordState ? 'Đổi khóa' : 'Khóa'}
                        </button>
                        <button className="btn-tool" onClick={toggleFont}>
                            🔤 {font === 'sans' ? 'Sans-serif' : 'Monospace'}
                        </button>
                        <button className="btn-tool" onClick={downloadNote}>
                            📥 Tải xuống
                        </button>
                    </div>

                    {!isEmbedded && (
                        currentUser ? (
                            <button className="btn-tool btn-login" onClick={() => setShowUserInfoModal(true)}>
                                👤 {currentUser.username}
                            </button>
                        ) : (
                            <button className="btn-tool btn-login" onClick={() => setShowQuickLoginModal(true)}>
                                🔑 Đăng nhập
                            </button>
                        )
                    )}
                </div>
            </header>

            {/* Text Editor */}
            <main className={`editor-container ${isEmbedded ? 'embedded' : ''}`}>
                <div className="editor-card">
                    <textarea
                        ref={textareaRef}
                        className={`editor-textarea ${font === 'sans' ? 'font-sans' : 'font-mono'}`}
                        value={content}
                        onChange={handleTextareaChange}
                        placeholder="Bắt đầu ghi chép thông tin của bạn tại đây... Nhấp nút 'Lưu' hoặc nhấn Ctrl+S để lưu..."
                    />
                </div>
            </main>

            <footer style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 24px',
                background: theme === 'light' ? '#f1f5f9' : 'rgba(0, 0, 0, 0.15)',
                borderTop: '1px solid var(--border-color)',
                fontSize: '13px',
                color: 'var(--text-muted)'
            }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <span>Ký tự: <strong>{metrics.chars}</strong></span>
                    <span>Từ: <strong>{metrics.words}</strong></span>
                    <span>Dòng: <strong>{metrics.lines}</strong></span>
                </div>
                <div>
                    <span>Ghi chú tự động xóa sau 6 tháng nếu không bảo mật.</span>
                </div>
            </footer>

            {/* User Info / Logout Modal */}
            {showUserInfoModal && (
                <div className="modal-overlay" onClick={() => setShowUserInfoModal(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0 }}>👤 Thông tin tài khoản</h3>
                            <button onClick={() => setShowUserInfoModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div style={{ padding: '10px 0' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Tên đăng nhập:</span>
                                    <strong style={{ color: 'var(--text-color)', fontSize: '13px' }}>{currentUser?.username}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Email:</span>
                                    <strong style={{ color: 'var(--text-color)', fontSize: '13px' }}>{currentUser?.email || '-'}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Vai trò:</span>
                                    <strong style={{ color: 'var(--text-color)', fontSize: '13px' }}>
                                        {currentUser?.is_superuser ? 'Quản trị viên cấp cao' : currentUser?.is_staff ? 'Quản trị viên' : 'Thành viên'}
                                    </strong>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '15px', borderTop: '1px solid var(--border-color)' }}>
                            <a href="/dashboard/" className="btn btn-primary" style={{ textDecoration: 'none', flex: 1, textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '36px', fontSize: '13px' }}>Vào quản trị</a>
                            <button onClick={onLogout} className="btn btn-danger" style={{ flex: 1, height: '36px', fontSize: '13px' }}>Đăng xuất</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lock/Password Modal */}
            {showLockModal && (
                <div className="modal-overlay" onClick={() => setShowLockModal(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ marginBottom: '10px' }}>🔒 {hasPasswordState ? 'Đổi hoặc xóa mật khẩu' : 'Đặt mật khẩu bảo vệ'}</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.5' }}>
                            Đặt mật khẩu giúp ngăn chặn người khác sửa đổi hoặc xem trộm ghi chú này.
                        </p>
                        <div className="form-group">
                            <label className="form-label">Mật khẩu mới</label>
                            <input
                                type="password"
                                className="form-input"
                                value={lockPasswordInput}
                                onChange={(e) => setLockPasswordInput(e.target.value)}
                                placeholder="Nhập mật khẩu..."
                            />
                        </div>
                        {hasPasswordState && (
                            <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '15px', paddingTop: '15px' }}>
                                <button className="btn btn-danger" style={{ width: '100%' }} onClick={handleRemoveNotePassword}>Gỡ bỏ mật khẩu</button>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                            <button className="btn btn-secondary" onClick={() => setShowLockModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleSaveNotePassword}>Lưu cấu hình</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Login & Register Modal */}
            {showQuickLoginModal && (
                <div className="modal-overlay" onClick={() => setShowQuickLoginModal(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                            <div className="modal-tabs" style={{ flex: 1, marginRight: '15px' }}>
                                <button className={`modal-tab ${authTab === 'login' ? 'active' : ''}`} onClick={() => setAuthTab('login')}>Đăng nhập</button>
                                <button className={`modal-tab ${authTab === 'register' ? 'active' : ''}`} onClick={() => setAuthTab('register')}>Đăng ký</button>
                            </div>
                            <button onClick={() => setShowQuickLoginModal(false)} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer' }}>✕</button>
                        </div>

                        {authTab === 'login' ? (
                            <div>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label className="form-label">Tên đăng nhập</label>
                                        <input type="text" className="form-input" placeholder="Nhập tên đăng nhập..." value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} />
                                    </div>
                                    <div className="form-group" style={{ marginTop: '15px' }}>
                                        <label className="form-label">Mật khẩu</label>
                                        <input type="password" className="form-input" placeholder="Nhập mật khẩu..." value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleQuickLogin(); }} />
                                    </div>
                                    {loginError && (
                                        <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '12px', textAlign: 'center', fontWeight: '600' }}>{loginError}</div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '15px' }}>
                                    <button className="btn btn-secondary" onClick={() => setShowQuickLoginModal(false)}>Hủy</button>
                                    <button className="btn btn-primary" onClick={handleQuickLogin} disabled={btnSubmitLoginDisabled}>{btnSubmitLoginDisabled ? 'Đang xử lý...' : 'Đăng nhập'}</button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label className="form-label">Tên đăng nhập</label>
                                        <input type="text" className="form-input" placeholder="Từ 6-30 ký tự, viết liền..." value={registerUsername} onChange={(e) => setRegisterUsername(e.target.value)} />
                                    </div>
                                    <div className="form-group" style={{ marginTop: '12px' }}>
                                        <label className="form-label">Địa chỉ Email</label>
                                        <input type="email" className="form-input" placeholder="Ví dụ: mail@example.com..." value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} />
                                    </div>
                                    <div className="form-group" style={{ marginTop: '12px' }}>
                                        <label className="form-label">Mật khẩu</label>
                                        <input type="password" className="form-input" placeholder="Nhập mật khẩu..." value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} />
                                    </div>
                                    <div className="form-group" style={{ marginTop: '12px' }}>
                                        <label className="form-label">Xác nhận mật khẩu</label>
                                        <input type="password" className="form-input" placeholder="Nhập lại mật khẩu..." value={registerConfirmPassword} onChange={(e) => setRegisterConfirmPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleQuickRegister(); }} />
                                    </div>
                                    {registerError && (
                                        <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '12px', textAlign: 'center', fontWeight: '600' }}>{registerError}</div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '15px' }}>
                                    <button className="btn btn-secondary" onClick={() => setShowQuickLoginModal(false)}>Hủy</button>
                                    <button className="btn btn-primary" onClick={handleQuickRegister} disabled={btnSubmitRegisterDisabled}>{btnSubmitRegisterDisabled ? 'Đang xử lý...' : 'Đăng ký'}</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Toast Box */}
            {showToast && <div className="toast">{toastMessage}</div>}
        </div>
    );
}
