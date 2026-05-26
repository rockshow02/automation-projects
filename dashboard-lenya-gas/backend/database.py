from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Penjualan(db.Model):
    __tablename__ = 'penjualan'
    id = db.Column(db.Integer, primary_key=True)
    tanggal = db.Column(db.Date, nullable=False)
    ukuran_tabung = db.Column(db.String(20), default='3 Kg')
    jumlah = db.Column(db.Integer, nullable=False)
    harga_jual = db.Column(db.Integer, default=19000)
    harga_beli = db.Column(db.Integer, default=16000)
    nama_pembeli = db.Column(db.String(100), default='')
    status_bayar = db.Column(db.String(20), default='Lunas')
    jumlah_dibayar = db.Column(db.Integer, default=0)
    catatan = db.Column(db.String(255), default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        total = self.jumlah * self.harga_jual
        return {
            'id': self.id,
            'tanggal': str(self.tanggal),
            'ukuran_tabung': self.ukuran_tabung,
            'jumlah': self.jumlah,
            'harga_jual': self.harga_jual,
            'total': total,
            'nama_pembeli': self.nama_pembeli,
            'status_bayar': self.status_bayar,
            'jumlah_dibayar': self.jumlah_dibayar,
            'sisa_tagihan': total - self.jumlah_dibayar if self.status_bayar != 'Lunas' else 0,
            'catatan': self.catatan,
            'created_at': self.created_at.isoformat()
        }

class StokHarian(db.Model):
    __tablename__ = 'stok_harian'
    id = db.Column(db.Integer, primary_key=True)
    tanggal = db.Column(db.Date, unique=True, nullable=False)
    stok_awal = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
