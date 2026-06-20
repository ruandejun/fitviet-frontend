import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import Pagination from '../components/Pagination';
import SearchableSelect from '../components/SearchableSelect';

export default function HWIDs({ currentUser, page, onPageChange }) {
    const [hwids, setHwids] = useState([]);
    const [loading, setLoading] = useState(true);
    const [count, setCount] = useState(0);
    const [pageSize, setPageSize] = useState(20);

    // Filters
    const [search, setSearch] = useState('');
    const [userIdFilter, setUserIdFilter] = useState('');

    // Selection
    const [selectedIds, setSelectedIds] = useState([]);

    // Modals
    const [addOpen, setAddOpen] = useState(false);
    const [addUserId, setAddUserId] = useState('');
    const [addHwidValue, setAddHwidValue] = useState('');
    const [addNote, setAddNote] = useState('');
    const [addLoading, setAddLoading] = useState(false);

    const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
    const [bulkStatusVal, setBulkStatusVal] = useState(0);

    const fetchHwids = async () => {
        setLoading(true);
        let url = `/dashboard/api/hwids/?page=${page}&page_size=${pageSize}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (userIdFilter) url += `&user_id=${userIdFilter}`;

        try {
            const resp = await apiRequest(url);
            if (resp.ok) {
                const data = await resp.json();
                setHwids(data.results || data);
                setCount(data.count || (data.results || data).length);
            }
        } catch (err) {
            console.error("Error loading HWIDs:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHwids();
    }, [page, pageSize, userIdFilter]);

    useEffect(() => {
        const t = setTimeout(() => {
            if (page !== 1) {
                onPageChange(1);
            } else {
                fetchHwids();
            }
        }, 300);
        return () => clearTimeout(t);
    }, [search]);

    const handleSelectRow = (id) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(x => x !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const toggleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(hwids.map(h => h.id));
        } else {
            setSelectedIds([]);
        }
    };

    // Actions
    const handleToggleStatus = async (id, currentStatus) => {
        try {
            const resp = await apiRequest(`/dashboard/api/hwids/${id}/toggle-status/`, {
                method: 'POST'
            });
            const data = await resp.json();
            alert(data.message || 'Đã cập nhật trạng thái.');
            fetchHwids();
        } catch (err) {
            alert('Lỗi khi cập nhật trạng thái.');
        }
    };

    const handleDeleteSingle = async (id, username) => {
        if (!confirm(`Xóa HWID ID=${id} của user "${username}"?\nUser sẽ không thể login bằng máy này nữa.`)) return;
        try {
            const resp = await apiRequest(`/dashboard/api/hwids/${id}/`, {
                method: 'DELETE'
            });
            if (resp.ok) {
                alert('Đã xóa HWID!');
                setSelectedIds(selectedIds.filter(x => x !== id));
                fetchHwids();
            } else {
                alert('Lỗi khi xóa HWID.');
            }
        } catch (err) {
            alert('Lỗi kết nối.');
        }
    };

    const handleResetUserHwid = async (userId, username) => {
        if (!confirm(`⚠️ RESET tất cả HWID của user "${username}" (ID=${userId})?\n\nSau khi reset, lần đầu user login bằng bất kỳ máy nào sẽ tự động được đăng ký là máy mới.`)) return;
        try {
            const resp = await apiRequest(`/dashboard/api/hwids/reset-user/?user_id=${userId}`, {
                method: 'DELETE'
            });
            const data = await resp.json();
            alert('✅ ' + (data.message || 'Đã reset HWID thành công!'));
            fetchHwids();
        } catch (err) {
            alert('Lỗi khi reset HWID.');
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Xóa ${selectedIds.length} HWID đã chọn? User sẽ không thể login bằng máy đó nữa.`)) return;
        try {
            await Promise.all(selectedIds.map(id =>
                apiRequest(`/dashboard/api/hwids/${id}/`, {
                    method: 'DELETE'
                })
            ));
            alert('Đã xóa HWID thành công!');
            setSelectedIds([]);
            fetchHwids();
        } catch (err) {
            alert('Lỗi khi xóa HWID.');
        }
    };

    const saveBulkStatus = async () => {
        try {
            const response = await apiRequest('/dashboard/api/hwids/bulk-status/', {
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
                fetchHwids();
            } else {
                alert('Lỗi: ' + (data.message || 'Không thể cập nhật trạng thái.'));
            }
        } catch (err) {
            alert('Lỗi kết nối.');
        }
    };

    const handleAddHwid = async () => {
        if (!addUserId || !addHwidValue) {
            alert('Vui lòng nhập User ID và HWID Value');
            return;
        }
        setAddLoading(true);
        try {
            const resp = await apiRequest('/dashboard/api/hwids/', {
                method: 'POST',
                body: JSON.stringify({
                    user: parseInt(addUserId),
                    value: addHwidValue.trim(),
                    note: addNote.trim(),
                    status: 0
                })
            });
            if (resp.ok) {
                setAddOpen(false);
                setAddUserId('');
                setAddHwidValue('');
                setAddNote('');
                alert('✅ Đã thêm HWID thành công! User sẽ có thể dùng tool ngay.');
                fetchHwids();
            } else {
                const err = await resp.json();
                alert('Lỗi: ' + JSON.stringify(err));
            }
        } catch (err) {
            alert('Lỗi kết nối.');
        } finally {
            setAddLoading(false);
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
                            placeholder="Tìm HWID hoặc username..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <SearchableSelect
                        currentUser={currentUser}
                        value={userIdFilter}
                        onChange={setUserIdFilter}
                        placeholder="Lọc theo user..."
                        valueKey="id"
                        role=""
                        unassignedLabel="Tất cả user"
                        unassignedValue=""
                        style={{ width: '180px' }}
                    />
                    <select className="filter-select" value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value)); onPageChange(1); }}>
                        <option value={20}>20 dòng</option>
                        <option value={50}>50 dòng</option>
                        <option value={100}>100 dòng</option>
                    </select>
                </div>
                <div className="action-buttons">
                    <button className="btn btn-primary" onClick={() => setAddOpen(true)}>➕ Thêm HWID</button>
                    <button className="btn btn-secondary" onClick={fetchHwids}>🔄 Làm mới</button>
                    <button className="btn btn-danger" onClick={handleDeleteSelected} disabled={selectedIds.length === 0}>🗑️ Xóa</button>
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
                                    checked={hwids.length > 0 && selectedIds.length === hwids.length}
                                    onChange={toggleSelectAll}
                                />
                            </th>
                            <th style={{ width: '60px', textAlign: 'center' }}>#</th>
                            <th>Username</th>
                            <th>HWID Value</th>
                            <th>Ghi chú</th>
                            <th>Trạng thái</th>
                            <th>Ngày tạo</th>
                            <th style={{ width: '220px', textAlign: 'center' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                    Đang tải danh sách HWID...
                                </td>
                            </tr>
                        ) : hwids.length === 0 ? (
                            <tr>
                                <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                    Không tìm thấy HWID nào.
                                </td>
                            </tr>
                        ) : (
                            hwids.map((h, idx) => {
                                const isActive = h.status === 0;
                                const shortHwid = h.value && h.value.length > 35 ? h.value.substring(0, 35) + '...' : (h.value || '-');
                                const createdDate = h.created ? new Date(h.created).toLocaleDateString('vi-VN') : '-';
                                const stt = (page - 1) * pageSize + idx + 1;

                                return (
                                    <tr key={h.id} className={selectedIds.includes(h.id) ? 'row-selected' : ''} onClick={() => handleSelectRow(h.id)} style={{ cursor: 'pointer' }}>
                                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                            <input 
                                                type="checkbox" 
                                                className="table-chk" 
                                                checked={selectedIds.includes(h.id)}
                                                onChange={() => handleSelectRow(h.id)}
                                            />
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>{stt}</td>
                                        <td>
                                            <strong>{h.username || '-'}</strong>
                                            <br/><small style={{ color: 'var(--text-muted)' }}>ID: {h.user}</small>
                                        </td>
                                        <td>
                                            <code 
                                                style={{ fontSize: '11px', color: 'var(--accent)', background: 'rgba(0,242,254,0.05)', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigator.clipboard.writeText(h.value || '').then(() => alert('Đã copy thành công HWID!'));
                                                }}
                                                title="Click để sao chép HWID"
                                            >
                                                {shortHwid}
                                            </code>
                                        </td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{h.note || '-'}</td>
                                        <td>
                                            <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`}>
                                                {isActive ? '✅ Active' : '🔒 Locked'}
                                            </span>
                                        </td>
                                        <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{createdDate}</td>
                                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                <button className="btn btn-secondary" onClick={() => handleToggleStatus(h.id, h.status)} style={{ padding: '5px 10px', fontSize: '11px' }}>
                                                    {isActive ? '🔒 Khóa' : '✅ Mở'}
                                                </button>
                                                <button className="btn btn-danger" onClick={() => handleDeleteSingle(h.id, h.username)} style={{ padding: '5px 10px', fontSize: '11px' }}>
                                                    🗑️
                                                </button>
                                                <button className="btn btn-secondary" onClick={() => handleResetUserHwid(h.user, h.username)} style={{ padding: '5px 10px', fontSize: '11px', borderColor: 'var(--warning)', color: 'var(--warning)' }}>
                                                    🔄 Reset
                                                </button>
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
                page={page}
                count={count}
                pageSize={pageSize}
                onPageChange={onPageChange}
            />

            {/* 1. Add HWID Modal */}
            {addOpen && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>➕ Thêm mới HWID</h3>
                            <button className="modal-close" onClick={() => setAddOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Người dùng</label>
                                <SearchableSelect
                                    currentUser={currentUser}
                                    value={addUserId}
                                    onChange={setAddUserId}
                                    placeholder="Chọn người dùng..."
                                    valueKey="id"
                                    role=""
                                    unassignedLabel="-- Chọn người dùng --"
                                    unassignedValue=""
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">HWID Value (Mã định danh máy)</label>
                                <input type="text" className="form-input" value={addHwidValue} onChange={(e) => setAddHwidValue(e.target.value)} placeholder="Dán mã HWID..." required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Ghi chú (Note)</label>
                                <input type="text" className="form-input" value={addNote} onChange={(e) => setAddNote(e.target.value)} placeholder="Ví dụ: Máy văn phòng, máy nhà..." />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setAddOpen(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleAddHwid} disabled={addLoading}>
                                {addLoading ? 'Đang thêm...' : 'Thêm HWID'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. Bulk Status Modal */}
            {bulkStatusOpen && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>Đổi Trạng Thái HWID Số Lượng Lớn</h3>
                            <button className="modal-close" onClick={() => setBulkStatusOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Chọn trạng thái mới</label>
                                <select className="filter-select" style={{ width: '100%' }} value={bulkStatusVal} onChange={(e) => setBulkStatusVal(parseInt(e.target.value))}>
                                    <option value="0">Hoạt động (Active)</option>
                                    <option value="1">Bị khóa / Chưa kích hoạt</option>
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
        </div>
    );
}
