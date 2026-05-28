import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const API = "https://adiyansyaah.pythonanywhere.com/api";
const fmt = (n) => new Intl.NumberFormat("id-ID").format(n || 0);
const fmtDate = (d) => new Date(d + 'T00:00:00').toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
const fmtFull = (d) => new Date(d + 'T00:00:00').toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
const today = () => new Date().toISOString().split("T")[0];
const addDays = (n) => new Date(Date.now() + n * 86400000).toISOString().split("T")[0];
const startOf = (type) => {
  const d = new Date();
  if (type === 'week') d.setDate(d.getDate() - d.getDay() + 1);
  if (type === 'month') d.setDate(1);
  if (type === 'year') d.setMonth(0, 1);
  return d.toISOString().split("T")[0];
};

const NAV_ITEMS = [
  { id: "Dashboard", icon: "⊞", label: "Dashboard" },
  { id: "Booking", icon: "📝", label: "Booking" },
  { id: "Transaksi", icon: "🧾", label: "Transaksi" },
  { id: "Hutang", icon: "⏳", label: "Hutang" },
  { id: "Penebusan", icon: "💸", label: "Penebusan" },
  { id: "Laporan", icon: "📊", label: "Laporan" },
  { id: "Input", icon: "➕", label: "Input" },
];

const inputStyle = { width: "100%", background: "#070C14", border: "1px solid #1E2A3D", borderRadius: 8, padding: "10px 12px", color: "#E8EDF5", fontFamily: "'DM Sans', sans-serif", fontSize: 14, boxSizing: "border-box" };
const cardStyle = { background: "#0F1624", border: "1px solid #1E2A3D", borderRadius: 14, padding: 20 };
const btnPrimary = { background: "#00C896", border: "none", borderRadius: 10, padding: "12px", color: "#0A0F1A", fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%" };

const KRow = ({ label, value, color }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #1A2535" }}>
    <span style={{ fontSize: 13, color: "#6B829A" }}>{label}</span>
    <span style={{ fontSize: 13, fontWeight: 600, color }}>{typeof value === 'string' ? value : `Rp ${fmt(value)}`}</span>
  </div>
);

const THead = ({ cols }) => (
  <thead>
    <tr style={{ background: "#070C14" }}>
      {cols.map(h => <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, color: "#4A6A8A", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</th>)}
    </tr>
  </thead>
);

export default function App() {
  const [tab, setTab] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [laporanTab, setLaporanTab] = useState("Harian");
  const [laporan, setLaporan] = useState(null);
  const [mingguan, setMingguan] = useState([]);
  const [hutang, setHutang] = useState([]);
  const [penebusan, setPenebusan] = useState([]);
  const [booking, setBooking] = useState([]);
  const [struk, setStruk] = useState(null);
  const [diambilModal, setDiambilModal] = useState(null);
  const [msg, setMsg] = useState("");

  const [transaksi, setTransaksi] = useState([]);
  const [transaksiTotal, setTransaksiTotal] = useState(0);
  const [transaksiPage, setTransaksiPage] = useState(1);
  const [transaksiTotalPages, setTransaksiTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [filterDari, setFilterDari] = useState("");
  const [filterSampai, setFilterSampai] = useState("");

  const [laporanData, setLaporanData] = useState(null);
  const [laporanDari, setLaporanDari] = useState(today());
  const [laporanSampai, setLaporanSampai] = useState(today());

  const [form, setForm] = useState({ tanggal: today(), ukuran_tabung: "3 Kg", jumlah: "", harga_jual: 19000, nama_pembeli: "", status_bayar: "Lunas", jumlah_dibayar: "", catatan: "" });
  const [bookingForm, setBookingForm] = useState({ tanggal_booking: today(), nama_pembeli: "", ukuran_tabung: "3 Kg", jumlah: "", catatan: "" });
  const [tebusForm, setTebusForm] = useState({ tanggal_tebus: today(), jumlah_tabung: "", harga_per_tabung: 16000, tanggal_datang: addDays(1), catatan: "" });
  const [diambilForm, setDiambilForm] = useState({ tanggal: today(), status_bayar: "Lunas", jumlah_dibayar: "" });

  const loadBase = async () => {
    const [l, m, h, p, b] = await Promise.all([
      fetch(`${API}/laporan/hari-ini`).then(r => r.json()),
      fetch(`${API}/laporan/mingguan`).then(r => r.json()),
      fetch(`${API}/hutang`).then(r => r.json()),
      fetch(`${API}/penebusan`).then(r => r.json()),
      fetch(`${API}/booking`).then(r => r.json()),
    ]);
    setLaporan(l); setMingguan(m); setHutang(h); setPenebusan(p); setBooking(b);
  };

  const loadTransaksi = useCallback(async (page = 1) => {
    const params = new URLSearchParams({ page, per_page: 20 });
    if (search) params.append('q', search);
    if (filterDari) params.append('dari', filterDari);
    if (filterSampai) params.append('sampai', filterSampai);
    const r = await fetch(`${API}/penjualan/cari?${params}`).then(r => r.json());
    setTransaksi(r.data || []); setTransaksiTotal(r.total || 0);
    setTransaksiPage(r.page || 1); setTransaksiTotalPages(r.total_pages || 1);
  }, [search, filterDari, filterSampai]);

  const loadLaporan = useCallback(async () => {
    const r = await fetch(`${API}/laporan/periode?dari=${laporanDari}&sampai=${laporanSampai}`).then(r => r.json());
    setLaporanData(r);
  }, [laporanDari, laporanSampai]);

  useEffect(() => { loadBase(); }, []);
  useEffect(() => { if (tab === "Transaksi") loadTransaksi(1); }, [tab, loadTransaksi]);
  useEffect(() => { if (tab === "Laporan") loadLaporan(); }, [tab, laporanDari, laporanSampai, loadLaporan]);

  const setPeriode = (type) => {
    if (type === 'hari') { setLaporanDari(today()); setLaporanSampai(today()); }
    if (type === 'minggu') { setLaporanDari(startOf('week')); setLaporanSampai(today()); }
    if (type === 'bulan') { setLaporanDari(startOf('month')); setLaporanSampai(today()); }
    if (type === 'tahun') { setLaporanDari(startOf('year')); setLaporanSampai(today()); }
  };

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };
  const statusColor = (s) => ({ "Lunas": "#00C896", "Sudah Datang": "#00C896", "Diambil": "#00C896", "Hutang": "#FF6B6B", "Menunggu": "#F4A261", "DP": "#F4A261", "Batal": "#4A6A8A" }[s] || "#4A6A8A");
  const bookingMenunggu = booking.filter(b => b.status === 'Menunggu');

  const submitBooking = async (e) => { e.preventDefault(); await fetch(`${API}/booking`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bookingForm) }); showMsg("✅ Booking tersimpan!"); setBookingForm({ tanggal_booking: today(), nama_pembeli: "", ukuran_tabung: "3 Kg", jumlah: "", catatan: "" }); loadBase(); };
  const submitDiambil = async () => { await fetch(`${API}/booking/${diambilModal.id}/diambil`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(diambilForm) }); showMsg("✅ Gas diambil!"); setDiambilModal(null); loadBase(); if (tab === "Transaksi") loadTransaksi(1); };
  const batalBooking = async (id) => { if (!window.confirm("Batalkan booking ini?")) return; await fetch(`${API}/booking/${id}/batal`, { method: "PUT", headers: { "Content-Type": "application/json" } }); showMsg("❌ Booking dibatalkan."); loadBase(); };
  const submitPenjualan = async (e) => { e.preventDefault(); await fetch(`${API}/penjualan`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) }); showMsg("✅ Transaksi tersimpan!"); setForm({ tanggal: today(), ukuran_tabung: "3 Kg", jumlah: "", harga_jual: 19000, nama_pembeli: "", status_bayar: "Lunas", jumlah_dibayar: "", catatan: "" }); loadBase(); if (tab === "Transaksi") loadTransaksi(1); };
  const submitTebus = async (e) => { e.preventDefault(); await fetch(`${API}/penebusan`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(tebusForm) }); showMsg("✅ Penebusan tersimpan!"); setTebusForm({ tanggal_tebus: today(), jumlah_tabung: "", harga_per_tabung: 16000, tanggal_datang: addDays(1), catatan: "" }); loadBase(); };
  const konfirmasiDatang = async (id) => { await fetch(`${API}/penebusan/${id}/konfirmasi`, { method: "PUT", headers: { "Content-Type": "application/json" } }); showMsg("✅ Gas datang! Stok terupdate."); loadBase(); };
  const lunasin = async (id, total) => { await fetch(`${API}/penjualan/${id}/bayar`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status_bayar: "Lunas", jumlah_dibayar: total }) }); loadBase(); };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#070C14", color: "#E8EDF5", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet" />

      {/* ── SIDEBAR ── */}
      <div style={{ width: sidebarOpen ? 220 : 64, background: "#0A1020", borderRight: "1px solid #1A2535", display: "flex", flexDirection: "column", transition: "width 0.2s", flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflow: "hidden" }}>
        {/* Logo */}
        <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid #1A2535", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, background: "#00C896", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>⛽</div>
          {sidebarOpen && <div><div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, color: "#fff" }}>Lenya Gas</div><div style={{ fontSize: 10, color: "#4A6A8A" }}>Dashboard</div></div>}
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
          {NAV_ITEMS.map(item => {
            const active = tab === item.id;
            const badge = item.id === "Booking" && bookingMenunggu.length > 0 ? bookingMenunggu.length : null;
            return (
              <button key={item.id} onClick={() => setTab(item.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", marginBottom: 4, background: active ? "#00C89618" : "none", border: active ? "1px solid #00C89630" : "1px solid transparent", borderRadius: 10, color: active ? "#00C896" : "#6B829A", cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: active ? 600 : 400, fontSize: 13, textAlign: "left", position: "relative", transition: "all 0.15s" }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
                {sidebarOpen && <span>{item.label}</span>}
                {badge && <span style={{ position: "absolute", top: 6, right: sidebarOpen ? 10 : 4, background: "#F4A261", color: "#0A0F1A", borderRadius: 99, fontSize: 10, fontWeight: 700, padding: "1px 5px", lineHeight: 1.4 }}>{badge}</span>}
              </button>
            );
          })}
        </nav>

        {/* Collapse button */}
        <div style={{ padding: "12px 8px", borderTop: "1px solid #1A2535" }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ width: "100%", background: "none", border: "1px solid #1A2535", borderRadius: 8, padding: "8px", color: "#4A6A8A", cursor: "pointer", fontSize: 14 }}>
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* Topbar */}
        <div style={{ background: "#0A1020", borderBottom: "1px solid #1A2535", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: "#fff" }}>{NAV_ITEMS.find(n => n.id === tab)?.label}</div>
            <div style={{ fontSize: 12, color: "#4A6A8A" }}>{new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
          </div>
          {laporan && (
            <div style={{ display: "flex", gap: 16 }}>
              {[["🫙", `${laporan.total_tabung} terjual`, "#00C896"], ["📦", `Stok ${laporan.sisa_stok}`, laporan.sisa_stok <= 10 ? "#FF6B6B" : "#4A6A8A"], ["💰", `Rp ${fmt(laporan.total_omset)}`, "#F4A261"]].map(([icon, val, color]) => (
                <div key={val} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14 }}>{icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color }}>{val}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: "24px", flex: 1, overflowY: "auto" }}>
          {msg && <div style={{ background: "#00C89618", border: "1px solid #00C89640", borderRadius: 10, padding: "12px 16px", color: "#00C896", fontWeight: 500, marginBottom: 16 }}>{msg}</div>}

          {/* ── DASHBOARD ── */}
          {tab === "Dashboard" && laporan && (
            <div>
              {laporan.booking_menunggu > 0 && (
                <div onClick={() => setTab("Booking")} style={{ background: "#F4A26115", border: "1px solid #F4A26140", borderRadius: 12, padding: "10px 16px", marginBottom: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                  <span>📝</span><span style={{ fontSize: 14, color: "#F4A261", fontWeight: 500 }}>{laporan.booking_menunggu} booking menunggu diambil — klik untuk lihat</span>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: 12, marginBottom: 18 }}>
                {[
                  { label: "Terjual Hari Ini", value: `${laporan.total_tabung} tabung`, icon: "🫙", accent: "#00C896" },
                  { label: "Sisa Stok", value: `${laporan.sisa_stok} tabung`, icon: "📦", accent: laporan.sisa_stok <= 10 ? "#FF6B6B" : "#00C896" },
                  { label: "Booking Aktif", value: `${laporan.booking_menunggu} order`, icon: "📝", accent: laporan.booking_menunggu > 0 ? "#F4A261" : "#4A6A8A" },
                  { label: "Omset", value: `Rp ${fmt(laporan.total_omset)}`, icon: "💰", accent: "#F4A261" },
                  { label: "Keuntungan", value: `Rp ${fmt(laporan.keuntungan_bersih)}`, icon: "📈", accent: "#00C896" },
                  { label: "Saldo Kas", value: `Rp ${fmt(laporan.saldo_kas)}`, icon: "🏦", accent: (laporan.saldo_kas || 0) >= 0 ? "#00C896" : "#FF6B6B" },
                ].map(c => (
                  <div key={c.label} style={{ background: "#0F1624", border: "1px solid #1A2535", borderRadius: 14, padding: "16px 18px" }}>
                    <div style={{ fontSize: 20, marginBottom: 8 }}>{c.icon}</div>
                    <div style={{ fontSize: 10, color: "#4A6A8A", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{c.label}</div>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: c.accent }}>{c.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div style={cardStyle}>
                  <div style={{ fontWeight: 600, marginBottom: 12, color: "#fff" }}>Ringkasan Keuangan</div>
                  {[["Modal Penjualan", laporan.modal, "#4A6A8A"], ["Modal Keluar", laporan.modal_keluar, "#FF6B6B"], ["Keuntungan Kotor", laporan.keuntungan_kotor, "#F4A261"], ["Dana Tabungan", laporan.dana_tabungan, "#A78BFA"], ["Keuntungan Bersih", laporan.keuntungan_bersih, "#00C896"], ["Saldo Kas", laporan.saldo_kas, (laporan.saldo_kas || 0) >= 0 ? "#00C896" : "#FF6B6B"]].map(([k, v, c]) => <KRow key={k} label={k} value={v} color={c} />)}
                </div>
                <div style={cardStyle}>
                  <div style={{ fontWeight: 600, marginBottom: 12, color: "#fff" }}>Stok & Pembayaran</div>
                  {[["Stok Awal", `${laporan.stok_awal} tabung`, "#fff"], ["Terjual", `${laporan.total_tabung} tabung`, "#F4A261"], ["Sisa Stok", `${laporan.sisa_stok} tabung`, laporan.sisa_stok <= 10 ? "#FF6B6B" : "#00C896"]].map(([k, v, c]) => <KRow key={k} label={k} value={v} color={c} />)}
                  <div style={{ fontWeight: 600, marginTop: 14, marginBottom: 8, color: "#fff" }}>Pembayaran</div>
                  {[["Sudah Dibayar", laporan.sudah_dibayar, "#00C896"], ["Belum Dibayar", laporan.belum_dibayar, "#FF6B6B"]].map(([k, v, c]) => <KRow key={k} label={k} value={v} color={c} />)}
                </div>
              </div>
              <div style={cardStyle}>
                <div style={{ fontWeight: 600, marginBottom: 14, color: "#fff" }}>Penjualan 7 Hari Terakhir</div>
                <ResponsiveContainer width="100%" height={170}>
                  <BarChart data={mingguan} barSize={28}>
                    <XAxis dataKey="tanggal" tickFormatter={fmtDate} tick={{ fill: "#4A6A8A", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#4A6A8A", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#0F1624", border: "1px solid #1A2535", borderRadius: 8, color: "#E8EDF5" }} formatter={v => [`${v} tabung`, "Terjual"]} labelFormatter={fmtDate} />
                    <Bar dataKey="total_tabung" radius={[5, 5, 0, 0]}>
                      {mingguan.map((_, i) => <Cell key={i} fill={i === mingguan.length - 1 ? "#00C896" : "#1A3A4D"} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── BOOKING ── */}
          {tab === "Booking" && (
            <div>
              <div style={{ ...cardStyle, marginBottom: 16 }}>
                <div style={{ fontWeight: 600, color: "#fff", marginBottom: 16 }}>Tambah Booking</div>
                <form onSubmit={submitBooking}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div><label style={{ display: "block", fontSize: 13, color: "#6B829A", marginBottom: 6 }}>Tanggal Booking</label><input type="date" value={bookingForm.tanggal_booking} onChange={e => setBookingForm({ ...bookingForm, tanggal_booking: e.target.value })} style={inputStyle} required /></div>
                    <div><label style={{ display: "block", fontSize: 13, color: "#6B829A", marginBottom: 6 }}>Nama Pembeli</label><input type="text" placeholder="Nama pembeli" value={bookingForm.nama_pembeli} onChange={e => setBookingForm({ ...bookingForm, nama_pembeli: e.target.value })} style={inputStyle} required /></div>
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <label style={{ fontSize: 13, color: "#6B829A" }}>Jumlah Tabung</label>
                        <span style={{ fontSize: 12, color: laporan && laporan.sisa_stok > 0 ? "#00C896" : "#FF6B6B", fontWeight: 500 }}>{laporan ? `(Tersedia: ${laporan.sisa_stok} tabung)` : ""}</span>
                      </div>
                      <input type="number" placeholder="contoh: 10" value={bookingForm.jumlah} onChange={e => setBookingForm({ ...bookingForm, jumlah: e.target.value })} style={inputStyle} required />
                    </div>
                    <div><label style={{ display: "block", fontSize: 13, color: "#6B829A", marginBottom: 6 }}>Catatan</label><input type="text" placeholder="opsional" value={bookingForm.catatan} onChange={e => setBookingForm({ ...bookingForm, catatan: e.target.value })} style={inputStyle} /></div>
                  </div>
                  <button type="submit" style={{ ...btnPrimary, marginTop: 14 }}>Simpan Booking</button>
                </form>
              </div>
              <div style={{ ...cardStyle, overflow: "hidden", padding: 0 }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #1A2535", fontWeight: 600, color: "#fff" }}>Daftar Booking</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <THead cols={["Tgl Booking", "Pembeli", "Jumlah", "Estimasi", "Status", "Aksi"]} />
                    <tbody>
                      {booking.map(b => (
                        <tr key={b.id} style={{ borderTop: "1px solid #1A2535" }}>
                          <td style={{ padding: "11px 16px", fontSize: 13, color: "#6B829A" }}>{fmtDate(b.tanggal_booking)}</td>
                          <td style={{ padding: "11px 16px", fontSize: 13, color: "#E8EDF5", fontWeight: 500 }}>{b.nama_pembeli}</td>
                          <td style={{ padding: "11px 16px", fontSize: 13, color: "#E8EDF5" }}>{b.jumlah} tabung</td>
                          <td style={{ padding: "11px 16px", fontSize: 13, color: "#F4A261", fontWeight: 600 }}>Rp {fmt(b.jumlah * 19000)}</td>
                          <td style={{ padding: "11px 16px" }}><span style={{ background: statusColor(b.status) + "22", color: statusColor(b.status), padding: "3px 10px", borderRadius: 99, fontSize: 12 }}>{b.status}</span></td>
                          <td style={{ padding: "11px 16px", display: "flex", gap: 6 }}>
                            {b.status === 'Menunggu' && <>
                              <button onClick={() => { setDiambilModal(b); setDiambilForm({ tanggal: today(), status_bayar: "Lunas", jumlah_dibayar: "" }); }} style={{ background: "#00C89618", color: "#00C896", border: "1px solid #00C89640", padding: "5px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>✅ Diambil</button>
                              <button onClick={() => batalBooking(b.id)} style={{ background: "#FF6B6B18", color: "#FF6B6B", border: "1px solid #FF6B6B40", padding: "5px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>❌ Batal</button>
                            </>}
                            {b.status !== 'Menunggu' && <span style={{ fontSize: 12, color: "#4A6A8A" }}>{b.tanggal_diambil ? fmtDate(b.tanggal_diambil) : "-"}</span>}
                          </td>
                        </tr>
                      ))}
                      {booking.length === 0 && <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#4A6A8A" }}>Belum ada booking</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── TRANSAKSI ── */}
          {tab === "Transaksi" && (
            <div>
              <div style={{ ...cardStyle, marginBottom: 12, padding: "14px 16px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto auto", gap: 10, alignItems: "end" }}>
                  <div><label style={{ display: "block", fontSize: 12, color: "#4A6A8A", marginBottom: 4 }}>Cari nama pembeli</label><input type="text" placeholder="Ketik nama..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadTransaksi(1)} style={{ ...inputStyle, padding: "8px 12px" }} /></div>
                  <div><label style={{ display: "block", fontSize: 12, color: "#4A6A8A", marginBottom: 4 }}>Dari</label><input type="date" value={filterDari} onChange={e => setFilterDari(e.target.value)} style={{ ...inputStyle, padding: "8px 12px", width: 140 }} /></div>
                  <div><label style={{ display: "block", fontSize: 12, color: "#4A6A8A", marginBottom: 4 }}>Sampai</label><input type="date" value={filterSampai} onChange={e => setFilterSampai(e.target.value)} style={{ ...inputStyle, padding: "8px 12px", width: 140 }} /></div>
                  <button onClick={() => loadTransaksi(1)} style={{ background: "#00C896", border: "none", borderRadius: 8, padding: "8px 16px", color: "#0A0F1A", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>Cari</button>
                  <button onClick={() => { setSearch(""); setFilterDari(""); setFilterSampai(""); setTimeout(() => loadTransaksi(1), 100); }} style={{ background: "#1A2535", border: "none", borderRadius: 8, padding: "8px 14px", color: "#6B829A", fontSize: 13, cursor: "pointer" }}>Reset</button>
                </div>
                <div style={{ fontSize: 12, color: "#4A6A8A", marginTop: 8 }}>Menampilkan {transaksi.length} dari {transaksiTotal} transaksi</div>
              </div>
              <div style={{ ...cardStyle, overflow: "hidden", padding: 0 }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <THead cols={["Tanggal", "Pembeli", "Jumlah", "Total", "Status", "Catatan", "Struk"]} />
                    <tbody>
                      {transaksi.map(t => (
                        <tr key={t.id} style={{ borderTop: "1px solid #1A2535" }}>
                          <td style={{ padding: "11px 16px", fontSize: 13, color: "#6B829A" }}>{fmtDate(t.tanggal)}</td>
                          <td style={{ padding: "11px 16px", fontSize: 13, color: "#E8EDF5" }}>{t.nama_pembeli || "-"}</td>
                          <td style={{ padding: "11px 16px", fontSize: 13, color: "#E8EDF5" }}>{t.jumlah} tabung</td>
                          <td style={{ padding: "11px 16px", fontSize: 13, color: "#F4A261", fontWeight: 600 }}>Rp {fmt(t.total)}</td>
                          <td style={{ padding: "11px 16px" }}><span style={{ background: statusColor(t.status_bayar) + "22", color: statusColor(t.status_bayar), padding: "3px 10px", borderRadius: 99, fontSize: 12 }}>{t.status_bayar}</span></td>
                          <td style={{ padding: "11px 16px", fontSize: 12, color: "#4A6A8A" }}>{t.catatan || "-"}</td>
                          <td style={{ padding: "11px 16px" }}><button onClick={() => setStruk(t)} style={{ background: "#1A2535", color: "#E8EDF5", border: "1px solid #2A3F55", padding: "5px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>🧾</button></td>
                        </tr>
                      ))}
                      {transaksi.length === 0 && <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#4A6A8A" }}>Tidak ada data</td></tr>}
                    </tbody>
                  </table>
                </div>
                {transaksiTotalPages > 1 && (
                  <div style={{ padding: "12px 16px", borderTop: "1px solid #1A2535", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <button onClick={() => loadTransaksi(Math.max(1, transaksiPage - 1))} disabled={transaksiPage === 1} style={{ background: "#1A2535", border: "none", borderRadius: 8, padding: "7px 14px", color: transaksiPage === 1 ? "#2A3F55" : "#E8EDF5", cursor: transaksiPage === 1 ? "not-allowed" : "pointer", fontSize: 13 }}>← Prev</button>
                    <span style={{ fontSize: 13, color: "#6B829A" }}>Halaman {transaksiPage} dari {transaksiTotalPages}</span>
                    <button onClick={() => loadTransaksi(Math.min(transaksiTotalPages, transaksiPage + 1))} disabled={transaksiPage === transaksiTotalPages} style={{ background: "#1A2535", border: "none", borderRadius: 8, padding: "7px 14px", color: transaksiPage === transaksiTotalPages ? "#2A3F55" : "#E8EDF5", cursor: transaksiPage === transaksiTotalPages ? "not-allowed" : "pointer", fontSize: 13 }}>Next →</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── HUTANG ── */}
          {tab === "Hutang" && (
            <div style={{ ...cardStyle, overflow: "hidden", padding: 0 }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid #1A2535", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, color: "#fff" }}>Daftar Hutang & DP</span>
                <span style={{ background: "#FF6B6B18", color: "#FF6B6B", padding: "4px 12px", borderRadius: 99, fontSize: 13, fontWeight: 600 }}>Total: Rp {fmt(hutang.reduce((a, h) => a + h.sisa_tagihan, 0))}</span>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <THead cols={["Tanggal", "Pembeli", "Jumlah", "Total", "Dibayar", "Sisa", "Aksi"]} />
                  <tbody>
                    {hutang.map(h => (
                      <tr key={h.id} style={{ borderTop: "1px solid #1A2535" }}>
                        <td style={{ padding: "11px 16px", fontSize: 13, color: "#6B829A" }}>{fmtDate(h.tanggal)}</td>
                        <td style={{ padding: "11px 16px", fontSize: 13, color: "#E8EDF5" }}>{h.nama_pembeli || "-"}</td>
                        <td style={{ padding: "11px 16px", fontSize: 13, color: "#E8EDF5" }}>{h.jumlah} tabung</td>
                        <td style={{ padding: "11px 16px", fontSize: 13, color: "#F4A261" }}>Rp {fmt(h.total)}</td>
                        <td style={{ padding: "11px 16px", fontSize: 13, color: "#00C896" }}>Rp {fmt(h.jumlah_dibayar)}</td>
                        <td style={{ padding: "11px 16px", fontSize: 13, color: "#FF6B6B", fontWeight: 600 }}>Rp {fmt(h.sisa_tagihan)}</td>
                        <td style={{ padding: "11px 16px" }}><button onClick={() => lunasin(h.id, h.total)} style={{ background: "#00C89618", color: "#00C896", border: "1px solid #00C89640", padding: "5px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>Lunas</button></td>
                      </tr>
                    ))}
                    {hutang.length === 0 && <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#4A6A8A" }}>Tidak ada hutang 🎉</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── PENEBUSAN ── */}
          {tab === "Penebusan" && (
            <div>
              <div style={{ ...cardStyle, marginBottom: 16, border: "1px solid #FF6B6B30" }}>
                <div style={{ fontWeight: 600, color: "#fff", marginBottom: 4 }}>Input Penebusan ke Agen</div>
                <div style={{ fontSize: 12, color: "#4A6A8A", marginBottom: 14 }}>Input H-1. Stok otomatis terupdate saat konfirmasi gas datang.</div>
                <form onSubmit={submitTebus}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    {[{ label: "Tanggal Tebus", key: "tanggal_tebus", type: "date" }, { label: "Jumlah Tabung", key: "jumlah_tabung", type: "number", placeholder: "contoh: 50" }, { label: "Tanggal Gas Datang", key: "tanggal_datang", type: "date" }].map(f => (
                      <div key={f.key}><label style={{ display: "block", fontSize: 13, color: "#6B829A", marginBottom: 6 }}>{f.label}</label><input type={f.type} placeholder={f.placeholder} value={tebusForm[f.key]} onChange={e => setTebusForm({ ...tebusForm, [f.key]: e.target.value })} style={inputStyle} required /></div>
                    ))}
                  </div>
                  {tebusForm.jumlah_tabung && <div style={{ margin: "10px 0", background: "#FF6B6B15", border: "1px solid #FF6B6B30", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#FF6B6B" }}>💸 Total modal: <strong>Rp {fmt(tebusForm.jumlah_tabung * tebusForm.harga_per_tabung)}</strong></div>}
                  <div style={{ marginTop: 10 }}><label style={{ display: "block", fontSize: 13, color: "#6B829A", marginBottom: 6 }}>Catatan</label><input type="text" placeholder="opsional" value={tebusForm.catatan} onChange={e => setTebusForm({ ...tebusForm, catatan: e.target.value })} style={inputStyle} /></div>
                  <button type="submit" style={{ ...btnPrimary, marginTop: 12, background: "#FF6B6B", color: "#fff" }}>Simpan Penebusan</button>
                </form>
              </div>
              <div style={{ ...cardStyle, overflow: "hidden", padding: 0 }}>
                <div style={{ padding: "14px 20px", borderBottom: "1px solid #1A2535", fontWeight: 600, color: "#fff" }}>Riwayat Penebusan</div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <THead cols={["Tgl Tebus", "Tgl Datang", "Jumlah", "Modal", "Status", "Aksi"]} />
                    <tbody>
                      {penebusan.map(p => (
                        <tr key={p.id} style={{ borderTop: "1px solid #1A2535" }}>
                          <td style={{ padding: "11px 16px", fontSize: 13, color: "#6B829A" }}>{fmtDate(p.tanggal_tebus)}</td>
                          <td style={{ padding: "11px 16px", fontSize: 13, color: "#E8EDF5" }}>{fmtDate(p.tanggal_datang)}</td>
                          <td style={{ padding: "11px 16px", fontSize: 13, color: "#E8EDF5" }}>{p.jumlah_tabung} tabung</td>
                          <td style={{ padding: "11px 16px", fontSize: 13, color: "#FF6B6B", fontWeight: 600 }}>Rp {fmt(p.total_modal)}</td>
                          <td style={{ padding: "11px 16px" }}><span style={{ background: statusColor(p.status) + "22", color: statusColor(p.status), padding: "3px 10px", borderRadius: 99, fontSize: 12 }}>{p.status}</span></td>
                          <td style={{ padding: "11px 16px" }}>
                            {p.status === 'Menunggu' && <button onClick={() => konfirmasiDatang(p.id)} style={{ background: "#00C89618", color: "#00C896", border: "1px solid #00C89640", padding: "5px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>✅ Gas Datang</button>}
                            {p.status === 'Sudah Datang' && <span style={{ fontSize: 12, color: "#4A6A8A" }}>Selesai</span>}
                          </td>
                        </tr>
                      ))}
                      {penebusan.length === 0 && <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#4A6A8A" }}>Belum ada penebusan</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── LAPORAN ── */}
          {tab === "Laporan" && (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                {[["Harian", 'hari'], ["Mingguan", 'minggu'], ["Bulanan", 'bulan'], ["Tahunan", 'tahun'], ["Custom", null]].map(([label, type]) => (
                  <button key={label} onClick={() => { setLaporanTab(label); if (type) setPeriode(type); }} style={{ padding: "8px 16px", background: laporanTab === label ? "#00C896" : "#1A2535", border: "none", borderRadius: 8, color: laporanTab === label ? "#0A0F1A" : "#6B829A", fontWeight: laporanTab === label ? 700 : 400, fontSize: 13, cursor: "pointer" }}>{label}</button>
                ))}
              </div>
              {laporanTab === "Custom" && (
                <div style={{ ...cardStyle, marginBottom: 14, padding: "14px 16px" }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "end" }}>
                    <div><label style={{ display: "block", fontSize: 12, color: "#4A6A8A", marginBottom: 4 }}>Dari</label><input type="date" value={laporanDari} onChange={e => setLaporanDari(e.target.value)} style={{ ...inputStyle, width: 160, padding: "8px 12px" }} /></div>
                    <div><label style={{ display: "block", fontSize: 12, color: "#4A6A8A", marginBottom: 4 }}>Sampai</label><input type="date" value={laporanSampai} onChange={e => setLaporanSampai(e.target.value)} style={{ ...inputStyle, width: 160, padding: "8px 12px" }} /></div>
                  </div>
                </div>
              )}
              {laporanData && (
                <div>
                  <div style={{ fontSize: 13, color: "#4A6A8A", marginBottom: 14 }}>
                    Periode: <strong style={{ color: "#fff" }}>{fmtFull(laporanDari)}</strong> — <strong style={{ color: "#fff" }}>{fmtFull(laporanSampai)}</strong> <span style={{ color: "#00C896" }}>({laporanData.hari_aktif} hari aktif)</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 10, marginBottom: 16 }}>
                    {[["Total Terjual", `${laporanData.total_tabung} tabung`, "#00C896"], ["Total Omset", `Rp ${fmt(laporanData.total_omset)}`, "#F4A261"], ["Keuntungan Bersih", `Rp ${fmt(laporanData.keuntungan_bersih)}`, "#00C896"], ["Modal Keluar", `Rp ${fmt(laporanData.modal_keluar)}`, "#FF6B6B"], ["Saldo Kas", `Rp ${fmt(laporanData.saldo_kas)}`, (laporanData.saldo_kas || 0) >= 0 ? "#00C896" : "#FF6B6B"], ["Belum Dibayar", `Rp ${fmt(laporanData.belum_dibayar)}`, laporanData.belum_dibayar > 0 ? "#FF6B6B" : "#4A6A8A"]].map(([k, v, c]) => (
                      <div key={k} style={{ background: "#0F1624", border: "1px solid #1A2535", borderRadius: 12, padding: "12px 14px" }}>
                        <div style={{ fontSize: 10, color: "#4A6A8A", marginBottom: 4, textTransform: "uppercase" }}>{k}</div>
                        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, color: c }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {laporanData.per_hari.length > 1 && (
                    <div style={{ ...cardStyle, marginBottom: 14 }}>
                      <div style={{ fontWeight: 600, marginBottom: 14, color: "#fff" }}>Grafik Penjualan</div>
                      <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={laporanData.per_hari}>
                          <XAxis dataKey="tanggal" tickFormatter={fmtDate} tick={{ fill: "#4A6A8A", fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fill: "#4A6A8A", fontSize: 11 }} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{ background: "#0F1624", border: "1px solid #1A2535", borderRadius: 8, color: "#E8EDF5" }} formatter={v => [`${v} tabung`, "Terjual"]} labelFormatter={fmtDate} />
                          <Line type="monotone" dataKey="total_tabung" stroke="#00C896" strokeWidth={2} dot={{ fill: "#00C896", r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                    <div style={cardStyle}>
                      <div style={{ fontWeight: 600, marginBottom: 12, color: "#fff" }}>Ringkasan Keuangan</div>
                      {[["Modal Penjualan", laporanData.modal, "#4A6A8A"], ["Modal Keluar", laporanData.modal_keluar, "#FF6B6B"], ["Keuntungan Kotor", laporanData.keuntungan_kotor, "#F4A261"], ["Dana Tabungan", laporanData.dana_tabungan, "#A78BFA"], ["Keuntungan Bersih", laporanData.keuntungan_bersih, "#00C896"], ["Saldo Kas", laporanData.saldo_kas, (laporanData.saldo_kas || 0) >= 0 ? "#00C896" : "#FF6B6B"]].map(([k, v, c]) => <KRow key={k} label={k} value={v} color={c} />)}
                    </div>
                    <div style={cardStyle}>
                      <div style={{ fontWeight: 600, marginBottom: 12, color: "#fff" }}>Statistik</div>
                      {[["Sudah Dibayar", laporanData.sudah_dibayar, "#00C896"], ["Belum Dibayar", laporanData.belum_dibayar, "#FF6B6B"]].map(([k, v, c]) => <KRow key={k} label={k} value={v} color={c} />)}
                      <div style={{ fontWeight: 600, marginTop: 14, marginBottom: 8, color: "#fff" }}>Rata-rata Per Hari Aktif</div>
                      {[["Tabung terjual", laporanData.hari_aktif > 0 ? `${Math.round(laporanData.total_tabung / laporanData.hari_aktif)} tabung` : "-", "#fff"], ["Omset", laporanData.hari_aktif > 0 ? laporanData.total_omset / laporanData.hari_aktif : 0, "#F4A261"]].map(([k, v, c]) => <KRow key={k} label={k} value={v} color={c} />)}
                    </div>
                  </div>
                  <div style={{ ...cardStyle, overflow: "hidden", padding: 0 }}>
                    <div style={{ padding: "14px 20px", borderBottom: "1px solid #1A2535", fontWeight: 600, color: "#fff" }}>Detail Per Hari</div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <THead cols={["Tanggal", "Transaksi", "Tabung Terjual", "Omset"]} />
                        <tbody>
                          {laporanData.per_hari.map(d => (
                            <tr key={d.tanggal} style={{ borderTop: "1px solid #1A2535" }}>
                              <td style={{ padding: "11px 16px", fontSize: 13, color: "#6B829A" }}>{fmtFull(d.tanggal)}</td>
                              <td style={{ padding: "11px 16px", fontSize: 13, color: "#E8EDF5" }}>{d.transaksi} transaksi</td>
                              <td style={{ padding: "11px 16px", fontSize: 13, color: "#E8EDF5" }}>{d.total_tabung} tabung</td>
                              <td style={{ padding: "11px 16px", fontSize: 13, color: "#F4A261", fontWeight: 600 }}>Rp {fmt(d.omset)}</td>
                            </tr>
                          ))}
                          {laporanData.per_hari.length === 0 && <tr><td colSpan={4} style={{ padding: 32, textAlign: "center", color: "#4A6A8A" }}>Tidak ada data</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── INPUT ── */}
          {tab === "Input" && (
            <div style={{ maxWidth: 520 }}>
              <div style={cardStyle}>
                <div style={{ fontWeight: 600, color: "#fff", marginBottom: 4 }}>🫙 Input Penjualan Langsung</div>
                <div style={{ fontSize: 12, color: "#4A6A8A", marginBottom: 16 }}>Untuk penjualan tanpa booking sebelumnya</div>
                <form onSubmit={submitPenjualan}>
                  {[{ label: "Tanggal", key: "tanggal", type: "date" }, { label: "Jumlah Tabung", key: "jumlah", type: "number", placeholder: "contoh: 5" }, { label: "Nama Pembeli", key: "nama_pembeli", type: "text", placeholder: "opsional" }, { label: "Catatan", key: "catatan", type: "text", placeholder: "opsional" }].map(f => (
                    <div key={f.key} style={{ marginBottom: 12 }}><label style={{ display: "block", fontSize: 13, color: "#6B829A", marginBottom: 6 }}>{f.label}</label><input type={f.type} placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} style={inputStyle} required={["tanggal", "jumlah"].includes(f.key)} /></div>
                  ))}
                  <div style={{ marginBottom: 12 }}><label style={{ display: "block", fontSize: 13, color: "#6B829A", marginBottom: 6 }}>Status Pembayaran</label><select value={form.status_bayar} onChange={e => setForm({ ...form, status_bayar: e.target.value })} style={inputStyle}><option>Lunas</option><option>Hutang</option><option>DP</option></select></div>
                  {form.status_bayar === "DP" && <div style={{ marginBottom: 12 }}><label style={{ display: "block", fontSize: 13, color: "#6B829A", marginBottom: 6 }}>Jumlah Dibayar (Rp)</label><input type="number" value={form.jumlah_dibayar} onChange={e => setForm({ ...form, jumlah_dibayar: e.target.value })} style={inputStyle} /></div>}
                  <button type="submit" style={btnPrimary}>Simpan Transaksi</button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL DIAMBIL ── */}
      {diambilModal && (
        <div onClick={() => setDiambilModal(null)} style={{ position: "fixed", inset: 0, background: "#00000099", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0F1624", border: "1px solid #1A2535", borderRadius: 16, padding: 28, width: 340 }}>
            <div style={{ fontWeight: 600, color: "#fff", marginBottom: 4 }}>✅ Konfirmasi Gas Diambil</div>
            <div style={{ fontSize: 13, color: "#4A6A8A", marginBottom: 16 }}>👤 {diambilModal.nama_pembeli} — {diambilModal.jumlah} tabung (Rp {fmt(diambilModal.jumlah * 19000)})</div>
            <div style={{ marginBottom: 12 }}><label style={{ display: "block", fontSize: 13, color: "#6B829A", marginBottom: 6 }}>Tanggal Diambil</label><input type="date" value={diambilForm.tanggal} onChange={e => setDiambilForm({ ...diambilForm, tanggal: e.target.value })} style={inputStyle} /></div>
            <div style={{ marginBottom: 12 }}><label style={{ display: "block", fontSize: 13, color: "#6B829A", marginBottom: 6 }}>Status Pembayaran</label><select value={diambilForm.status_bayar} onChange={e => setDiambilForm({ ...diambilForm, status_bayar: e.target.value })} style={inputStyle}><option>Lunas</option><option>Hutang</option><option>DP</option></select></div>
            {diambilForm.status_bayar === "DP" && <div style={{ marginBottom: 12 }}><label style={{ display: "block", fontSize: 13, color: "#6B829A", marginBottom: 6 }}>Jumlah Dibayar (Rp)</label><input type="number" value={diambilForm.jumlah_dibayar} onChange={e => setDiambilForm({ ...diambilForm, jumlah_dibayar: e.target.value })} style={inputStyle} /></div>}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={submitDiambil} style={{ flex: 1, background: "#00C896", border: "none", borderRadius: 10, padding: "12px", color: "#0A0F1A", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Konfirmasi</button>
              <button onClick={() => setDiambilModal(null)} style={{ flex: 1, background: "#1A2535", border: "none", borderRadius: 10, padding: "12px", color: "#6B829A", fontSize: 14, cursor: "pointer" }}>Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL STRUK ── */}
      {struk && (
        <div onClick={() => setStruk(null)} style={{ position: "fixed", inset: 0, background: "#00000099", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0F1624", border: "1px solid #1A2535", borderRadius: 16, padding: 28, width: 300, fontFamily: "monospace" }}>
            <div style={{ textAlign: "center", fontWeight: 700, fontSize: 15, color: "#fff", marginBottom: 4 }}>⛽ LENYA GAS</div>
            <div style={{ textAlign: "center", fontSize: 11, color: "#4A6A8A", marginBottom: 14 }}>Struk Penjualan</div>
            <div style={{ borderTop: "1px dashed #1A2535", marginBottom: 12 }} />
            <div style={{ fontSize: 12, color: "#6B829A", marginBottom: 3 }}>📅 {fmtFull(struk.tanggal)}</div>
            <div style={{ fontSize: 12, color: "#6B829A", marginBottom: 12 }}>👤 {struk.nama_pembeli || "Umum"}</div>
            <div style={{ borderTop: "1px dashed #1A2535", marginBottom: 12 }} />
            <div style={{ fontSize: 13, color: "#E8EDF5", marginBottom: 4 }}>🫙 {struk.ukuran_tabung} × {struk.jumlah} tabung</div>
            <div style={{ fontSize: 13, color: "#E8EDF5", marginBottom: 4 }}>💵 Rp {fmt(struk.harga_jual)} / tabung</div>
            <div style={{ borderTop: "1px dashed #1A2535", margin: "10px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 14, color: "#6B829A" }}>Total</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#00C896" }}>Rp {fmt(struk.total)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "#6B829A" }}>Status</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: statusColor(struk.status_bayar) }}>{struk.status_bayar}</span>
            </div>
            {struk.catatan && <div style={{ fontSize: 12, color: "#4A6A8A", marginTop: 8 }}>📝 {struk.catatan}</div>}
            <div style={{ borderTop: "1px dashed #1A2535", margin: "14px 0 10px" }} />
            <div style={{ textAlign: "center", fontSize: 11, color: "#4A6A8A", marginBottom: 16 }}>Terima kasih sudah membeli! 🙏</div>
            <button onClick={() => setStruk(null)} style={{ width: "100%", background: "#1A2535", border: "none", borderRadius: 8, padding: "10px", color: "#6B829A", cursor: "pointer", fontSize: 13 }}>Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}