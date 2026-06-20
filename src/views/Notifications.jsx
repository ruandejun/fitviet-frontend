import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api';

export default function Notifications({ fetchNotificationCount }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadNotifications = async () => {
        setLoading(true);
        try {
            const resp = await apiRequest('/dashboard/api/notifications/');
            if (resp.ok) {
                const data = await resp.json();
                const list = data.results || data || [];
                setNotifications(list);
                // Also update header/sidebar unread badge
                if (fetchNotificationCount) {
                    fetchNotificationCount();
                }
            }
        } catch (err) {
            console.error("Error loading notifications:", err);
        } finally {
            setLoading(false);
        }
    };

    const markAllAsRead = async () => {
        try {
            const resp = await apiRequest('/dashboard/api/notifications/mark_all_read/', {
                method: 'POST'
            });
            if (resp.ok) {
                loadNotifications();
            } else {
                alert('Không thể đánh dấu đã đọc. Vui lòng thử lại.');
            }
        } catch (err) {
            alert('Lỗi kết nối.');
        }
    };

    useEffect(() => {
        loadNotifications();
    }, []);

    return (
        <div>
            <div className="control-bar">
                <div className="control-filters">
                    <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Thông báo mới nhận</h3>
                </div>
                <div className="action-buttons">
                    <button className="btn btn-secondary" onClick={loadNotifications}>🔄 Làm mới</button>
                    <button className="btn btn-primary" onClick={markAllAsRead}>✔️ Đánh dấu đã đọc tất cả</button>
                </div>
            </div>

            <div className="table-container" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                        Đang tải thông báo...
                    </div>
                ) : notifications.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                        <div style={{ fontSize: '40px', marginBottom: '15px' }}>🔔</div>
                        <p>Bạn không có thông báo nào.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px 0' }}>
                        {notifications.map((n, i) => {
                            const dateStr = n.created_at ? new Date(n.created_at).toLocaleString('vi-VN') : '';
                            return (
                                <div key={i} className={`notification-item ${n.is_read ? '' : 'unread'}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div className="notification-content" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                        <span className="notification-message" style={{ color: 'var(--text-color)', fontSize: '14px' }}>{n.message}</span>
                                        <span className="notification-time" style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{dateStr}</span>
                                    </div>
                                    {!n.is_read && <div className="notification-status-dot" title="Chưa đọc" style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></div>}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
