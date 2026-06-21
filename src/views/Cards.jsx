import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import Pagination from '../components/Pagination';

const getCardStatusBadgeClass = (status) => {
    const map = {
        'Chưa sử dụng': 'badge-unused',
        'Đang sử dụng': 'badge-active',
        'Thẻ chết': 'badge-dead',
        'Thẻ sống': 'badge-live',
        'Thẻ tốt': 'badge-good',
        'Thẻ lỗi': 'badge-error',
        'Sub OK': 'badge-sub-ok',
        'Sub lỗi': 'badge-sub-error'
    };
    return map[status] || 'badge-unused';
};

const formatDateString = (str) => {
    if (!str) return '-';
    try {
        const d = new Date(str);
        return d.toLocaleString('vi-VN');
    } catch {
        return str;
    }
};

export default function Cards({ currentUser, page, onPageChange }) {
    const [cards, setCards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [count, setCount] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    
    // Filters
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('Tất cả');
    const [owner, setOwner] = useState('all');
    const [clients, setClients] = useState([]);

    // Selection
    const [selectedIds, setSelectedIds] = useState([]);

    // Modals
    const [importOpen, setImportOpen] = useState(false);
    const [importText, setImportText] = useState('');
    const [importStatus, setImportStatus] = useState('Chưa sử dụng');
    const [importOwner, setImportOwner] = useState('');
    const [importLoading, setImportLoading] = useState(false);

    const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
    const [bulkAssignOwner, setBulkAssignOwner] = useState('');
    const [ownerSearchQuery, setOwnerSearchQuery] = useState('');

    const [modalClients, setModalClients] = useState([]);
    const [modalClientsPage, setModalClientsPage] = useState(1);
    const [modalClientsLoading, setModalClientsLoading] = useState(false);
    const [modalClientsHasMore, setModalClientsHasMore] = useState(true);

    const fetchModalClients = async (pageNumber, searchQuery, replace = false) => {
        setModalClientsLoading(true);
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
                    setModalClients(results);
                } else {
                    setModalClients(prev => [...prev, ...results]);
                }
                setModalClientsHasMore(!!data.next);
                setModalClientsPage(pageNumber);
            }
        } catch (err) {
            console.error("Error loading modal clients:", err);
        } finally {
            setModalClientsLoading(false);
        }
    };

    useEffect(() => {
        if (!bulkAssignOpen && !importOpen) return;
        const delayDebounce = setTimeout(() => {
            fetchModalClients(1, ownerSearchQuery, true);
        }, 250);
        return () => clearTimeout(delayDebounce);
    }, [ownerSearchQuery, bulkAssignOpen, importOpen]);

    const handleModalScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        if (scrollHeight - scrollTop - clientHeight < 50) {
            if (!modalClientsLoading && modalClientsHasMore) {
                fetchModalClients(modalClientsPage + 1, ownerSearchQuery, false);
            }
        }
    };

    const [editOpen, setEditOpen] = useState(false);
    const [editCardId, setEditCardId] = useState(null);
    const [editCardNumber, setEditCardNumber] = useState('');
    const [editCardExpiry, setEditCardExpiry] = useState('');
    const [editCardCVV, setEditCardCVV] = useState('');
    const [editCardStatus, setEditCardStatus] = useState('Chưa sử dụng');
    const [editCardOwner, setEditCardOwner] = useState('');
    const [editCardUsedBy, setEditCardUsedBy] = useState('');

    const [bulkStatusOpen, setBulkStatusOpen] = useState(false);
    const [bulkStatusVal, setBulkStatusVal] = useState('Chưa sử dụng');

    const [viewOpen, setViewOpen] = useState(false);
    const [viewCardData, setViewCardData] = useState(null);
    const [viewCardCloseStatus, setViewCardCloseStatus] = useState('Chưa sử dụng');

    const fetchCards = async () => {
        setLoading(true);
        let url = `/dashboard/api/cards/?page=${page}&page_size=${pageSize}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (status && status !== 'Tất cả') url += `&status=${encodeURIComponent(status)}`;
        if (owner && owner !== 'all') url += `&owner=${owner}`;

        try {
            const resp = await apiRequest(url);
            if (resp.ok) {
                const data = await resp.json();
                setCards(data.results || data);
                setCount(data.count || (data.results || data).length);
            }
        } catch (err) {
            console.error("Error loading cards:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchClients = async () => {
        if (!currentUser.is_staff) return;
        try {
            const resp = await apiRequest('/dashboard/api/users/?status=active');
            if (resp.ok) {
                const data = await resp.json();
                setClients(data.results || data);
            }
        } catch (err) {
            console.error("Error fetching clients:", err);
        }
    };

    useEffect(() => {
        fetchCards();
    }, [page, pageSize, status, owner]);

    // Handle search input with a slight debounce or direct trigger
    useEffect(() => {
        const t = setTimeout(() => {
            if (page !== 1) {
                onPageChange(1);
            } else {
                fetchCards();
            }
        }, 300);
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => {
        fetchClients();
    }, []);

    const toggleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(cards.map(c => c.id));
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

    const updateCardStatusInline = async (id, newStatus) => {
        try {
            const response = await apiRequest(`/dashboard/api/cards/${id}/`, {
                method: 'PATCH',
                body: JSON.stringify({ status: newStatus })
            });
            if (response.ok) {
                setCards(cards.map(c => c.id === id ? { ...c, status: newStatus } : c));
            } else {
                alert('Lỗi cập nhật trạng thái thẻ.');
            }
        } catch (err) {
            alert('Không thể kết nối máy chủ để cập nhật trạng thái.');
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            alert('Đã copy thành công!');
        }).catch(err => {
            alert('Lỗi copy: ' + err);
        });
    };

    const copyOriginalRow = (card) => {
        if (!card) return;
        const parts = card.expiry_date ? card.expiry_date.split('/') : ['', ''];
        const m = parts[0] || '';
        const y = parts[1] || '';
        
        let line = `${card.card_number}|${m}|${y}|${card.cvv || ''}`;
        if (card.extra_info) {
            line += `|${card.extra_info.split(' | ').join('|')}`;
        }
        copyToClipboard(line);
    };

    const openViewCardModal = async (id) => {
        try {
            const resp = await apiRequest(`/dashboard/api/cards/${id}/`);
            if (resp.ok) {
                const card = await resp.json();
                setViewCardData(card);
                setViewCardCloseStatus(card.status);
                setViewOpen(true);
            } else {
                alert('Không thể tải chi tiết thẻ.');
            }
        } catch (err) {
            alert('Lỗi kết nối khi tải chi tiết thẻ.');
        }
    };

    const handleCloseViewModal = async () => {
        if (!viewCardData) {
            setViewOpen(false);
            return;
        }

        if (viewCardCloseStatus !== viewCardData.status) {
            try {
                const resp = await apiRequest(`/dashboard/api/cards/${viewCardData.id}/`, {
                    method: 'PATCH',
                    body: JSON.stringify({ status: viewCardCloseStatus })
                });
                if (resp.ok) {
                    fetchCards();
                } else {
                    alert('Không thể cập nhật trạng thái thẻ khi đóng.');
                }
            } catch (err) {
                console.error("Lỗi cập nhật trạng thái khi đóng thẻ:", err);
                alert('Lỗi kết nối khi cập nhật trạng thái thẻ.');
            }
        }
        setViewOpen(false);
        setViewCardData(null);
    };

    // Bulk delete
    const deleteSelectedCards = async () => {
        if (selectedIds.length === 0) return;
        const confirmDel = confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} thẻ đã chọn khỏi hệ thống không?`);
        if (!confirmDel) return;

        try {
            const deletePromises = selectedIds.map(id => {
                return apiRequest(`/dashboard/api/cards/${id}/`, {
                    method: 'DELETE'
                });
            });
            await Promise.all(deletePromises);
            alert('Đã xóa thành công các thẻ đã chọn!');
            setSelectedIds([]);
            fetchCards();
        } catch (err) {
            alert('Lỗi khi xóa thẻ.');
        }
    };

    // Import Cards
    const saveImportedCards = async () => {
        if (!importText.trim()) {
            alert('Vui lòng nhập dữ liệu thẻ.');
            return;
        }

        const lines = importText.split('\n');
        const savePromises = [];

        for (let line of lines) {
            line = line.trim();
            if (!line) continue;

            const parts = line.split('|').map(p => p.trim());
            if (parts.length >= 1) {
                const card_number = parts[0].replace(/\D/g, '');
                const isValid = (card_number.length === 15 || card_number.length === 16) && ['3','4','5','6'].includes(card_number[0]);
                
                if (isValid) {
                    let expiry_date = '';
                    if (parts.length >= 3) expiry_date = `${parts[1]}/${parts[2]}`;
                    
                    let cvv = '';
                    if (parts.length >= 4) cvv = parts[3];
                    
                    let extra_info = '';
                    if (parts.length >= 5) extra_info = parts.slice(4).join(' | ');

                    const payload = { card_number, expiry_date, cvv, status: importStatus, extra_info };
                    if (importOwner) payload.owner = parseInt(importOwner);

                    savePromises.push(
                        apiRequest('/dashboard/api/cards/', {
                            method: 'POST',
                            body: JSON.stringify(payload)
                        })
                    );
                }
            }
        }

        if (savePromises.length === 0) {
            alert('Không phát hiện dòng thẻ nào hợp lệ (số thẻ phải dài 15-16 chữ số và bắt đầu bằng 3, 4, 5, hoặc 6).');
            return;
        }

        setImportLoading(true);

        try {
            await Promise.all(savePromises);
            alert(`Đã hoàn tất import ${savePromises.length} thẻ vào cơ sở dữ liệu!`);
            setImportOpen(false);
            setImportText('');
            fetchCards();
        } catch (err) {
            alert('Lỗi trong tiến trình import thẻ.');
        } finally {
            setImportLoading(false);
        }
    };

    // Bulk assign owner
    const saveBulkAssign = async () => {
        const payload = {
            card_ids: selectedIds,
            owner_id: bulkAssignOwner ? parseInt(bulkAssignOwner) : null
        };

        try {
            const resp = await apiRequest('/dashboard/api/cards/bulk-assign/', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            if (resp.ok) {
                alert(`Đã gán sở hữu thành công cho ${selectedIds.length} thẻ.`);
                setBulkAssignOpen(false);
                setSelectedIds([]);
                fetchCards();
            }
        } catch (err) {
            alert('Lỗi gán sở hữu.');
        }
    };

    // Bulk Status
    const saveBulkStatus = async () => {
        const payload = {
            card_ids: selectedIds,
            status: bulkStatusVal
        };

        try {
            const resp = await apiRequest('/dashboard/api/cards/bulk-status/', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            if (resp.ok) {
                alert(`Đã cập nhật trạng thái thành công cho ${selectedIds.length} thẻ.`);
                setBulkStatusOpen(false);
                setSelectedIds([]);
                fetchCards();
            }
        } catch (err) {
            alert('Lỗi cập nhật trạng thái.');
        }
    };

    // Open Edit card
    const openEditModal = async () => {
        if (selectedIds.length !== 1) return;
        const id = selectedIds[0];
        try {
            const resp = await apiRequest(`/dashboard/api/cards/${id}/`);
            if (resp.ok) {
                const card = await resp.json();
                setEditCardId(id);
                setEditCardNumber(card.card_number);
                setEditCardExpiry(card.expiry_date || '');
                setEditCardCVV(card.cvv || '');
                setEditCardStatus(card.status);
                setEditCardOwner(card.owner || '');
                setEditCardUsedBy(card.used_by || '');
                setEditOpen(true);
            }
        } catch (err) {
            alert('Lỗi tải thông tin thẻ.');
        }
    };

    const saveEditCard = async () => {
        const payload = {
            card_number: editCardNumber,
            expiry_date: editCardExpiry,
            cvv: editCardCVV,
            status: editCardStatus,
            owner: editCardOwner ? parseInt(editCardOwner) : null,
            used_by: editCardUsedBy ? parseInt(editCardUsedBy) : null
        };

        try {
            const resp = await apiRequest(`/dashboard/api/cards/${editCardId}/`, {
                method: 'PATCH',
                body: JSON.stringify(payload)
            });
            if (resp.ok) {
                alert('Cập nhật thẻ thành công!');
                setEditOpen(false);
                setSelectedIds([]);
                fetchCards();
            }
        } catch (err) {
            alert('Lỗi lưu thẻ.');
        }
    };

    // Pagination Calculation
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
                            placeholder="Tìm kiếm số thẻ..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <select className={`filter-select ${getCardStatusBadgeClass(status)}`} value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option className="badge-unused" value="Chưa sử dụng">Chưa sử dụng</option>
                        <option className="badge-active" value="Đang sử dụng">Đang sử dụng</option>
                        <option className="badge-dead" value="Thẻ chết">Thẻ chết</option>
                        <option className="badge-live" value="Thẻ sống">Thẻ sống</option>
                        <option className="badge-good" value="Thẻ tốt">Thẻ tốt</option>
                        <option className="badge-error" value="Thẻ lỗi">Thẻ lỗi</option>
                        <option className="badge-sub-ok" value="Sub OK">Sub OK</option>
                        <option className="badge-sub-error" value="Sub lỗi">Sub lỗi</option>
                        <option value="Tất cả">Tất cả</option>
                    </select>
                    {currentUser.is_staff && (
                        <select className="filter-select" value={owner} onChange={(e) => setOwner(e.target.value)}>
                            <option value="all">Tất cả chủ sở hữu</option>
                            <option value="unassigned">Chưa chỉ định</option>
                            {clients.map(u => (
                                <option key={u.id} value={u.id}>{u.username}</option>
                            ))}
                        </select>
                    )}
                    <select className="filter-select" value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value)); onPageChange(1); }}>
                        <option value={20}>20 dòng</option>
                        <option value={50}>50 dòng</option>
                        <option value={100}>100 dòng</option>
                    </select>
                </div>
                <div className="action-buttons">
                    <button className="btn btn-secondary" onClick={fetchCards}>Làm mới</button>
                    {currentUser.is_staff && (
                        <>
                            <button className="btn btn-success" onClick={() => { setImportOpen(true); setImportOwner(''); setOwnerSearchQuery(''); }}>Thêm thẻ</button>
                            <button className="btn btn-primary" onClick={() => { setBulkAssignOpen(true); setOwnerSearchQuery(''); }} disabled={selectedIds.length === 0}>Sở hữu</button>
                            <button className="btn btn-primary" onClick={openEditModal} disabled={selectedIds.length !== 1}>Sửa</button>
                            <button className="btn btn-danger" onClick={deleteSelectedCards} disabled={selectedIds.length === 0}>Xóa</button>
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
                                    checked={cards.length > 0 && selectedIds.length === cards.length}
                                    onChange={toggleSelectAll} 
                                />
                            </th>
                            <th style={{ width: '60px', textAlign: 'center' }}>STT</th>
                            <th>Số thẻ</th>
                            <th style={{ textAlign: 'center' }}>Ngày hết hạn</th>
                            <th style={{ textAlign: 'center' }}>CVV</th>
                            <th style={{ textAlign: 'center' }}>Trạng thái</th>
                            <th style={{ textAlign: 'center' }}>Sở hữu bởi</th>
                            <th style={{ textAlign: 'center' }}>Sử dụng gần nhất</th>
                            <th style={{ textAlign: 'center' }}>Ngày tạo</th>
                            <th style={{ textAlign: 'center' }}>Ngày cập nhật</th>
                            <th style={{ textAlign: 'center' }}>Giao dịch</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan="11" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                    Đang tải danh sách thẻ...
                                </td>
                            </tr>
                        ) : cards.length === 0 ? (
                            <tr>
                                <td colSpan="11" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                                    Không tìm thấy thẻ nào phù hợp.
                                </td>
                            </tr>
                        ) : (
                            cards.map((c, index) => {
                                const masked = c.card_number.replace(/\D/g, '');
                                let formattedNum = c.card_number;
                                if (masked.length >= 15) {
                                    formattedNum = `${masked.substring(0, 4)} ${masked.substring(4, 6)}** **** ${masked.substring(masked.length - 4)}`;
                                }
                                const stt = (page - 1) * pageSize + index + 1;

                                return (
                                    <tr 
                                        key={c.id} 
                                        className={selectedIds.includes(c.id) ? 'row-selected' : ''} 
                                        onDoubleClick={() => openViewCardModal(c.id)} 
                                        onClick={() => handleSelectRow(c.id)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                            <input 
                                                type="checkbox" 
                                                className="table-chk" 
                                                checked={selectedIds.includes(c.id)}
                                                onChange={() => handleSelectRow(c.id)}
                                            />
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>{stt}</td>
                                        <td style={{ fontWeight: 600 }}>{formattedNum}</td>
                                        <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>{c.expiry_date || '**/**'}</td>
                                        <td style={{ textAlign: 'center', fontFamily: 'monospace' }}>{c.cvv || '***'}</td>
                                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                                            <select 
                                                className={`inline-select ${getCardStatusBadgeClass(c.status)}`}
                                                value={c.status}
                                                onChange={(e) => updateCardStatusInline(c.id, e.target.value)}
                                            >
                                                <option className="badge-unused" value="Chưa sử dụng">Chưa sử dụng</option>
                                                <option className="badge-active" value="Đang sử dụng">Đang sử dụng</option>
                                                <option className="badge-dead" value="Thẻ chết">Thẻ chết</option>
                                                <option className="badge-live" value="Thẻ sống">Thẻ sống</option>
                                                <option className="badge-good" value="Thẻ tốt">Thẻ tốt</option>
                                                <option className="badge-error" value="Thẻ lỗi">Thẻ lỗi</option>
                                                <option className="badge-sub-ok" value="Sub OK">Sub OK</option>
                                                <option className="badge-sub-error" value="Sub lỗi">Sub lỗi</option>
                                            </select>
                                        </td>
                                        <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--accent)' }}>{c.owner_username || 'Chưa chỉ định'}</td>
                                        <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--success)' }}>{c.used_by_username || '-'}</td>
                                        <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>{formatDateString(c.created_at)}</td>
                                        <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>{formatDateString(c.updated_at)}</td>
                                        <td style={{ textAlign: 'center', fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--accent)' }}>{c.used_count}</td>
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

            {/* Import Cards Modal */}
            {importOpen && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-box modal-large">
                        <div className="modal-header">
                            <h3>Nhập/Import danh sách thẻ mới</h3>
                            <button className="modal-close" onClick={() => setImportOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Dữ liệu thẻ (Mỗi thẻ 1 dòng, định dạng: Số thẻ|Tháng|Năm|CVV|Tên...)</label>
                                <textarea 
                                    className="form-textarea" 
                                    placeholder="4147098472726991|03|27|502|David Miranda|Hendersonton|Ohio|88313|US"
                                    value={importText}
                                    onChange={(e) => setImportText(e.target.value)}
                                ></textarea>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Trạng thái thẻ ban đầu</label>
                                <select className={`filter-select ${getCardStatusBadgeClass(importStatus)}`} style={{ width: '100%' }} value={importStatus} onChange={(e) => setImportStatus(e.target.value)}>
                                    <option className="badge-unused" value="Chưa sử dụng">Chưa sử dụng</option>
                                    <option className="badge-active" value="Đang sử dụng">Đang sử dụng</option>
                                    <option className="badge-dead" value="Thẻ chết">Thẻ chết</option>
                                    <option className="badge-live" value="Thẻ sống">Thẻ sống</option>
                                    <option className="badge-good" value="Thẻ tốt">Thẻ tốt</option>
                                    <option className="badge-error" value="Thẻ lỗi">Thẻ lỗi</option>
                                    <option className="badge-sub-ok" value="Sub OK">Sub OK</option>
                                    <option className="badge-sub-error" value="Sub lỗi">Sub lỗi</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Sở hữu bởi (Owner)</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    placeholder="Tìm tên chủ sở hữu..." 
                                    value={ownerSearchQuery} 
                                    onChange={(e) => setOwnerSearchQuery(e.target.value)} 
                                    style={{ marginBottom: '10px' }}
                                />
                                <div 
                                    onScroll={handleModalScroll}
                                    style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--input-bg)' }}
                                >
                                    <div
                                        onClick={() => setImportOwner('')}
                                        style={{
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            background: importOwner === '' ? 'var(--active-bg)' : 'transparent',
                                            color: importOwner === '' ? 'var(--primary)' : 'var(--text-color)',
                                            fontWeight: importOwner === '' ? 'bold' : 'normal',
                                            borderBottom: '1px solid var(--border-color)',
                                            fontSize: '13px'
                                        }}
                                    >
                                        -- Không chỉ định --
                                    </div>
                                    {modalClients.map(u => {
                                        const isSelected = String(u.id) === String(importOwner);
                                        const displayName = isSelected ? `✓ ${u.username}` : u.username;
                                        return (
                                            <div
                                                key={u.id}
                                                onClick={() => setImportOwner(String(u.id))}
                                                style={{
                                                    padding: '8px 12px',
                                                    cursor: 'pointer',
                                                    background: isSelected ? 'var(--active-bg)' : 'transparent',
                                                    color: isSelected ? 'var(--primary)' : 'var(--text-color)',
                                                    fontWeight: isSelected ? 'bold' : 'normal',
                                                    borderBottom: '1px solid var(--border-color)',
                                                    fontSize: '13px',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                {displayName}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setImportOpen(false)}>Hủy</button>
                            <button className="btn btn-success" onClick={saveImportedCards} disabled={importLoading}>
                                {importLoading ? 'Đang xử lý...' : 'Nhập thẻ'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Owner Modal */}
            {bulkAssignOpen && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>Gán sở hữu hàng loạt</h3>
                            <button className="modal-close" onClick={() => setBulkAssignOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Đang chọn {selectedIds.length} thẻ</label>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Chỉ định sở hữu bởi</label>
                                <input 
                                    type="text" 
                                    className="form-input" 
                                    placeholder="Tìm tên chủ sở hữu..." 
                                    value={ownerSearchQuery} 
                                    onChange={(e) => setOwnerSearchQuery(e.target.value)} 
                                    style={{ marginBottom: '10px' }}
                                />
                                <div 
                                    onScroll={handleModalScroll}
                                    style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--input-bg)' }}
                                >
                                    <div
                                        onClick={() => setBulkAssignOwner('')}
                                        style={{
                                            padding: '8px 12px',
                                            cursor: 'pointer',
                                            background: bulkAssignOwner === '' ? 'var(--active-bg)' : 'transparent',
                                            color: bulkAssignOwner === '' ? 'var(--primary)' : 'var(--text-color)',
                                            fontWeight: bulkAssignOwner === '' ? 'bold' : 'normal',
                                            borderBottom: '1px solid var(--border-color)',
                                            fontSize: '13px'
                                        }}
                                    >
                                        -- Không chỉ định --
                                    </div>
                                    {modalClients.map(u => {
                                        const isSelected = String(u.id) === String(bulkAssignOwner);
                                        return (
                                            <div
                                                key={u.id}
                                                onClick={() => setBulkAssignOwner(String(u.id))}
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
                                    {modalClientsLoading && (
                                        <div style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                                            🔄 Đang tải thêm...
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setBulkAssignOpen(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={saveBulkAssign}>Gán sở hữu</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Card Modal */}
            {editOpen && (
                <div className="modal-overlay" style={{ display: 'flex' }}>
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>Chỉnh sửa thẻ</h3>
                            <button className="modal-close" onClick={() => setEditOpen(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label className="form-label">Số thẻ</label>
                                <input type="text" className="form-input" value={editCardNumber} onChange={(e) => setEditCardNumber(e.target.value)} required />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Ngày hết hạn (MM/YY)</label>
                                    <input type="text" className="form-input" value={editCardExpiry} onChange={(e) => setEditCardExpiry(e.target.value)} placeholder="03/27" />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">CVV</label>
                                    <input type="text" className="form-input" value={editCardCVV} onChange={(e) => setEditCardCVV(e.target.value)} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Trạng thái</label>
                                <select className={`filter-select ${getCardStatusBadgeClass(editCardStatus)}`} style={{ width: '100%' }} value={editCardStatus} onChange={(e) => setEditCardStatus(e.target.value)}>
                                    <option className="badge-unused" value="Chưa sử dụng">Chưa sử dụng</option>
                                    <option className="badge-active" value="Đang sử dụng">Đang sử dụng</option>
                                    <option className="badge-dead" value="Thẻ chết">Thẻ chết</option>
                                    <option className="badge-live" value="Thẻ sống">Thẻ sống</option>
                                    <option className="badge-good" value="Thẻ tốt">Thẻ tốt</option>
                                    <option className="badge-error" value="Thẻ lỗi">Thẻ lỗi</option>
                                    <option className="badge-sub-ok" value="Sub OK">Sub OK</option>
                                    <option className="badge-sub-error" value="Sub lỗi">Sub lỗi</option>
                                </select>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Sở hữu bởi</label>
                                    <select className="filter-select" style={{ width: '100%' }} value={editCardOwner} onChange={(e) => setEditCardOwner(e.target.value)}>
                                        <option value="">-- Không chỉ định --</option>
                                        {clients.map(u => (
                                            <option key={u.id} value={u.id}>{u.username}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Sử dụng gần nhất</label>
                                    <select className="filter-select" style={{ width: '100%' }} value={editCardUsedBy} onChange={(e) => setEditCardUsedBy(e.target.value)}>
                                        <option value="">-- Không chỉ định --</option>
                                        {clients.map(u => (
                                            <option key={u.id} value={u.id}>{u.username}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setEditOpen(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={saveEditCard}>Lưu thay đổi</button>
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
                                <label className="form-label">Đang chọn {selectedIds.length} thẻ</label>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Trạng thái mới</label>
                                <select className={`filter-select ${getCardStatusBadgeClass(bulkStatusVal)}`} style={{ width: '100%' }} value={bulkStatusVal} onChange={(e) => setBulkStatusVal(e.target.value)}>
                                    <option className="badge-unused" value="Chưa sử dụng">Chưa sử dụng</option>
                                    <option className="badge-active" value="Đang sử dụng">Đang sử dụng</option>
                                    <option className="badge-dead" value="Thẻ chết">Thẻ chết</option>
                                    <option className="badge-live" value="Thẻ sống">Thẻ sống</option>
                                    <option className="badge-good" value="Thẻ tốt">Thẻ tốt</option>
                                    <option className="badge-error" value="Thẻ lỗi">Thẻ lỗi</option>
                                    <option className="badge-sub-ok" value="Sub OK">Sub OK</option>
                                    <option className="badge-sub-error" value="Sub lỗi">Sub lỗi</option>
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

            {/* View Card Detail Modal */}
            {viewOpen && viewCardData && (
                <div className="modal-overlay" style={{ display: 'flex' }} onClick={(e) => { if (e.target.className === 'modal-overlay') handleCloseViewModal(); }}>
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>Chi tiết thẻ</h3>
                            <button className="modal-close" onClick={handleCloseViewModal}>&times;</button>
                        </div>
                        <div className="modal-body">
                            {/* ATM CARD WIDGET */}
                            <div className="atm-card">
                                <div className="atm-header">
                                    <div className="atm-chip"></div>
                                    <span className="atm-brand">PREMIUM CARD</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', margin: '15px 0' }}>
                                    <div className="atm-number" style={{ margin: 0 }}>
                                        {(() => {
                                            const cleanNum = viewCardData.card_number.replace(/\D/g, '');
                                            return cleanNum.length > 0 ? (cleanNum.match(/.{1,4}/g)?.join('  ') || cleanNum) : 'xxxx xxxx xxxx xxxx';
                                        })()}
                                    </div>
                                    <button 
                                        type="button" 
                                        className="card-copy-btn" 
                                        onClick={() => copyToClipboard(viewCardData.card_number)}
                                        style={{ 
                                            padding: '4px 8px', 
                                            fontSize: '11px', 
                                            background: 'rgba(255,255,255,0.1)', 
                                            border: '1px solid rgba(255,255,255,0.2)', 
                                            borderRadius: '4px', 
                                            color: 'white', 
                                            cursor: 'pointer', 
                                            transition: 'all 0.2s' 
                                        }}
                                        title="Sao chép số thẻ"
                                    >
                                        📋 Copy
                                    </button>
                                </div>
                                <div className="atm-footer" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', width: '100%' }}>
                                    <div style={{ display: 'flex', gap: '40px' }}>
                                        <div className="atm-expiry-section">
                                            <div className="atm-lbl">EXP</div>
                                            <div className="atm-val atm-val-large">{viewCardData.expiry_date || 'MM/YY'}</div>
                                        </div>
                                        <div className="atm-cvv-section">
                                            <div className="atm-lbl">CVV</div>
                                            <div className="atm-val">{viewCardData.cvv || 'xxx'}</div>
                                        </div>
                                    </div>
                                    <button 
                                        type="button" 
                                        className="card-copy-btn" 
                                        onClick={() => copyToClipboard(`${viewCardData.expiry_date || 'MM/YY'} / ${viewCardData.cvv || 'xxx'}`)}
                                        style={{ 
                                            padding: '4px 8px', 
                                            fontSize: '11px', 
                                            background: 'rgba(255,255,255,0.1)', 
                                            border: '1px solid rgba(255,255,255,0.2)', 
                                            borderRadius: '4px', 
                                            color: 'white', 
                                            cursor: 'pointer', 
                                            transition: 'all 0.2s' 
                                        }}
                                        title="Sao chép Hạn dùng & CVV"
                                    >
                                        📋 Copy Exp/CVV
                                    </button>
                                </div>
                            </div>

                            <div className="card-row-value" style={{ display: 'none' }}>
                                <span className="card-row-label">Số thẻ</span>
                                <span className="card-val-text">{viewCardData.card_number}</span>
                            </div>
                            <div className="card-row-value" style={{ display: 'none' }}>
                                <span className="card-row-label">Hạn dùng & CVV</span>
                                <span className="card-val-text">{`${viewCardData.expiry_date || 'MM/YY'} / ${viewCardData.cvv || 'xxx'}`}</span>
                            </div>
                            <div className="card-row-value">
                                <span className="card-row-label">Sở hữu bởi</span>
                                <span className="card-val-text">{viewCardData.owner_username || 'Chưa chỉ định'}</span>
                                <span style={{ width: '78px' }}></span>
                            </div>
                            <div className="card-row-value">
                                <span className="card-row-label">Sử dụng gần nhất</span>
                                <span className="card-val-text">{viewCardData.used_by_username || '-'}</span>
                                <span style={{ width: '78px' }}></span>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Billing/Thông tin thêm</label>
                                <textarea 
                                    className="form-textarea" 
                                    value={viewCardData.extra_info || 'Không có thông tin thêm.'}
                                    readOnly 
                                    style={{ background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.02)', color: '#cbd5e1' }}
                                ></textarea>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Chọn trạng thái khi đóng</label>
                                <select 
                                    className={`filter-select ${getCardStatusBadgeClass(viewCardCloseStatus)}`} 
                                    value={viewCardCloseStatus} 
                                    style={{ width: '100%' }} 
                                    onChange={(e) => setViewCardCloseStatus(e.target.value)}
                                >
                                    <option className="badge-unused" value="Chưa sử dụng">Chưa sử dụng</option>
                                    <option className="badge-active" value="Đang sử dụng">Đang sử dụng</option>
                                    <option className="badge-dead" value="Thẻ chết">Thẻ chết</option>
                                    <option className="badge-live" value="Thẻ sống">Thẻ sống</option>
                                    <option className="badge-good" value="Thẻ tốt">Thẻ tốt</option>
                                    <option className="badge-error" value="Thẻ lỗi">Thẻ lỗi</option>
                                    <option className="badge-sub-ok" value="Sub OK">Sub OK</option>
                                    <option className="badge-sub-error" value="Sub lỗi">Sub lỗi</option>
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => copyOriginalRow(viewCardData)}>Sao chép dòng gốc</button>
                            <button className="btn btn-primary" onClick={handleCloseViewModal}>Đóng</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
