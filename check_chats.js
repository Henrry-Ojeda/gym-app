import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kkyblmiyuvrcqgbesavx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreWJsbWl5dXZyY3FnYmVzYXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNjk4NDMsImV4cCI6MjA4NTk0NTg0M30.fdnwquIdz0TfydtHIPCdzNX3lBWGF5ysnWlmlquEArg'
);

async function checkChats() {
  const { data: chats, error } = await supabase
    .from('chats')
    .select('*, client:client_id(email), admin:admin_id(email)');
  
  console.log('CHATS IN DB:', JSON.stringify(chats, null, 2));
  if (error) console.error('ERROR:', error);
}

checkChats();
