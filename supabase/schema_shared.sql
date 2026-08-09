-- ── Make plans shared across all authenticated users ──────────────────────────
-- Drop the old per-user policy
drop policy if exists "Users can manage their own plans" on plans;

-- New policy: any authenticated user can manage all plans
create policy "Authenticated users can manage all plans"
  on plans for all
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- ── Settings stay personal (each user keeps their own) ────────────────────────
-- No changes needed to settings table or its policy
