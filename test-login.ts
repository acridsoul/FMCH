import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
  console.log('🔐 Testing login flow...\n');

  // Test credentials
  const email = 'creative4research@gmail.com';
  const password = 'your-password-here'; // Replace with actual password

  try {
    // Step 1: Sign in
    console.log('Step 1: Signing in...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      console.error('❌ Auth Error:', authError.message);
      return;
    }

    console.log('✅ Sign in successful');
    console.log('User ID:', authData.user?.id);
    console.log('User Email:', authData.user?.email);
    console.log('Email Confirmed:', authData.user?.email_confirmed_at ? 'Yes' : 'No');
    console.log('');

    // Step 2: Fetch profile
    console.log('Step 2: Fetching profile...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user!.id)
      .single();

    if (profileError) {
      console.error('❌ Profile Error:', profileError.message);
      console.error('Error Details:', profileError);
      return;
    }

    if (!profile) {
      console.error('❌ No profile found for user:', authData.user!.id);
      return;
    }

    console.log('✅ Profile found:');
    console.log('  ID:', profile.id);
    console.log('  Email:', profile.email);
    console.log('  Full Name:', profile.full_name);
    console.log('  Role:', profile.role);
    console.log('  Created:', profile.created_at);
    console.log('');

    console.log('✅✅ All tests passed! Authentication flow is working correctly.');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testLogin();
