import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const sql = `
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id text,
  admin_name text,
  admin_role text,
  action text NOT NULL,
  target_type text,
  target_id text,
  target_name text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);
`;

const { error } = await supabase.rpc('execute_sql', { sql });
if (error) {
  console.error('RPC failed, trying direct insert test:', error.message);
  // Try just inserting a row to see if table already exists
  const { error: ie } = await supabase.from('admin_audit_logs').insert({
    admin_id: 'system',
    admin_name: 'System',
    admin_role: 'master_admin',
    action: 'TABLE_CREATED',
    target_type: 'system',
    details: { note: 'Admin audit log table initialized' }
  });
  console.log('Insert test:', ie?.message || 'success');
} else {
  console.log('Table created successfully');
}
