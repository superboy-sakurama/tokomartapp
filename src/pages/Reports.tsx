import { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Receipt,
  CreditCard,
  Loader2,
} from "lucide-react";
import {
  ReportsService,
  ProfitLossData,
  LiquidityData,
} from "../services/reports";
import { IDebt } from "../types/finance";
import { addDebt, updateDebtStatus, addOperationalExpense } from "../app/actions/admin-actions";

export function Reports() {
  const [activeTab, setActiveTab] = useState<
    "profitloss" | "liquidity" | "debts"
  >("profitloss");
  const [loading, setLoading] = useState(true);

  const [profitLossData, setProfitLossData] = useState<ProfitLossData>({
    revenue: 0,
    cogs: 0,
    grossProfit: 0,
    operationalExpenses: 0,
    netProfit: 0,
  });
  const [liquidityData, setLiquidityData] = useState<LiquidityData>({
    cash: 0,
    bank: 0,
    inventoryValue: 0,
    totalCurrentAssets: 0,
  });
  const [debtsData, setDebtsData] = useState<IDebt[]>([]);
  const [isAddingDebt, setIsAddingDebt] = useState(false);
  const [debtFormLoading, setDebtFormLoading] = useState(false);
  
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [expenseFormLoading, setExpenseFormLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [pl, liq, dbts] = await Promise.all([
          ReportsService.getProfitLoss(),
          ReportsService.getLiquidity(),
          ReportsService.getDebts(),
        ]);
        setProfitLossData(pl);
        setLiquidityData(liq);
        setDebtsData(dbts);
      } catch (error) {
        console.error("Failed to load reports:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleAddDebt = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setDebtFormLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const res = await addDebt(formData);
      if (res.success && res.data) {
        setDebtsData((prev) => [...prev, res.data as IDebt].sort((a, b) => new Date(a.jatuh_tempo).getTime() - new Date(b.jatuh_tempo).getTime()));
        setIsAddingDebt(false);
      } else {
        alert(res.error || "Gagal menambah data hutang/piutang.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setDebtFormLoading(false);
    }
  };

  const handleAddExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setExpenseFormLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
      const res = await addOperationalExpense(formData);
      if (res.success) {
        // Reload profit loss and liquidity data
        const [pl, liq] = await Promise.all([
          ReportsService.getProfitLoss(),
          ReportsService.getLiquidity(),
        ]);
        setProfitLossData(pl);
        setLiquidityData(liq);
        setIsAddingExpense(false);
      } else {
        alert(res.error || "Gagal mencatat pengeluaran.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setExpenseFormLoading(false);
    }
  };

  const handleToggleDebtStatus = async (debtId: string, currentStatus: string) => {
    const newStatus = currentStatus === "lunas" ? "belum_lunas" : "lunas";
    try {
      const res = await updateDebtStatus(debtId, newStatus);
      if (res.success) {
        setDebtsData((prev) => prev.map((d) => d.id === debtId ? { ...d, status: newStatus as any } : d));
      } else {
        alert(res.error || "Gagal update status.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Laporan & Analitik Keuangan
        </h1>
        <p className="text-gray-500 mt-1 mt-1 text-sm">
          Pantau kondisi kesehatan finansial toko Anda secara real-time.
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex bg-gray-50 p-1.5 rounded-xl border border-gray-200 w-fit">
        <button
          onClick={() => setActiveTab("profitloss")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === "profitloss" ? "bg-white text-blue-700 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-900"}`}
        >
          <TrendingUp className="w-4 h-4" /> Laba Rugi
        </button>
        <button
          onClick={() => setActiveTab("liquidity")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === "liquidity" ? "bg-white text-blue-700 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-900"}`}
        >
          <Wallet className="w-4 h-4" /> Likuiditas (Aset)
        </button>
        <button
          onClick={() => setActiveTab("debts")}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === "debts" ? "bg-white text-blue-700 shadow-sm border border-gray-200" : "text-gray-500 hover:text-gray-900"}`}
        >
          <Receipt className="w-4 h-4" /> Hutang & Piutang
        </button>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden p-6 sm:p-8 min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-gray-500 font-medium">Memuat data analitik...</p>
          </div>
        ) : (
          <>
            {/* TAB: LABA RUGI */}
            {activeTab === "profitloss" && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Laporan Laba Rugi
                  </h2>
                  <p className="text-sm text-gray-500">
                    Periode berjalan (Bulan Ini)
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-5 bg-green-50 rounded-xl border border-green-100">
                    <div className="flex items-center gap-3 text-green-700 mb-2">
                      <ArrowUpRight className="w-5 h-5" />
                      <h3 className="font-semibold">Total Pendapatan</h3>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      Rp {profitLossData.revenue.toLocaleString("id-ID")}
                    </p>
                  </div>

                  <div className="p-5 bg-red-50 rounded-xl border border-red-100">
                    <div className="flex items-center gap-3 text-red-700 mb-2">
                      <ArrowDownRight className="w-5 h-5" />
                      <h3 className="font-semibold">HPP (Modal Barang)</h3>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      Rp {profitLossData.cogs.toLocaleString("id-ID")}
                    </p>
                  </div>

                  <div className="p-5 bg-blue-50 rounded-xl border border-blue-100">
                    <div className="flex items-center gap-3 text-blue-700 mb-2">
                      <DollarSign className="w-5 h-5" />
                      <h3 className="font-semibold">Laba Kotor</h3>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      Rp {profitLossData.grossProfit.toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">
                        Pengeluaran Operasional
                      </h3>
                      <p className="text-xs text-gray-500">
                        Gaji, utilitas, sewa, dll.
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-xl font-bold text-red-600">
                        - Rp{" "}
                        {profitLossData.operationalExpenses.toLocaleString(
                          "id-ID",
                        )}
                      </p>
                      <button 
                         onClick={() => setIsAddingExpense(!isAddingExpense)}
                         className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-100 transition-colors"
                      >
                         {isAddingExpense ? "Tutup Form" : "Atur Pengeluaran"}
                      </button>
                    </div>
                  </div>
                </div>

                {isAddingExpense && (
                  <div className="p-6 bg-white border border-red-100 shadow-sm rounded-xl animate-in slide-in-from-top-2">
                    <h3 className="font-bold text-gray-900 mb-4">Catat Pengeluaran Operasional Baru</h3>
                    <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi *</label>
                        <input type="text" name="description" required placeholder="Cth: Bayar Listrik Bulan Ini" className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-red-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                        <select name="category" className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-red-500">
                           <option value="Utilitas">Listrik & Air</option>
                           <option value="Gaji">Gaji Karyawan</option>
                           <option value="Sewa">Sewa Tempat</option>
                           <option value="Lainnya">Lainnya</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah (Rp) *</label>
                        <input type="number" name="amount" required min="1" placeholder="Cth: 500000" className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-red-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal *</label>
                        <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-red-500" />
                      </div>
                      <div className="md:col-span-2">
                         <button type="submit" disabled={expenseFormLoading} className="w-full sm:w-auto px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-bold rounded-lg shadow-sm">
                           {expenseFormLoading ? "Memproses..." : "Simpan Pengeluaran"}
                         </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="flex justify-between items-end border-t-2 border-gray-900 pt-6 mt-6">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      LABA BERSIH
                    </h3>
                    <p className="text-sm text-gray-500">
                      Net Profit Setelah Biaya
                    </p>
                  </div>
                  <p className="text-4xl font-black text-green-600">
                    Rp {profitLossData.netProfit.toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
            )}

            {/* TAB: LIKUIDITAS */}
            {activeTab === "liquidity" && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Posisi Likuiditas
                  </h2>
                  <p className="text-sm text-gray-500">
                    Ringkasan aset lancar yang dimiliki toko saat ini.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <LiquidityCard
                    title="Kas di Tangan (Cash)"
                    amount={liquidityData.cash}
                    icon={Wallet}
                    color="text-amber-600"
                    bg="bg-amber-50"
                    border="border-amber-100"
                  />
                  <LiquidityCard
                    title="Saldo Bank"
                    amount={liquidityData.bank}
                    icon={CreditCard}
                    color="text-blue-600"
                    bg="bg-blue-50"
                    border="border-blue-100"
                  />
                  <LiquidityCard
                    title="Nilai Stok Barang"
                    amount={liquidityData.inventoryValue}
                    icon={TrendingUp}
                    color="text-indigo-600"
                    bg="bg-indigo-50"
                    border="border-indigo-100"
                  />
                  <LiquidityCard
                    title="TOTAL ASET LANCAR"
                    amount={liquidityData.totalCurrentAssets}
                    icon={DollarSign}
                    color="text-green-700"
                    bg="bg-green-100"
                    border="border-green-200"
                    isHighlight
                  />
                </div>
              </div>
            )}

            {/* TAB: HUTANG PIUTANG */}
            {activeTab === "debts" && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <div className="flex justify-between items-end flex-wrap gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      Hutang & Piutang
                    </h2>
                    <p className="text-sm text-gray-500">
                      Kewajiban bayar ke supplier dan tagihan pelanggan.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAddingDebt(!isAddingDebt)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors"
                  >
                    {isAddingDebt ? "Batal Tambah" : "+ Tambah Data"}
                  </button>
                </div>

                {isAddingDebt && (
                  <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl mb-6">
                    <h3 className="font-bold text-gray-900 mb-4">Form Hutang/Piutang Baru</h3>
                    <form onSubmit={handleAddDebt} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Transaksi *</label>
                        <select name="tipe_transaksi" required className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500">
                          <option value="hutang">Hutang (Kewajiban)</option>
                          <option value="piutang">Piutang (Tagihan ke Pihak Lain)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pihak / Keterangan *</label>
                        <input type="text" name="keterangan" required placeholder="Cth: Supplier Kopi ABC" className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah (Rp) *</label>
                        <input type="number" name="jumlah" required min="1" placeholder="Cth: 1500000" className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Jatuh Tempo *</label>
                        <input type="date" name="jatuh_tempo" required className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500" />
                      </div>
                      <div className="md:col-span-2">
                        <button type="submit" disabled={debtFormLoading} className="px-6 py-2.5 bg-blue-600 disabled:bg-blue-300 text-white font-bold rounded-lg shadow-sm">
                          {debtFormLoading ? "Menyimpan..." : "Simpan Data"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-y border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                        <th className="p-4 font-semibold">Tipe</th>
                        <th className="p-4 font-semibold">Keterangan</th>
                        <th className="p-4 font-semibold">Jatuh Tempo</th>
                        <th className="p-4 font-semibold text-center">
                          Status
                        </th>
                        <th className="p-4 font-semibold text-right">
                          Jumlah (Rp)
                        </th>
                        <th className="p-4 font-semibold text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {debtsData.map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="p-4">
                            <span
                              className={`inline-flex py-1 px-2.5 rounded-lg text-xs font-bold ${
                                item.tipe_transaksi === "hutang"
                                  ? "bg-red-50 text-red-700 border border-red-100"
                                  : "bg-green-50 text-green-700 border border-green-100"
                              }`}
                            >
                              {item.tipe_transaksi === "hutang" ? "HUTANG" : "PIUTANG"}
                            </span>
                          </td>
                          <td className="p-4 font-bold text-gray-900">
                            {item.keterangan || "-"}
                          </td>
                          <td className="p-4 text-gray-600 text-sm">
                            {new Date(item.jatuh_tempo).toLocaleDateString(
                              "id-ID",
                              {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              },
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <span
                              className={`inline-flex py-1 px-2.5 text-xs font-semibold rounded-md ${
                                item.status === "belum_lunas"
                                  ? "bg-orange-100 text-orange-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {item.status === "belum_lunas" ? "BELUM LUNAS" : "LUNAS"}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <span className="font-bold text-gray-900">
                              {Number(item.jumlah).toLocaleString("id-ID")}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleToggleDebtStatus(item.id, item.status)}
                              className="text-xs font-semibold px-3 py-1.5 rounded bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                            >
                              Toggle Status
                            </button>
                          </td>
                        </tr>
                      ))}
                      {debtsData.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-6 text-gray-400">Belum ada pencatatan hutang/piutang.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function LiquidityCard({
  title,
  amount,
  icon: Icon,
  color,
  bg,
  border,
  isHighlight = false,
}: any) {
  return (
    <div
      className={`p-5 rounded-2xl border ${bg} ${border} ${isHighlight ? "shadow-md scale-[1.02]" : "shadow-sm"}`}
    >
      <div className={`flex items-center gap-3 ${color} mb-3`}>
        <div className={`p-2 rounded-xl bg-white/60`}>
          <Icon className="w-5 h-5" />
        </div>
        <h3
          className={`font-semibold ${isHighlight ? "text-xs uppercase tracking-wider" : "text-sm"}`}
        >
          {title}
        </h3>
      </div>
      <p
        className={`font-bold text-gray-900 ${isHighlight ? "text-3xl" : "text-2xl"}`}
      >
        Rp {amount.toLocaleString("id-ID")}
      </p>
    </div>
  );
}
