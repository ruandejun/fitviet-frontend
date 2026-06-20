import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../api';

// US addresses dataset
const US_ADDRESSES = [
    { address: "1600 Pennsylvania Ave NW", city: "Washington", state: "DC", zip: "20500" },
    { address: "350 Fifth Avenue", city: "New York", state: "NY", zip: "10118" },
    { address: "233 S Wacker Dr", city: "Chicago", state: "IL", zip: "60606" },
    { address: "600 Navarro St", city: "San Antonio", state: "TX", zip: "78205" },
    { address: "1 Infinite Loop", city: "Cupertino", state: "CA", zip: "95014" },
    { address: "1601 Willow Rd", city: "Menlo Park", state: "CA", zip: "94025" },
    { address: "4059 Mt Lee Dr", city: "Los Angeles", state: "CA", zip: "90068" },
    { address: "2101 Constitution Ave NW", city: "Washington", state: "DC", zip: "20418" },
    { address: "1000 5th Ave", city: "New York", state: "NY", zip: "10028" },
    { address: "8039 Beach Blvd", city: "Buena Park", state: "CA", zip: "90620" },
    { address: "700 Clark Ave", city: "St. Louis", state: "MO", zip: "63102" },
    { address: "3799 Las Vegas Blvd S", city: "Las Vegas", state: "NV", zip: "89109" },
    { address: "1 MetroTech Center", city: "Brooklyn", state: "NY", zip: "11201" },
    { address: "2300 Traverwood Dr", city: "Ann Arbor", state: "MI", zip: "48105" },
    { address: "1 Rocket Rd", city: "Hawthorne", state: "CA", zip: "90250" },
    { address: "410 Terry Ave N", city: "Seattle", state: "WA", zip: "98109" },
    { address: "1355 Market St", city: "San Francisco", state: "CA", zip: "94103" },
    { address: "1 Hacker Way", city: "Menlo Park", state: "CA", zip: "94025" },
    { address: "1 Microsoft Way", city: "Redmond", state: "WA", zip: "98052" },
    { address: "1600 Amphitheatre Pkwy", city: "Mountain View", state: "CA", zip: "94043" },
    { address: "2850 W Horizon Ridge Pkwy", city: "Henderson", state: "NV", zip: "89052" },
    { address: "8701 W Sunrise Blvd", city: "Plantation", state: "FL", zip: "33322" },
    { address: "5100 Paint Branch Pkwy", city: "College Park", state: "MD", zip: "20740" },
    { address: "3301 Lyon St", city: "San Francisco", state: "CA", zip: "94123" },
    { address: "9250 W Flagler St", city: "Miami", state: "FL", zip: "33174" },
    { address: "4700 Millenia Blvd", city: "Orlando", state: "FL", zip: "32839" },
    { address: "820 1st St NE", city: "Washington", state: "DC", zip: "20002" },
    { address: "2001 Ross Ave", city: "Dallas", state: "TX", zip: "75201" },
    { address: "1901 Main St", city: "Houston", state: "TX", zip: "77002" },
    { address: "200 E Randolph St", city: "Chicago", state: "IL", zip: "60601" },
    { address: "3500 Deer Creek Rd", city: "Palo Alto", state: "CA", zip: "94304" },
    { address: "400 Broad St", city: "Seattle", state: "WA", zip: "98109" },
    { address: "1 World Way", city: "Los Angeles", state: "CA", zip: "90045" },
    { address: "100 Universal City Plaza", city: "Universal City", state: "CA", zip: "91608" },
    { address: "7201 Wood Hollow Dr", city: "Austin", state: "TX", zip: "78731" },
    { address: "5505 Blue Lagoon Dr", city: "Miami", state: "FL", zip: "33126" },
    { address: "1201 S Figueroa St", city: "Los Angeles", state: "CA", zip: "90015" },
    { address: "2700 E Camelback Rd", city: "Phoenix", state: "AZ", zip: "85016" },
    { address: "3900 N Capital of Texas Hwy", city: "Austin", state: "TX", zip: "78746" },
    { address: "1 Busch Gardens Blvd", city: "Tampa", state: "FL", zip: "33612" },
    { address: "4200 Conestoga Dr", city: "Springfield", state: "MO", zip: "65807" },
    { address: "1515 Broadway", city: "New York", state: "NY", zip: "10036" },
    { address: "2200 Mission College Blvd", city: "Santa Clara", state: "CA", zip: "95054" },
    { address: "8200 NW 41st St", city: "Doral", state: "FL", zip: "33166" },
    { address: "1750 Tysons Blvd", city: "McLean", state: "VA", zip: "22102" },
    { address: "3800 N Lamar Blvd", city: "Austin", state: "TX", zip: "78756" },
    { address: "300 Renaissance Center", city: "Detroit", state: "MI", zip: "48243" },
    { address: "799 9th St NW", city: "Washington", state: "DC", zip: "20001" },
    { address: "181 Mercer St", city: "New York", state: "NY", zip: "10012" },
    { address: "501 Boylston St", city: "Boston", state: "MA", zip: "02116" },
    { address: "4600 Silver Hill Rd", city: "Suitland", state: "MD", zip: "20746" },
    { address: "1000 Chopper Circle", city: "Denver", state: "CO", zip: "80204" },
    { address: "1500 Sugar Bowl Dr", city: "New Orleans", state: "LA", zip: "70112" },
    { address: "3251 Riverport Ln", city: "Maryland Heights", state: "MO", zip: "63043" },
    { address: "2401 E St NW", city: "Washington", state: "DC", zip: "20037" },
    { address: "1855 Griffin Rd", city: "Dania Beach", state: "FL", zip: "33004" },
    { address: "8505 Freeport Pkwy", city: "Irving", state: "TX", zip: "75063" },
    { address: "600 Congress Ave", city: "Austin", state: "TX", zip: "78701" },
    { address: "3100 Cumberland Blvd", city: "Atlanta", state: "GA", zip: "30339" },
    { address: "1200 NW Naito Pkwy", city: "Portland", state: "OR", zip: "97209" }
];

const US_FIRST_NAMES = [
    "James", "Robert", "John", "Michael", "David", "William", "Richard", "Joseph", "Thomas", "Charles",
    "Mary", "Patricia", "Jennifer", "Linda", "Barbara", "Elizabeth", "Susan", "Jessica", "Sarah", "Karen",
    "Daniel", "Matthew", "Anthony", "Mark", "Donald", "Steven", "Andrew", "Joshua", "Kenneth", "Kevin",
    "Nancy", "Betty", "Margaret", "Sandra", "Ashley", "Dorothy", "Kimberly", "Emily", "Donna", "Michelle",
    "Brian", "George", "Timothy", "Ronald", "Jason", "Jeffrey", "Ryan", "Jacob", "Gary", "Nicholas",
    "Amanda", "Stephanie", "Melissa", "Rebecca", "Sharon", "Laura", "Cynthia", "Kathleen", "Amy", "Angela"
];

const US_LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez",
    "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
    "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
    "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores",
    "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts"
];

const US_AREA_CODES = [
    "201","202","203","205","206","207","208","209","210","212","213","214","215","216","217","218",
    "219","224","225","228","229","231","234","239","240","248","251","252","253","254","256","260",
    "262","267","269","270","272","276","281","301","302","303","304","305","307","308","309","310",
    "312","313","314","315","316","317","318","319","320","321","323","325","330","331","334","336",
    "337","339","346","347","351","352","360","361","364","380","385","386","401","402","404","405",
    "406","407","408","409","410","412","413","414","415","417","419","423","424","425","430","432",
    "434","435","440","442","443","458","463","469","470","475","478","479","480","484","501","502",
    "503","504","505","507","508","509","510","512","513","515","516","517","518","520","530","531",
    "534","539","540","541","551","559","561","562","563","564","567","570","571","573","574","575",
    "580","585","586","601","602","603","605","606","607","608","609","610","612","614","615","616",
    "617","618","619","620","623","626","628","629","630","631","636","641","646","650","651","657",
    "660","661","662","667","669","678","680","681","682","701","702","703","704","706","707","708",
    "712","713","714","715","716","717","718","719","720","724","725","727","731","732","734","737",
    "740","743","747","754","757","760","762","763","765","769","770","772","773","774","775","779",
    "781","785","786","801","802","803","804","805","806","808","810","812","813","814","815","816",
    "817","818","828","830","831","832","838","843","845","847","848","850","854","856","857","858",
    "859","860","862","863","864","870","878","901","903","904","906","907","908","909","910","912",
    "913","914","915","916","917","918","919","920","925","928","929","930","931","934","936","937",
    "938","940","941","947","949","951","952","954","956","959","970","971","972","973","975","978","979","980","984","985"
];

const US_STATE_NAMES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas", "CA": "California",
    "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware", "FL": "Florida", "GA": "Georgia",
    "HI": "Hawaii", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa",
    "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine", "MD": "Maryland",
    "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota", "MS": "Mississippi", "MO": "Missouri",
    "MT": "Montana", "NE": "Nebraska", "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey",
    "NM": "New Mexico", "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio",
    "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island", "SC": "South Carolina",
    "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas", "UT": "Utah", "VT": "Vermont",
    "VA": "Virginia", "WA": "Washington", "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming",
    "DC": "District of Columbia"
};

function randItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateUSPhone() {
    const areaCode = randItem(US_AREA_CODES);
    const mid = String(Math.floor(Math.random() * 900) + 100);
    const end = String(Math.floor(Math.random() * 9000) + 1000);
    return `(${areaCode}) ${mid}-${end}`;
}

function base32ToBytes(base32) {
    const base32chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    base32 = base32.replace(/\s/g, "").replace(/=/g, "").toUpperCase();
    const len = base32.length;
    const bytes = new Uint8Array(Math.floor((len * 5) / 8));
    
    let val = 0;
    let bits = 0;
    let index = 0;
    
    for (let i = 0; i < len; i++) {
        const idx = base32chars.indexOf(base32[i]);
        if (idx === -1) continue;
        
        val = (val << 5) | idx;
        bits += 5;
        
        if (bits >= 8) {
            bytes[index++] = (val >>> (bits - 8)) & 255;
            bits -= 8;
        }
    }
    return bytes;
}

async function calculateTotp(secret) {
    try {
        const cleanSecret = secret.replace(/\s/g, "").replace(/=/g, "").toUpperCase();
        if (!cleanSecret) return null;
        
        const keyBytes = base32ToBytes(cleanSecret);
        if (keyBytes.length === 0) return null;
        
        const epoch = Math.floor(Date.now() / 1000 / 30);
        
        const counterBytes = new Uint8Array(8);
        let temp = epoch;
        for (let i = 7; i >= 0; i--) {
            counterBytes[i] = temp & 0xff;
            temp = Math.floor(temp / 256);
        }
        
        const cryptoKey = await window.crypto.subtle.importKey(
            "raw",
            keyBytes,
            { name: "HMAC", hash: { name: "SHA-1" } },
            false,
            ["sign"]
        );
        
        const signature = await window.crypto.subtle.sign(
            "HMAC",
            cryptoKey,
            counterBytes
        );
        
        const hmac = new Uint8Array(signature);
        const offset = hmac[hmac.length - 1] & 0xf;
        const code = ((hmac[offset] & 0x7f) << 24) |
                     ((hmac[offset + 1] & 0xff) << 16) |
                     ((hmac[offset + 2] & 0xff) << 8) |
                     (hmac[offset + 3] & 0xff);
        
        const otp = code % 1000000;
        return otp.toString().padStart(6, '0');
    } catch (err) {
        console.error(err);
        return null;
    }
}

export default function QuickNotes({ noteId, currentUser, onLogout }) {
    const [content, setContent] = useState('');
    const [hasPasswordState, setHasPasswordState] = useState(false);
    const [passwordRequired, setPasswordRequired] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const [statusState, setStatusState] = useState('saved'); // typing, saving, saved, offline
    const [statusMessage, setStatusMessage] = useState('Ghi chú sẵn sàng');
    const [isSaving, setIsSaving] = useState(false);

    // Metrics
    const [metrics, setMetrics] = useState({ chars: 0, words: 0, lines: 0 });

    // Preferences
    const [theme, setTheme] = useState(() => localStorage.getItem('ghi_theme') || 'dark');
    const [font, setFont] = useState(() => localStorage.getItem('ghi_font') || 'sans');

    // Toast
    const [toastMessage, setToastMessage] = useState('');
    const [showToast, setShowToast] = useState(false);

    // Modals
    const [showUserInfoModal, setShowUserInfoModal] = useState(false);
    const [showLockModal, setShowLockModal] = useState(false);
    const [lockPasswordInput, setLockPasswordInput] = useState('');
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [showTwoFaModal, setShowTwoFaModal] = useState(false);
    const [showEmailGetModal, setShowEmailGetModal] = useState(false);
    const [showQuickLoginModal, setShowQuickLoginModal] = useState(false);

    // Address Modal states
    const [addressData, setAddressData] = useState({ name: '—', address: '—', city: '—', state: '—', zip: '—', phone: '—' });
    const [copiedField, setCopiedField] = useState(null);

    // 2FA Modal states
    const [twoFaSecret, setTwoFaSecret] = useState(() => localStorage.getItem('last_2fa_secret') || '');
    const [twoFaCode, setTwoFaCode] = useState('');
    const [twoFaSeconds, setTwoFaSeconds] = useState(30);
    const twoFaIntervalRef = useRef(null);

    // Email Getter Modal states
    const [infoSourceType, setInfoSourceType] = useState('uncreated'); // uncreated, created, address
    const [emailSelectType, setEmailSelectType] = useState('Apple');
    const [emailGetId, setEmailGetId] = useState('');
    const [emailGetAddress, setEmailGetAddress] = useState('');
    const [emailGetPassword, setEmailGetPassword] = useState('');
    const [emailGetAccPassword, setEmailGetAccPassword] = useState('');
    const [emailGetAcc2Fa, setEmailGetAcc2Fa] = useState('');
    const [emailGetAcc2FaOtpDisplay, setEmailGetAcc2FaOtpDisplay] = useState('');
    const [emailGetOtpDisplay, setEmailGetOtpDisplay] = useState('');
    const [emailGetMailContent, setEmailGetMailContent] = useState('Không có dữ liệu thư.');
    const [emailGetLoader, setEmailGetLoader] = useState(false);

    // Email Getter -> Created Acc Section states
    const [createdAccId, setCreatedAccId] = useState('');
    const [createdAccUsername, setCreatedAccUsername] = useState('');
    const [createdAccEmail, setCreatedAccEmail] = useState('');
    const [createdAccPassword, setCreatedAccPassword] = useState('');
    const [createdAcc2Fa, setCreatedAcc2Fa] = useState('');
    const [createdAccOtpDisplayBadge, setCreatedAccOtpDisplayBadge] = useState('');
    const [createdAccOtpDisplay, setCreatedAccOtpDisplay] = useState('');
    const [createdAccMailContent, setCreatedAccMailContent] = useState('Không có dữ liệu thư.');
    const [createdAccMailLoader, setCreatedAccMailLoader] = useState(false);
    const [createdAccEmailId, setCreatedAccEmailId] = useState('');
    const [showCreatedAccInbox, setShowCreatedAccInbox] = useState(false);

    // Email Getter -> Tab Address states
    const [tabAddressData, setTabAddressData] = useState({ name: '—', address: '—', city: '—', state: '—', zip: '—', phone: '—' });

    // Status On Close Selection
    const [modalStatusSelect, setModalStatusSelect] = useState('');
    const [statusSelectDisabled, setStatusSelectDisabled] = useState(false);

    // Quick Auth Screen (inside Login modal)
    const [authTab, setAuthTab] = useState('login'); // login, register
    const [loginUsername, setLoginUsername] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [btnSubmitLoginDisabled, setBtnSubmitLoginDisabled] = useState(false);

    const [registerUsername, setRegisterUsername] = useState('');
    const [registerEmail, setRegisterEmail] = useState('');
    const [registerPassword, setRegisterPassword] = useState('');
    const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
    const [registerError, setRegisterError] = useState('');
    const [btnSubmitRegisterDisabled, setBtnSubmitRegisterDisabled] = useState(false);

    const lastServerContentRef = useRef('');
    const lastTypedTimeRef = useRef(0);
    const textareaRef = useRef(null);

    // Trigger toast
    const triggerToast = (msg) => {
        setToastMessage(msg);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2500);
    };

    // Calculate metrics
    const calculateMetrics = (txt) => {
        const chars = txt.length;
        const words = txt.trim() ? txt.trim().split(/\s+/).length : 0;
        const lines = txt ? txt.split('\n').length : 0;
        setMetrics({ chars, words, lines });
    };

    // Load initial note info
    const fetchNote = async () => {
        try {
            const resp = await apiRequest(`/ghi/api/get/${noteId}/`);
            if (resp.status === 403) {
                const data = await resp.json();
                if (data.password_required) {
                    setPasswordRequired(true);
                    setHasPasswordState(true);
                    return;
                }
            }

            if (resp.ok) {
                const data = await resp.json();
                setContent(data.content || '');
                lastServerContentRef.current = data.content || '';
                setHasPasswordState(data.has_password);
                calculateMetrics(data.content || '');
                setPasswordRequired(false);

                // Local backup recovery check
                const backup = localStorage.getItem(`ghi_backup_${noteId}`);
                if (backup && backup !== (data.content || '')) {
                    if (window.confirm('Phát hiện có nội dung ghi chú chưa được lưu từ phiên trước của bạn. Khôi phục lại?')) {
                        setContent(backup);
                        calculateMetrics(backup);
                        setTimeout(() => handleSave(backup), 100);
                    } else {
                        localStorage.removeItem(`ghi_backup_${noteId}`);
                    }
                }
                setStatusState('saved');
                setStatusMessage('Ghi chú sẵn sàng');
            } else {
                setStatusState('offline');
                setStatusMessage('Lỗi tải dữ liệu ghi chú');
            }
        } catch (err) {
            console.error(err);
            setStatusState('offline');
            setStatusMessage('Mất kết nối máy chủ');
        }
    };

    useEffect(() => {
        fetchNote();
    }, [noteId]);

    // Handle verification
    const handleVerifyPassword = async (e) => {
        e?.preventDefault();
        if (!passwordInput) return;
        setPasswordError('');
        try {
            const resp = await apiRequest(`/ghi/api/verify-password/${noteId}/`, {
                method: 'POST',
                body: JSON.stringify({ password: passwordInput })
            });
            if (resp.ok) {
                setPasswordRequired(false);
                setPasswordInput('');
                fetchNote();
            } else {
                const err = await resp.json();
                setPasswordError(err.message || 'Mật khẩu không chính xác');
                setPasswordInput('');
            }
        } catch (err) {
            setPasswordError('Lỗi kết nối máy chủ');
        }
    };

    // Local backup logic
    const saveToLocalBackup = (val) => {
        localStorage.setItem(`ghi_backup_${noteId}`, val);
        setStatusState('offline');
        setStatusMessage('Đã lưu trữ ngoại tuyến (Lỗi mạng)');
    };

    // Save note function
    const handleSave = async (currentVal = content) => {
        if (isSaving) return;
        setIsSaving(true);
        setStatusState('saving');
        setStatusMessage('Đang lưu...');

        try {
            const resp = await apiRequest(`/ghi/api/save/${noteId}/`, {
                method: 'POST',
                body: JSON.stringify({ content: currentVal })
            });

            if (resp.ok) {
                const res = await resp.json();
                lastServerContentRef.current = currentVal;
                localStorage.removeItem(`ghi_backup_${noteId}`);
                const timeStr = res.updated_at.split(' ')[1] || '';
                setStatusState('saved');
                setStatusMessage(`Đã lưu ghi chú (${timeStr})`);
                triggerToast('Đã lưu ghi chú thành công! 💾');
            } else {
                saveToLocalBackup(currentVal);
            }
        } catch (err) {
            saveToLocalBackup(currentVal);
        } finally {
            setIsSaving(false);
        }
    };

    // Polling Collaboration
    useEffect(() => {
        const interval = setInterval(async () => {
            if (passwordRequired) return;
            // Idle time check (> 2s since last type)
            if (Date.now() - lastTypedTimeRef.current < 2000) return;
            // Content must match server content
            if (content !== lastServerContentRef.current) return;

            try {
                const resp = await apiRequest(`/ghi/api/get/${noteId}/`);
                if (resp.ok) {
                    const data = await resp.json();
                    if (data.success && data.content !== content) {
                        const selStart = textareaRef.current?.selectionStart;
                        const selEnd = textareaRef.current?.selectionEnd;
                        const hasFocus = document.activeElement === textareaRef.current;

                        setContent(data.content);
                        lastServerContentRef.current = data.content;
                        calculateMetrics(data.content);

                        if (hasFocus && textareaRef.current) {
                            setTimeout(() => {
                                textareaRef.current.setSelectionRange(selStart, selEnd);
                            }, 0);
                        }
                        const timeStr = data.updated_at.split(' ')[1] || '';
                        setStatusState('saved');
                        setStatusMessage(`Đồng bộ trực tiếp lúc ${timeStr}`);
                    }
                    if (data.has_password !== hasPasswordState) {
                        setHasPasswordState(data.has_password);
                    }
                }
            } catch (err) {
                console.warn('Lỗi kết nối đồng bộ trực tiếp:', err);
            }
        }, 2500);

        return () => clearInterval(interval);
    }, [content, noteId, passwordRequired, hasPasswordState]);

    // Input listeners & Ctrl+S key shortcut
    const handleTextareaChange = (e) => {
        const val = e.target.value;
        setContent(val);
        calculateMetrics(val);
        lastTypedTimeRef.current = Date.now();
        setStatusState('typing');
        setStatusMessage('Có thay đổi chưa lưu...');
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave(content);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [content]);

    // Fonts & Theme toggler
    const toggleTheme = () => {
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
        localStorage.setItem('ghi_theme', nextTheme);
        triggerToast(`Đã chuyển sang giao diện ${nextTheme === 'dark' ? 'Tối' : 'Sáng'}`);
    };

    const toggleFont = () => {
        const nextFont = font === 'sans' ? 'mono' : 'sans';
        setFont(nextFont);
        localStorage.setItem('ghi_font', nextFont);
        triggerToast(`Đã chuyển sang kiểu chữ ${nextFont === 'sans' ? 'Sans-serif' : 'Monospace'}`);
    };

    // Download note
    const downloadNote = () => {
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `ghi-note-${noteId}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        triggerToast('Tải xuống file note thành công!');
    };

    // Share link
    const copyShareLink = () => {
        const link = window.location.href;
        navigator.clipboard.writeText(link).then(() => {
            triggerToast('Đã sao chép liên kết chia sẻ!');
        }).catch(() => {
            alert('Không thể sao chép. Vui lòng tự copy link trình duyệt.');
        });
    };

    // US Address generation logic
    const handleGenerateAddress = () => {
        const addr = randItem(US_ADDRESSES);
        const fullName = `${randItem(US_FIRST_NAMES)} ${randItem(US_LAST_NAMES)}`;
        const phone = generateUSPhone();
        setAddressData({
            name: fullName,
            address: addr.address,
            city: addr.city,
            state: US_STATE_NAMES[addr.state] || addr.state,
            zip: addr.zip,
            phone: phone
        });
        setCopiedField(null);
        triggerToast('🇺🇸 Đã tạo địa chỉ mới!');
    };

    const handleCopyAddressField = (field, text) => {
        if (text === '—') return;
        navigator.clipboard.writeText(text).then(() => {
            setCopiedField(field);
            triggerToast(`Đã copy: ${text}`);
            setTimeout(() => setCopiedField(null), 2000);
        });
    };

    const handleCopyAllAddress = () => {
        if (addressData.name === '—') {
            triggerToast('Vui lòng tạo địa chỉ trước!');
            return;
        }
        const fullText = `${addressData.name}\n${addressData.address}\n${addressData.city}, ${addressData.state} ${addressData.zip}\nPhone: ${addressData.phone}`;
        navigator.clipboard.writeText(fullText).then(() => {
            triggerToast('📑 Đã copy toàn bộ địa chỉ!');
        });
    };

    // 2FA Key Generator
    const handleGenerateTwoFa = async () => {
        if (!twoFaSecret.trim()) {
            triggerToast('Vui lòng nhập mã bảo mật 2FA');
            return;
        }
        localStorage.setItem('last_2fa_secret', twoFaSecret.trim());
        if (twoFaIntervalRef.current) clearInterval(twoFaIntervalRef.current);

        const updateOtp = async () => {
            const code = await calculateTotp(twoFaSecret.trim());
            if (code) {
                setTwoFaCode(code);
                const remaining = 30 - (Math.floor(Date.now() / 1000) % 30);
                setTwoFaSeconds(remaining);
            } else {
                triggerToast('Mã 2FA không hợp lệ. Vui lòng kiểm tra lại.');
                if (twoFaIntervalRef.current) {
                    clearInterval(twoFaIntervalRef.current);
                    twoFaIntervalRef.current = null;
                }
                setTwoFaCode('');
            }
        };

        await updateOtp();
        twoFaIntervalRef.current = setInterval(updateOtp, 1000);
    };

    const handleCopyTwoFaCode = () => {
        if (!twoFaCode) return;
        navigator.clipboard.writeText(twoFaCode).then(() => {
            triggerToast('Đã sao chép mã 2FA: ' + twoFaCode);
        });
    };

    // Password Locks
    const handleSaveNotePassword = async () => {
        if (!lockPasswordInput) {
            alert('Vui lòng nhập mật khẩu hợp lệ');
            return;
        }
        try {
            const resp = await apiRequest(`/ghi/api/save/${noteId}/`, {
                method: 'POST',
                body: JSON.stringify({ set_password: lockPasswordInput })
            });
            if (resp.ok) {
                setHasPasswordState(true);
                triggerToast('Đã thiết lập mật khẩu thành công!');
                setShowLockModal(false);
            } else {
                alert('Lỗi cấu hình mật khẩu.');
            }
        } catch (err) {
            alert('Lỗi kết nối máy chủ.');
        }
    };

    const handleRemoveNotePassword = async () => {
        if (!window.confirm('Bạn có chắc chắn muốn gỡ bỏ mật khẩu bảo vệ? Ai cũng có thể vào xem ghi chú này.')) return;
        try {
            const resp = await apiRequest(`/ghi/api/save/${noteId}/`, {
                method: 'POST',
                body: JSON.stringify({ set_password: '' })
            });
            if (resp.ok) {
                setHasPasswordState(false);
                triggerToast('Đã gỡ bỏ mật khẩu bảo vệ!');
                setShowLockModal(false);
            } else {
                alert('Lỗi gỡ bỏ mật khẩu.');
            }
        } catch (err) {
            alert('Lỗi kết nối máy chủ.');
        }
    };

    // Mail retrieval logic mapping Graph API/Local IMAP
    const isMicrosoftEmail = (email) => {
        if (!email) return false;
        const emailLower = email.toLowerCase();
        return ['@hotmail.', '@outlook.', '@live.', '@msn.'].some(dom => emailLower.includes(dom));
    };

    const readMailboxClientSide = async (emailId, emailObj = null) => {
        if (!emailObj) {
            const resp = await apiRequest(`/dashboard/api/emails/${emailId}/`);
            if (!resp.ok) {
                throw new Error(`Không thể lấy thông tin email ID: ${emailId}`);
            }
            emailObj = await resp.json();
        }

        const emailAddr = emailObj.email;
        if (!isMicrosoftEmail(emailAddr)) {
            const resp = await apiRequest(`/dashboard/api/emails/${emailId}/read-mailbox/`);
            const data = await resp.json();
            if (!resp.ok || !data.success) {
                throw new Error(data.message || 'Lỗi IMAP khi đọc hộp thư.');
            }
            return data;
        }

        // Fetch Microsoft Graph token
        const tokenResp = await apiRequest(`/dashboard/api/emails/${emailId}/get-access-token/`);
        if (!tokenResp.ok) {
            let errMsg = 'Không thể lấy access token từ backend.';
            try {
                const errData = await tokenResp.json();
                errMsg = errData.message || errMsg;
            } catch (e) {}
            throw new Error(errMsg);
        }
        const tokenData = await tokenResp.json();
        const accessToken = tokenData.access_token;
        const configFlow = tokenData.flow || 'ropc';
        const hasRefreshToken = tokenData.has_refresh_token;

        let msgUrl = "https://graph.microsoft.com/v1.0/me/messages?$top=15";
        if (!hasRefreshToken && configFlow === 'client_credentials') {
            msgUrl = `https://graph.microsoft.com/v1.0/users/${emailAddr}/messages?$top=15`;
        }

        const msgResp = await fetch(msgUrl, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });

        if (!msgResp.ok) {
            const msgErrText = await msgResp.text();
            throw new Error(`Lỗi Graph API: ${msgErrText}`);
        }

        const msgData = await msgResp.json();
        const emailsList = msgData.value || [];
        
        const parsedEmails = emailsList.map(m => {
            const fromDict = m.from || m.sender || {};
            const emailAddrObj = fromDict.emailAddress || {};
            const fromName = emailAddrObj.name || '';
            const fromEmail = emailAddrObj.address || '';
            const fromSender = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

            const subject = m.subject || '(Không có tiêu đề)';
            const receivedTime = m.receivedDateTime || '';
            let dateStr = receivedTime;
            if (receivedTime.includes('T') && receivedTime.includes('Z')) {
                try {
                    const dt = receivedTime.replace('Z', '').split('.')[0];
                    const parts = dt.split('T');
                    dateStr = `${parts[0]} ${parts[1]}`;
                } catch (err) {}
            }

            const bodyDict = m.body || {};
            const bodyContent = bodyDict.content || '';
            let snippet = m.bodyPreview || '';
            if (!snippet && bodyContent) {
                let cleanBody = bodyContent.trim();
                if (cleanBody.toLowerCase().includes('<html') || cleanBody.toLowerCase().includes('<body') || cleanBody.toLowerCase().includes('<div')) {
                    cleanBody = cleanBody.replace(/<[^>]+>/g, '');
                    cleanBody = cleanBody.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
                }
                cleanBody = cleanBody.replace(/\s+/g, ' ').trim();
                snippet = cleanBody.slice(0, 200) + (cleanBody.length > 200 ? '...' : '');
            }

            return {
                from: fromSender,
                subject: subject,
                date: dateStr,
                snippet: snippet,
                body: bodyContent
            };
        });

        // Save results to DB
        const savePayload = {};
        if (parsedEmails.length > 0) {
            savePayload.latest_email = parsedEmails[0];
        }

        const saveResp = await apiRequest(`/dashboard/api/emails/${emailId}/save-mailbox-results/`, {
            method: 'POST',
            body: JSON.stringify(savePayload)
        });

        let updatedEmailData = emailObj;
        if (saveResp.ok) {
            const saveData = await saveResp.json();
            if (saveData.success) {
                updatedEmailData = saveData.email_data;
            }
        }

        return {
            success: true,
            emails: parsedEmails,
            email_data: updatedEmailData
        };
    };

    // Info Getter API actions
    const handleInfoSourceChange = (type) => {
        setInfoSourceType(type);
        setModalStatusSelect('');
        // If switching to address, trigger generate
        if (type === 'address' && tabAddressData.name === '—') {
            handleGenerateTabAddress();
        }
    };

    const handleGetInfo = async () => {
        if (infoSourceType === 'uncreated') {
            await fetchUnusedEmail();
        } else {
            await fetchActiveCreatedAccount();
        }
    };

    // Get active created account
    const fetchActiveCreatedAccount = async () => {
        setEmailGetLoader(true);
        try {
            const resp = await apiRequest(`/dashboard/api/accounts/get-active-account/?type=${emailSelectType}`);
            if (resp.status === 401 || resp.status === 403) {
                triggerToast('Vui lòng đăng nhập Dashboard trước!');
                return;
            }
            const data = await resp.json();
            if (resp.ok && data.success) {
                const accData = data.account_data;
                setCreatedAccId(accData.id);

                let emailVal = '';
                let usernameVal = '';
                const candidates = [accData.email, accData.username].filter(Boolean);
                candidates.forEach(c => {
                    if (c.includes('@')) emailVal = c;
                    else usernameVal = c;
                });

                setCreatedAccUsername(usernameVal);
                setCreatedAccEmail(emailVal);
                setCreatedAccPassword(accData.password || '');
                setCreatedAcc2Fa(accData.two_factor_auth || '');
                setCreatedAccOtpDisplayBadge('');

                if (accData.email_id) {
                    setCreatedAccEmailId(accData.email_id);
                    setShowCreatedAccInbox(true);
                    setCreatedAccMailContent('Đang tải thư...');
                    setTimeout(() => reloadCreatedAccMailbox(accData.email_id), 100);
                } else {
                    setCreatedAccEmailId('');
                    setShowCreatedAccInbox(false);
                    setCreatedAccMailContent('Không có email_id gắn với tài khoản.');
                }
            } else {
                triggerToast(data.message || 'Không tìm thấy tài khoản hoạt động nào.');
            }
        } catch (err) {
            triggerToast('Lỗi kết nối máy chủ.');
        } finally {
            setEmailGetLoader(false);
        }
    };

    const reloadCreatedAccMailbox = async (id = createdAccEmailId) => {
        if (!id) return;
        setCreatedAccMailLoader(true);
        try {
            const data = await readMailboxClientSide(id);
            if (data.success) {
                renderMailboxSection(data.emails, 'created');
            } else {
                triggerToast(data.message || 'Không thể đọc hộp thư.');
            }
        } catch (err) {
            triggerToast(err.message || 'Lỗi kết nối imap.');
        } finally {
            setCreatedAccMailLoader(false);
        }
    };

    const fetchCreatedAccOtp = async () => {
        if (!createdAccId) return;
        setCreatedAccOtpDisplayBadge('');
        try {
            const resp = await apiRequest(`/dashboard/api/accounts/${createdAccId}/get-2fa/`);
            if (resp.status === 401 || resp.status === 403) {
                triggerToast('Vui lòng đăng nhập Dashboard trước!');
                return;
            }
            const data = await resp.json();
            if (resp.ok && data.success && data.token) {
                setCreatedAccOtpDisplayBadge(`Mã OTP: ${data.token} (Nhấp để copy)`);
                navigator.clipboard.writeText(data.token).then(() => {
                    triggerToast(`✅ OTP: ${data.token}`);
                });
            } else {
                triggerToast(data.message || 'Không thể lấy mã OTP.');
            }
        } catch (err) {
            triggerToast('Lỗi kết nối OTP.');
        }
    };

    // Get unused email
    const fetchUnusedEmail = async () => {
        setEmailGetLoader(true);
        try {
            const resp = await apiRequest(`/dashboard/api/emails/get-unused-email/?type=${emailSelectType}`);
            if (resp.status === 401 || resp.status === 403) {
                triggerToast('Vui lòng đăng nhập Dashboard trước!');
                return;
            }
            const data = await resp.json();
            if (resp.ok && data.success) {
                const emailData = data.email_data;
                setEmailGetId(emailData.id);
                setEmailGetAddress(emailData.email);
                setEmailGetPassword(emailData.password);
                setEmailGetAccPassword('');
                setEmailGetAcc2Fa('');
                setEmailGetAcc2FaOtpDisplay('');
                setEmailGetOtpDisplay('');

                if (isMicrosoftEmail(emailData.email)) {
                    setEmailGetMailContent('Đang kết nối Outlook...');
                    setTimeout(() => reloadEmailGetMailbox(emailData.id), 100);
                } else {
                    renderMailboxSection(data.emails, 'unused');
                }
            } else {
                triggerToast(data.message || 'Không tìm thấy email khả dụng.');
            }
        } catch (err) {
            triggerToast('Lỗi kết nối máy chủ.');
        } finally {
            setEmailGetLoader(false);
        }
    };

    const reloadEmailGetMailbox = async (id = emailGetId) => {
        if (!id) return;
        setEmailGetLoader(true);
        try {
            const data = await readMailboxClientSide(id);
            if (data.success) {
                renderMailboxSection(data.emails, 'unused');
                triggerToast('Đã tải lại hộp thư thành công!');
            } else {
                triggerToast(data.message || 'Lỗi khi đọc hộp thư.');
            }
        } catch (err) {
            triggerToast(err.message || 'Lỗi kết nối hộp thư.');
        } finally {
            setEmailGetLoader(false);
        }
    };

    const renderMailboxSection = (emails, target) => {
        const isCreated = target === 'created';
        const setMailContent = isCreated ? setCreatedAccMailContent : setEmailGetMailContent;
        const setOtpDisplay = isCreated ? setCreatedAccOtpDisplay : setEmailGetOtpDisplay;

        if (!emails || emails.length === 0) {
            setMailContent('Hộp thư trống hoặc không thể tải thư mới nhất.');
            setOtpDisplay('');
            return;
        }

        const latest = emails[0];
        const dateStr = latest.date || '';
        const fromStr = latest.from || '';
        const subjectStr = latest.subject || '';
        const snippetStr = latest.snippet || '';

        let code = '';
        const combined = `${subjectStr} ${snippetStr}`;
        const matches = combined.match(/\b(\d{4,8})\b/);
        if (matches) {
            code = matches[0];
        }

        if (code) {
            setOtpDisplay(code);
        } else {
            setOtpDisplay('');
        }

        setMailContent(
            <div>
                {code && (
                    <div style={{
                        marginBottom: '10px',
                        padding: '10px',
                        background: 'var(--otp-bg)',
                        border: '1px solid var(--otp-border)',
                        borderRadius: '6px',
                        fontWeight: '700',
                        textAlign: 'center',
                        fontSize: '16px',
                        color: 'var(--otp-text)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}>
                        Mã OTP: {code}
                        <button className="btn" onClick={() => {
                            navigator.clipboard.writeText(code).then(() => triggerToast(`Đã copy OTP: ${code}`));
                        }} style={{
                            padding: '4px 10px',
                            fontSize: '11px',
                            height: 'auto',
                            background: 'var(--otp-text)',
                            color: 'var(--bg-color)',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                        }}>
                            Copy OTP
                        </button>
                    </div>
                )}
                <div><strong>Người gửi:</strong> {fromStr}</div>
                <div><strong>Thời gian:</strong> {dateStr}</div>
                <div><strong>Tiêu đề:</strong> {subjectStr}</div>
                <div style={{
                    marginTop: '8px',
                    paddingTop: '8px',
                    borderTop: '1px dashed rgba(255,255,255,0.05)',
                    color: 'var(--text-color)',
                    fontFamily: 'monospace',
                    fontSize: '11px'
                }}>{snippetStr}</div>
            </div>
        );
    };

    // Save manually created account
    const handleSaveCreatedAccount = async () => {
        if (!emailGetAddress) {
            triggerToast('Chưa có email nào được tải.');
            return;
        }
        if (!emailGetAccPassword) {
            triggerToast('Vui lòng nhập mật khẩu tài khoản.');
            return;
        }
        setEmailGetLoader(true);
        try {
            const resp = await apiRequest('/dashboard/api/accounts/add-manual/', {
                method: 'POST',
                body: JSON.stringify({
                    email: emailGetAddress,
                    password: emailGetAccPassword,
                    type: emailSelectType,
                    two_factor_auth: emailGetAcc2Fa,
                    profile_id: 'auto'
                })
            });
            const data = await resp.json();
            if (resp.ok && data.success) {
                triggerToast('Đã lưu tài khoản vào hệ thống thành công! 🎉');
                setEmailGetAccPassword('');
                setEmailGetAcc2Fa('');
                setEmailGetAcc2FaOtpDisplay('');
            } else {
                triggerToast(data.message || 'Lỗi khi lưu tài khoản.');
            }
        } catch (err) {
            triggerToast('Lỗi kết nối máy chủ.');
        } finally {
            setEmailGetLoader(false);
        }
    };

    const handleGetOtpForUncreatedAcc = async () => {
        if (!emailGetAcc2Fa.trim()) {
            triggerToast('⚠️ Vui lòng nhập hoặc dán Khóa 2FA trước!');
            return;
        }
        const code = await calculateTotp(emailGetAcc2Fa.trim());
        if (!code) {
            triggerToast('❌ Khóa 2FA không hợp lệ!');
            return;
        }
        setEmailGetAcc2FaOtpDisplay(`Mã OTP: ${code} (Nhấp để copy)`);
        navigator.clipboard.writeText(code).then(() => {
            triggerToast(`✅ OTP: ${code}`);
        });
    };

    // Email Getter address tab
    const handleGenerateTabAddress = () => {
        const addr = randItem(US_ADDRESSES);
        const fullName = `${randItem(US_FIRST_NAMES)} ${randItem(US_LAST_NAMES)}`;
        const phone = generateUSPhone();
        setTabAddressData({
            name: fullName,
            address: addr.address,
            city: addr.city,
            state: US_STATE_NAMES[addr.state] || addr.state,
            zip: addr.zip,
            phone: phone
        });
    };

    const handleCopyTabAddressField = (text) => {
        if (text === '—') return;
        navigator.clipboard.writeText(text).then(() => {
            triggerToast(`Đã copy: ${text}`);
        });
    };

    const handleCopyAllTabAddress = () => {
        if (tabAddressData.name === '—') return;
        const fullText = `${tabAddressData.name}\n${tabAddressData.address}\n${tabAddressData.city}, ${tabAddressData.state} ${tabAddressData.zip}\nPhone: ${tabAddressData.phone}`;
        navigator.clipboard.writeText(fullText).then(() => {
            triggerToast('📑 Đã copy toàn bộ địa chỉ!');
        });
    };

    // Update classification status on close
    const handleCloseEmailGetModal = async () => {
        const targetId = createdAccId || emailGetId;
        const targetType = createdAccId ? 'created' : 'email';

        if (targetId) {
            if (!modalStatusSelect) {
                triggerToast('⚠️ Vui lòng chọn trạng thái trước khi đóng bảng!');
                return;
            }
            setStatusSelectDisabled(true);
            try {
                const url = targetType === 'created' ? `/dashboard/api/accounts/${targetId}/` : `/dashboard/api/emails/${targetId}/`;
                const resp = await apiRequest(url, {
                    method: 'PATCH',
                    body: JSON.stringify({ status: parseInt(modalStatusSelect) })
                });
                if (resp.ok) {
                    triggerToast('✅ Đã lưu trạng thái thành công!');
                } else {
                    triggerToast('❌ Lỗi cập nhật trạng thái lên hệ thống!');
                    setStatusSelectDisabled(false);
                    return;
                }
            } catch (err) {
                triggerToast('❌ Lỗi kết nối máy chủ.');
                setStatusSelectDisabled(false);
                return;
            }
        }

        // Reset and close
        setEmailGetId('');
        setCreatedAccId('');
        setModalStatusSelect('');
        setStatusSelectDisabled(false);
        setShowEmailGetModal(false);
    };

    // Quick Auth inside note editor
    const handleQuickLogin = async () => {
        if (!loginUsername || !loginPassword) {
            setLoginError('Vui lòng điền đầy đủ tên đăng nhập và mật khẩu.');
            return;
        }
        setBtnSubmitLoginDisabled(true);
        setLoginError('');
        try {
            const resp = await apiRequest('/dashboard/login/', {
                method: 'POST',
                body: JSON.stringify({ username: loginUsername, password: loginPassword })
            });
            const data = await resp.json();
            if (resp.ok && data.success) {
                triggerToast('Đăng nhập thành công! Đang tải lại...');
                setTimeout(() => window.location.reload(), 1000);
            } else {
                setLoginError(data.message || 'Tài khoản hoặc mật khẩu không chính xác.');
            }
        } catch (err) {
            setLoginError('Lỗi kết nối máy chủ.');
        } finally {
            setBtnSubmitLoginDisabled(false);
        }
    };

    const handleQuickRegister = async () => {
        if (!registerUsername || !registerEmail || !registerPassword || !registerConfirmPassword) {
            setRegisterError('Vui lòng điền đầy đủ thông tin đăng ký.');
            return;
        }
        if (registerPassword !== registerConfirmPassword) {
            setRegisterError('Mật khẩu xác nhận không khớp.');
            return;
        }
        setBtnSubmitRegisterDisabled(true);
        setRegisterError('');
        try {
            const resp = await apiRequest('/dashboard/register/', {
                method: 'POST',
                body: JSON.stringify({
                    username: registerUsername,
                    email: registerEmail,
                    password: registerPassword,
                    confirm_password: registerConfirmPassword
                })
            });
            const data = await resp.json();
            if (resp.ok && data.success) {
                triggerToast('Đăng ký thành công! Đang tự động đăng nhập...');
                setTimeout(() => window.location.reload(), 1000);
            } else {
                setRegisterError(data.message || 'Lỗi khi đăng ký tài khoản.');
            }
        } catch (err) {
            setRegisterError('Lỗi kết nối máy chủ.');
        } finally {
            setBtnSubmitRegisterDisabled(false);
        }
    };

    // Reset password-required intervals on close
    useEffect(() => {
        return () => {
            if (twoFaIntervalRef.current) clearInterval(twoFaIntervalRef.current);
        };
    }, []);

    // Password Protected view
    if (passwordRequired) {
        return (
            <div data-theme={theme} style={{
                backgroundColor: 'var(--bg-color)',
                color: 'var(--text-color)',
                minHeight: '100vh',
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                position: 'relative'
            }}>
                <style>{`
                    :root {
                        --bg-color: #03050c;
                        --panel-bg: rgba(6, 10, 26, 0.6);
                        --border-color: rgba(0, 242, 254, 0.08);
                        --primary-glow: #d946ef;
                        --accent-glow: #00f2fe;
                        --text-color: #f1f5f9;
                        --text-muted: #94a3b8;
                        --error-color: #ff073a;
                    }
                    [data-theme="light"] {
                        --bg-color: #f8fafc;
                        --panel-bg: rgba(255, 255, 255, 0.85);
                        --border-color: rgba(0, 0, 0, 0.06);
                        --primary-glow: #4f46e5;
                        --accent-glow: #0ea5e9;
                        --text-color: #0f172a;
                        --text-muted: #94a3b8;
                    }
                    .glowing-orb {
                        position: absolute;
                        border-radius: 50%;
                        filter: blur(140px);
                        z-index: 1;
                        opacity: 0.35;
                        pointer-events: none;
                    }
                    .orb-primary {
                        width: 400px;
                        height: 400px;
                        background: var(--primary-glow);
                        top: -100px;
                        left: -100px;
                    }
                    .orb-accent {
                        width: 350px;
                        height: 350px;
                        background: var(--accent-glow);
                        bottom: -80px;
                        right: -80px;
                    }
                    .lock-card {
                        width: 100%;
                        max-width: 400px;
                        background: var(--panel-bg);
                        backdrop-filter: blur(20px);
                        -webkit-backdrop-filter: blur(20px);
                        border: 1px solid var(--border-color);
                        border-radius: 20px;
                        padding: 40px;
                        z-index: 10;
                        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
                        text-align: center;
                    }
                    .btn {
                        width: 100%;
                        background: linear-gradient(135deg, #6366f1, #4f46e5);
                        border: none;
                        border-radius: 10px;
                        padding: 14px;
                        color: white;
                        font-size: 15px;
                        font-weight: 600;
                        cursor: pointer;
                        box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
                        transition: all 0.3s ease;
                    }
                    .btn:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
                    }
                    .form-input {
                        width: 100%;
                        background: rgba(8, 12, 22, 0.8);
                        border: 1px solid var(--border-color);
                        border-radius: 10px;
                        padding: 12px 16px;
                        color: var(--text-color);
                        font-size: 15px;
                        outline: none;
                        transition: all 0.3s ease;
                        text-align: center;
                        letter-spacing: 4px;
                    }
                `}</style>
                <div className="glowing-orb orb-primary"></div>
                <div className="glowing-orb orb-accent"></div>

                <div className="lock-card">
                    <span style={{ fontSize: '48px', marginBottom: '20px', display: 'inline-block' }}>🔐</span>
                    <h2 style={{
                        fontSize: '22px',
                        fontWeight: '800',
                        marginBottom: '10px',
                        letterSpacing: '0.5px',
                        background: 'linear-gradient(135deg, #f43f5e, #6366f1)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                    }}>Ghi chú đã bị khóa</h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '30px', lineHeight: '1.5' }}>
                        Ghi chú <strong>{noteId}</strong> đã được thiết lập mật khẩu bảo vệ. Vui lòng nhập mật khẩu để mở khóa và chỉnh sửa.
                    </p>

                    {passwordError && (
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: 'var(--error-color)',
                            padding: '10px',
                            borderRadius: '8px',
                            fontSize: '12px',
                            marginBottom: '20px'
                        }}>{passwordError}</div>
                    )}

                    <form onSubmit={handleVerifyPassword}>
                        <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                            <input
                                type="password"
                                className="form-input"
                                value={passwordInput}
                                onChange={(e) => setPasswordInput(e.target.value)}
                                placeholder="••••••"
                                required
                                autoFocus
                            />
                        </div>
                        <button type="submit" className="btn">Mở khóa ghi chú</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div data-theme={theme} style={{
            height: '100dvh',
            width: '100%',
            overflow: 'hidden',
            backgroundColor: 'var(--bg-color)',
            color: 'var(--text-color)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            fontFamily: "'Outfit', sans-serif"
        }}>
            <style>{`
                :root {
                    --bg-color: #03050c;
                    --container-bg: rgba(6, 10, 26, 0.6);
                    --border-color: rgba(0, 242, 254, 0.08);
                    --text-color: #e2e8f0;
                    --text-muted: #94a3b8;
                    --primary-glow: #d946ef;
                    --accent-glow: #00f2fe;
                    --card-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
                    --editor-bg: transparent;
                    --toolbar-bg: rgba(5, 8, 20, 0.7);
                    --modal-bg: rgba(5, 8, 20, 0.95);
                    --btn-hover: rgba(255, 255, 255, 0.08);
                    --toast-bg: rgba(217, 70, 239, 0.9);
                    --otp-text: #34d399;
                    --otp-bg: rgba(16, 185, 129, 0.15);
                    --otp-border: rgba(16, 185, 129, 0.3);
                }
                [data-theme="light"] {
                    --bg-color: #f8fafc;
                    --container-bg: rgba(255, 255, 255, 0.85);
                    --border-color: rgba(0, 0, 0, 0.06);
                    --text-color: #0f172a;
                    --text-muted: #94a3b8;
                    --primary-glow: #4f46e5;
                    --accent-glow: #0ea5e9;
                    --card-shadow: 0 8px 32px 0 rgba(148, 163, 184, 0.2);
                    --editor-bg: transparent;
                    --toolbar-bg: rgba(255, 255, 255, 0.9);
                    --modal-bg: rgba(255, 255, 255, 0.98);
                    --btn-hover: rgba(0, 0, 0, 0.05);
                    --toast-bg: rgba(79, 70, 229, 0.95);
                    --otp-text: #065f46;
                    --otp-bg: rgba(6, 95, 70, 0.08);
                    --otp-border: rgba(6, 95, 70, 0.2);
                }
                .glowing-orb {
                    position: absolute;
                    border-radius: 50%;
                    filter: blur(130px);
                    opacity: 0.3;
                    pointer-events: none;
                    z-index: 1;
                }
                .orb-1 { width: 500px; height: 500px; background: var(--primary-glow); top: -200px; left: -100px; }
                .orb-2 { width: 400px; height: 400px; background: var(--accent-glow); bottom: -100px; right: -100px; }
                
                .toolbar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 14px 24px;
                    background: var(--toolbar-bg);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border-bottom: 1px solid var(--border-color);
                    z-index: 10;
                }
                .btn-tool {
                    background: transparent;
                    border: 1px solid var(--border-color);
                    color: var(--text-color);
                    padding: 8px 14px;
                    border-radius: 10px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    transition: all 0.2s ease;
                }
                .btn-tool:hover {
                    background: var(--btn-hover);
                    border-color: rgba(99, 102, 241, 0.3);
                    transform: translateY(-1px);
                }
                .btn-tool.active {
                    background: rgba(99, 102, 241, 0.12);
                    border-color: var(--primary-glow);
                    color: var(--primary-glow);
                }
                .btn-login {
                    background: linear-gradient(135deg, #0ea5e9, #6366f1);
                    color: white !important;
                    border: none !important;
                }
                .btn-login:hover {
                    background: linear-gradient(135deg, #38bdf8, #818cf8) !important;
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
                }
                .editor-container {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    padding: 24px;
                    z-index: 5;
                }
                .editor-card {
                    flex: 1;
                    background: var(--container-bg);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid var(--border-color);
                    border-radius: 16px;
                    display: flex;
                    flex-direction: column;
                    box-shadow: var(--card-shadow), 0 0 20px rgba(0, 242, 254, 0.05);
                    overflow: hidden;
                    transition: border-color 0.3s, box-shadow 0.3s;
                }
                .editor-card:focus-within {
                    border-color: rgba(0, 242, 254, 0.3);
                    box-shadow: var(--card-shadow), 0 0 25px rgba(0, 242, 254, 0.15);
                }
                .editor-textarea {
                    flex: 1;
                    background: var(--editor-bg);
                    border: none;
                    outline: none;
                    resize: none;
                    padding: 24px;
                    color: var(--text-color);
                    font-size: 16px;
                    line-height: 1.6;
                    transition: all 0.3s ease;
                    width: 100%;
                    overflow-wrap: break-word;
                }
                .editor-textarea.font-sans { font-family: 'Outfit', sans-serif; }
                .editor-textarea.font-mono { font-family: 'JetBrains Mono', monospace; font-size: 15px; }

                .modal-overlay {
                    position: fixed;
                    top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0, 0, 0, 0.6);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 100;
                }
                .modal-box {
                    background: var(--modal-bg);
                    border: 1px solid var(--border-color);
                    border-radius: 20px;
                    width: 90%;
                    max-width: 400px;
                    padding: 30px;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
                    position: relative;
                }
                .form-group { margin-bottom: 16px; }
                .form-label { display: block; font-size: 13px; color: var(--text-muted); margin-bottom: 6px; font-weight: 600; }
                .form-input {
                    width: 100%;
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    padding: 10px 14px;
                    color: var(--text-color);
                    font-size: 14px;
                    outline: none;
                }
                .form-input:focus {
                    border-color: var(--primary-glow);
                    box-shadow: 0 0 10px rgba(217, 70, 239, 0.3);
                }
                .btn {
                    border: none;
                    padding: 10px 16px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                .btn-secondary { background: var(--btn-hover); color: var(--text-color); }
                .btn-primary { background: linear-gradient(135deg, #d946ef, #a855f7); color: white; }
                .btn-danger { background: #e11d48; color: white; }
                
                .addr-modal-box {
                    background: var(--modal-bg);
                    border: 1px solid var(--border-color);
                    border-radius: 20px;
                    width: 90%;
                    max-width: 480px;
                    padding: 30px;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
                }
                .addr-field {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: rgba(0, 0, 0, 0.2);
                    border: 1px solid var(--border-color);
                    border-radius: 10px;
                    padding: 12px 14px;
                    margin-bottom: 10px;
                }
                .addr-field-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; font-weight: 600; margin-bottom: 3px; }
                .addr-field-value { font-size: 15px; font-weight: 600; color: var(--text-color); word-break: break-word; }
                .addr-copy-btn {
                    background: transparent;
                    border: 1px solid var(--border-color);
                    color: var(--text-muted);
                    padding: 6px 10px;
                    border-radius: 8px;
                    font-size: 12px;
                    cursor: pointer;
                }
                .addr-copy-btn.copied { background: rgba(16, 185, 129, 0.15); border-color: #10b981; color: #10b981; }

                .email-get-grid-2col {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 10px;
                }
                
                .toast {
                    position: fixed;
                    bottom: 40px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: var(--toast-bg);
                    color: white;
                    padding: 12px 24px;
                    border-radius: 12px;
                    font-size: 14px;
                    font-weight: 600;
                    z-index: 1000;
                    box-shadow: 0 10px 30px rgba(99, 102, 241, 0.4);
                }

                .status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    display: inline-block;
                    background-color: #64748b;
                }
                .status-dot.saving { background-color: #eab308; }
                .status-dot.saved { background-color: #10b981; }
                .status-dot.offline { background-color: #ef4444; }
                .status-dot.typing { background-color: #6366f1; }

                .right-section {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .actions-section {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .modal-tabs {
                    display: flex;
                    border-bottom: 1px solid var(--border-color);
                    margin-bottom: 15px;
                    gap: 16px;
                }
                .modal-tab {
                    background: transparent;
                    border: none;
                    color: var(--text-muted);
                    font-size: 16px;
                    font-weight: 700;
                    padding-bottom: 8px;
                    cursor: pointer;
                    position: relative;
                }
                .modal-tab.active {
                    color: var(--primary-glow);
                }
                .modal-tab.active::after {
                    content: '';
                    position: absolute;
                    bottom: -1px;
                    left: 0;
                    width: 100%;
                    height: 2px;
                    background: var(--primary-glow);
                }

                /* ====== TABLET / SMALL DESKTOP ====== */
                @media (max-width: 768px) {
                    .toolbar {
                        flex-wrap: wrap;
                        padding: 10px 12px;
                        gap: 8px;
                    }
                    .logo-section {
                        order: 1;
                        flex: 1 1 auto;
                        min-width: 0;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    .logo-title {
                        font-size: 17px;
                    }
                    .note-badge {
                        font-size: 11px;
                        padding: 3px 7px;
                        max-width: 80px;
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                    }
                    .status-section {
                        order: 2;
                        flex: 0 0 auto;
                        font-size: 11px;
                        gap: 4px;
                    }
                    .right-section {
                        display: contents;
                    }
                    .btn-login {
                        order: 3;
                        flex-shrink: 0;
                        padding: 7px 12px;
                        font-size: 12px;
                        border-radius: 8px;
                        white-space: nowrap;
                    }
                    .actions-section {
                        order: 4;
                        width: 100%;
                        display: flex;
                        overflow-x: auto;
                        gap: 12px;
                        padding: 8px 4px;
                        -webkit-overflow-scrolling: touch;
                        scrollbar-width: none;
                    }
                    .actions-section::-webkit-scrollbar {
                        display: none;
                    }
                    .btn-tool {
                        flex-shrink: 0;
                        padding: 10px 16px;
                        font-size: 13px;
                        border-radius: 10px;
                        gap: 6px;
                        white-space: nowrap;
                        min-height: 44px;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .editor-container {
                        padding: 8px;
                    }
                    .editor-card {
                        border-radius: 12px;
                    }
                    .editor-textarea {
                        padding: 14px;
                        font-size: 16px;
                    }
                    .metrics-bar {
                        padding: 8px 12px;
                        font-size: 11px;
                        flex-wrap: wrap;
                        gap: 4px;
                        justify-content: center;
                        text-align: center;
                    }
                    .metrics-left {
                        gap: 10px;
                        justify-content: center;
                        width: 100%;
                    }
                    .modal-box {
                        padding: 20px;
                        width: 95%;
                        max-height: 90vh;
                        overflow-y: auto;
                    }
                    .orb-1 {
                        width: 250px;
                        height: 250px;
                    }
                    .orb-2 {
                        width: 200px;
                        height: 200px;
                    }
                }

                /* ====== PHONE SMALL ====== */
                @media (max-width: 480px) {
                    .toolbar {
                        padding: 8px 10px;
                        gap: 6px;
                    }
                    .logo-title {
                        font-size: 15px;
                    }
                    .note-badge {
                        font-size: 10px;
                        padding: 2px 6px;
                        max-width: 60px;
                    }
                    .status-text {
                        display: none;
                    }
                    .status-section {
                        gap: 0;
                    }
                    .btn-login {
                        padding: 8px 14px;
                        font-size: 12px;
                        min-height: 40px;
                        display: inline-flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .btn-tool {
                        padding: 10px 14px;
                        font-size: 13px;
                        min-height: 44px;
                    }
                    .editor-container {
                        padding: 6px;
                    }
                    .editor-textarea {
                        padding: 12px;
                        font-size: 16px;
                    }
                    .metrics-bar {
                        padding: 6px 10px;
                        font-size: 10px;
                    }
                    .toast {
                        bottom: 20px;
                        font-size: 13px;
                        padding: 10px 18px;
                        max-width: 90vw;
                    }
                }

                /* ====== VERY SMALL PHONE (320px) ====== */
                @media (max-width: 360px) {
                    .logo-title {
                        font-size: 14px;
                    }
                    .note-badge {
                        display: none;
                    }
                    .btn-login {
                        padding: 5px 8px;
                        font-size: 11px;
                        gap: 2px;
                    }
                    .btn-tool {
                        padding: 5px 7px;
                        font-size: 10px;
                    }
                }

                /* Email retrieval modal responsive overrides */
                @media (max-width: 576px) {
                    #emailGetModal .modal-box {
                        padding: 14px 16px;
                        max-width: 95%;
                        margin: 10px;
                    }
                    .email-get-grid-2col {
                        gap: 8px;
                    }
                    #emailGetModal .form-group {
                        margin-bottom: 6px !important;
                    }
                    #emailGetModal .form-label {
                        font-size: 11px;
                        margin-bottom: 2px;
                    }
                    #emailGetModal .form-input {
                        padding: 6px 8px;
                        font-size: 13px;
                        height: 34px;
                    }
                    #emailGetModal p {
                        font-size: 12px !important;
                        margin-bottom: 8px !important;
                    }
                    #emailGetModal .btn {
                        padding: 6px 10px;
                        font-size: 12px;
                        height: 34px !important;
                    }
                }
            `}</style>

            <div className="glowing-orb orb-1"></div>
            <div className="glowing-orb orb-2"></div>

            {/* Header Toolbar */}
            <header className="toolbar">
                <div className="logo-section">
                    <a href="/" className="logo-title" style={{
                        fontWeight: '700',
                        fontSize: '20px',
                        letterSpacing: '0.5px',
                        background: 'linear-gradient(135deg, var(--accent-glow), var(--primary-glow))',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        textTransform: 'uppercase',
                        textDecoration: 'none'
                    }}>Ghi chú</a>
                    <span className="note-badge" style={{
                        background: 'rgba(99, 102, 241, 0.15)',
                        color: 'var(--primary-glow)',
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: '600',
                        border: '1px solid rgba(99, 102, 241, 0.2)'
                    }}>{noteId}</span>
                </div>

                <div className="status-section">
                    <span className={`status-dot ${statusState}`}></span>
                    <span className="status-text">{statusMessage}</span>
                </div>

                <div className="right-section">
                    <div className="actions-section">
                        <button className="btn-tool" onClick={() => handleSave(content)} style={{ background: 'var(--primary-glow)', color: 'white', borderColor: 'var(--primary-glow)' }}>
                            💾 Lưu
                        </button>
                        <button className="btn-tool" onClick={() => setShowEmailGetModal(true)}>
                            ✉️ Lấy Info
                        </button>
                        <button className="btn-tool" onClick={() => { setShowAddressModal(true); handleGenerateAddress(); }}>
                            🇺🇸 Địa chỉ
                        </button>
                        <button className="btn-tool" onClick={() => setShowTwoFaModal(true)}>
                            🔑 2FA
                        </button>
                        <button className="btn-tool" onClick={copyShareLink}>
                            🔗 Chia sẻ
                        </button>
                        <button className={`btn-tool ${hasPasswordState ? 'active' : ''}`} onClick={() => setShowLockModal(true)}>
                            🔒 {hasPasswordState ? 'Đổi khóa' : 'Khóa'}
                        </button>
                        <button className="btn-tool" onClick={toggleFont}>
                            🔤 {font === 'sans' ? 'Sans-serif' : 'Monospace'}
                        </button>
                        <button className="btn-tool" onClick={toggleTheme}>
                            🌓 Giao diện
                        </button>
                        <button className="btn-tool" onClick={downloadNote}>
                            📥 Tải xuống
                        </button>
                    </div>

                    {currentUser ? (
                        <button className="btn-tool btn-login" onClick={() => setShowUserInfoModal(true)}>
                            👤 {currentUser.username}
                        </button>
                    ) : (
                        <button className="btn-tool btn-login" onClick={() => setShowQuickLoginModal(true)}>
                            🔑 Đăng nhập
                        </button>
                    )}
                </div>
            </header>

            {/* Text Editor */}
            <main className="editor-container">
                <div className="editor-card">
                    <textarea
                        ref={textareaRef}
                        className={`editor-textarea ${font === 'sans' ? 'font-sans' : 'font-mono'}`}
                        value={content}
                        onChange={handleTextareaChange}
                        placeholder="Bắt đầu ghi chép thông tin của bạn tại đây... Nhấp nút 'Lưu' hoặc nhấn Ctrl+S để lưu..."
                    />
                </div>
            </main>

            {/* Metrics Footer */}
            <footer style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 24px',
                background: 'rgba(0, 0, 0, 0.15)',
                borderTop: '1px solid var(--border-color)',
                fontSize: '13px',
                color: 'var(--text-muted)'
            }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                    <span>Ký tự: <strong>{metrics.chars}</strong></span>
                    <span>Từ: <strong>{metrics.words}</strong></span>
                    <span>Dòng: <strong>{metrics.lines}</strong></span>
                </div>
                <div>
                    <span>Ghi chú tự động xóa sau 6 tháng nếu không bảo mật.</span>
                </div>
            </footer>

            {/* User Info / Logout Modal */}
            {showUserInfoModal && (
                <div className="modal-overlay" onClick={() => setShowUserInfoModal(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0 }}>👤 Thông tin tài khoản</h3>
                            <button onClick={() => setShowUserInfoModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div style={{ padding: '10px 0' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Tên đăng nhập:</span>
                                    <strong style={{ color: 'var(--text-color)', fontSize: '13px' }}>{currentUser?.username}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Email:</span>
                                    <strong style={{ color: 'var(--text-color)', fontSize: '13px' }}>{currentUser?.email || '-'}</strong>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Vai trò:</span>
                                    <strong style={{ color: 'var(--text-color)', fontSize: '13px' }}>
                                        {currentUser?.is_superuser ? 'Quản trị viên cấp cao' : currentUser?.is_staff ? 'Quản trị viên' : 'Thành viên'}
                                    </strong>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '15px', borderTop: '1px solid var(--border-color)' }}>
                            <a href="/dashboard/" className="btn btn-primary" style={{ textDecoration: 'none', flex: 1, textAlign: 'center', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: '36px', fontSize: '13px' }}>Vào quản trị</a>
                            <button onClick={onLogout} className="btn btn-danger" style={{ flex: 1, height: '36px', fontSize: '13px' }}>Đăng xuất</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lock/Password Modal */}
            {showLockModal && (
                <div className="modal-overlay" onClick={() => setShowLockModal(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ marginBottom: '10px' }}>🔒 {hasPasswordState ? 'Đổi hoặc xóa mật khẩu' : 'Đặt mật khẩu bảo vệ'}</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.5' }}>
                            Đặt mật khẩu giúp ngăn chặn người khác sửa đổi hoặc xem trộm ghi chú này.
                        </p>
                        <div className="form-group">
                            <label className="form-label">Mật khẩu mới</label>
                            <input
                                type="password"
                                className="form-input"
                                value={lockPasswordInput}
                                onChange={(e) => setLockPasswordInput(e.target.value)}
                                placeholder="Nhập mật khẩu..."
                            />
                        </div>
                        {hasPasswordState && (
                            <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '15px', paddingTop: '15px' }}>
                                <button className="btn btn-danger" style={{ width: '100%' }} onClick={handleRemoveNotePassword}>Gỡ bỏ mật khẩu</button>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                            <button className="btn btn-secondary" onClick={() => setShowLockModal(false)}>Hủy</button>
                            <button className="btn btn-primary" onClick={handleSaveNotePassword}>Lưu cấu hình</button>
                        </div>
                    </div>
                </div>
            )}

            {/* US Address Modal */}
            {showAddressModal && (
                <div className="modal-overlay" onClick={() => setShowAddressModal(false)}>
                    <div className="addr-modal-box" onClick={(e) => e.stopPropagation()} style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                                <span style={{ fontSize: '22px' }}>🇺🇸</span> Địa chỉ Mỹ ngẫu nhiên
                            </h3>
                            <button onClick={() => setShowAddressModal(false)} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer' }}>✕</button>
                        </div>

                        <div>
                            {Object.entries(addressData).map(([key, val]) => (
                                <div className="addr-field" key={key}>
                                    <div>
                                        <div className="addr-field-label">
                                            {key === 'name' ? 'Họ và tên (Full Name)' :
                                             key === 'address' ? 'Địa chỉ (Address)' :
                                             key === 'city' ? 'Thành phố (City)' :
                                             key === 'state' ? 'Bang (State)' :
                                             key === 'zip' ? 'Mã bưu chính (Zip Code)' : 'Số điện thoại (Phone)'}
                                        </div>
                                        <div className="addr-field-value">{val}</div>
                                    </div>
                                    <button
                                        className={`addr-copy-btn ${copiedField === key ? 'copied' : ''}`}
                                        onClick={() => handleCopyAddressField(key, val)}
                                    >
                                        {copiedField === key ? '✅ Đã copy' : '📋 Copy'}
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
                            <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleGenerateAddress}>🎲 Tạo địa chỉ mới</button>
                            <button className="btn btn-secondary" style={{ flex: 1 }} onClick={handleCopyAllAddress}>📑 Copy toàn bộ</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 2FA Authenticator Modal */}
            {showTwoFaModal && (
                <div className="modal-overlay" onClick={() => { setShowTwoFaModal(false); if (twoFaIntervalRef.current) clearInterval(twoFaIntervalRef.current); setTwoFaCode(''); }}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ marginBottom: '10px' }}>🔑 Trình tạo mã 2FA</h3>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.5' }}>
                            Nhập mã bảo mật 2FA (Base32 secret) của bạn để nhận mã xác thực OTP 6 số.
                        </p>
                        <div className="form-group">
                            <label className="form-label">Mã bảo mật 2FA (Secret Key)</label>
                            <input
                                type="text"
                                className="form-input"
                                style={{ textTransform: 'uppercase' }}
                                value={twoFaSecret}
                                onChange={(e) => setTwoFaSecret(e.target.value)}
                                placeholder="Ví dụ: JBSWY3DPEBLW64TBNQ..."
                            />
                        </div>

                        {twoFaCode && (
                            <div style={{ marginTop: '20px' }}>
                                <label className="form-label">Mã xác thực của bạn (OTP Code)</label>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input
                                        type="text"
                                        className="form-input"
                                        readOnly
                                        style={{ fontSize: '24px', fontWeight: '700', textAlign: 'center', letterSpacing: '4px', color: 'var(--accent-glow)', background: 'rgba(0,0,0,0.3)', flex: 1 }}
                                        value={twoFaCode}
                                    />
                                    <button className="btn btn-primary" onClick={handleCopyTwoFaCode}>Sao chép</button>
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
                                    Hiệu lực còn lại: <strong>{twoFaSeconds}</strong> giây
                                </div>
                            </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
                            <button className="btn btn-secondary" onClick={() => { setShowTwoFaModal(false); if (twoFaIntervalRef.current) clearInterval(twoFaIntervalRef.current); setTwoFaCode(''); }}>Đóng</button>
                            <button className="btn btn-primary" onClick={handleGenerateTwoFa}>Lấy mã (Get Code)</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Email Getter Modal */}
            {showEmailGetModal && (
                <div className="modal-overlay">
                    <div className="modal-box" style={{ maxWidth: '550px', width: '90%' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 style={{ margin: 0 }}>✉️ Lấy Info</h3>
                            <button onClick={handleCloseEmailGetModal} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                        </div>

                        <div>
                            {/* Radio tabs selector */}
                            <div style={{ marginBottom: '15px' }}>
                                <label className="form-label">Trạng thái tài khoản</label>
                                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                                    <label style={{
                                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px',
                                        background: infoSourceType === 'uncreated' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.02)',
                                        border: `1px solid ${infoSourceType === 'uncreated' ? 'var(--primary-glow)' : 'var(--border-color)'}`,
                                        borderRadius: '10px', cursor: 'pointer', fontSize: '13px'
                                    }}>
                                        <input type="radio" name="sourceType" checked={infoSourceType === 'uncreated'} onChange={() => handleInfoSourceChange('uncreated')} />
                                        Chưa tạo (Lấy Email)
                                    </label>
                                    <label style={{
                                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px',
                                        background: infoSourceType === 'created' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.02)',
                                        border: `1px solid ${infoSourceType === 'created' ? 'var(--primary-glow)' : 'var(--border-color)'}`,
                                        borderRadius: '10px', cursor: 'pointer', fontSize: '13px'
                                    }}>
                                        <input type="radio" name="sourceType" checked={infoSourceType === 'created'} onChange={() => handleInfoSourceChange('created')} />
                                        Đã tạo (Lấy Acc)
                                    </label>
                                    <label style={{
                                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px',
                                        background: infoSourceType === 'address' ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255,255,255,0.02)',
                                        border: `1px solid ${infoSourceType === 'address' ? 'var(--primary-glow)' : 'var(--border-color)'}`,
                                        borderRadius: '10px', cursor: 'pointer', fontSize: '13px'
                                    }}>
                                        <input type="radio" name="sourceType" checked={infoSourceType === 'address'} onChange={() => handleInfoSourceChange('address')} />
                                        🇺🇸 Địa chỉ
                                    </label>
                                </div>
                            </div>

                            {/* Dropdown filters (only for uncreated / created) */}
                            {infoSourceType !== 'address' && (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', marginBottom: '12px' }}>
                                    <div style={{ flex: 1 }}>
                                        <label className="form-label">Loại tài khoản</label>
                                        <select
                                            className="form-input"
                                            style={{ background: 'rgba(8, 11, 23, 0.8)', color: 'white', height: '36px', padding: '0 10px', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                            value={emailSelectType}
                                            onChange={(e) => setEmailSelectType(e.target.value)}
                                        >
                                            <option value="Apple">Apple</option>
                                            <option value="Tiktok">Tiktok</option>
                                        </select>
                                    </div>
                                    <button className="btn btn-primary" onClick={handleGetInfo} disabled={emailGetLoader} style={{ height: '36px', display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
                                        {infoSourceType === 'uncreated' ? '✉️ Lấy Email' : '🔑 Lấy Info'}
                                    </button>
                                </div>
                            )}

                            {/* Uncreated Results */}
                            {infoSourceType === 'uncreated' && emailGetAddress && (
                                <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                                    <div className="email-get-grid-2col">
                                        <div className="form-group" style={{ marginBottom: '8px' }}>
                                            <label className="form-label">Địa chỉ Email</label>
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                <input type="text" className="form-input" readOnly value={emailGetAddress} style={{ fontWeight: '600', height: '36px', fontSize: '13px' }} />
                                                <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(emailGetAddress).then(() => triggerToast('Đã copy Email')); }} style={{ padding: '0 10px', height: '36px' }}>📋</button>
                                            </div>
                                        </div>
                                        <div className="form-group" style={{ marginBottom: '8px' }}>
                                            <label className="form-label">Mật khẩu Email</label>
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                <input type="text" className="form-input" readOnly value={emailGetPassword} style={{ fontFamily: 'monospace', height: '36px', fontSize: '13px' }} />
                                                <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(emailGetPassword).then(() => triggerToast('Đã copy Mật khẩu')); }} style={{ padding: '0 10px', height: '36px' }}>📋</button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Register/Save fields */}
                                    <div style={{ marginTop: '10px', borderTop: '1px dashed var(--border-color)', paddingTop: '10px' }}>
                                        <div className="email-get-grid-2col">
                                            <div className="form-group" style={{ marginBottom: '8px' }}>
                                                <label className="form-label">Mật khẩu mới</label>
                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                    <input type="text" className="form-input" placeholder="Mật khẩu tạo..." value={emailGetAccPassword} onChange={(e) => setEmailGetAccPassword(e.target.value)} style={{ height: '36px', fontSize: '13px' }} />
                                                    <button className="btn btn-secondary" onClick={() => setEmailGetAccPassword('Zxcv@123')} style={{ padding: '0 10px', height: '36px' }}>🔒</button>
                                                </div>
                                            </div>
                                            <div className="form-group" style={{ marginBottom: '8px' }}>
                                                <label className="form-label">Khóa 2FA</label>
                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                    <input type="text" className="form-input" placeholder="2FA Secret..." value={emailGetAcc2Fa} onChange={(e) => setEmailGetAcc2Fa(e.target.value)} style={{ height: '36px', fontSize: '13px' }} />
                                                    <button className="btn btn-primary" onClick={handleGetOtpForUncreatedAcc} style={{ padding: '0 10px', height: '36px', fontSize: '12px', whiteSpace: 'nowrap' }}>Mã OTP</button>
                                                </div>
                                                {emailGetAcc2FaOtpDisplay && (
                                                    <div onClick={() => {
                                                        const match = emailGetAcc2FaOtpDisplay.match(/Mã OTP:\s*([0-9]{6})/);
                                                        if (match) { navigator.clipboard.writeText(match[1]).then(() => triggerToast('Đã copy OTP')); }
                                                    }} style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--otp-text)', marginTop: '4px', background: 'var(--otp-bg)', border: '1px solid var(--otp-border)', padding: '4px 8px', borderRadius: '4px', textAlign: 'center', cursor: 'pointer' }}>
                                                        {emailGetAcc2FaOtpDisplay}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <button className="btn btn-primary" onClick={handleSaveCreatedAccount} style={{ width: '100%', height: '36px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', fontSize: '13px' }}>
                                            💾 Lưu tài khoản vào hệ thống
                                        </button>
                                    </div>

                                    {/* Inbox details */}
                                    <div style={{ marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                Thư mới nhất {emailGetOtpDisplay && <span style={{ background: 'var(--otp-bg)', border: '1px solid var(--otp-border)', color: 'var(--otp-text)', padding: '2px 8px', borderRadius: '4px', fontSize: '13px' }}>OTP: {emailGetOtpDisplay}</span>}
                                            </label>
                                            <button className="btn btn-primary" onClick={() => reloadEmailGetMailbox(emailGetId)} disabled={emailGetLoader} style={{ padding: '4px 8px', fontSize: '11px', height: '26px' }}>🔄 Tải lại</button>
                                        </div>

                                        <div style={{ padding: '8px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', border: '1px solid var(--border-color)', minHeight: '48px', maxHeight: '100px', overflowY: 'auto', fontSize: '12px', lineHeight: '1.4' }}>
                                            {emailGetMailContent}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Created Acc Results */}
                            {infoSourceType === 'created' && createdAccUsername && (
                                <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                                    <div className="email-get-grid-2col">
                                        <div className="form-group" style={{ marginBottom: '8px' }}>
                                            <label className="form-label">Username</label>
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                <input type="text" className="form-input" readOnly value={createdAccUsername} style={{ fontWeight: '600', height: '36px', fontSize: '13px' }} />
                                                <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(createdAccUsername).then(() => triggerToast('Đã copy Username')); }} style={{ padding: '0 10px', height: '36px' }}>📋</button>
                                            </div>
                                        </div>
                                        <div className="form-group" style={{ marginBottom: '8px' }}>
                                            <label className="form-label">Email</label>
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                <input type="text" className="form-input" readOnly value={createdAccEmail} style={{ fontWeight: '600', height: '36px', fontSize: '13px' }} />
                                                <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(createdAccEmail).then(() => triggerToast('Đã copy Email')); }} style={{ padding: '0 10px', height: '36px' }}>📋</button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="email-get-grid-2col" style={{ marginTop: '4px' }}>
                                        <div className="form-group" style={{ marginBottom: '8px' }}>
                                            <label className="form-label">Mật khẩu</label>
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                <input type="text" className="form-input" readOnly value={createdAccPassword} style={{ fontFamily: 'monospace', height: '36px', fontSize: '13px' }} />
                                                <button className="btn btn-primary" onClick={() => { navigator.clipboard.writeText(createdAccPassword).then(() => triggerToast('Đã copy Mật khẩu')); }} style={{ padding: '0 10px', height: '36px' }}>📋</button>
                                            </div>
                                        </div>
                                        <div className="form-group" style={{ marginBottom: '8px' }}>
                                            <label className="form-label">2FA Secret Key</label>
                                            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                <input type="text" className="form-input" readOnly value={createdAcc2Fa} style={{ fontFamily: 'monospace', height: '36px', fontSize: '13px' }} />
                                                <button className="btn btn-primary" onClick={fetchCreatedAccOtp} style={{ padding: '0 10px', height: '36px' }}>🔑</button>
                                            </div>
                                            {createdAccOtpDisplayBadge && (
                                                <div onClick={() => {
                                                    const match = createdAccOtpDisplayBadge.match(/Mã OTP:\s*([0-9]{6})/);
                                                    if (match) { navigator.clipboard.writeText(match[1]).then(() => triggerToast('Đã copy OTP')); }
                                                }} style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--otp-text)', marginTop: '4px', background: 'var(--otp-bg)', border: '1px solid var(--otp-border)', padding: '4px 8px', borderRadius: '4px', textAlign: 'center', cursor: 'pointer' }}>
                                                    {createdAccOtpDisplayBadge}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Inbox Details */}
                                    {showCreatedAccInbox && (
                                        <div style={{ marginTop: '10px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    Thư mới nhất {createdAccOtpDisplay && <span style={{ background: 'var(--otp-bg)', border: '1px solid var(--otp-border)', color: 'var(--otp-text)', padding: '2px 8px', borderRadius: '4px', fontSize: '13px' }}>OTP: {createdAccOtpDisplay}</span>}
                                                </label>
                                                <button className="btn btn-primary" onClick={() => reloadCreatedAccMailbox(createdAccEmailId)} disabled={createdAccMailLoader} style={{ padding: '4px 8px', fontSize: '11px', height: '26px' }}>🔄 Tải lại</button>
                                            </div>

                                            <div style={{ padding: '8px', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', border: '1px solid var(--border-color)', minHeight: '48px', maxHeight: '100px', overflowY: 'auto', fontSize: '12px', lineHeight: '1.4' }}>
                                                {createdAccMailContent}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tab Address results */}
                            {infoSourceType === 'address' && (
                                <div style={{ marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                                    <div>
                                        {Object.entries(tabAddressData).map(([key, val]) => (
                                            <div className="addr-field" style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', background: 'transparent' }} key={key}>
                                                <div>
                                                    <div className="addr-field-label" style={{ fontSize: '11px' }}>
                                                        {key === 'name' ? 'Họ và tên (Full Name)' :
                                                         key === 'address' ? 'Địa chỉ (Address)' :
                                                         key === 'city' ? 'Thành phố (City)' :
                                                         key === 'state' ? 'Bang (State)' :
                                                         key === 'zip' ? 'Mã bưu chính (Zip Code)' : 'Số điện thoại (Phone)'}
                                                    </div>
                                                    <div className="addr-field-value" style={{ fontSize: '14px', color: 'white' }}>{val}</div>
                                                </div>
                                                <button className="btn btn-secondary" onClick={() => handleCopyTabAddressField(val)} style={{ padding: '4px 8px', fontSize: '11px', height: '26px' }}>📋 Copy</button>
                                            </div>
                                        ))}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                        <button className="btn btn-primary" style={{ flex: 1, height: '36px' }} onClick={handleGenerateTabAddress}>🎲 Tạo địa chỉ mới</button>
                                        <button className="btn btn-secondary" style={{ flex: 1, height: '36px' }} onClick={handleCopyAllTabAddress}>📑 Copy toàn bộ</button>
                                    </div>
                                </div>
                            )}

                            {/* Classification status on close selection */}
                            {(createdAccId || emailGetId) && (
                                <div style={{ marginTop: '15px', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
                                    <label className="form-label">Chọn trạng thái cuối cùng (Bắt buộc trước khi đóng)</label>
                                    <select
                                        className="form-input"
                                        style={{ background: 'rgba(8, 11, 23, 0.8)', color: 'white', height: '36px', padding: '0 10px', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                                        value={modalStatusSelect}
                                        disabled={statusSelectDisabled}
                                        onChange={(e) => setModalStatusSelect(e.target.value)}
                                    >
                                        <option value="">-- Vui lòng chọn trạng thái --</option>
                                        <option value="0">Hoạt động (Active)</option>
                                        <option value="1">Chưa kích hoạt (Email Not Activated)</option>
                                        <option value="2">Bị khóa (Banned)</option>
                                        <option value="3">Tạm thời (Temporary)</option>
                                        <option value="4">Sub OK</option>
                                        <option value="5">Sub Lỗi</option>
                                        <option value="6">Đang sử dụng (In Use)</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="modal-footer" style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" disabled={statusSelectDisabled} onClick={handleCloseEmailGetModal}>
                                {statusSelectDisabled ? 'Đang lưu...' : 'Đóng'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Login & Register Modal */}
            {showQuickLoginModal && (
                <div className="modal-overlay" onClick={() => setShowQuickLoginModal(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                            <div className="modal-tabs" style={{ flex: 1, marginRight: '15px' }}>
                                <button className={`modal-tab ${authTab === 'login' ? 'active' : ''}`} onClick={() => setAuthTab('login')}>Đăng nhập</button>
                                <button className={`modal-tab ${authTab === 'register' ? 'active' : ''}`} onClick={() => setAuthTab('register')}>Đăng ký</button>
                            </div>
                            <button onClick={() => setShowQuickLoginModal(false)} style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer' }}>✕</button>
                        </div>

                        {authTab === 'login' ? (
                            <div>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label className="form-label">Tên đăng nhập</label>
                                        <input type="text" className="form-input" placeholder="Nhập tên đăng nhập..." value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} />
                                    </div>
                                    <div className="form-group" style={{ marginTop: '15px' }}>
                                        <label className="form-label">Mật khẩu</label>
                                        <input type="password" className="form-input" placeholder="Nhập mật khẩu..." value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleQuickLogin(); }} />
                                    </div>
                                    {loginError && (
                                        <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '12px', textAlign: 'center', fontWeight: '600' }}>{loginError}</div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '15px' }}>
                                    <button className="btn btn-secondary" onClick={() => setShowQuickLoginModal(false)}>Hủy</button>
                                    <button className="btn btn-primary" onClick={handleQuickLogin} disabled={btnSubmitLoginDisabled}>{btnSubmitLoginDisabled ? 'Đang xử lý...' : 'Đăng nhập'}</button>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label className="form-label">Tên đăng nhập</label>
                                        <input type="text" className="form-input" placeholder="Từ 6-30 ký tự, viết liền..." value={registerUsername} onChange={(e) => setRegisterUsername(e.target.value)} />
                                    </div>
                                    <div className="form-group" style={{ marginTop: '12px' }}>
                                        <label className="form-label">Địa chỉ Email</label>
                                        <input type="email" className="form-input" placeholder="Ví dụ: mail@example.com..." value={registerEmail} onChange={(e) => setRegisterEmail(e.target.value)} />
                                    </div>
                                    <div className="form-group" style={{ marginTop: '12px' }}>
                                        <label className="form-label">Mật khẩu</label>
                                        <input type="password" className="form-input" placeholder="Nhập mật khẩu..." value={registerPassword} onChange={(e) => setRegisterPassword(e.target.value)} />
                                    </div>
                                    <div className="form-group" style={{ marginTop: '12px' }}>
                                        <label className="form-label">Xác nhận mật khẩu</label>
                                        <input type="password" className="form-input" placeholder="Nhập lại mật khẩu..." value={registerConfirmPassword} onChange={(e) => setRegisterConfirmPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleQuickRegister(); }} />
                                    </div>
                                    {registerError && (
                                        <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '12px', textAlign: 'center', fontWeight: '600' }}>{registerError}</div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '15px' }}>
                                    <button className="btn btn-secondary" onClick={() => setShowQuickLoginModal(false)}>Hủy</button>
                                    <button className="btn btn-primary" onClick={handleQuickRegister} disabled={btnSubmitRegisterDisabled}>{btnSubmitRegisterDisabled ? 'Đang xử lý...' : 'Đăng ký'}</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Toast Box */}
            {showToast && <div className="toast">{toastMessage}</div>}
        </div>
    );
}
