import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!')
  console.log('Make sure .env.local exists with:')
  console.log('  NEXT_PUBLIC_SUPABASE_URL=...')
  console.log('  NEXT_PUBLIC_SUPABASE_ANON_KEY=...')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkProfiles() {
  console.log('🔍 Checking all profiles in database...\n')

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')

  if (error) {
    console.error('❌ Error fetching profiles:', error.message)
    console.log('\nPossible issues:')
    console.log('1. RLS policies might be blocking access')
    console.log('2. Table might not exist')
    console.log('3. Check if you ran the migrations in Supabase')
    return
  }

  console.log(`Found ${profiles.length} profile(s):\n`)
  profiles.forEach((profile, index) => {
    console.log(`Profile ${index + 1}:`)
    console.log('  ID:', profile.id)
    console.log('  Email:', profile.email)
    console.log('  Name:', profile.full_name)
    console.log('  Role:', profile.role)
    console.log('  Created:', profile.created_at)
    console.log('')
  })

  // Check auth users
  console.log('\n🔍 Checking authenticated users...\n')

  // Note: We can't query auth.users directly with anon key
  // But we can check if we can authenticate
  const testEmail = 'creative4research@gmail.com'
  console.log(`Looking for profile with email: ${testEmail}`)

  const { data: specificProfile, error: specificError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', testEmail)
    .maybeSingle()

  if (specificError) {
    console.error('❌ Error:', specificError.message)
  } else if (!specificProfile) {
    console.log('❌ No profile found for', testEmail)
    console.log('\n⚠️  This is the problem! The profile was not created during signup.')
    console.log('\nSolution: Run the debug-auth.ts script to create the profile manually.')
  } else {
    console.log('✅ Profile found:', specificProfile)
  }
}

checkProfiles()
