import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kkyblmiyuvrcqgbesavx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreWJsbWl5dXZyY3FnYmVzYXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNjk4NDMsImV4cCI6MjA4NTk0NTg0M30.fdnwquIdz0TfydtHIPCdzNX3lBWGF5ysnWlmlquEArg'
);

async function checkIds() {
  const { data: levels } = await supabase.from('routine_levels').select('id, name');
  const { data: subs } = await supabase.from('subscriptions').select('id, name');
  
  console.log('LEVELS:', JSON.stringify(levels, null, 2));
  console.log('SUBSCRIPTIONS:', JSON.stringify(subs, null, 2));
}

checkIds();
