-- === MIGRASI V7: LOGIKA PENERIMA DATA OTOMATIS (SERVER-SIDE) ===
-- Jalankan kueri ini di SQL Editor Supabase Anda.

-- 1. FUNGSI UNTUK MENANGANI LAPORAN OPERATOR
CREATE OR REPLACE FUNCTION public.handle_operator_damage_report()
RETURNS TRIGGER AS $$
DECLARE
    current_eq_status TEXT;
    eq_id UUID;
BEGIN
    -- Ambil ID alat berat dari laporan yang baru masuk
    eq_id := NEW.equipment_id;

    -- Jika kolom keterangan_tambahan mengandung label [Kerusakan]
    IF NEW.keterangan_tambahan LIKE '[Kerusakan]%' THEN
        
        -- Ambil status alat berat saat ini untuk pengecekan "Anti-Reset"
        SELECT status INTO current_eq_status FROM public.heavy_equipment WHERE id = eq_id;

        -- LOGIKA: Hanya buat log perbaikan baru jika alat SEBELUMNYA tidak dalam kondisi maintenance
        IF current_eq_status IS DISTINCT FROM 'maintenance' THEN
            
            -- Ubah status alat menjadi maintenance
            UPDATE public.heavy_equipment 
            SET status = 'maintenance' 
            WHERE id = eq_id;

            -- Buat entri baru di maintenance_logs (Progres dimulai dari 'pelaporan')
            INSERT INTO public.maintenance_logs (
                equipment_id,
                reported_by,
                damage_description,
                progress_status
            ) VALUES (
                eq_id,
                NEW.operator_id,
                NEW.keterangan_tambahan,
                'pelaporan'
            );
            
            RAISE NOTICE 'Alat % masuk tahap maintenance baru.', eq_id;
        ELSE
            -- Jika sudah maintenance, kita tidak meriset progres, hanya mencatat di operator_logs (sudah dilakukan oleh insert asli)
            RAISE NOTICE 'Alat % sudah dalam maintenance, laporan tambahan dicatat tanpa mereset progres.', eq_id;
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. FUNGSI UNTUK PEMULIHAN STATUS SETELAH PERBAIKAN SELESAI
CREATE OR REPLACE FUNCTION public.handle_maintenance_completion()
RETURNS TRIGGER AS $$
DECLARE
    has_active_assignment BOOLEAN;
BEGIN
    -- Jika status perbaikan diubah menjadi 'selesai'
    IF NEW.progress_status = 'selesai' AND (OLD.progress_status IS DISTINCT FROM 'selesai') THEN
        
        -- Cek apakah alat masih punya penugasan aktif
        SELECT EXISTS (
            SELECT 1 FROM public.assignments 
            WHERE equipment_id = NEW.equipment_id AND status = 'active'
        ) INTO has_active_assignment;

        -- Jika ada tugas aktif -> operating, jika tidak -> ready
        IF has_active_assignment THEN
            UPDATE public.heavy_equipment SET status = 'operating' WHERE id = NEW.equipment_id;
        ELSE
            UPDATE public.heavy_equipment SET status = 'ready' WHERE id = NEW.equipment_id;
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. TRIGGER UNTUK MENJALANKAN FUNGSI SETELAH UPDATE LOG
DROP TRIGGER IF EXISTS tr_on_maintenance_updated ON public.maintenance_logs;
CREATE TRIGGER tr_on_maintenance_updated
AFTER UPDATE ON public.maintenance_logs
FOR EACH ROW
EXECUTE FUNCTION public.handle_maintenance_completion();

COMMENT ON FUNCTION public.handle_maintenance_completion() IS 'Logika penerima data otomatis: Memulihkan status alat ke operating/ready segera setelah perbaikan selesai.';

-- 4. TRIGGER LAPORAN OPERATOR (Existing)
DROP TRIGGER IF EXISTS tr_on_operator_report_inserted ON public.operator_logs;
CREATE TRIGGER tr_on_operator_report_inserted
AFTER INSERT ON public.operator_logs
FOR EACH ROW
EXECUTE FUNCTION public.handle_operator_damage_report();
