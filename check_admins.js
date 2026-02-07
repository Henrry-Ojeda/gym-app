import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kkyblmiyuvrcqgbesavx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreWJsbWl5dXZyY3FnYmVzYXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNjk4NDMsImV4cCI6MjA4NTk0NTg0M30.fdnwquIdz0TfydtHIPCdzNX3lBWGF5ysnWlmlquEArg'
);

async function checkAdmins() {
  const { data: admins, error } = await supabase
    .from('profiles')
    .select('id, email, role')
    .or('role.eq.admin,role.eq.admin-user');
  
  console.log('ADMINS IN DB:', JSON.stringify(admins, null, 2));
  if (error) console.error('ERROR:', error);
}

checkAdmins();
