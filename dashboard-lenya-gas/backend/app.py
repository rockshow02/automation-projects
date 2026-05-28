from flask import Flask, request, jsonify
from flask_cors import CORS
from database import db, Penjualan, StokHarian, Penebusan, Booking
from datetime import datetime, date, timedelta
from sqlalchemy import func
import os
import requests

app = Flask(__name__)
CORS(app)

basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(basedir, 'elpiji.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

with app.app_context():
    db.create_all()

TELEGRAM_TOKEN = "8916223771:AAHx4we7KkRj1cKHDdECaiSWksnT2pfB5aU"
TELEGRAM_CHAT_ID = "5990513142"

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

# ── BOOKING ───────────────────────────────────────────

@app.route('/api/booking', methods=['POST'])
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

    pesan = f"""📝 *BOOKING BARU*
━━━━━━━━━━━━━━━━
👤 {b.nama_pembeli}
🫙 {b.ukuran_tabung} × {b.jumlah} tabung
📅 Booking: {b.tanggal_booking}
⏳ Status: Menunggu diambil
━━━━━━━━━━━━━━━━"""
    kirim_telegram(pesan)
    return jsonify({'success': True, 'id': b.id}), 201

@app.route('/api/booking', methods=['GET'])
def get_booking():
    status = request.args.get('status', None)
    q = Booking.query
    if status:
        q = q.filter_by(status=status)
    rows = q.order_by(Booking.tanggal_booking.desc()).all()
    return jsonify([r.to_dict() for r in rows])

@app.route('/api/booking/<int:id>/diambil', methods=['PUT'])
def booking_diambil(id):
    data = request.json
    b = Booking.query.get_or_404(id)
    tgl_ambil = parse_tanggal(data.get('tanggal', date.today().isoformat()))
    status_bayar = data.get('status_bayar', 'Lunas')
    jumlah_dibayar = int(data.get('jumlah_dibayar') or 0)

    b.status = 'Diambil'
    b.tanggal_diambil = tgl_ambil

    p = Penjualan(
        tanggal=tgl_ambil,
        ukuran_tabung=b.ukuran_tabung,
        jumlah=b.jumlah,
        harga_jual=19000,
        harga_beli=16000,
        nama_pembeli=b.nama_pembeli,
        status_bayar=status_bayar,
        jumlah_dibayar=jumlah_dibayar if status_bayar == 'DP' else 0,
        catatan=b.catatan,
        booking_id=b.id
    )
    db.session.add(p)
    db.session.commit()

    total = p.jumlah * p.harga_jual
    if status_bayar == 'Lunas':
        status_line = '✅ Lunas'
    elif status_bayar == 'Hutang':
        status_line = '⏳ Hutang'
    else:
        status_line = f'💳 DP: Rp {jumlah_dibayar:,}'

    pesan = f"""🧾 *STRUK PENJUALAN*
━━━━━━━━━━━━━━━━
📅 {tgl_ambil} | ⏰ {datetime.now().strftime('%H.%M')}
👤 {b.nama_pembeli}
━━━━━━━━━━━━━━━━
🫙 {b.ukuran_tabung} × {b.jumlah} tabung
💵 Rp {p.harga_jual:,}/tabung
💰 Total: Rp {total:,}
━━━━━━━━━━━━━━━━
{status_line}
━━━━━━━━━━━━━━━━"""
    kirim_telegram(pesan)
    return jsonify({'success': True, 'penjualan_id': p.id}), 200

@app.route('/api/booking/<int:id>/batal', methods=['PUT'])
def booking_batal(id):
    b = Booking.query.get_or_404(id)
    b.status = 'Batal'
    db.session.commit()
    pesan = f"❌ *Booking Dibatalkan*\n👤 {b.nama_pembeli} — {b.jumlah} tabung {b.ukuran_tabung}"
    kirim_telegram(pesan)
    return jsonify({'success': True})

# ── PENJUALAN ──────────────────────────────────────────

@app.route('/api/penjualan', methods=['POST'])
def tambah_penjualan():
    data = request.json
    p = Penjualan(
        tanggal=parse_tanggal(data['tanggal']),
        ukuran_tabung=data.get('ukuran_tabung', '3 Kg'),
        jumlah=int(data['jumlah']),
        harga_jual=int(data.get('harga_jual', 19000)),
        harga_beli=int(data.get('harga_beli', 16000)),
        nama_pembeli=data.get('nama_pembeli', ''),
        status_bayar=data.get('status_bayar', 'Lunas'),
        jumlah_dibayar=int(data.get('jumlah_dibayar') or 0),
        catatan=data.get('catatan', '')
    )
    db.session.add(p)
    db.session.commit()

    total = p.jumlah * p.harga_jual
    if p.status_bayar == 'Lunas':
        status_line = '✅ Lunas'
    elif p.status_bayar == 'Hutang':
        status_line = '⏳ Hutang'
    else:
        status_line = f'💳 DP: Rp {p.jumlah_dibayar:,} | Sisa Rp {total - p.jumlah_dibayar:,}'

    pesan = f"""🧾 *STRUK PENJUALAN*
━━━━━━━━━━━━━━━━
📅 {p.tanggal} | ⏰ {datetime.now().strftime('%H.%M')}
👤 {p.nama_pembeli or 'Umum'}
━━━━━━━━━━━━━━━━
🫙 {p.ukuran_tabung} × {p.jumlah} tabung
💵 Rp {p.harga_jual:,}/tabung
💰 Total: Rp {total:,}
━━━━━━━━━━━━━━━━
{status_line}
━━━━━━━━━━━━━━━━"""
    kirim_telegram(pesan)
    return jsonify({'success': True, 'id': p.id}), 201

@app.route('/api/penjualan', methods=['GET'])
def get_penjualan():
    tgl = request.args.get('tanggal', date.today().isoformat())
    rows = Penjualan.query.filter_by(tanggal=tgl).order_by(Penjualan.created_at.desc()).all()
    return jsonify([r.to_dict() for r in rows])

@app.route('/api/penjualan/semua', methods=['GET'])
def get_semua_penjualan():
    rows = Penjualan.query.order_by(Penjualan.tanggal.desc(), Penjualan.created_at.desc()).limit(100).all()
    return jsonify([r.to_dict() for r in rows])

@app.route('/api/penjualan/<int:id>/bayar', methods=['PUT'])
def update_bayar(id):
    data = request.json
    p = Penjualan.query.get_or_404(id)
    p.status_bayar = data.get('status_bayar', p.status_bayar)
    p.jumlah_dibayar = int(data.get('jumlah_dibayar', p.jumlah_dibayar))
    db.session.commit()
    return jsonify({'success': True})

# ── STOK ──────────────────────────────────────────────

@app.route('/api/stok', methods=['POST'])
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
def get_stok():
    tgl = request.args.get('tanggal', date.today().isoformat())
    s = StokHarian.query.filter_by(tanggal=tgl).first()
    if not s:
        return jsonify({'stok_awal': 0, 'tanggal': tgl})
    total_jual = db.session.query(func.sum(Penjualan.jumlah)).filter_by(tanggal=tgl).scalar() or 0
    return jsonify({'tanggal': tgl, 'stok_awal': s.stok_awal, 'terjual': total_jual, 'sisa': s.stok_awal - total_jual})

# ── PENEBUSAN ─────────────────────────────────────────

@app.route('/api/penebusan', methods=['POST'])
def tambah_penebusan():
    data = request.json
    tgl_tebus = parse_tanggal(data['tanggal_tebus'])
    tgl_datang_str = data.get('tanggal_datang', str(tgl_tebus + timedelta(days=1)))
    tgl_datang = parse_tanggal(tgl_datang_str)
    jumlah = int(data['jumlah_tabung'])
    harga = int(data.get('harga_per_tabung', 16000))
    total = jumlah * harga

    p = Penebusan(tanggal_tebus=tgl_tebus, jumlah_tabung=jumlah, harga_per_tabung=harga,
                  total_modal=total, tanggal_datang=tgl_datang, status='Menunggu', catatan=data.get('catatan', ''))
    db.session.add(p)
    db.session.commit()

    pesan = f"""📋 *PENEBUSAN BARU*
━━━━━━━━━━━━━━━━
📅 Tebus: {tgl_tebus}
🚚 Gas datang: {tgl_datang}
🫙 Jumlah: {jumlah} tabung
💸 Modal: Rp {total:,}
⏳ Status: Menunggu kedatangan
━━━━━━━━━━━━━━━━"""
    kirim_telegram(pesan)
    return jsonify({'success': True, 'id': p.id}), 201

@app.route('/api/penebusan', methods=['GET'])
def get_penebusan():
    rows = Penebusan.query.order_by(Penebusan.tanggal_datang.desc()).all()
    return jsonify([r.to_dict() for r in rows])

@app.route('/api/penebusan/<int:id>/konfirmasi', methods=['PUT'])
def konfirmasi_datang(id):
    p = Penebusan.query.get_or_404(id)
    p.status = 'Sudah Datang'
    p.waktu_konfirmasi = datetime.utcnow()

    # Auto update stok harian
    tgl_hari_ini = date.today()
    s = StokHarian.query.filter_by(tanggal=tgl_hari_ini).first()
    if s:
        s.stok_awal += p.jumlah_tabung
    else:
        s = StokHarian(tanggal=tgl_hari_ini, stok_awal=p.jumlah_tabung)
        db.session.add(s)

    db.session.commit()
    pesan = f"""✅ *GAS SUDAH DATANG!*
━━━━━━━━━━━━━━━━
🫙 {p.jumlah_tabung} tabung 3 Kg
📅 Tiba: {tgl_hari_ini}
💸 Modal: Rp {p.total_modal:,}
📦 Stok otomatis diupdate: {p.jumlah_tabung} tabung
━━━━━━━━━━━━━━━━"""
    kirim_telegram(pesan)
    return jsonify({'success': True})

# ── LAPORAN ───────────────────────────────────────────

@app.route('/api/laporan/hari-ini', methods=['GET'])
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

    penebusan_hari_ini = Penebusan.query.filter_by(tanggal_tebus=tgl).all()
    total_modal_keluar = sum(p.total_modal for p in penebusan_hari_ini)

    booking_menunggu = Booking.query.filter_by(status='Menunggu').count()

    modal = total_tabung * HARGA_BELI
    keuntungan_kotor = total_tabung * (rows[0].harga_jual - HARGA_BELI) if rows else 0
    keuntungan_bersih = keuntungan_kotor - DANA_TABUNGAN if total_tabung > 0 else 0
    uang_masuk = total_lunas + total_dp_uang
    saldo_kas = uang_masuk - total_modal_keluar

    return jsonify({
        'tanggal': tgl, 'total_tabung': total_tabung, 'stok_awal': stok_awal,
        'sisa_stok': sisa_stok, 'total_omset': total_omset,
        'sudah_dibayar': uang_masuk, 'belum_dibayar': total_hutang + (total_dp - total_dp_uang),
        'modal': modal, 'modal_keluar': total_modal_keluar,
        'keuntungan_kotor': keuntungan_kotor, 'dana_tabungan': DANA_TABUNGAN if total_tabung > 0 else 0,
        'keuntungan_bersih': keuntungan_bersih, 'saldo_kas': saldo_kas,
        'booking_menunggu': booking_menunggu,
        'transaksi': [r.to_dict() for r in rows]
    })

@app.route('/api/laporan/mingguan', methods=['GET'])
def laporan_mingguan():
    rows = db.session.query(
        Penjualan.tanggal,
        func.sum(Penjualan.jumlah).label('total_tabung'),
        func.sum(Penjualan.jumlah * Penjualan.harga_jual).label('omset')
    ).group_by(Penjualan.tanggal).order_by(Penjualan.tanggal.desc()).limit(7).all()
    return jsonify([{'tanggal': str(r.tanggal), 'total_tabung': r.total_tabung, 'omset': r.omset} for r in reversed(rows)])

@app.route('/api/hutang', methods=['GET'])
def get_hutang():
    rows = Penjualan.query.filter(Penjualan.status_bayar.in_(['Hutang', 'DP'])).order_by(Penjualan.tanggal.desc()).all()
    return jsonify([r.to_dict() for r in rows])

if __name__ == '__main__':
    app.run(debug=True, port=5000)