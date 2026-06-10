// src/components/features/pos/PaymentModal.tsx
import { useState, useEffect } from 'react';
import { CreditCard, Receipt, X, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { CartItem, TransactionPayload } from '../../../types/transaction';
import { POSService } from '../../../services/pos';
import { CustomerService, supabase } from '../../../services/db';
import { Customer } from '../../../types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (transactionData: any) => void;
  cartItems: CartItem[];
  totalAmount: number;
  userId: string;
}

export function PaymentModal({ isOpen, onClose, onSuccess, cartItems, totalAmount, userId }: PaymentModalProps) {
  const [amountPaidStr, setAmountPaidStr] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'DEBIT' | 'HUTANG'>('CASH');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Customer selection
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  
  // Unpaid Debts for selected customer
  const [unpaidAmount, setUnpaidAmount] = useState(0);
  const [payDebtChecked, setPayDebtChecked] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmountPaidStr('');
      setPaymentMethod('CASH');
      setErrorMsg('');
      setIsLoading(false);
      setSelectedCustomerId('');
      setIsAddingCustomer(false);
      setNewCustomerName('');
      setUnpaidAmount(0);
      setPayDebtChecked(false);
      
      // Load customers
      CustomerService.getAll().then(setCustomers);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedCustomerId) {
      checkDebts(selectedCustomerId);
    } else {
      setUnpaidAmount(0);
      setPayDebtChecked(false);
    }
  }, [selectedCustomerId]);

  const checkDebts = async (customerId: string) => {
    try {
      const { data } = await supabase
        .from('transactions')
        .select('total_amount')
        .eq('customer_id', customerId)
        .eq('status', 'UNPAID');

      if (data && data.length > 0) {
        setUnpaidAmount(data.reduce((sum, row) => sum + Number(row.total_amount), 0));
        setPayDebtChecked(true); // default true if they have debt
      } else {
        setUnpaidAmount(0);
        setPayDebtChecked(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddCustomer = async () => {
    if (!newCustomerName.trim()) return;
    try {
       const newCustomerList = await supabase.from('customers').insert([{ name: newCustomerName }]).select();
       if (newCustomerList.data && newCustomerList.data[0]) {
          setCustomers(prev => [...prev, newCustomerList.data[0]]);
          setSelectedCustomerId(newCustomerList.data[0].id);
          setIsAddingCustomer(false);
       }
    } catch (e) {
       console.error("Gagal tambah customer", e);
    }
  };

  if (!isOpen) return null;

  const activeTotal = payDebtChecked ? totalAmount + unpaidAmount : totalAmount;
  const numAmountPaid = parseInt(amountPaidStr.replace(/\D/g, '') || '0', 10);
  const changeAmount = numAmountPaid - activeTotal;
  const isSufficientAmount = paymentMethod !== 'CASH' || numAmountPaid >= activeTotal;

  const handleProcessPayment = async () => {
    if (paymentMethod === 'CASH' && !isSufficientAmount) {
      setErrorMsg('Jumlah uang bayar tidak mencukupi jumlah tagihan.');
      return;
    }
    
    if (paymentMethod === 'HUTANG' && !selectedCustomerId) {
      setErrorMsg('Untuk pembayaran hutang/kredit, pilih atau buat data pelanggan terlebih dahulu.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    const payload: TransactionPayload = {
      items: cartItems,
      total_amount: totalAmount, // Original total of current cart
      amount_paid: paymentMethod === 'CASH' ? numAmountPaid : activeTotal,
      payment_method: paymentMethod as any,
      user_id: userId,
      customer_id: selectedCustomerId || null,
      pay_debt: payDebtChecked 
    };

    const response = await POSService.processTransaction(payload);
    setIsLoading(false);

    if (response.success && response.data) {
      onSuccess(response.data);
      onClose();
    } else {
      setErrorMsg(response.error || response.message || 'Terjadi kesalahan sistem dari sisi server.');
    }
  };

  const handleQuickAmount = (amount: number) => {
    setAmountPaidStr(amount.toString());
  };

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header Modal */}
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 shrink-0">
          <h2 className="text-xl font-bold text-gray-900">Pembayaran Kasir</h2>
          <button onClick={onClose} disabled={isLoading} className="text-gray-400 hover:text-gray-900 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Konten Modal */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Customer Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">Pelanggan (Opsional)</label>
            {!isAddingCustomer ? (
              <div className="flex gap-2">
                <select 
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                >
                  <option value="">-- Pelanggan Umum --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button 
                  onClick={() => setIsAddingCustomer(true)}
                  className="px-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 border border-blue-100 transition-colors flex items-center justify-center shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Nama Pelanggan Baru..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-blue-500"
                  autoFocus
                />
                <button onClick={handleAddCustomer} className="px-3 bg-blue-600 text-white font-bold text-sm rounded-lg hover:bg-blue-700">OK</button>
                <button onClick={() => setIsAddingCustomer(false)} className="px-3 bg-gray-100 text-gray-600 text-sm font-bold rounded-lg hover:bg-gray-200">X</button>
              </div>
            )}
            
            {/* Unpaid Debt Warning */}
            {unpaidAmount > 0 && selectedCustomerId && paymentMethod !== 'HUTANG' && (
              <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start gap-2">
                   <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
                   <div>
                      <p className="text-sm font-bold text-orange-800">Pelanggan ini memiliki hutang: Rp {unpaidAmount.toLocaleString('id-ID')}</p>
                      <label className="flex items-center gap-2 mt-2 cursor-pointer">
                        <input type="checkbox" checked={payDebtChecked} onChange={(e) => setPayDebtChecked(e.target.checked)} className="w-4 h-4 rounded border-orange-300 text-orange-600 focus:ring-orange-500" />
                        <span className="text-sm font-medium text-orange-700">Bayar belanja saat ini dan sekaligus hutangnya</span>
                      </label>
                   </div>
                </div>
              </div>
            )}
          </div>

          {/* Ringkasan Total */}
          <div className="text-center p-4 bg-blue-50 border border-blue-100 rounded-xl relative">
            <p className="text-sm font-semibold text-blue-600 mb-1">Total Tagihan Yang Harus Dibayar</p>
            <p className="text-3xl font-bold text-gray-900">Rp {activeTotal.toLocaleString('id-ID')}</p>
            {payDebtChecked && (
               <p className="text-xs text-blue-500 mt-1 font-medium">Beban Belanja: {totalAmount.toLocaleString('id-ID')} + Hutang: {unpaidAmount.toLocaleString('id-ID')}</p>
            )}
          </div>

          <div className="space-y-3">
             <label className="block text-sm font-semibold text-gray-700">Metode Pembayaran</label>
             <div className="grid grid-cols-3 gap-2">
                <button 
                  onClick={() => setPaymentMethod('CASH')}
                  className={`py-3 text-xs font-bold rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === 'CASH' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                  <Receipt className="w-5 h-5" /> Tunai
                </button>
                <button 
                  onClick={() => setPaymentMethod('DEBIT')}
                  className={`py-3 text-xs font-bold rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === 'DEBIT' ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                  <CreditCard className="w-5 h-5" /> Debit/Qris
                </button>
                <button 
                  onClick={() => {
                    setPaymentMethod('HUTANG');
                    setPayDebtChecked(false);
                  }}
                  className={`py-3 text-xs font-bold rounded-xl border flex flex-col items-center justify-center gap-2 transition-all ${paymentMethod === 'HUTANG' ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                  <AlertCircle className="w-5 h-5" /> Hutang/Kredit
                </button>
             </div>
          </div>

          {/* Form Input Uang Muka Jika Cash */}
          {paymentMethod === 'CASH' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700">Jumlah Uang Diterima dari Pelanggan</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">Rp</span>
                  <input
                    type="text"
                    value={numAmountPaid > 0 ? numAmountPaid.toLocaleString('id-ID') : ''}
                    onChange={(e) => {
                       const digits = e.target.value.replace(/\D/g, '');
                       setAmountPaidStr(digits);
                    }}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all font-bold text-lg text-gray-900"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Quick Amount Suggestion Buttons */}
              <div className="grid grid-cols-3 gap-2">
                 <button type="button" onClick={() => handleQuickAmount(activeTotal)} className="py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 transition-colors">Uang Pas</button>
                 <button type="button" onClick={() => handleQuickAmount(50000)} className="py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 transition-colors">50.000</button>
                 <button type="button" onClick={() => handleQuickAmount(100000)} className="py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm font-bold text-gray-700 transition-colors">100.000</button>
              </div>

              {/* Tampilan Kalkulasi Kembalian */}
              {numAmountPaid > 0 && (
                <div className={`p-4 rounded-xl border ${changeAmount >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex justify-between items-center">
                    <span className={`font-semibold text-sm ${changeAmount >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {changeAmount >= 0 ? 'Kembalian Pelanggan :' : 'Kurang Nominal :'}
                    </span>
                    <span className={`text-xl font-bold ${changeAmount >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      Rp {Math.abs(changeAmount).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message Handler */}
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-2 text-red-600 text-sm font-medium">
              <AlertCircle className="w-5 h-5 shrink-0" /> {errorMsg}
            </div>
          )}
        </div>

        {/* Footer / Tombol Aksi */}
        <div className="p-5 border-t border-gray-100 bg-white shrink-0">
          <button
            onClick={handleProcessPayment}
            disabled={isLoading || (paymentMethod === 'CASH' && !isSufficientAmount)}
            className="w-full relative py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-sm transition-colors flex justify-center items-center gap-2 overflow-hidden text-sm"
          >
            {isLoading ? (
               <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
               <>
                 <CheckCircle className="w-4 h-4" /> 
                 Konfirmasi Transaksi
               </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
