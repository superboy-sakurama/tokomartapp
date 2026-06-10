// src/services/pos.ts
import { TransactionPayload, TransactionResponse } from '../types/transaction';
import { TransactionService, supabase } from './db';

export const POSService = {
  async processTransaction(payload: TransactionPayload): Promise<TransactionResponse> {
    return await this.fallbackTransaction(payload);
  },

  // Fallback Service Support for Vite Preview Mode (since Next.js API won't run directly in Vite)
  async fallbackTransaction(payload: TransactionPayload): Promise<TransactionResponse> {
     try {
        const receiptNumber = `INV-${Date.now().toString().slice(-6)}`;
        
        // If payment method is HUTANG, status is UNPAID.
        const status = payload.payment_method === 'HUTANG' ? 'UNPAID' : 'COMPLETED';

        let combinedTotal = payload.total_amount;
        let changeAmount = 0;
        let finalAmountPaid = payload.amount_paid;

        // Collect items to return for the receipt
        let itemsReceipt = payload.items.map(item => ({...item}));
        
        if (payload.pay_debt && payload.customer_id) {
            // Find unpaid transactions for this customer
            const { data: unpaidRecords } = await supabase
              .from('transactions')
              .select('id, total_amount, receipt_number')
              .eq('customer_id', payload.customer_id)
              .eq('status', 'UNPAID');

            if (unpaidRecords && unpaidRecords.length > 0) {
              const totalUnpaid = unpaidRecords.reduce((sum, r) => sum + Number(r.total_amount), 0);
              combinedTotal += totalUnpaid;
              
              // We should append the debt into receipt items as a single or multiple lines
              itemsReceipt.push({
                id: 'DEBT',
                name: 'Pelunasan Hutang Sebelumnya',
                price: totalUnpaid,
                stock: 1,
                cartQuantity: 1
              });

              // Mark them as completed
              await supabase
                .from('transactions')
                .update({ status: 'COMPLETED' })
                .in('id', unpaidRecords.map(r => r.id));
            }
        }

        if (payload.payment_method !== 'HUTANG') {
           if (payload.payment_method !== 'CASH') {
              finalAmountPaid = combinedTotal; // debit/qris pays exactly total
           }
           changeAmount = finalAmountPaid - combinedTotal;
        } else {
           changeAmount = 0;
           finalAmountPaid = 0;
        }
  
        const transactionItems = payload.items.map(item => ({
          product_id: item.id,
          quantity: item.cartQuantity,
          price_at_time: item.price,
          subtotal: item.price * item.cartQuantity
        }));
  
        await TransactionService.checkout({
          receipt_number: receiptNumber,
          total_amount: payload.total_amount, // Original amount stored in the table
          payment_method: payload.payment_method,
          customer_id: payload.customer_id || null,
          user_id: payload.user_id,
          status: status
        }, transactionItems);

        return {
          success: true,
          message: 'Transaksi berhasil diproses.',
          data: {
             receipt_number: receiptNumber,
             total_amount: combinedTotal, // Return combined for receipt display
             amount_paid: finalAmountPaid,
             change_amount: changeAmount,
             payment_method: payload.payment_method,
             created_at: new Date().toISOString(),
             items: itemsReceipt
          }
        };
     } catch (e: any) {
        return { success: false, message: 'Gagal memproses transaksi', error: e.message };
     }
  }
};
