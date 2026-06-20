import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import Pagination from '../components/Pagination';

const formatDateString = (str) => {
    if (!str) return '-';
    try {
        const d = new Date(str);
        return d.toLocaleString('vi-VN');
    } catch {
        return str;
    }
};

export default function Users({ currentUser, page, onPageChange }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [count, setCount] = useState(0);
    const [pageSize, setPageSize] = useState(10);

    // Filters
    const [search, setSearch] = useState('');
    const [role, setRole] = useState('all');
    const [status, setStatus] = useState('all');

    // Selection
    const [selectedIds, setSelectedIds] = useState([]);

    // Modals
    const [addOpen, setAddOpen] = useState(false);
    const [addUsername, setAddUsername] = useState('');
    const [addPassword, setAddPassword] = useState('');
    const [addEmail, setAddEmail] = useState('');
    const [addFullName, setAddFullName] = useState('');
    const [addIsStaff, setAddIsStaff] = useState('false');
    const [addStorage, setAddStorage] = useState(10);
    const [addPlanId, setAddPlanId] = useState(0);
    const [addPlanExpired, setAddPlanExpired] = useState('');

    const [editOpen, setEditOpen] = useState(false);
    const [editUserId, setEditUserId] = useState(null);
    const [editUsername, setEditUsername] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editFullName, setEditFullName] = useState('');
    const [editIsStaff, setEditIsStaff] = useState('false');
    const [editIsActive, setEditIsActive] = useState('true');
    const [editStorage, setEditStorage] = useState(10);
    const [editPlanId, setEditPlanId] = useState(0);
    const [editPlanExpired, setEditPlanExpired] = useState('');

    const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
    const [bulkStatusVal, setBulkStatusVal] = useState('active');

    const fetchUsers = async () => {
        setLoading(true);
        let url = `/dashboard/api/users/?page=${page}&page_size=${pageSize}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (role !== 'all') url += `&role=${role}`;
        if (status !== 'all') url += `&status=${status}`;

        try {
            const resp = await apiRequest(url);
            if (resp.ok) {
                const data = await resp.json();
                setUsers(data.results || data);
                setCount(data.count || (data.results || data).length);
            }
        } catch (err) {
            console.error("Error loading users:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [page, pageSize, role, status]);

    // Handle search input with debounce
    useEffect(() => {
        const t = setTimeout(() => {
            if (page !== 1) {
                onPageChange(1);
            } else {
                fetchUsers();
            }
        }, 300);
        return () => clearTimeout(t);
    }, [search]);

    const toggleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(users.map(u => u.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectRow = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(x => x !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const deleteSelectedUsers = async () => {
        if (selectedIds.length === 0) return;
        const confirmDel = confirm(`Bạn có thực sự muốn xóa ${selectedIds.length} tài khoản người dùng đã chọn khỏi hệ thống không? Hành động này có thể xóa cả file và dữ liệu liên quan của họ!`);
        if (!confirmDel) return;

        try {
            const deletePromises = selectedIds.map(id => {
                return apiRequest(`/dashboard/api/users/${id}/`, {
                    method: 'DELETE'
                });
            });
            await Promise.all(deletePromises);
            alert('Đã xóa thành công các tài khoản đã chọn!');
            setSelectedIds([]);
            fetchUsers();
        } catch (err) {
            alert('Lỗi khi xóa người dùng.');
        }
    };

    const openAddModal = () => {
        setAddUsername('');
        setAddPassword('');
        setAddEmail('');
        setAddFullName('');
        setAddIsStaff('false');
        setAddStorage(10);
        setAddPlanId(0);

        const d = new Date();
        d.setDate(d.getDate() + 30);
        setAddPlanExpired(d.toISOString().split('T')[0]);

        setAddOpen(true);
    };

    const saveAddUser = async () => {
        if (!addUsername || !addPassword) {
            alert('Vui lòng điền Username và Mật khẩu.');
            return;
        }

        const storage_space = parseInt(addStorage) * 1024 * 1024 * 1024;
        const plan_expired = addPlanExpired ? new Date(addPlanExpired).toISOString() : new Date().toISOString();

        const payload = {
            username: addUsername,
            password: addPassword,
            email: addEmail,
            full_name: addFullName,
            is_staff: addIsStaff === 'true',
            is_active: true,
            storage_space,
            plan_id: parseInt(addPlanId) || 0,
            plan_expired
        };

        try {
            const response = await apiRequest('/dashboard/api/users/', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setAddOpen(false);
                fetchUsers();
            } else {
                const err = await response.json();
                alert(`Không thể thêm người dùng: ${JSON.stringify(err)}`);
            }
        } catch (err) {
            alert('Lỗi kết nối lưu người dùng.');
        }
    };

    const openEditModal = async () => {
        if (selectedIds.length !== 1) return;
        const id = selectedIds[0];
        const user = users.find(u => u.id === id);
        if (!user) return;

        setEditUserId(user.id);
        setEditUsername(user.username);
        setEditPassword('');
        setEditEmail(user.email || '');
        setEditFullName(user.full_name || '');
        setEditIsStaff(user.is_staff ? 'true' : 'false');
        setEditIsActive(user.is_active ? 'true' : 'false');

        const storageGB = user.storage_space ? (user.storage_space / (1024 * 1024 * 1024)).toFixed(0) : '0';
        setEditStorage(parseInt(storageGB));
        setEditPlanId(user.plan_id || 0);
        setEditPlanExpired(user.plan_expired ? user.plan_expired.split('T')[0] : '');

        setEditOpen(true);
    };

    const saveEditUser = async () => {
        const storage_space = parseInt(editStorage) * 1024 * 1024 * 1024;
        const plan_expired = editPlanExpired ? new Date(editPlanExpired).toISOString() : new Date().toISOString();

        const payload = {
            email: editEmail,
            full_name: editFullName,
            is_staff: editIsStaff === 'true',
            is_active: editIsActive === 'true',
            storage_space,
            plan_id: parseInt(editPlanId) || 0,
            plan_expired
        };
        if (editPassword) payload.password = editPassword;

        try {
            const response = await apiRequest(`/dashboard/api/users/${editUserId}/`, {
                method: 'PATCH',
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                setEditOpen(false);
                setSelectedIds([]);
                fetchUsers();
            } else {
                const err = await response.json();
                alert(`Không thể sửa người dùng: ${JSON.stringify(err)}`);
            }
        } catch (err) {
            alert('Lỗi lưu thông tin người dùng.');
        }
    };

    const saveBulkStatus = async () => {
        try {
            const response = await apiRequest('/dashboard/api/users/bulk-status/', {
                method: 'POST',
                body: JSON.stringify({
                    ids: selectedIds,
                    status: bulkStatusVal
                })
            });

            const data = await response.json();
            if (response.ok && data.success) {
                alert(data.message || 'Đã cập nhật trạng thái thành công!');
                setBulkStatusOpen(false);
                setSelectedIds([]);
                fetchUsers();
            } else {
                alert('Lỗi: ' + (data.message || 'Không thể cập nhật trạng thái.'));
            }
        } catch (err) {
            alert('Lỗi kết nối hoặc hệ thống.');
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
                            placeholder="Tìm kiếm User..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select className="filter-select" value={role} onChange={(e) => setRole(e.target.value)}>
                        <option value="all">Tất cả vai trò</option>
                        <option value="admin">Superuser (Admin)</option>
                        <option value="staff">Staff (Quản trị)</option>
                        <option value="user">Client (Khách)</option>
                    </select>
                    <select className="filter-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="all">Tất cả trạng thái</option>
                        <option value="active">Đang hoạt động</option>
                        <option value="inactive">Bị khóa</option>
                    </select>
                    <select className="filter-select" value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value)); onPageChange(1); }}>
                        <option value={10}>10 dòng</option>
                        <option value={20}>20 dòng</option>
                        <option value={50}>50 dòng</option>
                        <option value={100}>100 dòng</option>
                    </select>
                </div>
                <div className="action-buttons">
                    <button className="btn btn-secondary" onClick={fetchUsers}>Làm mới</button>
                    <button className="btn btn-primary" onClick={openAddModal}>Thêm User</button>
                    <button className="btn btn-primary" onClick={openEditModal} disabled={selectedIds.length !== 1}>Sửa</button>
                    <button className="btn btn-danger" onClick={deleteSelectedUsers} disabled={selectedIds.length === 0}>Xóa</button>
                    <button className="btn btn-warning" onClick={() => setBulkStatusOpen(true)} disabled={selectedIds.length === 0}>Đổi trạng thái</button>
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
                                    checked={users.length > 0 && selectedIds.length === users.length}
                                    onChange={toggleSelectAll} 
                                />
                            </th>
                            <th>Username</th>
                            <th>Họ và tên</th>
                            <th>Email</th>
                            <th style={{ textAlign: 'center' }}>Vai trò</th>
                            <th style={{ textAlign: 'center' }}>Trạng thái</th>
                            <th style={{ textAlign: 'center' }}>Dung lượng</th>
                            <th style={{ textAlign: 'center' }}>Ngày đăng ký</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                    Đang tải danh sách người dùng...
                                </td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                    Không tìm thấy User nào phù hợp.
                                </td>
                            </tr>
                        ) : (
                            users.map((u) => {
                                let roleText = 'Client (Khách)';
                                let roleClass = 'badge-unused';
                                if (u.is_superuser) {
                                    roleText = 'Superuser';
                                    roleClass = 'badge-good';
                                } else if (u.is_staff) {
                                    roleText = 'Staff';
                                    roleClass = 'badge-active';
                                }
                                const statusText = u.is_active ? 'Active' : 'Locked';
                                const statusClass = u.is_active ? 'badge-success' : 'badge-danger';
                                const storageGB = u.storage_space ? (u.storage_space / (1024 * 1024 * 1024)).toFixed(0) : '0';

                                return (
                                    <tr key={u.id}>
                                        <td style={{ textAlign: 'center' }}>
                                            <input 
                                                type="checkbox" 
                                                className="table-chk" 
                                                checked={selectedIds.includes(u.id)}
                                                onChange={() => handleSelectRow(u.id)}
                                            />
                                        </td>
                                        <td style={{ fontWeight: 600, color: 'var(--accent)' }}>{u.username}</td>
                                        <td>{u.full_name || '-'}</td>
                                        <td>{u.email || '-'}</td>
                                        <td style={{ textAlign: 'center' }}><span className={`badge ${roleClass}`}>{roleText}</span></td>
                                        <td style={{ textAlign: 'center' }}><span className={`badge ${statusClass}`}>{statusText}</span></td>
                                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{storageGB} GB</td>
                                        <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>{formatDateString(u.date_joined)}</td>
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

            {/* Add User Modal */}
            {addOpen && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>Thêm người dùng mới</h3>
                            <button className="modal-close" onClick={() => setAddOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Username</label>
                                <input type="text" className="form-input" value={addUsername} onChange={(e) => setAddUsername(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Mật khẩu</label>
                                <input type="password" className="form-input" value={addPassword} onChange={(e) => setAddPassword(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input type="email" className="form-input" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Họ và tên</label>
                                <input type="text" className="form-input" value={addFullName} onChange={(e) => setAddFullName(e.target.value)} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Quyền hạn (Staff)</label>
                                    <select className="filter-select" value={addIsStaff} onChange={(e) => setAddIsStaff(e.target.value)}>
                                        <option value="false">Client (Thường)</option>
                                        <option value="true">Staff (Quản trị)</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Dung lượng (GB)</label>
                                    <input type="number" className="form-input" value={addStorage} onChange={(e) => setAddStorage(parseInt(e.target.value) || 0)} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Mã Plan</label>
                                    <input type="number" className="form-input" value={addPlanId} onChange={(e) => setAddPlanId(parseInt(e.target.value) || 0)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Ngày hết hạn Plan</label>
                                    <input type="date" className="form-input" value={addPlanExpired} onChange={(e) => setAddPlanExpired(e.target.value)} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setAddOpen(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={saveAddUser}>Thêm mới</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {editOpen && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>Chỉnh sửa người dùng</h3>
                            <button className="modal-close" onClick={() => setEditOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Username</label>
                                <input type="text" className="form-input" value={editUsername} readOnly style={{ background: 'rgba(255,255,255,0.01)', color: 'var(--text-muted)' }} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Mật khẩu mới (Bỏ trống nếu không đổi)</label>
                                <input type="password" className="form-input" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Email</label>
                                <input type="email" className="form-input" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Họ và tên</label>
                                <input type="text" className="form-input" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Quyền hạn (Staff)</label>
                                    <select className="filter-select" value={editIsStaff} onChange={(e) => setEditIsStaff(e.target.value)}>
                                        <option value="false">Client (Thường)</option>
                                        <option value="true">Staff (Quản trị)</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Trạng thái tài khoản</label>
                                    <select className="filter-select" value={editIsActive} onChange={(e) => setEditIsActive(e.target.value)}>
                                        <option value="true">Hoạt động</option>
                                        <option value="false">Khóa tài khoản</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Dung lượng (GB)</label>
                                    <input type="number" className="form-input" value={editStorage} onChange={(e) => setEditStorage(parseInt(e.target.value) || 0)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Mã Plan</label>
                                    <input type="number" className="form-input" value={editPlanId} onChange={(e) => setEditPlanId(parseInt(e.target.value) || 0)} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ngày hết hạn Plan</label>
                                <input type="date" className="form-input" value={editPlanExpired} onChange={(e) => setEditPlanExpired(e.target.value)} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setEditOpen(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={saveEditUser}>Lưu thay đổi</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Status Modal */}
            {bulkStatusOpen && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>Đổi trạng thái hàng loạt</h3>
                            <button className="modal-close" onClick={() => setBulkStatusOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Đang chọn {selectedIds.length} người dùng</label>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Trạng thái mới</label>
                                <select className="filter-select" style={{ width: '100%' }} value={bulkStatusVal} onChange={(e) => setBulkStatusVal(e.target.value)}>
                                    <option value="active">Hoạt động (Active)</option>
                                    <option value="lock">Khóa (Locked)</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setBulkStatusOpen(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={saveBulkStatus}>Cập nhật</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
