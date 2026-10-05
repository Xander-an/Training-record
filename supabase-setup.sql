-- =====================================================
-- 训练记录 · Supabase 初始化脚本
-- 用法：Supabase 控制台 → 左侧「SQL Editor」→ 新建查询 →
--       整段粘贴 → 点 Run 执行一次即可（可重复执行，脚本是幂等的）
-- =====================================================

-- 1) 用户档案表：用户名唯一，映射到一个合成邮箱（用于「用户名 + 密码」登录）
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- 登录时需要按用户名反查邮箱，因此允许匿名读取（用户名/合成邮箱非敏感信息）
drop policy if exists "profiles_public_read" on public.profiles;
create policy "profiles_public_read" on public.profiles
  for select using (true);

-- 每人只能创建/修改自己的档案
drop policy if exists "profiles_self_insert" on public.profiles;
create policy "profiles_self_insert" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_self_update" on public.profiles;
create policy "profiles_self_update" on public.profiles
  for update using (auth.uid() = id);

-- 2) 每用户数据表：整行存 data JSON（version + workouts + customExercises）
create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{"version":1,"workouts":[],"customExercises":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

-- 每人只能读/写自己的那一行，互不可见
drop policy if exists "user_data_self_select" on public.user_data;
create policy "user_data_self_select" on public.user_data
  for select using (auth.uid() = user_id);

drop policy if exists "user_data_self_insert" on public.user_data;
create policy "user_data_self_insert" on public.user_data
  for insert with check (auth.uid() = user_id);

drop policy if exists "user_data_self_update" on public.user_data;
create policy "user_data_self_update" on public.user_data
  for update using (auth.uid() = user_id);
