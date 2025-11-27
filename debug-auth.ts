import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugAuth() {
  console.log('🔍 Debugging authentication issue...\n')

  // Test 1: Try to sign in
  console.log('Step 1: Attempting to sign in with your credentials...')
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'creative4research@gmail.com',
    password: process.argv[2] || 'your-password-here', // Pass password as argument
  })

  if (authError) {
    console.error('❌ Login error:', authError.message)
    return
  }

  console.log('✅ Login successful!')
  console.log('   User ID:', authData.user?.id)
  console.log('   Email:', authData.user?.email)

  // Test 2: Check if profile exists
  console.log('\nStep 2: Checking if profile exists...')
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user!.id)
    .single()

  if (profileError) {
    console.error('❌ Profile not found:', profileError.message)
    console.log('\n🔧 Creating profile manually...')

    // Create profile manually
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user!.id,
        email: authData.user!.email!,
        full_name: authData.user?.user_metadata?.full_name || 'User',
        role: authData.user?.user_metadata?.role || 'crew',
      })
      .select()
      .single()

    if (createError) {
      console.error('❌ Failed to create profile:', createError.message)
    } else {
      console.log('✅ Profile created successfully!')
      console.log('   Profile:', newProfile)
    }
  } else {
    console.log('✅ Profile exists!')
    console.log('   Profile:', profile)
  }

  // Sign out
  await supabase.auth.signOut()
  console.log('\n✅ Debug complete. Try logging in again.')
}

// Get password from command line argument
if (process.argv.length < 3) {
  console.log('Usage: npx tsx debug-auth.ts <your-password>')
  console.log('Example: npx tsx debug-auth.ts mypassword123')
  process.exit(1)
}

debugAuth()
