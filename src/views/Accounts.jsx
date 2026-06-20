import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import Pagination from '../components/Pagination';

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
    
    // Filters
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [createdByFilter, setCreatedByFilter] = useState('');
    const [systemUsers, setSystemUsers] = useState([]);
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

    const fetchSystemUsers = async () => {
        try {
            const response = await apiRequest('/dashboard/api/accounts/users-list/');
            if (response.ok) {
                const data = await response.json();
                setSystemUsers(data);
            }
        } catch (err) {
            console.error("Error fetching system users:", err);
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
        fetchSystemUsers();
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

                    <select className="filter-select" value={createdByFilter} onChange={(e) => setCreatedByFilter(e.target.value)}>
                        <option value="">Tất cả người tạo</option>
                        {systemUsers.map(u => (
                            <option key={u.username} value={u.username}>{u.username}</option>
                        ))}
                    </select>

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
                    <button className="btn btn-info" onClick={() => setBulkSubOwnerOpen(true)} disabled={selectedIds.length === 0}>Gán sở hữu Sub</button>
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
                            <th>Ngày tạo</th>
                            <th style={{ width: '150px', textAlign: 'center' }}>Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="10" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                    Đang tải danh sách tài khoản...
                                </td>
                            </tr>
                        ) : accounts.length === 0 ? (
                            <tr>
                                <td colSpan="10" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
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
                                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>{formatDateString(acc.created)}</td>
                                    <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
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
                                    <select className="filter-select" style={{ width: '100%' }} value={addSubOwner} onChange={(e) => setAddSubOwner(e.target.value)}>
                                        <option value="">-- Không có --</option>
                                        {systemUsers.map(u => (
                                            <option key={u.username} value={u.username}>{u.username}</option>
                                        ))}
                                    </select>
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
                                    <select className="filter-select" style={{ width: '100%' }} value={editSubOwner} onChange={(e) => setEditSubOwner(e.target.value)}>
                                        <option value="">-- Không có --</option>
                                        {systemUsers.map(u => (
                                            <option key={u.username} value={u.username}>{u.username}</option>
                                        ))}
                                    </select>
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
                                <select className="filter-select" style={{ width: '100%' }} value={bulkSubOwnerVal} onChange={(e) => setBulkSubOwnerVal(e.target.value)}>
                                    <option value="">-- Không có (Bỏ gán) --</option>
                                    {systemUsers.map(u => (
                                        <option key={u.username} value={u.username}>{u.username}</option>
                                    ))}
                                </select>
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
                                    <div style={{ padding: '8px 12px', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '6px', border: '1px solid var(--border-color)', fontWeight: 600 }}>
                                        {viewData.email || viewData.username || '-'}
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <label className="form-label" style={{ color: 'var(--text-muted)' }}>Mật khẩu</label>
                                    <div style={{ padding: '8px 12px', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '6px', border: '1px solid var(--border-color)', fontFamily: 'monospace' }}>
                                        {viewData.password || '-'}
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <label className="form-label" style={{ color: 'var(--text-muted)' }}>Loại tài khoản</label>
                                    <div style={{ padding: '8px 12px', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '6px', border: '1px solid var(--border-color)', fontWeight: 'bold', color: 'var(--accent)' }}>
                                        {viewData.type || '-'}
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <label className="form-label" style={{ color: 'var(--text-muted)' }}>Browser Profile ID</label>
                                    <div style={{ padding: '8px 12px', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                        {viewData.browser_profiles || 'Không có'}
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <label className="form-label" style={{ color: 'var(--text-muted)' }}>IP Đăng ký</label>
                                    <div style={{ padding: '8px 12px', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                        {viewData.signup_ip || '-'}
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <label className="form-label" style={{ color: 'var(--text-muted)' }}>Phone / Service</label>
                                    <div style={{ padding: '8px 12px', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                        {viewData.phone_number || '-'}{viewData.phone_service && ` (${viewData.phone_service})`}
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <label className="form-label" style={{ color: 'var(--text-muted)' }}>Socks5 / Proxy</label>
                                    <div style={{ padding: '8px 12px', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '6px', border: '1px solid var(--border-color)', fontFamily: 'monospace' }}>
                                        {viewData.socks5 || viewData.proxy || 'Không có'}
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <label className="form-label" style={{ color: 'var(--text-muted)' }}>Trạng thái</label>
                                    <div style={{ padding: '8px 12px', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                        {getAccountStatusLabel(viewData.status)}
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <label className="form-label" style={{ color: 'var(--text-muted)' }}>Tạo bởi</label>
                                    <div style={{ padding: '8px 12px', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '6px', border: '1px solid var(--border-color)', fontWeight: 'bold', color: 'var(--accent)' }}>
                                        {viewData.created_by || '-'}
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <label className="form-label" style={{ color: 'var(--text-muted)' }}>Ngày tạo</label>
                                    <div style={{ padding: '8px 12px', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                        {formatDateString(viewData.created)}
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <label className="form-label" style={{ color: 'var(--text-muted)' }}>Subscription (Apple)</label>
                                    <div style={{ padding: '8px 12px', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                        {viewData.subscription || '-'}
                                    </div>
                                </div>
                                <div className="detail-item">
                                    <label className="form-label" style={{ color: 'var(--text-muted)' }}>Chủ sở hữu Sub</label>
                                    <div style={{ padding: '8px 12px', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
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
                                <div style={{ padding: '8px 12px', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '6px', border: '1px solid var(--border-color)', fontFamily: 'monospace', wordBreak: 'break-all' }}>
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
                                <div style={{ padding: '10px 14px', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '6px', border: '1px solid var(--border-color)', fontFamily: 'monospace', maxHeight: '120px', overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '11px' }}>
                                    {viewData.cookies || 'Không có cookies'}
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label" style={{ color: 'var(--text-muted)' }}>Ghi chú</label>
                                <div style={{ padding: '8px 12px', background: 'rgba(30, 41, 59, 0.4)', borderRadius: '6px', border: '1px solid var(--border-color)', minHeight: '38px' }}>
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
        </div>
    );
}
