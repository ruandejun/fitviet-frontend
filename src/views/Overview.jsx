import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

const getCardStatusBadgeClass = (status) => {
    const map = {
        'Chưa sử dụng': 'badge-unused',
        'Đang sử dụng': 'badge-in-use',
        'Thẻ chết': 'badge-dead',
        'Thẻ sống': 'badge-live',
        'Thẻ tốt': 'badge-good',
        'Thẻ lỗi': 'badge-error',
        'Sub OK': 'badge-sub-ok',
        'Sub lỗi': 'badge-sub-error'
    };
    return map[status] || 'badge-unused';
};

export default function Overview({ currentUser, onSwitchTab }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const loadStats = async () => {
        try {
            const response = await apiRequest('/dashboard/api/stats/');
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (err) {
            console.error("Error loading stats:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadStats();
        const interval = setInterval(loadStats, 60000);
        return () => clearInterval(interval);
    }, []);

    if (loading || !stats) {
        return <div style={{ color: 'var(--text-muted)' }}>Đang tải dữ liệu thống kê...</div>;
    }

    // Doughnut Data (Card distribution)
    const cardCounts = stats.status_counts || {};
    const cardsData = {
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
    };

    // Bar Data (User roles distribution)
    const usersData = {
        labels: ['Tổng người dùng', 'Đang hoạt động', 'Quản trị (Staff)'],
        datasets: [{
            label: 'Số lượng',
            data: [stats.total_users || 0, stats.active_users || 0, stats.staff_users || 0],
            backgroundColor: ['#6366f1', '#10b981', '#f59e0b'],
            borderRadius: 6
        }]
    };

    return (
        <div>
            {/* Summary Cards */}
            <div className="stats-grid">
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
            </div>

            {/* Charts Row */}
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
                                        position: 'right',
                                        labels: { color: '#94a3b8', font: { family: 'Outfit', size: 11 } }
                                    }
                                }
                            }}
                        />
                    </div>
                </div>
                {currentUser.is_staff && (
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

            {/* Activity Lists */}
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
        </div>
    );
}
