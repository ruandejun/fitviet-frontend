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

export default function Proxies({ currentUser, page, onPageChange }) {
    const [proxies, setProxies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [count, setCount] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);

    // Modals
    const [addOpen, setAddOpen] = useState(false);
    const [addSocksPort, setAddSocksPort] = useState('');
    const [addControlPort, setAddControlPort] = useState('');
    const [addBridges, setAddBridges] = useState('');
    const [addRotatingTime, setAddRotatingTime] = useState('60');
    const [addCountry, setAddCountry] = useState('');

    const [editOpen, setEditOpen] = useState(false);
    const [editProxyId, setEditProxyId] = useState(null);
    const [editSocksPort, setEditSocksPort] = useState('');
    const [editControlPort, setEditControlPort] = useState('');
    const [editBridges, setEditBridges] = useState('');
    const [editRotatingTime, setEditRotatingTime] = useState('60');
    const [editCountry, setEditCountry] = useState('');

    const fetchProxies = async () => {
        setLoading(true);
        let url = `/dashboard/api/proxies/?page=${page}&page_size=${pageSize}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;

        try {
            const resp = await apiRequest(url);
            if (resp.ok) {
                const data = await resp.json();
                setProxies(data.results || data);
                setCount(data.count || (data.results || data).length);
            }
        } catch (err) {
            console.error("Error loading proxies:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProxies();
    }, [page, pageSize]);

    // Handle search input with debounce
    useEffect(() => {
        const t = setTimeout(() => {
            if (page !== 1) {
                onPageChange(1);
            } else {
                fetchProxies();
            }
        }, 300);
        return () => clearTimeout(t);
    }, [search]);

    const toggleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(proxies.map(p => p.id));
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

    const deleteSelectedProxies = async () => {
        if (selectedIds.length === 0) return;
        if (!confirm(`Bạn có muốn xóa ${selectedIds.length} Tor proxy đã chọn không?`)) return;

        try {
            const deletePromises = selectedIds.map(id => {
                return apiRequest(`/dashboard/api/proxies/${id}/`, {
                    method: 'DELETE'
                });
            });
            await Promise.all(deletePromises);
            alert('Đã xóa Tor proxy thành công!');
            setSelectedIds([]);
            fetchProxies();
        } catch (err) {
            alert('Lỗi khi xóa proxies.');
        }
    };

    const saveAddProxy = async () => {
        if (!addSocksPort || !addControlPort) {
            alert('Vui lòng điền đầy đủ port.');
            return;
        }

        try {
            const response = await apiRequest('/dashboard/api/proxies/', {
                method: 'POST',
                body: JSON.stringify({
                    socks_port: addSocksPort,
                    control_port: addControlPort,
                    bridges_string: addBridges,
                    rotating_time: addRotatingTime,
                    country_name: addCountry
                })
            });

            if (response.ok) {
                setAddOpen(false);
                fetchProxies();
            } else {
                const err = await response.json();
                alert(`Lỗi: ${JSON.stringify(err)}`);
            }
        } catch (err) {
            alert('Lỗi kết nối.');
        }
    };

    const openEditModal = () => {
        if (selectedIds.length !== 1) return;
        const proxy = proxies.find(p => p.id === selectedIds[0]);
        if (!proxy) return;

        setEditProxyId(proxy.id);
        setEditSocksPort(proxy.socks_port);
        setEditControlPort(proxy.control_port);
        setEditBridges(proxy.bridges_string || '');
        setEditRotatingTime(proxy.rotating_time);
        setEditCountry(proxy.country_name || '');
        setEditOpen(true);
    };

    const saveEditProxy = async () => {
        try {
            const response = await apiRequest(`/dashboard/api/proxies/${editProxyId}/`, {
                method: 'PUT',
                body: JSON.stringify({
                    socks_port: editSocksPort,
                    control_port: editControlPort,
                    bridges_string: editBridges,
                    rotating_time: editRotatingTime,
                    country_name: editCountry
                })
            });

            if (response.ok) {
                setEditOpen(false);
                setSelectedIds([]);
                fetchProxies();
            } else {
                const err = await response.json();
                alert(`Lỗi: ${JSON.stringify(err)}`);
            }
        } catch (err) {
            alert('Lỗi kết nối.');
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
                            placeholder="Tìm kiếm Proxy..."
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
                </div>
                <div className="action-buttons">
                    <button className="btn btn-secondary" onClick={fetchProxies}>Làm mới</button>
                    {currentUser.is_staff && (
                        <>
                            <button className="btn btn-primary" onClick={() => setAddOpen(true)}>Thêm Proxy</button>
                            <button className="btn btn-primary" onClick={openEditModal} disabled={selectedIds.length !== 1}>Sửa</button>
                            <button className="btn btn-danger" onClick={deleteSelectedProxies} disabled={selectedIds.length === 0}>Xóa</button>
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
                                    checked={proxies.length > 0 && selectedIds.length === proxies.length}
                                    onChange={toggleSelectAll} 
                                />
                            </th>
                            <th>Socks Port</th>
                            <th>Control Port</th>
                            <th>Bridges String</th>
                            <th>Rotating Time (s)</th>
                            <th>Quốc gia</th>
                            <th>Ngày tạo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                    Đang tải danh sách proxies...
                                </td>
                            </tr>
                        ) : proxies.length === 0 ? (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                    Không tìm thấy Proxy nào.
                                </td>
                            </tr>
                        ) : (
                            proxies.map((p) => {
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
                                        <td style={{ fontWeight: 600 }}>{p.socks_port}</td>
                                        <td>{p.control_port}</td>
                                        <td style={{ fontSize: '11px', fontFamily: 'monospace', maxWidth: '300px', wordBreak: 'break-all' }}>{p.bridges_string || '-'}</td>
                                        <td style={{ textAlign: 'center' }}>{p.rotating_time}s</td>
                                        <td>{p.country_name || '-'}</td>
                                        <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>{formatDateString(p.created_at)}</td>
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

            {/* Add Proxy Modal */}
            {addOpen && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>Thêm Proxy mới</h3>
                            <button className="modal-close" onClick={() => setAddOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Socks Port</label>
                                <input type="number" className="form-input" value={addSocksPort} onChange={(e) => setAddSocksPort(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Control Port</label>
                                <input type="number" className="form-input" value={addControlPort} onChange={(e) => setAddControlPort(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Bridges String (Bỏ trống nếu không có)</label>
                                <textarea className="form-textarea" value={addBridges} onChange={(e) => setAddBridges(e.target.value)}></textarea>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Rotating Time (giây)</label>
                                <input type="number" className="form-input" value={addRotatingTime} onChange={(e) => setAddRotatingTime(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Quốc gia</label>
                                <input type="text" className="form-input" value={addCountry} onChange={(e) => setAddCountry(e.target.value)} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setAddOpen(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={saveAddProxy}>Thêm mới</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Proxy Modal */}
            {editOpen && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>Chỉnh sửa Proxy</h3>
                            <button className="modal-close" onClick={() => setEditOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Socks Port</label>
                                <input type="number" className="form-input" value={editSocksPort} onChange={(e) => setEditSocksPort(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Control Port</label>
                                <input type="number" className="form-input" value={editControlPort} onChange={(e) => setEditControlPort(e.target.value)} required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Bridges String</label>
                                <textarea className="form-textarea" value={editBridges} onChange={(e) => setEditBridges(e.target.value)}></textarea>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Rotating Time (giây)</label>
                                <input type="number" className="form-input" value={editRotatingTime} onChange={(e) => setEditRotatingTime(e.target.value)} />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Quốc gia</label>
                                <input type="text" className="form-input" value={editCountry} onChange={(e) => setEditCountry(e.target.value)} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setEditOpen(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={saveEditProxy}>Lưu thay đổi</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
