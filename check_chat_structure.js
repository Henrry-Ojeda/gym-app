import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://kkyblmiyuvrcqgbesavx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtreWJsbWl5dXZyY3FnYmVzYXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNjk4NDMsImV4cCI6MjA4NTk0NTg0M30.fdnwquIdz0TfydtHIPCdzNX3lBWGF5ysnWlmlquEArg'
);

async function checkChatCols() {
  const { data, error } = await supabase.from('chats').select('*').limit(1);
  if (error) {
     console.log('CHATS ERROR:', error);
  } else {
     console.log('CHATS COLUMNS:', data.length > 0 ? Object.keys(data[0]) : 'Empty table');
  }

  const { data: mData, error: mError } = await supabase.from('messages').select('*').limit(1);
  if (mError) {
     console.log('MESSAGES ERROR:', mError);
  } else {
     console.log('MESSAGES COLUMNS:', mData.length > 0 ? Object.keys(mData[0]) : 'Empty table');
  }
}

checkChatCols();
