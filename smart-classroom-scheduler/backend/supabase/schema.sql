-- Smart Classroom Scheduler — Supabase schema (Postgres + RLS)
-- Run this in Supabase SQL Editor. Assumes Supabase Auth is used for login,
-- and a "profiles" table extends auth.users with role/institution info.

-- 1. PROFILES (extends Supabase auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null check (role in ('ADMIN','FACULTY','STUDENT')) default 'STUDENT',
  department_id uuid,
  faculty_id uuid,
  student_group_id uuid,
  avatar_url text,
  created_at timestamptz default now()
);

-- 2. DEPARTMENTS
create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  head_of_department text
);

-- 3. STUDENT GROUPS
create table if not exists student_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  department_id uuid references departments(id) on delete cascade,
  course text not null,
  semester int not null,
  section text not null,
  student_count int not null default 0
);

-- 4. CLASSROOMS
create table if not exists classrooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  building text not null,
  capacity int not null,
  room_type text not null check (room_type in ('Lecture Room','Computer Lab','Electronics Lab','Seminar Hall')),
  status text not null default 'Available'
);

-- 5. FACULTY
create table if not exists faculty (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id) on delete set null,
  name text not null,
  employee_id text unique,
  department_id uuid references departments(id) on delete cascade,
  email text not null,
  max_classes_per_day int default 4,
  max_classes_per_week int default 16,
  available_days text[] default array['Monday','Tuesday','Wednesday','Thursday','Friday'],
  available_slots jsonb default '{}'::jsonb
);

-- 6. SUBJECTS
create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  department_id uuid references departments(id) on delete cascade,
  faculty_id uuid references faculty(id) on delete set null,
  sessions_per_week int not null default 3,
  session_duration_hours int not null default 1,
  room_requirement text not null,
  lab_required boolean default false,
  student_group_ids uuid[] default '{}'
);

-- 7. TIMETABLES (each generated option / published schedule)
create table if not exists timetables (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  option_type text,
  department_id uuid references departments(id) on delete cascade,
  semester int,
  academic_year text,
  status text not null default 'Draft' check (status in ('Draft','Pending Approval','Approved','Published')),
  optimization_score numeric,
  constraint_metrics jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 8. TIMETABLE SLOTS
create table if not exists timetable_slots (
  id uuid primary key default gen_random_uuid(),
  timetable_id uuid references timetables(id) on delete cascade,
  day text not null,
  time_slot text not null,
  subject_id uuid references subjects(id),
  faculty_id uuid references faculty(id),
  classroom_id uuid references classrooms(id),
  student_group_id uuid references student_groups(id),
  is_lab boolean default false
);

-- 9. RESCHEDULE REQUESTS
create table if not exists reschedule_requests (
  id uuid primary key default gen_random_uuid(),
  faculty_id uuid references faculty(id),
  reason text,
  date date,
  affected_slots jsonb default '[]'::jsonb,
  suggested_replacements jsonb default '[]'::jsonb,
  status text default 'Pending' check (status in ('Pending','Approved','Rejected')),
  created_at timestamptz default now()
);

-- 10. NOTIFICATIONS
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  target_role text,
  title text not null,
  message text not null,
  type text default 'info',
  read boolean default false,
  created_at timestamptz default now()
);

-- 11. FACULTY EVALUATIONS (for the recommendation engine, replaces the CSV)
create table if not exists faculty_evaluations (
  id uuid primary key default gen_random_uuid(),
  faculty_name text not null,
  subject text,
  overall numeric,
  metadata jsonb default '{}'::jsonb
);

-- ── ROW LEVEL SECURITY ──────────────────────────────────────────────────────
alter table profiles enable row level security;
alter table timetables enable row level security;
alter table timetable_slots enable row level security;
alter table notifications enable row level security;
alter table reschedule_requests enable row level security;
alter table faculty enable row level security;
alter table subjects enable row level security;
alter table classrooms enable row level security;
alter table student_groups enable row level security;
alter table departments enable row level security;

-- Helper: read own role
create or replace function public.current_role() returns text as $$
  select role from profiles where id = auth.uid();
$$ language sql stable security definer;

-- Everyone authenticated can read reference data (rooms, subjects, faculty, depts)
create policy "read_all_authenticated" on departments for select using (auth.role() = 'authenticated');
create policy "read_all_authenticated" on classrooms for select using (auth.role() = 'authenticated');
create policy "read_all_authenticated" on subjects for select using (auth.role() = 'authenticated');
create policy "read_all_authenticated" on faculty for select using (auth.role() = 'authenticated');
create policy "read_all_authenticated" on student_groups for select using (auth.role() = 'authenticated');
create policy "read_published_timetables" on timetables for select using (
  status = 'Published' or public.current_role() = 'ADMIN'
);
create policy "read_slots" on timetable_slots for select using (auth.role() = 'authenticated');

-- Only ADMIN can write reference/scheduling data
create policy "admin_write_departments" on departments for all using (public.current_role() = 'ADMIN');
create policy "admin_write_classrooms" on classrooms for all using (public.current_role() = 'ADMIN');
create policy "admin_write_subjects" on subjects for all using (public.current_role() = 'ADMIN');
create policy "admin_write_faculty" on faculty for all using (public.current_role() = 'ADMIN');
create policy "admin_write_student_groups" on student_groups for all using (public.current_role() = 'ADMIN');
create policy "admin_write_timetables" on timetables for all using (public.current_role() = 'ADMIN');
create policy "admin_write_slots" on timetable_slots for all using (public.current_role() = 'ADMIN');

-- Users see their own profile + notifications, admins see everyone's
create policy "own_profile" on profiles for select using (id = auth.uid() or public.current_role() = 'ADMIN');
create policy "own_profile_update" on profiles for update using (id = auth.uid());
create policy "own_notifications" on notifications for select using (
  user_id = auth.uid() or target_role = 'ALL' or target_role = public.current_role() or public.current_role() = 'ADMIN'
);

-- Faculty can create/see their own reschedule requests; admin sees/approves all
create policy "faculty_own_reschedule" on reschedule_requests for select using (
  public.current_role() = 'ADMIN' or
  faculty_id = (select id from faculty where profile_id = auth.uid())
);
create policy "faculty_create_reschedule" on reschedule_requests for insert with check (auth.role() = 'authenticated');
create policy "admin_update_reschedule" on reschedule_requests for update using (public.current_role() = 'ADMIN');

-- Auto-create a profile row whenever a new auth user signs up
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email,
          coalesce(new.raw_user_meta_data->>'role', 'STUDENT'));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
