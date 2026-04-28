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

let benADefault = {
    ten: "TRUNG TÂM Y TẾ KHU VỰC HÀM THUẬN BẮC", diaChi: "Km 17 Đường 8/4, Thôn Lâm Hòa, xã Hàm Thuận, tỉnh Lâm Đồng",
    sdt: "0252. 3611812              Fax: 0252. 3610675", email: "ytehamthuanbac@gmail.com",
    tk: "3716.2.1030529.00000 ; 9527.2.1030529", giaoDich: "giao dịch tại KBNN Khu vực XVI - PGD số 12",
    mst: "3400517197", maDV: "1030529", daiDien: "TRẦN GIAO HÙNG", chucVu: "Giám Đốc"
};
let benA = { ...benADefault };

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

            // Nếu đang ở màn hình Thanh toán thì update lại bảng luôn
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
function saveNghiemThu() { database.ref('nghiemThuDB').set(nghiemThuDB); }

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
        document.getElementById('currentUserRole').innerText = currentUser.role === 'admin' ? '[Quản trị TTYT]' : `[Đối tác: ${currentUser.company}]`;

        if(currentUser.role === 'user') {
            document.getElementById('btn-tab-hop-dong').style.display = 'none';
            document.getElementById('btn-tab-hoa-don').style.display = 'none';
            document.getElementById('btn-tab-admin').style.display = 'none';
            
            let locCty = document.getElementById('filterCongTy');
            if(locCty) locCty.parentElement.style.display = 'none';

            document.getElementById('inpTenBenBNT').value = currentUser.company;
            document.getElementById('inpTenBenBNT').disabled = true;

            switchTab('tab-theo-doi', document.getElementById('btn-tab-theo-doi'));
        } else {
            document.getElementById('khuVucCapNhatBenA').style.display = 'block';
        }
    }
    
    $('.search-select').select2({ width: '100%' });
    updateDocNT();
    renderBenANT();

    // Lắng nghe sự thay đổi của mục Lọc dữ liệu
    $('#filterCongTy').on('change', renderTable);
    $('#filterCongTy').on('select2:select', renderTable); 
    $('#filterThangNhap').on('change', renderTable);
    $('#filterDate').on('change', renderTable);

    // Lắng nghe sự thay đổi của mục chọn Công ty để hiển thị Bảng Thanh Toán
    $('#selectCongTyTT').on('change', loadHopDongVaHoaDonTT);
    $('#selectCongTyTT').on('select2:select', loadHopDongVaHoaDonTT);
});

function toggleCompanySelect() {
    document.getElementById('divSelectCompany').style.display = document.getElementById('newRole').value === 'admin' ? 'none' : 'block';
}

function taoTaiKhoan() {
    let u = document.getElementById('newUsername').value.trim().toLowerCase();
    let p = document.getElementById('newPassword').value;
    let r = document.getElementById('newRole').value;
    let c = document.getElementById('newUserCompany').value;

    if(!u || !p) return alert("Vui lòng nhập đủ tên đăng nhập và mật khẩu!");
    if(r === 'user' && !c) return alert("Vui lòng chọn Công ty cho tài khoản đối tác!");

    usersDB[u] = { password: p, role: r, company: r === 'admin' ? 'ALL' : c, isFirstLogin: true };
    saveUsers();
    alert("Đã tạo tài khoản thành công!");
    document.getElementById('newUsername').value = ''; document.getElementById('newPassword').value = '';
}

function taiMauExcelTaiKhoan() {
    let ws = XLSX.utils.aoa_to_sheet([
        ["Tên đăng nhập (Viết liền không dấu)", "Mật khẩu", "Quyền hạn (user/admin)", "Tên Công ty quản lý (Chính xác tên Cty)"],
        ["doitac_cpc1", "123456", "user", "Công ty Cổ phần Dược phẩm CPC1 Hà Nội"],
        ["ketoan_admin", "123456", "admin", "ALL"]
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
            let r = (row[2] && row[2].toString().toLowerCase() === 'admin') ? 'admin' : 'user';
            let c = row[3] ? row[3].toString().trim() : '';

            if(r === 'user' && !c) continue; 

            usersDB[u] = { password: p, role: r, company: r === 'admin' ? 'ALL' : c, isFirstLogin: true };
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

        tbody += `<tr>
            <td>${key}</td>
            <td style="color:#0056b3; font-weight:bold;">${passToDisplay} ${trangThaiMK}</td>
            <td>${usersDB[key].role}</td>
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
    let ten = document.getElementById('tenCongTy').value.trim();
    let soHD = document.getElementById('soHopDong').value.trim();
    let giaTri = Number(document.getElementById('giaTriGoc').value);
    if(!ten || !soHD || !giaTri) return alert("Vui lòng nhập đủ thông tin!");
    db.hopDongs.push({ id: Date.now().toString(), tenCongTy: ten, soHopDong: soHD, giaTriGoc: giaTri }); 
    saveData(); alert("Lưu Hợp đồng thành công!");
    document.getElementById('tenCongTy').value = ''; document.getElementById('soHopDong').value = ''; document.getElementById('giaTriGoc').value = '';
}

function themPhuLuc() {
    let idHD = document.getElementById('selectHopDongPL').value, loai = document.getElementById('loaiPhuLuc').value, giaTri = Number(document.getElementById('giaTriPhuLuc').value);
    if(!idHD || !giaTri) return alert("Vui lòng chọn Hợp đồng và nhập số tiền!");
    db.phuLucs.push({ idHD: idHD, loai: loai, giaTri: giaTri }); saveData(); alert("Đã lưu Phụ lục!"); document.getElementById('giaTriPhuLuc').value = '';
}

function themHoaDon() {
    let tenCty = document.getElementById('selectCongTyHD').value, soHD = document.getElementById('soHoaDonInput').value, ngayHD = document.getElementById('ngayHoaDon').value, ngayNK = document.getElementById('ngayNhapKho').value, tien = Number(document.getElementById('tienHoaDon').value);
    if(!tenCty || !soHD || !tien) return alert("Vui lòng chọn Công ty, nhập Số hóa đơn và Số tiền!");
    db.hoaDons.push({ id: Date.now().toString(), tenCongTy: tenCty, idHD: "", soHoaDon: soHD, ngayHoaDon: ngayHD, ngayNhapKho: ngayNK, soTien: tien }); 
    saveData(); alert("Đã lưu Hóa đơn thành công!"); document.getElementById('soHoaDonInput').value = ''; document.getElementById('tienHoaDon').value = '';
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
            db.hoaDons.push({ id: 'INV_' + Date.now() + i, tenCongTy: tenCty, idHD: "", soHoaDon: soHD, ngayHoaDon: ngayHD, ngayNhapKho: ngayNK, soTien: soTien }); countNew++;
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
// BẢNG DANH SÁCH THANH TOÁN MỚI (CÓ CHECKBOX CHỌN NHIỀU)
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
        alert("Đã lưu số hợp đồng thành công!");
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
                ${btnXoaHoaDon}
            </tr>`;
        });
        
        if (ctyGroup.totalNo > 0) {
            let colSpanFoot = isAdmin ? 6 : 5;
            let colEmpty = isAdmin ? 3 : 2;
            html += `<tr style="background:#f4f8fb;"><td colspan="${colSpanFoot}" class="text-right bold" style="color:#0056b3;">Tổng nợ ${ctyGroup.displayName}:</td><td class="text-right text-danger bold">${formatTien(ctyGroup.totalNo)}</td><td colspan="${colEmpty}"></td></tr>`;
        }
    });
    
    if(filteredHoaDons.length === 0) html = `<tr><td colspan="9" class="text-center">Chưa có dữ liệu</td></tr>`;
    if(document.getElementById('bangTheoDoi')) document.getElementById('bangTheoDoi').innerHTML = html;
    
    if(document.getElementById('bangTheoDoiFoot')) {
        let colSpanFoot = isAdmin ? 6 : 5;
        let colEmpty = isAdmin ? 3 : 2;
        document.getElementById('bangTheoDoiFoot').innerHTML = `<tr><td colspan="${colSpanFoot}" class="text-right bold" style="font-size:15px; color:#1D6F42;">TỔNG NỢ CÒN LẠI:</td><td class="text-right text-danger bold" style="font-size:16px;">${formatTien(tongTatCaNo)}</td><td colspan="${colEmpty}"></td></tr>`;
    }
}

// ==========================================
// HÀM IN BÁO CÁO CÔNG NỢ PDF
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
        .bold { font-weight: bold; }
        .group-row { background-color: #f9f9f9; font-weight: bold; }
        .footer-sig { margin-top: 30px; width: 100%; border: none; }
        .footer-sig td { border: none; text-align: center; width: 50%; }
    </style>`;
}

function inBaoCaoTongHop() {
    let filtered = (currentUser.role === 'user') 
        ? db.hoaDons.filter(h => h.tenCongTy === currentUser.company)
        : db.hoaDons;

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
                    <td></td><td></td>
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
        rows += `<tr class="group-row"><td colspan="6">${g.cty} - HĐ: ${g.hd}</td></tr>`;
        g.items.forEach(inv => {
            rows += `
                <tr>
                    <td class="text-center">${inv.soHoaDon}</td>
                    <td class="text-center">${formatDate(inv.ngayHoaDon)}</td>
                    <td class="text-center">${formatDate(inv.ngayNhapKho)}</td>
                    <td class="text-right">${formatTien(inv.soTien)}</td>
                    <td class="text-center">Chưa thanh toán</td>
                    <td class="text-right">${formatTien(inv.soTien)}</td>
                </tr>`;
        });
        rows += `<tr class="bold"><td colspan="5" class="text-right">Cộng nợ Hợp đồng:</td><td class="text-right">${formatTien(g.subTotal)}</td></tr>`;
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
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
                <tfoot>
                    <tr class="bold" style="background: #eee; font-size: 14px;">
                        <td colspan="5" class="text-right">TỔNG CỘNG DƯ NỢ:</td>
                        <td class="text-right" style="color: red;">${formatTien(grandTotal)}</td>
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

function loadDsHopDongNT() {
    let html = '<option value="">-- Chọn Hợp đồng --</option>';
    db.hopDongs.forEach(hd => {
        if(currentUser.role === 'admin' || hd.tenCongTy === currentUser.company) {
            html += `<option value="${hd.id}">${hd.tenCongTy} - HĐ: ${hd.soHopDong}</option>`;
        }
    });
    if(document.getElementById('selectHopDongNT')) document.getElementById('selectHopDongNT').innerHTML = html;
}

function autoFillContractNT() {
    let idHD = document.getElementById('selectHopDongNT').value;
    if(!idHD) return;
    let hd = db.hopDongs.find(x => x.id === idHD);
    if(hd) {
        if(currentUser.role === 'admin') document.getElementById('inpTenBenBNT').value = hd.tenCongTy;
        document.getElementById('inpSoHDNT').value = hd.soHopDong;
        updateDocNT();
    }
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

function renderDanhSachBBNT() {
    let tbody = '';
    let keys = Object.keys(nghiemThuDB).reverse(); 
    keys.forEach(name => {
        let r = nghiemThuDB[name];
        if(currentUser.role === 'user' && r.tenBenB !== currentUser.company) return;

        let tongTien = r.excelData ? r.excelData.reduce((sum, item) => sum + item.thanhTien, 0) : 0;
        let ngay = r.ngayKy ? formatDate(r.ngayKy) : '-';
        
        tbody += `<tr>
            <td style="padding: 5px; border: 1px solid #bee5eb;"><strong>${r.soBBNT || '-'}</strong><br><span style="color:#666; font-size:10px;">${name}</span></td>
            <td style="padding: 5px; border: 1px solid #bee5eb;">${r.tenBenB}<br><span style="color:#0056b3; font-size:10px;">HĐ: ${r.soHD || '-'}</span></td>
            <td style="padding: 5px; border: 1px solid #bee5eb; text-align:center;">${ngay}</td>
            <td style="padding: 5px; border: 1px solid #bee5eb; text-align:right; font-weight:bold; color:#dc3545;">${formatTien(tongTien)}</td>
            <td style="padding: 5px; border: 1px solid #bee5eb; text-align:center; white-space:nowrap;">
                <button onclick="nhanBanRecordNT('${name}')" style="background:#17a2b8; color:white; border:none; padding:4px 6px; border-radius:3px; cursor:pointer; font-weight:bold; margin-right:2px;" title="Nhân bản">📑 Copy</button>
                <button onclick="loadRecordNT('${name}')" style="background:#ffc107; border:none; padding:4px 6px; border-radius:3px; cursor:pointer; font-weight:bold; margin-right:2px;" title="Sửa">Sửa</button>
                <button onclick="xoaRecordNT('${name}')" style="background:#dc3545; color:white; border:none; padding:4px 6px; border-radius:3px; cursor:pointer; font-weight:bold;" title="Xóa">Xóa</button>
            </td>
        </tr>`;
    });
    
    if(tbody === '') tbody = `<tr><td colspan="5" style="text-align:center; padding:10px; font-style:italic;">Chưa có biên bản nào được tạo</td></tr>`;
    if(document.getElementById('dsBBNTBody')) document.getElementById('dsBBNTBody').innerHTML = tbody;
}

function saveRecordNT() {
    let name = document.getElementById('inpTenBBNT').value.trim();
    if(!name) return alert("Vui lòng đặt tên cho Biên Bản ở ô bên dưới (Ví dụ: BBNT_CPC1_Thang4) rồi mới bấm Lưu!");

    nghiemThuDB[name] = { 
        name: name, soBBNT: document.getElementById('inpSoBBNT').value,
        ngayKy: document.getElementById('inpNgayKyNT').value, soQD: document.getElementById('inpSoQDNT').value, 
        donViQD: document.getElementById('inpDonViQDNT').value, noiDungQD: document.getElementById('inpNoiDungQDNT').value,
        soHD: document.getElementById('inpSoHDNT').value, ngayHD: document.getElementById('inpNgayHDNT').value, 
        phuLuc: document.getElementById('inpPhuLucNT').value, tenBenB: document.getElementById('inpTenBenBNT').value, 
        diaChiB: document.getElementById('inpDiaChiBNT').value, sdtB: document.getElementById('inpSDTBNT').value, 
        tkB: document.getElementById('inpTKBNT').value, mstB: document.getElementById('inpMSTBNT').value, 
        daiDienB: document.getElementById('inpDaiDienBNT').value, chucVuB: document.getElementById('inpChucVuBNT').value, 
        guq: document.getElementById('inpGUQNT').value, excelData: currentExcelDataNT 
    };
    
    saveNghiemThu(); 
    alert("Đã lưu biên bản lên máy chủ thành công!"); 
}

function loadRecordNT(name) {
    let r = nghiemThuDB[name]; if(!r) return;
    
    if(document.getElementById('inpTenBBNT')) document.getElementById('inpTenBBNT').value = r.name || ''; 
    if(document.getElementById('inpSoBBNT')) document.getElementById('inpSoBBNT').value = r.soBBNT || ''; 
    if(document.getElementById('inpNgayKyNT')) document.getElementById('inpNgayKyNT').value = r.ngayKy || ''; 
    if(document.getElementById('inpSoQDNT')) document.getElementById('inpSoQDNT').value = r.soQD || ''; 
    if(document.getElementById('inpDonViQDNT')) document.getElementById('inpDonViQDNT').value = r.donViQD || 'Trung tâm Y tế Huyện Hàm Thuận Bắc';
    if(document.getElementById('inpNoiDungQDNT')) document.getElementById('inpNoiDungQDNT').value = r.noiDungQD || 'về việc phê duyệt kết quả lựa chọn nhà thầu Gói thầu Mua sắm thuốc dược liệu, thuốc có thành phần dược liệu phối hợp với các dược chất hóa dược, thuốc cổ truyền';
    if(document.getElementById('inpSoHDNT')) document.getElementById('inpSoHDNT').value = r.soHD || ''; 
    if(document.getElementById('inpNgayHDNT')) document.getElementById('inpNgayHDNT').value = r.ngayHD || ''; 
    if(document.getElementById('inpPhuLucNT')) document.getElementById('inpPhuLucNT').value = r.phuLuc || ''; 
    if(document.getElementById('inpDiaChiBNT')) document.getElementById('inpDiaChiBNT').value = r.diaChiB || ''; 
    if(document.getElementById('inpSDTBNT')) document.getElementById('inpSDTBNT').value = r.sdtB || ''; 
    if(document.getElementById('inpTKBNT')) document.getElementById('inpTKBNT').value = r.tkB || ''; 
    if(document.getElementById('inpMSTBNT')) document.getElementById('inpMSTBNT').value = r.mstB || ''; 
    if(document.getElementById('inpDaiDienBNT')) document.getElementById('inpDaiDienBNT').value = r.daiDienB || ''; 
    if(document.getElementById('inpChucVuBNT')) document.getElementById('inpChucVuBNT').value = r.chucVuB || ''; 
    if(document.getElementById('inpGUQNT')) document.getElementById('inpGUQNT').value = r.guq || '';
    if(currentUser.role === 'admin' && document.getElementById('inpTenBenBNT')) {
        document.getElementById('inpTenBenBNT').value = r.tenBenB || '';
    }
    
    currentExcelDataNT = r.excelData || []; 
    renderTableDataNT(); 
    updateDocNT();
    
    alert("Đã tải dữ liệu BBNT lên khung chỉnh sửa! Vui lòng cuộn xuống để xem và sửa đổi.");
}

function xoaRecordNT(name) {
    if(confirm(`Bạn có chắc chắn muốn XÓA biên bản: ${name} không?`)) {
        delete nghiemThuDB[name];
        saveNghiemThu();
        lamMoiFormNT();
    }
}

function nhanBanRecordNT(name) {
    let r = nghiemThuDB[name];
    if(!r) return;
    let newName = name + " (Copy " + Math.floor(Math.random() * 100) + ")";
    let newRecord = JSON.parse(JSON.stringify(r)); 
    newRecord.name = newName;
    newRecord.soBBNT = ""; 
    newRecord.ngayKy = ""; 
    nghiemThuDB[newName] = newRecord;
    
    saveNghiemThu();
    
    setTimeout(() => {
        loadRecordNT(newName);
        renderDanhSachBBNT();
    }, 100);
}

function lamMoiFormNT() {
    document.querySelectorAll('.control-panel-nt input[type="text"]:not(#inpTenBenBNT):not(#inpSoQDNT):not(#inpDonViQDNT), .control-panel-nt input[type="date"]').forEach(el => el.value = ''); 
    document.getElementById('inpDonViQDNT').value = 'Trung tâm Y tế Huyện Hàm Thuận Bắc';
    document.getElementById('inpNoiDungQDNT').value = 'về việc phê duyệt kết quả lựa chọn nhà thầu Gói thầu Mua sắm thuốc dược liệu, thuốc có thành phần dược liệu phối hợp với các dược chất hóa dược, thuốc cổ truyền';
    currentExcelDataNT = []; 
    renderTableDataNT(); 
    updateDocNT();
}

function inBienBanNghiemThu() {
    let content = document.getElementById('ban-in-nghiem-thu').innerHTML;
    document.getElementById('print-section').innerHTML = `<div class="a4-container-nt">${content}</div>`;
    window.print();
}