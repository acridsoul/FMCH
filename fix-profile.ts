import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as readline from 'readline'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve)
  })
}

async function fixProfile() {
  console.log('🔧 Profile Fix Script\n')
  console.log('This script will create your missing profile in the database.\n')

  const email = await question('Enter your email: ')
  const password = await question('Enter your password: ')
  const fullName = await question('Enter your full name: ')
  const role = await question('Enter your role (admin/department_head/crew): ')

  console.log('\n🔐 Attempting to sign in...')

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (authError) {
    console.error('❌ Login failed:', authError.message)
    console.log('\nPlease check:')
    console.log('1. Email is correct')
    console.log('2. Password is correct')
    console.log('3. Email is confirmed in Supabase')
    rl.close()
    return
  }

  console.log('✅ Login successful!')
  console.log('   User ID:', authData.user?.id)

  // Check if profile exists
  const { data: existingProfile, error: checkError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user!.id)
    .maybeSingle()

  if (existingProfile) {
    console.log('\n✅ Profile already exists:')
    console.log('   Name:', existingProfile.full_name)
    console.log('   Role:', existingProfile.role)
    console.log('\nYou should be able to log in now!')
    await supabase.auth.signOut()
    rl.close()
    return
  }

  console.log('\n📝 Creating profile...')

  const { data: newProfile, error: createError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user!.id,
      email: authData.user!.email!,
      full_name: fullName || 'User',
      role: role || 'crew',
    })
    .select()
    .single()

  if (createError) {
    console.error('❌ Failed to create profile:', createError.message)
    console.log('\nPossible issues:')
    console.log('1. RLS policies are blocking the insert')
    console.log('2. Invalid role (must be: admin, department_head, or crew)')
    console.log('\nPlease check your Supabase RLS policies.')
  } else {
    console.log('✅ Profile created successfully!')
    console.log('   ID:', newProfile.id)
    console.log('   Email:', newProfile.email)
    console.log('   Name:', newProfile.full_name)
    console.log('   Role:', newProfile.role)
    console.log('\n🎉 You can now log in to the app!')
  }

  await supabase.auth.signOut()
  rl.close()
}

fixProfile().catch(console.error)
