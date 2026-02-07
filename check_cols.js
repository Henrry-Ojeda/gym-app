import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kkyblmiyuvrcqgbesavx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreWJsbWl5dXZyY3FnYmVzYXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNjk4NDMsImV4cCI6MjA4NTk0NTg0M30.fdnwquIdz0TfydtHIPCdzNX3lBWGF5ysnWlmlquEArg'
);

async function checkColumns() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  if (data && data.length > 0) {
    console.log('COLUMNS:', Object.keys(data[0]));
  } else {
    console.log('No data found in profiles');
  }
}

checkColumns();
