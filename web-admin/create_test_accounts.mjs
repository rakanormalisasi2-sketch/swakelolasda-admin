import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ratmptlcrjifuplokask.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_f-edKVAdh1oC22Bo_Q9jNw_WsbXT8YL';
const supabase = createClient(supabaseUrl, supabaseKey);

const accounts = [
  { email: 'peralatan@test.local', password: 'rakaganteng', name: 'Tim Peralatan', role: 'peralatan' },
  { email: 'normalisasi@test.local', password: 'rakaganteng', name: 'Admin Normalisasi', role: 'seksi_normalisasi' },
  { email: 'embung@test.local', password: 'rakaganteng', name: 'Admin Embung', role: 'seksi_embung' }
];

async function ensureAccounts() {
  for (const acc of accounts) {
    // Check if user exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const user = existingUser?.users?.find(u => u.email === acc.email);
    
    let userId;
    if (user) {
      // Update password
      await supabase.auth.admin.updateUserById(user.id, { password: acc.password });
      userId = user.id;
      console.log(`Updated password for ${acc.email}`);
    } else {
      // Create user
      const { data, error } = await supabase.auth.admin.createUser({
        email: acc.email,
        password: acc.password,
        email_confirm: true
      });
      if (error) {
        console.error(`Error creating ${acc.email}:`, error);
        continue;
      }
      userId = data.user.id;
      console.log(`Created user ${acc.email}`);
    }

    // Upsert to user_profiles
    await supabase.from('user_profiles').upsert({
      id: userId,
      full_name: acc.name,
      role: acc.role
    });
  }
}

ensureAccounts();
