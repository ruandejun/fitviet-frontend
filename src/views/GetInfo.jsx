import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { US_ADDRESSES, US_FIRST_NAMES, US_LAST_NAMES, US_STATE_NAMES, randItem, generateUSPhone } from './usAddressData';

export default function GetInfo({ currentUser, triggerToast, isMicrosoftEmail, readMailboxClientSide }) {
    useEffect(() => {
        console.log("=== GetInfo mounted ===");
        return () => console.log("=== GetInfo unmounted ===");
    }, []);

    // Email Getter states
    const [infoSourceType, setInfoSourceType] = useState(() => sessionStorage.getItem('getinfo_infoSourceType') || 'uncreated'); // uncreated, created, address
    const [emailSelectType, setEmailSelectType] = useState(() => sessionStorage.getItem('getinfo_emailSelectType') || 'Apple');
    const [infoSearchText, setInfoSearchText] = useState(() => sessionStorage.getItem('getinfo_infoSearchText') || '');
    const [emailGetLoader, setEmailGetLoader] = useState(false);

    // Uncreated Account states
    const [emailGetId, setEmailGetId] = useState(() => sessionStorage.getItem('getinfo_emailGetId') || '');
    const [emailGetAddress, setEmailGetAddress] = useState(() => sessionStorage.getItem('getinfo_emailGetAddress') || '');
    const [emailGetPassword, setEmailGetPassword] = useState(() => sessionStorage.getItem('getinfo_emailGetPassword') || '');
    const [emailGetAccPassword, setEmailGetAccPassword] = useState(() => sessionStorage.getItem('getinfo_emailGetAccPassword') || '');
    const [emailGetAcc2Fa, setEmailGetAcc2Fa] = useState(() => sessionStorage.getItem('getinfo_emailGetAcc2Fa') || '');
    const [emailGetAcc2FaOtpDisplay, setEmailGetAcc2FaOtpDisplay] = useState(() => sessionStorage.getItem('getinfo_emailGetAcc2FaOtpDisplay') || '');
    const [emailGetOtpDisplay, setEmailGetOtpDisplay] = useState(() => sessionStorage.getItem('getinfo_emailGetOtpDisplay') || '');
    const [emailGetMailContent, setEmailGetMailContent] = useState('Không có dữ liệu thư.');
    const [emailGetEmailsList, setEmailGetEmailsList] = useState(() => {
        const saved = sessionStorage.getItem('getinfo_emailGetEmailsList');
        return saved ? JSON.parse(saved) : null;
    });

    // Created Account states
    const [createdAccId, setCreatedAccId] = useState(() => sessionStorage.getItem('getinfo_createdAccId') || '');
    const [createdAccUsername, setCreatedAccUsername] = useState(() => sessionStorage.getItem('getinfo_createdAccUsername') || '');
    const [createdAccEmail, setCreatedAccEmail] = useState(() => sessionStorage.getItem('getinfo_createdAccEmail') || '');
    const [createdAccPassword, setCreatedAccPassword] = useState(() => sessionStorage.getItem('getinfo_createdAccPassword') || '');
    const [createdAcc2Fa, setCreatedAcc2Fa] = useState(() => sessionStorage.getItem('getinfo_createdAcc2Fa') || '');
    const [createdAccOtpDisplayBadge, setCreatedAccOtpDisplayBadge] = useState(() => sessionStorage.getItem('getinfo_createdAccOtpDisplayBadge') || '');
    const [createdAccOtpDisplay, setCreatedAccOtpDisplay] = useState(() => sessionStorage.getItem('getinfo_createdAccOtpDisplay') || '');
    const [createdAccMailContent, setCreatedAccMailContent] = useState('Không có dữ liệu thư.');
    const [createdAccMailLoader, setCreatedAccMailLoader] = useState(false);
    const [createdAccEmailId, setCreatedAccEmailId] = useState(() => sessionStorage.getItem('getinfo_createdAccEmailId') || '');
    const [showCreatedAccInbox, setShowCreatedAccInbox] = useState(() => {
        const saved = sessionStorage.getItem('getinfo_showCreatedAccInbox');
        return saved ? JSON.parse(saved) : false;
    });
    const [createdAccEmailsList, setCreatedAccEmailsList] = useState(() => {
        const saved = sessionStorage.getItem('getinfo_createdAccEmailsList');
        return saved ? JSON.parse(saved) : null;
    });

    // USA Address states
    const [tabAddressData, setTabAddressData] = useState(() => {
        const saved = sessionStorage.getItem('getinfo_tabAddressData');
        return saved ? JSON.parse(saved) : { name: '—', address: '—', city: '—', state: '—', zip: '—', phone: '—' };
    });
    const [copiedTabField, setCopiedTabField] = useState(null);

    // Status Selector states
    const [modalStatusSelect, setModalStatusSelect] = useState('');
    const [statusSelectDisabled, setStatusSelectDisabled] = useState(false);

    // Auto-save all state changes to sessionStorage
    useEffect(() => {
        sessionStorage.setItem('getinfo_infoSourceType', infoSourceType);
        sessionStorage.setItem('getinfo_emailSelectType', emailSelectType);
        sessionStorage.setItem('getinfo_infoSearchText', infoSearchText);
        sessionStorage.setItem('getinfo_emailGetId', emailGetId);
        sessionStorage.setItem('getinfo_emailGetAddress', emailGetAddress);
        sessionStorage.setItem('getinfo_emailGetPassword', emailGetPassword);
        sessionStorage.setItem('getinfo_emailGetAccPassword', emailGetAccPassword);
        sessionStorage.setItem('getinfo_emailGetAcc2Fa', emailGetAcc2Fa);
        sessionStorage.setItem('getinfo_emailGetAcc2FaOtpDisplay', emailGetAcc2FaOtpDisplay);
        sessionStorage.setItem('getinfo_emailGetOtpDisplay', emailGetOtpDisplay);
        sessionStorage.setItem('getinfo_emailGetEmailsList', emailGetEmailsList ? JSON.stringify(emailGetEmailsList) : '');

        sessionStorage.setItem('getinfo_createdAccId', createdAccId);
        sessionStorage.setItem('getinfo_createdAccUsername', createdAccUsername);
        sessionStorage.setItem('getinfo_createdAccEmail', createdAccEmail);
        sessionStorage.setItem('getinfo_createdAccPassword', createdAccPassword);
        sessionStorage.setItem('getinfo_createdAcc2Fa', createdAcc2Fa);
        sessionStorage.setItem('getinfo_createdAccOtpDisplayBadge', createdAccOtpDisplayBadge);
        sessionStorage.setItem('getinfo_createdAccOtpDisplay', createdAccOtpDisplay);
        sessionStorage.setItem('getinfo_createdAccEmailId', createdAccEmailId);
        sessionStorage.setItem('getinfo_showCreatedAccInbox', JSON.stringify(showCreatedAccInbox));
        sessionStorage.setItem('getinfo_createdAccEmailsList', createdAccEmailsList ? JSON.stringify(createdAccEmailsList) : '');
        sessionStorage.setItem('getinfo_tabAddressData', JSON.stringify(tabAddressData));
    }, [
        infoSourceType, emailSelectType, infoSearchText, emailGetId, emailGetAddress,
        emailGetPassword, emailGetAccPassword, emailGetAcc2Fa, emailGetAcc2FaOtpDisplay,
        emailGetOtpDisplay, emailGetEmailsList, createdAccId, createdAccUsername,
        createdAccEmail, createdAccPassword, createdAcc2Fa, createdAccOtpDisplayBadge,
        createdAccOtpDisplay, createdAccEmailId, showCreatedAccInbox, createdAccEmailsList,
        tabAddressData
    ]);

    // Auto-restore mailbox UIs when list states change
    useEffect(() => {
        if (emailGetEmailsList) {
            renderMailboxSection(emailGetEmailsList, 'unused');
        } else {
            setEmailGetMailContent('Không có dữ liệu thư.');
            setEmailGetOtpDisplay('');
        }
    }, [emailGetEmailsList]);

    useEffect(() => {
        if (createdAccEmailsList) {
            renderMailboxSection(createdAccEmailsList, 'created');
        } else {
            setCreatedAccMailContent('Không có dữ liệu thư.');
            setCreatedAccOtpDisplay('');
        }
    }, [createdAccEmailsList]);

    const handleInfoSourceChange = (type) => {
        setInfoSourceType(type);
        setModalStatusSelect('');
        setInfoSearchText('');
        // Clear results
        setEmailGetId('');
        setEmailGetAddress('');
        setCreatedAccId('');
        setCreatedAccUsername('');
        setEmailGetEmailsList(null);
        setCreatedAccEmailsList(null);
        if (type === 'address' && tabAddressData.name === '—') {
            handleGenerateTabAddress();
        }
    };

    const handleGetInfo = async () => {
        if (infoSourceType === 'uncreated') {
            await fetchUnusedEmail();
        } else {
            await fetchActiveCreatedAccount();
        }
    };

    // 1. Uncreated: fetch unused email
    const fetchUnusedEmail = async () => {
        setEmailGetLoader(true);
        setModalStatusSelect('');
        try {
            const resp = await apiRequest(`/dashboard/api/emails/get-unused-email/?type=${emailSelectType}&search=${encodeURIComponent(infoSearchText)}`);
            if (resp.status === 401 || resp.status === 403) {
                triggerToast('Vui lòng đăng nhập Dashboard trước!');
                return;
            }
            const data = await resp.json();
            if (resp.ok && data.success) {
                const emailData = data.email_data;
                setEmailGetId(emailData.id);
                setEmailGetAddress(emailData.email);
                setEmailGetPassword(emailData.password);
                setEmailGetAccPassword('');
                setEmailGetAcc2Fa('');
                setEmailGetAcc2FaOtpDisplay('');
                setEmailGetOtpDisplay('');
                
                // Clear created account states
                setCreatedAccId('');

                if (isMicrosoftEmail(emailData.email)) {
                    setEmailGetMailContent('Đang kết nối Outlook...');
                    setTimeout(() => reloadEmailGetMailbox(emailData.id), 100);
                } else {
                    setEmailGetEmailsList(data.emails);
                }
            } else {
                triggerToast(data.message || 'Không tìm thấy email khả dụng.');
            }
        } catch (err) {
            triggerToast('Lỗi kết nối máy chủ.');
        } finally {
            setEmailGetLoader(false);
        }
    };

    const reloadEmailGetMailbox = async (id = emailGetId) => {
        if (!id) return;
        setEmailGetLoader(true);
        try {
            const data = await readMailboxClientSide(id);
            if (data.success) {
                setEmailGetEmailsList(data.emails);
                triggerToast('Đã tải lại hộp thư thành công!');
            } else {
                triggerToast(data.message || 'Lỗi khi đọc hộp thư.');
            }
        } catch (err) {
            triggerToast(err.message || 'Lỗi kết nối hộp thư.');
        } finally {
            setEmailGetLoader(false);
        }
    };

    // 2. Created: fetch active created account
    const fetchActiveCreatedAccount = async () => {
        setEmailGetLoader(true);
        setModalStatusSelect('');
        try {
            const resp = await apiRequest(`/dashboard/api/accounts/get-active-account/?type=${emailSelectType}&search=${encodeURIComponent(infoSearchText)}`);
            if (resp.status === 401 || resp.status === 403) {
                triggerToast('Vui lòng đăng nhập Dashboard trước!');
                return;
            }
            const data = await resp.json();
            if (resp.ok && data.success) {
                const accData = data.account_data;
                setCreatedAccId(accData.id);

                // Clear uncreated states
                setEmailGetId('');

                let emailVal = '';
                let usernameVal = '';
                const candidates = [accData.email, accData.username].filter(Boolean);
                candidates.forEach(c => {
                    if (c.includes('@')) emailVal = c;
                    else usernameVal = c;
                });

                setCreatedAccUsername(usernameVal);
                setCreatedAccEmail(emailVal);
                setCreatedAccPassword(accData.password || '');
                setCreatedAcc2Fa(accData.two_factor_auth || '');
                setCreatedAccOtpDisplayBadge('');

                if (accData.email_id) {
                    setCreatedAccEmailId(accData.email_id);
                    setShowCreatedAccInbox(true);
                    setCreatedAccMailContent('Đang tải thư...');
                    setTimeout(() => reloadCreatedAccMailbox(accData.email_id), 100);
                } else {
                    setCreatedAccEmailId('');
                    setShowCreatedAccInbox(false);
                    setCreatedAccMailContent('Không có email_id gắn với tài khoản.');
                }
            } else {
                triggerToast(data.message || 'Không tìm thấy tài khoản hoạt động nào.');
            }
        } catch (err) {
            triggerToast('Lỗi kết nối máy chủ.');
        } finally {
            setEmailGetLoader(false);
        }
    };

    const reloadCreatedAccMailbox = async (id = createdAccEmailId) => {
        if (!id) return;
        setCreatedAccMailLoader(true);
        try {
            const data = await readMailboxClientSide(id);
            if (data.success) {
                setCreatedAccEmailsList(data.emails);
            } else {
                triggerToast(data.message || 'Không thể đọc hộp thư.');
            }
        } catch (err) {
            triggerToast(err.message || 'Lỗi kết nối imap.');
        } finally {
            setCreatedAccMailLoader(false);
        }
    };

    const fetchCreatedAccOtp = async () => {
        if (!createdAccId) return;
        setCreatedAccOtpDisplayBadge('');
        try {
            const resp = await apiRequest(`/dashboard/api/accounts/${createdAccId}/get-2fa/`);
            if (resp.status === 401 || resp.status === 403) {
                triggerToast('Vui lòng đăng nhập Dashboard trước!');
                return;
            }
            const data = await resp.json();
            if (resp.ok && data.success && data.token) {
                setCreatedAccOtpDisplayBadge(`Mã OTP: ${data.token} (Nhấp để copy)`);
                navigator.clipboard.writeText(data.token).then(() => {
                    triggerToast(`✅ OTP: ${data.token}`);
                });
            } else {
                triggerToast(data.message || 'Không thể lấy mã OTP.');
            }
        } catch (err) {
            triggerToast('Lỗi kết nối OTP.');
        }
    };

    const handleGetOtpForUncreatedAcc = async () => {
        if (!emailGetAcc2Fa.trim()) {
            triggerToast('Vui lòng nhập mã bảo mật 2FA trước!');
            return;
        }
        setEmailGetAcc2FaOtpDisplay('Đang tạo...');
        try {
            const resp = await apiRequest('/dashboard/api/accounts/get-2fa-otp/', {
                method: 'POST',
                body: JSON.stringify({ secret: emailGetAcc2Fa.trim() })
            });
            const data = await resp.json();
            if (resp.ok && data.success && data.token) {
                setEmailGetAcc2FaOtpDisplay(`Mã OTP: ${data.token}`);
                navigator.clipboard.writeText(data.token).then(() => {
                    triggerToast(`✅ OTP: ${data.token}`);
                });
            } else {
                setEmailGetAcc2FaOtpDisplay('Lỗi tạo OTP');
                triggerToast(data.message || 'Lỗi lấy OTP.');
            }
        } catch (err) {
            setEmailGetAcc2FaOtpDisplay('Lỗi kết nối');
            triggerToast('Lỗi kết nối OTP.');
        }
    };

    const handleSaveCreatedAccount = async () => {
        if (!emailGetId || !emailGetAddress) {
            triggerToast('Vui lòng lấy email trước!');
            return;
        }
        if (!emailGetAccPassword.trim()) {
            triggerToast('Vui lòng nhập mật khẩu tạo tài khoản!');
            return;
        }
        setEmailGetLoader(true);
        try {
            const resp = await apiRequest('/dashboard/api/accounts/add-manual/', {
                method: 'POST',
                body: JSON.stringify({
                    email: emailGetAddress,
                    password: emailGetAccPassword.trim(),
                    type: emailSelectType,
                    two_factor_auth: emailGetAcc2Fa.trim()
                })
            });
            const data = await resp.json();
            if (resp.ok && data.success) {
                triggerToast('💾 Đã lưu tài khoản thành công!');
                if (data.id) {
                    setCreatedAccId(data.id);
                }
            } else {
                triggerToast(data.message || 'Lỗi khi lưu tài khoản.');
            }
        } catch (err) {
            triggerToast('Lỗi kết nối.');
        } finally {
            setEmailGetLoader(false);
        }
    };

    // 3. USA Address generation logic
    const handleGenerateTabAddress = () => {
        const addr = randItem(US_ADDRESSES);
        const fullName = `${randItem(US_FIRST_NAMES)} ${randItem(US_LAST_NAMES)}`;
        const phone = generateUSPhone();
        setTabAddressData({
            name: fullName,
            address: addr.address,
            city: addr.city,
            state: US_STATE_NAMES[addr.state] || addr.state,
            zip: addr.zip,
            phone: phone
        });
        setCopiedTabField(null);
        triggerToast('🇺🇸 Đã tạo địa chỉ mới!');
    };

    const handleCopyTabAddressField = (field, text) => {
        if (text === '—') return;
        navigator.clipboard.writeText(text).then(() => {
            setCopiedTabField(field);
            triggerToast(`Đã copy: ${text}`);
            setTimeout(() => setCopiedTabField(null), 2000);
        });
    };

    const handleCopyAllTabAddress = () => {
        if (tabAddressData.name === '—') return;
        const fullText = `${tabAddressData.name}\n${tabAddressData.address}\n${tabAddressData.city}, ${tabAddressData.state} ${tabAddressData.zip}\nPhone: ${tabAddressData.phone}`;
        navigator.clipboard.writeText(fullText).then(() => {
            triggerToast('📑 Đã copy toàn bộ địa chỉ!');
        });
    };

    // Save final status helper
    const handleSaveStatus = async () => {
        const targetId = createdAccId || emailGetId;
        const targetType = createdAccId ? 'created' : 'email';

        if (!targetId) {
            triggerToast('⚠️ Chưa có tài khoản hoặc email nào được tải để đổi trạng thái.');
            return;
        }
        if (!modalStatusSelect) {
            triggerToast('⚠️ Vui lòng chọn trạng thái!');
            return;
        }

        setStatusSelectDisabled(true);
        try {
            const url = targetType === 'created' ? `/dashboard/api/accounts/${targetId}/` : `/dashboard/api/emails/${targetId}/`;
            const resp = await apiRequest(url, {
                method: 'PATCH',
                body: JSON.stringify({ status: parseInt(modalStatusSelect) })
            });
            if (resp.ok) {
                triggerToast('✅ Đã lưu trạng thái thành công!');
            } else {
                triggerToast('❌ Lỗi cập nhật trạng thái lên hệ thống!');
            }
        } catch (err) {
            triggerToast('❌ Lỗi kết nối máy chủ.');
        } finally {
            setStatusSelectDisabled(false);
        }
    };

    const renderMailboxSection = (emails, target) => {
        const isCreated = target === 'created';
        const setMailContent = isCreated ? setCreatedAccMailContent : setEmailGetMailContent;
        const setOtpDisplay = isCreated ? setCreatedAccOtpDisplay : setEmailGetOtpDisplay;

        if (!emails || emails.length === 0) {
            setMailContent('Hộp thư trống hoặc không thể tải thư mới nhất.');
            setOtpDisplay('');
            return;
        }

        const latest = emails[0];
        const dateStr = latest.date || '';
        const fromStr = latest.from || '';
        const subjectStr = latest.subject || '';
        const snippetStr = latest.snippet || '';

        let code = '';
        const combined = `${subjectStr} ${snippetStr}`;
        const matches = combined.match(/\b(\d{4,8})\b/);
        if (matches) {
            code = matches[0];
        }

        if (code) {
            setOtpDisplay(code);
        } else {
            setOtpDisplay('');
        }

        setMailContent(
            <div>
                {code && (
                    <div style={{
                        marginBottom: '10px',
                        padding: '10px',
                        background: 'var(--otp-bg)',
                        border: '1px solid var(--otp-border)',
                        color: 'var(--otp-text)',
                        borderRadius: '8px',
                        textAlign: 'center',
                        fontSize: '15px',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }} onClick={() => {
                        navigator.clipboard.writeText(code).then(() => triggerToast(`Đã copy OTP: ${code}`));
                    }}>
                        Mã xác nhận (OTP): <span style={{ fontSize: '18px', textDecoration: 'underline' }}>{code}</span> (Click copy)
                    </div>
                )}
                <div style={{ fontWeight: '600', color: 'var(--text-color)', marginBottom: '4px' }}>Từ: {fromStr}</div>
                <div style={{ fontWeight: '500', color: 'var(--text-muted)', marginBottom: '4px', fontSize: '11px' }}>Thời gian: {dateStr}</div>
                <div style={{ fontWeight: '600', color: 'var(--text-color)', marginBottom: '6px' }}>Tiêu đề: {subjectStr}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', whiteSpace: 'pre-wrap' }}>{snippetStr}</div>
            </div>
        );
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', width: '100%' }}>
            {/* Left Card: Input & Tab Controls */}
            <div className="monitor-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: 'fit-content' }}>
                <div className="monitor-title">⚙️ Cấu hình lấy thông tin</div>
                
                {/* Source Selection Tabs */}
                <div>
                    <label className="form-label" style={{ fontWeight: '600', marginBottom: '8px', display: 'block' }}>Nguồn dữ liệu</label>
                    <div className="email-get-tabs" style={{ display: 'flex', gap: '10px' }}>
                        <label style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px',
                            background: infoSourceType === 'uncreated' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${infoSourceType === 'uncreated' ? 'var(--primary)' : 'var(--border-color)'}`,
                            borderRadius: '10px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-color)', fontWeight: '600'
                        }}>
                            <input type="radio" name="sourceType" checked={infoSourceType === 'uncreated'} onChange={() => handleInfoSourceChange('uncreated')} />
                            Chưa tạo (Lấy Email)
                        </label>
                        <label style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px',
                            background: infoSourceType === 'created' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${infoSourceType === 'created' ? 'var(--primary)' : 'var(--border-color)'}`,
                            borderRadius: '10px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-color)', fontWeight: '600'
                        }}>
                            <input type="radio" name="sourceType" checked={infoSourceType === 'created'} onChange={() => handleInfoSourceChange('created')} />
                            Đã tạo (Lấy Acc)
                        </label>
                        <label style={{
                            flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px',
                            background: infoSourceType === 'address' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${infoSourceType === 'address' ? 'var(--primary)' : 'var(--border-color)'}`,
                            borderRadius: '10px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-color)', fontWeight: '600'
                        }}>
                            <input type="radio" name="sourceType" checked={infoSourceType === 'address'} onChange={() => handleInfoSourceChange('address')} />
                            🇺🇸 Địa chỉ
                        </label>
                    </div>
                </div>

                {/* Form parameters */}
                {infoSourceType !== 'address' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div>
                            <label className="form-label" style={{ fontWeight: '600' }}>Loại tài khoản</label>
                            <select
                                className="form-input"
                                style={{ background: 'var(--input-bg)', color: 'var(--text-color)', height: '38px', padding: '0 10px', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                value={emailSelectType}
                                onChange={(e) => setEmailSelectType(e.target.value)}
                            >
                                <option value="Apple">Apple</option>
                                <option value="Tiktok">Tiktok</option>
                            </select>
                        </div>
                        <div>
                            <label className="form-label" style={{ fontWeight: '600' }}>{infoSourceType === 'uncreated' ? 'Email muốn lấy (Tùy chọn)' : 'Email / Username muốn lấy (Tùy chọn)'}</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder={infoSourceType === 'uncreated' ? 'Nhập email cần lấy...' : 'Nhập username hoặc email...'}
                                style={{ background: 'var(--input-bg)', color: 'var(--text-color)', height: '38px', padding: '0 10px', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px' }}
                                value={infoSearchText}
                                onChange={(e) => setInfoSearchText(e.target.value)}
                            />
                        </div>
                        <button className="btn btn-primary" onClick={handleGetInfo} disabled={emailGetLoader} style={{ height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '14px', fontWeight: 'bold' }}>
                            {emailGetLoader ? 'Đang tải...' : (infoSourceType === 'uncreated' ? '✉️ Lấy Email ngẫu nhiên/cụ thể' : '🔑 Lấy Info ngẫu nhiên/cụ thể')}
                        </button>
                    </div>
                )}

                {/* Address specific quick actions */}
                {infoSourceType === 'address' && (
                    <div className="email-get-buttons" style={{ display: 'flex', gap: '10px' }}>
                        <button className="btn btn-primary" style={{ flex: 1, height: '40px', fontWeight: 'bold' }} onClick={handleGenerateTabAddress}>🎲 Tạo địa chỉ mới</button>
                        <button className="btn btn-secondary" style={{ flex: 1, height: '40px', fontWeight: 'bold' }} onClick={handleCopyAllTabAddress}>📑 Copy toàn bộ</button>
                    </div>
                )}

                {/* Final status selector */}
                {(createdAccId || emailGetId) && (
                    <div style={{ marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
                        <label className="form-label" style={{ fontWeight: '600', marginBottom: '8px', display: 'block' }}>Chọn trạng thái cuối cùng (Bắt buộc lưu lên hệ thống)</label>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <select
                                className="form-input"
                                style={{ background: 'var(--input-bg)', color: 'var(--text-color)', height: '38px', padding: '0 10px', flex: 1, borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                value={modalStatusSelect}
                                disabled={statusSelectDisabled}
                                onChange={(e) => setModalStatusSelect(e.target.value)}
                            >
                                <option value="">-- Vui lòng chọn trạng thái --</option>
                                <option value="0">Hoạt động (Active)</option>
                                <option value="1">Chưa kích hoạt (Email Not Activated)</option>
                                <option value="2">Bị khóa (Banned)</option>
                                <option value="3">Tạm thời (Temporary)</option>
                                <option value="4">Sub OK</option>
                                <option value="5">Sub Lỗi</option>
                                <option value="6">Đang sử dụng (In Use)</option>
                            </select>
                            <button className="btn btn-secondary" disabled={statusSelectDisabled} onClick={handleSaveStatus} style={{ height: '38px' }}>
                                {statusSelectDisabled ? 'Đang lưu...' : '💾 Lưu'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Card: Dynamic Results Display */}
            <div className="monitor-panel" style={{ minHeight: '300px' }}>
                <div className="monitor-title">📊 Kết quả hiển thị</div>

                {/* Uncreated Results details */}
                {infoSourceType === 'uncreated' && (
                    emailGetAddress ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div className="email-get-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontWeight: '600' }}>Địa chỉ Email</label>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        <input type="text" className="form-input" readOnly value={emailGetAddress} style={{ fontWeight: '600', height: '36px', fontSize: '13px', flex: 1, minWidth: 0 }} />
                                        <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(emailGetAddress).then(() => triggerToast('Đã copy Email')); }} style={{ padding: '0 10px', height: '36px' }}>📋</button>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontWeight: '600' }}>Mật khẩu Email</label>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        <input type="text" className="form-input" readOnly value={emailGetPassword} style={{ fontFamily: 'monospace', height: '36px', fontSize: '13px', flex: 1, minWidth: 0 }} />
                                        <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(emailGetPassword).then(() => triggerToast('Đã copy Mật khẩu')); }} style={{ padding: '0 10px', height: '36px' }}>📋</button>
                                    </div>
                                </div>
                            </div>

                            {/* Create / register new account fields */}
                            <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px dashed var(--border-color)', borderRadius: '12px', padding: '15px', marginTop: '5px' }}>
                                <div style={{ fontWeight: '700', fontSize: '13px', color: 'var(--primary)', marginBottom: '10px' }}>ĐĂNG KÝ TÀI KHOẢN MỚI</div>
                                <div className="email-get-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '12px' }}>
                                    <div className="form-group">
                                        <label className="form-label" style={{ fontWeight: '600' }}>Mật khẩu tạo Acc</label>
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            <input type="text" className="form-input" placeholder="Mật khẩu tạo..." value={emailGetAccPassword} onChange={(e) => setEmailGetAccPassword(e.target.value)} style={{ height: '36px', fontSize: '13px', flex: 1, minWidth: 0 }} />
                                            <button className="btn btn-secondary" onClick={() => {
                                                const pass = 'Zxcv@123';
                                                setEmailGetAccPassword(pass);
                                                navigator.clipboard.writeText(pass).then(() => triggerToast('Đã tạo và copy mật khẩu: Zxcv@123'));
                                            }} style={{ padding: '0 10px', height: '36px' }}>🔒</button>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label" style={{ fontWeight: '600' }}>Khóa 2FA</label>
                                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                            <input type="text" className="form-input" placeholder="2FA Secret..." value={emailGetAcc2Fa} onChange={(e) => setEmailGetAcc2Fa(e.target.value)} style={{ height: '36px', fontSize: '13px', flex: 1, minWidth: 0 }} />
                                            <button className="btn btn-primary" onClick={handleGetOtpForUncreatedAcc} style={{ padding: '0 10px', height: '36px', fontSize: '12px', whiteSpace: 'nowrap' }}>Lấy OTP</button>
                                        </div>
                                        {emailGetAcc2FaOtpDisplay && (
                                            <div onClick={() => {
                                                const match = emailGetAcc2FaOtpDisplay.match(/Mã OTP:\s*([0-9]{6})/);
                                                if (match) { navigator.clipboard.writeText(match[1]).then(() => triggerToast('Đã copy OTP')); }
                                            }} style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--otp-text)', marginTop: '4px', background: 'var(--otp-bg)', border: '1px solid var(--otp-border)', padding: '4px 8px', borderRadius: '4px', textAlign: 'center', cursor: 'pointer' }}>
                                                {emailGetAcc2FaOtpDisplay}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <button className="btn btn-primary" onClick={handleSaveCreatedAccount} style={{ width: '100%', height: '38px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', fontSize: '13px', fontWeight: 'bold' }}>
                                    💾 Lưu tài khoản đã tạo vào hệ thống
                                </button>
                            </div>

                            {/* Inbox detail display */}
                            <div style={{ marginTop: '10px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                    <label className="form-label" style={{ margin: 0, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        Hộp thư đến {emailGetOtpDisplay && <span style={{ background: 'var(--otp-bg)', border: '1px solid var(--otp-border)', color: 'var(--otp-text)', padding: '2px 8px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }} onClick={() => { navigator.clipboard.writeText(emailGetOtpDisplay).then(() => triggerToast(`Đã copy OTP: ${emailGetOtpDisplay}`)); }}>OTP: {emailGetOtpDisplay}</span>}
                                    </label>
                                    <button className="btn btn-primary" onClick={() => reloadEmailGetMailbox(emailGetId)} disabled={emailGetLoader} style={{ padding: '4px 12px', fontSize: '12px', height: '28px' }}>🔄 Tải lại</button>
                                </div>

                                <div style={{ padding: '12px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '10px', border: '1px solid var(--border-color)', minHeight: '80px', maxHeight: '180px', overflowY: 'auto', fontSize: '12px', lineHeight: '1.5' }}>
                                    {emailGetMailContent}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', height: '220px', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                            Chưa có email nào được tải. Vui lòng bấm nút "Lấy Email".
                        </div>
                    )
                )}

                {infoSourceType === 'created' && (
                    createdAccId ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            <div className="email-get-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontWeight: '600' }}>Username / Tài khoản</label>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        <input type="text" className="form-input" readOnly value={createdAccUsername} style={{ fontWeight: '600', height: '36px', fontSize: '13px', flex: 1, minWidth: 0 }} />
                                        <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(createdAccUsername).then(() => triggerToast('Đã copy Username')); }} style={{ padding: '0 10px', height: '36px' }}>📋</button>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontWeight: '600' }}>Địa chỉ Email</label>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        <input type="text" className="form-input" readOnly value={createdAccEmail} style={{ fontWeight: '600', height: '36px', fontSize: '13px', flex: 1, minWidth: 0 }} />
                                        <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(createdAccEmail).then(() => triggerToast('Đã copy Email')); }} style={{ padding: '0 10px', height: '36px' }}>📋</button>
                                    </div>
                                </div>
                            </div>

                            <div className="email-get-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontWeight: '600' }}>Mật khẩu tài khoản</label>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        <input type="text" className="form-input" readOnly value={createdAccPassword} style={{ fontFamily: 'monospace', height: '36px', fontSize: '13px', flex: 1, minWidth: 0 }} />
                                        <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(createdAccPassword).then(() => triggerToast('Đã copy Mật khẩu')); }} style={{ padding: '0 10px', height: '36px' }}>📋</button>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label" style={{ fontWeight: '600' }}>Mã 2FA Secret Key</label>
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        <input type="text" className="form-input" readOnly value={createdAcc2Fa} style={{ fontFamily: 'monospace', height: '36px', fontSize: '13px', flex: 1, minWidth: 0 }} />
                                        <button className="btn btn-primary" onClick={fetchCreatedAccOtp} style={{ padding: '0 10px', height: '36px' }}>🔑 Lấy OTP</button>
                                    </div>
                                    {createdAccOtpDisplayBadge && (
                                        <div onClick={() => {
                                            const match = createdAccOtpDisplayBadge.match(/Mã OTP:\s*([0-9]{6})/);
                                            if (match) { navigator.clipboard.writeText(match[1]).then(() => triggerToast('Đã copy OTP')); }
                                        }} style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--otp-text)', marginTop: '4px', background: 'var(--otp-bg)', border: '1px solid var(--otp-border)', padding: '4px 8px', borderRadius: '4px', textAlign: 'center', cursor: 'pointer' }}>
                                            {createdAccOtpDisplayBadge}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Inbox detail display */}
                            {showCreatedAccInbox && (
                                <div style={{ marginTop: '10px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <label className="form-label" style={{ margin: 0, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            Hộp thư đến {createdAccOtpDisplay && <span style={{ background: 'var(--otp-bg)', border: '1px solid var(--otp-border)', color: 'var(--otp-text)', padding: '2px 8px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer' }} onClick={() => { navigator.clipboard.writeText(createdAccOtpDisplay).then(() => triggerToast(`Đã copy OTP: ${createdAccOtpDisplay}`)); }}>OTP: {createdAccOtpDisplay}</span>}
                                        </label>
                                        <button className="btn btn-primary" onClick={() => reloadCreatedAccMailbox(createdAccEmailId)} disabled={createdAccMailLoader} style={{ padding: '4px 12px', fontSize: '12px', height: '28px' }}>🔄 Tải lại</button>
                                    </div>

                                    <div style={{ padding: '12px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '10px', border: '1px solid var(--border-color)', minHeight: '80px', maxHeight: '180px', overflowY: 'auto', fontSize: '12px', lineHeight: '1.5' }}>
                                        {createdAccMailContent}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', height: '220px', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                            Chưa có tài khoản nào được tải. Vui lòng bấm nút "Lấy Info".
                        </div>
                    )
                )}

                {/* USA Address generation results */}
                {infoSourceType === 'address' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {Object.entries(tabAddressData).map(([key, val]) => (
                            <div className="addr-field" key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                                <div className="addr-field-info" style={{ flex: 1, minWidth: 0 }}>
                                    <div className="addr-field-label" style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px' }}>
                                        {key === 'name' ? 'Họ và tên (Full Name)' :
                                         key === 'address' ? 'Địa chỉ (Address)' :
                                         key === 'city' ? 'Thành phố (City)' :
                                         key === 'state' ? 'Bang (State)' :
                                         key === 'zip' ? 'Mã bưu chính (Zip Code)' : 'Số điện thoại (Phone)'}
                                    </div>
                                    <div className="addr-field-value" style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-color)' }}>{val}</div>
                                </div>
                                <button
                                    className={`addr-copy-btn ${copiedTabField === key ? 'copied' : ''}`}
                                    onClick={() => handleCopyTabAddressField(key, val)}
                                    style={{ padding: '6px 12px', fontSize: '12px', minWidth: '90px' }}
                                >
                                    {copiedTabField === key ? '✅ Đã copy' : '📋 Copy'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
