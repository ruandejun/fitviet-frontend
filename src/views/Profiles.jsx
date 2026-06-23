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

const WebGLOptions = {
    "": {
        label: "Mặc định (Ngẫu nhiên)",
        renderers: [
            { value: "", label: "Mặc định (Ngẫu nhiên)" }
        ]
    },
    "Google Inc. (Intel)": {
        label: "Google Inc. (Intel)",
        renderers: [
            { value: "", label: "Mặc định (Ngẫu nhiên Intel)" },
            { value: "ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)", label: "Intel(R) UHD Graphics 630" },
            { value: "ANGLE (Intel, Intel(R) UHD Graphics 770 Direct3D11 vs_5_0 ps_5_0, D3D11)", label: "Intel(R) UHD Graphics 770" },
            { value: "ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)", label: "Intel(R) Iris(R) Xe Graphics" },
            { value: "ANGLE (Intel, Intel(R) HD Graphics 4000 Direct3D11 vs_5_0 ps_5_0, D3D11)", label: "Intel(R) HD Graphics 4000" }
        ]
    },
    "Google Inc. (NVIDIA)": {
        label: "Google Inc. (NVIDIA)",
        renderers: [
            { value: "", label: "Mặc định (Ngẫu nhiên NVIDIA)" },
            { value: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0, D3D11)", label: "NVIDIA GeForce RTX 3060" },
            { value: "ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0, D3D11)", label: "NVIDIA GeForce RTX 3070" },
            { value: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Direct3D11 vs_5_0 ps_5_0, D3D11)", label: "NVIDIA GeForce RTX 4060" },
            { value: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0, D3D11)", label: "NVIDIA GeForce RTX 4070" },
            { value: "ANGLE (NVIDIA, NVIDIA GeForce GTX 1660 SUPER Direct3D11 vs_5_0 ps_5_0, D3D11)", label: "NVIDIA GeForce GTX 1660 SUPER" },
            { value: "ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 Direct3D11 vs_5_0 ps_5_0, D3D11)", label: "NVIDIA GeForce GTX 1080" }
        ]
    },
    "Google Inc. (AMD)": {
        label: "Google Inc. (AMD)",
        renderers: [
            { value: "", label: "Mặc định (Ngẫu nhiên AMD)" },
            { value: "ANGLE (AMD, AMD Radeon RX 580 Direct3D11 vs_5_0 ps_5_0, D3D11)", label: "AMD Radeon RX 580" },
            { value: "ANGLE (AMD, AMD Radeon RX 6600 XT Direct3D11 vs_5_0 ps_5_0, D3D11)", label: "AMD Radeon RX 6600 XT" },
            { value: "ANGLE (AMD, AMD Radeon RX 7600 Direct3D11 vs_5_0 ps_5_0, D3D11)", label: "AMD Radeon RX 7600" }
        ]
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

    const [createModalOpen, setCreateModalOpen] = useState(false);
    const [newProfile, setNewProfile] = useState({
        profile_name: '',
        profile_os: 'Window',
        profile_proxy_type: 0,
        profile_socks5_details: '',
        profile_proxy_username: '',
        profile_proxy_password: '',
        profile_vendor: '',
        profile_renderer: '',
        profile_start_url: 'https://iphey.com',
        profile_note: ''
    });

    const handleCreateProfile = async (e) => {
        if (e) e.preventDefault();
        if (!newProfile.profile_name.trim()) {
            alert('Vui lòng nhập tên trình duyệt');
            return;
        }

        try {
            const resp = await apiRequest('/dashboard/api/profiles/', {
                method: 'POST',
                body: JSON.stringify({
                    profile_name: newProfile.profile_name.trim(),
                    profile_os: newProfile.profile_os,
                    profile_proxy_type: parseInt(newProfile.profile_proxy_type),
                    profile_proxy_details: newProfile.profile_socks5_details.trim(),
                    profile_socks5_details: newProfile.profile_socks5_details.trim(),
                    profile_proxy_username: newProfile.profile_proxy_username.trim(),
                    profile_proxy_password: newProfile.profile_proxy_password.trim(),
                    profile_vendor: newProfile.profile_vendor.trim(),
                    profile_renderer: newProfile.profile_renderer.trim(),
                    profile_start_url: newProfile.profile_start_url.trim() || 'https://iphey.com',
                    profile_note: newProfile.profile_note.trim()
                })
            });

            const data = await resp.json();
            if (resp.ok) {
                alert('Đã tạo trình duyệt mới thành công!');
                setCreateModalOpen(false);
                setNewProfile({
                    profile_name: '',
                    profile_os: 'Window',
                    profile_proxy_type: 0,
                    profile_socks5_details: '',
                    profile_proxy_username: '',
                    profile_proxy_password: '',
                    profile_vendor: '',
                    profile_renderer: '',
                    profile_start_url: 'https://iphey.com',
                    profile_note: ''
                });
                fetchProfiles();
            } else {
                alert('Lỗi: ' + (data.message || JSON.stringify(data)));
            }
        } catch (err) {
            alert('Lỗi kết nối hoặc hệ thống khi tạo profile.');
        }
    };

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
        }, 1000);
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
                <div className="action-buttons" style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-primary" onClick={() => setCreateModalOpen(true)}>+ Thêm mới</button>
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

            {/* Create Profile Modal */}
            {createModalOpen && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-box" style={{ maxWidth: '500px', width: '90%' }}>
                        <div className="modal-header">
                            <h3>Tạo trình duyệt ẩn danh mới</h3>
                            <button className="modal-close" onClick={() => setCreateModalOpen(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleCreateProfile}>
                            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: '5px' }}>
                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Tên Trình Duyệt *</label>
                                    <input 
                                        type="text" 
                                        className="search-input" 
                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', color: 'var(--text-color)' }}
                                        placeholder="Nhập tên trình duyệt (ví dụ: Chrome_OS1)"
                                        value={newProfile.profile_name}
                                        onChange={(e) => setNewProfile({ ...newProfile, profile_name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Hệ Điều Hành</label>
                                    <select 
                                        className="filter-select" 
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--modal-bg)', color: 'var(--text-color)' }}
                                        value={newProfile.profile_os} 
                                        onChange={(e) => setNewProfile({ ...newProfile, profile_os: e.target.value })}
                                    >
                                        <option value="Window">Windows</option>
                                        <option value="Mac OS X">macOS</option>
                                        <option value="Linux">Linux</option>
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Loại Proxy</label>
                                    <select 
                                        className="filter-select" 
                                        style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--modal-bg)', color: 'var(--text-color)' }}
                                        value={newProfile.profile_proxy_type} 
                                        onChange={(e) => setNewProfile({ ...newProfile, profile_proxy_type: parseInt(e.target.value) })}
                                    >
                                        <option value={0}>Không dùng proxy (Direct)</option>
                                        <option value={2}>Socks5 Proxy</option>
                                    </select>
                                </div>
                                {newProfile.profile_proxy_type === 2 && (
                                    <>
                                        <div className="form-group" style={{ marginBottom: '15px' }}>
                                            <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Chi tiết Proxy (ip:port)*</label>
                                            <input 
                                                type="text" 
                                                className="search-input" 
                                                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', color: 'var(--text-color)' }}
                                                placeholder="Ví dụ: 127.0.0.1:1080"
                                                value={newProfile.profile_socks5_details}
                                                onChange={(e) => setNewProfile({ ...newProfile, profile_socks5_details: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: '15px' }}>
                                            <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Tài khoản Proxy (nếu có)</label>
                                            <input 
                                                type="text" 
                                                className="search-input" 
                                                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', color: 'var(--text-color)' }}
                                                placeholder="Username"
                                                value={newProfile.profile_proxy_username}
                                                onChange={(e) => setNewProfile({ ...newProfile, profile_proxy_username: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: '15px' }}>
                                            <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Mật khẩu Proxy (nếu có)</label>
                                            <input 
                                                type="password" 
                                                className="search-input" 
                                                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', color: 'var(--text-color)' }}
                                                placeholder="Password"
                                                value={newProfile.profile_proxy_password}
                                                onChange={(e) => setNewProfile({ ...newProfile, profile_proxy_password: e.target.value })}
                                            />
                                        </div>
                                    </>
                                )}
                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>WebGL Vendor</label>
                                    <select 
                                        className="search-input" 
                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '8px', background: '#1d1b26', color: 'var(--text-color)' }}
                                        value={newProfile.profile_vendor}
                                        onChange={(e) => {
                                            const newVendor = e.target.value;
                                            setNewProfile({ 
                                                ...newProfile, 
                                                profile_vendor: newVendor,
                                                profile_renderer: "" 
                                            });
                                        }}
                                    >
                                        {Object.keys(WebGLOptions).map(v => (
                                            <option key={v} value={v}>{WebGLOptions[v].label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>WebGL Renderer</label>
                                    <select 
                                        className="search-input" 
                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '8px', background: '#1d1b26', color: 'var(--text-color)' }}
                                        value={newProfile.profile_renderer}
                                        onChange={(e) => setNewProfile({ ...newProfile, profile_renderer: e.target.value })}
                                    >
                                        {(WebGLOptions[newProfile.profile_vendor] || WebGLOptions[""]).renderers.map(r => (
                                            <option key={r.value} value={r.value}>{r.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Trang Web Bắt Đầu</label>
                                    <input 
                                        type="url" 
                                        className="search-input" 
                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', color: 'var(--text-color)' }}
                                        placeholder="Mặc định: https://iphey.com"
                                        value={newProfile.profile_start_url}
                                        onChange={(e) => setNewProfile({ ...newProfile, profile_start_url: e.target.value })}
                                    />
                                </div>
                                <div className="form-group" style={{ marginBottom: '15px' }}>
                                    <label className="form-label" style={{ display: 'block', marginBottom: '5px', fontWeight: 600 }}>Ghi Chú</label>
                                    <textarea 
                                        className="search-input" 
                                        rows="3"
                                        style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'rgba(255,255,255,0.02)', color: 'var(--text-color)', resize: 'vertical' }}
                                        placeholder="Nhập ghi chú..."
                                        value={newProfile.profile_note}
                                        onChange={(e) => setNewProfile({ ...newProfile, profile_note: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setCreateModalOpen(false)}>Hủy</button>
                                <button type="submit" className="btn btn-primary">Tạo Mới</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
