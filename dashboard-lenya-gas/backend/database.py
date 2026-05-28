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
    booking_id = db.Column(db.Integer, db.ForeignKey('booking.id'), nullable=True)
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

class Booking(db.Model):
    __tablename__ = 'booking'
    id = db.Column(db.Integer, primary_key=True)
    tanggal_booking = db.Column(db.Date, nullable=False)
    nama_pembeli = db.Column(db.String(100), nullable=False)
    ukuran_tabung = db.Column(db.String(20), default='3 Kg')
    jumlah = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(20), default='Menunggu')  # Menunggu, Diambil, Batal
    catatan = db.Column(db.String(255), default='')
    tanggal_diambil = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'tanggal_booking': str(self.tanggal_booking),
            'nama_pembeli': self.nama_pembeli,
            'ukuran_tabung': self.ukuran_tabung,
            'jumlah': self.jumlah,
            'status': self.status,
            'catatan': self.catatan,
            'tanggal_diambil': str(self.tanggal_diambil) if self.tanggal_diambil else None,
            'created_at': self.created_at.isoformat()
        }

class StokHarian(db.Model):
    __tablename__ = 'stok_harian'
    id = db.Column(db.Integer, primary_key=True)
    tanggal = db.Column(db.Date, unique=True, nullable=False)
    stok_awal = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Penebusan(db.Model):
    __tablename__ = 'penebusan'
    id = db.Column(db.Integer, primary_key=True)
    tanggal_tebus = db.Column(db.Date, nullable=False)
    jumlah_tabung = db.Column(db.Integer, nullable=False)
    harga_per_tabung = db.Column(db.Integer, default=16000)
    total_modal = db.Column(db.Integer, nullable=False)
    tanggal_datang = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), default='Menunggu')
    waktu_konfirmasi = db.Column(db.DateTime, nullable=True)
    catatan = db.Column(db.String(255), default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'tanggal_tebus': str(self.tanggal_tebus),
            'jumlah_tabung': self.jumlah_tabung,
            'harga_per_tabung': self.harga_per_tabung,
            'total_modal': self.total_modal,
            'tanggal_datang': str(self.tanggal_datang),
            'status': self.status,
            'waktu_konfirmasi': self.waktu_konfirmasi.isoformat() if self.waktu_konfirmasi else None,
            'catatan': self.catatan,
            'created_at': self.created_at.isoformat()
        }