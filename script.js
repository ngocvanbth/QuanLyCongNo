// ==========================================
// 1. HỆ THỐNG BẢO MẬT & PHÂN QUYỀN (RBAC)
// ==========================================
let currentUser = JSON.parse(sessionStorage.getItem('currentUser'));
if(!currentUser && window.location.pathname.indexOf('login.html') === -1) {
    window.location.href = "login.html";
}

function dangXuat() {
    sessionStorage.removeItem('currentUser');
    window.location.href = "login.html";
}

let usersDB = JSON.parse(localStorage.getItem('usersDB_v1')) || {};

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
    
    $('.search-select').select2();
    loadSelectOptions(); 
    loadDsHopDongNT();
    renderDanhSachBBNT(); 
    renderBenANT();
    updateDocNT();
    renderTable();
    loadBangTaiKhoan();
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

    usersDB[u] = { password: p, role: r, company: r === 'admin' ? 'ALL' : c };
    localStorage.setItem('usersDB_v1', JSON.stringify(usersDB));
    alert("Đã tạo tài khoản thành công!");
    document.getElementById('newUsername').value = ''; document.getElementById('newPassword').value = '';
    loadBangTaiKhoan();
}

function loadBangTaiKhoan() {
    let tbody = '';
    for(let key in usersDB) {
        let btnXoa = key === 'admin' ? '' : `<button onclick="xoaTaiKhoan('${key}')" style="background:#dc3545;color:white;border:none;padding:3px 8px;border-radius:3px;cursor:pointer;">Xóa</button>`;
        tbody += `<tr><td>${key}</td><td>${usersDB[key].role}</td><td>${usersDB[key].company}</td><td class="text-center">${btnXoa}</td></tr>`;
    }
    let bang = document.getElementById('bangTaiKhoan');
    if(bang) bang.innerHTML = tbody;
}

function xoaTaiKhoan(u) {
    if(confirm(`Chắc chắn xóa tài khoản ${u}?`)) { delete usersDB[u]; localStorage.setItem('usersDB_v1', JSON.stringify(usersDB)); loadBangTaiKhoan(); }
}

// ==========================================
// 2. LOGIC QUẢN LÝ CÔNG NỢ (TABS 1, 2, 3)
// ==========================================
let db = JSON.parse(localStorage.getItem('congNoDB_v2')) || { hopDongs: [], phuLucs: [], hoaDons: [], thanhToans: [] };

const formatTien = (tien) => new Intl.NumberFormat('vi-VN').format(tien);
function formatDate(dateString) {
    if(!dateString) return '';
    const parts = dateString.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateString;
}

function saveData() { 
    localStorage.setItem('congNoDB_v2', JSON.stringify(db)); 
    loadSelectOptions(); 
    loadDsHopDongNT(); 
    renderTable(); 
}

function switchTab(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    btn.classList.add('active');
    
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
function themThanhToan() {
    let idHoaDon = document.getElementById('selectHoaDonTT').value, idHopDong = document.getElementById('selectHopDongTT').value, tien = document.getElementById('tienThanhToan').value, ngay = document.getElementById('ngayThanhToan').value;
    if(!idHoaDon || !idHopDong) return alert("Vui lòng chọn Hóa đơn và Hợp đồng!");
    let inv = db.hoaDons.find(h => h.id === idHoaDon);
    if(inv) inv.idHD = idHopDong;
    if(tien && ngay) db.thanhToans.push({ idHoaDon: idHoaDon, soTien: Number(tien), ngay: ngay });
    saveData(); alert("Cập nhật thông tin thành công!"); loadHopDongVaHoaDonTT(); 
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
    document.getElementById('selectCongTyHD').innerHTML = optCty; document.getElementById('selectCongTyTT').innerHTML = optCty;
    let optHDPL = '<option value="">-- Chọn Hợp đồng --</option>';
    db.hopDongs.forEach(hd => { optHDPL += `<option value="${hd.id}">${hd.tenCongTy} - HĐ: ${hd.soHopDong}</option>`; });
    document.getElementById('selectHopDongPL').innerHTML = optHDPL;
    document.getElementById('filterCongTy').innerHTML = '<option value="ALL">-- Tất cả công ty --</option>' + optCty;
    let selUserCty = document.getElementById('newUserCompany');
    if(selUserCty) selUserCty.innerHTML = optCty;
}

function loadHopDongVaHoaDonTT() {
    let cty = document.getElementById('selectCongTyTT').value;
    if(!cty) return;
    let optHD = '<option value="">-- Chọn Hợp đồng để gán --</option>';
    db.hopDongs.filter(hd => hd.tenCongTy === cty).forEach(hd => { optHD += `<option value="${hd.id}">HĐ: ${hd.soHopDong}</option>`; });
    document.getElementById('selectHopDongTT').innerHTML = optHD;

    let optInv = '<option value="">-- Chọn Hóa đơn --</option>';
    db.hoaDons.filter(h => h.tenCongTy === cty).forEach(hd => {
        let textTT = db.thanhToans.some(tt => tt.idHoaDon === hd.id) ? 'Đã TT' : `Nợ: ${formatTien(hd.soTien)}`;
        optInv += `<option value="${hd.id}">HĐơn: ${hd.soHoaDon} - ${textTT}</option>`;
    });
    document.getElementById('selectHoaDonTT').innerHTML = optInv;
}

function renderTable() {
    let locCongTy = document.getElementById('filterCongTy').value, filterThangNhap = document.getElementById('filterThangNhap').value, filterDate = document.getElementById('filterDate').value; 
    let fHoaDons = db.hoaDons, fThanhToans = db.thanhToans;

    if(filterThangNhap) fHoaDons = fHoaDons.filter(hd => hd.ngayNhapKho && hd.ngayNhapKho.startsWith(filterThangNhap));
    if(filterDate) { fHoaDons = fHoaDons.filter(hd => hd.ngayHoaDon <= filterDate); fThanhToans = fThanhToans.filter(tt => tt.ngay <= filterDate); }

    let filteredHoaDons = fHoaDons;
    if(currentUser.role === 'user') filteredHoaDons = fHoaDons.filter(hd => hd.tenCongTy === currentUser.company);
    else if (locCongTy !== 'ALL') filteredHoaDons = fHoaDons.filter(hd => hd.tenCongTy === locCongTy);

    let groupedByCty = {};
    filteredHoaDons.forEach(hoaDon => {
        let normName = (hoaDon.tenCongTy || 'Lỗi DL').trim().toUpperCase();
        if(!groupedByCty[normName]) groupedByCty[normName] = { displayName: hoaDon.tenCongTy, invoices: [], totalNo: 0 };
        groupedByCty[normName].invoices.push(hoaDon);
    });

    let html = '', tongTatCaNhapKho = 0, tongTatCaNo = 0; 
    Object.keys(groupedByCty).sort().forEach(key => {
        let ctyGroup = groupedByCty[key];
        ctyGroup.invoices.forEach(hoaDon => {
            let hopDong = db.hopDongs.find(hd => hd.id === hoaDon.idHD), soHienThiHD = hopDong ? hopDong.soHopDong : 'Chưa gán HĐ';
            let gdThanhToan = fThanhToans.filter(tt => tt.idHoaDon === hoaDon.id), daThanhToan = gdThanhToan.length > 0;
            tongTatCaNhapKho += hoaDon.soTien; 
            if (!daThanhToan) { ctyGroup.totalNo += hoaDon.soTien; tongTatCaNo += hoaDon.soTien; }
            html += `<tr><td><strong>${ctyGroup.displayName}</strong></td><td>${soHienThiHD}</td><td>${hoaDon.soHoaDon}</td><td class="text-center">${formatDate(hoaDon.ngayHoaDon)}</td><td class="text-center" style="color:#1D6F42;font-weight:bold;">${formatDate(hoaDon.ngayNhapKho)}</td><td class="text-right"><strong>${formatTien(hoaDon.soTien)}</strong></td><td class="text-center">${daThanhToan ? formatDate(gdThanhToan[gdThanhToan.length-1].ngay) : '-'}</td><td class="text-center">${daThanhToan ? 'Đã TT' : 'Chưa TT'}</td></tr>`;
        });
        if (ctyGroup.totalNo > 0 || locCongTy !== 'ALL') html += `<tr style="background:#f4f8fb;"><td colspan="5" class="text-right bold" style="color:#0056b3;">Tổng nợ ${ctyGroup.displayName}:</td><td class="text-right text-danger bold">${formatTien(ctyGroup.totalNo)}</td><td colspan="2"></td></tr>`;
    });
    
    if(filteredHoaDons.length === 0) html = `<tr><td colspan="8" class="text-center">Chưa có dữ liệu</td></tr>`;
    document.getElementById('bangTheoDoi').innerHTML = html;
    document.getElementById('bangTheoDoiFoot').innerHTML = `<tr><td colspan="5" class="text-right bold" style="font-size:15px; color:#1D6F42;">TỔNG NỢ CÒN LẠI:</td><td class="text-right text-danger bold" style="font-size:16px;">${formatTien(tongTatCaNo)}</td><td colspan="2"></td></tr>`;
}

function inBaoCaoTongHop() { alert("Chức năng in báo cáo công nợ."); }
function inBaoCaoChiTiet() { alert("Chức năng in báo cáo chi tiết."); }


// ==========================================
// 3. LOGIC BIÊN BẢN NGHIỆM THU (TAB 4)
// ==========================================
let nghiemThuDB = JSON.parse(localStorage.getItem('nghiemThuDB_v1')) || {};
let currentExcelDataNT = [];

let benADefault = {
    ten: "TRUNG TÂM Y TẾ KHU VỰC HÀM THUẬN BẮC", diaChi: "Km 17 Đường 8/4, Thôn Lâm Hòa, xã Hàm Thuận, tỉnh Lâm Đồng",
    sdt: "0252. 3611812               Fax: 0252. 3610675", email: "ytehamthuanbac@gmail.com",
    tk: "3716.2.1030529.00000 ; 9527.2.1030529", giaoDich: "giao dịch tại KBNN Khu vực XVI - PGD số 12",
    mst: "3400517197", maDV: "1030529", daiDien: "TRẦN GIAO HÙNG", chucVu: "Giám Đốc"
};

function renderBenANT() {
    let benA = JSON.parse(localStorage.getItem('thongTinBenA_v1')) || benADefault;
    document.getElementById('docTenBenA_TitleNT').innerText = benA.ten; document.getElementById('docTenBenA_CCTNT').innerText = benA.ten.toLowerCase(); document.getElementById('docTenBenANT').innerText = benA.ten;
    document.getElementById('docDiaChiANT').innerText = benA.diaChi; document.getElementById('docSDTANT').innerText = benA.sdt; document.getElementById('docEmailANT').innerText = benA.email;
    document.getElementById('docTKANT').innerText = benA.tk; document.getElementById('docGiaoDichANT').innerText = benA.giaoDich; document.getElementById('docMSTANT').innerText = benA.mst;
    document.getElementById('docMaDVANT').innerText = benA.maDV; document.getElementById('docDaiDienANT').innerText = benA.daiDien; document.getElementById('docChucVuANT').innerText = benA.chucVu; document.getElementById('docDaiDienA_KyNT').innerText = benA.daiDien;
}

function docFileExcelBenA() {
    let fileInput = document.getElementById('fileExcelBenA');
    if(!fileInput.files.length) return alert("Chọn file Excel thông tin Bên A trước!");
    let reader = new FileReader();
    reader.onload = function(e) {
        let rows = XLSX.utils.sheet_to_json(XLSX.read(new Uint8Array(e.target.result), {type: 'array'}).Sheets[XLSX.read(new Uint8Array(e.target.result), {type: 'array'}).SheetNames[0]], {header: 1, raw: true});
        let benA = JSON.parse(localStorage.getItem('thongTinBenA_v1')) || { ...benADefault };
        for(let i=0; i<rows.length; i++) {
            if(!rows[i] || !rows[i][0] || rows[i][1]===undefined) continue;
            let key = rows[i][0].toString().toLowerCase(), val = rows[i][1].toString().trim();
            if(key.includes('tên')) benA.ten = val; else if(key.includes('địa chỉ')) benA.diaChi = val;
            else if(key.includes('điện thoại')||key.includes('sđt')||key.includes('fax')) benA.sdt = val; else if(key.includes('email')) benA.email = val;
            else if(key.includes('tài khoản')) benA.tk = val; else if(key.includes('giao dịch')||key.includes('kbnn')) benA.giaoDich = val;
            else if(key.includes('thuế')||key.includes('mst')) benA.mst = val; else if(key.includes('đvq')||key.includes('mã đv')) benA.maDV = val;
            else if(key.includes('đại diện')) benA.daiDien = val; else if(key.includes('chức vụ')) benA.chucVu = val;
        }
        localStorage.setItem('thongTinBenA_v1', JSON.stringify(benA)); renderBenANT(); alert("Đã cập nhật Bên A thành công!"); fileInput.value = "";
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
    document.getElementById('selectHopDongNT').innerHTML = html;
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
    let dateVal = document.getElementById('inpNgayKyNT').value;
    document.getElementById('docNgayKyNT').innerText = dateVal ? `${('0'+new Date(dateVal).getDate()).slice(-2)} tháng ${('0'+(new Date(dateVal).getMonth()+1)).slice(-2)} năm ${new Date(dateVal).getFullYear()}` : "..... tháng ..... năm 202...";
    
    document.getElementById('docSoBBNT').innerText = document.getElementById('inpSoBBNT').value || '.......';
    
    // Cập nhật trường Quyết định
    document.getElementById('docSoQDNT').innerText = document.getElementById('inpSoQDNT').value;
    document.getElementById('docDonViQDNT').innerText = document.getElementById('inpDonViQDNT').value;
    document.getElementById('docNoiDungQDNT').innerText = document.getElementById('inpNoiDungQDNT').value;

    document.getElementById('docSoHDNT').innerText = document.getElementById('inpSoHDNT').value;
    document.getElementById('docNgayHDNT').innerText = document.getElementById('inpNgayHDNT').value;
    
    let pl = document.getElementById('inpPhuLucNT').value.trim();
    document.getElementById('docPhuLucNT').innerHTML = pl ? ` và phụ lục hợp đồng số <span class="bold-nt">${pl}</span>` : "";
    
    let tenB = document.getElementById('inpTenBenBNT').value;
    document.getElementById('docTenBenB1NT').innerText = tenB; document.getElementById('docTenBenB2NT').innerText = tenB;
    document.getElementById('docDiaChiBNT').innerText = document.getElementById('inpDiaChiBNT').value; document.getElementById('docSDTBNT').innerText = document.getElementById('inpSDTBNT').value;
    document.getElementById('docTKBNT').innerText = document.getElementById('inpTKBNT').value; document.getElementById('docMSTBNT').innerText = document.getElementById('inpMSTBNT').value;
    
    let guq = document.getElementById('inpGUQNT').value.trim();
    document.getElementById('rowGUQNT').style.display = guq ? 'table-row' : 'none';
    document.getElementById('docGUQNT').innerText = guq;
    
    let daiDien = document.getElementById('inpDaiDienBNT').value, chucVu = document.getElementById('inpChucVuBNT').value;
    document.getElementById('docDaiDienBNT').innerText = daiDien; document.getElementById('docDaiDienB_KyNT').innerText = daiDien;
    document.getElementById('docChucVuBNT').innerText = chucVu; document.getElementById('docChucVuB_KyNT').innerText = chucVu;
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
    currentExcelDataNT.forEach(i => { tong += i.thanhTien; tbody += `<tr><td>${i.stt}</td><td>${i.soHD}</td><td>${i.ngayHD}</td><td class="text-left">${i.tenHang}</td><td>${i.dvt}</td><td class="text-right">${formatTien(i.sl)}</td><td class="text-right">${formatTien(i.gia)}</td><td class="text-right">${formatTien(i.thanhTien)}</td></tr>`; });
    if(currentExcelDataNT.length === 0) tbody = `<tr><td colspan="8" style="text-align:center;font-style:italic;">(Chưa có dữ liệu)</td></tr>`;
    document.getElementById('chiTietHoaDonNT').innerHTML = tbody;
    document.getElementById('tongTienBangSoNT').innerText = formatTien(tong);
    document.getElementById('tongTienBangChuNT').innerText = docTienBangChuNT(tong);
}

// HIỂN THỊ VÀ THAO TÁC TRÊN BẢNG DANH SÁCH BBNT
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
    document.getElementById('dsBBNTBody').innerHTML = tbody;
}

function saveRecordNT() {
    let name = document.getElementById('inpTenBBNT').value.trim();
    if(!name) return alert("Vui lòng đặt tên cho Biên Bản ở ô bên dưới (Ví dụ: BBNT_CPC1_Thang4) rồi mới bấm Lưu!");

    nghiemThuDB[name] = { 
        name: name, 
        soBBNT: document.getElementById('inpSoBBNT').value,
        ngayKy: document.getElementById('inpNgayKyNT').value, 
        soQD: document.getElementById('inpSoQDNT').value, 
        donViQD: document.getElementById('inpDonViQDNT').value,
        noiDungQD: document.getElementById('inpNoiDungQDNT').value,
        soHD: document.getElementById('inpSoHDNT').value, 
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
        excelData: currentExcelDataNT 
    };
    
    localStorage.setItem('nghiemThuDB_v1', JSON.stringify(nghiemThuDB));
    alert("Đã lưu biên bản thành công!"); 
    renderDanhSachBBNT();
}

function loadRecordNT(name) {
    let r = nghiemThuDB[name]; if(!r) return;
    document.getElementById('inpTenBBNT').value = r.name; 
    document.getElementById('inpSoBBNT').value = r.soBBNT || ''; 
    document.getElementById('inpNgayKyNT').value = r.ngayKy || ''; 
    document.getElementById('inpSoQDNT').value = r.soQD || ''; 
    document.getElementById('inpDonViQDNT').value = r.donViQD || 'Trung tâm Y tế Huyện Hàm Thuận Bắc';
    document.getElementById('inpNoiDungQDNT').value = r.noiDungQD || 'về việc phê duyệt kết quả lựa chọn nhà thầu Gói thầu Mua sắm thuốc dược liệu, thuốc có thành phần dược liệu phối hợp với các dược chất hóa dược, thuốc cổ truyền';
    document.getElementById('inpSoHDNT').value = r.soHD || ''; 
    document.getElementById('inpNgayHDNT').value = r.ngayHD || ''; 
    document.getElementById('inpPhuLucNT').value = r.phuLuc || ''; 
    document.getElementById('inpDiaChiBNT').value = r.diaChiB || ''; 
    document.getElementById('inpSDTBNT').value = r.sdtB || ''; 
    document.getElementById('inpTKBNT').value = r.tkB || ''; 
    document.getElementById('inpMSTBNT').value = r.mstB || ''; 
    document.getElementById('inpDaiDienBNT').value = r.daiDienB || ''; 
    document.getElementById('inpChucVuBNT').value = r.chucVuB || ''; 
    document.getElementById('inpGUQNT').value = r.guq || '';
    if(currentUser.role === 'admin') document.getElementById('inpTenBenBNT').value = r.tenBenB || '';
    
    currentExcelDataNT = r.excelData || []; 
    renderTableDataNT(); 
    updateDocNT();
}

function xoaRecordNT(name) {
    if(confirm(`Bạn có chắc chắn muốn XÓA biên bản: ${name} không?`)) {
        delete nghiemThuDB[name];
        localStorage.setItem('nghiemThuDB_v1', JSON.stringify(nghiemThuDB));
        renderDanhSachBBNT();
        lamMoiFormNT();
    }
}

function nhanBanRecordNT(name) {
    let r = nghiemThuDB[name];
    if(!r) return;
    let newName = name + " (Copy " + Math.floor(Math.random() * 100) + ")";
    let newRecord = JSON.parse(JSON.stringify(r)); 
    newRecord.name = newName;
    newRecord.soBBNT = ""; // Reset số biên bản để nhập mới
    newRecord.ngayKy = ""; // Reset ngày ký
    nghiemThuDB[newName] = newRecord;
    localStorage.setItem('nghiemThuDB_v1', JSON.stringify(nghiemThuDB));
    renderDanhSachBBNT();
    loadRecordNT(newName); 
    alert(`Đã nhân bản biên bản thành công!\nVui lòng sửa lại Ngày ký và Số biên bản mới.`);
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