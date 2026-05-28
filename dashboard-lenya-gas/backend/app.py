from flask import Flask, request, jsonify, session
from flask_cors import CORS
from database import db, Penjualan, StokHarian, Penebusan, Booking
from datetime import datetime, date, timedelta
from sqlalchemy import func
import os
import requests
import hashlib
import functools

app = Flask(__name__)
CORS(app, supports_credentials=True, origins=["https://automation-projects-seven.vercel.app", "http://localhost:5173", "http://localhost:3000"])

basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(basedir, 'elpiji.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'bf9f9ce33db3c0ad9ec8edabb26fcdcdc1743d7308ca3f235dc40d0a6412d5ef'
app.config['SESSION_COOKIE_SAMESITE'] = 'None'
app.config['SESSION_COOKIE_SECURE'] = True

db.init_app(app)

with app.app_context():
    db.create_all()

TELEGRAM_TOKEN = "8916223771:AAHx4we7KkRj1cKHDdECaiSWksnT2pfB5aU"
TELEGRAM_CHAT_ID = "5990513142"

# Credentials
USERS = {
    "lenya": "87b821e3f3380643b902cc355b2b7058b7d8c90117ffa6af85f865ba4d52a7ac"
}

def hash_password(pwd):
    return hashlib.sha256(pwd.encode()).hexdigest()

def login_required(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('logged_in'):
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated

def kirim_telegram(pesan):
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_TOKEN}/sendMessage"
        requests.post(url, json={"chat_id": TELEGRAM_CHAT_ID, "text": pesan, "parse_mode": "Markdown"})
    except Exception:
        pass

def parse_tanggal(tgl_str):
    try:
        return datetime.strptime(tgl_str, '%Y-%m-%d').date()
    except ValueError:
        return datetime.strptime(tgl_str, '%d/%m/%Y').date()

# ── AUTH ──────────────────────────────────────────────

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username', '')
    password = data.get('password', '')
    hashed = hash_password(password)
    if USERS.get(username) == hashed:
        session['logged_in'] = True
        session['username'] = username
        return jsonify({'success': True, 'username': username})
    return jsonify({'error': 'Username atau password salah'}), 401

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'success': True})

@app.route('/api/auth/check', methods=['GET'])
def check_auth():
    return jsonify({'logged_in': session.get('logged_in', False), 'username': session.get('username', '')})

# ── BOOKING ───────────────────────────────────────────

@app.route('/api/booking', methods=['POST'])
@login_required
def tambah_booking():
    data = request.json
    b = Booking(
        tanggal_booking=parse_tanggal(data['tanggal_booking']),
        nama_pembeli=data['nama_pembeli'],
        ukuran_tabung=data.get('ukuran_tabung', '3 Kg'),
        jumlah=int(data['jumlah']),
        status='Menunggu',
        catatan=data.get('catatan', '')
    )
    db.session.add(b)
    db.session.commit()
    pesan = f"""📝 *BOOKING BARU*\n━━━━━━━━━━━━━━━━\n👤 {b.nama_pembeli}\n🫙 {b.ukuran_tabung} × {b.jumlah} tabung\n📅 Booking: {b.tanggal_booking}\n⏳ Status: Menunggu diambil\n━━━━━━━━━━━━━━━━"""
    kirim_telegram(pesan)
    return jsonify({'success': True, 'id': b.id}), 201

@app.route('/api/booking', methods=['GET'])
@login_required
def get_booking():
    rows = Booking.query.order_by(Booking.tanggal_booking.desc()).all()
    return jsonify([r.to_dict() for r in rows])

@app.route('/api/booking/<int:id>/diambil', methods=['PUT'])
@login_required
def booking_diambil(id):
    data = request.json
    b = Booking.query.get_or_404(id)
    tgl_ambil = parse_tanggal(data.get('tanggal', date.today().isoformat()))
    status_bayar = data.get('status_bayar', 'Lunas')
    jumlah_dibayar = int(data.get('jumlah_dibayar') or 0)
    b.status = 'Diambil'
    b.tanggal_diambil = tgl_ambil
    p = Penjualan(tanggal=tgl_ambil, ukuran_tabung=b.ukuran_tabung, jumlah=b.jumlah, harga_jual=19000, harga_beli=16000, nama_pembeli=b.nama_pembeli, status_bayar=status_bayar, jumlah_dibayar=jumlah_dibayar if status_bayar == 'DP' else 0, catatan=b.catatan, booking_id=b.id)
    db.session.add(p)
    db.session.commit()
    total = p.jumlah * p.harga_jual
    status_line = '✅ Lunas' if status_bayar == 'Lunas' else '⏳ Hutang' if status_bayar == 'Hutang' else f'💳 DP: Rp {jumlah_dibayar:,}'
    pesan = f"""🧾 *STRUK PENJUALAN*\n━━━━━━━━━━━━━━━━\n📅 {tgl_ambil} | ⏰ {datetime.now().strftime('%H.%M')}\n👤 {b.nama_pembeli}\n━━━━━━━━━━━━━━━━\n🫙 {b.ukuran_tabung} × {b.jumlah} tabung\n💵 Rp {p.harga_jual:,}/tabung\n💰 Total: Rp {total:,}\n━━━━━━━━━━━━━━━━\n{status_line}\n━━━━━━━━━━━━━━━━"""
    kirim_telegram(pesan)
    return jsonify({'success': True, 'penjualan_id': p.id}), 200

@app.route('/api/booking/<int:id>/batal', methods=['PUT'])
@login_required
def booking_batal(id):
    b = Booking.query.get_or_404(id)
    b.status = 'Batal'
    db.session.commit()
    kirim_telegram(f"❌ *Booking Dibatalkan*\n👤 {b.nama_pembeli} — {b.jumlah} tabung {b.ukuran_tabung}")
    return jsonify({'success': True})

# ── PENJUALAN ──────────────────────────────────────────

@app.route('/api/penjualan', methods=['POST'])
@login_required
def tambah_penjualan():
    data = request.json
    p = Penjualan(tanggal=parse_tanggal(data['tanggal']), ukuran_tabung=data.get('ukuran_tabung', '3 Kg'), jumlah=int(data['jumlah']), harga_jual=int(data.get('harga_jual', 19000)), harga_beli=int(data.get('harga_beli', 16000)), nama_pembeli=data.get('nama_pembeli', ''), status_bayar=data.get('status_bayar', 'Lunas'), jumlah_dibayar=int(data.get('jumlah_dibayar') or 0), catatan=data.get('catatan', ''))
    db.session.add(p)
    db.session.commit()
    total = p.jumlah * p.harga_jual
    status_line = '✅ Lunas' if p.status_bayar == 'Lunas' else '⏳ Hutang' if p.status_bayar == 'Hutang' else f'💳 DP: Rp {p.jumlah_dibayar:,}'
    kirim_telegram(f"🧾 *STRUK PENJUALAN*\n━━━━━━━━━━━━━━━━\n📅 {p.tanggal} | ⏰ {datetime.now().strftime('%H.%M')}\n👤 {p.nama_pembeli or 'Umum'}\n━━━━━━━━━━━━━━━━\n🫙 {p.ukuran_tabung} × {p.jumlah} tabung\n💵 Rp {p.harga_jual:,}/tabung\n💰 Total: Rp {total:,}\n━━━━━━━━━━━━━━━━\n{status_line}\n━━━━━━━━━━━━━━━━")
    return jsonify({'success': True, 'id': p.id}), 201

@app.route('/api/penjualan', methods=['GET'])
@login_required
def get_penjualan():
    tgl = request.args.get('tanggal', date.today().isoformat())
    rows = Penjualan.query.filter_by(tanggal=tgl).order_by(Penjualan.created_at.desc()).all()
    return jsonify([r.to_dict() for r in rows])

@app.route('/api/penjualan/semua', methods=['GET'])
@login_required
def get_semua_penjualan():
    rows = Penjualan.query.order_by(Penjualan.tanggal.desc(), Penjualan.created_at.desc()).limit(100).all()
    return jsonify([r.to_dict() for r in rows])

@app.route('/api/penjualan/cari', methods=['GET'])
@login_required
def cari_penjualan():
    q = request.args.get('q', '')
    dari = request.args.get('dari', None)
    sampai = request.args.get('sampai', None)
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 20))
    query = Penjualan.query
    if q:
        query = query.filter(Penjualan.nama_pembeli.ilike(f'%{q}%'))
    if dari:
        query = query.filter(Penjualan.tanggal >= parse_tanggal(dari))
    if sampai:
        query = query.filter(Penjualan.tanggal <= parse_tanggal(sampai))
    total = query.count()
    rows = query.order_by(Penjualan.tanggal.desc(), Penjualan.created_at.desc()).offset((page-1)*per_page).limit(per_page).all()
    return jsonify({'total': total, 'page': page, 'per_page': per_page, 'total_pages': (total + per_page - 1) // per_page, 'data': [r.to_dict() for r in rows]})

@app.route('/api/penjualan/<int:id>/bayar', methods=['PUT'])
@login_required
def update_bayar(id):
    data = request.json
    p = Penjualan.query.get_or_404(id)
    p.status_bayar = data.get('status_bayar', p.status_bayar)
    p.jumlah_dibayar = int(data.get('jumlah_dibayar', p.jumlah_dibayar))
    db.session.commit()
    return jsonify({'success': True})

# ── STOK ──────────────────────────────────────────────

@app.route('/api/stok', methods=['POST'])
@login_required
def tambah_stok():
    data = request.json
    tgl = parse_tanggal(data['tanggal'])
    s = StokHarian.query.filter_by(tanggal=tgl).first()
    if s:
        s.stok_awal = int(data['stok_awal'])
    else:
        s = StokHarian(tanggal=tgl, stok_awal=int(data['stok_awal']))
        db.session.add(s)
    db.session.commit()
    return jsonify({'success': True}), 201

@app.route('/api/stok', methods=['GET'])
@login_required
def get_stok():
    tgl = request.args.get('tanggal', date.today().isoformat())
    s = StokHarian.query.filter_by(tanggal=tgl).first()
    if not s:
        return jsonify({'stok_awal': 0, 'tanggal': tgl})
    total_jual = db.session.query(func.sum(Penjualan.jumlah)).filter_by(tanggal=tgl).scalar() or 0
    return jsonify({'tanggal': tgl, 'stok_awal': s.stok_awal, 'terjual': total_jual, 'sisa': s.stok_awal - total_jual})

# ── PENEBUSAN ─────────────────────────────────────────

@app.route('/api/penebusan', methods=['POST'])
@login_required
def tambah_penebusan():
    data = request.json
    tgl_tebus = parse_tanggal(data['tanggal_tebus'])
    tgl_datang = parse_tanggal(data.get('tanggal_datang', str(tgl_tebus + timedelta(days=1))))
    jumlah = int(data['jumlah_tabung'])
    harga = int(data.get('harga_per_tabung', 16000))
    total = jumlah * harga
    p = Penebusan(tanggal_tebus=tgl_tebus, jumlah_tabung=jumlah, harga_per_tabung=harga, total_modal=total, tanggal_datang=tgl_datang, status='Menunggu', catatan=data.get('catatan', ''))
    db.session.add(p)
    db.session.commit()
    kirim_telegram(f"📋 *PENEBUSAN BARU*\n━━━━━━━━━━━━━━━━\n📅 Tebus: {tgl_tebus}\n🚚 Gas datang: {tgl_datang}\n🫙 Jumlah: {jumlah} tabung\n💸 Modal: Rp {total:,}\n⏳ Status: Menunggu\n━━━━━━━━━━━━━━━━")
    return jsonify({'success': True, 'id': p.id}), 201

@app.route('/api/penebusan', methods=['GET'])
@login_required
def get_penebusan():
    rows = Penebusan.query.order_by(Penebusan.tanggal_datang.desc()).all()
    return jsonify([r.to_dict() for r in rows])

@app.route('/api/penebusan/<int:id>/konfirmasi', methods=['PUT'])
@login_required
def konfirmasi_datang(id):
    p = Penebusan.query.get_or_404(id)
    p.status = 'Sudah Datang'
    p.waktu_konfirmasi = datetime.utcnow()
    tgl_hari_ini = date.today()
    s = StokHarian.query.filter_by(tanggal=tgl_hari_ini).first()
    if s:
        s.stok_awal += p.jumlah_tabung
    else:
        s = StokHarian(tanggal=tgl_hari_ini, stok_awal=p.jumlah_tabung)
        db.session.add(s)
    db.session.commit()
    kirim_telegram(f"✅ *GAS SUDAH DATANG!*\n━━━━━━━━━━━━━━━━\n🫙 {p.jumlah_tabung} tabung 3 Kg\n📅 Tiba: {tgl_hari_ini}\n💸 Modal: Rp {p.total_modal:,}\n📦 Stok terupdate otomatis\n━━━━━━━━━━━━━━━━")
    return jsonify({'success': True})

# ── LAPORAN ───────────────────────────────────────────

@app.route('/api/laporan/hari-ini', methods=['GET'])
@login_required
def laporan_hari_ini():
    tgl = request.args.get('tanggal', date.today().isoformat())
    rows = Penjualan.query.filter_by(tanggal=tgl).all()
    HARGA_BELI = 16000
    DANA_TABUNGAN = 10000
    total_tabung = sum(r.jumlah for r in rows)
    total_omset = sum(r.jumlah * r.harga_jual for r in rows)
    total_lunas = sum(r.jumlah * r.harga_jual for r in rows if r.status_bayar == 'Lunas')
    total_dp_uang = sum(r.jumlah_dibayar for r in rows if r.status_bayar == 'DP')
    total_hutang = sum(r.jumlah * r.harga_jual for r in rows if r.status_bayar == 'Hutang')
    total_dp = sum(r.jumlah * r.harga_jual for r in rows if r.status_bayar == 'DP')
    stok = StokHarian.query.filter_by(tanggal=tgl).first()
    stok_awal = stok.stok_awal if stok else 0
    sisa_stok = stok_awal - total_tabung if stok_awal else 0
    penebusan_hari = Penebusan.query.filter_by(tanggal_tebus=tgl).all()
    total_modal_keluar = sum(p.total_modal for p in penebusan_hari)
    booking_menunggu = Booking.query.filter_by(status='Menunggu').count()
    modal = total_tabung * HARGA_BELI
    keuntungan_kotor = total_tabung * (rows[0].harga_jual - HARGA_BELI) if rows else 0
    keuntungan_bersih = keuntungan_kotor - DANA_TABUNGAN if total_tabung > 0 else 0
    uang_masuk = total_lunas + total_dp_uang
    saldo_kas = uang_masuk - total_modal_keluar
    return jsonify({'tanggal': tgl, 'total_tabung': total_tabung, 'stok_awal': stok_awal, 'sisa_stok': sisa_stok, 'total_omset': total_omset, 'sudah_dibayar': uang_masuk, 'belum_dibayar': total_hutang + (total_dp - total_dp_uang), 'modal': modal, 'modal_keluar': total_modal_keluar, 'keuntungan_kotor': keuntungan_kotor, 'dana_tabungan': DANA_TABUNGAN if total_tabung > 0 else 0, 'keuntungan_bersih': keuntungan_bersih, 'saldo_kas': saldo_kas, 'booking_menunggu': booking_menunggu, 'transaksi': [r.to_dict() for r in rows]})

@app.route('/api/laporan/mingguan', methods=['GET'])
@login_required
def laporan_mingguan():
    rows = db.session.query(Penjualan.tanggal, func.sum(Penjualan.jumlah).label('total_tabung'), func.sum(Penjualan.jumlah * Penjualan.harga_jual).label('omset')).group_by(Penjualan.tanggal).order_by(Penjualan.tanggal.desc()).limit(7).all()
    return jsonify([{'tanggal': str(r.tanggal), 'total_tabung': r.total_tabung, 'omset': r.omset} for r in reversed(rows)])

@app.route('/api/laporan/periode', methods=['GET'])
@login_required
def laporan_periode():
    dari = request.args.get('dari', date.today().isoformat())
    sampai = request.args.get('sampai', date.today().isoformat())
    dari_date = parse_tanggal(dari)
    sampai_date = parse_tanggal(sampai)
    rows = Penjualan.query.filter(Penjualan.tanggal >= dari_date, Penjualan.tanggal <= sampai_date).all()
    HARGA_BELI = 16000
    DANA_TABUNGAN = 10000
    total_tabung = sum(r.jumlah for r in rows)
    total_omset = sum(r.jumlah * r.harga_jual for r in rows)
    total_lunas = sum(r.jumlah * r.harga_jual for r in rows if r.status_bayar == 'Lunas')
    total_dp_uang = sum(r.jumlah_dibayar for r in rows if r.status_bayar == 'DP')
    total_hutang = sum(r.jumlah * r.harga_jual for r in rows if r.status_bayar == 'Hutang')
    total_dp = sum(r.jumlah * r.harga_jual for r in rows if r.status_bayar == 'DP')
    penebusan = Penebusan.query.filter(Penebusan.tanggal_tebus >= dari_date, Penebusan.tanggal_tebus <= sampai_date).all()
    total_modal_keluar = sum(p.total_modal for p in penebusan)
    modal = total_tabung * HARGA_BELI
    keuntungan_kotor = total_tabung * (19000 - HARGA_BELI)
    hari_aktif = len(set(r.tanggal for r in rows))
    keuntungan_bersih = keuntungan_kotor - (DANA_TABUNGAN * hari_aktif)
    uang_masuk = total_lunas + total_dp_uang
    saldo_kas = uang_masuk - total_modal_keluar
    per_hari = {}
    for r in rows:
        tgl = str(r.tanggal)
        if tgl not in per_hari:
            per_hari[tgl] = {'tanggal': tgl, 'total_tabung': 0, 'omset': 0, 'transaksi': 0}
        per_hari[tgl]['total_tabung'] += r.jumlah
        per_hari[tgl]['omset'] += r.jumlah * r.harga_jual
        per_hari[tgl]['transaksi'] += 1
    return jsonify({'dari': dari, 'sampai': sampai, 'total_tabung': total_tabung, 'total_omset': total_omset, 'sudah_dibayar': uang_masuk, 'belum_dibayar': total_hutang + (total_dp - total_dp_uang), 'modal': modal, 'modal_keluar': total_modal_keluar, 'keuntungan_kotor': keuntungan_kotor, 'dana_tabungan': DANA_TABUNGAN * hari_aktif, 'keuntungan_bersih': keuntungan_bersih, 'saldo_kas': saldo_kas, 'hari_aktif': hari_aktif, 'per_hari': sorted(per_hari.values(), key=lambda x: x['tanggal']), 'transaksi': [r.to_dict() for r in rows]})

@app.route('/api/hutang', methods=['GET'])
@login_required
def get_hutang():
    rows = Penjualan.query.filter(Penjualan.status_bayar.in_(['Hutang', 'DP'])).order_by(Penjualan.tanggal.desc()).all()
    return jsonify([r.to_dict() for r in rows])

if __name__ == '__main__':
    app.run(debug=True, port=5000)