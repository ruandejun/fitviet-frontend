import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import Pagination from '../components/Pagination';
import SearchableSelect from '../components/SearchableSelect';

const getAccountStatusBadgeClass = (status) => {
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

const getAccountStatusLabel = (status) => {
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

const formatDateString = (str) => {
    if (!str) return '-';
    try {
        const d = new Date(str);
        return d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN');
    } catch {
        return str;
    }
};

export default function Accounts({ currentUser, page, onPageChange }) {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [count, setCount] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    // ── Multi-Card Automation Modal State ──
    const [showMultiCardModal, setShowMultiCardModal] = useState(false);
    const [multiCardLoading, setMultiCardLoading] = useState(false);
    const [multiCardMessage, setMultiCardMessage] = useState('');
    const [multiCardCount, setMultiCardCount] = useState(1);
    const [multiCardAccount, setMultiCardAccount] = useState(null);
    const [availableCards, setAvailableCards] = useState([]);
    const [selectedCardIds, setSelectedCardIds] = useState([]);
    const [multiCardProxy, setMultiCardProxy] = useState('');

    const openMultiCardModal = async (acc) => {
        setMultiCardAccount(acc);
        setMultiCardProxy(acc.proxy || '');
        setMultiCardMessage('🔍 Đang tải danh sách thẻ chưa sử dụng...');
        setMultiCardLoading(true);
        setShowMultiCardModal(true);
        setAvailableCards([]);
        setSelectedCardIds([]);
        setMultiCardCount(1);
        
        try {
            const res = await apiRequest('/dashboard/api/cards/?status=Chưa sử dụng&page_size=100');
            if (res.ok) {
                const data = await res.json();
                const cardsList = data.results || data || [];
                setAvailableCards(cardsList);
                
                if (cardsList.length > 0) {
                    setSelectedCardIds([cardsList[0].id]);
                }
                setMultiCardMessage('');
            } else {
                setMultiCardMessage('❌ Lỗi khi tải danh sách thẻ từ server.');
            }
        } catch (e) {
            setMultiCardMessage('❌ Lỗi kết nối: ' + e.message);
        } finally {
            setMultiCardLoading(false);
        }
    };

    useEffect(() => {
        if (availableCards.length > 0) {
            const countVal = Math.min(Math.max(1, parseInt(multiCardCount) || 1), availableCards.length);
            const initialChecked = availableCards.slice(0, countVal).map(c => c.id);
            setSelectedCardIds(initialChecked);
        }
    }, [multiCardCount, availableCards]);

    const handleToggleCard = (cardId) => {
        setSelectedCardIds(prev => {
            if (prev.includes(cardId)) {
                const filtered = prev.filter(id => id !== cardId);
                setMultiCardCount(filtered.length);
                return filtered;
            } else {
                const updated = [...prev, cardId];
                setMultiCardCount(updated.length);
                return updated;
            }
        });
    };

    const handleStartMultiCardAutomation = async () => {
        if (!multiCardAccount) return;
        if (selectedCardIds.length === 0) {
            setMultiCardMessage('⚠️ Vui lòng chọn ít nhất một thẻ!');
            return;
        }
        
        const bridge = window.munAutomationBridge || window.qhtdBridge;
        if (!bridge || !bridge.addPaymentCardsAuto) {
            setMultiCardMessage('❌ Lỗi: Agent MunAutomation không chạy hoặc không hỗ trợ thêm nhiều thẻ.');
            return;
        }
        
        const selectedCards = availableCards.filter(c => selectedCardIds.includes(c.id)).map(c => {
            let month = '12';
            let year = '28';
            if (c.expiry_date && c.expiry_date.includes('/')) {
                const parts = c.expiry_date.split('/');
                month = parts[0].trim().padStart(2, '0');
                year = parts[1].trim();
            }
            
            return {
                id: c.id,
                card_number: c.card_number || '',
                expiry_month: month,
                expiry_year: year,
                cvv: c.cvv || '',
                first_name: 'Nguyen',
                last_name: 'Van A',
                address_line1: '123 Le Loi',
                city: 'Ho Chi Minh',
                zip_code: '70000',
                country_code: 'VN',
                phone: '0987654321'
            };
        });
        
        setMultiCardLoading(true);
        setMultiCardMessage('🚀 Đang khởi chạy kịch bản MunLogin...');
        
        try {
            // Find session_id or default to id
            const emailAddress = multiCardAccount.email || multiCardAccount.username || '';
            const session_id = multiCardAccount.browser_profiles || emailAddress;
            const accountPassword = multiCardAccount.password || '';
            const resStr = await bridge.addPaymentCardsAuto(session_id, emailAddress, JSON.stringify(selectedCards), multiCardProxy, accountPassword);
            const res = JSON.parse(resStr);
            if (res.success) {
                setMultiCardMessage('✅ Trình duyệt đã mở. Hãy đăng nhập và nhập 2FA, sau đó tiến trình sẽ tự điền thẻ!');
            } else {
                setMultiCardMessage('❌ Lỗi: ' + res.error);
            }
        } catch (e) {
            setMultiCardMessage('❌ Lỗi kết nối Agent: ' + e.message);
        } finally {
            setMultiCardLoading(false);
        }
    };

    useEffect(() => {
        const bridge = window.munAutomationBridge || window.qhtdBridge;
        const handleStatusMessage = (msg) => {
            setMultiCardMessage(msg);
        };
        
        if (bridge && bridge.statusMessage) {
            bridge.statusMessage.connect(handleStatusMessage);
        }
        
        return () => {
            if (bridge && bridge.statusMessage) {
                try {
                    bridge.statusMessage.disconnect(handleStatusMessage);
                } catch (e) {}
            }
        };
    }, []);
    
    // Filters
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [createdByFilter, setCreatedByFilter] = useState('');
    const [browserProfiles, setBrowserProfiles] = useState([]);

    // Selection
    const [selectedIds, setSelectedIds] = useState([]);

    // Modals
    const [addOpen, setAddOpen] = useState(false);
    const [addEmail, setAddEmail] = useState('');
    const [addPassword, setAddPassword] = useState('');
    const [addType, setAddType] = useState('Tiktok');
    const [addProfile, setAddProfile] = useState('none');
    const [addSubscription, setAddSubscription] = useState('');
    const [addSubOwner, setAddSubOwner] = useState('');
    const [add2FA, setAdd2FA] = useState('');
    const [addCookies, setAddCookies] = useState('');
    const [addNote, setAddNote] = useState('');
    const [addLoading, setAddLoading] = useState(false);

    const [editOpen, setEditOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [editEmail, setEditEmail] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editType, setEditType] = useState('Tiktok');
    const [editProfile, setEditProfile] = useState('none');
    const [editSubscription, setEditSubscription] = useState('');
    const [editSubOwner, setEditSubOwner] = useState('');
    const [edit2FA, setEdit2FA] = useState('');
    const [editCookies, setEditCookies] = useState('');
    const [editStatus, setEditStatus] = useState(0);
    const [editNote, setEditNote] = useState('');
    const [editLoading, setEditLoading] = useState(false);

    const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
    const [bulkStatusVal, setBulkStatusVal] = useState(0);

    const [bulkSubOwnerOpen, setBulkSubOwnerOpen] = useState(false);
    const [bulkSubOwnerVal, setBulkSubOwnerVal] = useState('');
    const [subOwnerSearchQuery, setSubOwnerSearchQuery] = useState('');

    const [modalUsers, setModalUsers] = useState([]);
    const [modalUsersPage, setModalUsersPage] = useState(1);
    const [modalUsersLoading, setModalUsersLoading] = useState(false);
    const [modalUsersHasMore, setModalUsersHasMore] = useState(true);

    const fetchModalUsers = async (pageNumber, searchQuery, replace = false) => {
        setModalUsersLoading(true);
        try {
            let url = `/dashboard/api/users/?status=active&page=${pageNumber}&page_size=20`;
            if (searchQuery) {
                url += `&search=${encodeURIComponent(searchQuery)}`;
            }
            const resp = await apiRequest(url);
            if (resp.ok) {
                const data = await resp.json();
                const results = data.results || data;
                if (replace) {
                    setModalUsers(results);
                } else {
                    setModalUsers(prev => [...prev, ...results]);
                }
                setModalUsersHasMore(!!data.next);
                setModalUsersPage(pageNumber);
            }
        } catch (err) {
            console.error("Error loading modal users:", err);
        } finally {
            setModalUsersLoading(false);
        }
    };

    useEffect(() => {
        if (!bulkSubOwnerOpen) return;
        const delayDebounce = setTimeout(() => {
            fetchModalUsers(1, subOwnerSearchQuery, true);
        }, 250);
        return () => clearTimeout(delayDebounce);
    }, [subOwnerSearchQuery, bulkSubOwnerOpen]);

    const handleModalScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        if (scrollHeight - scrollTop - clientHeight < 20) {
            if (!modalUsersLoading && modalUsersHasMore) {
                fetchModalUsers(modalUsersPage + 1, subOwnerSearchQuery, false);
            }
        }
    };

    const [viewOpen, setViewOpen] = useState(false);
    const [viewData, setViewData] = useState(null);
    const [viewOtp, setViewOtp] = useState('');
    const [viewOtpLoading, setViewOtpLoading] = useState(false);

    const fetchAccounts = async () => {
        setLoading(true);
        let url = `/dashboard/api/accounts/?page=${page}&page_size=${pageSize}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (typeFilter) url += `&type=${encodeURIComponent(typeFilter)}`;
        if (createdByFilter) url += `&created_by=${encodeURIComponent(createdByFilter)}`;

        try {
            const resp = await apiRequest(url);
            if (resp.ok) {
                const data = await resp.json();
                setAccounts(data.results || data);
                setCount(data.count || (data.results || data).length);
            }
        } catch (err) {
            console.error("Error loading accounts:", err);
        } finally {
            setLoading(false);
        }
    };



    const fetchBrowserProfiles = async () => {
        try {
            const response = await apiRequest('/dashboard/api/profiles/?page_size=100');
            if (response.ok) {
                const data = await response.json();
                setBrowserProfiles(data.results || data);
            }
        } catch (err) {
            console.error("Error loading browser profiles:", err);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, [page, pageSize, typeFilter, createdByFilter]);

    useEffect(() => {
        const t = setTimeout(() => {
            if (page !== 1) {
                onPageChange(1);
            } else {
                fetchAccounts();
            }
        }, 300);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => {
        fetchBrowserProfiles();
    }, []);

    const handleSelectRow = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(x => x !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const toggleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(accounts.map(a => a.id));
        } else {
            setSelectedIds([]);
        }
    };

    // Delete handlers
    const deleteSelectedAccounts = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Bạn có thực sự muốn xóa ${selectedIds.length} tài khoản đã chọn khỏi hệ thống?`)) return;

        try {
            const resp = await apiRequest('/dashboard/api/accounts/bulk-delete/', {
                method: 'POST',
                body: JSON.stringify({ ids: selectedIds })
            });
            const data = await resp.json();
            if (resp.ok && data.success) {
                alert(data.message || 'Đã xóa tài khoản thành công!');
                setSelectedIds([]);
                fetchAccounts();
            } else {
                alert('Lỗi: ' + (data.message || 'Không thể xóa tài khoản.'));
            }
        } catch (err) {
            alert('Lỗi kết nối.');
        }
    };

    const deleteSingleAccount = async (e, id) => {
        if (e) e.stopPropagation();
        if (!confirm('Bạn có thực sự muốn xóa tài khoản này khỏi hệ thống?')) return;

        try {
            const resp = await apiRequest(`/dashboard/api/accounts/${id}/`, {
                method: 'DELETE'
            });
            if (resp.ok) {
                alert('Đã xóa tài khoản thành công!');
                setSelectedIds(selectedIds.filter(x => x !== id));
                fetchAccounts();
            } else {
                alert('Lỗi khi xóa tài khoản.');
            }
        } catch (err) {
            alert('Lỗi kết nối.');
        }
    };

    // Bulk status update
    const saveBulkStatus = async () => {
        try {
            const resp = await apiRequest('/dashboard/api/accounts/bulk-status/', {
                method: 'POST',
                body: JSON.stringify({ ids: selectedIds, status: bulkStatusVal })
            });
            const data = await resp.json();
            if (resp.ok && data.success) {
                alert(data.message || 'Đã cập nhật trạng thái thành công!');
                setBulkStatusOpen(false);
                setSelectedIds([]);
                fetchAccounts();
            } else {
                alert('Lỗi: ' + (data.message || 'Không thể cập nhật.'));
            }
        } catch (err) {
            alert('Lỗi kết nối.');
        }
    };

    // Bulk Sub Owner update
    const saveBulkSubOwner = async () => {
        try {
            const resp = await apiRequest('/dashboard/api/accounts/bulk-sub-owner/', {
                method: 'POST',
                body: JSON.stringify({ ids: selectedIds, subscription_owner: bulkSubOwnerVal })
            });
            const data = await resp.json();
            if (resp.ok && data.success) {
                alert(data.message || 'Đã gán sở hữu sub thành công!');
                setBulkSubOwnerOpen(false);
                setSelectedIds([]);
                fetchAccounts();
            } else {
                alert('Lỗi: ' + (data.message || 'Không thể cập nhật.'));
            }
        } catch (err) {
            alert('Lỗi kết nối.');
        }
    };

    // View Details Modal
    const openViewModal = async (id) => {
        setViewOpen(true);
        setViewData(null);
        setViewOtp('');
        setViewOtpLoading(false);
        try {
            const resp = await apiRequest(`/dashboard/api/accounts/${id}/`);
            if (resp.ok) {
                const data = await resp.json();
                setViewData(data);
                setAccounts(prevAccounts => prevAccounts.map(acc => acc.id === data.id ? data : acc));
            } else {
                alert('Không thể tải chi tiết tài khoản.');
                setViewOpen(false);
            }
        } catch (err) {
            alert('Lỗi kết nối.');
            setViewOpen(false);
        }
    };

    const handleGetOtp = async () => {
        if (!viewData) return;
        setViewOtpLoading(true);
        setViewOtp('');
        try {
            const resp = await apiRequest(`/dashboard/api/accounts/${viewData.id}/get-2fa/`);
            const data = await resp.json();
            if (resp.ok && data.success && data.token) {
                setViewOtp(data.token);
            } else {
                alert('Lỗi: ' + (data.message || 'Không thể lấy mã code.'));
            }
        } catch (e) {
            alert('Lỗi kết nối khi lấy mã OTP.');
        } finally {
            setViewOtpLoading(false);
        }
    };

    const handleCopyCookies = () => {
        if (!viewData?.cookies) return;
        navigator.clipboard.writeText(viewData.cookies)
            .then(() => alert('Đã copy thành công Cookies!'))
            .catch(err => alert('Lỗi khi copy: ' + err));
    };

    // Add Account handlers
    const handleOpenAddModal = () => {
        setAddEmail('');
        setAddPassword('');
        setAddType('Tiktok');
        setAddProfile('none');
        setAddSubscription('');
        setAddSubOwner('');
        setAdd2FA('');
        setAddCookies('');
        setAddNote('');
        setAddOpen(true);
    };

    const saveAddAccount = async () => {
        if (!addEmail || !addPassword) {
            alert('Email và Mật khẩu không được để trống.');
            return;
        }

        setAddLoading(true);
        try {
            const resp = await apiRequest('/dashboard/api/accounts/add-manual/', {
                method: 'POST',
                body: JSON.stringify({
                    email: addEmail.trim(),
                    password: addPassword.trim(),
                    type: addType,
                    profile_id: addProfile === 'none' ? null : addProfile,
                    two_factor_auth: add2FA.trim(),
                    cookies: addCookies.trim(),
                    note: addNote.trim(),
                    subscription: addSubscription.trim(),
                    subscription_owner: addSubOwner
                })
            });
            const data = await resp.json();
            if (resp.ok && data.success) {
                alert(data.message || 'Đã thêm tài khoản thành công!');
                setAddOpen(false);
                fetchAccounts();
            } else {
                alert('Lỗi: ' + (data.message || 'Không thể lưu tài khoản.'));
            }
        } catch (err) {
            alert('Lỗi kết nối.');
        } finally {
            setAddLoading(false);
        }
    };

    // Edit Account handlers
    const handleOpenEditModal = async (e, id) => {
        if (e) e.stopPropagation();
        setEditLoading(true);
        try {
            const resp = await apiRequest(`/dashboard/api/accounts/${id}/`);
            if (resp.ok) {
                const acc = await resp.json();
                setEditId(acc.id);
                setEditEmail(acc.email || acc.username || '');
                setEditPassword(acc.password || '');
                
                let rawType = acc.type || 'Tiktok';
                let matchedOpt = ['Tiktok', 'Apple', 'Amazon', 'Ebay', 'Facebook', 'X'].find(t => t.toLowerCase() === rawType.toLowerCase());
                setEditType(matchedOpt || 'Other');
                
                setEditProfile(acc.browser_profiles || 'none');
                setEditSubscription(acc.subscription || '');
                setEditSubOwner(acc.subscription_owner || '');
                setEdit2FA(acc.two_factor_auth || '');
                setEditCookies(acc.cookies || '');
                setEditStatus(acc.status !== undefined ? acc.status : 0);
                setEditNote(acc.note || '');
                setEditOpen(true);
            } else {
                alert('Không thể tải chi tiết tài khoản để sửa.');
            }
        } catch (err) {
            alert('Lỗi kết nối.');
        } finally {
            setEditLoading(false);
        }
    };

    const saveEditAccount = async () => {
        if (!editEmail || !editPassword) {
            alert('Email và Mật khẩu không được để trống.');
            return;
        }

        setEditLoading(true);
        try {
            const resp = await apiRequest(`/dashboard/api/accounts/${editId}/`, {
                method: 'PATCH',
                body: JSON.stringify({
                    email: editEmail.trim(),
                    password: editPassword.trim(),
                    type: editType,
                    profile_id: editProfile === 'none' ? null : editProfile,
                    two_factor_auth: edit2FA.trim(),
                    cookies: editCookies.trim(),
                    status: parseInt(editStatus),
                    note: editNote.trim(),
                    subscription: editSubscription.trim(),
                    subscription_owner: editSubOwner
                })
            });
            if (resp.ok) {
                alert('Cập nhật tài khoản thành công!');
                setEditOpen(false);
                fetchAccounts();
            } else {
                const err = await resp.json();
                alert('Lỗi: ' + (err.message || 'Không thể lưu thay đổi.'));
            }
        } catch (err) {
            alert('Lỗi kết nối.');
        } finally {
            setEditLoading(false);
        }
    };

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
                            placeholder="Tìm kiếm tài khoản..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select className="filter-select" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                        <option value="">Tất cả phân loại</option>
                        <option value="Tiktok">Tiktok</option>
                        <option value="Apple">Apple</option>
                        <option value="Amazon">Amazon</option>
                        <option value="Ebay">Ebay</option>
                        <option value="Facebook">Facebook</option>
                        <option value="X">X</option>
                        <option value="Other">Khác</option>
                    </select>

                    <SearchableSelect
                        currentUser={currentUser}
                        value={createdByFilter}
                        onChange={setCreatedByFilter}
                        placeholder="Tất cả người tạo"
                        valueKey="username"
                        unassignedLabel="Tất cả người tạo"
                        unassignedValue=""
                    />

                    <select className="filter-select" value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value)); onPageChange(1); }}>
                        <option value={10}>10 dòng</option>
                        <option value={20}>20 dòng</option>
                        <option value={50}>50 dòng</option>
                        <option value={100}>100 dòng</option>
                    </select>
                </div>
                <div className="action-buttons">
                    <button className="btn btn-secondary" onClick={fetchAccounts}>Làm mới</button>
                    <button className="btn btn-primary" onClick={handleOpenAddModal}>Thêm mới</button>
                    <button className="btn btn-info" onClick={() => { setBulkSubOwnerOpen(true); setSubOwnerSearchQuery(''); }} disabled={selectedIds.length === 0}>Gán sở hữu Sub</button>
                    <button className="btn btn-warning" onClick={() => setBulkStatusOpen(true)} disabled={selectedIds.length === 0}>Đổi trạng thái</button>
                    <button className="btn btn-danger" onClick={deleteSelectedAccounts} disabled={selectedIds.length === 0}>Xóa</button>
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
                                    checked={accounts.length > 0 && selectedIds.length === accounts.length}
                                    onChange={toggleSelectAll}
                                />
                            </th>
                            <th>Username / Email</th>
                            <th>Mật khẩu</th>
                            <th>Loại Account</th>
                            <th>Subscription</th>
                            <th>Chủ sở hữu Sub</th>
                            <th>Trạng thái</th>
                            <th>Tạo bởi</th>
                            <th>Sử dụng gần nhất</th>
                            <th>Ngày tạo</th>
                            <th style={{ width: '150px', textAlign: 'center' }}>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="11" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                    Đang tải danh sách tài khoản...
                                </td>
                            </tr>
                        ) : accounts.length === 0 ? (
                            <tr>
                                <td colSpan="11" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                    Không tìm thấy tài khoản nào.
                                </td>
                            </tr>
                        ) : (
                            accounts.map((acc, index) => (
                                <tr key={acc.id} className={selectedIds.includes(acc.id) ? 'row-selected' : ''} onDoubleClick={() => openViewModal(acc.id)} onClick={() => handleSelectRow(acc.id)} style={{ cursor: 'pointer' }}>
                                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                        <input 
                                            type="checkbox" 
                                            className="table-chk" 
                                            checked={selectedIds.includes(acc.id)}
                                            onChange={() => handleSelectRow(acc.id)}
                                        />
                                    </td>
                                    <td style={{ fontWeight: 600 }}>
                                        {acc.username || acc.email}
                                        {acc.email && (acc.username !== acc.email) && (
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>{acc.email}</div>
                                        )}
                                    </td>
                                    <td><code>{acc.password || ''}</code></td>
                                    <td><span className="badge badge-unused">{acc.type || '-'}</span></td>
                                    <td>{acc.subscription || '-'}</td>
                                    <td>{acc.subscription_owner || '-'}</td>
                                    <td>
                                        <span className={`badge ${getAccountStatusBadgeClass(acc.status)}`}>
                                            {getAccountStatusLabel(acc.status)}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--accent)' }}>{acc.created_by || '-'}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--success)' }}>{acc.modified_by || '-'}</td>
                                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>{formatDateString(acc.created)}</td>
                                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                            {acc.type?.toLowerCase() === 'apple' && (
                                                <button className="btn btn-success" onClick={() => openMultiCardModal(acc)} style={{ padding: '2px 6px', fontSize: '11px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: 'none', fontWeight: 'bold' }}>
                                                    💳 Thêm thẻ
                                                </button>
                                            )}
                                            <button className="btn btn-secondary" onClick={(e) => handleOpenEditModal(e, acc.id)} style={{ padding: '2px 6px', fontSize: '11px' }}>Sửa</button>
                                            <button className="btn btn-primary" onClick={() => openViewModal(acc.id)} style={{ padding: '2px 6px', fontSize: '11px' }} title="Xem chi tiết (Double-click)">Xem</button>
                                            <button className="btn btn-danger" onClick={(e) => deleteSingleAccount(e, acc.id)} style={{ padding: '2px 6px', fontSize: '11px' }}>Xóa</button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Pagination 
                page={page}
                count={count}
                pageSize={pageSize}
                onPageChange={onPageChange}
            />

            {/* 1. Add Account Modal */}
            {addOpen && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-box modal-large">
                        <div className="modal-header">
                            <h3>Thêm Tài Khoản Đã Tạo Mới</h3>
                            <button className="modal-close" onClick={() => setAddOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Email / Username</label>
                                    <input type="text" className="form-input" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="example@domain.com" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Mật khẩu</label>
                                    <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                        <input type="text" className="form-input" value={addPassword} onChange={(e) => setAddPassword(e.target.value)} style={{ flexGrow: 1 }} />
                                        <button type="button" className="btn btn-secondary" style={{ padding: '0 12px', fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap' }} onClick={() => setAddPassword('Zxcv@123')} title="Tự động điền mật khẩu mặc định (Zxcv@123)">🔑 Mặc định</button>
                                    </div>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Loại tài khoản</label>
                                    <select className="filter-select" style={{ width: '100%' }} value={addType} onChange={(e) => setAddType(e.target.value)}>
                                        <option value="Tiktok">Tiktok</option>
                                        <option value="Apple">Apple</option>
                                        <option value="Amazon">Amazon</option>
                                        <option value="Ebay">Ebay</option>
                                        <option value="Facebook">Facebook</option>
                                        <option value="X">X</option>
                                        <option value="Other">Khác</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Browser Profile</label>
                                    <select className="filter-select" style={{ width: '100%' }} value={addProfile} onChange={(e) => setAddProfile(e.target.value)}>
                                        <option value="none">Không có (Mặc định)</option>
                                        <option value="auto">Tự động tạo profile mới</option>
                                        {browserProfiles.map(p => (
                                            <option key={p.id} value={p.id}>{p.profile_name} ({p.profile_os || 'No OS'})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Subscription (Số lượng sub Apple)</label>
                                    <input type="text" className="form-input" value={addSubscription} onChange={(e) => setAddSubscription(e.target.value)} placeholder="Số lượng sub..." />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Chủ sở hữu Sub</label>
                                    <SearchableSelect
                                        currentUser={currentUser}
                                        value={addSubOwner}
                                        onChange={setAddSubOwner}
                                        placeholder="Chọn chủ sở hữu Sub..."
                                        valueKey="username"
                                        unassignedLabel="-- Không có --"
                                        unassignedValue=""
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">2FA Secret Key / Code</label>
                                <input type="text" className="form-input" value={add2FA} onChange={(e) => setAdd2FA(e.target.value)} placeholder="Dán mã bảo mật 2FA vào đây..." />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Cookies (JSON hoặc Netscape)</label>
                                <textarea className="form-textarea" value={addCookies} onChange={(e) => setAddCookies(e.target.value)} placeholder="Dán cookie tài khoản vào đây..."></textarea>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ghi chú</label>
                                <input type="text" className="form-input" value={addNote} onChange={(e) => setAddNote(e.target.value)} placeholder="Ghi chú thêm..." />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setAddOpen(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={saveAddAccount} disabled={addLoading}>
                                {addLoading ? 'Đang xử lý...' : 'Thêm tài khoản'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Edit Account Modal */}
            {editOpen && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-box modal-large">
                        <div className="modal-header">
                            <h3>Chỉnh Sửa Tài Khoản Đã Tạo</h3>
                            <button className="modal-close" onClick={() => setEditOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Email / Username</label>
                                    <input type="text" className="form-input" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="example@domain.com" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Mật khẩu</label>
                                    <input type="text" className="form-input" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Loại tài khoản</label>
                                    <select className="filter-select" style={{ width: '100%' }} value={editType} onChange={(e) => setEditType(e.target.value)}>
                                        <option value="Tiktok">Tiktok</option>
                                        <option value="Apple">Apple</option>
                                        <option value="Amazon">Amazon</option>
                                        <option value="Ebay">Ebay</option>
                                        <option value="Facebook">Facebook</option>
                                        <option value="X">X</option>
                                        <option value="Other">Khác</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Browser Profile</label>
                                    <select className="filter-select" style={{ width: '100%' }} value={editProfile} onChange={(e) => setEditProfile(e.target.value)}>
                                        <option value="none">Không có (Mặc định)</option>
                                        <option value="auto">Tự động tạo profile mới</option>
                                        {browserProfiles.map(p => (
                                            <option key={p.id} value={p.id}>{p.profile_name} ({p.profile_os || 'No OS'})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Subscription (Apple)</label>
                                    <input type="text" className="form-input" value={editSubscription} onChange={(e) => setEditSubscription(e.target.value)} placeholder="Số lượng sub..." />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Chủ sở hữu Sub</label>
                                    <SearchableSelect
                                        currentUser={currentUser}
                                        value={editSubOwner}
                                        onChange={setEditSubOwner}
                                        initialDisplayValue={accounts.find(a => a.id === editId)?.subscription_owner || ''}
                                        placeholder="Chọn chủ sở hữu Sub..."
                                        valueKey="username"
                                        unassignedLabel="-- Không có --"
                                        unassignedValue=""
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">2FA Secret Key / Code</label>
                                    <input type="text" className="form-input" value={edit2FA} onChange={(e) => setEdit2FA(e.target.value)} placeholder="Dán mã bảo mật 2FA vào đây..." />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Trạng thái</label>
                                    <select className="filter-select" style={{ width: '100%' }} value={editStatus} onChange={(e) => setEditStatus(parseInt(e.target.value))}>
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
                                <label className="form-label">Cookies (JSON hoặc Netscape)</label>
                                <textarea className="form-textarea" value={editCookies} onChange={(e) => setEditCookies(e.target.value)} placeholder="Dán cookie tài khoản vào đây..."></textarea>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ghi chú</label>
                                <input type="text" className="form-input" value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="Ghi chú thêm..." />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setEditOpen(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={saveEditAccount} disabled={editLoading}>
                                {editLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 3. Bulk Status Modal */}
            {bulkStatusOpen && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>Đổi Trạng Thái Số Lượng Lớn</h3>
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
                            <button className="btn btn-primary" onClick={saveBulkStatus}>Xác nhận</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. Bulk Sub Owner Modal */}
            {bulkSubOwnerOpen && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>Gán Sở Hữu Sub Số Lượng Lớn</h3>
                            <button className="modal-close" onClick={() => setBulkSubOwnerOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Chọn người sở hữu Sub</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    placeholder="Tìm tên chủ sở hữu..." 
                                    value={subOwnerSearchQuery} 
                                    onChange={(e) => setSubOwnerSearchQuery(e.target.value)} 
                                    style={{ marginBottom: '10px' }}
                                />
                                <div 
                                    onScroll={handleModalScroll}
                                    style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--input-bg)' }}
                                >
                                    <div
                                        onClick={() => setBulkSubOwnerVal('')}
                                        style={{
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            background: bulkSubOwnerVal === '' ? 'var(--active-bg)' : 'transparent',
                                            color: bulkSubOwnerVal === '' ? 'var(--primary)' : 'var(--text-color)',
                                            fontWeight: bulkSubOwnerVal === '' ? 'bold' : 'normal',
                                            borderBottom: '1px solid var(--border-color)',
                                            fontSize: '13px'
                                        }}
                                    >
                                        -- Không có (Bỏ gán) --
                                    </div>
                                    {modalUsers.map(u => {
                                        const isSelected = u.username === bulkSubOwnerVal;
                                        return (
                                            <div
                                                key={u.username}
                                                onClick={() => setBulkSubOwnerVal(u.username)}
                                                style={{
                                                    padding: '8px 12px',
                                                    cursor: 'pointer',
                                                    background: isSelected ? 'var(--active-bg)' : 'transparent',
                                                    color: isSelected ? 'var(--primary)' : 'var(--text-color)',
                                                    fontWeight: isSelected ? 'bold' : 'normal',
                                                    borderBottom: '1px solid var(--border-color)',
                                                    fontSize: '13px',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}
                                            >
                                                <span>{u.username}</span>
                                                {isSelected && <span>✓</span>}
                                            </div>
                                        );
                                    })}
                                    {modalUsersLoading && (
                                        <div style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                                            🔄 Đang tải thêm...
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setBulkSubOwnerOpen(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={saveBulkSubOwner}>Xác nhận</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 5. View Account Detail Modal */}
            {viewOpen && viewData && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-box modal-large">
                        <div className="modal-header">
                            <h3>Chi Tiết Tài Khoản Đã Tạo</h3>
                            <button className="modal-close" onClick={() => setViewOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '20px' }}>
                                <div className="detail-item">
                                    <label className="form-label" style={{ color: 'var(--text-muted)' }}>Email / Username</label>
                                    <div style={{ padding: '8px 12px', background: 'var(--input-bg)', borderRadius: '6px', border: '1px solid var(--border-color)', fontWeight: 600 }}>
                                        {viewData.email || viewData.username || '-'}
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <label className="form-label" style={{ color: 'var(--text-muted)' }}>Mật khẩu</label>
                                    <div style={{ padding: '8px 12px', background: 'var(--input-bg)', borderRadius: '6px', border: '1px solid var(--border-color)', fontFamily: 'monospace' }}>
                                        {viewData.password || '-'}
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <label className="form-label" style={{ color: 'var(--text-muted)' }}>Loại tài khoản</label>
                                    <div style={{ padding: '8px 12px', background: 'var(--input-bg)', borderRadius: '6px', border: '1px solid var(--border-color)', fontWeight: 'bold', color: 'var(--accent)' }}>
                                        {viewData.type || '-'}
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <label className="form-label" style={{ color: 'var(--text-muted)' }}>Browser Profile ID</label>
                                    <div style={{ padding: '8px 12px', background: 'var(--input-bg)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                        {viewData.browser_profiles || 'Không có'}
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <label className="form-label" style={{ color: 'var(--text-muted)' }}>IP Đăng ký</label>
                                    <div style={{ padding: '8px 12px', background: 'var(--input-bg)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                        {viewData.signup_ip || '-'}
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <label className="form-label" style={{ color: 'var(--text-muted)' }}>Phone / Service</label>
                                    <div style={{ padding: '8px 12px', background: 'var(--input-bg)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                        {viewData.phone_number || '-'}{viewData.phone_service && ` (${viewData.phone_service})`}
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <label className="form-label" style={{ color: 'var(--text-muted)' }}>Socks5 / Proxy</label>
                                    <div style={{ padding: '8px 12px', background: 'var(--input-bg)', borderRadius: '6px', border: '1px solid var(--border-color)', fontFamily: 'monospace' }}>
                                        {viewData.socks5 || viewData.proxy || 'Không có'}
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <label className="form-label" style={{ color: 'var(--text-muted)' }}>Trạng thái</label>
                                    <div style={{ padding: '8px 12px', background: 'var(--input-bg)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                        {getAccountStatusLabel(viewData.status)}
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <label className="form-label" style={{ color: 'var(--text-muted)' }}>Tạo bởi</label>
                                    <div style={{ padding: '8px 12px', background: 'var(--input-bg)', borderRadius: '6px', border: '1px solid var(--border-color)', fontWeight: 'bold', color: 'var(--accent)' }}>
                                        {viewData.created_by || '-'}
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <label className="form-label" style={{ color: 'var(--text-muted)' }}>Sử dụng gần nhất</label>
                                    <div style={{ padding: '8px 12px', background: 'var(--input-bg)', borderRadius: '6px', border: '1px solid var(--border-color)', fontWeight: 'bold', color: 'var(--success)' }}>
                                        {viewData.modified_by || '-'}
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <label className="form-label" style={{ color: 'var(--text-muted)' }}>Ngày tạo</label>
                                    <div style={{ padding: '8px 12px', background: 'var(--input-bg)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                        {formatDateString(viewData.created)}
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <label className="form-label" style={{ color: 'var(--text-muted)' }}>Subscription (Apple)</label>
                                    <div style={{ padding: '8px 12px', background: 'var(--input-bg)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                        {viewData.subscription || '-'}
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <label className="form-label" style={{ color: 'var(--text-muted)' }}>Chủ sở hữu Sub</label>
                                    <div style={{ padding: '8px 12px', background: 'var(--input-bg)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                        {viewData.subscription_owner || '-'}
                                    </div>
                                </div>
                            </div>
                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <label className="form-label" style={{ margin: 0, color: 'var(--text-muted)' }}>2FA Secret Key / Code</label>
                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        {viewOtp && (
                                            <span 
                                                onClick={() => navigator.clipboard.writeText(viewOtp).then(() => alert('Đã copy: ' + viewOtp))}
                                                style={{ display: 'inline-block', padding: '2px 8px', background: '#059669', color: '#fff', fontWeight: 'bold', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px', cursor: 'pointer' }}
                                                title="Click để copy mã OTP"
                                            >
                                                {viewOtp}
                                            </span>
                                        )}
                                        {viewData.two_factor_auth && (
                                            <button className="btn btn-primary" onClick={handleGetOtp} disabled={viewOtpLoading} style={{ padding: '2px 8px', fontSize: '11px', borderRadius: '4px' }}>
                                                {viewOtpLoading ? 'Đang lấy...' : 'Lấy mã OTP'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div style={{ padding: '8px 12px', background: 'var(--input-bg)', borderRadius: '6px', border: '1px solid var(--border-color)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                    {viewData.two_factor_auth || '-'}
                                </div>
                            </div>
                            <div className="form-group" style={{ marginBottom: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <label className="form-label" style={{ margin: 0, color: 'var(--text-muted)' }}>Cookies</label>
                                    {viewData.cookies && (
                                        <button className="btn btn-primary" onClick={handleCopyCookies} style={{ padding: '2px 8px', fontSize: '11px', borderRadius: '4px' }}>Copy Cookies</button>
                                    )}
                                </div>
                                <div style={{ padding: '10px 14px', background: 'var(--input-bg)', borderRadius: '6px', border: '1px solid var(--border-color)', fontFamily: 'monospace', maxHeight: '120px', overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '11px' }}>
                                    {viewData.cookies || 'Không có cookies'}
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ color: 'var(--text-muted)' }}>Ghi chú</label>
                                <div style={{ padding: '8px 12px', background: 'var(--input-bg)', borderRadius: '6px', border: '1px solid var(--border-color)', minHeight: '38px' }}>
                                    {viewData.note || '-'}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setViewOpen(false)}>Đóng</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════ MODAL 6: THÊM THẺ TỰ ĐỘNG (NHIỀU THẺ) ═══════ */}
            {showMultiCardModal && multiCardAccount && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', zIndex: 1000,
                    backdropFilter: 'blur(8px)'
                }}>
                    <div className="modal-box" style={{
                        background: 'radial-gradient(circle at top left, #1e293b, #0f172a)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '16px', width: '90%', maxWidth: '640px',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                        display: 'flex', flexDirection: 'column', maxHeight: '90vh',
                        padding: 0
                    }}>
                        <div className="modal-header" style={{
                            padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                💳 Thêm Thẻ Tự Động (Multi-Card)
                            </h3>
                            <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                                {multiCardAccount.email || multiCardAccount.username}
                            </span>
                        </div>
                        
                        <div className="modal-body" style={{ padding: '24px', overflowY: 'auto', flex: 1, maxHeight: 'none' }}>
                            {/* Input number of cards */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
                                    Số lượng thẻ muốn thêm:
                                </label>
                                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max={availableCards.length}
                                        value={multiCardCount}
                                        onChange={(e) => setMultiCardCount(Math.max(1, parseInt(e.target.value) || 1))}
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '10px',
                                            color: 'white',
                                            padding: '10px 14px',
                                            width: '100px',
                                            textAlign: 'center',
                                            fontSize: '16px',
                                            fontWeight: 700,
                                            outline: 'none'
                                        }}
                                        disabled={multiCardLoading}
                                    />
                                    <span style={{ fontSize: '13px', color: '#64748b' }}>
                                        (Hiện có {availableCards.length} thẻ chưa sử dụng)
                                    </span>
                                </div>
                            </div>
                            
                            {/* Input Proxy */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
                                    Cấu hình Proxy (Định dạng host:port hoặc host:port:user:pass):
                                </label>
                                <input 
                                    type="text" 
                                    placeholder="Không bắt buộc - Để trống nếu dùng Proxy mặc định của profile"
                                    value={multiCardProxy}
                                    onChange={(e) => setMultiCardProxy(e.target.value)}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid var(--border-color)',
                                        borderRadius: '10px',
                                        color: 'white',
                                        padding: '10px 14px',
                                        width: '100%',
                                        fontSize: '14px',
                                        fontFamily: 'monospace',
                                        outline: 'none'
                                    }}
                                    disabled={multiCardLoading}
                                />
                            </div>
                            
                            {/* Table of unused cards */}
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px' }}>
                                    Chọn thẻ từ danh sách quản lý thẻ:
                                </label>
                                <div style={{
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: '10px',
                                    maxHeight: '220px',
                                    overflowY: 'auto',
                                    backgroundColor: 'rgba(0,0,0,0.2)'
                                }}>
                                    {availableCards.length === 0 ? (
                                        <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                                            Không có thẻ nào ở trạng thái "Chưa sử dụng"
                                        </div>
                                    ) : (
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                                                    <th style={{ padding: '10px', textAlign: 'center', width: '40px' }}>Chọn</th>
                                                    <th style={{ padding: '10px', textAlign: 'left' }}>Số thẻ</th>
                                                    <th style={{ padding: '10px', textAlign: 'center', width: '80px' }}>Hạn dùng</th>
                                                    <th style={{ padding: '10px', textAlign: 'center', width: '60px' }}>CVV</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {availableCards.map(c => (
                                                    <tr key={c.id} style={{
                                                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                                                        backgroundColor: selectedCardIds.includes(c.id) ? 'rgba(59,130,246,0.08)' : 'transparent'
                                                    }}>
                                                        <td style={{ padding: '10px', textAlign: 'center' }}>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={selectedCardIds.includes(c.id)}
                                                                onChange={() => handleToggleCard(c.id)}
                                                                style={{ cursor: 'pointer' }}
                                                            />
                                                        </td>
                                                        <td style={{ padding: '10px', fontWeight: 600, fontFamily: 'monospace' }}>
                                                            {c.card_number}
                                                        </td>
                                                        <td style={{ padding: '10px', textAlign: 'center' }}>
                                                            {c.expiry_date}
                                                        </td>
                                                        <td style={{ padding: '10px', textAlign: 'center', fontFamily: 'monospace' }}>
                                                            {c.cvv}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                            
                            {/* Message / Status logger */}
                            {multiCardMessage && (
                                <div style={{
                                    padding: '12px 16px',
                                    borderRadius: '10px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    lineHeight: '1.5',
                                    background: multiCardMessage.includes('✅') ? 'rgba(16,185,129,0.08)' :
                                                multiCardMessage.includes('❌') ? 'rgba(239,68,68,0.08)' : 'rgba(59,130,246,0.08)',
                                    color: multiCardMessage.includes('✅') ? '#10b981' :
                                           multiCardMessage.includes('❌') ? '#ef4444' : '#3b82f6',
                                    border: `1px solid ${
                                        multiCardMessage.includes('✅') ? 'rgba(16,185,129,0.2)' :
                                        multiCardMessage.includes('❌') ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)'
                                    }`,
                                    marginBottom: '10px',
                                    whiteSpace: 'pre-line'
                                }}>
                                    {multiCardMessage}
                                </div>
                            )}
                        </div>
                        
                        <div className="modal-footer" style={{
                            borderTop: '1px solid rgba(255,255,255,0.06)', padding: '16px 24px',
                            display: 'flex', gap: '12px', justifyContent: 'flex-end'
                        }}>
                            <button className="btn btn-secondary" onClick={() => setShowMultiCardModal(false)} disabled={multiCardLoading}>
                                Đóng
                            </button>
                            <button 
                                onClick={handleStartMultiCardAutomation}
                                disabled={multiCardLoading || selectedCardIds.length === 0}
                                style={{
                                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '10px',
                                    padding: '10px 18px',
                                    cursor: 'pointer',
                                    opacity: (multiCardLoading || selectedCardIds.length === 0) ? 0.6 : 1,
                                    flex: 1,
                                    fontWeight: 700
                                }}
                            >
                                {multiCardLoading ? '⏳ Đang xử lý...' : `🚀 Chạy tự động (${selectedCardIds.length} thẻ)`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
