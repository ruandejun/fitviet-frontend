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

export default function Profiles({ currentUser, page, onPageChange }) {
    const [profiles, setProfiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [count, setCount] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [agentStatus, setAgentStatus] = useState(null);
    
    // Modals
    const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
    const [bulkStatusVal, setBulkStatusVal] = useState('Active');

    const fetchProfiles = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        let url = `/dashboard/api/profiles/?page=${page}&page_size=${pageSize}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        try {
            const resp = await apiRequest(url);
            if (resp.ok) {
                const data = await resp.json();
                setProfiles(data.results || data);
                setCount(data.count || (data.results || data).length);
                if (data.agent_status) {
                    setAgentStatus(data.agent_status);
                }
            }
        } catch (err) {
            console.error("Error loading profiles:", err);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfiles(true);
        const interval = setInterval(() => {
            fetchProfiles(false);
        }, 3000);
        return () => clearInterval(interval);
    }, [page, pageSize]);

    const handleRunProfile = async (id) => {
        if (window.qhtdBridge && typeof window.qhtdBridge.runBrowserProfile === 'function') {
            try {
                const res = await window.qhtdBridge.runBrowserProfile(id);
                const parsed = JSON.parse(res);
                if (parsed.success) {
                    fetchProfiles(false);
                    return;
                } else if (parsed.error) {
                    alert('Lỗi local bridge: ' + parsed.error);
                    return;
                }
            } catch (e) {
                console.error("Local run profile failed, falling back to API", e);
            }
        }
        try {
            const resp = await apiRequest(`/dashboard/api/profiles/${id}/run/`, {
                method: 'POST'
            });
            const data = await resp.json();
            if (resp.ok) {
                // Instantly refresh profiles state
                fetchProfiles(false);
            } else {
                alert('Lỗi: ' + (data.message || 'Không thể gửi lệnh.'));
            }
        } catch (err) {
            alert('Lỗi kết nối hoặc hệ thống.');
        }
    };

    const handleStopProfile = async (id) => {
        if (window.qhtdBridge && typeof window.qhtdBridge.stopBrowserProfile === 'function') {
            try {
                const res = await window.qhtdBridge.stopBrowserProfile(id);
                const parsed = JSON.parse(res);
                if (parsed.success) {
                    fetchProfiles(false);
                    return;
                } else if (parsed.error) {
                    alert('Lỗi local bridge: ' + parsed.error);
                    return;
                }
            } catch (e) {
                console.error("Local stop profile failed, falling back to API", e);
            }
        }
        try {
            const resp = await apiRequest(`/dashboard/api/profiles/${id}/stop/`, {
                method: 'POST'
            });
            const data = await resp.json();
            if (resp.ok) {
                // Instantly refresh profiles state
                fetchProfiles(false);
            } else {
                alert('Lỗi: ' + (data.message || 'Không thể dừng trình duyệt.'));
            }
        } catch (err) {
            alert('Lỗi kết nối hoặc hệ thống.');
        }
    };

    // Handle search input with debounce
    useEffect(() => {
        const t = setTimeout(() => {
            if (page !== 1) {
                onPageChange(1);
            } else {
                fetchProfiles();
            }
        }, 300);
        return () => clearTimeout(t);
    }, [search]);

    const toggleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(profiles.map(p => p.id));
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

    const deleteSelectedProfiles = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} profiles đã chọn?`)) return;

        try {
            const deletePromises = selectedIds.map(id => {
                return apiRequest(`/dashboard/api/profiles/${id}/`, {
                    method: 'DELETE'
                });
            });
            await Promise.all(deletePromises);
            alert('Đã xóa profiles thành công!');
            setSelectedIds([]);
            fetchProfiles();
        } catch (err) {
            alert('Lỗi khi xóa profiles.');
        }
    };

    const saveBulkStatus = async () => {
        try {
            const response = await apiRequest('/dashboard/api/profiles/bulk-status/', {
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
                fetchProfiles();
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
                <div className="control-filters" style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                    <div className="search-box">
                        <input 
                            type="text" 
                            className="search-input" 
                            placeholder="Tìm kiếm Profile..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select className="filter-select" value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value)); onPageChange(1); }}>
                        <option value={10}>10 dòng</option>
                        <option value={20}>20 dòng</option>
                        <option value={50}>50 dòng</option>
                        <option value={100}>100 dòng</option>
                    </select>

                    {agentStatus && (
                        <div className={`agent-status-badge ${agentStatus.online ? 'online' : 'offline'}`} style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '600',
                            backgroundColor: agentStatus.online ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: agentStatus.online ? '#10b981' : '#ef4444',
                            border: `1px solid ${agentStatus.online ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`
                        }}>
                            <span style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: agentStatus.online ? '#10b981' : '#ef4444',
                                boxShadow: agentStatus.online ? '0 0 8px #10b981' : 'none'
                            }}></span>
                            Agent: {agentStatus.online ? `Đang hoạt động (${agentStatus.hwid.substring(0, 8)}...)` : 'Chưa kết nối (MunLogin)'}
                        </div>
                    )}
                </div>
                <div className="action-buttons">
                    <button className="btn btn-secondary" onClick={fetchProfiles}>Làm mới</button>
                    {currentUser.is_staff && (
                        <>
                            <button className="btn btn-danger" onClick={deleteSelectedProfiles} disabled={selectedIds.length === 0}>Xóa</button>
                            <button className="btn btn-warning" onClick={() => setBulkStatusOpen(true)} disabled={selectedIds.length === 0}>Đổi trạng thái</button>
                        </>
                    )}
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
                                    checked={profiles.length > 0 && selectedIds.length === profiles.length}
                                    onChange={toggleSelectAll} 
                                />
                            </th>
                            <th>Tên Profile</th>
                            <th>Hệ điều hành</th>
                            <th>Trình duyệt</th>
                            <th>Proxy / Port</th>
                            <th>Socks5 Details</th>
                            <th>Original Name</th>
                            <th style={{ textAlign: 'center' }}>Hành động</th>
                            <th>Trạng thái</th>
                            <th>Ngày tạo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                    Đang tải danh sách profiles...
                                </td>
                            </tr>
                        ) : profiles.length === 0 ? (
                            <tr>
                                <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                    Không tìm thấy profile nào.
                                </td>
                            </tr>
                        ) : (
                            profiles.map((p) => {
                                return (
                                    <tr key={p.id}>
                                        <td style={{ textAlign: 'center' }}>
                                            <input 
                                                type="checkbox" 
                                                className="table-chk" 
                                                checked={selectedIds.includes(p.id)}
                                                onChange={() => handleSelectRow(p.id)}
                                            />
                                        </td>
                                        <td style={{ fontWeight: 600 }}>{p.profile_name || '-'}</td>
                                        <td>{p.profile_os || '-'}</td>
                                        <td>{p.profile_browser || '-'} (v{p.profile_version || ''})</td>
                                        <td>{p.profile_proxy_type || 'Direct'} / {p.profile_proxy_details || '-'}</td>
                                        <td style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>{p.profile_socks5_details || '-'}</td>
                                        <td>{p.profile_original_name || '-'}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            {p.is_running ? (
                                                <button 
                                                    className="btn btn-danger" 
                                                    onClick={() => handleStopProfile(p.id)}
                                                    style={{ padding: '4px 10px', fontSize: '12px', minHeight: '26px', lineHeight: '1' }}
                                                >
                                                    🛑 Dừng
                                                </button>
                                            ) : (
                                                <button 
                                                    className="btn btn-success" 
                                                    onClick={() => handleRunProfile(p.id)}
                                                    disabled={(!agentStatus || !agentStatus.online) && !window.qhtdBridge}
                                                    style={{ padding: '4px 10px', fontSize: '12px', minHeight: '26px', lineHeight: '1' }}
                                                >
                                                    ▶ Chạy
                                                </button>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`badge ${p.profile_status === 'Active' ? 'badge-success' : 'badge-unused'}`}>
                                                {p.profile_status || 'Active'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>{formatDateString(p.created)}</td>
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
                                <label className="form-label">Đang chọn {selectedIds.length} profiles</label>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Trạng thái mới</label>
                                <select className="filter-select" style={{ width: '100%' }} value={bulkStatusVal} onChange={(e) => setBulkStatusVal(e.target.value)}>
                                    <option value="Active">Hoạt động (Active)</option>
                                    <option value="Inactive">Bị khóa (Inactive)</option>
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
