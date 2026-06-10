import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Printer, CheckCircle, Download } from 'lucide-react';
import { Transaction, StoreSettings, AppSettings } from '../../types';
import { SettingsService } from '../../services/settings';
import { formatImageUrl } from '../../lib/utils';
// @ts-ignore
import html2pdf from 'html2pdf.js';

interface ReceiptInvoiceProps {
  transaction: any; // Merged type with items
  onBack: () => void;
  showSuccessHeader?: boolean;
}

export function ReceiptInvoice({ transaction, onBack, showSuccessHeader = true }: ReceiptInvoiceProps) {
  const { items, receipt_number, total_amount, payment_method, created_at } = transaction;
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    SettingsService.getStoreSettings().then(data => {
      if (mounted) setStoreSettings(data);
    });
    SettingsService.getAppSettings().then(data => {
      if (mounted) setAppSettings(data);
    });
    return () => { mounted = false; };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    if (!invoiceRef.current) return;
    const element = invoiceRef.current;
    
    // Hide success header briefly if it exists
    const successHeader = element.querySelector('.success-header');
    if (successHeader) {
      (successHeader as HTMLElement).style.display = 'none';
    }

    const opt = {
      margin:       10,
      filename:     `Struk_${receipt_number}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, logging: false },
      jsPDF:        { unit: 'mm' as const, format: 'a4', orientation: 'portrait' as const }
    };

    html2pdf().from(element).set(opt).save().then(() => {
       // Restore
       if (successHeader) {
         (successHeader as HTMLElement).style.display = 'flex';
       }
    });
  };

  return (
    <div className="max-w-2xl mx-auto py-8 animate-in fade-in duration-300">
      
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8 print:hidden">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl font-medium transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali ke POS
        </button>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white hover:bg-slate-900 rounded-xl font-bold transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            Unduh PDF
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Cetak Struk
          </button>
        </div>
      </div>

      <div ref={invoiceRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 relative overflow-hidden print:shadow-none print:border-none print:p-0 printable-area">
        
        {/* Success Header (Hidden in print) */}
        {showSuccessHeader && (
          <div className="success-header flex flex-col items-center justify-center mb-8 pb-8 border-b border-dashed border-gray-200 print:hidden">
             <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8" />
             </div>
             <h2 className="text-2xl font-bold text-gray-900 mb-1">Pembayaran Berhasil</h2>
             <p className="text-gray-500 text-sm">Terima kasih atas transaksinya.</p>
          </div>
        )}

        {/* Invoice Body */}
        <div className="text-center mb-8">
           {appSettings?.logo_url && (
             <img src={formatImageUrl(appSettings.logo_url)} alt="Logo Toko" className="h-16 mx-auto mb-3 object-contain" />
           )}
           <h1 className="text-2xl font-bold text-gray-900 tracking-tight uppercase">
             {storeSettings?.store_name || 'Toko Mart'}
           </h1>
           {storeSettings?.owner_name && (
             <p className="text-sm font-semibold text-gray-700 mt-1">{storeSettings.owner_name}</p>
           )}
           <p className="text-sm text-gray-500 mt-1">{storeSettings?.address || 'Alamat Toko'}</p>
           <p className="text-sm text-gray-500">{storeSettings?.phone || 'No Telp'}</p>
        </div>

        <div className="flex justify-between items-start text-sm mb-6 pb-6 border-b border-gray-100">
           <div>
             <p className="text-gray-500 font-medium mb-1">Nomor Struk:</p>
             <p className="font-bold text-gray-900">{receipt_number}</p>
           </div>
           <div className="text-right">
             <p className="text-gray-500 font-medium mb-1">Tanggal & Waktu:</p>
             <p className="font-bold text-gray-900">{new Date(created_at).toLocaleString('id-ID')}</p>
           </div>
        </div>

        <div className="space-y-4 mb-6">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="py-2 font-semibold">Menu / Barang</th>
                <th className="py-2 font-semibold text-center">Qty</th>
                <th className="py-2 font-semibold text-right">Harga</th>
                <th className="py-2 font-semibold text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items?.map((item: any, idx: number) => (
                <tr key={idx}>
                  <td className="py-3 font-medium text-gray-900">{item.name || item.product_name}</td>
                  <td className="py-3 text-center text-gray-600">{item.cartQuantity || item.quantity}</td>
                  <td className="py-3 text-right text-gray-600">{(item.price || item.price_at_time || 0).toLocaleString('id-ID')}</td>
                  <td className="py-3 text-right font-semibold text-gray-900">{((item.price || item.price_at_time || 0) * (item.cartQuantity || item.quantity)).toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="pt-4 border-t-2 border-dashed border-gray-200 space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
               <span>Metode Pembayaran</span>
               <span className="font-bold text-gray-900">{payment_method}</span>
            </div>
            <div className="flex justify-between items-end pt-4">
               <span className="text-lg font-bold text-gray-900">TOTAL</span>
               <span className="text-2xl font-bold text-gray-900">Rp {Number(total_amount).toLocaleString('id-ID')}</span>
            </div>
        </div>

        <div className="mt-12 text-center text-xs text-gray-400 space-y-1">
           <p>Terima Kasih Atas Kunjungan Anda</p>
           <p>Barang yang sudah dibeli tidak dapat ditukar/dikembalikan</p>
        </div>

      </div>
    </div>
  );
}
