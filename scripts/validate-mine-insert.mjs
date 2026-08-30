import fs from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const env = {};
const raw = await fs.readFile('./.env.local', 'utf8');
for (const line of raw.split(/\r?\n/)) {
  if (!line || line.startsWith('#')) continue;
  const idx = line.indexOf('=');
  if (idx <= 0) continue;
  const key = line.slice(0, idx).trim();
  const value = line.slice(idx + 1).trim();
  env[key] = value;
}

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);
const email = `runtime.${Date.now()}@example.com`;
const password = 'TestPass123!';
const mineName = `Validated Mine ${Date.now()}`;

const signUp = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      full_name: 'Runtime Validation User',
      public_role: 'Mine Manager',
    },
  },
});

if (signUp.error) {
  console.error('SIGNUP_ERROR', signUp.error.message);
  process.exit(1);
}

const signedIn = await supabase.auth.signInWithPassword({ email, password });
if (signedIn.error) {
  console.error('SIGNIN_ERROR', signedIn.error.message);
  process.exit(1);
}

const orgResponse = await supabase.rpc('create_organization', {
  p_name: 'Runtime Validation Org',
  p_organization_type: 'Public Sector Undertaking',
  p_registration_number: `ORG-${Date.now()}`,
  p_country: 'India',
  p_state: 'Jharkhand',
  p_district: 'Dhanbad',
  p_address: 'Validated Address 1',
  p_contact_person_name: 'Runtime Validation User',
  p_contact_email: email,
  p_contact_phone: '9876543210',
  p_planned_mine_count: 2,
  p_description: 'Runtime validation org',
});

if (orgResponse.error) {
  console.error('CREATE_ORG_ERROR', orgResponse.error.message);
  process.exit(1);
}

const userOrgId = await supabase.rpc('current_user_organization_id');
const userRole = await supabase.rpc('current_user_role');

const insertResponse = await supabase.from('mines').insert({
  name: mineName,
  location: 'Dhanbad',
  state: 'Jharkhand',
  district: 'Dhanbad',
  operator_name: 'Runtime Operator',
  mine_type: 'Underground',
  status: 'active',
  organization_id: orgResponse.data?.id ?? userOrgId.data,
}).select('*').single();

if (insertResponse.error) {
  console.error('INSERT_ERROR', insertResponse.error.message);
  process.exit(1);
}

const profiles = await supabase.from('profiles').select('id, role, organization_id').eq('id', signedIn.data.user.id).single();
console.log(JSON.stringify({
  email,
  userId: signedIn.data.user.id,
  currentOrgId: userOrgId.data,
  currentRole: userRole.data,
  createdOrgId: orgResponse.data?.id,
  profileOrgId: profiles.data?.organization_id,
  profileRole: profiles.data?.role,
  insertedMine: {
    id: insertResponse.data.id,
    name: insertResponse.data.name,
    organization_id: insertResponse.data.organization_id,
  },
}, null, 2));
