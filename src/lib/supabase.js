import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// ── Plans ──────────────────────────────────────────────────────────────────────

export async function dbLoadPlans(userId) {
  const { data, error } = await supabase
    .from('plans')
    .select('data')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(row => row.data);
}

export async function dbSavePlan(plan, userId) {
  const { error } = await supabase
    .from('plans')
    .upsert({ id: plan.id, user_id: userId, data: plan, updated_at: new Date().toISOString() });
  if (error) throw error;
}

export async function dbSavePlans(plans, userId) {
  const rows = plans.map(p => ({ id: p.id, user_id: userId, data: p, updated_at: new Date().toISOString() }));
  const { error } = await supabase.from('plans').upsert(rows);
  if (error) throw error;
}

export async function dbDeletePlan(planId, userId) {
  const { error } = await supabase
    .from('plans')
    .delete()
    .eq('id', planId)
    .eq('user_id', userId);
  if (error) throw error;
}

// ── Settings ───────────────────────────────────────────────────────────────────

export async function dbLoadSettings(userId) {
  const { data, error } = await supabase
    .from('settings')
    .select('data')
    .eq('user_id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
  return data?.data || null;
}

export async function dbSaveSettings(settings, userId) {
  const { error } = await supabase
    .from('settings')
    .upsert({ user_id: userId, data: settings, updated_at: new Date().toISOString() });
  if (error) throw error;
}
