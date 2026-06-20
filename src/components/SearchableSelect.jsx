import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../api';

export default function SearchableSelect({
    currentUser,
    value,
    onChange,
    initialDisplayValue = '',
    placeholder = 'Chọn người dùng...',
    role = '', // 'user', 'staff', 'admin', or empty for all active
    status = 'active',
    extraOptions = [], // e.g. [{ label: 'Tất cả', value: 'all' }]
    unassignedLabel = '-- Không chỉ định --',
    unassignedValue = '',
    valueKey = 'id', // 'id' or 'username'
    style = {},
    className = ''
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [users, setUsers] = useState([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const containerRef = useRef(null);

    // Fetch paginated users from backend
    const fetchUsers = async (pageNum, query, replace = false) => {
        if (loading) return;
        setLoading(true);
        try {
            // Determine best endpoint: non-staff MUST use accounts/users-list
            const isStaff = currentUser && currentUser.is_staff;
            let baseUrl = isStaff ? '/dashboard/api/users/' : '/dashboard/api/accounts/users-list/';
            
            // Build query params
            let params = [];
            params.push(`page=${pageNum}`);
            params.push(`page_size=20`);
            
            if (status) params.push(`status=${status}`);
            if (role) params.push(`role=${role}`);
            if (query) params.push(`search=${encodeURIComponent(query)}`);
            
            const url = `${baseUrl}?${params.join('&')}`;
            const resp = await apiRequest(url);
            
            if (resp.ok) {
                const data = await resp.json();
                const results = data.results || data;
                
                if (replace) {
                    setUsers(results);
                } else {
                    setUsers(prev => {
                        // Avoid duplicates
                        const existingIds = new Set(prev.map(u => u.id));
                        const filteredResults = results.filter(u => !existingIds.has(u.id));
                        return [...prev, ...filteredResults];
                    });
                }
                
                // DRF paginated response check
                setHasMore(!!data.next);
                setPage(pageNum);
            }
        } catch (err) {
            console.error("Error fetching users for searchable select:", err);
        } finally {
            setLoading(false);
        }
    };

    // Load initial page of users when dropdown opens
    useEffect(() => {
        if (isOpen) {
            fetchUsers(1, searchQuery, true);
        }
    }, [isOpen]);

    // Debounce search input changes
    useEffect(() => {
        if (!isOpen) return;
        const delayDebounce = setTimeout(() => {
            fetchUsers(1, searchQuery, true);
        }, 250);
        return () => clearTimeout(delayDebounce);
    }, [searchQuery]);

    // Handle dropdown scrolling to trigger lazy loading
    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        if (scrollHeight - scrollTop - clientHeight < 20) {
            if (!loading && hasMore) {
                fetchUsers(page + 1, searchQuery, false);
            }
        }
    };

    // Handle click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get the text to show on the closed selector box
    const getDisplayText = () => {
        // Check extra options first
        const matchedExtra = extraOptions.find(opt => String(opt.value) === String(value));
        if (matchedExtra) {
            return matchedExtra.label;
        }

        if (value === unassignedValue || value === undefined || value === null || value === '') {
            return unassignedLabel;
        }
        
        // Try to find the selected user in our loaded users list
        const selectedUser = users.find(u => {
            if (valueKey === 'id') {
                return String(u.id) === String(value);
            } else {
                return String(u.username) === String(value);
            }
        });
        
        if (selectedUser) {
            return selectedUser.username;
        }
        
        // Fallback to initial display value
        return initialDisplayValue || String(value);
    };

    const handleSelectOption = (itemValue) => {
        onChange(itemValue);
        setIsOpen(false);
        setSearchQuery('');
    };

    // Toggle dropdown open/close
    const handleToggle = (e) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
    };

    return (
        <div 
            ref={containerRef} 
            className={`searchable-select-container ${className}`} 
            style={{ position: 'relative', minWidth: '180px', display: 'inline-block', ...style }}
        >
            <div 
                className="filter-select select-box-trigger" 
                onClick={handleToggle}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    minWidth: '100%',
                    boxSizing: 'border-box',
                    userSelect: 'none'
                }}
            >
                <span style={{ 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap',
                    marginRight: '8px'
                }}>
                    {getDisplayText()}
                </span>
                <span className="dropdown-caret" style={{ 
                    fontSize: '10px', 
                    opacity: 0.7, 
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.2s ease'
                }}>
                    ▼
                </span>
            </div>

            {isOpen && (
                <div 
                    className="select-dropdown-panel"
                    style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        right: 0,
                        background: '#0b0d1b',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
                        zIndex: 9999,
                        padding: '8px',
                        boxSizing: 'border-box'
                    }}
                >
                    <input
                        type="text"
                        className="search-input"
                        placeholder="Tìm kiếm..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%',
                            marginBottom: '8px',
                            boxSizing: 'border-box'
                        }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                    />
                    
                    <div
                        onScroll={handleScroll}
                        style={{
                            maxHeight: '180px',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px'
                        }}
                    >
                        {/* Render Extra Options */}
                        {extraOptions.map((opt, idx) => {
                            const isSelected = String(opt.value) === String(value);
                            return (
                                <div
                                    key={`extra-${idx}`}
                                    onClick={() => handleSelectOption(opt.value)}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        color: isSelected ? 'var(--primary)' : 'var(--text-color)',
                                        background: isSelected ? 'var(--active-bg)' : 'transparent',
                                        fontWeight: isSelected ? 'bold' : 'normal',
                                    }}
                                    className="select-dropdown-item"
                                >
                                    {opt.label}
                                </div>
                            );
                        })}

                        {/* Unassigned Option (if provided and not in extraOptions) */}
                        {unassignedLabel && !extraOptions.some(o => o.value === unassignedValue) && (
                            <div
                                onClick={() => handleSelectOption(unassignedValue)}
                                style={{
                                    padding: '8px 12px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '13px',
                                    color: (value === unassignedValue) ? 'var(--primary)' : 'var(--text-color)',
                                    background: (value === unassignedValue) ? 'var(--active-bg)' : 'transparent',
                                    fontWeight: (value === unassignedValue) ? 'bold' : 'normal',
                                }}
                                className="select-dropdown-item"
                            >
                                {unassignedLabel}
                            </div>
                        )}

                        {/* User List */}
                        {users.map(u => {
                            const optionValue = valueKey === 'id' ? u.id : u.username;
                            const isSelected = String(optionValue) === String(value);
                            
                            return (
                                <div
                                    key={u.id}
                                    onClick={() => handleSelectOption(optionValue)}
                                    style={{
                                        padding: '8px 12px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        color: isSelected ? 'var(--primary)' : 'var(--text-color)',
                                        background: isSelected ? 'var(--active-bg)' : 'transparent',
                                        fontWeight: isSelected ? 'bold' : 'normal',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                    className="select-dropdown-item"
                                >
                                    <span>{u.username}</span>
                                    {isSelected && <span style={{ fontSize: '11px' }}>✓</span>}
                                </div>
                            );
                        })}

                        {loading && (
                            <div style={{
                                padding: '8px',
                                textAlign: 'center',
                                color: 'var(--text-muted)',
                                fontSize: '12px'
                            }}>
                                🔄 Đang tải...
                            </div>
                        )}
                        
                        {!loading && users.length === 0 && (
                            <div style={{
                                padding: '8px',
                                textAlign: 'center',
                                color: 'var(--text-muted)',
                                fontSize: '12px'
                            }}>
                                Không tìm thấy người dùng
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
