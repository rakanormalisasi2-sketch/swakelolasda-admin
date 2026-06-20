import { NextResponse } from 'next/server';
import { supabaseWarehouse } from '@/lib/supabase-warehouse';

// GET - List items, categories, or requests
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'items';
    const status = searchParams.get('status');
    const category = searchParams.get('category');

    if (type === 'categories') {
      const { data, error } = await supabaseWarehouse
        .from('warehouse_categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return NextResponse.json({ data });
    }

    if (type === 'requests') {
      let query = supabaseWarehouse
        .from('warehouse_requests')
        .select('*, item:warehouse_items(name, unit, current_stock)')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ data });
    }

    if (type === 'transactions') {
      let query = supabaseWarehouse
        .from('warehouse_transactions')
        .select('*, item:warehouse_items(name, unit)')
        .order('created_at', { ascending: false });

      const itemId = searchParams.get('item_id');
      if (itemId) {
        query = query.eq('item_id', itemId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ data });
    }

    // Settings (APK passwords)
    if (type === 'settings') {
      const { data, error } = await supabaseWarehouse
        .from('app_settings')
        .select('*')
        .in('config_key', ['apk_password_mekanik', 'apk_password_gudang']);
      if (error) throw error;
      return NextResponse.json({ data });
    }

    // Default: items (master stok)
    let query = supabaseWarehouse
      .from('warehouse_items')
      .select('*, category:warehouse_categories(name)')
      .order('name');

    if (category) {
      query = query.eq('category_id', category);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ data });

  } catch (error) {
    console.error('Warehouse GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create new item, category, request, or transaction
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, ...payload } = body;

    // Create category
    if (action === 'create_category') {
      const { data, error } = await supabaseWarehouse
        .from('warehouse_categories')
        .insert({ name: payload.name, description: payload.description })
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ data, message: 'Kategori berhasil dibuat' });
    }

    // Create item (master stok)
    if (action === 'create_item') {
      const { data, error } = await supabaseWarehouse
        .from('warehouse_items')
        .insert({
          category_id: payload.category_id,
          name: payload.name,
          description: payload.description,
          current_stock: payload.current_stock || 0,
          unit: payload.unit,
          min_stock: payload.min_stock || 0,
          price_per_unit: payload.price_per_unit || 0,
          sku: payload.sku || null,
          serial_number: payload.serial_number || null,
          photo_url: payload.photo_url || null,
        })
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ data, message: 'Barang berhasil ditambahkan' });
    }

    // Create request (dari operator/mekanik)
    if (action === 'create_request') {
      const { data, error } = await supabaseWarehouse
        .from('warehouse_requests')
        .insert({
          request_type: payload.request_type,
          item_id: payload.item_id,
          requested_qty: payload.requested_qty,
          requested_by: payload.requested_by,
          requester_role: payload.requester_role,
          equipment_id: payload.equipment_id,
          equipment_name: payload.equipment_name,
          notes: payload.notes,
          status: 'pending',
        })
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ data, message: 'Permintaan berhasil diajukan' });
    }

    // Create transaction (barang masuk/keluar)
    if (action === 'create_transaction') {
      // Get current stock
      const { data: item } = await supabaseWarehouse
        .from('warehouse_items')
        .select('current_stock')
        .eq('id', payload.item_id)
        .single();

      const currentStock = item?.current_stock || 0;
      const qtyAfter = payload.transaction_type === 'masuk' || payload.transaction_type === 'adjustment'
        ? currentStock + payload.qty
        : currentStock - payload.qty;

      // Update item stock
      await supabaseWarehouse
        .from('warehouse_items')
        .update({ current_stock: qtyAfter })
        .eq('id', payload.item_id);

      const { data, error } = await supabaseWarehouse
        .from('warehouse_transactions')
        .insert({
          item_id: payload.item_id,
          transaction_type: payload.transaction_type,
          qty: payload.qty,
          qty_before: currentStock,
          qty_after: qtyAfter,
          reference_id: payload.reference_id,
          notes: payload.notes,
          created_by: payload.created_by,
          photo_url: payload.photo_url || null,
        })
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ data, message: 'Transaksi berhasil dicatat' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Warehouse POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update item, approve/reject request
export async function PUT(request) {
  try {
    const body = await request.json();
    const { action, id, ...payload } = body;

    // Update item
    if (action === 'update_item') {
      const { data, error } = await supabaseWarehouse
        .from('warehouse_items')
        .update({
          name: payload.name,
          category_id: payload.category_id,
          description: payload.description,
          unit: payload.unit,
          min_stock: payload.min_stock,
          price_per_unit: payload.price_per_unit,
          sku: payload.sku || null,
          serial_number: payload.serial_number || null,
          photo_url: payload.photo_url !== undefined ? payload.photo_url : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ data, message: 'Barang berhasil diupdate' });
    }

    // Approve request
    if (action === 'approve_request') {
      const { data, error } = await supabaseWarehouse
        .from('warehouse_requests')
        .update({
          status: 'approved',
          approved_qty: payload.approved_qty || null,
          approved_by: payload.approved_by,
          approved_at: new Date().toISOString(),
          notes: payload.notes,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ data, message: 'Permintaan berhasil disetujui' });
    }

    // Reject request
    if (action === 'reject_request') {
      const { data, error } = await supabaseWarehouse
        .from('warehouse_requests')
        .update({
          status: 'rejected',
          notes: payload.notes,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ data, message: 'Permintaan ditolak' });
    }

    // Fulfill request (serahkan barang)
    if (action === 'fulfill_request') {
      // First, get request details
      const { data: request } = await supabaseWarehouse
        .from('warehouse_requests')
        .select('*, item:warehouse_items(current_stock)')
        .eq('id', id)
        .single();

      if (!request) throw new Error('Request not found');

      // Create transaction (keluar)
      const qty = request.approved_qty || request.requested_qty;
      const currentStock = request.item?.current_stock || 0;
      const qtyAfter = currentStock - qty;

      await supabaseWarehouse.from('warehouse_transactions').insert({
        item_id: request.item_id,
        transaction_type: 'keluar',
        qty: qty,
        qty_before: currentStock,
        qty_after: qtyAfter,
        reference_id: id,
        notes: `Fulfillment request dari ${request.requested_by}`,
        created_by: payload.fulfilled_by || 'admin',
      });

      // Update master stok
      await supabaseWarehouse
        .from('warehouse_items')
        .update({ current_stock: qtyAfter })
        .eq('id', request.item_id);

      // Update request status
      const { data, error } = await supabaseWarehouse
        .from('warehouse_requests')
        .update({ status: 'fulfilled' })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ data, message: 'Barang berhasil diserahkan' });
    }

    // Update password config
    if (action === 'update_password') {
      const { data, error } = await supabaseWarehouse
        .from('app_settings')
        .upsert({
          config_key: payload.config_key,
          config_value: payload.config_value,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'config_key' })
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ data, message: 'Password berhasil diupdate' });
    }

    // Update transaction (notes, photo, qty, type)
    if (action === 'update_transaction') {
      // 1. Get old transaction
      const { data: oldTrans } = await supabaseWarehouse
        .from('warehouse_transactions')
        .select('*')
        .eq('id', id)
        .single();
      
      if (!oldTrans) throw new Error('Transaksi tidak ditemukan');

      // 2. Calculate stock difference if qty or type changed
      if (payload.qty !== undefined || payload.transaction_type !== undefined) {
        const newQty = payload.qty !== undefined ? parseFloat(payload.qty) : oldTrans.qty;
        const newType = payload.transaction_type || oldTrans.transaction_type;
        
        const { data: item } = await supabaseWarehouse
          .from('warehouse_items')
          .select('current_stock')
          .eq('id', oldTrans.item_id)
          .single();
        
        if (item) {
          let adjustedStock = item.current_stock;
          
          // Revert old transaction effect
          if (oldTrans.transaction_type === 'masuk') adjustedStock -= oldTrans.qty;
          else if (oldTrans.transaction_type === 'keluar') adjustedStock += oldTrans.qty;

          // Apply new transaction effect
          if (newType === 'masuk') adjustedStock += newQty;
          else if (newType === 'keluar') adjustedStock -= newQty;

          await supabaseWarehouse.from('warehouse_items').update({ current_stock: adjustedStock }).eq('id', oldTrans.item_id);
        }
      }

      const { data, error } = await supabaseWarehouse
        .from('warehouse_transactions')
        .update({
          notes: payload.notes !== undefined ? payload.notes : oldTrans.notes,
          photo_url: payload.photo_url !== undefined ? payload.photo_url : oldTrans.photo_url,
          qty: payload.qty !== undefined ? parseFloat(payload.qty) : oldTrans.qty,
          transaction_type: payload.transaction_type || oldTrans.transaction_type,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ data, message: 'Laporan berhasil diupdate' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Warehouse PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remove item, category, or request
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    if (type === 'item') {
      // Delete related transactions and requests first to avoid foreign key constraints
      await supabaseWarehouse.from('warehouse_transactions').delete().eq('item_id', id);
      await supabaseWarehouse.from('warehouse_requests').delete().eq('item_id', id);
      
      const { error } = await supabaseWarehouse.from('warehouse_items').delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ message: 'Barang berhasil dihapus' });
    }

    if (type === 'category') {
      const { error } = await supabaseWarehouse.from('warehouse_categories').delete().eq('id', id);
      if (error) throw error;
      return NextResponse.json({ message: 'Kategori berhasil dihapus' });
    }

    if (type === 'request') {
      const { error } = await supabaseWarehouse
        .from('warehouse_requests')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
      return NextResponse.json({ message: 'Permintaan berhasil dibatalkan' });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

  } catch (error) {
    console.error('Warehouse DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}