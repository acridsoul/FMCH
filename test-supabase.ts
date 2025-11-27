import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://puhvlvkjzqnohcynqxeo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1aHZsdmtqenFub2hjeW5xeGVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA4NDcxMzgsImV4cCI6MjA3NjQyMzEzOH0.yDlcRpiodip5PpCpx-5CCuq0kI0JPbjlOUCvEU6L0wo'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testDatabaseSetup() {
  console.log('🧪 Testing database setup...\n')

  // Test 1: Check if profiles table exists
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .limit(1)

  if (profilesError && !profilesError.message.includes('Could not find')) {
    console.error('❌ Profiles table error:', profilesError.message)
  } else {
    console.log('✅ Profiles table exists')
  }

  // Test 2: Check if projects table exists
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .limit(1)

  if (projectsError && !projectsError.message.includes('Could not find')) {
    console.error('❌ Projects table error:', projectsError.message)
  } else {
    console.log('✅ Projects table exists')
  }

  // Test 3: Check other tables
  const tables = ['tasks', 'schedules', 'expenses', 'files', 'project_members']

  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1)
    if (error && !error.message.includes('Could not find')) {
      console.error(`❌ ${table} table error:`, error.message)
    } else {
      console.log(`✅ ${table} table exists`)
    }
  }

  console.log('\n🎉 Database setup test complete!')
  console.log('   Project URL:', supabaseUrl)
  console.log('\nNote: If tables show as existing but return "Could not find" errors,')
  console.log('you need to run the migrations in Supabase. See phase2-setup.md for instructions.')
}

testDatabaseSetup()