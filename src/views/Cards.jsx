import React, { useState, useEffect } from 'react';

import { apiRequest } from '../api';

import Pagination from '../components/Pagination';

import SearchableSelect from '../components/SearchableSelect';



const getCardStatusBadgeClass = (status) => {

    const map = {

        'ChÆ°a sá»­ dá»¥ng': 'badge-unused',

        'Äang sá»­ dá»¥ng': 'badge-active',

        'Tháº» cháº¿t': 'badge-dead',

        'Tháº» sá»ng': 'badge-live',

        'Tháº» tá»t': 'badge-good',

        'Tháº» lá»i': 'badge-error',

        'Sub OK': 'badge-sub-ok',

        'Sub lá»i': 'badge-sub-error'

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

    const [status, setStatus] = useState('Táº¥t cáº£');

    const [owner, setOwner] = useState('all');



    // Selection

    const [selectedIds, setSelectedIds] = useState([]);



    // Modals

    const [importOpen, setImportOpen] = useState(false);

    const [importText, setImportText] = useState('');

    const [importStatus, setImportStatus] = useState('ChÆ°a sá»­ dá»¥ng');

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

            let url = `/dashboard/api/users/?role=user&page=${pageNumber}&page_size=20`;

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

        if (!bulkAssignOpen) return;

        const delayDebounce = setTimeout(() => {

            fetchModalClients(1, ownerSearchQuery, true);

        }, 250);

        return () => clearTimeout(delayDebounce);

    }, [ownerSearchQuery, bulkAssignOpen]);



    const handleModalScroll = (e) => {

        const { scrollTop, scrollHeight, clientHeight } = e.target;

        if (scrollHeight - scrollTop - clientHeight < 20) {

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

    const [editCardStatus, setEditCardStatus] = useState('ChÆ°a sá»­ dá»¥ng');

    const [editCardOwner, setEditCardOwner] = useState('');

    const [editCardUsedBy, setEditCardUsedBy] = useState('');



    const [bulkStatusOpen, setBulkStatusOpen] = useState(false);

    const [bulkStatusVal, setBulkStatusVal] = useState('ChÆ°a sá»­ dá»¥ng');



    const [viewOpen, setViewOpen] = useState(false);

    const [viewCardData, setViewCardData] = useState(null);



    const fetchCards = async () => {

        setLoading(true);

        let url = `/dashboard/api/cards/?page=${page}&page_size=${pageSize}`;

        if (search) url += `&search=${encodeURIComponent(search)}`;

        if (status && status !== 'Táº¥t cáº£') url += `&status=${encodeURIComponent(status)}`;

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

                alert('Lá»i cáº­p nháº­t tráº¡ng thÃ¡i tháº».');

            }

        } catch (err) {

            alert('KhÃ´ng thá» káº¿t ná»i mÃ¡y chá»§ Äá» cáº­p nháº­t tráº¡ng thÃ¡i.');

        }

    };



    const copyToClipboard = (text) => {

        navigator.clipboard.writeText(text).then(() => {

            alert('ÄÃ£ copy thÃ nh cÃ´ng!');

        }).catch(err => {

            alert('Lá»i copy: ' + err);

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

                setViewOpen(true);

                

                if (card.status !== 'Äang sá»­ dá»¥ng') {

                    // Update status in backend

                    await apiRequest(`/dashboard/api/cards/${id}/`, {

                        method: 'PATCH',

                        body: JSON.stringify({ status: 'Äang sá»­ dá»¥ng' })

                    });

                    // Refresh parent list

                    fetchCards();

                    // Update locally shown status to 'Äang sá»­ dá»¥ng'

                    card.status = 'Äang sá»­ dá»¥ng';

                    setViewCardData({ ...card });

                }

            } else {

                alert('KhÃ´ng thá» táº£i chi tiáº¿t tháº».');

            }

        } catch (err) {

            alert('Lá»i káº¿t ná»i khi táº£i chi tiáº¿t tháº».');

        }

    };



    // Bulk delete

    const deleteSelectedCards = async () => {

        if (selectedIds.length === 0) return;

        const confirmDel = confirm(`Báº¡n cÃ³ cháº¯c cháº¯n muá»n xÃ³a ${selectedIds.length} tháº» ÄÃ£ chá»n khá»i há» thá»ng khÃ´ng?`);

        if (!confirmDel) return;



        try {

            const deletePromises = selectedIds.map(id => {

                return apiRequest(`/dashboard/api/cards/${id}/`, {

                    method: 'DELETE'

                });

            });

            await Promise.all(deletePromises);

            alert('ÄÃ£ xÃ³a thÃ nh cÃ´ng cÃ¡c tháº» ÄÃ£ chá»n!');

            setSelectedIds([]);

            fetchCards();

        } catch (err) {

            alert('Lá»i khi xÃ³a tháº».');

        }

    };



    // Import Cards

    const saveImportedCards = async () => {

        if (!importText.trim()) {

            alert('Vui lÃ²ng nháº­p dá»¯ liá»u tháº».');

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

            alert('KhÃ´ng phÃ¡t hiá»n dÃ²ng tháº» nÃ o há»£p lá» (sá» tháº» pháº£i dÃ i 15-16 chá»¯ sá» vÃ  báº¯t Äáº§u báº±ng 3, 4, 5, hoáº·c 6).');

            return;

        }



        setImportLoading(true);



        try {

            await Promise.all(savePromises);

            alert(`ÄÃ£ hoÃ n táº¥t import ${savePromises.length} tháº» vÃ o cÆ¡ sá» dá»¯ liá»u!`);

            setImportOpen(false);

            setImportText('');

            fetchCards();

        } catch (err) {

            alert('Lá»i trong tiáº¿n trÃ¬nh import tháº».');

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

                alert(`ÄÃ£ gÃ¡n sá» há»¯u thÃ nh cÃ´ng cho ${selectedIds.length} tháº».`);

                setBulkAssignOpen(false);

                setSelectedIds([]);

                fetchCards();

            }

        } catch (err) {

            alert('Lá»i gÃ¡n sá» há»¯u.');

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

                alert(`ÄÃ£ cáº­p nháº­t tráº¡ng thÃ¡i thÃ nh cÃ´ng cho ${selectedIds.length} tháº».`);

                setBulkStatusOpen(false);

                setSelectedIds([]);

                fetchCards();

            }

        } catch (err) {

            alert('Lá»i cáº­p nháº­t tráº¡ng thÃ¡i.');

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

            alert('Lá»i táº£i thÃ´ng tin tháº».');

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

                alert('Cáº­p nháº­t tháº» thÃ nh cÃ´ng!');

                setEditOpen(false);

                setSelectedIds([]);

                fetchCards();

            }

        } catch (err) {

            alert('Lá»i lÆ°u tháº».');

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

                            placeholder="TÃ¬m kiáº¿m sá» tháº»..."

                            value={search}

                            onChange={(e) => setSearch(e.target.value)}

                        />

                    </div>

                    <select className={`filter-select ${getCardStatusBadgeClass(status)}`} value={status} onChange={(e) => setStatus(e.target.value)}>

                        <option className="badge-unused" value="ChÆ°a sá»­ dá»¥ng">ChÆ°a sá»­ dá»¥ng</option>

                        <option className="badge-active" value="Äang sá»­ dá»¥ng">Äang sá»­ dá»¥ng</option>

                        <option className="badge-dead" value="Tháº» cháº¿t">Tháº» cháº¿t</option>

                        <option className="badge-live" value="Tháº» sá»ng">Tháº» sá»ng</option>

                        <option className="badge-good" value="Tháº» tá»t">Tháº» tá»t</option>

                        <option className="badge-error" value="Tháº» lá»i">Tháº» lá»i</option>

                        <option className="badge-sub-ok" value="Sub OK">Sub OK</option>

                        <option className="badge-sub-error" value="Sub lá»i">Sub lá»i</option>

                        <option value="Táº¥t cáº£">Táº¥t cáº£</option>

                    </select>

                    {currentUser.is_staff && (

                        <SearchableSelect

                            currentUser={currentUser}

                            value={owner}

                            onChange={setOwner}

                            placeholder="Chá»n chá»§ sá» há»¯u..."

                            valueKey="id"

                            role="user"

                            extraOptions={[

                                { label: 'Táº¥t cáº£ chá»§ sá» há»¯u', value: 'all' },

                                { label: 'ChÆ°a chá» Äá»nh', value: 'unassigned' }

                            ]}

                        />

                    )}

                    <select className="filter-select" value={pageSize} onChange={(e) => { setPageSize(parseInt(e.target.value)); onPageChange(1); }}>

                        <option value={20}>20 dÃ²ng</option>

                        <option value={50}>50 dÃ²ng</option>

                        <option value={100}>100 dÃ²ng</option>

                    </select>

                </div>

                <div className="action-buttons">

                    <button className="btn btn-secondary" onClick={fetchCards}>LÃ m má»i</button>

                    {currentUser.is_staff && (

                        <>

                            <button className="btn btn-success" onClick={() => setImportOpen(true)}>ThÃªm tháº»</button>

                            <button className="btn btn-primary" onClick={() => { setBulkAssignOpen(true); setOwnerSearchQuery(''); }} disabled={selectedIds.length === 0}>Sá» há»¯u</button>

                            <button className="btn btn-primary" onClick={openEditModal} disabled={selectedIds.length !== 1}>Sá»­a</button>

                            <button className="btn btn-danger" onClick={deleteSelectedCards} disabled={selectedIds.length === 0}>XÃ³a</button>

                            <button className="btn btn-warning" onClick={() => setBulkStatusOpen(true)} disabled={selectedIds.length === 0}>Äá»i tráº¡ng thÃ¡i</button>

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

                            <th>Sá» tháº»</th>

                            <th style={{ textAlign: 'center' }}>NgÃ y háº¿t háº¡n</th>

                            <th style={{ textAlign: 'center' }}>CVV</th>

                            <th style={{ textAlign: 'center' }}>Tráº¡ng thÃ¡i</th>

                            <th style={{ textAlign: 'center' }}>Sá» há»¯u bá»i</th>

                            <th style={{ textAlign: 'center' }}>Sá»­ dá»¥ng gáº§n nháº¥t</th>

                            <th style={{ textAlign: 'center' }}>NgÃ y táº¡o</th>

                            <th style={{ textAlign: 'center' }}>NgÃ y cáº­p nháº­t</th>

                            <th style={{ textAlign: 'center' }}>Giao dá»ch</th>

                        </tr>

                    </thead>

                    <tbody>

                        {loading ? (

                            <tr>

                                <td colSpan="11" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>

                                    Äang táº£i danh sÃ¡ch tháº»...

                                </td>

                            </tr>

                        ) : cards.length === 0 ? (

                            <tr>

                                <td colSpan="11" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>

                                    KhÃ´ng tÃ¬m tháº¥y tháº» nÃ o phÃ¹ há»£p.

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

                                                <option className="badge-unused" value="ChÆ°a sá»­ dá»¥ng">ChÆ°a sá»­ dá»¥ng</option>

                                                <option className="badge-active" value="Äang sá»­ dá»¥ng">Äang sá»­ dá»¥ng</option>

                                                <option className="badge-dead" value="Tháº» cháº¿t">Tháº» cháº¿t</option>

                                                <option className="badge-live" value="Tháº» sá»ng">Tháº» sá»ng</option>

                                                <option className="badge-good" value="Tháº» tá»t">Tháº» tá»t</option>

                                                <option className="badge-error" value="Tháº» lá»i">Tháº» lá»i</option>

                                                <option className="badge-sub-ok" value="Sub OK">Sub OK</option>

                                                <option className="badge-sub-error" value="Sub lá»i">Sub lá»i</option>

                                            </select>

                                        </td>

                                        <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--accent)' }}>{c.owner_username || 'ChÆ°a chá» Äá»nh'}</td>

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

                            <h3>Nháº­p/Import danh sÃ¡ch tháº» má»i</h3>

                            <button className="modal-close" onClick={() => setImportOpen(false)}>&times;</button>

                        </div>

                        <div className="modal-body">

                            <div className="form-group">

                                <label className="form-label">Dá»¯ liá»u tháº» (Má»i tháº» 1 dÃ²ng, Äá»nh dáº¡ng: Sá» tháº»|ThÃ¡ng|NÄm|CVV|TÃªn...)</label>

                                <textarea 

                                    className="form-textarea" 

                                    placeholder="4147098472726991|03|27|502|David Miranda|Hendersonton|Ohio|88313|US"

                                    value={importText}

                                    onChange={(e) => setImportText(e.target.value)}

                                ></textarea>

                            </div>

                            <div className="form-group">

                                <label className="form-label">Tráº¡ng thÃ¡i tháº» ban Äáº§u</label>

                                <select className={`filter-select ${getCardStatusBadgeClass(importStatus)}`} style={{ width: '100%' }} value={importStatus} onChange={(e) => setImportStatus(e.target.value)}>

                                    <option className="badge-unused" value="ChÆ°a sá»­ dá»¥ng">ChÆ°a sá»­ dá»¥ng</option>

                                    <option className="badge-active" value="Äang sá»­ dá»¥ng">Äang sá»­ dá»¥ng</option>

                                    <option className="badge-dead" value="Tháº» cháº¿t">Tháº» cháº¿t</option>

                                    <option className="badge-live" value="Tháº» sá»ng">Tháº» sá»ng</option>

                                    <option className="badge-good" value="Tháº» tá»t">Tháº» tá»t</option>

                                    <option className="badge-error" value="Tháº» lá»i">Tháº» lá»i</option>

                                    <option className="badge-sub-ok" value="Sub OK">Sub OK</option>

                                    <option className="badge-sub-error" value="Sub lá»i">Sub lá»i</option>

                                </select>

                            </div>

                            <div className="form-group">

                                <label className="form-label">Sá» há»¯u bá»i (Owner)</label>

                                <SearchableSelect
                                    currentUser={currentUser}
                                    value={importOwner}
                                    onChange={setImportOwner}
                                    initialDisplayValue=""
                                    placeholder="Chọn chủ sở hữu..."
                                    valueKey="id"
                                    role="user"
                                    unassignedLabel="-- Không chỉ định --"
                                    unassignedValue=""
                                    style={{ width: '100%' }}
                                />

                            </div>

                        </div>

                        <div className="modal-footer">

                            <button className="btn btn-secondary" onClick={() => setImportOpen(false)}>Há»§y</button>

                            <button className="btn btn-success" onClick={saveImportedCards} disabled={importLoading}>

                                {importLoading ? 'Äang xá»­ lÃ½...' : 'Nháº­p tháº»'}

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

                            <h3>GÃ¡n sá» há»¯u hÃ ng loáº¡t</h3>

                            <button className="modal-close" onClick={() => setBulkAssignOpen(false)}>&times;</button>

                        </div>

                        <div className="modal-body">

                            <div className="form-group">

                                <label className="form-label">Äang chá»n {selectedIds.length} tháº»</label>

                            </div>

                            <div className="form-group">

                                <label className="form-label">Chá» Äá»nh sá» há»¯u bá»i</label>

                                <input 

                                    type="text" 

                                    className="form-input" 

                                    placeholder="TÃ¬m tÃªn chá»§ sá» há»¯u..." 

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

                                        -- KhÃ´ng chá» Äá»nh --

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

                                                {isSelected && <span>â</span>}

                                            </div>

                                        );

                                    })}

                                    {modalClientsLoading && (

                                        <div style={{ padding: '8px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>

                                            ð Äang táº£i thÃªm...

                                        </div>

                                    )}

                                </div>

                            </div>

                        </div>

                        <div className="modal-footer">

                            <button className="btn btn-secondary" onClick={() => setBulkAssignOpen(false)}>Há»§y</button>

                            <button className="btn btn-primary" onClick={saveBulkAssign}>GÃ¡n sá» há»¯u</button>

                        </div>

                    </div>

                </div>

            )}



            {/* Edit Card Modal */}

            {editOpen && (

                <div className="modal-overlay" style={{ display: 'flex' }}>

                    <div className="modal-box">

                        <div className="modal-header">

                            <h3>Chá»‰nh sá»­a tháº»</h3>

                            <button className="modal-close" onClick={() => setEditOpen(false)}>&times;</button>

                        </div>

                        <div className="modal-body">

                            <div className="form-group">

                                <label className="form-label">Sá»‘ tháº»</label>

                                <input type="text" className="form-input" value={editCardNumber} onChange={(e) => setEditCardNumber(e.target.value)} required />

                            </div>

                            <div className="form-row">

                                <div className="form-group">

                                    <label className="form-label">NgÃ y háº¿t háº¡n (MM/YY)</label>

                                    <input type="text" className="form-input" value={editCardExpiry} onChange={(e) => setEditCardExpiry(e.target.value)} placeholder="03/27" />

                                </div>

                                <div className="form-group">

                                    <label className="form-label">CVV</label>

                                    <input type="text" className="form-input" value={editCardCVV} onChange={(e) => setEditCardCVV(e.target.value)} />

                                </div>

                            </div>

                            <div className="form-group">

                                <label className="form-label">Tráº¡ng thÃ¡i</label>

                                <select className={`filter-select ${getCardStatusBadgeClass(editCardStatus)}`} style={{ width: '100%' }} value={editCardStatus} onChange={(e) => setEditCardStatus(e.target.value)}>

                                    <option className="badge-unused" value="ChÆ°a sá»­ dá»¥ng">ChÆ°a sá»­ dá»¥ng</option>

                                    <option className="badge-active" value="Ä ang sá»­ dá»¥ng">Ä ang sá»­ dá»¥ng</option>

                                    <option className="badge-dead" value="Tháº» cháº¿t">Tháº» cháº¿t</option>

                                    <option className="badge-live" value="Tháº» sá»‘ng">Tháº» sá»‘ng</option>

                                    <option className="badge-good" value="Tháº» tá»‘t">Tháº» tá»‘t</option>

                                    <option className="badge-error" value="Tháº» lá»—i">Tháº» lá»—i</option>

                                    <option className="badge-sub-ok" value="Sub OK">Sub OK</option>

                                    <option className="badge-sub-error" value="Sub lá»—i">Sub lá»—i</option>

                                </select>

                            </div>

                            <div className="form-row">

                                <div className="form-group">

                                    <label className="form-label">Sá»Ÿ há»¯u bá»Ÿi</label>

                                    <SearchableSelect

                                        currentUser={currentUser}

                                        value={editCardOwner}

                                        onChange={setEditCardOwner}

                                        initialDisplayValue={cards.find(c => c.id === editCardId)?.owner_username || ''}

                                        placeholder="Chá» n chá»§ sá»Ÿ há»¯u..."

                                        valueKey="id"

                                        role="user"

                                        unassignedLabel="-- KhÃ´ng chá»‰ Ä‘á»‹nh --"

                                        unassignedValue=""

                                        style={{ width: '100%' }}

                                    />

                                </div>

                                <div className="form-group">

                                    <label className="form-label">Sá»­ dá»¥ng gáº§n nháº¥t</label>

                                    <SearchableSelect

                                        currentUser={currentUser}

                                        value={editCardUsedBy}

                                        onChange={setEditCardUsedBy}

                                        initialDisplayValue={cards.find(c => c.id === editCardId)?.used_by_username || ''}

                                        placeholder="Chọn người dùng..."

                                        valueKey="id"

                                        role="user"

                                        unassignedLabel="-- Không chỉ định --"

                                        unassignedValue=""

                                        style={{ width: '100%' }}

                                    />

                                </div>

                            </div>

                        </div>

                        <div className="modal-footer">

                            <button className="btn btn-secondary" onClick={() => setEditOpen(false)}>Há»§y</button>

                            <button className="btn btn-primary" onClick={saveEditCard}>LÆ°u thay Äá»i</button>

                        </div>

                    </div>

                </div>

            )}



            {/* Bulk Status Modal */}

            {bulkStatusOpen && (

                <div className="modal-overlay" style={{ display: 'flex' }}>

                    <div className="modal-box">

                        <div className="modal-header">

                            <h3>Äá»i tráº¡ng thÃ¡i hÃ ng loáº¡t</h3>

                            <button className="modal-close" onClick={() => setBulkStatusOpen(false)}>&times;</button>

                        </div>

                        <div className="modal-body">

                            <div className="form-group">

                                <label className="form-label">Äang chá»n {selectedIds.length} tháº»</label>

                            </div>

                            <div className="form-group">

                                <label className="form-label">Tráº¡ng thÃ¡i má»i</label>

                                <select className={`filter-select ${getCardStatusBadgeClass(bulkStatusVal)}`} style={{ width: '100%' }} value={bulkStatusVal} onChange={(e) => setBulkStatusVal(e.target.value)}>

                                    <option className="badge-unused" value="ChÆ°a sá»­ dá»¥ng">ChÆ°a sá»­ dá»¥ng</option>

                                    <option className="badge-active" value="Äang sá»­ dá»¥ng">Äang sá»­ dá»¥ng</option>

                                    <option className="badge-dead" value="Tháº» cháº¿t">Tháº» cháº¿t</option>

                                    <option className="badge-live" value="Tháº» sá»ng">Tháº» sá»ng</option>

                                    <option className="badge-good" value="Tháº» tá»t">Tháº» tá»t</option>

                                    <option className="badge-error" value="Tháº» lá»i">Tháº» lá»i</option>

                                    <option className="badge-sub-ok" value="Sub OK">Sub OK</option>

                                    <option className="badge-sub-error" value="Sub lá»i">Sub lá»i</option>

                                </select>

                            </div>

                        </div>

                        <div className="modal-footer">

                            <button className="btn btn-secondary" onClick={() => setBulkStatusOpen(false)}>Há»§y</button>

                            <button className="btn btn-primary" onClick={saveBulkStatus}>Cáº­p nháº­t</button>

                        </div>

                    </div>

                </div>

            )}



            {/* View Card Detail Modal */}

            {viewOpen && viewCardData && (

                <div className="modal-overlay" style={{ display: 'flex' }} onClick={(e) => { if (e.target.className === 'modal-overlay') setViewOpen(false); }}>

                    <div className="modal-box">

                        <div className="modal-header">

                            <h3>Chi tiáº¿t tháº»</h3>

                            <button className="modal-close" onClick={() => setViewOpen(false)}>&times;</button>

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

                                        title="Sao chÃ©p sá» tháº»"

                                    >

                                        ð Copy

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

                                        title="Sao chÃ©p Háº¡n dÃ¹ng & CVV"

                                    >

                                        ð Copy Exp/CVV

                                    </button>

                                </div>

                            </div>



                            <div className="card-row-value" style={{ display: 'none' }}>

                                <span className="card-row-label">Sá» tháº»</span>

                                <span className="card-val-text">{viewCardData.card_number}</span>

                            </div>

                            <div className="card-row-value" style={{ display: 'none' }}>

                                <span className="card-row-label">Háº¡n dÃ¹ng & CVV</span>

                                <span className="card-val-text">{`${viewCardData.expiry_date || 'MM/YY'} / ${viewCardData.cvv || 'xxx'}`}</span>

                            </div>

                            <div className="card-row-value">

                                <span className="card-row-label">Sá» há»¯u bá»i</span>

                                <span className="card-val-text">{viewCardData.owner_username || 'ChÆ°a chá» Äá»nh'}</span>

                                <span style={{ width: '78px' }}></span>

                            </div>

                            <div className="card-row-value">

                                <span className="card-row-label">Sá»­ dá»¥ng gáº§n nháº¥t</span>

                                <span className="card-val-text">{viewCardData.used_by_username || '-'}</span>

                                <span style={{ width: '78px' }}></span>

                            </div>

                            <div className="form-group">

                                <label className="form-label">Billing/ThÃ´ng tin thÃªm</label>

                                <textarea 

                                    className="form-textarea" 

                                    value={viewCardData.extra_info || 'KhÃ´ng cÃ³ thÃ´ng tin thÃªm.'}

                                    readOnly 

                                    style={{ background: 'rgba(255,255,255,0.01)', borderColor: 'rgba(255,255,255,0.02)', color: '#cbd5e1' }}

                                ></textarea>

                            </div>

                            <div className="form-group">

                                <label className="form-label">Thay Äá»i tráº¡ng thÃ¡i tháº»</label>

                                <select 

                                    className={`filter-select ${getCardStatusBadgeClass(viewCardData.status)}`} 

                                    value={viewCardData.status} 

                                    style={{ width: '100%' }} 

                                    onChange={async (e) => {

                                        const newStatus = e.target.value;

                                        await updateCardStatusInline(viewCardData.id, newStatus);

                                        setViewCardData({ ...viewCardData, status: newStatus });

                                    }}

                                >

                                    <option className="badge-unused" value="ChÆ°a sá»­ dá»¥ng">ChÆ°a sá»­ dá»¥ng</option>

                                    <option className="badge-active" value="Äang sá»­ dá»¥ng">Äang sá»­ dá»¥ng</option>

                                    <option className="badge-dead" value="Tháº» cháº¿t">Tháº» cháº¿t</option>

                                    <option className="badge-live" value="Tháº» sá»ng">Tháº» sá»ng</option>

                                    <option className="badge-good" value="Tháº» tá»t">Tháº» tá»t</option>

                                    <option className="badge-error" value="Tháº» lá»i">Tháº» lá»i</option>

                                    <option className="badge-sub-ok" value="Sub OK">Sub OK</option>

                                    <option className="badge-sub-error" value="Sub lá»i">Sub lá»i</option>

                                </select>

                            </div>

                        </div>

                        <div className="modal-footer">

                            <button className="btn btn-secondary" onClick={() => copyOriginalRow(viewCardData)}>Sao chÃ©p dÃ²ng gá»c</button>

                            <button className="btn btn-primary" onClick={() => setViewOpen(false)}>ÄÃ³ng</button>

                        </div>

                    </div>

                </div>

            )}

        </div>

    );

}

