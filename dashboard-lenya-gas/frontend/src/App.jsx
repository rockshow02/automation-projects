import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const API = "https://adiyansyaah.pythonanywhere.com/api";
const fmt = (n) => new Intl.NumberFormat("id-ID").format(n || 0);
const fmtDate = (d) => new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
const fmtFull = (d) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
const TABS = ["Dashboard", "Booking", "Transaksi", "Hutang", "Penebusan", "Input"];

const inputStyle = { width: "100%", background: "#0A0F1A", border: "1px solid #1E2A3D", borderRadius: 8, padding: "10px 12px", color: "#E8EDF5", fontFamily: "'DM Sans', sans-serif", fontSize: 14, boxSizing: "border-box" };
const cardStyle = { background: "#0F1624", border: "1px solid #1E2A3D", borderRadius: 14, padding: 20 };
const btnPrimary = { background: "#00C896", border: "none", borderRadius: 10, padding: "12px", color: "#0A0F1A", fontWeight: 700, fontSize: 14, cursor: "pointer", width: "100%" };

export default function App() {
  const [tab, setTab] = useState("Dashboard");
  const [laporan, setLaporan] = useState(null);
  const [mingguan, setMingguan] = useState([]);
  const [hutang, setHutang] = useState([]);
  const [transaksi, setTransaksi] = useState([]);
  const [penebusan, setPenebusan] = useState([]);
  const [booking, setBooking] = useState([]);
  const [struk, setStruk] = useState(null);
  const [diambilModal, setDiambilModal] = useState(null);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({ tanggal: new Date().toISOString().split("T")[0], ukuran_tabung: "3 Kg", jumlah: "", harga_jual: 19000, nama_pembeli: "", status_bayar: "Lunas", jumlah_dibayar: "", catatan: "" });
  const [stokForm, setStokForm] = useState({ tanggal: new Date().toISOString().split("T")[0], stok_awal: "" });
  const [bookingForm, setBookingForm] = useState({ tanggal_booking: new Date().toISOString().split("T")[0], nama_pembeli: "", ukuran_tabung: "3 Kg", jumlah: "", catatan: "" });
  const [tebusForm, setTebusForm] = useState({ tanggal_tebus: new Date().toISOString().split("T")[0], jumlah_tabung: "", harga_per_tabung: 16000, tanggal_datang: new Date(Date.now() + 86400000).toISOString().split("T")[0], catatan: "" });
  const [diambilForm, setDiambilForm] = useState({ tanggal: new Date().toISOString().split("T")[0], status_bayar: "Lunas", jumlah_dibayar: "" });

  const load = async () => {
    const [l, m, h, t, p, b] = await Promise.all([
      fetch(`${API}/laporan/hari-ini`).then(r => r.json()),
      fetch(`${API}/laporan/mingguan`).then(r => r.json()),
      fetch(`${API}/hutang`).then(r => r.json()),
      fetch(`${API}/penjualan/semua`).then(r => r.json()),
      fetch(`${API}/penebusan`).then(r => r.json()),
      fetch(`${API}/booking`).then(r => r.json()),
    ]);
    setLaporan(l); setMingguan(m); setHutang(h); setTransaksi(t); setPenebusan(p); setBooking(b);
  };

  useEffect(() => { load(); }, []);

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  const submitBooking = async (e) => {
    e.preventDefault();
    await fetch(`${API}/booking`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bookingForm) });
    showMsg("✅ Booking tersimpan! Notif Telegram terkirim.");
    setBookingForm({ tanggal_booking: new Date().toISOString().split("T")[0], nama_pembeli: "", ukuran_tabung: "3 Kg", jumlah: "", catatan: "" });
    load();
  };

  const submitDiambil = async () => {
    await fetch(`${API}/booking/${diambilModal.id}/diambil`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(diambilForm) });
    showMsg("✅ Gas diambil! Struk Telegram terkirim.");
    setDiambilModal(null);
    load();
  };

  const batalBooking = async (id) => {
    if (!confirm("Batalkan booking ini?")) return;
    await fetch(`${API}/booking/${id}/batal`, { method: "PUT", headers: { "Content-Type": "application/json" } });
    showMsg("❌ Booking dibatalkan.");
    load();
  };

  const submitPenjualan = async (e) => {
    e.preventDefault();
    await fetch(`${API}/penjualan`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    showMsg("✅ Transaksi tersimpan!");
    setForm({ tanggal: new Date().toISOString().split("T")[0], ukuran_tabung: "3 Kg", jumlah: "", harga_jual: 19000, nama_pembeli: "", status_bayar: "Lunas", jumlah_dibayar: "", catatan: "" });
    load();
  };

  const submitStok = async (e) => {
    e.preventDefault();
    await fetch(`${API}/stok`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(stokForm) });
    showMsg("✅ Stok tersimpan!");
    load();
  };

  const submitTebus = async (e) => {
    e.preventDefault();
    await fetch(`${API}/penebusan`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(tebusForm) });
    showMsg("✅ Penebusan tersimpan!");
    setTebusForm({ tanggal_tebus: new Date().toISOString().split("T")[0], jumlah_tabung: "", harga_per_tabung: 16000, tanggal_datang: new Date(Date.now() + 86400000).toISOString().split("T")[0], catatan: "" });
    load();
  };

  const konfirmasiDatang = async (id) => {
    await fetch(`${API}/penebusan/${id}/konfirmasi`, { method: "PUT", headers: { "Content-Type": "application/json" } });
    showMsg("✅ Gas dikonfirmasi datang!");
    load();
  };

  const lunasin = async (id, total) => {
    await fetch(`${API}/penjualan/${id}/bayar`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status_bayar: "Lunas", jumlah_dibayar: total }) });
    load();
  };

  const statusColor = (s) => ({ "Lunas": "#00C896", "Sudah Datang": "#00C896", "Diambil": "#00C896", "Hutang": "#FF6B6B", "Menunggu": "#F4A261", "DP": "#F4A261", "Batal": "#5A7A9A" }[s] || "#5A7A9A");

  const bookingMenunggu = booking.filter(b => b.status === 'Menunggu');

  return (
    <div style={{ minHeight: "100vh", background: "#0A0F1A", color: "#E8EDF5", fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet" />

      <div style={{ background: "#0F1624", borderBottom: "1px solid #1E2A3D", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, background: "#00C896", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⛽</div>
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: "#fff" }}>Lenya Gas</div>
            <div style={{ fontSize: 12, color: "#5A7A9A" }}>Dashboard Penjualan</div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: "#5A7A9A" }}>{new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
      </div>

      <div style={{ background: "#0F1624", padding: "0 24px", display: "flex", gap: 4, borderBottom: "1px solid #1E2A3D", overflowX: "auto" }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: "12px 16px", background: "none", border: "none", color: tab === t ? "#00C896" : "#5A7A9A", fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 13, cursor: "pointer", borderBottom: tab === t ? "2px solid #00C896" : "2px solid transparent", whiteSpace: "nowrap", position: "relative" }}>
            {t}
            {t === "Booking" && bookingMenunggu.length > 0 && <span style={{ position: "absolute", top: 8, right: 4, background: "#F4A261", color: "#0A0F1A", borderRadius: 99, fontSize: 10, fontWeight: 700, padding: "1px 5px" }}>{bookingMenunggu.length}</span>}
          </button>
        ))}
      </div>

      <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
        {msg && <div style={{ background: "#00C89622", border: "1px solid #00C896", borderRadius: 10, padding: "12px 16px", color: "#00C896", fontWeight: 500, marginBottom: 16 }}>{msg}</div>}

        {/* DASHBOARD */}
        {tab === "Dashboard" && laporan && (
          <div>
            {laporan.booking_menunggu > 0 && (
              <div onClick={() => setTab("Booking")} style={{ background: "#F4A26122", border: "1px solid #F4A261", borderRadius: 12, padding: "12px 16px", marginBottom: 16, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 18 }}>📝</span>
                <span style={{ fontSize: 14, color: "#F4A261", fontWeight: 500 }}>{laporan.booking_menunggu} booking menunggu diambil — klik untuk lihat</span>
              </div>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Terjual Hari Ini", value: `${laporan.total_tabung} tabung`, icon: "🫙", accent: "#00C896" },
                { label: "Sisa Stok", value: `${laporan.sisa_stok} tabung`, icon: "📦", accent: laporan.sisa_stok <= 10 ? "#FF6B6B" : "#00C896" },
                { label: "Booking Aktif", value: `${laporan.booking_menunggu} order`, icon: "📝", accent: laporan.booking_menunggu > 0 ? "#F4A261" : "#5A7A9A" },
                { label: "Omset", value: `Rp ${fmt(laporan.total_omset)}`, icon: "💰", accent: "#F4A261" },
                { label: "Keuntungan Bersih", value: `Rp ${fmt(laporan.keuntungan_bersih)}`, icon: "📈", accent: "#00C896" },
                { label: "Saldo Kas", value: `Rp ${fmt(laporan.saldo_kas)}`, icon: "🏦", accent: (laporan.saldo_kas || 0) >= 0 ? "#00C896" : "#FF6B6B" },
              ].map(c => (
                <div key={c.label} style={{ ...cardStyle, padding: "14px 16px" }}>
                  <div style={{ fontSize: 20, marginBottom: 6 }}>{c.icon}</div>
                  <div style={{ fontSize: 11, color: "#5A7A9A", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{c.label}</div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: c.accent }}>{c.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div style={cardStyle}>
                <div style={{ fontWeight: 600, marginBottom: 14, color: "#fff" }}>Ringkasan Keuangan</div>
                {[["Modal Penjualan", laporan.modal, "#5A7A9A"], ["Modal Keluar (Tebus)", laporan.modal_keluar, "#FF6B6B"], ["Keuntungan Kotor", laporan.keuntungan_kotor, "#F4A261"], ["Dana Tabungan", laporan.dana_tabungan, "#A78BFA"], ["Keuntungan Bersih", laporan.keuntungan_bersih, "#00C896"], ["Saldo Kas", laporan.saldo_kas, (laporan.saldo_kas || 0) >= 0 ? "#00C896" : "#FF6B6B"]].map(([k, v, c]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #1E2A3D" }}>
                    <span style={{ fontSize: 13, color: "#8A9BAE" }}>{k}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: c }}>Rp {fmt(v)}</span>
                  </div>
                ))}
              </div>
              <div style={cardStyle}>
                <div style={{ fontWeight: 600, marginBottom: 14, color: "#fff" }}>Stok & Pembayaran</div>
                {[["Stok Awal", `${laporan.stok_awal} tabung`, "#fff"], ["Terjual", `${laporan.total_tabung} tabung`, "#F4A261"], ["Sisa Stok", `${laporan.sisa_stok} tabung`, laporan.sisa_stok <= 10 ? "#FF6B6B" : "#00C896"]].map(([k, v, c]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #1E2A3D" }}>
                    <span style={{ fontSize: 13, color: "#8A9BAE" }}>{k}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: c }}>{v}</span>
                  </div>
                ))}
                <div style={{ fontWeight: 600, marginTop: 14, marginBottom: 10, color: "#fff" }}>Pembayaran</div>
                {[["Sudah Dibayar", `Rp ${fmt(laporan.sudah_dibayar)}`, "#00C896"], ["Belum Dibayar", `Rp ${fmt(laporan.belum_dibayar)}`, "#FF6B6B"]].map(([k, v, c]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #1E2A3D" }}>
                    <span style={{ fontSize: 13, color: "#8A9BAE" }}>{k}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: c }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ fontWeight: 600, marginBottom: 16, color: "#fff" }}>Penjualan 7 Hari Terakhir</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={mingguan} barSize={28}>
                  <XAxis dataKey="tanggal" tickFormatter={fmtDate} tick={{ fill: "#5A7A9A", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#5A7A9A", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#1A2535", border: "1px solid #1E2A3D", borderRadius: 8, color: "#E8EDF5" }} formatter={(v) => [`${v} tabung`, "Terjual"]} labelFormatter={fmtDate} />
                  <Bar dataKey="total_tabung" radius={[6, 6, 0, 0]}>
                    {mingguan.map((_, i) => <Cell key={i} fill={i === mingguan.length - 1 ? "#00C896" : "#1E3A4D"} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* BOOKING */}
        {tab === "Booking" && (
          <div>
            <div style={{ ...cardStyle, marginBottom: 16 }}>
              <div style={{ fontWeight: 600, color: "#fff", marginBottom: 16 }}>📝 Tambah Booking</div>
              <form onSubmit={submitBooking}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 13, color: "#8A9BAE", marginBottom: 6 }}>Tanggal Booking</label>
                    <input type="date" value={bookingForm.tanggal_booking} onChange={e => setBookingForm({ ...bookingForm, tanggal_booking: e.target.value })} style={inputStyle} required />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, color: "#8A9BAE", marginBottom: 6 }}>Nama Pembeli</label>
                    <input type="text" placeholder="Nama pembeli" value={bookingForm.nama_pembeli} onChange={e => setBookingForm({ ...bookingForm, nama_pembeli: e.target.value })} style={inputStyle} required />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, color: "#8A9BAE", marginBottom: 6 }}>Jumlah Tabung</label>
                    <input type="number" placeholder="contoh: 10" value={bookingForm.jumlah} onChange={e => setBookingForm({ ...bookingForm, jumlah: e.target.value })} style={inputStyle} required />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 13, color: "#8A9BAE", marginBottom: 6 }}>Catatan</label>
                    <input type="text" placeholder="opsional" value={bookingForm.catatan} onChange={e => setBookingForm({ ...bookingForm, catatan: e.target.value })} style={inputStyle} />
                  </div>
                </div>
                <button type="submit" style={{ ...btnPrimary, marginTop: 14 }}>Simpan Booking</button>
              </form>
            </div>

            <div style={{ ...cardStyle, overflow: "hidden", padding: 0 }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #1E2A3D", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, color: "#fff" }}>Daftar Booking</span>
                <div style={{ display: "flex", gap: 8 }}>
                  {["Semua", "Menunggu", "Diambil", "Batal"].map(s => (
                    <span key={s} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 99, background: "#1E2A3D", color: "#8A9BAE", cursor: "pointer" }}>{s}</span>
                  ))}
                </div>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#0A0F1A" }}>
                      {["Tgl Booking", "Pembeli", "Jumlah", "Estimasi", "Status", "Aksi"].map(h => (
                        <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, color: "#5A7A9A", fontWeight: 500, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {booking.map(b => (
                      <tr key={b.id} style={{ borderTop: "1px solid #1E2A3D" }}>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: "#8A9BAE" }}>{fmtDate(b.tanggal_booking)}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: "#E8EDF5", fontWeight: 500 }}>{b.nama_pembeli}</td>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: "#E8EDF5" }}>{b.jumlah} tabung</td>
                        <td style={{ padding: "12px 16px", fontSize: 13, color: "#F4A261", fontWeight: 600 }}>Rp {fmt(b.jumlah * 19000)}</td>
                        <td style={{ padding: "12px 16px" }}>
                          <span style={{ background: statusColor(b.status) + "22", color: statusColor(b.status), padding: "3px 10px", borderRadius: 99, fontSize: 12 }}>{b.status}</span>
                        </td>
                        <td style={{ padding: "12px 16px", display: "flex", gap: 6 }}>
                          {b.status === 'Menunggu' && (
                            <>
                              <button onClick={() => { setDiambilModal(b); setDiambilForm({ tanggal: new Date().toISOString().split("T")[0], status_bayar: "Lunas", jumlah_dibayar: "" }); }} style={{ background: "#00C89622", color: "#00C896", border: "1px solid #00C89644", padding: "5px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>✅ Diambil</button>
                              <button onClick={() => batalBooking(b.id)} style={{ background: "#FF6B6B22", color: "#FF6B6B", border: "1px solid #FF6B6B44", padding: "5px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>❌ Batal</button>
                            </>
                          )}
                          {b.status !== 'Menunggu' && <span style={{ fontSize: 12, color: "#5A7A9A" }}>{b.tanggal_diambil ? fmtDate(b.tanggal_diambil) : "-"}</span>}
                        </td>
                      </tr>
                    ))}
                    {booking.length === 0 && <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#5A7A9A" }}>Belum ada booking</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TRANSAKSI */}
        {tab === "Transaksi" && (
          <div style={{ ...cardStyle, overflow: "hidden", padding: 0 }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #1E2A3D", fontWeight: 600, color: "#fff" }}>Riwayat Transaksi</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#0A0F1A" }}>
                    {["Tanggal", "Pembeli", "Jumlah", "Total", "Status", "Catatan", "Struk"].map(h => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, color: "#5A7A9A", fontWeight: 500, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {transaksi.map(t => (
                    <tr key={t.id} style={{ borderTop: "1px solid #1E2A3D" }}>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#8A9BAE" }}>{fmtDate(t.tanggal)}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#E8EDF5" }}>{t.nama_pembeli || "-"}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#E8EDF5" }}>{t.jumlah} tabung</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#F4A261", fontWeight: 600 }}>Rp {fmt(t.total)}</td>
                      <td style={{ padding: "12px 16px" }}><span style={{ background: statusColor(t.status_bayar) + "22", color: statusColor(t.status_bayar), padding: "3px 10px", borderRadius: 99, fontSize: 12 }}>{t.status_bayar}</span></td>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: "#5A7A9A" }}>{t.catatan || "-"}</td>
                      <td style={{ padding: "12px 16px" }}><button onClick={() => setStruk(t)} style={{ background: "#1E2A3D", color: "#E8EDF5", border: "1px solid #2A3F55", padding: "5px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>🧾</button></td>
                    </tr>
                  ))}
                  {transaksi.length === 0 && <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#5A7A9A" }}>Belum ada transaksi</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* HUTANG */}
        {tab === "Hutang" && (
          <div style={{ ...cardStyle, overflow: "hidden", padding: 0 }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #1E2A3D", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 600, color: "#fff" }}>Daftar Hutang & DP</span>
              <span style={{ background: "#FF6B6B22", color: "#FF6B6B", padding: "4px 12px", borderRadius: 99, fontSize: 13, fontWeight: 600 }}>Total: Rp {fmt(hutang.reduce((a, h) => a + h.sisa_tagihan, 0))}</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#0A0F1A" }}>
                    {["Tanggal", "Pembeli", "Jumlah", "Total", "Dibayar", "Sisa", "Aksi"].map(h => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, color: "#5A7A9A", fontWeight: 500, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hutang.map(h => (
                    <tr key={h.id} style={{ borderTop: "1px solid #1E2A3D" }}>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#8A9BAE" }}>{fmtDate(h.tanggal)}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#E8EDF5" }}>{h.nama_pembeli || "-"}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#E8EDF5" }}>{h.jumlah} tabung</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#F4A261" }}>Rp {fmt(h.total)}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#00C896" }}>Rp {fmt(h.jumlah_dibayar)}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#FF6B6B", fontWeight: 600 }}>Rp {fmt(h.sisa_tagihan)}</td>
                      <td style={{ padding: "12px 16px" }}><button onClick={() => lunasin(h.id, h.total)} style={{ background: "#00C89622", color: "#00C896", border: "1px solid #00C89644", padding: "5px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>Lunas</button></td>
                    </tr>
                  ))}
                  {hutang.length === 0 && <tr><td colSpan={7} style={{ padding: 32, textAlign: "center", color: "#5A7A9A" }}>Tidak ada hutang 🎉</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PENEBUSAN */}
        {tab === "Penebusan" && (
          <div style={{ ...cardStyle, overflow: "hidden", padding: 0 }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #1E2A3D", fontWeight: 600, color: "#fff" }}>📋 Riwayat Penebusan</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#0A0F1A" }}>
                    {["Tgl Tebus", "Tgl Datang", "Jumlah", "Modal", "Status", "Aksi"].map(h => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 12, color: "#5A7A9A", fontWeight: 500, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {penebusan.map(p => (
                    <tr key={p.id} style={{ borderTop: "1px solid #1E2A3D" }}>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#8A9BAE" }}>{fmtDate(p.tanggal_tebus)}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#E8EDF5" }}>{fmtDate(p.tanggal_datang)}</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#E8EDF5" }}>{p.jumlah_tabung} tabung</td>
                      <td style={{ padding: "12px 16px", fontSize: 13, color: "#FF6B6B", fontWeight: 600 }}>Rp {fmt(p.total_modal)}</td>
                      <td style={{ padding: "12px 16px" }}><span style={{ background: statusColor(p.status) + "22", color: statusColor(p.status), padding: "3px 10px", borderRadius: 99, fontSize: 12 }}>{p.status}</span></td>
                      <td style={{ padding: "12px 16px" }}>
                        {p.status === 'Menunggu' && <button onClick={() => konfirmasiDatang(p.id)} style={{ background: "#00C89622", color: "#00C896", border: "1px solid #00C89644", padding: "5px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>✅ Gas Datang</button>}
                        {p.status === 'Sudah Datang' && <span style={{ fontSize: 12, color: "#5A7A9A" }}>Selesai</span>}
                      </td>
                    </tr>
                  ))}
                  {penebusan.length === 0 && <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: "#5A7A9A" }}>Belum ada penebusan</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* INPUT */}
        {tab === "Input" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={cardStyle}>
              <div style={{ fontWeight: 600, color: "#fff", marginBottom: 16 }}>📦 Input Stok Pagi</div>
              <form onSubmit={submitStok}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 13, color: "#8A9BAE", marginBottom: 6 }}>Tanggal</label>
                  <input type="date" value={stokForm.tanggal} onChange={e => setStokForm({ ...stokForm, tanggal: e.target.value })} style={inputStyle} required />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: "block", fontSize: 13, color: "#8A9BAE", marginBottom: 6 }}>Stok Awal (tabung)</label>
                  <input type="number" placeholder="contoh: 50" value={stokForm.stok_awal} onChange={e => setStokForm({ ...stokForm, stok_awal: e.target.value })} style={inputStyle} required />
                </div>
                <button type="submit" style={btnPrimary}>Simpan Stok</button>
              </form>
            </div>

            <div style={cardStyle}>
              <div style={{ fontWeight: 600, color: "#fff", marginBottom: 4 }}>🫙 Input Penjualan Langsung</div>
              <div style={{ fontSize: 12, color: "#5A7A9A", marginBottom: 14 }}>Untuk penjualan tanpa booking sebelumnya</div>
              <form onSubmit={submitPenjualan}>
                {[{ label: "Tanggal", key: "tanggal", type: "date" }, { label: "Jumlah Tabung", key: "jumlah", type: "number", placeholder: "contoh: 5" }, { label: "Nama Pembeli", key: "nama_pembeli", type: "text", placeholder: "opsional" }, { label: "Catatan", key: "catatan", type: "text", placeholder: "opsional" }].map(f => (
                  <div key={f.key} style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontSize: 13, color: "#8A9BAE", marginBottom: 6 }}>{f.label}</label>
                    <input type={f.type} placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} style={inputStyle} required={["tanggal", "jumlah"].includes(f.key)} />
                  </div>
                ))}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", fontSize: 13, color: "#8A9BAE", marginBottom: 6 }}>Status Pembayaran</label>
                  <select value={form.status_bayar} onChange={e => setForm({ ...form, status_bayar: e.target.value })} style={inputStyle}>
                    <option>Lunas</option><option>Hutang</option><option>DP</option>
                  </select>
                </div>
                {form.status_bayar === "DP" && (
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: "block", fontSize: 13, color: "#8A9BAE", marginBottom: 6 }}>Jumlah Dibayar (Rp)</label>
                    <input type="number" value={form.jumlah_dibayar} onChange={e => setForm({ ...form, jumlah_dibayar: e.target.value })} style={inputStyle} />
                  </div>
                )}
                <button type="submit" style={btnPrimary}>Simpan Transaksi</button>
              </form>
            </div>

            <div style={{ ...cardStyle, border: "1px solid #FF6B6B44", gridColumn: "1/-1" }}>
              <div style={{ fontWeight: 600, color: "#fff", marginBottom: 4 }}>💸 Input Penebusan ke Agen</div>
              <div style={{ fontSize: 12, color: "#5A7A9A", marginBottom: 16 }}>Input H-1 sebelum gas datang.</div>
              <form onSubmit={submitTebus}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  {[{ label: "Tanggal Tebus", key: "tanggal_tebus", type: "date" }, { label: "Jumlah Tabung", key: "jumlah_tabung", type: "number", placeholder: "contoh: 50" }, { label: "Tanggal Gas Datang", key: "tanggal_datang", type: "date" }].map(f => (
                    <div key={f.key}>
                      <label style={{ display: "block", fontSize: 13, color: "#8A9BAE", marginBottom: 6 }}>{f.label}</label>
                      <input type={f.type} placeholder={f.placeholder} value={tebusForm[f.key]} onChange={e => setTebusForm({ ...tebusForm, [f.key]: e.target.value })} style={inputStyle} required />
                    </div>
                  ))}
                </div>
                {tebusForm.jumlah_tabung && (
                  <div style={{ margin: "12px 0", background: "#FF6B6B22", border: "1px solid #FF6B6B44", borderRadius: 8, padding: "10px 14px", fontSize: 14, color: "#FF6B6B" }}>
                    💸 Total modal keluar: <strong>Rp {fmt(tebusForm.jumlah_tabung * tebusForm.harga_per_tabung)}</strong>
                  </div>
                )}
                <div style={{ marginTop: 12 }}>
                  <label style={{ display: "block", fontSize: 13, color: "#8A9BAE", marginBottom: 6 }}>Catatan</label>
                  <input type="text" placeholder="opsional" value={tebusForm.catatan} onChange={e => setTebusForm({ ...tebusForm, catatan: e.target.value })} style={inputStyle} />
                </div>
                <button type="submit" style={{ ...btnPrimary, marginTop: 14, background: "#FF6B6B", color: "#fff" }}>Simpan Penebusan</button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* MODAL DIAMBIL */}
      {diambilModal && (
        <div onClick={() => setDiambilModal(null)} style={{ position: "fixed", inset: 0, background: "#00000099", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0F1624", border: "1px solid #1E2A3D", borderRadius: 16, padding: 28, width: 340 }}>
            <div style={{ fontWeight: 600, color: "#fff", marginBottom: 4 }}>✅ Konfirmasi Gas Diambil</div>
            <div style={{ fontSize: 13, color: "#5A7A9A", marginBottom: 16 }}>👤 {diambilModal.nama_pembeli} — {diambilModal.jumlah} tabung (Rp {fmt(diambilModal.jumlah * 19000)})</div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 13, color: "#8A9BAE", marginBottom: 6 }}>Tanggal Diambil</label>
              <input type="date" value={diambilForm.tanggal} onChange={e => setDiambilForm({ ...diambilForm, tanggal: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: "block", fontSize: 13, color: "#8A9BAE", marginBottom: 6 }}>Status Pembayaran</label>
              <select value={diambilForm.status_bayar} onChange={e => setDiambilForm({ ...diambilForm, status_bayar: e.target.value })} style={inputStyle}>
                <option>Lunas</option><option>Hutang</option><option>DP</option>
              </select>
            </div>
            {diambilForm.status_bayar === "DP" && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "#8A9BAE", marginBottom: 6 }}>Jumlah Dibayar (Rp)</label>
                <input type="number" value={diambilForm.jumlah_dibayar} onChange={e => setDiambilForm({ ...diambilForm, jumlah_dibayar: e.target.value })} style={inputStyle} />
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={submitDiambil} style={{ flex: 1, background: "#00C896", border: "none", borderRadius: 10, padding: "12px", color: "#0A0F1A", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Konfirmasi Diambil</button>
              <button onClick={() => setDiambilModal(null)} style={{ flex: 1, background: "#1E2A3D", border: "none", borderRadius: 10, padding: "12px", color: "#8A9BAE", fontSize: 14, cursor: "pointer" }}>Batal</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL STRUK */}
      {struk && (
        <div onClick={() => setStruk(null)} style={{ position: "fixed", inset: 0, background: "#00000099", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0F1624", border: "1px solid #1E2A3D", borderRadius: 16, padding: 28, width: 300, fontFamily: "monospace" }}>
            <div style={{ textAlign: "center", fontWeight: 700, fontSize: 15, color: "#fff", marginBottom: 4 }}>⛽ LENYA GAS</div>
            <div style={{ textAlign: "center", fontSize: 11, color: "#5A7A9A", marginBottom: 14 }}>Struk Penjualan</div>
            <div style={{ borderTop: "1px dashed #2A3F55", marginBottom: 12 }} />
            <div style={{ fontSize: 12, color: "#8A9BAE", marginBottom: 3 }}>📅 {fmtFull(struk.tanggal)}</div>
            <div style={{ fontSize: 12, color: "#8A9BAE", marginBottom: 12 }}>👤 {struk.nama_pembeli || "Umum"}</div>
            <div style={{ borderTop: "1px dashed #2A3F55", marginBottom: 12 }} />
            <div style={{ fontSize: 13, color: "#E8EDF5", marginBottom: 4 }}>🫙 {struk.ukuran_tabung} × {struk.jumlah} tabung</div>
            <div style={{ fontSize: 13, color: "#E8EDF5", marginBottom: 4 }}>💵 Rp {fmt(struk.harga_jual)} / tabung</div>
            <div style={{ borderTop: "1px dashed #2A3F55", margin: "10px 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 14, color: "#8A9BAE" }}>Total</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: "#00C896" }}>Rp {fmt(struk.total)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "#8A9BAE" }}>Status</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: statusColor(struk.status_bayar) }}>{struk.status_bayar}</span>
            </div>
            {struk.catatan && <div style={{ fontSize: 12, color: "#5A7A9A", marginTop: 8 }}>📝 {struk.catatan}</div>}
            <div style={{ borderTop: "1px dashed #2A3F55", margin: "14px 0 10px" }} />
            <div style={{ textAlign: "center", fontSize: 11, color: "#5A7A9A", marginBottom: 16 }}>Terima kasih sudah membeli! 🙏</div>
            <button onClick={() => setStruk(null)} style={{ width: "100%", background: "#1E2A3D", border: "none", borderRadius: 8, padding: "10px", color: "#8A9BAE", cursor: "pointer", fontSize: 13 }}>Tutup</button>
          </div>
        </div>
      )}
    </div>
  );
}