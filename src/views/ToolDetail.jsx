import React from 'react';

export default function ToolDetail() {
    const features = [
        {
            icon: '🔑',
            title: 'Tự động hóa Apple ID & 2FA',
            desc: 'Đăng nhập bảo mật qua API iTunes, tự động phát hiện màn hình 2FA trong iframe và hiển thị thông báo nhập mã cho người dùng.'
        },
        {
            icon: '📱',
            title: 'Hạ cấp ứng dụng iOS & Tải IPA',
            desc: 'Xem lịch sử phiên bản của bất kỳ ứng dụng nào trên App Store và tải xuống file .ipa phiên bản cũ trực tiếp về máy tính.'
        },
        {
            icon: '✍️',
            title: 'Tự động ký bản quyền (SINF)',
            desc: 'Trích xuất chữ ký bản quyền chính chủ .sinf từ tài khoản Apple ID của bạn và tự động nhúng vào IPA để chạy không bị crash DRM.'
        },
        {
            icon: '🌐',
            title: 'Quản lý Tor Proxy & IP Rotation',
            desc: 'Tích hợp điều khiển tiến trình Tor Client để tạo luồng SOCKS5 proxy và thay đổi IP tự động định kỳ cho các tiến trình automation.'
        },
        {
            icon: '⚙️',
            title: 'Định tuyến LAN & DHCP Server',
            desc: 'Cấu hình mạng LAN cục bộ, DHCP Server cấp IP động cho thiết bị và cấu hình Sing-Box TUN bypass tránh loop DNS.'
        },
        {
            icon: '🕵️',
            title: 'Trình duyệt ẩn danh chống phát hiện',
            desc: 'Tích hợp sẵn các profile Chrome sạch được điều khiển bằng CDP, giả lập thiết bị, múi giờ, vân tay trình duyệt nhằm chống quét.'
        }
    ];

    return (
        <div style={{ color: 'var(--text-color)', animation: 'fadeIn 0.3s ease' }}>
            {/* Scoped CSS animation */}
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .hero-section {
                    background: linear-gradient(135deg, rgba(217, 70, 239, 0.08), rgba(0, 242, 254, 0.08));
                    border: 1px solid var(--border-color);
                    border-radius: 20px;
                    padding: 40px;
                    text-align: center;
                    margin-bottom: 28px;
                    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.2);
                    backdrop-filter: blur(8px);
                }
                .hero-title {
                    font-size: 28px;
                    font-weight: 800;
                    background: linear-gradient(135deg, var(--text-color), var(--accent));
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                    margin-bottom: 12px;
                }
                .hero-subtitle {
                    color: var(--text-muted);
                    font-size: 15px;
                    max-width: 600px;
                    margin: 0 auto 24px auto;
                    line-height: 1.6;
                }
                .download-btn {
                    background: linear-gradient(135deg, var(--primary), var(--accent));
                    color: white;
                    border: none;
                    border-radius: 12px;
                    padding: 14px 30px;
                    font-size: 15px;
                    font-weight: 700;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 10px;
                    text-decoration: none;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 4px 15px rgba(0, 242, 254, 0.2);
                }
                .download-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(217, 70, 239, 0.3);
                    filter: brightness(1.1);
                }
                .feature-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                    gap: 20px;
                    margin-bottom: 30px;
                }
                .feature-card {
                    background: var(--panel-bg);
                    border: 1px solid var(--border-color);
                    border-radius: 16px;
                    padding: 24px;
                    transition: all 0.2s ease;
                }
                .feature-card:hover {
                    border-color: rgba(0, 242, 254, 0.25);
                    transform: translateY(-3px);
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                }
                .feature-icon {
                    font-size: 24px;
                    margin-bottom: 12px;
                    display: inline-block;
                }
                .feature-title {
                    font-size: 16px;
                    font-weight: 700;
                    margin-bottom: 8px;
                }
                .feature-desc {
                    color: var(--text-muted);
                    font-size: 13px;
                    line-height: 1.6;
                }
                .meta-section {
                    background: rgba(255,255,255,0.01);
                    border: 1px solid var(--border-color);
                    border-radius: 16px;
                    padding: 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    flex-wrap: wrap;
                    gap: 20px;
                }
                .meta-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 13px;
                    color: var(--text-muted);
                }
            `}</style>

            {/* Hero Section */}
            <div className="hero-section">
                <div className="hero-title">🚀 MunAutomation Desktop</div>
                <div className="hero-subtitle">
                    Hệ thống tự động hóa iOS và cấu hình định tuyến chuyên nghiệp cho PC. 
                    Hỗ trợ quản lý thiết bị cục bộ, xoay IP Tor Proxy, tích hợp trình duyệt ẩn danh 
                    và hạ cấp ứng dụng iOS qua API Apple chính thống.
                </div>
                <a href="https://c69.us/static/QHTDautomation.exe" className="download-btn">
                    💾 Tải Về Cho Windows (v1.0.7)
                </a>
            </div>

            {/* Features list */}
            <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ⭐ Tính Năng Nổi Bật
            </div>
            <div className="feature-grid">
                {features.map((f, i) => (
                    <div className="feature-card" key={i}>
                        <span className="feature-icon">{f.icon}</span>
                        <div className="feature-title">{f.title}</div>
                        <div className="feature-desc">{f.desc}</div>
                    </div>
                ))}
            </div>

            {/* System Info Banner */}
            <div className="meta-section">
                <div className="meta-item">
                    <span>💻</span>
                    <span><strong>Hệ điều hành:</strong> Windows 10/11 (64-bit)</span>
                </div>
                <div className="meta-item">
                    <span>📦</span>
                    <span><strong>Yêu cầu:</strong> Python 3.9+ hoặc Chạy trực tiếp qua file .exe</span>
                </div>
                <div className="meta-item">
                    <span>🛠️</span>
                    <span><strong>Phiên bản hiện tại:</strong> v1.0.7</span>
                </div>
            </div>
        </div>
    );
}
