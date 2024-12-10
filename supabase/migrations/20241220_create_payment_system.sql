-- Create payment_type enum
create type public.payment_type as enum ('course', 'reschedule');

-- Create enrollment status enum
create type public.enrollment_status as enum ('pending', 'active', 'completed', 'cancelled');

-- Create Payment table
create table public.payment (
    id uuid default gen_random_uuid() primary key,
    learner_id uuid references public."Learner"(id) not null,
    amount numeric(10,2) not null,
    email text not null,
    phone text not null,
    payment_type payment_type not null,
    status text not null default 'pending',
    gateway_reference text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Enrollment table
create table public.enrollment (
    id uuid default gen_random_uuid() primary key,
    learner_id uuid references public."Learner"(id) not null,
    course_id uuid references public."Course"(id) not null,
    payment_id uuid references public.payment(id),
    status enrollment_status not null default 'pending',
    progress jsonb default '{}' not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.payment enable row level security;
alter table public.enrollment enable row level security;

-- Create Payment policies
create policy "Learners can view their own payments"
    on public.payment for select
    using (learner_id in (
        select id from public."Learner" 
        where phone = auth.jwt()->>'phone'
    ));

create policy "Service role can manage payments"
    on public.payment for all
    to service_role
    with check (true);

-- Create Enrollment policies
create policy "Learners can view their own enrollments"
    on public.enrollment for select
    using (learner_id in (
        select id from public."Learner" 
        where phone = auth.jwt()->>'phone'
    ));

create policy "Service role can manage enrollments"
    on public.enrollment for all
    to service_role
    with check (true);

-- Create indexes
create index enrollment_learner_id_idx on public.enrollment(learner_id);
create index enrollment_course_id_idx on public.enrollment(course_id);
create index enrollment_payment_id_idx on public.enrollment(payment_id);
create index payment_learner_id_idx on public.payment(learner_id);

-- Create updated_at trigger function if not exists
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

-- Create triggers
create trigger handle_payments_updated_at
    before update on public.payment
    for each row
    execute procedure public.handle_updated_at();

create trigger handle_enrollment_updated_at
    before update on public.enrollment
    for each row
    execute procedure public.handle_updated_at(); 