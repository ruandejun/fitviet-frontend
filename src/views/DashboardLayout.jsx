import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../api';
import Overview from './Overview';
import Cards from './Cards';
import Users from './Users';
import Profiles from './Profiles';
import Proxies from './Proxies';
import Emails from './Emails';
import Accounts from './Accounts';
import HWIDs from './HWIDs';
import Notifications from './Notifications';

// 2FA Totp helpers
function base32ToBytes(base32) {
    const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    base32 = base32.replace(/\s/g, "").replace(/=/g, "").toUpperCase();
    const len = base32.length;
    const bytes = new Uint8Array(Math.floor((len * 5) / 8));
    
    let val = 0;
    let bits = 0;
    let index = 0;
    
    for (let i = 0; i < len; i++) {
        const idx = base32chars.indexOf(base32[i]);
        if (idx === -1) continue;
        
        val = (val << 5) | idx;
        bits += 5;
        
        if (bits >= 8) {
            bytes[index++] = (val >>> (bits - 8)) & 255;
            bits -= 8;
        }
    }
    return bytes;
}

async function calculateTotp(secret) {
    try {
        const cleanSecret = secret.replace(/\s/g, "").replace(/=/g, "").toUpperCase();
        if (!cleanSecret) return null;
        
        const keyBytes = base32ToBytes(cleanSecret);
        if (keyBytes.length === 0) return null;
        
        const epoch = Math.floor(Date.now() / 1000 / 30);
        
        const counterBytes = new Uint8Array(8);
        let temp = epoch;
        for (let i = 7; i >= 0; i--) {
            counterBytes[i] = temp & 0xff;
            temp = Math.floor(temp / 256);
        }
        
        const cryptoKey = await window.crypto.subtle.importKey(
            "raw",
            keyBytes,
            { name: "HMAC", hash: { name: "SHA-1" } },
            false,
            ["sign"]
        );
        
        const signature = await window.crypto.subtle.sign(
            "HMAC",
            cryptoKey,
            counterBytes
        );
        
        const hmac = new Uint8Array(signature);
        const offset = hmac[hmac.length - 1] & 0xf;
        const code = ((hmac[offset] & 0x7f) << 24) |
                     ((hmac[offset + 1] & 0xff) << 16) |
                     ((hmac[offset + 2] & 0xff) << 8) |
                     (hmac[offset + 3] & 0xff);
        
        const otp = code % 1000000;
        return otp.toString().padStart(6, '0');
    } catch (err) {
        console.error(err);
        return null;
    }
}

import QuickNotes from './QuickNotes';
import { US_ADDRESSES, US_FIRST_NAMES, US_LAST_NAMES, US_AREA_CODES, US_STATE_NAMES, randItem, generateUSPhone } from './usAddressData';

export default function DashboardLayout({ currentUser, onLogout, initialTab, initialNoteId, theme, toggleTheme }) {
    // Helper to get initial URL parameters synchronously
    const getInitialUrlState = () => {
        const params = new URLSearchParams(window.location.search);
        const tab = initialTab || params.get('tab') || 'overview';
        const page = parseInt(params.get('page')) || 1;
        return { tab, page };
    };

    const urlState = getInitialUrlState();
    const [currentTab, setCurrentTab] = useState(urlState.tab);
    const [currentPage, setCurrentPage] = useState(urlState.page);
    const [noteId, setNoteId] = useState(initialNoteId || '7wrqsn');
    const [visitedTabs, setVisitedTabs] = useState(new Set([urlState.tab]));

    const [unreadNotifCount, setUnreadNotifCount] = useState(0);
    const [headerNotifOpen, setHeaderNotifOpen] = useState(false);
    const [headerNotifs, setHeaderNotifs] = useState([]);
    
    // 2FA Modal states
    const [twoFaOpen, setTwoFaOpen] = useState(false);
    const [twoFaSecret, setTwoFaSecret] = useState('');
    const [twoFaCode, setTwoFaCode] = useState('');
    const [twoFaSeconds, setTwoFaSeconds] = useState(30);
    const twoFaIntervalRef = useRef(null);

    // Sidebar mobile visibility
    const [sidebarVisible, setSidebarVisible] = useState(false);

    // Toast state
    const [toastMessage, setToastMessage] = useState('');
    const [showToast, setShowToast] = useState(false);

    const triggerToast = (msg) => {
        setToastMessage(msg);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
    };

    // Address Modal states
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [addressData, setAddressData] = useState({ name: '—', address: '—', city: '—', state: '—', zip: '—', phone: '—' });
    const [copiedField, setCopiedField] = useState(null);

    // Email Getter Modal states
    const [showEmailGetModal, setShowEmailGetModal] = useState(false);
    const [infoSourceType, setInfoSourceType] = useState('uncreated'); // uncreated, created, address
    const [emailSelectType, setEmailSelectType] = useState('Apple');
    const [emailGetId, setEmailGetId] = useState('');
    const [emailGetAddress, setEmailGetAddress] = useState('');
    const [emailGetPassword, setEmailGetPassword] = useState('');
    const [emailGetAccPassword, setEmailGetAccPassword] = useState('');
    const [emailGetAcc2Fa, setEmailGetAcc2Fa] = useState('');
    const [emailGetAcc2FaOtpDisplay, setEmailGetAcc2FaOtpDisplay] = useState('');
    const [emailGetOtpDisplay, setEmailGetOtpDisplay] = useState('');
    const [emailGetMailContent, setEmailGetMailContent] = useState('Không có dữ liệu thư.');
    const [emailGetLoader, setEmailGetLoader] = useState(false);

    // Email Getter -> Created Acc Section states
    const [createdAccId, setCreatedAccId] = useState('');
    const [createdAccUsername, setCreatedAccUsername] = useState('');
    const [createdAccEmail, setCreatedAccEmail] = useState('');
    const [createdAccPassword, setCreatedAccPassword] = useState('');
    const [createdAcc2Fa, setCreatedAcc2Fa] = useState('');
    const [createdAccOtpDisplayBadge, setCreatedAccOtpDisplayBadge] = useState('');
    const [createdAccOtpDisplay, setCreatedAccOtpDisplay] = useState('');
    const [createdAccMailContent, setCreatedAccMailContent] = useState('Không có dữ liệu thư.');
    const [createdAccMailLoader, setCreatedAccMailLoader] = useState(false);
    const [createdAccEmailId, setCreatedAccEmailId] = useState('');
    const [showCreatedAccInbox, setShowCreatedAccInbox] = useState(false);

    // Email Getter -> Tab Address states
    const [tabAddressData, setTabAddressData] = useState({ name: '—', address: '—', city: '—', state: '—', zip: '—', phone: '—' });

    // Status On Close Selection
    const [modalStatusSelect, setModalStatusSelect] = useState('');
    const [statusSelectDisabled, setStatusSelectDisabled] = useState(false);

    // US Address generation logic
    const handleGenerateAddress = () => {
        const addr = randItem(US_ADDRESSES);
        const fullName = `${randItem(US_FIRST_NAMES)} ${randItem(US_LAST_NAMES)}`;
        const phone = generateUSPhone();
        setAddressData({
            name: fullName,
            address: addr.address,
            city: addr.city,
            state: US_STATE_NAMES[addr.state] || addr.state,
            zip: addr.zip,
            phone: phone
        });
        setCopiedField(null);
        triggerToast('🇺🇸 Đã tạo địa chỉ mới!');
    };

    const handleCopyAddressField = (field, text) => {
        if (text === '—') return;
        navigator.clipboard.writeText(text).then(() => {
            setCopiedField(field);
            triggerToast(`Đã copy: ${text}`);
            setTimeout(() => setCopiedField(null), 2000);
        });
    };

    const handleCopyAllAddress = () => {
        if (addressData.name === '—') {
            triggerToast('Vui lòng tạo địa chỉ trước!');
            return;
        }
        const fullText = `${addressData.name}\n${addressData.address}\n${addressData.city}, ${addressData.state} ${addressData.zip}\nPhone: ${addressData.phone}`;
        navigator.clipboard.writeText(fullText).then(() => {
            triggerToast('📑 Đã copy toàn bộ địa chỉ!');
        });
    };

    // Mail retrieval logic mapping Graph API/Local IMAP
    const isMicrosoftEmail = (email) => {
        if (!email) return false;
        const emailLower = email.toLowerCase();
        return ['@hotmail.', '@outlook.', '@live.', '@msn.'].some(dom => emailLower.includes(dom));
    };

    const readMailboxClientSide = async (emailId, emailObj = null) => {
        if (!emailObj) {
            const resp = await apiRequest(`/dashboard/api/emails/${emailId}/`);
            if (!resp.ok) {
                throw new Error(`Không thể lấy thông tin email ID: ${emailId}`);
            }
            emailObj = await resp.json();
        }

        const emailAddr = emailObj.email;
        if (!isMicrosoftEmail(emailAddr)) {
            const resp = await apiRequest(`/dashboard/api/emails/${emailId}/read-mailbox/`);
            const data = await resp.json();
            if (!resp.ok || !data.success) {
                throw new Error(data.message || 'Lỗi IMAP khi đọc hộp thư.');
            }
            return data;
        }

        // Fetch Microsoft Graph token
        const tokenResp = await apiRequest(`/dashboard/api/emails/${emailId}/get-access-token/`);
        if (!tokenResp.ok) {
            let errMsg = 'Không thể lấy access token từ backend.';
            try {
                const errData = await tokenResp.json();
                errMsg = errData.message || errMsg;
            } catch (e) {}
            throw new Error(errMsg);
        }
        const tokenData = await tokenResp.json();
        const accessToken = tokenData.access_token;
        const configFlow = tokenData.flow || 'ropc';
        const hasRefreshToken = tokenData.has_refresh_token;

        let msgUrl = "https://graph.microsoft.com/v1.0/me/messages?$top=15";
        if (!hasRefreshToken && configFlow === 'client_credentials') {
            msgUrl = `https://graph.microsoft.com/v1.0/users/${emailAddr}/messages?$top=15`;
        }

        const msgResp = await fetch(msgUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });

        if (!msgResp.ok) {
            const msgErrText = await msgResp.text();
            throw new Error(`Lỗi Graph API: ${msgErrText}`);
        }

        const msgData = await msgResp.json();
        const emailsList = msgData.value || [];
        
        const parsedEmails = emailsList.map(m => {
            const fromDict = m.from || m.sender || {};
            const emailAddrObj = fromDict.emailAddress || {};
            const fromName = emailAddrObj.name || '';
            const fromEmail = emailAddrObj.address || '';
            const fromSender = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

            const subject = m.subject || '(Không có tiêu đề)';
            const receivedTime = m.receivedDateTime || '';
            let dateStr = receivedTime;
            if (receivedTime.includes('T') && receivedTime.includes('Z')) {
                try {
                    const dt = receivedTime.replace('Z', '').split('.')[0];
                    const parts = dt.split('T');
                    dateStr = `${parts[0]} ${parts[1]}`;
                } catch (err) {}
            }

            const bodyDict = m.body || {};
            const bodyContent = bodyDict.content || '';
            let snippet = m.bodyPreview || '';
            if (!snippet && bodyContent) {
                let cleanBody = bodyContent.trim();
                if (cleanBody.toLowerCase().includes('<html') || cleanBody.toLowerCase().includes('<body') || cleanBody.toLowerCase().includes('<div')) {
                    cleanBody = cleanBody.replace(/<[^>]+>/g, '');
                    cleanBody = cleanBody.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                }
                cleanBody = cleanBody.replace(/\s+/g, ' ').trim();
                snippet = cleanBody.slice(0, 200) + (cleanBody.length > 200 ? '...' : '');
            }

            return {
                from: fromSender,
                subject: subject,
                date: dateStr,
                snippet: snippet,
                body: bodyContent
            };
        });

        // Save results to DB
        const savePayload = {};
        if (parsedEmails.length > 0) {
            savePayload.latest_email = parsedEmails[0];
        }

        const saveResp = await apiRequest(`/dashboard/api/emails/${emailId}/save-mailbox-results/`, {
            method: 'POST',
            body: JSON.stringify(savePayload)
        });

        let updatedEmailData = emailObj;
        if (saveResp.ok) {
            const saveData = await saveResp.json();
            if (saveData.success) {
                updatedEmailData = saveData.email_data;
            }
        }

        return {
            success: true,
            emails: parsedEmails,
            email_data: updatedEmailData
        };
    };

    // Info Getter API actions
    const handleInfoSourceChange = (type) => {
        setInfoSourceType(type);
        setModalStatusSelect('');
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

    // Get active created account
    const fetchActiveCreatedAccount = async () => {
        setEmailGetLoader(true);
        try {
            const resp = await apiRequest(`/dashboard/api/accounts/get-active-account/?type=${emailSelectType}`);
            if (resp.status === 401 || resp.status === 403) {
                triggerToast('Vui lòng đăng nhập Dashboard trước!');
                return;
            }
            const data = await resp.json();
            if (resp.ok && data.success) {
                const accData = data.account_data;
                setCreatedAccId(accData.id);

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
                renderMailboxSection(data.emails, 'created');
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

    // Get unused email
    const fetchUnusedEmail = async () => {
        setEmailGetLoader(true);
        try {
            const resp = await apiRequest(`/dashboard/api/emails/get-unused-email/?type=${emailSelectType}`);
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

                if (isMicrosoftEmail(emailData.email)) {
                    setEmailGetMailContent('Đang kết nối Outlook...');
                    setTimeout(() => reloadEmailGetMailbox(emailData.id), 100);
                } else {
                    renderMailboxSection(data.emails, 'unused');
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
                renderMailboxSection(data.emails, 'unused');
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
                        borderRadius: '6px',
                        fontWeight: '700',
                        textAlign: 'center',
                        fontSize: '16px',
                        color: 'var(--otp-text)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}>
                        Mã OTP: {code}
                        <button className="btn" onClick={() => {
                            navigator.clipboard.writeText(code).then(() => triggerToast(`Đã copy OTP: ${code}`));
                        }} style={{
                            padding: '4px 10px',
                            fontSize: '11px',
                            height: 'auto',
                            background: 'var(--otp-text)',
                            color: 'var(--bg-color)',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}>
                            Copy OTP
                        </button>
                    </div>
                )}
                <div><strong>Người gửi:</strong> {fromStr}</div>
                <div><strong>Thời gian:</strong> {dateStr}</div>
                <div><strong>Tiêu đề:</strong> {subjectStr}</div>
                <div style={{
                    marginTop: '8px',
                    paddingTop: '8px',
                    borderTop: '1px dashed rgba(255,255,255,0.05)',
                    color: 'var(--text-color)',
                    fontFamily: 'monospace',
                    fontSize: '11px'
                }}>{snippetStr}</div>
            </div>
        );
    };

    // Save manually created account
    const handleSaveCreatedAccount = async () => {
        if (!emailGetAddress) {
            triggerToast('Chưa có email nào được tải.');
            return;
        }
        if (!emailGetAccPassword) {
            triggerToast('Vui lòng nhập mật khẩu tài khoản.');
            return;
        }
        setEmailGetLoader(true);
        try {
            const resp = await apiRequest('/dashboard/api/accounts/add-manual/', {
                method: 'POST',
                body: JSON.stringify({
                    email: emailGetAddress,
                    password: emailGetAccPassword,
                    type: emailSelectType,
                    two_factor_auth: emailGetAcc2Fa,
                    profile_id: 'auto'
                })
            });
            const data = await resp.json();
            if (resp.ok && data.success) {
                triggerToast('Đã lưu tài khoản vào hệ thống thành công! 🎉');
                setEmailGetAccPassword('');
                setEmailGetAcc2Fa('');
                setEmailGetAcc2FaOtpDisplay('');
            } else {
                triggerToast(data.message || 'Lỗi khi lưu tài khoản.');
            }
        } catch (err) {
            triggerToast('Lỗi kết nối máy chủ.');
        } finally {
            setEmailGetLoader(false);
        }
    };

    const handleGetOtpForUncreatedAcc = async () => {
        if (!emailGetAcc2Fa.trim()) {
            triggerToast('⚠️ Vui lòng nhập hoặc dán Khóa 2FA trước!');
            return;
        }
        const code = await calculateTotp(emailGetAcc2Fa.trim());
        if (!code) {
            triggerToast('❌ Khóa 2FA không hợp lệ!');
            return;
        }
        setEmailGetAcc2FaOtpDisplay(`Mã OTP: ${code} (Nhấp để copy)`);
        navigator.clipboard.writeText(code).then(() => {
            triggerToast(`✅ OTP: ${code}`);
        });
    };

    // Email Getter address tab
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
    };

    const handleCopyTabAddressField = (text) => {
        if (text === '—') return;
        navigator.clipboard.writeText(text).then(() => {
            triggerToast(`Đã copy: ${text}`);
        });
    };

    const handleCopyAllTabAddress = () => {
        if (tabAddressData.name === '—') return;
        const fullText = `${tabAddressData.name}\n${tabAddressData.address}\n${tabAddressData.city}, ${tabAddressData.state} ${tabAddressData.zip}\nPhone: ${tabAddressData.phone}`;
        navigator.clipboard.writeText(fullText).then(() => {
            triggerToast('📑 Đã copy toàn bộ địa chỉ!');
        });
    };

    // Update classification status on close
    const handleCloseEmailGetModal = async () => {
        const targetId = createdAccId || emailGetId;
        const targetType = createdAccId ? 'created' : 'email';

        if (targetId) {
            if (!modalStatusSelect) {
                triggerToast('⚠️ Vui lòng chọn trạng thái trước khi đóng bảng!');
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
                    setStatusSelectDisabled(false);
                    return;
                }
            } catch (err) {
                triggerToast('❌ Lỗi kết nối máy chủ.');
                setStatusSelectDisabled(false);
                return;
            }
        }

        // Reset and close
        setEmailGetId('');
        setCreatedAccId('');
        setModalStatusSelect('');
        setStatusSelectDisabled(false);
        setShowEmailGetModal(false);
    };

    // Load initial routing state from URL query parameters
    useEffect(() => {
        const handlePopState = () => {
            const pathname = window.location.pathname;
            const isDashboardPath = pathname.startsWith('/dashboard');
            if (isDashboardPath) {
                const params = new URLSearchParams(window.location.search);
                const tab = params.get('tab') || 'overview';
                const page = parseInt(params.get('page')) || 1;
                setCurrentTab(tab);
                setCurrentPage(page);
            } else {
                const parts = pathname.split('/').filter(Boolean);
                if (parts.length === 1 && /^[a-zA-Z0-9]+$/.test(parts[0])) {
                    setCurrentTab('notes');
                    setNoteId(parts[0]);
                }
            }
        };
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    // Sync state changes back to URL query parameters
    const handleSwitchTab = (tabName, pageNum = 1) => {
        setCurrentTab(tabName);
        setCurrentPage(pageNum);
        
        setVisitedTabs(prev => {
            const next = new Set(prev);
            next.add(tabName);
            return next;
        });
        
        if (tabName === 'notes') {
            window.history.replaceState({}, '', `/${noteId}/`);
        } else {
            const url = new URL(window.location.href);
            url.pathname = '/dashboard/';
            url.searchParams.set('tab', tabName);
            url.searchParams.set('page', pageNum);
            // Clean up any note_id parameter if we switch away from notes
            url.searchParams.delete('note_id');
            window.history.replaceState({}, '', url.toString());
        }

        // Close sidebar on mobile
        setSidebarVisible(false);
    };

    // Load notification counts
    const fetchNotificationCount = async () => {
        try {
            const resp = await apiRequest('/dashboard/api/notifications/');
            if (resp.ok) {
                const data = await resp.json();
                const notifications = data.results || data || [];
                const unread = notifications.filter(n => !n.is_read);
                setUnreadNotifCount(unread.length);
                setHeaderNotifs(notifications.slice(0, 5)); // show latest 5
            }
        } catch (err) {
            console.error("Error loading notification badge counts: ", err);
        }
    };

    useEffect(() => {
        fetchNotificationCount();
        const countInterval = setInterval(fetchNotificationCount, 30000);
        return () => clearInterval(countInterval);
    }, []);

    // Automatically apply data-label and cell-chk to table cells for mobile responsive views
    useEffect(() => {
        const updateTableLabels = (table) => {
            const ths = Array.from(table.querySelectorAll('thead th'));
            const rows = table.querySelectorAll('tbody tr');
            rows.forEach(row => {
                const tds = row.querySelectorAll('td');
                tds.forEach((td, idx) => {
                    if (idx < ths.length) {
                        const label = ths[idx].innerText.trim();
                        // Automatically tag checkbox cells with cell-chk
                        if (td.querySelector('input[type="checkbox"]')) {
                            td.classList.add('cell-chk');
                        }
                        
                        if (label && label !== 'STT' && !td.querySelector('input[type="checkbox"]') && !td.classList.contains('cell-chk')) {
                            td.setAttribute('data-label', label);
                        } else {
                            td.removeAttribute('data-label');
                        }
                    }
                });
            });
        };

        const processAllTables = () => {
            document.querySelectorAll('.table-container table').forEach(updateTableLabels);
        };

        // Run immediately
        processAllTables();

        // Observe changes to the DOM to handle dynamic tables/rows rendering
        const observer = new MutationObserver((mutations) => {
            let shouldUpdate = false;
            for (const mutation of mutations) {
                if (mutation.type === 'childList' && (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) {
                    shouldUpdate = true;
                    break;
                }
            }
            if (shouldUpdate) {
                processAllTables();
            }
        });

        observer.observe(document.body, { childList: true, subtree: true });

        return () => observer.disconnect();
    }, [currentTab]);

    // Mark notifications as read
    const markAllNotificationsAsRead = async (e) => {
        if (e) e.stopPropagation();
        try {
            const resp = await apiRequest('/dashboard/api/notifications/mark_all_read/', {
                method: 'POST'
            });
            if (resp.ok) {
                fetchNotificationCount();
            }
        } catch (err) {
            console.error(err);
        }
    };

    // 2FA modal handlers
    const openTwoFaModal = () => {
        const saved = localStorage.getItem('last_dashboard_2fa_secret') || '';
        setTwoFaSecret(saved);
        setTwoFaOpen(true);
        if (saved) {
            startTotpGeneration(saved);
        }
    };

    const closeTwoFaModal = () => {
        setTwoFaOpen(false);
        if (twoFaIntervalRef.current) {
            clearInterval(twoFaIntervalRef.current);
            twoFaIntervalRef.current = null;
        }
        setTwoFaCode('');
    };

    const startTotpGeneration = (secretInput) => {
        if (twoFaIntervalRef.current) {
            clearInterval(twoFaIntervalRef.current);
        }

        const updateOtp = async () => {
            const code = await calculateTotp(secretInput);
            if (code) {
                setTwoFaCode(code);
                const remaining = 30 - (Math.floor(Date.now() / 1000) % 30);
                setTwoFaSeconds(remaining);
            } else {
                alert('Mã 2FA không hợp lệ. Vui lòng kiểm tra lại.');
                if (twoFaIntervalRef.current) {
                    clearInterval(twoFaIntervalRef.current);
                    twoFaIntervalRef.current = null;
                }
                setTwoFaCode('');
            }
        };

        updateOtp();
        twoFaIntervalRef.current = setInterval(updateOtp, 1000);
    };

    const handleGetTwoFaCode = () => {
        if (!twoFaSecret.trim()) {
            alert('Vui lòng nhập mã bảo mật 2FA');
            return;
        }
        localStorage.setItem('last_dashboard_2fa_secret', twoFaSecret.trim());
        startTotpGeneration(twoFaSecret.trim());
    };

    const copyTwoFaCode = () => {
        if (!twoFaCode) return;
        navigator.clipboard.writeText(twoFaCode).then(() => {
            alert('Đã sao chép mã 2FA: ' + twoFaCode);
        });
    };

    const titleMap = {
        'overview': 'Tổng quan hệ thống',
        'cards': 'Quản lý Thẻ (API & Database)',
        'users': 'Quản lý Người dùng (Client)',
        'profiles': 'MunLogin Profiles',
        'proxies': 'Tor Proxies Management',
        'emails': 'Email Database Management',
        'accounts': 'Tài khoản MunLogin đã tạo',
        'hwids': '🖱️ HWID Manager — Quản lý máy tính được phép',
        'notifications': 'Thông báo của tôi',
        'notes': 'Ghi chú'
    };

    return (
        <div className="dashboard-container" style={{ display: 'flex', height: '100vh', overflow: 'hidden', width: '100%', position: 'relative' }}>
            {/* Background orbs */}
            <div className="glowing-orb orb-primary" style={{ zIndex: 0 }}></div>
            <div className="glowing-orb orb-accent" style={{ zIndex: 0 }}></div>

            {/* Sidebar Overlay */}
            <div className={`sidebar-overlay ${sidebarVisible ? 'active' : ''}`} onClick={() => setSidebarVisible(false)}></div>

            {/* Sidebar */}
            <div className={`sidebar ${sidebarVisible ? 'active' : ''}`} style={{ display: 'flex' }}>
                <div>
                    <a href="#" onClick={(e) => { e.preventDefault(); handleSwitchTab('overview'); }} className="sidebar-brand" style={{ textDecoration: 'none', color: 'inherit', display: 'flex' }}>
                        <span className="menu-icon" style={{ fontSize: '20px' }}>🚀</span>
                        <h1 className="menu-text">fitviet</h1>
                    </a>
                    <div className="sidebar-menu">
                        {currentUser ? (
                            <>
                                <a className={`menu-item ${currentTab === 'overview' ? 'active' : ''}`} onClick={() => handleSwitchTab('overview')}>
                                    <span className="menu-icon">📊</span><span className="menu-text">Tổng quan</span>
                                </a>
                                <a className={`menu-item ${currentTab === 'cards' ? 'active' : ''}`} onClick={() => handleSwitchTab('cards')}>
                                    <span className="menu-icon">💳</span><span className="menu-text">Quản lý Thẻ</span>
                                </a>
                                {currentUser.is_staff && (
                                    <a className={`menu-item ${currentTab === 'users' ? 'active' : ''}`} onClick={() => handleSwitchTab('users')}>
                                        <span className="menu-icon">👥</span><span className="menu-text">Quản lý User</span>
                                    </a>
                                )}
                                <a className={`menu-item ${currentTab === 'profiles' ? 'active' : ''}`} onClick={() => handleSwitchTab('profiles')}>
                                    <span className="menu-icon">🖥️</span><span className="menu-text">Profiles</span>
                                </a>
                                <a className={`menu-item ${currentTab === 'proxies' ? 'active' : ''}`} onClick={() => handleSwitchTab('proxies')}>
                                    <span className="menu-icon">🌐</span><span className="menu-text">Tor Proxies</span>
                                </a>
                                <a className={`menu-item ${currentTab === 'emails' ? 'active' : ''}`} onClick={() => handleSwitchTab('emails')}>
                                    <span className="menu-icon">✉️</span><span className="menu-text">Quản lý Email</span>
                                </a>
                                <a className={`menu-item ${currentTab === 'accounts' ? 'active' : ''}`} onClick={() => handleSwitchTab('accounts')}>
                                    <span className="menu-icon">🔑</span><span className="menu-text">Tài khoản đã tạo</span>
                                </a>
                                {currentUser.is_staff && (
                                    <a className={`menu-item ${currentTab === 'hwids' ? 'active' : ''}`} onClick={() => handleSwitchTab('hwids')}>
                                        <span className="menu-icon">🖱️</span><span className="menu-text">HWID Manager</span>
                                    </a>
                                )}
                                <a className={`menu-item ${currentTab === 'notifications' ? 'active' : ''}`} onClick={() => handleSwitchTab('notifications')}>
                                    <span className="menu-icon">🔔</span>
                                    <span className="menu-text">
                                        Thông báo 
                                        {unreadNotifCount > 0 && (
                                            <span className="badge-unread-count" style={{ display: 'inline-block', background: 'var(--danger)', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '10px', marginLeft: '10px', fontWeight: 700 }}>
                                                {unreadNotifCount}
                                            </span>
                                        )}
                                    </span>
                                </a>
                            </>
                        ) : null}
                        <a className={`menu-item ${currentTab === 'notes' ? 'active' : ''}`} onClick={() => handleSwitchTab('notes')}>
                            <span className="menu-icon">📝</span><span className="menu-text">Ghi chú nhanh</span>
                        </a>
                        <a className="menu-item" onClick={() => { setShowEmailGetModal(true); setSidebarVisible(false); }}>
                            <span className="menu-icon">✉️</span><span className="menu-text">Lấy Info</span>
                        </a>
                        <a className="menu-item" onClick={() => { setShowAddressModal(true); handleGenerateAddress(); setSidebarVisible(false); }}>
                            <span className="menu-icon">🇺🇸</span><span className="menu-text">USA Địa chỉ</span>
                        </a>
                        <a className="menu-item" onClick={() => { openTwoFaModal(); setSidebarVisible(false); }}>
                            <span className="menu-icon">🔑</span><span className="menu-text">Trình tạo 2FA</span>
                        </a>
                    </div>
                </div>
                <div className="sidebar-footer" style={{ padding: '15px' }}>
                    {currentUser ? (
                        <>
                            <div className="user-info menu-text">
                                <span className="user-name">{currentUser.username}</span>
                                <span className="user-role">{currentUser.is_staff ? 'Quản trị viên' : 'Khách hàng'}</span>
                            </div>
                            <button className="logout-btn" onClick={onLogout} title="Đăng xuất" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span className="menu-icon">🚪</span><span className="menu-text">Thoát</span>
                            </button>
                        </>
                    ) : (
                        <a href="/dashboard/" className="menu-item" style={{ width: '100%', justifyContent: 'center', border: '1px dashed var(--border-color)', gap: '8px', padding: '10px' }}>
                            <span>🔑</span><span className="menu-text">Đăng nhập</span>
                        </a>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="main-content" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', position: 'relative', zIndex: 10 }}>
                {/* Header */}
                <div className="top-header">
                    <button className="sidebar-toggle-btn" onClick={() => setSidebarVisible(!sidebarVisible)}>☰</button>
                    <div className="header-title">
                        <h2>{titleMap[currentTab] || 'Dashboard'}</h2>
                    </div>

                    <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto', position: 'relative' }}>
                        {/* Theme Toggle Button */}
                        <button 
                            onClick={toggleTheme} 
                            style={{ 
                                background: 'rgba(255, 255, 255, 0.02)', 
                                border: '1px solid var(--border-color)', 
                                borderRadius: '50%', 
                                width: '40px', 
                                height: '40px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                cursor: 'pointer', 
                                fontSize: '18px',
                                color: 'var(--text-color)',
                                transition: 'all 0.3s ease'
                            }}
                            title="Chuyển giao diện"
                        >
                            🌓
                        </button>

                        {/* Notification Bell */}
                        {currentUser && (
                            <div 
                                className="notif-bell-container" 
                                style={{ 
                                    position: 'relative', 
                                    cursor: 'pointer', 
                                    padding: '8px', 
                                    borderRadius: '50%', 
                                    background: 'rgba(255, 255, 255, 0.02)', 
                                    border: '1px solid var(--border-color)', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    width: '40px', 
                                    height: '40px', 
                                    transition: 'all 0.3s ease' 
                                }}
                                onClick={() => setHeaderNotifOpen(!headerNotifOpen)}
                            >
                                <span style={{ fontSize: '18px' }}>🔔</span>
                                {unreadNotifCount > 0 && (
                                    <span className="badge-unread-count" style={{ display: 'block', position: 'absolute', top: '-2px', right: '-2px', background: 'var(--danger)', color: 'white', borderRadius: '50%', width: '16px', height: '16px', fontSize: '9px', fontWeight: 700, textAlign: 'center', lineHeight: '16px' }}>
                                        {unreadNotifCount}
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Login/User Button */}
                        {currentUser ? (
                            <button 
                                onClick={onLogout} 
                                style={{ 
                                    background: 'linear-gradient(135deg, var(--primary), var(--primary-hover))', 
                                    border: 'none', 
                                    borderRadius: '10px', 
                                    padding: '8px 16px', 
                                    color: 'white', 
                                    fontWeight: '600', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '8px', 
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    height: '40px'
                                }}
                                title="Đăng xuất"
                            >
                                👤 <span className="header-username">{currentUser.username}</span>
                            </button>
                        ) : (
                            <a 
                                href="/dashboard/" 
                                style={{ 
                                    background: 'linear-gradient(135deg, var(--accent), var(--primary))', 
                                    borderRadius: '10px', 
                                    padding: '8px 16px', 
                                    color: 'white', 
                                    fontWeight: '600', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '6px', 
                                    textDecoration: 'none',
                                    fontSize: '13px',
                                    height: '40px',
                                    boxSizing: 'border-box'
                                }}
                            >
                                🔑 <span className="header-login-text">Đăng nhập</span>
                            </a>
                        )}

                        {/* Popover list */}
                        {headerNotifOpen && (
                            <div className="notif-dropdown" style={{ display: 'block', position: 'absolute', top: '50px', right: 0, width: '340px', background: 'var(--modal-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.6)', zIndex: 1000, overflow: 'hidden', padding: '15px 0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 15px 10px 15px', borderBottom: '1px solid var(--border-color)' }}>
                                    <span style={{ fontWeight: 700, fontSize: '14px' }}>Thông báo mới</span>
                                    <span style={{ fontSize: '11px', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }} onClick={markAllNotificationsAsRead}>Đọc tất cả</span>
                                </div>
                                <div style={{ maxHeight: '280px', overflowY: 'auto', padding: '5px 0' }}>
                                    {headerNotifs.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '15px', color: 'var(--text-muted)' }}>Không có thông báo</div>
                                    ) : (
                                        headerNotifs.map((n, i) => (
                                            <div key={i} className={`notification-item ${n.is_read ? '' : 'unread'}`} style={{ padding: '8px 15px', fontSize: '13px' }}>
                                                <div>{n.message}</div>
                                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>{new Date(n.created_at).toLocaleString('vi-VN')}</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div style={{ textAlign: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '10px', marginTop: '5px' }}>
                                    <span style={{ fontSize: '12px', color: 'var(--primary)', cursor: 'pointer', fontWeight: 600 }} onClick={() => { setHeaderNotifOpen(false); handleSwitchTab('notifications'); }}>Xem tất cả thông báo</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* View Content Porting - Keep-alive pattern with visited-tabs check */}
                <div style={{ 
                    flex: 1, 
                    overflow: currentTab === 'notes' ? 'hidden' : 'auto', 
                    padding: currentTab === 'notes' ? '0' : '24px', 
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <div style={{ display: currentTab === 'overview' ? 'block' : 'none' }}>
                        {currentUser && visitedTabs.has('overview') && <Overview currentUser={currentUser} onSwitchTab={handleSwitchTab} />}
                    </div>
                    <div style={{ display: currentTab === 'cards' ? 'block' : 'none' }}>
                        {currentUser && visitedTabs.has('cards') && <Cards currentUser={currentUser} page={currentPage} onPageChange={(p) => handleSwitchTab('cards', p)} />}
                    </div>
                    {currentUser?.is_staff && (
                        <div style={{ display: currentTab === 'users' ? 'block' : 'none' }}>
                            {visitedTabs.has('users') && <Users currentUser={currentUser} page={currentPage} onPageChange={(p) => handleSwitchTab('users', p)} />}
                         </div>
                    )}
                    <div style={{ display: currentTab === 'profiles' ? 'block' : 'none' }}>
                        {currentUser && visitedTabs.has('profiles') && <Profiles currentUser={currentUser} page={currentPage} onPageChange={(p) => handleSwitchTab('profiles', p)} />}
                    </div>
                    <div style={{ display: currentTab === 'proxies' ? 'block' : 'none' }}>
                        {currentUser && visitedTabs.has('proxies') && <Proxies currentUser={currentUser} page={currentPage} onPageChange={(p) => handleSwitchTab('proxies', p)} />}
                    </div>
                    <div style={{ display: currentTab === 'emails' ? 'block' : 'none' }}>
                        {currentUser && visitedTabs.has('emails') && <Emails currentUser={currentUser} page={currentPage} onPageChange={(p) => handleSwitchTab('emails', p)} />}
                    </div>
                    <div style={{ display: currentTab === 'accounts' ? 'block' : 'none' }}>
                        {currentUser && visitedTabs.has('accounts') && <Accounts currentUser={currentUser} page={currentPage} onPageChange={(p) => handleSwitchTab('accounts', p)} />}
                    </div>
                    {currentUser?.is_staff && (
                        <div style={{ display: currentTab === 'hwids' ? 'block' : 'none' }}>
                            {visitedTabs.has('hwids') && <HWIDs currentUser={currentUser} page={currentPage} onPageChange={(p) => handleSwitchTab('hwids', p)} />}
                        </div>
                    )}
                    <div style={{ display: currentTab === 'notifications' ? 'block' : 'none' }}>
                        {currentUser && visitedTabs.has('notifications') && <Notifications fetchNotificationCount={fetchNotificationCount} />}
                    </div>
                    <div style={{ display: currentTab === 'notes' ? 'block' : 'none', flex: 1, height: '100%' }}>
                        {visitedTabs.has('notes') && (
                            <QuickNotes 
                                noteId={noteId} 
                                currentUser={currentUser} 
                                onLogout={onLogout} 
                                isEmbedded={true} 
                                theme={theme}
                            />
                        )}
                    </div>
                </div>
            </div>

            {/* 2FA Authenticator Modal */}
            {twoFaOpen && (
                <div className="modal-overlay" style={{ display: 'flex' }} onClick={(e) => { if (e.target.className === 'modal-overlay') closeTwoFaModal(); }}>
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>🔑 Trình tạo mã 2FA</h3>
                            <button className="modal-close" onClick={closeTwoFaModal}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
                                Nhập mã bảo mật 2FA (Base32 secret) của bạn để nhận mã xác thực OTP 6 số.
                            </p>
                            <div className="form-group">
                                <label className="form-label" htmlFor="twoFaSecret">Mã bảo mật 2FA (Secret Key)</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    placeholder="Ví dụ: JBSWY3DPEBLW64TBNQ..." 
                                    style={{ textTransform: 'uppercase' }}
                                    value={twoFaSecret}
                                    onChange={(e) => setTwoFaSecret(e.target.value)}
                                />
                            </div>
                            {twoFaCode && (
                                <div className="form-group" style={{ display: 'block', marginTop: '20px' }}>
                                    <label className="form-label">Mã xác thực của bạn (OTP Code)</label>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <input type="text" className="two-fa-code-display" value={twoFaCode} readOnly style={{ letterSpacing: '2px', fontWeight: 'bold' }} />
                                        <button className="btn btn-primary" onClick={copyTwoFaCode} style={{ padding: '10px 16px' }}>Sao chép</button>
                                    </div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
                                        Hiệu lực còn lại: <strong>{twoFaSeconds}</strong> giây
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={closeTwoFaModal}>Đóng</button>
                            <button className="btn btn-primary" onClick={handleGetTwoFaCode}>Lấy mã (Get Code)</button>
                        </div>
                    </div>
                </div>
            )}

            {/* US Address Modal */}
            {showAddressModal && (
                <div className="modal-overlay" style={{ display: 'flex' }} onClick={() => setShowAddressModal(false)}>
                    <div className="addr-modal-box" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                                <span style={{ fontSize: '22px' }}>🇺🇸</span> Địa chỉ Mỹ ngẫu nhiên
                            </h3>
                            <button onClick={() => setShowAddressModal(false)} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer' }}>✕</button>
                        </div>

                        <div>
                            {Object.entries(addressData).map(([key, val]) => (
                                <div className="addr-field" key={key}>
                                    <div>
                                        <div className="addr-field-label">
                                            {key === 'name' ? 'Họ và tên (Full Name)' :
                                             key === 'address' ? 'Địa chỉ (Address)' :
                                             key === 'city' ? 'Thành phố (City)' :
                                             key === 'state' ? 'Bang (State)' :
                                             key === 'zip' ? 'Mã bưu chính (Zip Code)' : 'Số điện thoại (Phone)'}
                                        </div>
                                        <div className="addr-field-value">{val}</div>
                                    </div>
                                    <button
                                        className={`addr-copy-btn ${copiedField === key ? 'copied' : ''}`}
                                        onClick={() => handleCopyAddressField(key, val)}
                                    >
                                        {copiedField === key ? '✅ Đã copy' : '📋 Copy'}
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleGenerateAddress}>🎲 Tạo địa chỉ mới</button>
                            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleCopyAllAddress}>📑 Copy toàn bộ</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Email Getter Modal */}
            {showEmailGetModal && (
                <div className="modal-overlay" style={{ display: 'flex' }} onClick={handleCloseEmailGetModal}>
                    <div className="modal-box" style={{ maxWidth: '550px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0 }}>✉️ Lấy Info</h3>
                            <button onClick={handleCloseEmailGetModal} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                        </div>

                        <div>
                            {/* Radio tabs selector */}
                            <div style={{ marginBottom: '15px' }}>
                                <label className="form-label">Trạng thái tài khoản</label>
                                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                    <label style={{
                                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px',
                                        background: infoSourceType === 'uncreated' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.02)',
                                        border: `1px solid ${infoSourceType === 'uncreated' ? 'var(--primary)' : 'var(--border-color)'}`,
                                        borderRadius: '10px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-color)'
                                    }}>
                                        <input type="radio" name="sourceType" checked={infoSourceType === 'uncreated'} onChange={() => handleInfoSourceChange('uncreated')} />
                                        Chưa tạo (Lấy Email)
                                    </label>
                                    <label style={{
                                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px',
                                        background: infoSourceType === 'created' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.02)',
                                        border: `1px solid ${infoSourceType === 'created' ? 'var(--primary)' : 'var(--border-color)'}`,
                                        borderRadius: '10px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-color)'
                                    }}>
                                        <input type="radio" name="sourceType" checked={infoSourceType === 'created'} onChange={() => handleInfoSourceChange('created')} />
                                        Đã tạo (Lấy Acc)
                                    </label>
                                    <label style={{
                                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px',
                                        background: infoSourceType === 'address' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.02)',
                                        border: `1px solid ${infoSourceType === 'address' ? 'var(--primary)' : 'var(--border-color)'}`,
                                        borderRadius: '10px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-color)'
                                    }}>
                                        <input type="radio" name="sourceType" checked={infoSourceType === 'address'} onChange={() => handleInfoSourceChange('address')} />
                                        🇺🇸 Địa chỉ
                                    </label>
                                </div>
                            </div>

                            {/* Dropdown filters (only for uncreated / created) */}
                            {infoSourceType !== 'address' && (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '12px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label className="form-label">Loại tài khoản</label>
                                        <select
                                            className="form-input"
                                            style={{ background: 'var(--input-bg)', color: 'var(--text-color)', height: '36px', padding: '0 10px', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                            value={emailSelectType}
                                            onChange={(e) => setEmailSelectType(e.target.value)}
                                        >
                                            <option value="Apple">Apple</option>
                                            <option value="Tiktok">Tiktok</option>
                                        </select>
                                    </div>
                                    <button className="btn btn-primary" onClick={handleGetInfo} disabled={emailGetLoader} style={{ height: '36px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                        {infoSourceType === 'uncreated' ? '✉️ Lấy Email' : '🔑 Lấy Info'}
                                    </button>
                                </div>
                            )}

                            {/* Uncreated Results */}
                            {infoSourceType === 'uncreated' && emailGetAddress && (
                                <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                                    <div className="email-get-grid-2col">
                                        <div className="form-group" style={{ marginBottom: '8px' }}>
                                            <label className="form-label">Địa chỉ Email</label>
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                <input type="text" className="form-input" readOnly value={emailGetAddress} style={{ fontWeight: '600', height: '36px', fontSize: '13px' }} />
                                                <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(emailGetAddress).then(() => triggerToast('Đã copy Email')); }} style={{ padding: '0 10px', height: '36px' }}>📋</button>
                                            </div>
                                        </div>
                                        <div className="form-group" style={{ marginBottom: '8px' }}>
                                            <label className="form-label">Mật khẩu Email</label>
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                <input type="text" className="form-input" readOnly value={emailGetPassword} style={{ fontFamily: 'monospace', height: '36px', fontSize: '13px' }} />
                                                <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(emailGetPassword).then(() => triggerToast('Đã copy Mật khẩu')); }} style={{ padding: '0 10px', height: '36px' }}>📋</button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Register/Save fields */}
                                    <div style={{ marginTop: '10px', borderTop: '1px dashed var(--border-color)', paddingTop: '10px' }}>
                                        <div className="email-get-grid-2col">
                                            <div className="form-group" style={{ marginBottom: '8px' }}>
                                                <label className="form-label">Mật khẩu mới</label>
                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                    <input type="text" className="form-input" placeholder="Mật khẩu tạo..." value={emailGetAccPassword} onChange={(e) => setEmailGetAccPassword(e.target.value)} style={{ height: '36px', fontSize: '13px' }} />
                                                    <button className="btn btn-secondary" onClick={() => setEmailGetAccPassword('Zxcv@123')} style={{ padding: '0 10px', height: '36px' }}>🔒</button>
                                                </div>
                                            </div>
                                            <div className="form-group" style={{ marginBottom: '8px' }}>
                                                <label className="form-label">Khóa 2FA</label>
                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                    <input type="text" className="form-input" placeholder="2FA Secret..." value={emailGetAcc2Fa} onChange={(e) => setEmailGetAcc2Fa(e.target.value)} style={{ height: '36px', fontSize: '13px' }} />
                                                    <button className="btn btn-primary" onClick={handleGetOtpForUncreatedAcc} style={{ padding: '0 10px', height: '36px', fontSize: '12px', whiteSpace: 'nowrap' }}>Mã OTP</button>
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
                                        <button className="btn btn-primary" onClick={handleSaveCreatedAccount} style={{ width: '100%', height: '36px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', fontSize: '13px' }}>
                                            💾 Lưu tài khoản vào hệ thống
                                        </button>
                                    </div>

                                    {/* Inbox details */}
                                    <div style={{ marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                Thư mới nhất {emailGetOtpDisplay && <span style={{ background: 'var(--otp-bg)', border: '1px solid var(--otp-border)', color: 'var(--otp-text)', padding: '2px 8px', borderRadius: '4px', fontSize: '13px' }}>OTP: {emailGetOtpDisplay}</span>}
                                            </label>
                                            <button className="btn btn-primary" onClick={() => reloadEmailGetMailbox(emailGetId)} disabled={emailGetLoader} style={{ padding: '4px 8px', fontSize: '11px', height: '26px' }}>🔄 Tải lại</button>
                                        </div>

                                        <div style={{ padding: '8px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', border: '1px solid var(--border-color)', minHeight: '48px', maxHeight: '100px', overflowY: 'auto', fontSize: '12px', lineHeight: '1.4' }}>
                                            {emailGetMailContent}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Created Acc Results */}
                            {infoSourceType === 'created' && createdAccUsername && (
                                <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                                    <div className="email-get-grid-2col">
                                        <div className="form-group" style={{ marginBottom: '8px' }}>
                                            <label className="form-label">Username</label>
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                <input type="text" className="form-input" readOnly value={createdAccUsername} style={{ fontWeight: '600', height: '36px', fontSize: '13px' }} />
                                                <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(createdAccUsername).then(() => triggerToast('Đã copy Username')); }} style={{ padding: '0 10px', height: '36px' }}>📋</button>
                                            </div>
                                        </div>
                                        <div className="form-group" style={{ marginBottom: '8px' }}>
                                            <label className="form-label">Email</label>
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                <input type="text" className="form-input" readOnly value={createdAccEmail} style={{ fontWeight: '600', height: '36px', fontSize: '13px' }} />
                                                <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(createdAccEmail).then(() => triggerToast('Đã copy Email')); }} style={{ padding: '0 10px', height: '36px' }}>📋</button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="email-get-grid-2col" style={{ marginTop: '4px' }}>
                                        <div className="form-group" style={{ marginBottom: '8px' }}>
                                            <label className="form-label">Mật khẩu</label>
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                <input type="text" className="form-input" readOnly value={createdAccPassword} style={{ fontFamily: 'monospace', height: '36px', fontSize: '13px' }} />
                                                <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(createdAccPassword).then(() => triggerToast('Đã copy Mật khẩu')); }} style={{ padding: '0 10px', height: '36px' }}>📋</button>
                                            </div>
                                        </div>
                                        <div className="form-group" style={{ marginBottom: '8px' }}>
                                            <label className="form-label">2FA Secret Key</label>
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                <input type="text" className="form-input" readOnly value={createdAcc2Fa} style={{ fontFamily: 'monospace', height: '36px', fontSize: '13px' }} />
                                                <button className="btn btn-primary" onClick={fetchCreatedAccOtp} style={{ padding: '0 10px', height: '36px' }}>🔑</button>
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

                                    {/* Inbox Details */}
                                    {showCreatedAccInbox && (
                                        <div style={{ marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    Thư mới nhất {createdAccOtpDisplay && <span style={{ background: 'var(--otp-bg)', border: '1px solid var(--otp-border)', color: 'var(--otp-text)', padding: '2px 8px', borderRadius: '4px', fontSize: '13px' }}>OTP: {createdAccOtpDisplay}</span>}
                                                </label>
                                                <button className="btn btn-primary" onClick={() => reloadCreatedAccMailbox(createdAccEmailId)} disabled={createdAccMailLoader} style={{ padding: '4px 8px', fontSize: '11px', height: '26px' }}>🔄 Tải lại</button>
                                            </div>

                                            <div style={{ padding: '8px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', border: '1px solid var(--border-color)', minHeight: '48px', maxHeight: '100px', overflowY: 'auto', fontSize: '12px', lineHeight: '1.4' }}>
                                                {createdAccMailContent}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tab Address results */}
                            {infoSourceType === 'address' && (
                                <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                                    <div>
                                        {Object.entries(tabAddressData).map(([key, val]) => (
                                            <div className="addr-field" style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', background: 'transparent' }} key={key}>
                                                <div>
                                                    <div className="addr-field-label" style={{ fontSize: '11px' }}>
                                                        {key === 'name' ? 'Họ và tên (Full Name)' :
                                                         key === 'address' ? 'Địa chỉ (Address)' :
                                                         key === 'city' ? 'Thành phố (City)' :
                                                         key === 'state' ? 'Bang (State)' :
                                                         key === 'zip' ? 'Mã bưu chính (Zip Code)' : 'Số điện thoại (Phone)'}
                                                    </div>
                                                    <div className="addr-field-value" style={{ fontSize: '14px', color: 'var(--text-color)' }}>{val}</div>
                                                </div>
                                                <button className="btn btn-secondary" onClick={() => handleCopyTabAddressField(val)} style={{ padding: '4px 8px', fontSize: '11px', height: '26px' }}>📋 Copy</button>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                        <button className="btn btn-primary" style={{ flex: 1, height: '36px' }} onClick={handleGenerateTabAddress}>🎲 Tạo địa chỉ mới</button>
                                        <button className="btn btn-secondary" style={{ flex: 1, height: '36px' }} onClick={handleCopyAllTabAddress}>📑 Copy toàn bộ</button>
                                    </div>
                                </div>
                            )}

                            {/* Classification status on close selection */}
                            {(createdAccId || emailGetId) && (
                                <div style={{ marginTop: '15px', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
                                    <label className="form-label">Chọn trạng thái cuối cùng (Bắt buộc trước khi đóng)</label>
                                    <select
                                        className="form-input"
                                        style={{ background: 'var(--input-bg)', color: 'var(--text-color)', height: '36px', padding: '0 10px', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }}
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
                                </div>
                            )}
                        </div>

                        <div className="modal-footer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" disabled={statusSelectDisabled} onClick={handleCloseEmailGetModal}>
                                {statusSelectDisabled ? 'Đang lưu...' : 'Đóng'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Global Toast component */}
            {showToast && <div className="toast">{toastMessage}</div>}
        </div>
    );
}
