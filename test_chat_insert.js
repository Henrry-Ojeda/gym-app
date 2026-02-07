import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kkyblmiyuvrcqgbesavx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreWJsbWl5dXZyY3FnYmVzYXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNjk4NDMsImV4cCI6MjA4NTk0NTg0M30.fdnwquIdz0TfydtHIPCdzNX3lBWGF5ysnWlmlquEArg'
);

async function testInsert() {
  const { data: admin } = await supabase.from('profiles').select('id').eq('email', 'h_ojeda19@hotmail.es').single();
  const { data: clients } = await supabase.from('profiles').select('id, email').neq('id', admin.id).limit(1);
  
  if (clients.length > 0) {
    const client = clients[0];
    console.log(`Testing insert for client: ${client.email}`);
    const { data, error } = await supabase
      .from('chats')
      .insert([{
        client_id: client.id,
        admin_id: admin.id,
        last_message: 'Test message'
      }])
      .select();
    
    if (error) console.error('INSERT ERROR:', error);
    else console.log('INSERT SUCCESS:', data);
  }
}

testInsert();
