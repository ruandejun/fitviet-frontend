import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

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

const getCountryFlag = (countryName) => {
    if (!countryName || countryName === 'N/A') return '';
    const name = countryName.toLowerCase();
    if (name.includes('vietnam') || name.includes('việt nam')) return '🇻🇳 ';
    if (name.includes('united states') || name.includes('us')) return '🇺🇸 ';
    if (name.includes('germany') || name.includes('de')) return '🇩🇪 ';
    if (name.includes('united kingdom') || name.includes('gb') || name.includes('uk')) return '🇬🇧 ';
    if (name.includes('singapore') || name.includes('sg')) return '🇸🇬 ';
    if (name.includes('japan') || name.includes('jp')) return '🇯🇵 ';
    if (name.includes('france') || name.includes('fr')) return '🇫🇷 ';
    if (name.includes('canada') || name.includes('ca')) return '🇨🇦 ';
    return '🏳️ ';
};

export default function Overview({ currentUser, onSwitchTab, openEmailGetModal, openAddressModal, openTwoFaModal }) {
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [legendPosition, setLegendPosition] = useState('right');

    // IP Monitor state
    const [ipInfo, setIpInfo] = useState({
        loading: true,
        ip: '',
        city: '',
        region: '',
        country: '',
        org: '',
        error: false
    });

    // Browser fingerprint state
    const getFingerprint = () => {
        let webglVendor = 'N/A';
        let webglRenderer = 'N/A';
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    webglVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'N/A';
                    webglRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'N/A';
                }
            }
        } catch (e) {
            console.error(e);
        }

        return {
            userAgent: navigator.userAgent,
            platform: navigator.platform || 'N/A',
            language: navigator.language || 'N/A',
            screenRes: `${window.screen.width}x${window.screen.height} (${window.screen.colorDepth}-bit)`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'N/A',
            cores: navigator.hardwareConcurrency || 'N/A',
            memory: navigator.deviceMemory ? `${navigator.deviceMemory} GB` : 'N/A',
            webglVendor,
            webglRenderer
        };
    };

    const [fingerprint] = useState(getFingerprint());

    const fetchIp = async () => {
        setIpInfo(prev => ({ ...prev, loading: true, error: false }));
        try {
            const res = await apiRequest('/dashboard/api/ip-info/');
            if (res.ok) {
                const data = await res.json();
                setIpInfo({
                    loading: false,
                    ip: data.ip || '—',
                    city: data.city || '—',
                    region: data.region || '—',
                    country: data.country || '—',
                    org: data.org || '—',
                    error: false
                });
            } else {
                throw new Error('Failed to fetch from local GeoIP database API');
            }
        } catch (err) {
            console.error("Local GeoIP lookup failed, falling back to ipapi.co:", err);
            try {
                const res = await fetch('https://ipapi.co/json/');
                if (res.ok) {
                    const data = await res.json();
                    setIpInfo({
                        loading: false,
                        ip: data.ip || '—',
                        city: data.city || '—',
                        region: data.region || '—',
                        country: data.country_name || '—',
                        org: data.org || '—',
                        error: false
                    });
                } else {
                    throw new Error('Failed to fetch from ipapi');
                }
            } catch (fallbackErr) {
                try {
                    const res = await fetch('https://api.ipify.org?format=json');
                    if (res.ok) {
                        const data = await res.json();
                        setIpInfo({
                            loading: false,
                            ip: data.ip || '—',
                            city: 'N/A',
                            region: 'N/A',
                            country: 'N/A',
                            org: 'N/A',
                            error: false
                        });
                    } else {
                        throw new Error('Fallback failed');
                    }
                } catch (fallbackErr2) {
                    setIpInfo({
                        loading: false,
                        ip: 'Unknown',
                        city: 'N/A',
                        region: 'N/A',
                        country: 'N/A',
                        org: 'N/A',
                        error: true
                    });
                }
            }
        }
    };

    const loadStats = async () => {
        if (!currentUser) {
            setStatsLoading(false);
            return;
        }
        try {
            const response = await apiRequest('/dashboard/api/stats/');
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (err) {
            console.error("Error loading stats:", err);
        } finally {
            setStatsLoading(false);
        }
    };

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 576) {
                setLegendPosition('bottom');
            } else {
                setLegendPosition('right');
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        fetchIp();
        if (currentUser) {
            loadStats();
        }

        const interval = setInterval(() => {
            if (currentUser) {
                loadStats();
            }
        }, 60000);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearInterval(interval);
        };
    }, [currentUser]);

    // Doughnut Data (Card distribution)
    const cardCounts = stats?.status_counts || {};
    const cardsData = stats ? {
        labels: ['Chưa sử dụng', 'Đang sử dụng', 'Thẻ chết', 'Thẻ sống', 'Thẻ tốt', 'Thẻ lỗi', 'Sub OK', 'Sub lỗi'],
        datasets: [{
            data: [
                cardCounts.chua_su_dung || 0,
                cardCounts.dang_su_dung || 0,
                cardCounts.the_chet || 0,
                cardCounts.the_song || 0,
                cardCounts.the_tot || 0,
                cardCounts.the_loi || 0,
                cardCounts.sub_ok || 0,
                cardCounts.sub_loi || 0
            ],
            backgroundColor: ['#64748b', '#ea580c', '#dc2626', '#059669', '#0f766e', '#ef4444', '#10b981', '#f43f5e'],
            borderWidth: 1,
            borderColor: 'rgba(255, 255, 255, 0.05)'
        }]
    } : null;

    // Bar Data (User roles distribution)
    const usersData = stats ? {
        labels: ['Tổng người dùng', 'Đang hoạt động', 'Quản trị (Staff)'],
        datasets: [{
            label: 'Số lượng',
            data: [stats.total_users || 0, stats.active_users || 0, stats.staff_users || 0],
            backgroundColor: ['#6366f1', '#10b981', '#f59e0b'],
            borderRadius: 6
        }]
    } : null;

    return (
        <div>
            {/* Inject Custom Scoped CSS */}
            <style>{`
                .quick-actions-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                    gap: 16px;
                    margin-bottom: 28px;
                }
                .action-card {
                    background: var(--card-bg, #0b0f19);
                    border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
                    border-radius: 16px;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-start;
                    gap: 12px;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }
                .action-card::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background: linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%);
                    opacity: 0;
                    transition: opacity 0.3s ease;
                    z-index: 1;
                }
                .action-card:hover::before {
                    opacity: 1;
                }
                .action-card:hover {
                    transform: translateY(-4px);
                    border-color: var(--primary, #6366f1);
                    box-shadow: 0 12px 20px -8px rgba(99, 102, 241, 0.25);
                }
                .action-card > * {
                    position: relative;
                    z-index: 2;
                }
                .action-icon {
                    font-size: 26px;
                    padding: 10px;
                    background: rgba(255, 255, 255, 0.03);
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.04);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .action-title {
                    font-size: 15px;
                    font-weight: 700;
                    color: var(--text-color, #f8fafc);
                }
                .action-desc {
                    font-size: 11.5px;
                    color: var(--text-muted, #94a3b8);
                    line-height: 1.4;
                }

                .monitor-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    margin-bottom: 28px;
                }
                @media (max-width: 992px) {
                    .monitor-grid {
                        grid-template-columns: 1fr;
                    }
                }
                .monitor-panel {
                    background: var(--card-bg, #0b0f19);
                    border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
                    border-radius: 20px;
                    padding: 24px;
                    position: relative;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }
                .monitor-title {
                    font-size: 15px;
                    font-weight: 700;
                    color: var(--text-color, #f8fafc);
                    margin-bottom: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
                    padding-bottom: 12px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .ip-badge {
                    font-size: 20px;
                    font-weight: 800;
                    color: #10b981;
                    font-family: monospace;
                    letter-spacing: 0.5px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .pulse-indicator {
                    width: 10px;
                    height: 10px;
                    background: #10b981;
                    border-radius: 50%;
                    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
                    animation: pulse 1.6s infinite;
                }
                @keyframes pulse {
                    0% {
                        transform: scale(0.95);
                        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
                    }
                    70% {
                        transform: scale(1);
                        box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
                    }
                    100% {
                        transform: scale(0.95);
                        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
                    }
                }
                .monitor-data-table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .monitor-data-row {
                    border-bottom: 1px solid rgba(255, 255, 255, 0.02);
                }
                .monitor-data-row:last-child {
                    border-bottom: none;
                }
                .monitor-data-label {
                    padding: 8px 0;
                    color: var(--text-muted, #94a3b8);
                    font-size: 13px;
                    width: 32%;
                }
                .monitor-data-value {
                    padding: 8px 0;
                    color: var(--text-color, #f8fafc);
                    font-size: 13px;
                    font-weight: 500;
                    word-break: break-all;
                }
                .fingerprint-tag {
                    background: rgba(99, 102, 241, 0.12);
                    color: #a5b4fc;
                    padding: 3px 8px;
                    border-radius: 6px;
                    font-size: 12px;
                    font-weight: 500;
                    border: 1px solid rgba(99, 102, 241, 0.2);
                    display: inline-block;
                }
                .fingerprint-tag.webgl {
                    background: rgba(236, 72, 153, 0.1);
                    color: #f472b6;
                    border-color: rgba(236, 72, 153, 0.2);
                    font-family: monospace;
                    font-size: 11.5px;
                }
                .fingerprint-tag.ua {
                    white-space: normal;
                    word-break: break-all;
                    font-family: monospace;
                    font-size: 11px;
                    padding: 8px 12px;
                    background: rgba(255, 255, 255, 0.02);
                    border-color: rgba(255, 255, 255, 0.03);
                    color: #cbd5e1;
                    width: 100%;
                }
                .refresh-btn {
                    background: transparent;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    color: var(--text-muted);
                    width: 30px;
                    height: 30px;
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s ease;
                }
                .refresh-btn:hover {
                    color: var(--text-color);
                    background: rgba(255, 255, 255, 0.05);
                    border-color: rgba(255, 255, 255, 0.2);
                }
            `}</style>

            {/* Quick Actions Panel */}
            <div className="quick-actions-grid">
                <div className="action-card" onClick={openEmailGetModal}>
                    <div className="action-icon">✉️</div>
                    <div className="action-title">Lấy Info</div>
                    <div className="action-desc">Nhận thông tin tài khoản hoặc email tạm thời nhanh chóng.</div>
                </div>
                <div className="action-card" onClick={openAddressModal}>
                    <div className="action-icon">🇺🇸</div>
                    <div className="action-title">US Địa Chỉ</div>
                    <div className="action-desc">Tạo thông tin cá nhân và địa chỉ Mỹ ngẫu nhiên để đăng ký.</div>
                </div>
                <div className="action-card" onClick={openTwoFaModal}>
                    <div className="action-icon">🔑</div>
                    <div className="action-title">Trình Tạo 2FA</div>
                    <div className="action-desc">Tạo mã OTP bảo mật 2FA tức thì bằng khóa Secret Key.</div>
                </div>
                <div className="action-card" onClick={() => onSwitchTab('notes')}>
                    <div className="action-icon">📝</div>
                    <div className="action-title">Ghi Chú Nhanh</div>
                    <div className="action-desc">Mở công cụ lưu trữ ghi chú nhanh đồng bộ trực tiếp.</div>
                </div>
            </div>

            {/* IP & Browser Fingerprint Monitor Grid */}
            <div className="monitor-grid">
                {/* IP Geolocation Panel */}
                <div className="monitor-panel">
                    <div className="monitor-title">
                        <span>📡 Giám sát IP hiện tại</span>
                        <button className="refresh-btn" onClick={fetchIp} title="Tải lại thông tin IP">
                            🔄
                        </button>
                    </div>

                    {ipInfo.loading ? (
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Đang tải địa chỉ IP...</div>
                    ) : (
                        <div>
                            <div style={{ marginBottom: '18px' }}>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Địa chỉ IP WAN</div>
                                <div className="ip-badge">
                                    <span className="pulse-indicator"></span>
                                    {ipInfo.ip}
                                </div>
                            </div>

                            <table className="monitor-data-table">
                                <tbody>
                                    <tr className="monitor-data-row">
                                        <td className="monitor-data-label">Quốc gia</td>
                                        <td className="monitor-data-value">{ipInfo.country !== 'N/A' ? `${getCountryFlag(ipInfo.country)}${ipInfo.country}` : '—'}</td>
                                    </tr>
                                    <tr className="monitor-data-row">
                                        <td className="monitor-data-label">Thành phố</td>
                                        <td className="monitor-data-value">{ipInfo.city}</td>
                                    </tr>
                                    <tr className="monitor-data-row">
                                        <td className="monitor-data-label">Bang / Khu vực</td>
                                        <td className="monitor-data-value">{ipInfo.region}</td>
                                    </tr>
                                    <tr className="monitor-data-row">
                                        <td className="monitor-data-label">Nhà cung cấp (ISP)</td>
                                        <td className="monitor-data-value">{ipInfo.org}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Fingerprint Panel */}
                <div className="monitor-panel">
                    <div className="monitor-title">
                        <span>🕵️ Thống kê Browser Fingerprint</span>
                    </div>

                    <table className="monitor-data-table">
                        <tbody>
                            <tr className="monitor-data-row">
                                <td className="monitor-data-label">WebGL Vendor</td>
                                <td className="monitor-data-value">
                                    <span className="fingerprint-tag webgl">{fingerprint.webglVendor}</span>
                                </td>
                            </tr>
                            <tr className="monitor-data-row">
                                <td className="monitor-data-label">WebGL Renderer</td>
                                <td className="monitor-data-value">
                                    <span className="fingerprint-tag webgl">{fingerprint.webglRenderer}</span>
                                </td>
                            </tr>
                            <tr className="monitor-data-row">
                                <td className="monitor-data-label">Timezone</td>
                                <td className="monitor-data-value">
                                    <span className="fingerprint-tag">{fingerprint.timezone}</span>
                                </td>
                            </tr>
                            <tr className="monitor-data-row">
                                <td className="monitor-data-label">Màn hình / CPU / RAM</td>
                                <td className="monitor-data-value" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <span className="fingerprint-tag">{fingerprint.screenRes}</span>
                                    <span className="fingerprint-tag">{fingerprint.cores} Cores</span>
                                    {fingerprint.memory !== 'N/A' && <span className="fingerprint-tag">{fingerprint.memory}</span>}
                                </td>
                            </tr>
                            <tr className="monitor-data-row">
                                <td className="monitor-data-label" style={{ verticalAlign: 'top', paddingTop: '10px' }}>User Agent</td>
                                <td className="monitor-data-value" style={{ paddingTop: '10px' }}>
                                    <div className="fingerprint-tag ua">{fingerprint.userAgent}</div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Summary Cards */}
            {currentUser && (
                <div className="stats-grid">
                    {!statsLoading && stats ? (
                        <>
                            <div className="stat-card" style={{ cursor: 'pointer' }} onClick={() => onSwitchTab('cards')}>
                                <span className="stat-title">Tổng số thẻ</span>
                                <span className="stat-val">{stats.total_cards}</span>
                            </div>
                            <div className="stat-card card-unused" style={{ cursor: 'pointer' }} onClick={() => onSwitchTab('cards')}>
                                <span className="stat-title">Thẻ chưa sử dụng</span>
                                <span className="stat-val">{cardCounts.chua_su_dung || 0}</span>
                            </div>
                            {currentUser.is_staff && (
                                <>
                                    <div className="stat-card card-users" style={{ cursor: 'pointer' }} onClick={() => onSwitchTab('users')}>
                                        <span className="stat-title">Khách hàng (Client)</span>
                                        <span className="stat-val">{stats.total_users}</span>
                                    </div>
                                    <div className="stat-card card-sessions">
                                        <span className="stat-title">Active Sessions</span>
                                        <span className="stat-val">{stats.active_sessions}</span>
                                    </div>
                                </>
                            )}
                        </>
                    ) : (
                        <div style={{ padding: '20px', color: 'var(--text-muted)' }}>Đang tải số liệu thống kê hệ thống...</div>
                    )}
                </div>
            )}

            {/* Charts Row */}
            {currentUser && !statsLoading && stats && cardsData && (
                <div className="charts-row">
                    <div className="chart-panel">
                        <div className="chart-header">
                            <span className="chart-title">Phân bố trạng thái thẻ</span>
                        </div>
                        <div style={{ position: 'relative', height: '240px' }}>
                            <Doughnut 
                                data={cardsData} 
                                options={{
                                    responsive: true,
                                    maintainAspectRatio: false,
                                    plugins: {
                                        legend: {
                                            position: legendPosition,
                                            labels: { color: '#94a3b8', font: { family: 'Outfit', size: 11 } }
                                        }
                                    }
                                }}
                            />
                        </div>
                    </div>
                    {currentUser.is_staff && usersData && (
                        <div className="chart-panel">
                            <div className="chart-header">
                                <span className="chart-title">Thống kê vai trò người dùng</span>
                            </div>
                            <div style={{ position: 'relative', height: '240px' }}>
                                <Bar 
                                    data={usersData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        scales: {
                                            y: {
                                                grid: { color: 'rgba(255, 255, 255, 0.03)' },
                                                ticks: { color: '#94a3b8', font: { family: 'Outfit' } }
                                            },
                                            x: {
                                                grid: { display: false },
                                                ticks: { color: '#94a3b8', font: { family: 'Outfit' } }
                                            }
                                        },
                                        plugins: {
                                            legend: { display: false }
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Activity Lists */}
            {currentUser && !statsLoading && stats && (
                <div className="activity-grid">
                    <div className="activity-panel">
                        <span className="chart-title">Cập nhật thẻ gần đây</span>
                        <div className="activity-list">
                            {stats.recent_cards && stats.recent_cards.length > 0 ? (
                                stats.recent_cards.map((c, i) => (
                                    <div key={i} className="activity-item">
                                        <div className="activity-info">
                                            <strong>{c.card_number}</strong>
                                            <span className="activity-time">Cập nhật: {c.updated_at}</span>
                                        </div>
                                        <span className={`badge ${getCardStatusBadgeClass(c.status)}`}>{c.status}</span>
                                    </div>
                                ))
                            ) : (
                                <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>Không có hoạt động nào gần đây.</div>
                            )}
                        </div>
                    </div>
                    {currentUser.is_staff && (
                        <div className="activity-panel">
                            <span className="chart-title">Người dùng mới đăng ký</span>
                            <div className="activity-list">
                                {stats.recent_users && stats.recent_users.length > 0 ? (
                                    stats.recent_users.map((u, i) => (
                                        <div key={i} className="activity-item">
                                            <div className="activity-info">
                                                <strong>{u.username}</strong>
                                                <span className="activity-time">Đăng ký: {u.date_joined}</span>
                                            </div>
                                            <span className="activity-time">{u.email || 'Không có email'}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>Chưa có khách hàng đăng ký mới.</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
