from flask import Flask, request, jsonify
from flask_cors import CORS
from database import db, Penjualan, StokHarian
from datetime import datetime, date
from sqlalchemy import func
import os

app = Flask(__name__)
CORS(app)

basedir = os.path.abspath(os.path.dirname(__file__))
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(basedir, 'elpiji.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

with app.app_context():
    db.create_all()

# ── PENJUALAN ──────────────────────────────────────────

@app.route('/api/penjualan', methods=['POST'])
def tambah_penjualan():
    data = request.json
    tgl_str = data['tanggal']
    try:
        tgl = datetime.strptime(tgl_str, '%Y-%m-%d').date()
    except ValueError:
        tgl = datetime.strptime(tgl_str, '%d/%m/%Y').date()

    p = Penjualan(
        tanggal=tgl,
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
    tgl_str = data['tanggal']
    try:
        tgl = datetime.strptime(tgl_str, '%Y-%m-%d').date()
    except ValueError:
        tgl = datetime.strptime(tgl_str, '%d/%m/%Y').date()

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
    return jsonify({
        'tanggal': tgl,
        'stok_awal': s.stok_awal,
        'terjual': total_jual,
        'sisa': s.stok_awal - total_jual
    })

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

    modal = total_tabung * HARGA_BELI
    keuntungan_kotor = total_tabung * (rows[0].harga_jual - HARGA_BELI) if rows else 0
    keuntungan_bersih = keuntungan_kotor - DANA_TABUNGAN if total_tabung > 0 else 0

    return jsonify({
        'tanggal': tgl,
        'total_tabung': total_tabung,
        'stok_awal': stok_awal,
        'sisa_stok': sisa_stok,
        'total_omset': total_omset,
        'sudah_dibayar': total_lunas + total_dp_uang,
        'belum_dibayar': total_hutang + (total_dp - total_dp_uang),
        'modal': modal,
        'keuntungan_kotor': keuntungan_kotor,
        'dana_tabungan': DANA_TABUNGAN if total_tabung > 0 else 0,
        'keuntungan_bersih': keuntungan_bersih,
        'transaksi': [r.to_dict() for r in rows]
    })

@app.route('/api/laporan/mingguan', methods=['GET'])
def laporan_mingguan():
    rows = db.session.query(
        Penjualan.tanggal,
        func.sum(Penjualan.jumlah).label('total_tabung'),
        func.sum(Penjualan.jumlah * Penjualan.harga_jual).label('omset')
    ).group_by(Penjualan.tanggal).order_by(Penjualan.tanggal.desc()).limit(7).all()

    return jsonify([{
        'tanggal': str(r.tanggal),
        'total_tabung': r.total_tabung,
        'omset': r.omset
    } for r in reversed(rows)])

@app.route('/api/hutang', methods=['GET'])
def get_hutang():
    rows = Penjualan.query.filter(
        Penjualan.status_bayar.in_(['Hutang', 'DP'])
    ).order_by(Penjualan.tanggal.desc()).all()
    return jsonify([r.to_dict() for r in rows])

if __name__ == '__main__':
    app.run(debug=True, port=5000)