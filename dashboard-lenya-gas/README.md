# Dashboard Lenya Gas

Dashboard penjualan gas elpiji berbasis web — React + Flask + SQLite.

## Fitur
- Dashboard real-time: omset, stok, keuntungan
- Grafik penjualan 7 hari terakhir
- Riwayat transaksi lengkap
- Manajemen hutang & DP
- Input stok pagi & penjualan

## Cara Menjalankan

### Backend (Flask)
```bash
cd backend
pip install -r requirements.txt
python app.py
```
Backend berjalan di http://localhost:5000

### Frontend (React)
```bash
cd frontend
npm install
npm run dev
```
Frontend berjalan di http://localhost:3000

## Struktur
```
dashboard-lenya-gas/
├── backend/
│   ├── app.py          # Flask API
│   ├── database.py     # SQLAlchemy models
│   ├── requirements.txt
│   └── elpiji.db       # SQLite database (auto-generated)
└── frontend/
    ├── src/
    │   ├── App.jsx     # Main dashboard component
    │   └── main.jsx
    ├── index.html
    ├── package.json
    └── vite.config.js
```
