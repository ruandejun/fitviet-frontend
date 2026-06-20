import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import Pagination from '../components/Pagination';

const isMicrosoftEmail = (email) => {
    if (!email) return false;
    const emailLower = email.toLowerCase();
    return ['@hotmail.', '@outlook.', '@live.', '@msn.'].some(dom => emailLower.includes(dom));
};

const getEmailStatusBadgeClass = (status) => {
    const map = {
        0: 'badge-success',
        1: 'badge-warning',
        2: 'badge-danger',
        3: 'badge-info',
        4: 'badge-sub-ok',
        5: 'badge-sub-error',
        6: 'badge-active'
    };
    return map[status] || 'badge-success';
};

const getEmailStatusLabel = (status) => {
    const map = {
        0: 'Hoạt động',
        1: 'Chưa kích hoạt',
        2: 'Bị khóa',
        3: 'Tạm thời',
        4: 'Sub OK',
        5: 'Sub Lỗi',
        6: 'Đang sử dụng'
    };
    return map[status] || 'Hoạt động';
};

export default function Emails({ currentUser, page, onPageChange }) {
    const [emails, setEmails] = useState([]);
    const [loading, setLoading] = useState(true);
    const [count, setCount] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    
    // Filters
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [owner, setOwner] = useState('all');
    const [createdBy, setCreatedBy] = useState('all');
    const [clients, setClients] = useState([]);

    // Selection
    const [selectedIds, setSelectedIds] = useState([]);

    // Modals
    const [addOpen, setAddOpen] = useState(false);
    const [addBulkText, setAddBulkText] = useState('');
    const [addAddress, setAddAddress] = useState('');
    const [addPassword, setAddPassword] = useState('');
    const [addProxy, setAddProxy] = useState('');
    const [addSocks5, setAddSocks5] = useState('');
    const [addNote, setAddNote] = useState('');
    const [addOwner, setAddOwner] = useState('');
    const [addLoading, setAddLoading] = useState(false);

    const [editOpen, setEditOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [editAddress, setEditAddress] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editProxy, setEditProxy] = useState('');
    const [editSocks5, setEditSocks5] = useState('');
    const [editUsed, setEditUsed] = useState(false);
    const [editStatus, setEditStatus] = useState(0);
    const [editNote, setEditNote] = useState('');
    const [editOwner, setEditOwner] = useState('');

    const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
    const [bulkStatusVal, setBulkStatusVal] = useState(0);

    const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
    const [bulkAssignOwner, setBulkAssignOwner] = useState('');
    const [bulkAssignLoading, setBulkAssignLoading] = useState(false);

    // Graph API Configuration Modal
    const [graphConfigOpen, setGraphConfigOpen] = useState(false);
    const [graphClientId, setGraphClientId] = useState('');
    const [graphClientSecret, setGraphClientSecret] = useState('');
    const [graphTenantId, setGraphTenantId] = useState('common');
    const [graphAuthFlow, setGraphAuthFlow] = useState('ropc');

    // Single Mailbox Reader Modal
    const [readMailOpen, setReadMailOpen] = useState(false);
    const [readTargetAddress, setReadTargetAddress] = useState('');
    const [readTargetId, setReadTargetId] = useState(null);
    const [mailboxEmails, setMailboxEmails] = useState([]);
    const [mailboxLoading, setMailboxLoading] = useState(false);
    const [mailboxError, setMailboxError] = useState('');
    const [activeMailIndex, setActiveMailIndex] = useState(null);

    // Bulk Mailbox Reader Modal
    const [bulkReadOpen, setBulkReadOpen] = useState(false);
    const [bulkMailInput, setBulkMailInput] = useState('');
    const [bulkAccountsStatus, setBulkAccountsStatus] = useState({}); // email -> status string
    const [bulkAccountsColor, setBulkAccountsColor] = useState({}); // email -> success/danger/accent
    const [bulkStatusSummary, setBulkStatusSummary] = useState('');
    const [bulkEmailsList, setBulkEmailsList] = useState([]);
    const [bulkActiveEmailsList, setBulkActiveEmailsList] = useState([]);
    const [bulkSearchQuery, setBulkSearchQuery] = useState('');
    const [activeBulkMail, setActiveBulkMail] = useState(null);

    // Background reading workers to refresh row values
    const [refreshingRows, setRefreshingRows] = useState({}); // emailId -> true/false

    const fetchEmails = async () => {
        setLoading(true);
        let url = `/dashboard/api/emails/?page=${page}&page_size=${pageSize}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (status !== '') url += `&status=${status}`;
        if (owner && owner !== 'all') url += `&owner=${owner}`;
        if (createdBy && createdBy !== 'all') url += `&created_by=${createdBy}`;

        try {
            const resp = await apiRequest(url);
            if (resp.ok) {
                const data = await resp.json();
                const fetched = data.results || data;
                setEmails(fetched);
                setCount(data.count || fetched.length);
                setSelectedIds([]);
                
                // Auto trigger background scanning for the emails shown on this page
                fetched.forEach(e => {
                    refreshSingleEmailRow(e.id, e);
                });
            }
        } catch (err) {
            console.error("Error loading emails:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchClients = async () => {
        if (!currentUser.is_staff) return;
        try {
            const resp = await apiRequest('/dashboard/api/users/?role=user');
            if (resp.ok) {
                const data = await resp.json();
                setClients(data.results || data);
            }
        } catch (err) {
            console.error("Error fetching clients:", err);
        }
    };

    useEffect(() => {
        fetchEmails();
    }, [page, pageSize, status, owner, createdBy]);

    useEffect(() => {
        const t = setTimeout(() => {
            if (page !== 1) {
                onPageChange(1);
            } else {
                fetchEmails();
            }
        }, 300);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => {
        fetchClients();
    }, []);

    // Perform Microsoft Graph or IMAP read client-side to offload Django backend
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

        // 1. Fetch access token from backend (avoids CORS blocks completely)
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

        // 2. Fetch messages from Microsoft Graph API directly from the browser (fully allowed by Microsoft CORS policies)
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

        // 3. Save latest email details back to Django database
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

    // Refresh email row background stats
    const refreshSingleEmailRow = async (id, emailObj) => {
        setRefreshingRows(prev => ({ ...prev, [id]: true }));
        try {
            const res = await readMailboxClientSide(id, emailObj);
            if (res.success && res.email_data) {
                setEmails(prev => prev.map(e => e.id === id ? res.email_data : e));
            }
        } catch (err) {
            console.error("Background row scan failed for " + emailObj.email, err);
            // set row status to error
            setEmails(prev => prev.map(e => e.id === id ? { ...e, latest_code: '❌ Lỗi' } : e));
        } finally {
            setRefreshingRows(prev => ({ ...prev, [id]: false }));
        }
    };

    // Load Single Mailbox Reader
    const openReadMailModal = (e, emailItem) => {
        if (e) e.stopPropagation();
        setReadTargetId(emailItem.id);
        setReadTargetAddress(emailItem.email);
        setMailboxEmails([]);
        setActiveMailIndex(null);
        setMailboxError('');
        setReadMailOpen(true);
        loadMailbox(emailItem.id, emailItem);
    };

    const loadMailbox = async (emailId, emailObj) => {
        setMailboxLoading(true);
        setMailboxError('');
        try {
            const res = await readMailboxClientSide(emailId, emailObj);
            if (res.success) {
                setMailboxEmails(res.emails || []);
            } else {
                setMailboxError(res.message || 'Lỗi IMAP không xác định.');
            }
        } catch (err) {
            setMailboxError(err.message || 'Lỗi kết nối hoặc cấu hình Azure AD không chính xác.');
        } finally {
            setMailboxLoading(false);
        }
    };

    const handleSelectRow = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(x => x !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const toggleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(emails.map(x => x.id));
        } else {
            setSelectedIds([]);
        }
    };

    // Graph Config CRUD
    const handleOpenGraphConfig = async () => {
        try {
            const res = await apiRequest('/dashboard/api/emails/get-graph-config/');
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setGraphClientId(data.client_id || '');
                    setGraphClientSecret(data.client_secret || '');
                    setGraphTenantId(data.tenant_id || 'common');
                    setGraphAuthFlow(data.flow || 'ropc');
                }
            }
        } catch (err) {
            console.error(err);
        }
        setGraphConfigOpen(true);
    };

    const handleSaveGraphConfig = async () => {
        try {
            const res = await apiRequest('/dashboard/api/emails/save-graph-config/', {
                method: 'POST',
                body: JSON.stringify({
                    client_id: graphClientId.trim(),
                    client_secret: graphClientSecret.trim(),
                    tenant_id: graphTenantId.trim() || 'common',
                    flow: graphAuthFlow
                })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                alert(data.message || 'Lưu cấu hình thành công!');
                setGraphConfigOpen(false);
            } else {
                alert('Lỗi: ' + (data.message || 'Không thể lưu cấu hình.'));
            }
        } catch (err) {
            alert('Lỗi lưu cấu hình.');
        }
    };

    // Bulk delete
    const deleteSelectedEmails = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Bạn có chắc muốn xóa ${selectedIds.length} email đã chọn?`)) return;

        try {
            await Promise.all(selectedIds.map(id => {
                return apiRequest(`/dashboard/api/emails/${id}/`, {
                    method: 'DELETE'
                });
            }));
            alert('Đã xóa email thành công!');
            setSelectedIds([]);
            fetchEmails();
        } catch (err) {
            alert('Lỗi khi xóa emails.');
        }
    };

    // Bulk status update
    const saveBulkEmailStatus = async () => {
        try {
            const resp = await apiRequest('/dashboard/api/emails/bulk-status/', {
                method: 'POST',
                body: JSON.stringify({
                    ids: selectedIds,
                    status: bulkStatusVal
                })
            });
            const data = await resp.json();
            if (resp.ok && data.success) {
                alert(data.message || 'Cập nhật trạng thái thành công!');
                setBulkStatusOpen(false);
                setSelectedIds([]);
                fetchEmails();
            } else {
                alert('Thất bại: ' + (data.message || 'Không thể cập nhật.'));
            }
        } catch (err) {
            alert('Lỗi kết nối.');
        }
    };

    // Bulk assign owner
    const saveBulkAssignOwner = async () => {
        setBulkAssignLoading(true);
        try {
            const resp = await apiRequest('/dashboard/api/emails/bulk-assign/', {
                method: 'POST',
                body: JSON.stringify({
                    email_ids: selectedIds,
                    owner_id: bulkAssignOwner ? parseInt(bulkAssignOwner) : null
                })
            });
            if (resp.ok) {
                alert(`Đã gán sở hữu thành công cho ${selectedIds.length} email.`);
                setBulkAssignOpen(false);
                setSelectedIds([]);
                fetchEmails();
            } else {
                const err = await resp.json();
                alert(`Lỗi gán sở hữu: ${err.message || 'Không rõ nguyên nhân'}`);
            }
        } catch (err) {
            alert('Lỗi kết nối.');
        } finally {
            setBulkAssignLoading(false);
        }
    };

    // Add Emails (Supports single + bulk text parsing)
    const handleOpenAddModal = () => {
        setAddBulkText('');
        setAddAddress('');
        setAddPassword('');
        setAddProxy('');
        setAddSocks5('');
        setAddNote('');
        setAddOwner('');
        setAddOpen(true);
    };

    const saveAddEmail = async () => {
        const bulk = addBulkText.trim();
        const ownerVal = currentUser.is_staff ? addOwner : '';

        if (bulk) {
            const lines = bulk.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            const list_emails = [];

            lines.forEach(l => {
                const parts = l.split('|');
                if (parts.length >= 2) {
                    const emailPayload = {
                        email: parts[0].trim(),
                        password: parts[1].trim(),
                        refresh_token: parts[2] ? parts[2].trim() : '',
                        client_id: parts[3] ? parts[3].trim() : ''
                    };
                    if (ownerVal) {
                        emailPayload.owner = ownerVal;
                    }
                    list_emails.push(emailPayload);
                }
            });

            if (list_emails.length === 0) {
                alert('Định dạng bulk import không đúng. Vui lòng nhập: email|password hoặc email|password|token');
                return;
            }

            setAddLoading(true);
            try {
                const responses = await Promise.all(list_emails.map(payload => {
                    return apiRequest('/dashboard/api/emails/', {
                        method: 'POST',
                        body: JSON.stringify(payload)
                    });
                }));
                const created = [];
                for (const resp of responses) {
                    if (resp.ok) {
                        const data = await resp.json();
                        created.push(data);
                    }
                }
                setAddOpen(false);
                alert(`Đã nhập bulk thành công ${created.length} emails!`);
                fetchEmails();
            } catch (err) {
                alert('Lỗi khi nhập bulk.');
            } finally {
                setAddLoading(false);
            }
        } else {
            if (!addAddress || !addPassword) {
                alert('Vui lòng nhập Email và Mật khẩu.');
                return;
            }
            setAddLoading(true);
            try {
                const payload = {
                    email: addAddress.trim(),
                    password: addPassword.trim(),
                    proxy: addProxy.trim(),
                    socks5: addSocks5.trim(),
                    note: addNote.trim()
                };
                if (ownerVal) {
                    payload.owner = ownerVal;
                }
                const resp = await apiRequest('/dashboard/api/emails/', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                if (resp.ok) {
                    const data = await resp.json();
                    setAddOpen(false);
                    alert('Thêm email thành công!');
                    fetchEmails();
                } else {
                    const err = await resp.json();
                    alert('Lỗi: ' + JSON.stringify(err));
                }
            } catch (err) {
                alert('Lỗi kết nối.');
            } finally {
                setAddLoading(false);
            }
        }
    };

    // Edit Email Modal
    const handleOpenEditModal = async () => {
        if (selectedIds.length !== 1) return;
        const target = emails.find(e => e.id === selectedIds[0]);
        if (!target) return;

        setEditId(target.id);
        setEditAddress(target.email);
        setEditPassword(target.password);
        setEditProxy(target.proxy || '');
        setEditSocks5(target.socks5 || '');
        setEditUsed(target.used || false);
        setEditStatus(target.status !== undefined ? target.status : 0);
        setEditNote(target.note || '');

        const clientObj = clients.find(u => u.username === target.owner);
        setEditOwner(clientObj ? clientObj.id : '');
        setEditOpen(true);
    };

    const saveEditEmail = async () => {
        try {
            const payload = {
                email: editAddress.trim(),
                password: editPassword.trim(),
                proxy: editProxy.trim(),
                socks5: editSocks5.trim(),
                used: editUsed,
                status: parseInt(editStatus),
                note: editNote.trim()
            };
            if (currentUser.is_staff) {
                payload.owner = editOwner;
            }

            const resp = await apiRequest(`/dashboard/api/emails/${editId}/`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            if (resp.ok) {
                setEditOpen(false);
                setSelectedIds([]);
                alert('Lưu thay đổi thành công!');
                fetchEmails();
            } else {
                const err = await resp.json();
                alert('Lỗi: ' + JSON.stringify(err));
            }
        } catch (err) {
            alert('Lỗi kết nối.');
        }
    };

    // Bulk Read Mailbox (Microsoft Graph client-side implementation)
    const handleOpenBulkRead = () => {
        let lines = [];
        if (selectedIds.length > 0) {
            selectedIds.forEach(id => {
                const target = emails.find(x => x.id === id);
                if (target) {
                    let line = `${target.email}|${target.password}`;
                    if (target.refresh_token) {
                        line += `|${target.refresh_token}`;
                        if (target.client_id) {
                            line += `|${target.client_id}`;
                        }
                    }
                    lines.push(line);
                }
            });
        }
        setBulkMailInput(lines.join('\n'));
        setBulkAccountsStatus({});
        setBulkAccountsColor({});
        setBulkStatusSummary('Chưa quét tài khoản nào. Nhập tài khoản ở trên và ấn Quét.');
        setBulkEmailsList([]);
        setBulkActiveEmailsList([]);
        setActiveBulkMail(null);
        setBulkReadOpen(true);
    };

    const runBulkMailboxRead = async () => {
        const raw = bulkMailInput.trim();
        if (!raw) {
            alert('Vui lòng nhập danh sách tài khoản.');
            return;
        }

        const lines = raw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const accounts = [];

        lines.forEach((l, idx) => {
            const parts = l.split('|');
            if (parts.length >= 2) {
                const email = parts[0].trim();
                const password = parts[1].trim();
                const refresh_token = parts[2] ? parts[2].trim() : '';
                const client_id = parts[3] ? parts[3].trim() : '';
                if (email) {
                    accounts.push({ email, password, refresh_token, client_id, index: idx });
                }
            }
        });

        if (accounts.length === 0) {
            alert('Định dạng tài khoản không hợp lệ. Vui lòng nhập: email|password hoặc email|password|token');
            return;
        }

        // Reset state
        const initialStatus = {};
        const initialColor = {};
        accounts.forEach(acc => {
            initialStatus[acc.email] = '🔄 Đang chờ...';
            initialColor[acc.email] = 'var(--text-muted)';
        });
        setBulkAccountsStatus(initialStatus);
        setBulkAccountsColor(initialColor);
        setBulkStatusSummary(`Bắt đầu quét ${accounts.length} tài khoản...`);
        setBulkEmailsList([]);
        setBulkActiveEmailsList([]);
        setActiveBulkMail(null);

        let successCount = 0;
        let failCount = 0;
        let collectedEmails = [];

        for (const acc of accounts) {
            const updateStatus = (msg, color) => {
                setBulkAccountsStatus(prev => ({ ...prev, [acc.email]: msg }));
                setBulkAccountsColor(prev => ({ ...prev, [acc.email]: color }));
            };

            updateStatus('🔄 Đang đồng bộ DB...', 'var(--accent)');
            
            try {
                // Ensure email exists in Django backend
                const ensureResp = await apiRequest('/dashboard/api/emails/ensure-email/', {
                    method: 'POST',
                    body: JSON.stringify(acc)
                });
                
                if (!ensureResp.ok) {
                    throw new Error("Không thể khởi tạo email record");
                }
                
                const ensureData = await ensureResp.json();
                if (!ensureData.success) {
                    throw new Error(ensureData.message || "Lỗi lưu email record");
                }
                
                const emailObj = ensureData.email_data;
                const emailId = emailObj.id;

                updateStatus('🔑 Đang đọc hộp thư...', 'var(--accent)');

                const readData = await readMailboxClientSide(emailId, emailObj);
                if (readData.success) {
                    successCount++;
                    const mails = readData.emails || [];
                    updateStatus(`✅ Thành công (${mails.length} thư)`, 'var(--success)');
                    
                    mails.forEach(m => {
                        collectedEmails.push({
                            ...m,
                            sourceEmail: acc.email
                        });
                    });
                } else {
                    throw new Error(readData.message || "Lỗi đọc hộp thư");
                }
            } catch (err) {
                failCount++;
                updateStatus(`❌ ${err.message || 'Thất bại'}`, 'var(--danger)');
            }

            setBulkStatusSummary(`Đang quét: ${successCount + failCount}/${accounts.length} (Thành công: ${successCount} | Thất bại: ${failCount})`);
        }

        setBulkStatusSummary(`Đã hoàn thành! Thành công: ${successCount}/${accounts.length} | Thất bại: ${failCount}`);
        
        // Sort combined emails by date
        collectedEmails.sort((a, b) => new Date(b.date) - new Date(a.date));
        setBulkEmailsList(collectedEmails);
        setBulkActiveEmailsList(collectedEmails);

        // Reload main table
        fetchEmails();
    };

    const handleFilterBulkMails = (q) => {
        setBulkSearchQuery(q);
        const queryLower = q.trim().toLowerCase();
        if (!queryLower) {
            setBulkActiveEmailsList(bulkEmailsList);
        } else {
            setBulkActiveEmailsList(bulkEmailsList.filter(mail => {
                return mail.from.toLowerCase().includes(queryLower) ||
                       mail.subject.toLowerCase().includes(queryLower) ||
                       mail.snippet.toLowerCase().includes(queryLower) ||
                       (mail.body && mail.body.toLowerCase().includes(queryLower)) ||
                       mail.sourceEmail.toLowerCase().includes(queryLower);
            }));
        }
    };

    // Highlight search keywords or highlight OTP numbers
    const formatSnippet = (snippet) => {
        if (!snippet) return '';
        const otpRegex = /\b\d{4,8}\b/g;
        // Replace regex numbers with JSX or inline styles
        const parts = snippet.split(otpRegex);
        const matches = snippet.match(otpRegex) || [];
        return (
            <span>
                {parts.map((p, idx) => (
                    <React.Fragment key={idx}>
                        {p}
                        {matches[idx] && (
                            <strong style={{ color: 'var(--accent)', fontSize: '13px', background: 'rgba(99,102,241,0.2)', padding: '1px 4px', borderRadius: '3px' }}>
                                {matches[idx]}
                            </strong>
                        )}
                    </React.Fragment>
                ))}
            </span>
        );
    };

    const formatDetailBody = (bodyStr) => {
        if (!bodyStr) return '';
        const linkRegex = /(https?:\/\/[^\s]+)/g;
        const otpRegex = /\b\d{4,8}\b/g;

        // Simple formatter
        let formatted = bodyStr;
        
        // For HTML display, we render via iframe in DOM
        return formatted;
    };

    // Trigger adding email back to systems account (standard action button)
    const addEmailToSystem = async (e, emailId) => {
        if (e) e.stopPropagation();
        if (!confirm('Bạn có chắc chắn muốn thêm email này vào hệ thống tài khoản?')) {
            return;
        }
        try {
            const resp = await apiRequest(`/dashboard/api/emails/${emailId}/add-to-system/`, {
                method: 'POST'
            });
            const data = await resp.json();
            if (resp.ok && data.success) {
                alert(data.message || 'Thành công!');
                fetchEmails();
            } else {
                alert('Lỗi: ' + (data.message || 'Không thể thêm tài khoản.'));
            }
        } catch (err) {
            alert('Lỗi kết nối.');
        }
    };

    // Pagination Calculations
    const fromVal = count === 0 ? 0 : (page - 1) * pageSize + 1;
    const toVal = Math.min(page * pageSize, count);
    const prevDisabled = page <= 1;
    const nextDisabled = page * pageSize >= count;

    return (
        <div>
            <div className="control-bar">
                <div className="control-filters">
                    <div className="search-box">
                        <input 
                            type="text" 
                            className="search-input" 
                            placeholder="Tìm kiếm Email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select className="filter-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="">Tất cả trạng thái</option>
                        <option value="0">Hoạt động (Active)</option>
                        <option value="1">Chưa kích hoạt (Email Not Activated)</option>
                        <option value="2">Bị khóa (Banned)</option>
                        <option value="3">Tạm thời (Temporary)</option>
                        <option value="4">Sub OK</option>
                        <option value="5">Sub Lỗi</option>
                        <option value="6">Đang sử dụng</option>
                    </select>

                    {currentUser.is_staff && (
                        <>
                            <select className="filter-select" value={owner} onChange={(e) => setOwner(e.target.value)}>
                                <option value="all">Tất cả chủ sở hữu</option>
                                <option value="unassigned">Chưa chỉ định</option>
                                {clients.map(u => (
                                    <option key={u.id} value={u.username}>{u.username}</option>
                                ))}
                            </select>

                            <select className="filter-select" value={createdBy} onChange={(e) => setCreatedBy(e.target.value)}>
                                <option value="all">Tất cả người tạo</option>
                                {clients.map(u => (
                                    <option key={u.id} value={u.username}>{u.username}</option>
                                ))}
                            </select>
                        </>
                    )}

                    <select className="filter-select" value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value)); onPageChange(1); }}>
                        <option value={10}>10 dòng</option>
                        <option value={20}>20 dòng</option>
                        <option value={50}>50 dòng</option>
                        <option value={100}>100 dòng</option>
                    </select>
                </div>
                <div className="action-buttons">
                    <button className="btn btn-secondary" onClick={fetchEmails}>Làm mới</button>
                    <button className="btn btn-primary" onClick={handleOpenAddModal}>Thêm Email</button>
                    <button className="btn btn-primary" onClick={handleOpenEditModal} disabled={selectedIds.length !== 1}>Sửa</button>
                    {currentUser.is_staff && (
                        <button className="btn btn-primary" onClick={() => setBulkAssignOpen(true)} disabled={selectedIds.length === 0}>Sở hữu</button>
                    )}
                    <button className="btn btn-danger" onClick={deleteSelectedEmails} disabled={selectedIds.length === 0}>Xóa</button>
                    <button className="btn btn-warning" onClick={() => setBulkStatusOpen(true)} disabled={selectedIds.length === 0}>Đổi trạng thái</button>
                    <button className="btn btn-warning" onClick={handleOpenBulkRead}>Đọc mail số lượng lớn</button>
                    <button className="btn btn-secondary" onClick={handleOpenGraphConfig}>Cấu hình Graph API</button>
                </div>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: '50px', textAlign: 'center' }}>
                                <input 
                                    type="checkbox" 
                                    className="table-chk"
                                    checked={emails.length > 0 && selectedIds.length === emails.length}
                                    onChange={toggleSelectAll}
                                />
                            </th>
                            <th>Email</th>
                            <th>Mật khẩu</th>
                            <th>Tạo bởi</th>
                            <th>Sở hữu bởi</th>
                            <th style={{ width: '120px', textAlign: 'center' }}>Trạng thái</th>
                            <th>From</th>
                            <th>Time</th>
                            <th>Content</th>
                            <th style={{ textAlign: 'center', width: '120px' }}>Code</th>
                            <th style={{ width: '150px', textAlign: 'center' }}>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="11" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                    Đang tải danh sách email...
                                </td>
                            </tr>
                        ) : emails.length === 0 ? (
                            <tr>
                                <td colSpan="11" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                    Không tìm thấy email nào.
                                </td>
                            </tr>
                        ) : (
                            emails.map((e, index) => {
                                const isRefreshing = refreshingRows[e.id];
                                
                                return (
                                    <tr key={e.id} className={selectedIds.includes(e.id) ? 'row-selected' : ''} onClick={() => handleSelectRow(e.id)} style={{ cursor: 'pointer' }}>
                                        <td style={{ textAlign: 'center' }} onClick={(ev) => ev.stopPropagation()}>
                                            <input 
                                                type="checkbox" 
                                                className="table-chk" 
                                                checked={selectedIds.includes(e.id)}
                                                onChange={() => handleSelectRow(e.id)}
                                            />
                                        </td>
                                        <td style={{ fontWeight: 600 }}>
                                            {e.email}
                                            {e.created_accounts && e.created_accounts.map((lbl, idx) => (
                                                <span key={idx} className="badge" style={{ marginLeft: '5px', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#10b981', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                                    {lbl}
                                                </span>
                                            ))}
                                        </td>
                                        <td><code>{e.password}</code></td>
                                        <td style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>{e.created_by || '-'}</td>
                                        <td style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>{e.owner || '-'}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`badge ${getEmailStatusBadgeClass(e.status)}`}>
                                                {getEmailStatusLabel(e.status)}
                                            </span>
                                        </td>
                                        <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.latest_from || ''}>
                                            {e.latest_from || '-'}
                                        </td>
                                        <td style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                            {e.latest_time || '-'}
                                        </td>
                                        <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.latest_content || ''}>
                                            {e.latest_content || '-'}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            {isRefreshing ? (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>🔄 Đang quét...</span>
                                            ) : e.latest_code ? (
                                                <strong style={{ color: '#ffb703', background: 'rgba(255, 183, 3, 0.15)', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', fontWeight: '800', border: '1px solid rgba(255,183,3,0.3)', fontFamily: 'monospace' }}>
                                                    {e.latest_code}
                                                </strong>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)' }}>-</span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center' }} onClick={(ev) => ev.stopPropagation()}>
                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                <button className="btn btn-primary" onClick={(ev) => openReadMailModal(ev, e)} style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 'bold' }}>
                                                    Đọc Mail
                                                </button>
                                                <button className="btn btn-secondary" onClick={(ev) => refreshSingleEmailRow(e.id, e)} style={{ padding: '4px 8px', fontSize: '11px' }}>
                                                    Scan
                                                </button>
                                                {!e.created_accounts?.length && (
                                                    <button className="btn btn-success" onClick={(ev) => addEmailToSystem(ev, e.id)} style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 'bold' }} title="Thêm vào hệ thống tài khoản">
                                                        ➕
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <Pagination 
                infoText={`Hiển thị ${fromVal} - ${toVal} của ${count}`}
                onPrev={() => onPageChange(page - 1)}
                onNext={() => onPageChange(page + 1)}
                prevDisabled={prevDisabled}
                nextDisabled={nextDisabled}
            />

            {/* 1. Add Email Modal */}
            {addOpen && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-box modal-large">
                        <div className="modal-header">
                            <h3>Thêm Email Mới / Nhập Bulk</h3>
                            <button className="modal-close" onClick={() => setAddOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Nhập bulk (Định dạng: <code>email|password</code> hoặc <code>email|password|token</code>, mỗi dòng 1 email)</label>
                                <textarea 
                                    className="form-textarea" 
                                    placeholder="katherine7wn4lfpoling@hotmail.com|On7wzi108LoO|M.C509_...&#10;another_user@gmail.com|pass123"
                                    value={addBulkText}
                                    onChange={(e) => setAddBulkText(e.target.value)}
                                ></textarea>
                            </div>
                            <div style={{ textAlign: 'center', margin: '10px 0', fontSize: '13px', color: 'var(--text-muted)' }}>Hoặc điền thủ công 1 email bên dưới</div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input type="email" className="form-input" value={addAddress} onChange={(e) => setAddAddress(e.target.value)} placeholder="example@gmail.com" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Mật khẩu</label>
                                    <input type="text" className="form-input" value={addPassword} onChange={(e) => setAddPassword(e.target.value)} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Proxy (HTTP)</label>
                                    <input type="text" className="form-input" value={addProxy} onChange={(e) => setAddProxy(e.target.value)} placeholder="127.0.0.1:8080" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Socks5 Proxy</label>
                                    <input type="text" className="form-input" value={addSocks5} onChange={(e) => setAddSocks5(e.target.value)} placeholder="socks5://127.0.0.1:1080" />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ghi chú</label>
                                <input type="text" className="form-input" value={addNote} onChange={(e) => setAddNote(e.target.value)} placeholder="Ghi chú thêm..." />
                            </div>
                            {currentUser.is_staff && (
                                <div className="form-group" style={{ marginTop: '12px' }}>
                                    <label className="form-label">Sở hữu bởi (Owner)</label>
                                    <select className="filter-select" style={{ width: '100%' }} value={addOwner} onChange={(e) => setAddOwner(e.target.value)}>
                                        <option value="">-- Không chỉ định --</option>
                                        {clients.map(u => (
                                            <option key={u.id} value={u.id}>{u.username}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setAddOpen(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={saveAddEmail} disabled={addLoading}>
                                {addLoading ? 'Đang xử lý...' : 'Thêm email'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Edit Email Modal */}
            {editOpen && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>Chỉnh sửa Email</h3>
                            <button className="modal-close" onClick={() => setEditOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input type="email" className="form-input" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Mật khẩu</label>
                                    <input type="text" className="form-input" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Proxy</label>
                                    <input type="text" className="form-input" value={editProxy} onChange={(e) => setEditProxy(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Socks5</label>
                                    <input type="text" className="form-input" value={editSocks5} onChange={(e) => setEditSocks5(e.target.value)} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group" style={{ flexDirection: 'row', gap: '8px', alignItems: 'center', marginTop: '20px' }}>
                                    <input type="checkbox" id="editEmailUsed" className="table-chk" checked={editUsed} onChange={(e) => setEditUsed(e.target.checked)} />
                                    <label htmlFor="editEmailUsed" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>Đã sử dụng (Used)</label>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Trạng thái</label>
                                    <select className="filter-select" style={{ width: '100%' }} value={editStatus} onChange={(e) => setEditStatus(e.target.value)}>
                                        <option value="0">Hoạt động (Active)</option>
                                        <option value="1">Chưa kích hoạt (Email Not Activated)</option>
                                        <option value="2">Bị khóa (Banned)</option>
                                        <option value="3">Tạm thời (Temporary)</option>
                                        <option value="4">Sub OK</option>
                                        <option value="5">Sub Lỗi</option>
                                        <option value="6">Đang sử dụng</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ghi chú</label>
                                <input type="text" className="form-input" value={editNote} onChange={(e) => setEditNote(e.target.value)} />
                            </div>
                            {currentUser.is_staff && (
                                <div className="form-group" style={{ marginTop: '12px' }}>
                                    <label className="form-label">Sở hữu bởi (Owner)</label>
                                    <select className="filter-select" style={{ width: '100%' }} value={editOwner} onChange={(e) => setEditOwner(e.target.value)}>
                                        <option value="">-- Không chỉ định --</option>
                                        {clients.map(u => (
                                            <option key={u.id} value={u.id}>{u.username}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setEditOpen(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={saveEditEmail}>Lưu thay đổi</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. Bulk Status Modal */}
            {bulkStatusOpen && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>Đổi Trạng Thái Email Số Lượng Lớn</h3>
                            <button className="modal-close" onClick={() => setBulkStatusOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Chọn trạng thái mới</label>
                                <select className="filter-select" style={{ width: '100%' }} value={bulkStatusVal} onChange={(e) => setBulkStatusVal(parseInt(e.target.value))}>
                                    <option value="0">Hoạt động (Active)</option>
                                    <option value="1">Chưa kích hoạt (Email Not Activated)</option>
                                    <option value="2">Bị khóa (Banned)</option>
                                    <option value="3">Tạm thời (Temporary)</option>
                                    <option value="4">Sub OK</option>
                                    <option value="5">Sub Lỗi</option>
                                    <option value="6">Đang sử dụng</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setBulkStatusOpen(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={saveBulkEmailStatus}>Xác nhận</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. Bulk Assign Owner Modal */}
            {bulkAssignOpen && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>Gán sở hữu email hàng loạt</h3>
                            <button className="modal-close" onClick={() => setBulkAssignOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Đang chọn {selectedIds.length} email</label>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Chỉ định sở hữu bởi</label>
                                <select className="filter-select" style={{ width: '100%' }} value={bulkAssignOwner} onChange={(e) => setBulkAssignOwner(e.target.value)}>
                                    <option value="">-- Không chỉ định --</option>
                                    {clients.map(u => (
                                        <option key={u.id} value={u.id}>{u.username}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setBulkAssignOpen(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={saveBulkAssignOwner} disabled={bulkAssignLoading}>
                                {bulkAssignLoading ? 'Đang xử lý...' : 'Gán sở hữu'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 5. Graph Configuration Modal */}
            {graphConfigOpen && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-box" style={{ maxWidth: '500px', width: '90%' }}>
                        <div className="modal-header">
                            <h3>Cấu Hình Microsoft Graph API</h3>
                            <button className="modal-close" onClick={() => setGraphConfigOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body" style={{ padding: '20px' }}>
                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label className="form-label" style={{ fontWeight: 600 }}>Azure AD App Client ID (Application ID)</label>
                                <input type="text" className="form-input" value={graphClientId} onChange={(e) => setGraphClientId(e.target.value)} placeholder="Nhập Client ID..." style={{ width: '100%' }} />
                            </div>
                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label className="form-label" style={{ fontWeight: 600 }}>Azure AD App Client Secret</label>
                                <input type="password" className="form-input" value={graphClientSecret} onChange={(e) => setGraphClientSecret(e.target.value)} placeholder="Nhập Client Secret..." style={{ width: '100%' }} />
                            </div>
                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label className="form-label" style={{ fontWeight: 600 }}>Tenant ID</label>
                                <input type="text" className="form-input" value={graphTenantId} onChange={(e) => setGraphTenantId(e.target.value)} placeholder="Mặc định: common..." style={{ width: '100%' }} />
                            </div>
                            <div className="form-group" style={{ marginBottom: '15px' }}>
                                <label className="form-label" style={{ fontWeight: 600 }}>Luồng Authentication (Flow Type)</label>
                                <select className="filter-select" style={{ width: '100%', height: '38px' }} value={graphAuthFlow} onChange={(e) => setGraphAuthFlow(e.target.value)}>
                                    <option value="ropc">ROPC Flow (Đăng nhập bằng Email + Mật khẩu tài khoản)</option>
                                    <option value="client_credentials">Client Credentials Flow (Quyền ứng dụng Mail.Read)</option>
                                </select>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.4, marginTop: '10px' }}>
                                * Lưu ý: ROPC yêu cầu tắt MFA trên tài khoản Email và kích hoạt "Allow public client flows" trong Azure App Registration. Client Credentials yêu cầu cấp quyền Mail.Read và Admin Consent trên Tenant của Azure.
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setGraphConfigOpen(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleSaveGraphConfig}>Lưu Cấu Hình</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 6. Single Mailbox Reader Modal */}
            {readMailOpen && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-box modal-large" style={{ maxWidth: '850px', width: '90%' }}>
                        <div className="modal-header">
                            <h3>Hộp Thư Email: <span style={{ color: 'var(--accent)' }}>{readTargetAddress}</span></h3>
                            <button className="modal-close" onClick={() => setReadMailOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '80vh', overflowY: 'auto', padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Hiển thị tối đa 15 email mới nhất từ Inbox</span>
                                <button className="btn btn-primary" onClick={() => loadMailbox(readTargetId, null)} style={{ padding: '6px 12px', fontSize: '13px' }}>🔄 Tải lại</button>
                            </div>

                            {mailboxLoading && (
                                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                    <div className="spinner" style={{ display: 'inline-block', width: '32px', height: '32px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '12px' }}></div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Đang kết nối IMAP server và tải email, vui lòng đợi...</p>
                                </div>
                            )}

                            {mailboxError && (
                                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px 16px', borderRadius: '6px', color: 'var(--danger)', fontSize: '13px', marginBottom: '12px', wordBreak: 'break-all' }}>
                                    {mailboxError}
                                </div>
                            )}

                            {!mailboxLoading && !mailboxError && (
                                <div className="table-container" style={{ maxHeight: '250px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', marginBottom: '16px', background: 'rgba(30, 41, 59, 0.2)' }}>
                                    <table style={{ margin: 0, width: '100%' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ width: '25%', textAlign: 'left' }}>Người gửi</th>
                                                <th style={{ width: '55%', textAlign: 'left' }}>Tiêu đề / Nội dung ngắn</th>
                                                <th style={{ width: '20%', textAlign: 'center' }}>Thời gian</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {mailboxEmails.length === 0 ? (
                                                <tr>
                                                    <td colSpan="3" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
                                                        Hộp thư trống hoặc chưa được tải.
                                                    </td>
                                                </tr>
                                            ) : (
                                                mailboxEmails.map((mail, index) => {
                                                    const fromName = mail.from.split('<')[0].replace(/"/g, '').trim() || mail.from;
                                                    const isActive = activeMailIndex === index;

                                                    return (
                                                        <tr 
                                                            key={index} 
                                                            onClick={() => setActiveMailIndex(index)}
                                                            style={{ cursor: 'pointer', background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent' }}
                                                        >
                                                            <td style={{ fontWeight: 500, fontSize: '12px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                {fromName}
                                                            </td>
                                                            <td style={{ fontSize: '12px' }}>
                                                                <div style={{ fontWeight: 600, color: 'var(--text-color)', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    {mail.subject || '(Không có tiêu đề)'}
                                                                </div>
                                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                    {mail.snippet}
                                                                </div>
                                                            </td>
                                                            <td style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                                                {mail.date}
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: 'var(--accent)' }}>Chi tiết Email</h4>
                                <div style={{ padding: '14px', background: 'rgba(15, 23, 42, 0.4)', borderRadius: '6px', border: '1px solid var(--border-color)', minHeight: '150px', maxHeight: '380px', overflowY: 'auto', fontSize: '13px', lineHeight: 1.6 }}>
                                    {activeMailIndex !== null && mailboxEmails[activeMailIndex] ? (
                                        mailboxEmails[activeMailIndex].body && (mailboxEmails[activeMailIndex].body.includes('<html') || mailboxEmails[activeMailIndex].body.includes('<body') || mailboxEmails[activeMailIndex].body.includes('<div')) ? (
                                            <iframe 
                                                title="Mail Detail"
                                                srcDoc={mailboxEmails[activeMailIndex].body}
                                                style={{ width: '100%', height: '350px', border: 'none', borderRadius: '6px', background: '#ffffff' }}
                                            />
                                        ) : (
                                            <pre style={{ margin: 0, fontFamily: 'inherit', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                                {mailboxEmails[activeMailIndex].body || mailboxEmails[activeMailIndex].snippet}
                                            </pre>
                                        )
                                    ) : (
                                        'Chọn một email ở trên để xem nội dung chi tiết.'
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setReadMailOpen(false)}>Đóng</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 7. Bulk Read Mail Modal */}
            {bulkReadOpen && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-box modal-large" style={{ maxWidth: '1000px', width: '95%' }}>
                        <div className="modal-header">
                            <h3>Đọc Mail Số Lượng Lớn (Microsoft Graph API & IMAP)</h3>
                            <button className="modal-close" onClick={() => setBulkReadOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '85vh', overflowY: 'auto', padding: '20px' }}>
                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <label className="form-label" style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                                    Nhập danh sách tài khoản (định dạng: <code>email|password</code> hoặc <code>email|password|token</code>, mỗi dòng 1 tài khoản):
                                </label>
                                <textarea 
                                    className="form-textarea" 
                                    rows="6" 
                                    placeholder="Ví dụ:&#10;katherine7wn4lfpoling@hotmail.com|On7wzi108LoO|M.C509_...|9e5f94bc-e8a4-4e73-b8be-63364c29d753" 
                                    style={{ width: '100%', fontFamily: 'monospace', fontSize: '13px', resize: 'vertical' }}
                                    value={bulkMailInput}
                                    onChange={(e) => setBulkMailInput(e.target.value)}
                                ></textarea>
                            </div>

                            <div style={{ marginBottom: '16px', background: 'rgba(30, 41, 59, 0.3)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px' }}>
                                <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Trạng thái kết nối các tài khoản:</span>
                                    <span style={{ color: 'var(--accent)' }}>{bulkStatusSummary}</span>
                                </h4>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '120px', overflowY: 'auto' }}>
                                    {Object.keys(bulkAccountsStatus).map((email, idx) => (
                                        <div key={idx} style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '4px 10px', borderRadius: '4px', fontSize: '12px', border: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontWeight: 500 }}>{email}</span>: 
                                            <span style={{ color: bulkAccountsColor[email] }}>{bulkAccountsStatus[email]}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', alignItems: 'center' }}>
                                <div className="search-box" style={{ flex: 1 }}>
                                    <input 
                                        type="text" 
                                        className="search-input" 
                                        placeholder="Tìm kiếm OTP, mã code hoặc nội dung thư..." 
                                        style={{ width: '100%' }} 
                                        value={bulkSearchQuery}
                                        onChange={(e) => handleFilterBulkMails(e.target.value)}
                                    />
                                </div>
                                <button className="btn btn-primary" onClick={runBulkMailboxRead} style={{ padding: '8px 16px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                    ⚡ Đọc mail
                                </button>
                            </div>

                            <div className="bulk-mail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                {/* Left List: Message list */}
                                <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', background: 'rgba(15, 23, 42, 0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                    <div style={{ padding: '10px', fontWeight: 'bold', borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)', fontSize: '13px' }}>
                                        Danh sách thư nhận được
                                    </div>
                                    <div style={{ flex: 1, overflowY: 'auto', maxHeight: '400px' }}>
                                        <table style={{ margin: 0, width: '100%' }}>
                                            <tbody>
                                                {bulkActiveEmailsList.length === 0 ? (
                                                    <tr>
                                                        <td style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '30px' }}>
                                                            Hộp thư trống hoặc chưa có thư nào.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    bulkActiveEmailsList.map((mail, index) => {
                                                        const fromClean = mail.from.split('<')[0].replace(/"/g, '').trim() || mail.from;
                                                        const isActive = activeBulkMail === mail;
                                                        
                                                        return (
                                                            <tr 
                                                                key={index} 
                                                                style={{ cursor: 'pointer', background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent', borderBottom: '1px solid var(--border-color)' }}
                                                                onClick={() => setActiveBulkMail(mail)}
                                                            >
                                                                <td style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                                                                        <span style={{ fontWeight: 600, color: 'var(--accent)', maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mail.sourceEmail}</span>
                                                                        <span>{mail.date}</span>
                                                                    </div>
                                                                    <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-color)', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                                        {fromClean} &bull; {mail.subject}
                                                                    </div>
                                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.4', maxHeight: '32px', overflow: 'hidden' }}>
                                                                        {formatSnippet(mail.snippet)}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Right Detail Box: Full body content */}
                                <div style={{ border: '1px solid var(--border-color)', borderRadius: '6px', background: 'rgba(15, 23, 42, 0.4)', display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '14px' }}>
                                    <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px', color: 'var(--accent)' }}>
                                        {activeBulkMail ? activeBulkMail.subject : 'Chọn thư để xem chi tiết'}
                                    </h4>
                                    {activeBulkMail && (
                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                                            <div><strong>Tài khoản nhận:</strong> {activeBulkMail.sourceEmail}</div>
                                            <div><strong>Người gửi:</strong> {activeBulkMail.from}</div>
                                            <div><strong>Thời gian nhận:</strong> {activeBulkMail.date}</div>
                                        </div>
                                    )}
                                    <div style={{ flex: 1, minHeight: '300px', maxHeight: '400px', overflowY: 'auto', fontSize: '13px', lineHeight: 1.6 }}>
                                        {activeBulkMail ? (
                                            activeBulkMail.body && (activeBulkMail.body.includes('<html') || activeBulkMail.body.includes('<body') || activeBulkMail.body.includes('<div') || activeBulkMail.body.includes('<table')) ? (
                                                <iframe 
                                                    title="Bulk Mail Detail"
                                                    srcDoc={activeBulkMail.body}
                                                    style={{ width: '100%', height: '360px', border: 'none', borderRadius: '6px', background: '#ffffff' }}
                                                />
                                            ) : (
                                                <pre style={{ margin: 0, fontFamily: 'inherit', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                                    {activeBulkMail.body || activeBulkMail.snippet}
                                                </pre>
                                            )
                                        ) : (
                                            'Chọn một thư từ danh sách bên trái để mở rộng xem toàn bộ mã OTP hoặc link kích hoạt.'
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setBulkReadOpen(false)}>Đóng</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
