// ==========================================
// 1. KẾT NỐI FIREBASE & CHUẨN HÓA DỮ LIỆU
// ==========================================
let currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
if(!currentUser && window.location.pathname.indexOf('login.html') === -1) {
    window.location.href = "login.html";
}

let usersDB = {};
let db = { hopDongs: [], phuLucs: [], hoaDons: [], thanhToans: [] };
let nghiemThuDB = {};
let currentExcelDataNT = [];
let currentBBNTId = null;

const APP_UPDATE_NOTICE_KEY = 'congnohtb_update_seen_BBNT_ID_HD_BENB_20260622';

function hienThiThongBaoCapNhat(forceShow = false) {
    const modal = document.getElementById('modalCapNhatTinhNang');
    if(!modal) return;
    if(!forceShow && localStorage.getItem(APP_UPDATE_NOTICE_KEY) === '1') return;

    const passModal = document.getElementById('modalDoiMatKhau');
    const isPasswordModalOpen = passModal && passModal.style.display === 'flex';
    if(!forceShow && isPasswordModalOpen) {
        setTimeout(() => hienThiThongBaoCapNhat(false), 2500);
        return;
    }

    modal.style.display = 'flex';
}

function dongThongBaoCapNhat(daXem = true) {
    if(daXem) localStorage.setItem(APP_UPDATE_NOTICE_KEY, '1');
    const modal = document.getElementById('modalCapNhatTinhNang');
    if(modal) modal.style.display = 'none';
}

let benADefault = {
    ten: "TRUNG TÂM Y TẾ KHU VỰC HÀM THUẬN BẮC", diaChi: "Km 17 Đường 8/4, Thôn Lâm Hòa, xã Hàm Thuận, tỉnh Lâm Đồng",
    sdt: "0252. 3611812              Fax: 0252. 3610675", email: "ytehamthuanbac@gmail.com",
    tk: "3716.2.1030529.00000 ; 9527.2.1030529", giaoDich: "giao dịch tại KBNN Khu vực XVI - PGD số 12",
    mst: "3400517197", maDV: "1030529", daiDien: "TRẦN GIAO HÙNG", chucVu: "Giám Đốc"
};
let benA = { ...benADefault };

function getExcelTimestamp() {
    let d = new Date();
    let pad = n => n < 10 ? '0'+n : n;
    return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

if(window.location.pathname.indexOf('login.html') === -1) {
    database.ref('usersDB').on('value', (snapshot) => {
        if(snapshot.exists()) { 
            usersDB = snapshot.val(); 
            loadBangTaiKhoan(); 
            
            if(currentUser && usersDB[currentUser.username]) {
                let myData = usersDB[currentUser.username];
                if(myData.isFirstLogin === true) {
                    hienThiModalDoiMatKhau(true);
                }
            }
        }
    });

    database.ref('congNoDB').on('value', (snapshot) => {
        if(snapshot.exists()) {
            let data = snapshot.val();
            db.hopDongs = data.hopDongs ? Object.values(data.hopDongs) : [];
            db.phuLucs = data.phuLucs ? Object.values(data.phuLucs) : [];
            db.hoaDons = data.hoaDons ? Object.values(data.hoaDons) : [];
            db.thanhToans = data.thanhToans ? Object.values(data.thanhToans) : [];
            
            renderTable(); 
            loadSelectOptions(); 
            loadDsHopDongNT();
            renderBangAdminHopDong();

            let ctyTT = document.getElementById('selectCongTyTT')?.value;
            if(ctyTT) loadHopDongVaHoaDonTT();
        } else {
            db = { hopDongs: [], phuLucs: [], hoaDons: [], thanhToans: [] };
            renderTable();
            renderBangAdminHopDong();
        }
    });

    database.ref('nghiemThuDB').on('value', (snapshot) => {
        if(snapshot.exists()) nghiemThuDB = snapshot.val(); 
        else nghiemThuDB = {};
        renderDanhSachBBNT(); 
    });

    database.ref('thongTinBenA_v1').on('value', (snapshot) => {
        if(snapshot.exists()) { benA = snapshot.val(); renderBenANT(); }
    });
}

function saveData() { database.ref('congNoDB').set(db); }
function saveUsers() { database.ref('usersDB').set(usersDB); }
function saveNghiemThu() { database.ref('nghiemThuDB').set(nghiemThuDB); } // Chỉ giữ lại cho dữ liệu cũ, BBNT mới lưu từng record theo ID

function dangXuat() {
    sessionStorage.removeItem('currentUser');
    window.location.href = "login.html";
}

// ==========================================
// TÍNH NĂNG ĐỔI MẬT KHẨU
// ==========================================
function hienThiModalDoiMatKhau(isBatBuoc) {
    document.getElementById('modalDoiMatKhau').style.display = 'flex';
    document.getElementById('oldPass').value = '';
    document.getElementById('newPass').value = '';
    document.getElementById('confirmPass').value = '';
    document.getElementById('doiMatKhauMsg').innerText = '';
    
    if(isBatBuoc) {
        document.getElementById('doiMatKhauTitle').innerText = '🔑 YÊU CẦU ĐỔI MẬT KHẨU';
        document.getElementById('doiMatKhauMsg').innerText = 'Đây là lần đăng nhập đầu tiên, bạn phải đổi mật khẩu để tiếp tục sử dụng hệ thống.';
        document.getElementById('btnHuyDoiPass').style.display = 'none'; 
    } else {
        document.getElementById('doiMatKhauTitle').innerText = '🔑 ĐỔI MẬT KHẨU';
        document.getElementById('btnHuyDoiPass').style.display = 'block'; 
    }
}

function dongModalDoiMatKhau() {
    document.getElementById('modalDoiMatKhau').style.display = 'none';
}

function luuMatKhauMoi() {
    let user = usersDB[currentUser.username];
    if(!user) return alert("Lỗi: Không tìm thấy tài khoản trong hệ thống!");
    
    let oldP = document.getElementById('oldPass').value;
    let newP = document.getElementById('newPass').value;
    let confP = document.getElementById('confirmPass').value;
    
    if(oldP !== user.password) return alert("❌ Mật khẩu hiện tại không đúng!");
    if(newP.length < 4) return alert("❌ Mật khẩu mới quá ngắn, vui lòng nhập ít nhất 4 ký tự!");
    if(newP !== confP) return alert("❌ Mật khẩu xác nhận không khớp!");
    
    user.password = newP;
    user.isFirstLogin = false; 
    saveUsers();
    
    alert("✅ Đã đổi mật khẩu thành công!");
    dongModalDoiMatKhau();
}

// ==========================================
// 2. KHỞI TẠO GIAO DIỆN & QUẢN TRỊ ADMIN
// ==========================================
$(document).ready(function() {
    if(currentUser) {
        document.getElementById('currentUserName').innerText = currentUser.username.toUpperCase();
        let roleName = currentUser.role === 'admin' ? '[Quản trị TTYT]' : (currentUser.role === 'nhapkho' ? '[Thủ Kho]' : `[Đối tác: ${currentUser.company}]`);
        document.getElementById('currentUserRole').innerText = roleName;

        if(currentUser.role === 'user') {
            document.getElementById('btn-tab-hop-dong').style.display = 'none';
            document.getElementById('btn-tab-hoa-don').style.display = 'none';
            document.getElementById('btn-tab-admin').style.display = 'none';
            
            let locCty = document.getElementById('filterCongTy');
            if(locCty) locCty.parentElement.style.display = 'none';

            document.getElementById('inpTenBenBNT').value = currentUser.company;
            document.getElementById('inpTenBenBNT').disabled = true;

            switchTab('tab-theo-doi', document.getElementById('btn-tab-theo-doi'));
            
        } else if(currentUser.role === 'nhapkho') {
            document.getElementById('btn-tab-hop-dong').style.display = 'none';
            document.getElementById('btn-tab-theo-doi').style.display = 'none';
            document.getElementById('btn-tab-nghiem-thu').style.display = 'none';
            document.getElementById('btn-tab-admin').style.display = 'none';
            
            let boxTT = document.getElementById('box-xac-nhan-thanh-toan');
            if(boxTT) boxTT.style.display = 'none';
            
            switchTab('tab-hoa-don', document.getElementById('btn-tab-hoa-don'));
            
        } else {
            document.getElementById('khuVucCapNhatBenA').style.display = 'block';
        }
    }
    
    $('.search-select').select2({ width: '100%' });
    updateDocNT();
    renderBenANT();
    setTimeout(() => hienThiThongBaoCapNhat(false), 700);

    $('#filterCongTy').on('change', renderTable);
    $('#filterCongTy').on('select2:select', renderTable); 
    $('#filterThangNhap').on('change', renderTable);
    $('#filterDate').on('change', renderTable);

    $('#selectCongTyTT').on('change', loadHopDongVaHoaDonTT);
    $('#selectCongTyTT').on('select2:select', loadHopDongVaHoaDonTT);
});

function toggleCompanySelect() {
    document.getElementById('divSelectCompany').style.display = document.getElementById('newRole').value === 'admin' || document.getElementById('newRole').value === 'nhapkho' ? 'none' : 'block';
}

function taoTaiKhoan() {
    let u = document.getElementById('newUsername').value.trim().toLowerCase();
    let p = document.getElementById('newPassword').value;
    let r = document.getElementById('newRole').value;
    let c = document.getElementById('newUserCompany').value;

    if(!u || !p) return alert("Vui lòng nhập đủ tên đăng nhập và mật khẩu!");
    if(r === 'user' && !c) return alert("Vui lòng chọn Công ty cho tài khoản đối tác!");

    usersDB[u] = { password: p, role: r, company: r === 'admin' || r === 'nhapkho' ? 'ALL' : c, isFirstLogin: true };
    saveUsers();
    alert("Đã tạo tài khoản thành công!");
    document.getElementById('newUsername').value = ''; document.getElementById('newPassword').value = '';
}

function taiMauExcelTaiKhoan() {
    let ws = XLSX.utils.aoa_to_sheet([
        ["Tên đăng nhập (Viết liền không dấu)", "Mật khẩu", "Quyền hạn (user/admin/nhapkho)", "Tên Công ty quản lý (Chính xác tên Cty)"],
        ["doitac_cpc1", "123456", "user", "Công ty Cổ phần Dược phẩm CPC1 Hà Nội"],
        ["ketoan_admin", "123456", "admin", "ALL"],
        ["thukho_01", "123456", "nhapkho", "ALL"]
    ]);
    let wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TaoTaiKhoan");
    XLSX.writeFile(wb, "Mau_Tao_Tai_Khoan_Hang_Loat.xlsx");
}

function taoTaiKhoanHangLoat() {
    let fileInput = document.getElementById('fileExcelTaiKhoan');
    if(!fileInput.files.length) return alert("Vui lòng chọn file Excel danh sách tài khoản trước!");

    let reader = new FileReader();
    reader.onload = function(e) {
        let rows = XLSX.utils.sheet_to_json(XLSX.read(new Uint8Array(e.target.result), {type: 'array'}).Sheets[XLSX.read(new Uint8Array(e.target.result), {type: 'array'}).SheetNames[0]], {header: 1, raw: true});
        let count = 0;
        
        for(let i = 1; i < rows.length; i++) {
            let row = rows[i];
            if(!row || !row[0] || !row[1]) continue;

            let u = row[0].toString().trim().toLowerCase();
            let p = row[1].toString();
            let rText = (row[2] ? row[2].toString().toLowerCase() : '');
            let r = (rText === 'admin') ? 'admin' : (rText === 'nhapkho' ? 'nhapkho' : 'user');
            let c = row[3] ? row[3].toString().trim() : '';

            if(r === 'user' && !c) continue; 

            usersDB[u] = { password: p, role: r, company: r === 'admin' || r === 'nhapkho' ? 'ALL' : c, isFirstLogin: true };
            count++;
        }

        if(count > 0) {
            saveUsers();
            alert(`✅ Đã tạo thành công ${count} tài khoản từ file Excel!\nTất cả tài khoản này sẽ bị yêu cầu đổi mật khẩu ở lần đăng nhập đầu tiên.`);
            loadBangTaiKhoan();
        } else {
            alert("❌ Không có tài khoản nào hợp lệ được tạo. Kiểm tra lại file Excel.");
        }
        fileInput.value = "";
    };
    reader.readAsArrayBuffer(fileInput.files[0]);
}

function loadBangTaiKhoan() {
    let tbody = '';
    for(let key in usersDB) {
        let btnXoa = key === 'admin' ? '' : `<button onclick="xoaTaiKhoan('${key}')" style="background:#dc3545;color:white;border:none;padding:3px 8px;border-radius:3px;cursor:pointer;">Xóa</button>`;
        let passToDisplay = usersDB[key].password; 
        let trangThaiMK = usersDB[key].isFirstLogin ? '<br><span style="color:red; font-size:10px;">(Chưa đổi MK mới)</span>' : '';
        let roleName = usersDB[key].role === 'admin' ? "Quản trị" : (usersDB[key].role === 'nhapkho' ? "Thủ kho" : "Đối tác");

        tbody += `<tr>
            <td>${key}</td>
            <td style="color:#0056b3; font-weight:bold;">${passToDisplay} ${trangThaiMK}</td>
            <td>${roleName}</td>
            <td>${usersDB[key].company}</td>
            <td class="text-center">${btnXoa}</td>
        </tr>`;
    }
    let bang = document.getElementById('bangTaiKhoan');
    if(bang) bang.innerHTML = tbody;
}

function xoaTaiKhoan(u) {
    if(confirm(`Chắc chắn xóa tài khoản ${u}?`)) { delete usersDB[u]; saveUsers(); }
}

function renderBangAdminHopDong() {
    if(!document.getElementById('bangAdminHopDong')) return;
    let html = '';
    db.hopDongs.forEach(hd => {
        html += `<tr>
            <td><strong>${hd.tenCongTy}</strong></td>
            <td>${hd.soHopDong}</td>
            <td class="text-right">${formatTien(hd.giaTriGoc)}</td>
            <td class="text-center"><button onclick="xoaHopDong('${hd.id}')" style="background:#dc3545; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer; font-size:11px;" title="Xóa Công ty/Hợp đồng này">❌ Xóa</button></td>
        </tr>`;
    });
    if(db.hopDongs.length === 0) html = `<tr><td colspan="4" class="text-center" style="font-style:italic;">Chưa có dữ liệu</td></tr>`;
    document.getElementById('bangAdminHopDong').innerHTML = html;
}

function xoaHopDong(id) {
    if(currentUser.role === 'nhapkho') return alert("Tài khoản Thủ kho không được xóa dữ liệu!");
    let hd = db.hopDongs.find(h => h.id === id);
    if(!hd) return;
    let hasInvoices = db.hoaDons.some(inv => inv.idHD === id || inv.tenCongTy === hd.tenCongTy);
    let msg = hasInvoices 
        ? `⚠️ CẢNH BÁO: Công ty [${hd.tenCongTy}] hiện đang có Hóa đơn gắn liền!\n\nNếu bạn xóa, các hóa đơn kia sẽ bị mất liên kết với hợp đồng này. Bạn vẫn chắc chắn muốn XÓA chứ?`
        : `⚠️ Bạn có chắc chắn muốn xóa Công ty / Hợp đồng:\n[${hd.tenCongTy}]?`;
        
    if(confirm(msg)) {
        db.hopDongs = db.hopDongs.filter(h => h.id !== id);
        saveData();
        alert("✅ Đã xóa Công ty/Hợp đồng thành công!");
    }
}

function xoaHoaDon(id) {
    if(currentUser.role === 'nhapkho') return alert("Tài khoản Thủ kho không được xóa dữ liệu!");
    if(confirm("⚠️ BẠN CÓ CHẮC CHẮN MUỐN XÓA HÓA ĐƠN NÀY?\n\nDữ liệu sẽ bị xóa vĩnh viễn và không thể khôi phục!")) {
        db.hoaDons = db.hoaDons.filter(h => h.id !== id);
        db.thanhToans = db.thanhToans.filter(t => t.idHoaDon !== id); 
        saveData();
        alert("✅ Đã xóa hóa đơn thành công!");
    }
}

// ==========================================
// 3. LOGIC QUẢN LÝ CÔNG NỢ & THANH TOÁN
// ==========================================
const formatTien = (tien) => new Intl.NumberFormat('vi-VN').format(tien);

function formatDate(dateString) {
    if(!dateString) return '';
    const parts = dateString.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateString;
}

function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    if(btn) btn.classList.add('active');
    
    $('.search-select').select2({ width: '100%' });

    if(tabId === 'tab-theo-doi') renderTable();
    if(tabId === 'tab-hoa-don') { loadSelectOptions(); loadHopDongVaHoaDonTT(); }
}

function themHopDong() {
    if(currentUser.role === 'nhapkho') return alert("Tài khoản Thủ kho không có quyền thực hiện chức năng này!");
    let ten = document.getElementById('tenCongTy').value.trim();
    let soHD = document.getElementById('soHopDong').value.trim();
    let giaTri = Number(document.getElementById('giaTriGoc').value);
    if(!ten || !soHD || !giaTri) return alert("Vui lòng nhập đủ thông tin!");
    db.hopDongs.push({ id: Date.now().toString(), tenCongTy: ten, soHopDong: soHD, giaTriGoc: giaTri }); 
    saveData(); alert("Lưu Hợp đồng thành công!");
    document.getElementById('tenCongTy').value = ''; document.getElementById('soHopDong').value = ''; document.getElementById('giaTriGoc').value = '';
}

function themPhuLuc() {
    if(currentUser.role === 'nhapkho') return alert("Tài khoản Thủ kho không có quyền thực hiện chức năng này!");
    let idHD = document.getElementById('selectHopDongPL').value, loai = document.getElementById('loaiPhuLuc').value, giaTri = Number(document.getElementById('giaTriPhuLuc').value);
    if(!idHD || !giaTri) return alert("Vui lòng chọn Hợp đồng và nhập số tiền!");
    db.phuLucs.push({ idHD: idHD, loai: loai, giaTri: giaTri }); saveData(); alert("Đã lưu Phụ lục!"); document.getElementById('giaTriPhuLuc').value = '';
}

function themHoaDon() {
    let tenCty = document.getElementById('selectCongTyHD').value;
    let soHD = document.getElementById('soHoaDonInput').value;
    let ngayHD = document.getElementById('ngayHoaDon').value;
    let ngayNK = document.getElementById('ngayNhapKho').value;
    let tien = Number(document.getElementById('tienHoaDon').value);
    let gc = document.getElementById('ghiChuHoaDon').value.trim();
    
    if(!tenCty || !soHD || !tien) return alert("Vui lòng chọn Công ty, nhập Số hóa đơn và Số tiền!");
    db.hoaDons.push({ id: Date.now().toString(), tenCongTy: tenCty, idHD: "", soHoaDon: soHD, ngayHoaDon: ngayHD, ngayNhapKho: ngayNK, soTien: tien, ghiChu: gc }); 
    saveData(); 
    alert("Đã lưu Hóa đơn thành công!"); 
    document.getElementById('soHoaDonInput').value = ''; 
    document.getElementById('tienHoaDon').value = '';
    document.getElementById('ghiChuHoaDon').value = '';
}

function parseExcelDate(val) {
    if(!val) return "";
    if(typeof val === 'number') {
        let date = new Date(Math.round((val - 25569) * 86400 * 1000));
        let y = date.getFullYear(); let m = ('0' + (date.getMonth() + 1)).slice(-2); let d = ('0' + date.getDate()).slice(-2);
        return `${y}-${m}-${d}`;
    }
    if(typeof val === 'string') {
        val = val.trim();
        if(val.includes('-') && val.split('-')[0].length === 4) return val; 
        let parts = val.split(/[\/\-]/);
        if(parts.length >= 3) return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
    }
    return "";
}

function nhapTuExcel() {
    if(currentUser.role === 'nhapkho') return alert("Tài khoản Thủ kho chỉ được phép nhập lẻ hóa đơn!");
    let fileInput = document.getElementById('fileExcel');
    if(!fileInput.files.length) return alert("Vui lòng chọn file Excel trước!");
    let reader = new FileReader();
    reader.onload = function(e) {
        let rows = XLSX.utils.sheet_to_json(XLSX.read(new Uint8Array(e.target.result), {type: 'array'}).Sheets[XLSX.read(new Uint8Array(e.target.result), {type: 'array'}).SheetNames[0]], {header: 1, raw: true});
        let countNew = 0, countDup = 0, startIndex = (rows[0] && rows[0].length >= 4 && !isNaN(Number(rows[0][3])) && Number(rows[0][3]) > 0) ? 0 : 1;
        for(let i = startIndex; i < rows.length; i++) {
            let row = rows[i]; if(!row || !row[0]) continue; 
            let tenCty = row[0] ? row[0].toString().trim() : "", soHD = row[1] ? row[1].toString().trim() : "", ngayHD = parseExcelDate(row[2]), soTien = Number(row[3]) || 0, ngayNK = parseExcelDate(row[4]);
            if(!tenCty || !soHD || !soTien) continue;
            let normTenCty = tenCty.trim().toUpperCase(), exists = db.hopDongs.find(x => (x.tenCongTy || '').trim().toUpperCase() === normTenCty);
            if(!exists) db.hopDongs.push({ id: 'HD_EXCEL_' + Date.now() + i, tenCongTy: tenCty, soHopDong: 'Chưa có', giaTriGoc: 0 }); 
            else tenCty = exists.tenCongTy;
            let isDup = db.hoaDons.some(h => h.tenCongTy.trim().toUpperCase() === tenCty.trim().toUpperCase() && h.soHoaDon === soHD && h.soTien === soTien);
            if (isDup) { countDup++; continue; }
            db.hoaDons.push({ id: 'INV_' + Date.now() + i, tenCongTy: tenCty, idHD: "", soHoaDon: soHD, ngayHoaDon: ngayHD, ngayNhapKho: ngayNK, soTien: soTien, ghiChu: "" }); countNew++;
        }
        saveData(); alert(`Đã tải lên mới: ${countNew} hóa đơn.\nBỏ qua: ${countDup} hóa đơn trùng.`); fileInput.value = "";
    };
    reader.readAsArrayBuffer(fileInput.files[0]);
}

function loadSelectOptions() {
    let dsCongTy = [...new Set(db.hopDongs.map(hd => hd.tenCongTy))];
    let optCty = '<option value="">-- Chọn Công ty --</option>';
    dsCongTy.forEach(cty => { optCty += `<option value="${cty}">${cty}</option>`; });
    
    if(document.getElementById('selectCongTyHD')) document.getElementById('selectCongTyHD').innerHTML = optCty; 
    if(document.getElementById('selectCongTyTT')) document.getElementById('selectCongTyTT').innerHTML = optCty;
    
    let optHDPL = '<option value="">-- Chọn Hợp đồng --</option>';
    db.hopDongs.forEach(hd => { optHDPL += `<option value="${hd.id}">${hd.tenCongTy} - HĐ: ${hd.soHopDong}</option>`; });
    if(document.getElementById('selectHopDongPL')) document.getElementById('selectHopDongPL').innerHTML = optHDPL;
    
    if(document.getElementById('filterCongTy')) document.getElementById('filterCongTy').innerHTML = '<option value="ALL">-- Tất cả công ty --</option>' + optCty;
    if(document.getElementById('newUserCompany')) document.getElementById('newUserCompany').innerHTML = optCty;
}

// ------------------------------------------------------------------
// BẢNG DANH SÁCH THANH TOÁN
// ------------------------------------------------------------------
function loadHopDongVaHoaDonTT() {
    let cty = document.getElementById('selectCongTyTT')?.value;
    let container = document.getElementById('khuVucDanhSachThanhToan');
    
    if(!container) return;

    if(!cty) {
        container.innerHTML = '<p style="color: #888; font-style: italic; text-align: center; margin-top: 10px;">Vui lòng chọn công ty ở trên để hiển thị hóa đơn.</p>';
        return;
    }

    let normCty = cty.trim().toUpperCase();
    let dsHoaDon = db.hoaDons.filter(h => (h.tenCongTy || '').trim().toUpperCase() === normCty);

    if(dsHoaDon.length === 0) {
        container.innerHTML = `<p style="text-align:center; color:#dc3545; font-weight:bold; margin-top:10px;">Công ty này hiện chưa có hóa đơn nào!</p>`;
        return;
    }

    dsHoaDon.sort((a, b) => {
        let aPaid = db.thanhToans.some(t => t.idHoaDon === a.id);
        let bPaid = db.thanhToans.some(t => t.idHoaDon === b.id);
        return (aPaid === bPaid) ? 0 : aPaid ? 1 : -1;
    });

    let html = `
    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <thead style="background-color: #007bff; color: white;">
            <tr>
                <th style="padding: 8px; border: 1px solid #ddd; text-align:center; width: 50px;">Chọn</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align:center;">Số HĐ</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align:center;">Ngày HĐ</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align:right;">Số Tiền (VNĐ)</th>
                <th style="padding: 8px; border: 1px solid #ddd; text-align:center;">Tình trạng</th>
            </tr>
        </thead>
        <tbody>
    `;

    let hasUnpaid = false;

    dsHoaDon.forEach(hd => {
        let tt = db.thanhToans.find(t => t.idHoaDon === hd.id);
        
        if(tt) {
            html += `
            <tr style="background-color: #e8f5e9;">
                <td style="padding: 8px; border: 1px solid #ddd; text-align:center;">-</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align:center; font-weight:bold;">${hd.soHoaDon}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align:center;">${formatDate(hd.ngayHoaDon)}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align:right;">${formatTien(hd.soTien)}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align:center;">
                    <span style="color:#28a745; font-weight:bold;">Đã TT (${formatDate(tt.ngay)})</span>
                </td>
            </tr>`;
        } else {
            hasUnpaid = true;
            html += `
            <tr>
                <td style="padding: 8px; border: 1px solid #ddd; text-align:center;">
                    <input type="checkbox" class="chk-thanh-toan" value="${hd.id}" data-tien="${hd.soTien}" onchange="tinhTongTienChon()" style="transform: scale(1.3); cursor: pointer;">
                </td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align:center; font-weight:bold;">${hd.soHoaDon}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align:center;">${formatDate(hd.ngayHoaDon)}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align:right; color:#dc3545; font-weight:bold;">${formatTien(hd.soTien)}</td>
                <td style="padding: 8px; border: 1px solid #ddd; text-align:center; color:#dc3545;">Chưa TT</td>
            </tr>`;
        }
    });

    html += `</tbody></table>`;

    if(hasUnpaid) {
        html += `
        <div style="margin-top: 15px; padding: 12px; background: #f4f8fb; border: 1px solid #b8daff; border-radius: 5px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <span style="font-size: 15px;">Tổng tiền đang chọn: 
                    <strong id="tongTienChonDisplay" style="color: #dc3545; font-size: 18px; margin-left: 5px;">0</strong> <strong>VNĐ</strong>
                </span>
            </div>
            <div style="display: flex; gap: 15px; align-items: center;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <label style="margin: 0; font-weight: bold;">Ngày thanh toán:</label>
                    <input type="date" id="ngayThanhToanChung" style="padding: 6px; border: 1px solid #ccc; border-radius: 4px; outline: none;">
                </div>
                <button onclick="luuThanhToanHangLoat()" style="background:#1D6F42; color:white; border:none; padding:8px 20px; border-radius:4px; cursor:pointer; font-weight:bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">✔️ LƯU THANH TOÁN</button>
            </div>
        </div>`;
    }

    container.innerHTML = html;
}

function tinhTongTienChon() {
    let checkboxes = document.querySelectorAll('.chk-thanh-toan:checked');
    let tong = 0;
    checkboxes.forEach(chk => {
        tong += parseFloat(chk.getAttribute('data-tien')) || 0;
    });
    document.getElementById('tongTienChonDisplay').innerText = formatTien(tong);
}

function luuThanhToanHangLoat() {
    if(currentUser.role === 'nhapkho') return alert("Tài khoản Thủ kho không có quyền thực hiện chức năng này!");
    let checkboxes = document.querySelectorAll('.chk-thanh-toan:checked');
    
    if (checkboxes.length === 0) {
        return alert("Vui lòng tích chọn ít nhất một hóa đơn để thanh toán!");
    }

    let ngayInput = document.getElementById('ngayThanhToanChung').value;
    if (!ngayInput) {
        return alert("Vui lòng nhập Ngày thanh toán!");
    }

    let tongTien = document.getElementById('tongTienChonDisplay').innerText;

    if(confirm(`Bạn có chắc chắn muốn ghi nhận ĐÃ THANH TOÁN cho ${checkboxes.length} hóa đơn được chọn?\n\nTổng số tiền: ${tongTien} VNĐ\nNgày thanh toán: ${formatDate(ngayInput)}`)) {
        checkboxes.forEach(chk => {
            let idHoaDon = chk.value;
            let soTien = parseFloat(chk.getAttribute('data-tien'));
            db.thanhToans.push({ 
                idHoaDon: idHoaDon, 
                soTien: soTien, 
                ngay: ngayInput 
            });
        });
        saveData(); 
        alert("✅ Đã ghi nhận thanh toán thành công!");
        loadHopDongVaHoaDonTT(); 
    }
}

function luuNhanhSoHD(idHoaDon) {
    let inputSoHD = document.getElementById(`soHD_input_${idHoaDon}`);
    if(!inputSoHD) return;
    let soHDMoi = inputSoHD.value.trim();
    
    let index = db.hoaDons.findIndex(h => h.id === idHoaDon);
    if(index !== -1) {
        db.hoaDons[index].idHD_Text = soHDMoi;
        saveData();
        loadDsHopDongNT();
        alert("Đã lưu số hợp đồng thành công!");
        renderTable(); 
    }
}

function luuNhanhGhiChu(idHoaDon) {
    let inputGC = document.getElementById(`ghiChu_input_${idHoaDon}`);
    if(!inputGC) return;
    
    let index = db.hoaDons.findIndex(h => h.id === idHoaDon);
    if(index !== -1) {
        db.hoaDons[index].ghiChu = inputGC.value.trim();
        saveData();
        alert("Đã cập nhật ghi chú thành công!");
        renderTable(); 
    }
}

function renderTable() {
    let isAdmin = currentUser && currentUser.role === 'admin';
    if(document.getElementById('th-thao-tac')) {
        document.getElementById('th-thao-tac').style.display = isAdmin ? 'table-cell' : 'none';
    }

    let locCongTy = document.getElementById('filterCongTy')?.value || 'ALL';
    let filterThangNhap = document.getElementById('filterThangNhap')?.value || '';
    let filterDate = document.getElementById('filterDate')?.value || ''; 
    let fHoaDons = db.hoaDons, fThanhToans = db.thanhToans;

    let filteredHoaDons = [];
    if(currentUser.role === 'user') {
        filteredHoaDons = fHoaDons.filter(hd => hd.tenCongTy === currentUser.company);
    } else {
        filteredHoaDons = (locCongTy !== 'ALL') ? fHoaDons.filter(hd => hd.tenCongTy === locCongTy) : fHoaDons;
    }

    if(filterThangNhap) filteredHoaDons = filteredHoaDons.filter(hd => hd.ngayNhapKho && hd.ngayNhapKho.startsWith(filterThangNhap));
    if(filterDate) filteredHoaDons = filteredHoaDons.filter(hd => hd.ngayHoaDon <= filterDate);

    let groupedByCty = {};
    filteredHoaDons.forEach(hoaDon => {
        let normName = (hoaDon.tenCongTy || 'Lỗi DL').trim().toUpperCase();
        if(!groupedByCty[normName]) groupedByCty[normName] = { displayName: hoaDon.tenCongTy, invoices: [], totalNo: 0 };
        groupedByCty[normName].invoices.push(hoaDon);
    });

    let html = '', tongTatCaNo = 0; 
    Object.keys(groupedByCty).sort().forEach(key => {
        let ctyGroup = groupedByCty[key];
        ctyGroup.invoices.forEach(hoaDon => {
            let hopDong = db.hopDongs.find(hd => hd.id === hoaDon.idHD);
            let valSoHD = hoaDon.idHD_Text || (hopDong ? hopDong.soHopDong : '');
            
            let oNhapSoHD = `<div style="display:flex; gap:5px; align-items:center;">
                    <input type="text" id="soHD_input_${hoaDon.id}" value="${valSoHD}" placeholder="Nhập số..." style="width:110px; padding:4px; border:1px solid #ccc; border-radius:4px;">
                    <button onclick="luuNhanhSoHD('${hoaDon.id}')" style="background:#28a745; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:12px;">Lưu</button>
                </div>`;
                
            let oNhapGhiChu = `<div style="display:flex; gap:5px; align-items:center; min-width:140px;">
                    <input type="text" id="ghiChu_input_${hoaDon.id}" value="${hoaDon.ghiChu || ''}" placeholder="..." style="flex:1; padding:4px; border:1px solid #ccc; border-radius:4px;">
                    <button onclick="luuNhanhGhiChu('${hoaDon.id}')" style="background:#28a745; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:12px;">Lưu</button>
                </div>`;
            
            let gdThanhToan = fThanhToans.filter(tt => tt.idHoaDon === hoaDon.id), daThanhToan = gdThanhToan.length > 0;
            
            if (!daThanhToan) { 
                ctyGroup.totalNo += hoaDon.soTien; 
                tongTatCaNo += hoaDon.soTien; 
            }
            
            let btnXoaHoaDon = isAdmin ? `<td class="text-center"><button onclick="xoaHoaDon('${hoaDon.id}')" style="background:#dc3545; color:white; border:none; padding:4px 6px; border-radius:3px; cursor:pointer; font-size:11px;" title="Xóa Hóa đơn này">❌</button></td>` : '';
            
            html += `<tr>
                <td><strong>${ctyGroup.displayName}</strong></td>
                <td>${oNhapSoHD}</td>
                <td>${hoaDon.soHoaDon}</td>
                <td class="text-center">${formatDate(hoaDon.ngayHoaDon)}</td>
                <td class="text-center" style="color:#1D6F42;font-weight:bold;">${formatDate(hoaDon.ngayNhapKho)}</td>
                <td class="text-right"><strong>${formatTien(hoaDon.soTien)}</strong></td>
                <td class="text-center">${daThanhToan ? formatDate(gdThanhToan[gdThanhToan.length-1].ngay) : '-'}</td>
                <td class="text-center">${daThanhToan ? 'Đã TT' : 'Chưa TT'}</td>
                <td>${oNhapGhiChu}</td>
                ${btnXoaHoaDon}
            </tr>`;
        });
        
        if (ctyGroup.totalNo > 0) {
            let colEmpty = isAdmin ? 4 : 3;
            html += `<tr style="background:#f4f8fb;"><td colspan="5" class="text-right bold" style="color:#0056b3;">Tổng nợ ${ctyGroup.displayName}:</td><td class="text-right text-danger bold">${formatTien(ctyGroup.totalNo)}</td><td colspan="${colEmpty}"></td></tr>`;
        }
    });
    
    if(filteredHoaDons.length === 0) html = `<tr><td colspan="10" class="text-center">Chưa có dữ liệu</td></tr>`;
    if(document.getElementById('bangTheoDoi')) document.getElementById('bangTheoDoi').innerHTML = html;
    
    if(document.getElementById('bangTheoDoiFoot')) {
        let colEmpty = isAdmin ? 4 : 3;
        document.getElementById('bangTheoDoiFoot').innerHTML = `<tr><td colspan="5" class="text-right bold" style="font-size:15px; color:#1D6F42;">TỔNG NỢ CÒN LẠI:</td><td class="text-right text-danger bold" style="font-size:16px;">${formatTien(tongTatCaNo)}</td><td colspan="${colEmpty}"></td></tr>`;
    }
}

// ==========================================
// HÀM IN BÁO CÁO CÔNG NỢ PDF & EXCEL
// ==========================================
function getInBaoCaoStyle() {
    return `
    <style>
        @media print { @page { size: A4; margin: 15mm; } }
        body { font-family: "Times New Roman", Times, serif; font-size: 13px; color: #000; }
        .print-container { width: 100%; }
        .header-table { width: 100%; margin-bottom: 20px; border: none; }
        .header-table td { border: none; }
        .report-title { text-align: center; text-transform: uppercase; font-size: 18px; font-weight: bold; margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
        th, td { border: 1px solid black; padding: 6px 4px; line-height: 1.4; }
        th { background-color: #f2f2f2; text-align: center; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .text-left { text-align: left; }
        .bold { font-weight: bold; }
        .group-row { background-color: #f9f9f9; font-weight: bold; }
        .footer-sig { margin-top: 30px; width: 100%; border: none; }
        .footer-sig td { border: none; text-align: center; width: 50%; }
    </style>`;
}

function inBaoCaoTongHop() {
    let filtered = (currentUser.role === 'user') ? db.hoaDons.filter(h => h.tenCongTy === currentUser.company) : db.hoaDons;
    let grouped = {};
    filtered.forEach(h => {
        if(!grouped[h.tenCongTy]) grouped[h.tenCongTy] = { total: 0, invoices: [] };
        let isPaid = db.thanhToans.some(t => t.idHoaDon === h.id);
        if(!isPaid) {
            grouped[h.tenCongTy].total += h.soTien;
            grouped[h.tenCongTy].invoices.push(h);
        }
    });

    let rows = '', grandTotal = 0;
    Object.keys(grouped).sort().forEach(cty => {
        if(grouped[cty].total === 0) return;
        grandTotal += grouped[cty].total;
        rows += `
            <tr class="group-row">
                <td colspan="3">${cty}</td>
                <td class="text-right">${formatTien(grouped[cty].total)}</td>
                <td class="text-center">Chưa thanh toán</td>
            </tr>`;
        grouped[cty].invoices.forEach(inv => {
            rows += `
                <tr>
                    <td style="padding-left: 20px;">+ Số HĐơn: ${inv.soHoaDon}</td>
                    <td class="text-center">${formatDate(inv.ngayHoaDon)}</td>
                    <td class="text-right">${formatTien(inv.soTien)}</td>
                    <td></td>
                    <td class="text-left">${inv.ghiChu || ''}</td>
                </tr>`;
        });
    });

    let content = `
        ${getInBaoCaoStyle()}
        <div class="print-container">
            <table class="header-table">
                <tr>
                    <td width="50%" class="text-center"><strong>TRUNG TÂM Y TẾ KHU VỰC HÀM THUẬN BẮC</strong><br>PHÒNG TÀI CHÍNH KẾ TOÁN</td>
                    <td class="text-center"><strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br>Độc lập - Tự do - Hạnh phúc</td>
                </tr>
            </table>
            <div class="report-title">BÁO CÁO TỔNG HỢP CÔNG NỢ PHẢI TRẢ</div>
            <p class="text-right"><i>Ngày in: ${new Date().toLocaleDateString('vi-VN')}</i></p>
            <table>
                <thead>
                    <tr>
                        <th>Đơn vị / Hóa đơn</th>
                        <th>Ngày HĐ</th>
                        <th>Số tiền</th>
                        <th>Tổng nợ đơn vị</th>
                        <th>Ghi chú</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
                <tfoot>
                    <tr class="bold" style="font-size: 15px;">
                        <td colspan="3" class="text-right">TỔNG CỘNG NỢ PHẢI TRẢ:</td>
                        <td class="text-right" style="color: red;">${formatTien(grandTotal)}</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
            <table class="footer-sig">
                <tr>
                    <td><strong>NGƯỜI LẬP BIỂU</strong></td>
                    <td><strong>TRƯỞNG PHÒNG TCKT</strong></td>
                </tr>
                <tr style="height: 80px;"><td></td><td></td></tr>
                <tr><td>${currentUser.username.toUpperCase()}</td><td></td></tr>
            </table>
        </div>`;
    
    document.getElementById('print-section').innerHTML = content;
    window.print();
}

function inBaoCaoChiTiet() {
    let locCty = document.getElementById('filterCongTy').value;
    let filtered = (currentUser.role === 'user') 
        ? db.hoaDons.filter(h => h.tenCongTy === currentUser.company)
        : (locCty !== 'ALL' ? db.hoaDons.filter(h => h.tenCongTy === locCty) : db.hoaDons);

    let grouped = {};
    filtered.forEach(h => {
        let hopDong = db.hopDongs.find(hd => hd.id === h.idHD);
        let labelHD = h.idHD_Text || (hopDong ? hopDong.soHopDong : 'Hóa đơn ngoài HĐ');
        let key = h.tenCongTy + "|||" + labelHD;
        
        if(!grouped[key]) grouped[key] = { cty: h.tenCongTy, hd: labelHD, items: [], subTotal: 0 };
        let isPaid = db.thanhToans.some(t => t.idHoaDon === h.id);
        if(!isPaid) {
            grouped[key].subTotal += h.soTien;
            grouped[key].items.push(h);
        }
    });

    let rows = '', grandTotal = 0;
    Object.keys(grouped).sort().forEach(k => {
        let g = grouped[k];
        if(g.items.length === 0) return;
        grandTotal += g.subTotal;
        rows += `<tr class="group-row"><td colspan="7">${g.cty} - HĐ: ${g.hd}</td></tr>`;
        g.items.forEach(inv => {
            rows += `
                <tr>
                    <td class="text-center">${inv.soHoaDon}</td>
                    <td class="text-center">${formatDate(inv.ngayHoaDon)}</td>
                    <td class="text-center">${formatDate(inv.ngayNhapKho)}</td>
                    <td class="text-right">${formatTien(inv.soTien)}</td>
                    <td class="text-center">Chưa thanh toán</td>
                    <td class="text-right">${formatTien(inv.soTien)}</td>
                    <td class="text-left">${inv.ghiChu || ''}</td>
                </tr>`;
        });
        rows += `<tr class="bold"><td colspan="5" class="text-right">Cộng nợ Hợp đồng:</td><td class="text-right">${formatTien(g.subTotal)}</td><td></td></tr>`;
    });

    let content = `
        ${getInBaoCaoStyle()}
        <div class="print-container">
            <table class="header-table">
                <tr>
                    <td width="50%" class="text-center"><strong>TRUNG TÂM Y TẾ KHU VỰC HÀM THUẬN BẮC</strong><br>PHÒNG TÀI CHÍNH KẾ TOÁN</td>
                    <td class="text-center"><strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br>Độc lập - Tự do - Hạnh phúc</td>
                </tr>
            </table>
            <h2 class="report-title">BÁO CÁO CHI TIẾT CÔNG NỢ THEO HỢP ĐỒNG</h2>
            <p class="text-center">Đối tượng: ${locCty === 'ALL' ? 'Tất cả đối tác' : locCty}</p>
            <p class="text-right"><i>Ngày in: ${new Date().toLocaleDateString('vi-VN')}</i></p>
            <table>
                <thead>
                    <tr>
                        <th>Số HĐơn</th>
                        <th>Ngày HĐ</th>
                        <th>Ngày nhập</th>
                        <th>Số tiền</th>
                        <th>Trạng thái</th>
                        <th>Còn nợ</th>
                        <th>Ghi chú</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
                <tfoot>
                    <tr class="bold" style="background: #eee; font-size: 14px;">
                        <td colspan="5" class="text-right">TỔNG CỘNG DƯ NỢ:</td>
                        <td class="text-right" style="color: red;">${formatTien(grandTotal)}</td>
                        <td></td>
                    </tr>
                </tfoot>
            </table>
            <table class="footer-sig">
                <tr>
                    <td><strong>NGƯỜI LẬP BIỂU</strong></td>
                    <td><strong>TRƯỞNG PHÒNG TCKT</strong></td>
                </tr>
                <tr style="height: 80px;"><td></td><td></td></tr>
                <tr><td>${currentUser.username.toUpperCase()}</td><td></td></tr>
            </table>
        </div>`;
    
    document.getElementById('print-section').innerHTML = content;
    window.print();
}

// ==========================================
// 4. LOGIC BIÊN BẢN NGHIỆM THU (TAB 4)
// ==========================================
function taiMauExcelBenA() {
    let ws = XLSX.utils.aoa_to_sheet([
        ["Trường dữ liệu", "Giá trị nhập"], 
        ["Tên Bên A", "TRUNG TÂM Y TẾ KHU VỰC HÀM THUẬN BẮC"], 
        ["Địa chỉ", "Km 17 Đường 8/4, Thôn Lâm Hòa, xã Hàm Thuận, tỉnh Lâm Đồng"], 
        ["Điện thoại", "0252. 3611812 - Fax: 0252. 3610675"], 
        ["Email", "ytehamthuanbac@gmail.com"], 
        ["Tài khoản", "3716.2.1030529.00000 ; 9527.2.1030529"], 
        ["Giao dịch tại", "KBNN Khu vực XVI - PGD số 12"], 
        ["Mã số thuế", "3400517197"], 
        ["Mã ĐVQHNS", "1030529"], 
        ["Đại diện", "TRẦN GIAO HÙNG"], 
        ["Chức vụ", "Giám Đốc"]
    ]);
    let wb = XLSX.utils.book_new(); 
    XLSX.utils.book_append_sheet(wb, ws, "ThongTinBenA");
    XLSX.writeFile(wb, "Mau_Thong_Tin_Ben_A.xlsx");
}

function taiMauExcelHoaDonNT() {
    let ws = XLSX.utils.aoa_to_sheet([
        ["Số hóa đơn", "Ngày hóa đơn", "Tên hàng hóa, dịch vụ", "ĐVT", "Số lượng", "Đơn giá", "Thành tiền"], 
        ["0001234", "15/04/2026", "Thuốc Paracetamol 500mg", "Viên", 1000, 500, 500000],
        ["0001235", "16/04/2026", "Bơm kim tiêm 5ml", "Cái", 500, 1200, 600000]
    ]);
    let wb = XLSX.utils.book_new(); 
    XLSX.utils.book_append_sheet(wb, ws, "BangKeHoaDon");
    XLSX.writeFile(wb, "Mau_Bang_Ke_Hoa_Don_NT.xlsx");
}

function xuatFileWordBBNT() {
    let printDiv = document.getElementById("ban-in-nghiem-thu");
    let cloneDiv = printDiv.cloneNode(true);
    let imgs = cloneDiv.getElementsByTagName('img');
    if(imgs.length > 0) {
        let imgThucTe = printDiv.getElementsByTagName('img')[0];
        try {
            let canvas = document.createElement('canvas');
            canvas.width = imgThucTe.naturalWidth || 60;
            canvas.height = imgThucTe.naturalHeight || 60;
            let ctx = canvas.getContext('2d');
            ctx.drawImage(imgThucTe, 0, 0);
            let dataURL = canvas.toDataURL('image/png');
            imgs[0].src = dataURL; 
            imgs[0].setAttribute('width', '60');
            imgs[0].setAttribute('height', '60');
        } catch(e) {
            console.log("Không thể convert ảnh sang base64 do lỗi chính sách bảo mật trình duyệt.");
        }
    }

    let htmlContent = cloneDiv.innerHTML;
    let preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Biên Bản Nghiệm Thu</title><style>@page Section1 { size: 595.3pt 841.9pt; margin: 56.7pt 56.7pt 56.7pt 56.7pt; mso-header-margin: 35.4pt; mso-footer-margin: 35.4pt; mso-paper-source: 0; } div.Section1 { page: Section1; } body { font-family: 'Times New Roman', serif; font-size: 14pt; } table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid black; padding: 5px; text-align: left; } .bold-nt { font-weight: bold; }</style></head><body><div class='Section1'>";
    let postHtml = "</div></body></html>";
    let sourceHTML = preHtml + htmlContent + postHtml;
    
    let blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement("a");
    a.href = url;
    a.download = `BienBanNghiemThu_${document.getElementById('inpSoBBNT').value || 'Moi'}.doc`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}

// Tính năng xuất Excel cho BBNT
function xuatExcelBBNT() {
    let recordId = getCurrentBBNTId();
    let r = recordId ? nghiemThuDB[recordId] : null;

    // Tương thích trường hợp dữ liệu cũ: nếu chưa có ID đang chọn thì dò theo tên hiển thị
    if(!r) {
        let name = document.getElementById('inpTenBBNT').value.trim();
        let found = findBBNTRecordByName(name);
        if(found) {
            recordId = found.id;
            r = found.record;
            setCurrentBBNTId(recordId);
        }
    }

    if(!r) return alert("Vui lòng lưu hoặc chọn một biên bản từ danh sách trước khi xuất Excel!");

    let data = [];
    data.push(["CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"]);
    data.push(["Độc lập - Tự do - Hạnh phúc"]);
    data.push([]);
    data.push(["BIÊN BẢN NGHIỆM THU HÀNG HÓA"]);
    data.push([`Số: ${r.soBBNT || ''}`]);
    data.push([]);
    data.push([`Căn cứ Quyết định số ${r.soQD || ''} của ${r.donViQD || ''} ${r.noiDungQD || ''}`]);
    data.push([`Căn cứ Hợp đồng số: ${r.soHD || ''} ngày ${r.ngayHD || ''} ${r.phuLuc ? 'và phụ lục ' + r.phuLuc : ''} giữa TTYT Khu vực Hàm Thuận Bắc và ${r.tenBenB || ''}`]);
    data.push([]);
    data.push(["ĐẠI DIỆN BÊN A (CHỦ ĐẦU TƯ): TTYT KHU VỰC HÀM THUẬN BẮC"]);
    data.push(["Địa chỉ:", benA.diaChi]);
    data.push(["Điện thoại:", benA.sdt]);
    data.push(["Đại diện:", benA.daiDien, "Chức vụ:", benA.chucVu]);
    data.push([]);
    data.push([`ĐẠI DIỆN BÊN B (NHÀ THẦU): ${r.tenBenB || ''}`]);
    data.push(["Địa chỉ:", r.diaChiB || '']);
    data.push(["Điện thoại:", r.sdtB || '']);
    data.push(["Đại diện:", r.daiDienB || '', "Chức vụ:", r.chucVuB || '']);
    data.push([]);
    data.push(["NỘI DUNG NGHIỆM THU:"]);
    data.push(["STT", "Số HĐ", "Ngày HĐ", "Hàng hóa", "ĐVT", "SL", "Đơn giá", "Thành tiền"]);

    let total = 0;
    let list = r.excelData || [];
    list.forEach(item => {
        total += Number(item.thanhTien) || 0;
        data.push([
            item.stt, item.soHD, formatDate(item.ngayHD), item.tenHang, item.dvt, item.sl, item.gia, item.thanhTien
        ]);
    });

    data.push(["", "", "", "", "", "", "Tổng cộng:", total]);
    data.push([`Số tiền bằng chữ: ${docTienBangChuNT(total)}`]);
    data.push([]);
    data.push(["ĐẠI DIỆN BÊN A", "", "", "", "ĐẠI DIỆN BÊN B"]);

    let ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{wch: 5}, {wch: 15}, {wch: 15}, {wch: 40}, {wch: 10}, {wch: 10}, {wch: 15}, {wch: 15}];
    
    let wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "BBNT");

    XLSX.writeFile(wb, `BienBanNghiemThu_${getExcelTimestamp()}.xlsx`);
}

function renderBenANT() {
    if(document.getElementById('docTenBenA_TitleNT')) document.getElementById('docTenBenA_TitleNT').innerText = benA.ten; 
    if(document.getElementById('docTenBenA_CCTNT')) document.getElementById('docTenBenA_CCTNT').innerText = benA.ten.toLowerCase(); 
    if(document.getElementById('docTenBenANT')) document.getElementById('docTenBenANT').innerText = benA.ten;
    if(document.getElementById('docDiaChiANT')) document.getElementById('docDiaChiANT').innerText = benA.diaChi; 
    if(document.getElementById('docSDTANT')) document.getElementById('docSDTANT').innerText = benA.sdt; 
    if(document.getElementById('docEmailANT')) document.getElementById('docEmailANT').innerText = benA.email;
    if(document.getElementById('docTKANT')) document.getElementById('docTKANT').innerText = benA.tk; 
    if(document.getElementById('docGiaoDichANT')) document.getElementById('docGiaoDichANT').innerText = benA.giaoDich; 
    if(document.getElementById('docMSTANT')) document.getElementById('docMSTANT').innerText = benA.mst;
    if(document.getElementById('docMaDVANT')) document.getElementById('docMaDVANT').innerText = benA.maDV; 
    if(document.getElementById('docDaiDienANT')) document.getElementById('docDaiDienANT').innerText = benA.daiDien; 
    if(document.getElementById('docChucVuANT')) document.getElementById('docChucVuANT').innerText = benA.chucVu; 
    if(document.getElementById('docDaiDienA_KyNT')) document.getElementById('docDaiDienA_KyNT').innerText = benA.daiDien;
    if(document.getElementById('docChucVuA_KyNT')) document.getElementById('docChucVuA_KyNT').innerText = benA.chucVu;
}

function docFileExcelBenA() {
    let fileInput = document.getElementById('fileExcelBenA');
    if(!fileInput.files.length) return alert("Chọn file Excel thông tin Bên A trước!");
    let reader = new FileReader();
    reader.onload = function(e) {
        let rows = XLSX.utils.sheet_to_json(XLSX.read(new Uint8Array(e.target.result), {type: 'array'}).Sheets[XLSX.read(new Uint8Array(e.target.result), {type: 'array'}).SheetNames[0]], {header: 1, raw: true});
        for(let i=0; i<rows.length; i++) {
            if(!rows[i] || !rows[i][0] || rows[i][1]===undefined) continue;
            let key = rows[i][0].toString().toLowerCase(), val = rows[i][1].toString().trim();
            if(key.includes('tên')) benA.ten = val; else if(key.includes('địa chỉ')) benA.diaChi = val;
            else if(key.includes('điện thoại')||key.includes('sđt')||key.includes('fax')) benA.sdt = val; else if(key.includes('email')) benA.email = val;
            else if(key.includes('tài khoản')) benA.tk = val; else if(key.includes('giao dịch')||key.includes('kbnn')) benA.giaoDich = val;
            else if(key.includes('thuế')||key.includes('mst')) benA.mst = val; else if(key.includes('đvq')||key.includes('mã đv')) benA.maDV = val;
            else if(key.includes('đại diện')) benA.daiDien = val; else if(key.includes('chức vụ')) benA.chucVu = val;
        }
        database.ref('thongTinBenA_v1').set(benA); alert("Đã cập nhật Bên A lên máy chủ thành công!"); fileInput.value = "";
    };
    reader.readAsArrayBuffer(fileInput.files[0]);
}

function userCanSeeCompanyNT(companyName) {
    if(!currentUser || currentUser.role === 'admin' || currentUser.role === 'nhapkho') return true;
    return normalizeTextNT(companyName) === normalizeTextNT(currentUser.company);
}

function isValidContractNumberNT(soHopDong) {
    let text = (soHopDong || '').toString().trim();
    if(!text) return false;
    let norm = normalizeTextNT(text);
    return !['CHƯA CÓ', 'CHUA CO', 'KHÔNG CÓ', 'KHONG CO', 'HÓA ĐƠN NGOÀI HĐ', 'HOA DON NGOAI HD'].includes(norm);
}

function getInvoiceContractNumberNT(inv) {
    let soHDText = (inv?.idHD_Text || '').toString().trim();
    if(isValidContractNumberNT(soHDText)) return soHDText;
    let hopDong = db.hopDongs.find(hd => hd.id === inv?.idHD);
    let soHopDong = hopDong ? (hopDong.soHopDong || '').toString().trim() : '';
    return isValidContractNumberNT(soHopDong) ? soHopDong : '';
}

function makeContractKeyNT(companyName, soHopDong) {
    return normalizeTextNT(companyName) + '||' + normalizeTextNT(soHopDong);
}

function getCompanyContractsForNT() {
    let map = new Map();

    db.hopDongs.forEach(hd => {
        let tenCongTy = (hd.tenCongTy || '').toString().trim();
        let soHopDong = (hd.soHopDong || '').toString().trim();
        if(!tenCongTy || !isValidContractNumberNT(soHopDong) || !userCanSeeCompanyNT(tenCongTy)) return;
        let key = makeContractKeyNT(tenCongTy, soHopDong);
        if(!map.has(key)) {
            map.set(key, {
                type: 'contract',
                value: 'HD::' + encodeURIComponent(hd.id),
                tenCongTy,
                soHopDong,
                source: 'Danh mục HĐ'
            });
        }
    });

    db.hoaDons.forEach(inv => {
        let tenCongTy = (inv.tenCongTy || '').toString().trim();
        let soHopDong = getInvoiceContractNumberNT(inv);
        if(!tenCongTy || !isValidContractNumberNT(soHopDong) || !userCanSeeCompanyNT(tenCongTy)) return;
        let key = makeContractKeyNT(tenCongTy, soHopDong);
        if(!map.has(key)) {
            map.set(key, {
                type: 'invoice',
                value: 'INV::' + encodeURIComponent(tenCongTy) + '::' + encodeURIComponent(soHopDong),
                tenCongTy,
                soHopDong,
                source: 'Từ hóa đơn'
            });
        }
    });

    return Array.from(map.values()).sort((a, b) => {
        let c = a.tenCongTy.localeCompare(b.tenCongTy, 'vi');
        if(c !== 0) return c;
        return a.soHopDong.localeCompare(b.soHopDong, 'vi', { numeric: true });
    });
}

function findContractValueByCompanyAndNumberNT(companyName, soHopDong) {
    let key = makeContractKeyNT(companyName, soHopDong);
    let item = getCompanyContractsForNT().find(x => makeContractKeyNT(x.tenCongTy, x.soHopDong) === key);
    return item ? item.value : '';
}

function parseSelectedContractNT(value) {
    if(!value) return null;
    if(value.startsWith('HD::')) {
        let id = decodeURIComponent(value.replace('HD::', ''));
        let hd = db.hopDongs.find(x => x.id === id);
        if(!hd) return null;
        return {
            type: 'contract',
            idHD: hd.id,
            tenCongTy: hd.tenCongTy || '',
            soHopDong: hd.soHopDong || ''
        };
    }
    if(value.startsWith('INV::')) {
        let parts = value.split('::');
        return {
            type: 'invoice',
            idHD: '',
            tenCongTy: decodeURIComponent(parts[1] || ''),
            soHopDong: decodeURIComponent(parts[2] || '')
        };
    }

    // Tương thích kiểu cũ: value chính là id hợp đồng
    let hd = db.hopDongs.find(x => x.id === value);
    return hd ? { type: 'contract', idHD: hd.id, tenCongTy: hd.tenCongTy || '', soHopDong: hd.soHopDong || '' } : null;
}

function getLatestBenBInfoNT(companyName) {
    let normCty = normalizeTextNT(companyName);
    if(!normCty) return null;

    let candidates = getBBNTEntries()
        .map(([id, r]) => r)
        .filter(r => normalizeTextNT(r.tenBenB) === normCty)
        .filter(r => r.diaChiB || r.sdtB || r.tkB || r.mstB || r.daiDienB || r.chucVuB || r.guq);

    if(candidates.length === 0) return null;
    candidates.sort((a, b) => {
        let timeA = Date.parse(a.updatedAt || a.createdAt || a.ngayKy || '') || 0;
        let timeB = Date.parse(b.updatedAt || b.createdAt || b.ngayKy || '') || 0;
        return timeB - timeA;
    });
    return candidates[0];
}

function applyBenBInfoNT(info, forceOverwrite = false) {
    if(!info) return false;
    const map = {
        inpDiaChiBNT: info.diaChiB,
        inpSDTBNT: info.sdtB,
        inpTKBNT: info.tkB,
        inpMSTBNT: info.mstB,
        inpDaiDienBNT: info.daiDienB,
        inpChucVuBNT: info.chucVuB,
        inpGUQNT: info.guq
    };

    let changed = false;
    Object.entries(map).forEach(([id, value]) => {
        let el = document.getElementById(id);
        if(!el || value === undefined || value === null || value === '') return;
        if(forceOverwrite || !el.value) {
            el.value = value;
            changed = true;
        }
    });
    return changed;
}

function layLaiThongTinBenBNT(forceOverwrite = true) {
    let tenCongTy = document.getElementById('inpTenBenBNT')?.value || '';
    let info = getLatestBenBInfoNT(tenCongTy);
    if(!info) return alert('Chưa tìm thấy thông tin Bên B đã lưu trước đây cho công ty này.');
    applyBenBInfoNT(info, forceOverwrite);
    updateDocNT();
    alert('Đã lấy lại thông tin Bên B từ biên bản đã lưu trước đó.');
}

function loadDsHopDongNT() {
    let html = '<option value="">-- Chọn Công ty / Hợp đồng --</option>';
    let list = getCompanyContractsForNT();

    list.forEach(item => {
        let sourceLabel = item.source === 'Từ hóa đơn' ? ' • từ hóa đơn' : '';
        html += `<option value="${item.value}">${escapeHtmlNT(item.tenCongTy)} - HĐ: ${escapeHtmlNT(item.soHopDong)}${sourceLabel}</option>`;
    });

    if(list.length === 0) html += '<option value="" disabled>Chưa có hợp đồng/số hợp đồng nào theo công ty</option>';

    let select = document.getElementById('selectHopDongNT');
    if(select) {
        let oldValue = select.value;
        select.innerHTML = html;
        if(oldValue && Array.from(select.options).some(opt => opt.value === oldValue)) select.value = oldValue;
        if(window.$ && $.fn.select2) {
            try { $(select).trigger('change.select2'); } catch(e) {}
        }
    }
}

function autoFillContractNT() {
    let selectValue = document.getElementById('selectHopDongNT')?.value;
    let info = parseSelectedContractNT(selectValue);
    if(!info) return;

    let tenBenBEl = document.getElementById('inpTenBenBNT');
    let oldTenBenB = tenBenBEl?.value || '';
    let changedCompany = normalizeTextNT(oldTenBenB) !== normalizeTextNT(info.tenCongTy);

    if(tenBenBEl) tenBenBEl.value = info.tenCongTy;
    if(document.getElementById('inpSoHDNT')) document.getElementById('inpSoHDNT').value = info.soHopDong;

    let latestBenB = getLatestBenBInfoNT(info.tenCongTy);
    if(latestBenB) applyBenBInfoNT(latestBenB, changedCompany);

    updateDocNT();
}

function updateDocNT() {
    let dateVal = document.getElementById('inpNgayKyNT')?.value;
    if(document.getElementById('docNgayKyNT')) document.getElementById('docNgayKyNT').innerText = dateVal ? `${('0'+new Date(dateVal).getDate()).slice(-2)} tháng ${('0'+(new Date(dateVal).getMonth()+1)).slice(-2)} năm ${new Date(dateVal).getFullYear()}` : "..... tháng ..... năm 202...";
    
    if(document.getElementById('docSoBBNT')) document.getElementById('docSoBBNT').innerText = document.getElementById('inpSoBBNT')?.value || '.......';
    if(document.getElementById('docSoQDNT')) document.getElementById('docSoQDNT').innerText = document.getElementById('inpSoQDNT')?.value;
    if(document.getElementById('docDonViQDNT')) document.getElementById('docDonViQDNT').innerText = document.getElementById('inpDonViQDNT')?.value;
    if(document.getElementById('docNoiDungQDNT')) document.getElementById('docNoiDungQDNT').innerText = document.getElementById('inpNoiDungQDNT')?.value;
    if(document.getElementById('docSoHDNT')) document.getElementById('docSoHDNT').innerText = document.getElementById('inpSoHDNT')?.value;
    if(document.getElementById('docNgayHDNT')) document.getElementById('docNgayHDNT').innerText = document.getElementById('inpNgayHDNT')?.value;
    
    let pl = document.getElementById('inpPhuLucNT')?.value.trim() || '';
    if(document.getElementById('docPhuLucNT')) document.getElementById('docPhuLucNT').innerHTML = pl ? ` và phụ lục hợp đồng số <span class="bold-nt">${pl}</span>` : "";
    
    let tenB = document.getElementById('inpTenBenBNT')?.value || '';
    if(document.getElementById('docTenBenB1NT')) document.getElementById('docTenBenB1NT').innerText = tenB; 
    if(document.getElementById('docTenBenB2NT')) document.getElementById('docTenBenB2NT').innerText = tenB;
    if(document.getElementById('docDiaChiBNT')) document.getElementById('docDiaChiBNT').innerText = document.getElementById('inpDiaChiBNT')?.value || ''; 
    if(document.getElementById('docSDTBNT')) document.getElementById('docSDTBNT').innerText = document.getElementById('inpSDTBNT')?.value || '';
    if(document.getElementById('docTKBNT')) document.getElementById('docTKBNT').innerText = document.getElementById('inpTKBNT')?.value || ''; 
    if(document.getElementById('docMSTBNT')) document.getElementById('docMSTBNT').innerText = document.getElementById('inpMSTBNT')?.value || '';
    
    let guq = document.getElementById('inpGUQNT')?.value.trim() || '';
    if(document.getElementById('rowGUQNT')) document.getElementById('rowGUQNT').style.display = guq ? 'table-row' : 'none';
    if(document.getElementById('docGUQNT')) document.getElementById('docGUQNT').innerText = guq;
    
    let daiDien = document.getElementById('inpDaiDienBNT')?.value || '', chucVu = document.getElementById('inpChucVuBNT')?.value || '';
    if(document.getElementById('docDaiDienBNT')) document.getElementById('docDaiDienBNT').innerText = daiDien; 
    if(document.getElementById('docDaiDienB_KyNT')) document.getElementById('docDaiDienB_KyNT').innerText = daiDien;
    if(document.getElementById('docChucVuBNT')) document.getElementById('docChucVuBNT').innerText = chucVu; 
    if(document.getElementById('docChucVuB_KyNT')) document.getElementById('docChucVuB_KyNT').innerText = chucVu;
}

function docTienBangChuNT(soTien) {
    if (soTien === 0) return "Không đồng.";
    const ms = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
    function d3(so) {
        let t = Math.floor(so/100), c = Math.floor((so%100)/10), d = so%10, k = "";
        if(t>0) k+=ms[t]+" trăm "; if(c>1) k+=ms[c]+" mươi "; else if(c===1) k+="mười "; else if(c===0&&d>0&&t>0) k+="lẻ ";
        if(d===1&&c>1) k+="mốt"; else if(d===5&&c>0) k+="lăm"; else if(d>0) k+=ms[d]; return k.trim();
    }
    let ty = Math.floor(soTien/1000000000), tr = Math.floor((soTien%1000000000)/1000000), ng = Math.floor((soTien%1000000)/1000), dg = soTien%1000, s="";
    if(ty>0) s+=d3(ty)+" tỷ "; if(tr>0) s+=d3(tr)+" triệu "; if(ng>0) s+=d3(ng)+" ngàn "; if(dg>0) s+=d3(dg);
    s = s.trim()+" đồng."; return s.charAt(0).toUpperCase()+s.slice(1);
}

function docFileExcelNT() {
    let fileInput = document.getElementById('fileExcelNT');
    if(!fileInput.files.length) return alert("Chọn file Excel Hóa đơn trước!");
    let reader = new FileReader();
    reader.onload = function(e) {
        let rows = XLSX.utils.sheet_to_json(XLSX.read(new Uint8Array(e.target.result), {type: 'array'}).Sheets[XLSX.read(new Uint8Array(e.target.result), {type: 'array'}).SheetNames[0]], {header: 1, raw: true});
        currentExcelDataNT = []; let stt = 1;
        for(let i=1; i<rows.length; i++) {
            let row = rows[i]; if(!row || !row[0]) continue; 
            let shd=row[0]||"", nhd=parseExcelDate(row[1]), th=row[2]||"", dvt=row[3]||"", sl=Number(row[4])||0, g=Number(row[5])||0, tt=Number(row[6])||(sl*g);
            currentExcelDataNT.push({stt: stt++, soHD: shd, ngayHD: nhd, tenHang: th, dvt: dvt, sl: sl, gia: g, thanhTien: tt});
        }
        renderTableDataNT(); alert("Đã tải dữ liệu bảng Hóa đơn thành công!"); fileInput.value = ""; 
    };
    reader.readAsArrayBuffer(fileInput.files[0]);
}

function renderTableDataNT() {
    let tbody = "", tong = 0;
    currentExcelDataNT.forEach(i => { 
        tong += i.thanhTien; 
        
        tbody += `<tr>
            <td class="text-center">${i.stt}</td>
            <td class="text-center">${i.soHD}</td>
            <td class="text-center">${formatDate(i.ngayHD)}</td>
            <td class="text-left">${i.tenHang}</td>
            <td class="text-center">${i.dvt}</td>
            <td class="text-right">${formatTien(i.sl)}</td>
            <td class="text-right">${formatTien(i.gia)}</td>
            <td class="text-right">${formatTien(i.thanhTien)}</td>
        </tr>`; 
    });
    
    if(currentExcelDataNT.length === 0) {
        tbody = `<tr><td colspan="8" style="text-align:center;font-style:italic;">(Chưa có dữ liệu)</td></tr>`;
    } else {
        tbody += `<tr><td colspan="7" class="text-right bold-nt" style="padding-right: 10px;">Tổng cộng:</td><td class="text-right bold-nt">${formatTien(tong)}</td></tr>`;
    }
    
    if(document.getElementById('chiTietHoaDonNT')) document.getElementById('chiTietHoaDonNT').innerHTML = tbody;
    if(document.getElementById('tongTienBangChuNT')) document.getElementById('tongTienBangChuNT').innerText = docTienBangChuNT(tong);
}


function escapeHtmlNT(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeTextNT(value) {
    return String(value ?? '')
        .trim()
        .replace(/\s+/g, ' ')
        .toUpperCase();
}

function getCurrentBBNTId() {
    let el = document.getElementById('inpTenBBNT');
    return currentBBNTId || el?.dataset?.recordId || null;
}

function setCurrentBBNTId(id) {
    currentBBNTId = id || null;
    let tenEl = document.getElementById('inpTenBBNT');
    if(tenEl) {
        tenEl.dataset.recordId = currentBBNTId || '';
        if(!currentBBNTId) tenEl.dataset.legacyKey = '';
    }
    let idEl = document.getElementById('inpIdBBNT');
    if(idEl) idEl.value = currentBBNTId || 'Tự sinh khi bấm lưu';
}

function getBBNTEntries() {
    return Object.entries(nghiemThuDB || {})
        .filter(([id, r]) => r && typeof r === 'object')
        .map(([id, r]) => [r.id || id, { ...r, id: r.id || id }])
        .sort((a, b) => {
            let timeA = Date.parse(a[1].updatedAt || a[1].createdAt || a[1].ngayKy || '') || 0;
            let timeB = Date.parse(b[1].updatedAt || b[1].createdAt || b[1].ngayKy || '') || 0;
            return timeB - timeA;
        });
}

function tinhTongTienBBNT(record) {
    return (record?.excelData || []).reduce((sum, item) => sum + (Number(item.thanhTien) || 0), 0);
}

function findBBNTRecordByName(name) {
    if(!name) return null;
    let found = getBBNTEntries().find(([id, r]) => r.name === name);
    return found ? { id: found[0], record: found[1] } : null;
}

function renderDanhSachBBNT() {
    let tbody = '';
    let entries = getBBNTEntries();

    entries.forEach(([id, r]) => {
        if(currentUser.role === 'user' && r.tenBenB !== currentUser.company) return;

        let tongTien = tinhTongTienBBNT(r);
        let ngay = r.ngayKy ? formatDate(r.ngayKy) : '-';
        let tenBB = r.name || '(Chưa đặt tên)';
        let benB = r.tenBenB || '-';
        let soHD = r.soHD || '-';
        let soBBNT = r.soBBNT || '-';
        let shortId = String(id).length > 12 ? String(id).slice(-12) : id;
        let isActive = getCurrentBBNTId() === id ? ' bbnt-active-row' : '';
        let safeId = encodeURIComponent(id);

        tbody += `<tr class="bbnt-row${isActive}">
            <td class="bbnt-main-cell">
                <div class="bbnt-title">${escapeHtmlNT(soBBNT)}</div>
                <div class="bbnt-name">${escapeHtmlNT(tenBB)}</div>
                <div class="bbnt-id">ID: ${escapeHtmlNT(shortId)}</div>
            </td>
            <td class="bbnt-partner-cell">
                <div class="bbnt-company">${escapeHtmlNT(benB)}</div>
                <div class="bbnt-contract">HĐ: ${escapeHtmlNT(soHD)}</div>
            </td>
            <td class="bbnt-date-cell">${escapeHtmlNT(ngay)}</td>
            <td class="bbnt-money-cell">${formatTien(tongTien)}</td>
            <td class="bbnt-action-cell">
                <button class="bbnt-btn bbnt-btn-copy" onclick="nhanBanRecordNT('${safeId}')" title="Nhân bản biên bản">📑 Copy</button>
                <button class="bbnt-btn bbnt-btn-edit" onclick="loadRecordNT('${safeId}')" title="Sửa biên bản">✏️ Sửa</button>
                <button class="bbnt-btn bbnt-btn-delete" onclick="xoaRecordNT('${safeId}')" title="Xóa biên bản">🗑️ Xóa</button>
            </td>
        </tr>`;
    });

    if(tbody === '') tbody = `<tr><td colspan="5" class="bbnt-empty-row">Chưa có biên bản nào được tạo</td></tr>`;
    if(document.getElementById('dsBBNTBody')) document.getElementById('dsBBNTBody').innerHTML = tbody;
}

async function saveRecordNT() {
    let name = document.getElementById('inpTenBBNT').value.trim();
    if(!name) return alert("Vui lòng đặt tên hiển thị cho Biên bản nghiệm thu rồi mới bấm Lưu!");

    let btn = (typeof event !== 'undefined') ? event.target : null;
    if(btn) {
        btn.disabled = true;
        btn.dataset.oldText = btn.innerText;
        btn.innerText = '⏳ Đang lưu...';
    }

    try {
        let tenEl = document.getElementById('inpTenBBNT');
        let legacyKey = tenEl?.dataset?.legacyKey || '';
        let recordId = getCurrentBBNTId();
        let isNewRecord = !recordId || !!legacyKey;
        if(isNewRecord) recordId = database.ref('nghiemThuDB').push().key;

        // Loại bỏ mọi thuộc tính undefined trước khi ghi Firebase để tránh lỗi lưu
        let cleanExcelData = JSON.parse(JSON.stringify(currentExcelDataNT || []));
        let oldRecord = legacyKey ? (nghiemThuDB[legacyKey] || {}) : (nghiemThuDB[recordId] || {});
        let now = new Date().toISOString();

        let record = {
            id: recordId,
            name: name,
            soBBNT: document.getElementById('inpSoBBNT').value,
            ngayKy: document.getElementById('inpNgayKyNT').value,
            soQD: document.getElementById('inpSoQDNT').value,
            donViQD: document.getElementById('inpDonViQDNT').value,
            noiDungQD: document.getElementById('inpNoiDungQDNT').value,
            soHD: document.getElementById('inpSoHDNT').value,
            linkedContractValue: document.getElementById('selectHopDongNT')?.value || '',
            ngayHD: document.getElementById('inpNgayHDNT').value,
            phuLuc: document.getElementById('inpPhuLucNT').value,
            tenBenB: document.getElementById('inpTenBenBNT').value,
            diaChiB: document.getElementById('inpDiaChiBNT').value,
            sdtB: document.getElementById('inpSDTBNT').value,
            tkB: document.getElementById('inpTKBNT').value,
            mstB: document.getElementById('inpMSTBNT').value,
            daiDienB: document.getElementById('inpDaiDienBNT').value,
            chucVuB: document.getElementById('inpChucVuBNT').value,
            guq: document.getElementById('inpGUQNT').value,
            excelData: cleanExcelData,
            createdAt: oldRecord.createdAt || now,
            updatedAt: now,
            updatedBy: currentUser?.username || currentUser?.name || 'unknown'
        };

        await database.ref('nghiemThuDB/' + recordId).set(record);
        if(legacyKey && legacyKey !== recordId) {
            await database.ref('nghiemThuDB/' + legacyKey).remove();
            delete nghiemThuDB[legacyKey];
            if(tenEl) tenEl.dataset.legacyKey = '';
        }
        nghiemThuDB[recordId] = record;
        setCurrentBBNTId(recordId);
        renderDanhSachBBNT();
        alert(isNewRecord ? "Đã tạo và lưu Biên bản nghiệm thu mới thành công!" : "Đã cập nhật Biên bản nghiệm thu thành công!");
    } catch (error) {
        console.error('Lỗi lưu BBNT:', error);
        alert("Không lưu được Biên bản nghiệm thu. Lỗi Firebase: " + (error?.message || error));
    } finally {
        if(btn) {
            btn.disabled = false;
            btn.innerText = btn.dataset.oldText || '💾 LƯU BIÊN BẢN NÀY';
        }
    }
}

function loadRecordNT(id) {
    id = decodeURIComponent(id);
    let r = nghiemThuDB[id];
    if(!r) return alert("Không tìm thấy dữ liệu biên bản này!");

    setCurrentBBNTId(id);
    let tenElLoad = document.getElementById('inpTenBBNT');
    if(tenElLoad) {
        tenElLoad.value = r.name || '';
        tenElLoad.dataset.legacyKey = r.id ? '' : id;
    }
    if(document.getElementById('inpSoBBNT')) document.getElementById('inpSoBBNT').value = r.soBBNT || '';
    if(document.getElementById('inpNgayKyNT')) document.getElementById('inpNgayKyNT').value = r.ngayKy || '';
    if(document.getElementById('inpSoQDNT')) document.getElementById('inpSoQDNT').value = r.soQD || '';
    if(document.getElementById('inpDonViQDNT')) document.getElementById('inpDonViQDNT').value = r.donViQD || 'Trung tâm Y tế Huyện Hàm Thuận Bắc';
    if(document.getElementById('inpNoiDungQDNT')) document.getElementById('inpNoiDungQDNT').value = r.noiDungQD || 'về việc phê duyệt kết quả lựa chọn nhà thầu Gói thầu Mua sắm thuốc dược liệu, thuốc có thành phần dược liệu phối hợp với các dược chất hóa dược, thuốc cổ truyền';
    if(document.getElementById('inpSoHDNT')) document.getElementById('inpSoHDNT').value = r.soHD || '';
    let selectHopDongLoad = document.getElementById('selectHopDongNT');
    if(selectHopDongLoad) {
        loadDsHopDongNT();
        selectHopDongLoad.value = '';
        let linkedValueToLoad = r.linkedContractValue || findContractValueByCompanyAndNumberNT(r.tenBenB || '', r.soHD || '');
        if(linkedValueToLoad && Array.from(selectHopDongLoad.options).some(opt => opt.value === linkedValueToLoad)) {
            selectHopDongLoad.value = linkedValueToLoad;
        }
        if(window.$ && $.fn.select2) {
            try { $(selectHopDongLoad).trigger('change.select2'); } catch(e) {}
        }
    }
    if(document.getElementById('inpNgayHDNT')) document.getElementById('inpNgayHDNT').value = r.ngayHD || '';
    if(document.getElementById('inpPhuLucNT')) document.getElementById('inpPhuLucNT').value = r.phuLuc || '';
    if(document.getElementById('inpDiaChiBNT')) document.getElementById('inpDiaChiBNT').value = r.diaChiB || '';
    if(document.getElementById('inpSDTBNT')) document.getElementById('inpSDTBNT').value = r.sdtB || '';
    if(document.getElementById('inpTKBNT')) document.getElementById('inpTKBNT').value = r.tkB || '';
    if(document.getElementById('inpMSTBNT')) document.getElementById('inpMSTBNT').value = r.mstB || '';
    if(document.getElementById('inpDaiDienBNT')) document.getElementById('inpDaiDienBNT').value = r.daiDienB || '';
    if(document.getElementById('inpChucVuBNT')) document.getElementById('inpChucVuBNT').value = r.chucVuB || '';
    if(document.getElementById('inpGUQNT')) document.getElementById('inpGUQNT').value = r.guq || '';
    if(document.getElementById('inpTenBenBNT')) document.getElementById('inpTenBenBNT').value = r.tenBenB || '';

    currentExcelDataNT = r.excelData || [];
    renderTableDataNT();
    updateDocNT();
    renderDanhSachBBNT();

    alert("Đã tải dữ liệu BBNT lên khung chỉnh sửa! Vui lòng cuộn xuống để xem và sửa đổi.");
}

async function xoaRecordNT(id) {
    id = decodeURIComponent(id);
    let r = nghiemThuDB[id];
    if(!r) return alert("Không tìm thấy biên bản cần xóa!");

    let ten = r.name || r.soBBNT || id;
    if(confirm(`Bạn có chắc chắn muốn XÓA biên bản: ${ten} không?`)) {
        try {
            await database.ref('nghiemThuDB/' + id).remove();
            delete nghiemThuDB[id];
            if(getCurrentBBNTId() === id) lamMoiFormNT();
            renderDanhSachBBNT();
            alert("Đã xóa biên bản thành công!");
        } catch (error) {
            console.error('Lỗi xóa BBNT:', error);
            alert("Không xóa được Biên bản nghiệm thu. Lỗi Firebase: " + (error?.message || error));
        }
    }
}

async function nhanBanRecordNT(id) {
    id = decodeURIComponent(id);
    let r = nghiemThuDB[id];
    if(!r) return alert("Không tìm thấy biên bản để nhân bản!");

    try {
        let newId = database.ref('nghiemThuDB').push().key;
        let now = new Date().toISOString();
        let newRecord = JSON.parse(JSON.stringify(r));
        newRecord.id = newId;
        newRecord.name = (r.name || 'Biên bản') + " - Bản sao";
        newRecord.soBBNT = "";
        newRecord.ngayKy = "";
        newRecord.createdAt = now;
        newRecord.updatedAt = now;
        newRecord.updatedBy = currentUser?.username || currentUser?.name || 'unknown';

        await database.ref('nghiemThuDB/' + newId).set(newRecord);
        nghiemThuDB[newId] = newRecord;
        loadRecordNT(encodeURIComponent(newId));
        renderDanhSachBBNT();
        alert("Đã nhân bản biên bản. Ông nhớ nhập lại Số BBNT và Ngày ký trước khi in/lưu chính thức nha.");
    } catch (error) {
        console.error('Lỗi nhân bản BBNT:', error);
        alert("Không nhân bản được Biên bản nghiệm thu. Lỗi Firebase: " + (error?.message || error));
    }
}

function lamMoiFormNT() {
    setCurrentBBNTId(null);
    document.querySelectorAll('.control-panel-nt input[type="text"]:not(#inpIdBBNT):not(#inpTenBenBNT):not(#inpSoQDNT):not(#inpDonViQDNT), .control-panel-nt input[type="date"]').forEach(el => el.value = '');
    if(document.getElementById('inpTenBBNT')) document.getElementById('inpTenBBNT').value = '';
    if(document.getElementById('inpIdBBNT')) document.getElementById('inpIdBBNT').value = 'Tự sinh khi bấm lưu';
    let selectHopDongMoi = document.getElementById('selectHopDongNT');
    if(selectHopDongMoi) {
        selectHopDongMoi.value = '';
        if(window.$ && $.fn.select2) {
            try { $(selectHopDongMoi).trigger('change.select2'); } catch(e) {}
        }
    }
    document.getElementById('inpDonViQDNT').value = 'Trung tâm Y tế Huyện Hàm Thuận Bắc';
    document.getElementById('inpNoiDungQDNT').value = 'về việc phê duyệt kết quả lựa chọn nhà thầu Gói thầu Mua sắm thuốc dược liệu, thuốc có thành phần dược liệu phối hợp với các dược chất hóa dược, thuốc cổ truyền';
    currentExcelDataNT = [];
    renderTableDataNT();
    updateDocNT();
    renderDanhSachBBNT();
}

function inBienBanNghiemThu() {
    let content = document.getElementById('ban-in-nghiem-thu').innerHTML;
    document.getElementById('print-section').innerHTML = `<div class="a4-container-nt">${content}</div>`;
    window.print();
}

// ==========================================
// TÍNH NĂNG THÊM NHANH CÔNG TY (Admin & Nhapkho)
// ==========================================
function hienThiModalThemCongTy() {
    if(currentUser.role !== 'admin' && currentUser.role !== 'nhapkho') return alert("Bạn không có quyền thêm công ty mới!");
    document.getElementById('modalThemCongTy').style.display = 'flex';
    document.getElementById('newCompanyName').value = '';
    document.getElementById('newCompanyName').focus();
}

function dongModalThemCongTy() {
    document.getElementById('modalThemCongTy').style.display = 'none';
}

function luuCongTyMoi() {
    if(currentUser.role !== 'admin' && currentUser.role !== 'nhapkho') return;
    
    let tenCtyMoi = document.getElementById('newCompanyName').value.trim();
    if(!tenCtyMoi) return alert("Vui lòng nhập tên công ty!");
    
    let normCty = tenCtyMoi.toUpperCase();
    let exists = db.hopDongs.find(hd => (hd.tenCongTy || '').trim().toUpperCase() === normCty);
    
    if(exists) return alert("Công ty này đã có trong hệ thống!");
    
    db.hopDongs.push({ id: 'HD_NHAPKHO_' + Date.now(), tenCongTy: tenCtyMoi, soHopDong: 'Chưa có', giaTriGoc: 0 });
    saveData();
    loadSelectOptions();
    
    $('#selectCongTyHD').val(tenCtyMoi).trigger('change');
    alert("✅ Thêm công ty mới thành công!");
    dongModalThemCongTy();
}

// ==========================================
// TÍNH NĂNG XUẤT HÓA ĐƠN NHẬP KHO (PDF & EXCEL)
// ==========================================
function xuatPDFNhapKho() {
    if(currentUser.role !== 'admin' && currentUser.role !== 'nhapkho') return alert("Bạn không có quyền xuất báo cáo này!");

    let tuNgay = document.getElementById('pdfTuNgay').value;
    let denNgay = document.getElementById('pdfDenNgay').value;

    if(!tuNgay || !denNgay) return alert("Vui lòng chọn đầy đủ Từ ngày và Đến ngày!");
    if(tuNgay > denNgay) return alert("Từ ngày không được lớn hơn Đến ngày!");

    let filtered = db.hoaDons.filter(hd => hd.ngayNhapKho && hd.ngayNhapKho >= tuNgay && hd.ngayNhapKho <= denNgay);
    if(filtered.length === 0) return alert("Không có hóa đơn nhập kho nào trong khoảng thời gian này!");

    filtered.sort((a, b) => new Date(a.ngayNhapKho) - new Date(b.ngayNhapKho));

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(16);
    doc.text("DANH SACH HOA DON NHAP KHO", doc.internal.pageSize.getWidth() / 2, 15, { align: "center" });
    doc.setFontSize(11);
    
    let dateStrTu = new Date(tuNgay).toLocaleDateString('vi-VN');
    let dateStrDen = new Date(denNgay).toLocaleDateString('vi-VN');
    doc.text(`Tu ngay: ${dateStrTu} - Den ngay: ${dateStrDen}`, 14, 25);
    doc.text(`Ngay xuat bao cao: ${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')}`, 14, 31);

    let tableColumn = ["STT", "Ten cong ty", "So hoa don", "Ngay hoa don", "Ngay nhap kho", "So tien (VND)", "Ghi chu"];
    let tableRows = [];
    let totalValue = 0;

    filtered.forEach((hd, index) => {
        totalValue += hd.soTien;
        let pNgayHD = hd.ngayHoaDon ? new Date(hd.ngayHoaDon).toLocaleDateString('vi-VN') : '';
        let pNgayNK = hd.ngayNhapKho ? new Date(hd.ngayNhapKho).toLocaleDateString('vi-VN') : '';
        
        let safeCty = hd.tenCongTy.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
        let safeGC = (hd.ghiChu || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
        
        tableRows.push([ index + 1, safeCty, hd.soHoaDon, pNgayHD, pNgayNK, formatTien(hd.soTien), safeGC ]);
    });

    doc.autoTable({
        startY: 35,
        head: [tableColumn],
        body: tableRows,
        styles: { fontStyle: "normal", fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [0, 86, 179], textColor: [255, 255, 255], halign: 'center' },
        columnStyles: { 0: { halign: 'center', cellWidth: 15 }, 1: { cellWidth: 80 }, 5: { halign: 'right' }, 6: { cellWidth: 'auto' } },
        margin: { top: 10, right: 14, bottom: 20, left: 14 },
        didDrawPage: function (data) {
            doc.setFontSize(10);
            doc.text("Trang " + doc.internal.getNumberOfPages(), data.settings.margin.left, doc.internal.pageSize.getHeight() - 10);
        }
    });

    let finalY = doc.lastAutoTable.finalY || 45;
    doc.setFontSize(12); doc.setFont(undefined, 'bold');
    doc.text(`Tong so hoa don: ${filtered.length}`, 14, finalY + 10);
    doc.text(`Tong gia tri: ${formatTien(totalValue)} dong`, doc.internal.pageSize.getWidth() - 14, finalY + 10, { align: "right" });

    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
}

function xuatExcelNhapKho() {
    if(currentUser.role !== 'admin' && currentUser.role !== 'nhapkho') return alert("Bạn không có quyền xuất báo cáo này!");

    let tuNgay = document.getElementById('pdfTuNgay').value;
    let denNgay = document.getElementById('pdfDenNgay').value;

    if(!tuNgay || !denNgay) return alert("Vui lòng chọn đầy đủ Từ ngày và Đến ngày!");
    if(tuNgay > denNgay) return alert("Từ ngày không được lớn hơn Đến ngày!");

    let filtered = db.hoaDons.filter(hd => hd.ngayNhapKho && hd.ngayNhapKho >= tuNgay && hd.ngayNhapKho <= denNgay);
    if(filtered.length === 0) return alert("Không có hóa đơn nhập kho nào trong khoảng thời gian này!");

    filtered.sort((a, b) => new Date(a.ngayNhapKho) - new Date(b.ngayNhapKho));

    let data = [
        ["DANH SÁCH HÓA ĐƠN NHẬP KHO"],
        [`Từ ngày: ${formatDate(tuNgay)} - Đến ngày: ${formatDate(denNgay)}`],
        [],
        ["STT", "Tên công ty", "Số hóa đơn", "Ngày hóa đơn", "Ngày nhập kho", "Số tiền (VNĐ)", "Ghi chú"]
    ];

    let totalValue = 0;
    filtered.forEach((hd, index) => {
        totalValue += hd.soTien;
        data.push([
            index + 1,
            hd.tenCongTy,
            hd.soHoaDon,
            formatDate(hd.ngayHoaDon),
            formatDate(hd.ngayNhapKho),
            hd.soTien,
            hd.ghiChu || ''
        ]);
    });

    data.push(["", "", "", "", "Tổng cộng:", totalValue, ""]);

    let ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{wch: 5}, {wch: 40}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 15}, {wch: 30}];
    let wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "HoaDonNhapKho");
    
    XLSX.writeFile(wb, `HoaDonNhapKho_${getExcelTimestamp()}.xlsx`);
}