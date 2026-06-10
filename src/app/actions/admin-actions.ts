// src/app/actions/admin-actions.ts
"use server";

import { supabaseAdmin } from "../../lib/supabase/admin";
import { supabase } from "../../services/db";

interface ServerResponse<T = any> {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
}

/**
 * 1. Membuat akun user (staf baru) dari Admin Dashboard
 */
export async function createNewUser(
  formData: FormData,
): Promise<ServerResponse> {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;
    const role = (formData.get("role") as string) || "CASHIER";

    if (!email || !password || !name) {
      return {
        success: false,
        error: "Semua field wajib diisi (email, password, nama).",
      };
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role,
      },
    });

    if (error) {
      console.error("[Admin API] Error creating user:", error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      message: "Akun staf berhasil dibuat.",
      data: data.user,
    };
  } catch (error: any) {
    console.error("Server action createNewUser error: ", error);
    return {
      success: false,
      error: error.message || "Terjadi kesalahan sistem",
    };
  }
}

/**
 * 4. Tambah Pengeluaran Operasional
 */
export async function addOperationalExpense(formData: FormData): Promise<ServerResponse> {
  try {
    const description = formData.get("description") as string;
    const amount = Number(formData.get("amount"));
    const category = formData.get("category") as string;
    const date = formData.get("date") as string;

    if (!description || !amount || !date) {
      return { success: false, error: "Deskripsi, jumlah, dan tanggal wajib diisi." };
    }

    const { data, error } = await supabase
      .from("operational_expenses")
      .insert([{ description, amount, category, date }])
      .select()
      .single();

    if (error) {
      console.error("[Expense API] Error:", error);
      return { success: false, error: error.message };
    }

    return { success: true, message: "Pengeluaran berhasil dicatat", data };
  } catch (error: any) {
    return { success: false, error: error.message || "Terjadi kesalahan sistem" };
  }
}

/**
 * 2. Menambahkan hutang/piutang baru
 */
export async function addDebt(formData: FormData): Promise<ServerResponse> {
  try {
    const tipe_transaksi = formData.get("tipe_transaksi") as string;
    const jumlah = Number(formData.get("jumlah"));
    const keterangan = formData.get("keterangan") as string;
    const jatuh_tempo = formData.get("jatuh_tempo") as string;

    if (!tipe_transaksi || !jumlah || !jatuh_tempo) {
      return {
        success: false,
        error: "Tipe transaksi, jumlah, dan jatuh tempo wajib diisi.",
      };
    }

    // Try to detect column names by inserting with Indonesian columns.
    // If it fails with column missing, fallback to English columns.
    const finalPayload = {
      type: tipe_transaksi.toUpperCase() === "HUTANG" || tipe_transaksi.toUpperCase() === "PAYABLE" ? "PAYABLE" : "RECEIVABLE",
      amount: jumlah,
      entity: keterangan,
      due_date: jatuh_tempo,
      status: "UNPAID",
    };

    let { data, error } = await supabase
      .from("debts")
      .insert([finalPayload])
      .select()
      .single();

    if (error) {
      console.error("[Debt API] Error adding debt:", error);
      return { success: false, error: error.message };
    }

    const normalizedData = {
      id: data.id,
      tipe_transaksi: data.tipe_transaksi || (data.type === "PAYABLE" ? "hutang" : "piutang"),
      jumlah: data.jumlah || data.amount,
      keterangan: data.keterangan || data.entity,
      jatuh_tempo: data.jatuh_tempo || data.due_date,
      status: data.status === "UNPAID" ? "belum_lunas" : data.status === "PAID" ? "lunas" : data.status,
      created_at: data.created_at,
      updated_at: data.updated_at
    };

    return {
      success: true,
      message: "Data hutang/piutang berhasil ditambahkan",
      data: normalizedData,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Terjadi kesalahan sistem",
    };
  }
}

/**
 * 3. Mengubah status hutang/piutang
 */
export async function updateDebtStatus(
  id: string,
  status: string,
): Promise<ServerResponse> {
  try {
    if (!id || !status) {
      return { success: false, error: "ID dan status tidak valid." };
    }

    const englishStatus = status === "lunas" ? "PAID" : "UNPAID";
    let { data, error } = await supabase
      .from("debts")
      .update({ status: englishStatus, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Debt API] Error updating debt status:", error);
      return { success: false, error: error.message };
    }

    const normalizedData = {
      id: data.id,
      tipe_transaksi: data.tipe_transaksi || (data.type === "PAYABLE" ? "hutang" : "piutang"),
      jumlah: data.jumlah || data.amount,
      keterangan: data.keterangan || data.entity,
      jatuh_tempo: data.jatuh_tempo || data.due_date,
      status: data.status === "UNPAID" ? "belum_lunas" : data.status === "PAID" ? "lunas" : data.status,
      created_at: data.created_at,
      updated_at: data.updated_at
    };

    return { success: true, message: "Status berhasil diperbarui.", data: normalizedData };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Terjadi kesalahan sistem",
    };
  }
}
