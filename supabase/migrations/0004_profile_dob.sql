-- Date of birth is collected at sign-up and belongs to the account, not the
-- tracker. Mirrored from user metadata by the auth trigger like name and role.
alter table profiles add column if not exists date_of_birth date;

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profiles (id, email, full_name, role, shopify_customer_id, date_of_birth)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'customer'),
    new.raw_user_meta_data ->> 'shopify_customer_id',
    nullif(new.raw_user_meta_data ->> 'date_of_birth', '')::date
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
