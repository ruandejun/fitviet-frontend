import React, { useState, useEffect, useCallback } from 'react';
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

const formatTs = (ts) => {
    if (!ts) return '-';
    return new Date(ts * 1000).toLocaleString('vi-VN');
};

// Detect if running inside the desktop tool (PyQt6 WebEngine bridge)
const isDesktopMode = () => typeof window !== 'undefined' && !!window.munAutomationBridge;

// Call local router API at 127.0.0.1:8000 via QWebChannel bridge
const routerGet = (endpoint) => new Promise((resolve, reject) => {
    window.munAutomationBridge.apiProxyGet(endpoint, (result) => {
        try { resolve(JSON.parse(result)); }
        catch { resolve(result); }
    });
});

const routerPost = (endpoint, body) => new Promise((resolve, reject) => {
    window.munAutomationBridge.apiProxyPost(endpoint, JSON.stringify(body), (result) => {
        try { resolve(JSON.parse(result)); }
        catch { resolve(result); }
    });
});

// ── Tor Proxy (Django backend) ────────────────────────────────────────────────

function TorProxies({ currentUser, page, onPageChange }) {
    const [proxies, setProxies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [count, setCount] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [search, setSearch] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);

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

    const fetchProxies = useCallback(async () => {
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
            console.error('Error loading Tor proxies:', err);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, search]);

    useEffect(() => { fetchProxies(); }, [page, pageSize]);

    useEffect(() => {
        const t = setTimeout(() => {
            if (page !== 1) onPageChange(1);
            else fetchProxies();
        }, 300);
        return () => clearTimeout(t);
    }, [search]);

    const toggleSelectAll = (e) => {
        setSelectedIds(e.target.checked ? proxies.map(p => p.id) : []);
    };
    const handleSelectRow = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const deleteSelectedProxies = async () => {
        if (!selectedIds.length || !confirm(`Xóa ${selectedIds.length} Tor proxy?`)) return;
        try {
            await Promise.all(selectedIds.map(id => apiRequest(`/dashboard/api/proxies/${id}/`, { method: 'DELETE' })));
            alert('Đã xóa!');
            setSelectedIds([]);
            fetchProxies();
        } catch { alert('Lỗi khi xóa.'); }
    };

    const saveAddProxy = async () => {
        if (!addSocksPort || !addControlPort) { alert('Vui lòng điền đầy đủ port.'); return; }
        try {
            const resp = await apiRequest('/dashboard/api/proxies/', {
                method: 'POST',
                body: JSON.stringify({
                    socks_port: addSocksPort, control_port: addControlPort,
                    bridges_string: addBridges, rotating_time: addRotatingTime, country_name: addCountry,
                }),
            });
            if (resp.ok) { setAddOpen(false); fetchProxies(); }
            else alert(`Lỗi: ${JSON.stringify(await resp.json())}`);
        } catch { alert('Lỗi kết nối.'); }
    };

    const openEditModal = () => {
        if (selectedIds.length !== 1) return;
        const p = proxies.find(x => x.id === selectedIds[0]);
        if (!p) return;
        setEditProxyId(p.id); setEditSocksPort(p.socks_port); setEditControlPort(p.control_port);
        setEditBridges(p.bridges_string || ''); setEditRotatingTime(p.rotating_time);
        setEditCountry(p.country_name || ''); setEditOpen(true);
    };

    const saveEditProxy = async () => {
        try {
            const resp = await apiRequest(`/dashboard/api/proxies/${editProxyId}/`, {
                method: 'PUT',
                body: JSON.stringify({
                    socks_port: editSocksPort, control_port: editControlPort,
                    bridges_string: editBridges, rotating_time: editRotatingTime, country_name: editCountry,
                }),
            });
            if (resp.ok) { setEditOpen(false); setSelectedIds([]); fetchProxies(); }
            else alert(`Lỗi: ${JSON.stringify(await resp.json())}`);
        } catch { alert('Lỗi kết nối.'); }
    };

    return (
        <div>
            <div className="control-bar">
                <div className="control-filters">
                    <div className="search-box">
                        <input type="text" className="search-input" placeholder="Tìm kiếm Tor Proxy..."
                            value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <select className="filter-select" value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value)); onPageChange(1); }}>
                        {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} dòng</option>)}
                    </select>
                </div>
                <div className="action-buttons">
                    <button className="btn btn-secondary" onClick={fetchProxies}>Làm mới</button>
                    {currentUser.is_staff && (<>
                        <button className="btn btn-primary" onClick={() => setAddOpen(true)}>Thêm Proxy</button>
                        <button className="btn btn-primary" onClick={openEditModal} disabled={selectedIds.length !== 1}>Sửa</button>
                        <button className="btn btn-danger" onClick={deleteSelectedProxies} disabled={!selectedIds.length}>Xóa</button>
                    </>)}
                </div>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: 50, textAlign: 'center' }}>
                                <input type="checkbox" className="table-chk"
                                    checked={proxies.length > 0 && selectedIds.length === proxies.length}
                                    onChange={toggleSelectAll} />
                            </th>
                            <th>Socks Port</th><th>Control Port</th>
                            <th>Bridges String</th><th>Rotating Time (s)</th>
                            <th>Quốc gia</th><th>Ngày tạo</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>Đang tải...</td></tr>
                        ) : proxies.length === 0 ? (
                            <tr><td colSpan="7" style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>Không tìm thấy Proxy nào.</td></tr>
                        ) : proxies.map(p => (
                            <tr key={p.id}>
                                <td style={{ textAlign: 'center' }}>
                                    <input type="checkbox" className="table-chk"
                                        checked={selectedIds.includes(p.id)} onChange={() => handleSelectRow(p.id)} />
                                </td>
                                <td style={{ fontWeight: 600 }}>{p.socks_port}</td>
                                <td>{p.control_port}</td>
                                <td style={{ fontSize: 11, fontFamily: 'monospace', maxWidth: 300, wordBreak: 'break-all' }}>{p.bridges_string || '-'}</td>
                                <td style={{ textAlign: 'center' }}>{p.rotating_time}s</td>
                                <td>{p.country_name || '-'}</td>
                                <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>{formatDateString(p.created_at)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Pagination page={page} count={count} pageSize={pageSize} onPageChange={onPageChange} />

            {/* Add Modal */}
            {addOpen && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>Thêm Tor Proxy mới</h3>
                            <button className="modal-close" onClick={() => setAddOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            {[
                                ['Socks Port', addSocksPort, setAddSocksPort, 'number'],
                                ['Control Port', addControlPort, setAddControlPort, 'number'],
                                ['Rotating Time (giây)', addRotatingTime, setAddRotatingTime, 'number'],
                                ['Quốc gia', addCountry, setAddCountry, 'text'],
                            ].map(([label, val, setter, type]) => (
                                <div className="form-group" key={label}>
                                    <label className="form-label">{label}</label>
                                    <input type={type} className="form-input" value={val} onChange={e => setter(e.target.value)} />
                                </div>
                            ))}
                            <div className="form-group">
                                <label className="form-label">Bridges String (Bỏ trống nếu không có)</label>
                                <textarea className="form-textarea" value={addBridges} onChange={e => setAddBridges(e.target.value)} />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setAddOpen(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={saveAddProxy}>Thêm mới</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editOpen && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>Chỉnh sửa Tor Proxy</h3>
                            <button className="modal-close" onClick={() => setEditOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            {[
                                ['Socks Port', editSocksPort, setEditSocksPort, 'number'],
                                ['Control Port', editControlPort, setEditControlPort, 'number'],
                                ['Rotating Time (giây)', editRotatingTime, setEditRotatingTime, 'number'],
                                ['Quốc gia', editCountry, setEditCountry, 'text'],
                            ].map(([label, val, setter, type]) => (
                                <div className="form-group" key={label}>
                                    <label className="form-label">{label}</label>
                                    <input type={type} className="form-input" value={val} onChange={e => setter(e.target.value)} />
                                </div>
                            ))}
                            <div className="form-group">
                                <label className="form-label">Bridges String</label>
                                <textarea className="form-textarea" value={editBridges} onChange={e => setEditBridges(e.target.value)} />
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

// ── Router Proxy (local 127.0.0.1:8000 via bridge) ───────────────────────────

const PROTOCOL_OPTIONS = [
    { value: 'socks5', label: 'SOCKS5' },
    { value: 'http',   label: 'HTTP / HTTPS' },
];

const BLACKLIST_BADGE = {
    null:  { text: 'Chưa kiểm tra', color: '#64748b' },
    false: { text: 'Sạch',          color: '#22c55e' },
    true:  { text: 'Blacklisted',   color: '#ef4444' },
};

function RouterProxies() {
    const [proxies, setProxies]         = useState([]);
    const [loading, setLoading]         = useState(true);
    const [error, setError]             = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [checkingId, setCheckingId]   = useState(null);

    // Add form
    const [addOpen, setAddOpen]           = useState(false);
    const [addProtocol, setAddProtocol]   = useState('socks5');
    const [addHost, setAddHost]           = useState('');
    const [addPort, setAddPort]           = useState('');
    const [addUser, setAddUser]           = useState('');
    const [addPass, setAddPass]           = useState('');
    const [addWebRTC, setAddWebRTC]       = useState(true);
    const [addSaving, setAddSaving]       = useState(false);

    // Bulk import
    const [bulkOpen, setBulkOpen]   = useState(false);
    const [bulkText, setBulkText]   = useState('');
    const [bulkSaving, setBulkSaving] = useState(false);

    const fetchProxies = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const data = await routerGet('/api/proxies/with-device-count');
            if (data && data.error) { setError(data.error); setProxies([]); }
            else setProxies(data.proxies || []);
        } catch (e) {
            setError('Không thể kết nối router (127.0.0.1:8000). Đảm bảo router đang chạy.');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchProxies(); }, []);

    const toggleSelectAll = (e) => setSelectedIds(e.target.checked ? proxies.map(p => p.id) : []);
    const handleSelectRow = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    const deleteSelected = async () => {
        if (!selectedIds.length || !confirm(`Xóa ${selectedIds.length} proxy router?`)) return;
        try {
            await Promise.all(selectedIds.map(id => routerPost(`/api/proxies/remove/${id}`, {})));
            setSelectedIds([]);
            fetchProxies();
        } catch { alert('Lỗi khi xóa proxy.'); }
    };

    const saveAddProxy = async () => {
        if (!addHost || !addPort) { alert('Vui lòng điền Host và Port.'); return; }
        setAddSaving(true);
        try {
            const proxyId = `proxy_${addHost.replace(/\./g, '_')}_${addPort}`;
            const result = await routerPost('/api/proxies/add', {
                id: proxyId,
                type: addProtocol,
                host: addHost,
                port: parseInt(addPort),
                username: addUser,
                password: addPass,
                webrtc_bypass: addWebRTC,
            });
            if (result && result.status === 'success') {
                setAddOpen(false);
                setAddHost(''); setAddPort(''); setAddUser(''); setAddPass('');
                setAddProtocol('socks5'); setAddWebRTC(true);
                fetchProxies();
            } else {
                alert(`Lỗi: ${result?.detail || result?.message || JSON.stringify(result)}`);
            }
        } catch (e) { alert(`Lỗi: ${e.message}`); }
        finally { setAddSaving(false); }
    };

    const saveBulkImport = async () => {
        if (!bulkText.trim()) { alert('Vui lòng nhập danh sách proxy.'); return; }
        setBulkSaving(true);
        try {
            const result = await routerPost('/api/proxies/bulk-import', { text: bulkText });
            if (result && result.status === 'success') {
                alert(`Đã thêm ${result.added_count} proxy (${result.skipped_count} bỏ qua).`);
                setBulkOpen(false); setBulkText('');
                fetchProxies();
            } else {
                alert(`Lỗi: ${result?.detail || JSON.stringify(result)}`);
            }
        } catch (e) { alert(`Lỗi: ${e.message}`); }
        finally { setBulkSaving(false); }
    };

    const checkBlacklist = async (proxyId) => {
        setCheckingId(proxyId);
        try {
            const result = await routerGet(`/api/proxies/check-blacklist/${proxyId}`);
            if (result && result.error) { alert(`Lỗi: ${result.error}`); return; }
            // Update local state optimistically
            setProxies(prev => prev.map(p => p.id === proxyId
                ? { ...p, blacklisted: result.blacklisted, blacklisted_on: result.lists, blacklist_checked_at: result.checked_at }
                : p
            ));
            if (result.blacklisted) {
                alert(`⚠️ IP ${result.ip} bị blacklist trên: ${result.lists.join(', ')}`);
            } else {
                alert(`✅ IP ${result.ip} sạch — không có trong blacklist.`);
            }
        } catch (e) { alert(`Lỗi kiểm tra blacklist: ${e.message}`); }
        finally { setCheckingId(null); }
    };

    const checkAllBlacklist = async () => {
        if (!confirm(`Kiểm tra blacklist cho ${proxies.length} proxy? Có thể mất vài giây.`)) return;
        for (const p of proxies) {
            await checkBlacklist(p.id);
        }
    };

    const statusColor = (s) => ({ Live: '#22c55e', Die: '#ef4444', Unknown: '#64748b' }[s] || '#64748b');

    return (
        <div>
            {/* WebRTC Bypass Status Banner */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
                background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
                borderRadius: 8, marginBottom: 14, fontSize: 13,
            }}>
                <span style={{ color: '#22c55e', fontWeight: 700 }}>●</span>
                <span style={{ color: '#22c55e', fontWeight: 600 }}>WebRTC Bypass: LUÔN BẬT</span>
                <span style={{ color: '#94a3b8', marginLeft: 4 }}>
                    — IP thật bị ẩn qua{' '}
                    <code style={{ fontSize: 11 }}>--force-webrtc-ip-handling-policy=disable_non_proxied_udp</code>
                </span>
            </div>

            <div className="control-bar">
                <div className="control-filters">
                    <span style={{ color: '#94a3b8', fontSize: 13 }}>{proxies.length} proxy</span>
                </div>
                <div className="action-buttons">
                    <button className="btn btn-secondary" onClick={fetchProxies}>Làm mới</button>
                    <button className="btn btn-secondary" onClick={checkAllBlacklist} disabled={!proxies.length}>
                        Check Blacklist All
                    </button>
                    <button className="btn btn-primary" onClick={() => setBulkOpen(true)}>Import nhiều</button>
                    <button className="btn btn-primary" onClick={() => setAddOpen(true)}>Thêm Proxy</button>
                    <button className="btn btn-danger" onClick={deleteSelected} disabled={!selectedIds.length}>Xóa</button>
                </div>
            </div>

            {error && (
                <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#fca5a5', marginBottom: 12, fontSize: 13 }}>
                    {error}
                </div>
            )}

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: 50, textAlign: 'center' }}>
                                <input type="checkbox" className="table-chk"
                                    checked={proxies.length > 0 && selectedIds.length === proxies.length}
                                    onChange={toggleSelectAll} />
                            </th>
                            <th>Giao thức</th>
                            <th>Host : Port</th>
                            <th>Auth</th>
                            <th style={{ textAlign: 'center' }}>Trạng thái</th>
                            <th style={{ textAlign: 'center' }}>Latency</th>
                            <th style={{ textAlign: 'center' }}>Blacklist</th>
                            <th style={{ textAlign: 'center' }}>Thiết bị</th>
                            <th style={{ textAlign: 'center' }}>Thao tác</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="9" style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>Đang tải...</td></tr>
                        ) : proxies.length === 0 ? (
                            <tr><td colSpan="9" style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                                {error ? 'Không thể kết nối router.' : 'Chưa có proxy nào. Nhấn "Thêm Proxy" để bắt đầu.'}
                            </td></tr>
                        ) : proxies.map(p => {
                            const blBadge = BLACKLIST_BADGE[p.blacklisted ?? null];
                            return (
                                <tr key={p.id}>
                                    <td style={{ textAlign: 'center' }}>
                                        <input type="checkbox" className="table-chk"
                                            checked={selectedIds.includes(p.id)} onChange={() => handleSelectRow(p.id)} />
                                    </td>
                                    <td>
                                        <span style={{
                                            display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                                            fontSize: 11, fontWeight: 700,
                                            background: p.type === 'socks5' ? 'rgba(99,102,241,0.15)' : 'rgba(245,158,11,0.15)',
                                            color: p.type === 'socks5' ? '#818cf8' : '#fbbf24',
                                        }}>
                                            {(p.type || 'socks5').toUpperCase()}
                                        </span>
                                    </td>
                                    <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{p.host}:{p.port}</td>
                                    <td style={{ color: '#94a3b8', fontSize: 12 }}>
                                        {p.username ? `${p.username}:****` : <em>No auth</em>}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span style={{ color: statusColor(p.status), fontWeight: 600, fontSize: 12 }}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center', fontSize: 12, color: p.latency >= 0 ? '#94a3b8' : '#475569' }}>
                                        {p.latency >= 0 ? `${p.latency}ms` : '-'}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <span style={{
                                            fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                                            background: `${blBadge.color}18`, color: blBadge.color,
                                        }} title={p.blacklisted_on?.join(', ') || ''}>
                                            {blBadge.text}
                                        </span>
                                        {p.blacklist_checked_at && (
                                            <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>
                                                {formatTs(p.blacklist_checked_at)}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'center', fontSize: 12 }}>
                                        {p.device_count ?? 0}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <button
                                            className="btn btn-secondary"
                                            style={{ padding: '3px 10px', fontSize: 11 }}
                                            onClick={() => checkBlacklist(p.id)}
                                            disabled={checkingId === p.id}
                                        >
                                            {checkingId === p.id ? '...' : 'Check BL'}
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Add Proxy Modal */}
            {addOpen && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>Thêm Router Proxy</h3>
                            <button className="modal-close" onClick={() => setAddOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            {/* Protocol selector */}
                            <div className="form-group">
                                <label className="form-label">Giao thức</label>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    {PROTOCOL_OPTIONS.map(opt => (
                                        <label key={opt.value} style={{
                                            display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                                            padding: '6px 14px', borderRadius: 6,
                                            border: `1px solid ${addProtocol === opt.value ? '#6366f1' : '#1e293b'}`,
                                            background: addProtocol === opt.value ? 'rgba(99,102,241,0.15)' : 'transparent',
                                            color: addProtocol === opt.value ? '#818cf8' : '#94a3b8',
                                            fontSize: 13, fontWeight: 600,
                                        }}>
                                            <input type="radio" name="protocol" value={opt.value}
                                                checked={addProtocol === opt.value}
                                                onChange={() => setAddProtocol(opt.value)}
                                                style={{ display: 'none' }} />
                                            {opt.label}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
                                <div className="form-group">
                                    <label className="form-label">Host / IP</label>
                                    <input type="text" className="form-input" placeholder="1.2.3.4 hoặc proxy.host.com"
                                        value={addHost} onChange={e => setAddHost(e.target.value)} />
                                </div>
                                <div className="form-group" style={{ width: 100 }}>
                                    <label className="form-label">Port</label>
                                    <input type="number" className="form-input" placeholder="1080"
                                        value={addPort} onChange={e => setAddPort(e.target.value)} />
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                <div className="form-group">
                                    <label className="form-label">Username (nếu có)</label>
                                    <input type="text" className="form-input" value={addUser} onChange={e => setAddUser(e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Password (nếu có)</label>
                                    <input type="password" className="form-input" value={addPass} onChange={e => setAddPass(e.target.value)} />
                                </div>
                            </div>

                            {/* WebRTC bypass toggle */}
                            <div className="form-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                                    <input type="checkbox" checked={addWebRTC} onChange={e => setAddWebRTC(e.target.checked)} />
                                    <span className="form-label" style={{ margin: 0 }}>
                                        Bypass WebRTC IP Leak
                                    </span>
                                    <span style={{ fontSize: 11, color: '#64748b' }}>
                                        (ngăn rò IP thật qua WebRTC)
                                    </span>
                                </label>
                            </div>

                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 6, padding: '6px 10px', background: '#0f172a', borderRadius: 6, fontFamily: 'monospace' }}>
                                Ví dụ: <span style={{ color: '#94a3b8' }}>
                                    {addProtocol}://{addUser || 'user'}:{addPass ? '****' : 'pass'}@{addHost || '1.2.3.4'}:{addPort || '1080'}
                                </span>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setAddOpen(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={saveAddProxy} disabled={addSaving}>
                                {addSaving ? 'Đang thêm...' : 'Thêm Proxy'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Import Modal */}
            {bulkOpen && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-box" style={{ maxWidth: 560 }}>
                        <div className="modal-header">
                            <h3>Import nhiều Proxy</h3>
                            <button className="modal-close" onClick={() => setBulkOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 10 }}>
                                Mỗi dòng một proxy. Định dạng hỗ trợ:
                            </p>
                            <ul style={{ color: '#64748b', fontSize: 12, marginBottom: 12, paddingLeft: 18 }}>
                                <li><code>socks5://user:pass@host:port</code></li>
                                <li><code>http://user:pass@host:port</code></li>
                                <li><code>host:port:user:pass</code></li>
                                <li><code>host:port</code></li>
                            </ul>
                            <textarea className="form-textarea"
                                style={{ minHeight: 160, fontFamily: 'monospace', fontSize: 12 }}
                                placeholder="socks5://user:pass@1.2.3.4:1080&#10;http://5.6.7.8:3128&#10;9.10.11.12:1080:user:pass"
                                value={bulkText} onChange={e => setBulkText(e.target.value)} />
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setBulkOpen(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={saveBulkImport} disabled={bulkSaving}>
                                {bulkSaving ? 'Đang import...' : 'Import'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Main Export ───────────────────────────────────────────────────────────────

export default function Proxies({ currentUser, page, onPageChange }) {
    const desktop = isDesktopMode();
    const [activeTab, setActiveTab] = useState(desktop ? 'router' : 'tor');

    const tabStyle = (active) => ({
        padding: '7px 18px', borderRadius: '6px 6px 0 0', fontSize: 13, fontWeight: 600,
        cursor: 'pointer', border: 'none', outline: 'none',
        background: active ? 'var(--surface, #0d1224)' : 'transparent',
        color: active ? '#e2e8f0' : '#64748b',
        borderBottom: active ? '2px solid #6366f1' : '2px solid transparent',
    });

    return (
        <div>
            {/* Tab selector */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 0, borderBottom: '1px solid #1e293b' }}>
                {desktop && (
                    <button style={tabStyle(activeTab === 'router')} onClick={() => setActiveTab('router')}>
                        Router Proxy (Local)
                    </button>
                )}
                <button style={tabStyle(activeTab === 'tor')} onClick={() => setActiveTab('tor')}>
                    Tor Proxy (Server)
                </button>
            </div>

            <div style={{ paddingTop: 16 }}>
                {activeTab === 'router' && desktop && <RouterProxies />}
                {activeTab === 'tor' && (
                    <TorProxies currentUser={currentUser} page={page} onPageChange={onPageChange} />
                )}
            </div>
        </div>
    );
}
