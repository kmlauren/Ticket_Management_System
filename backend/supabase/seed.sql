insert into public.departments (name, email, status)
values
  ('Network & Infrastructure', 'network@helpdesk.edu', 'active'),
  ('Systems & Applications', 'systems@helpdesk.edu', 'active'),
  ('Hardware Support', 'hardware@helpdesk.edu', 'at_capacity')
on conflict (name) do update
set email = excluded.email,
    status = excluded.status;

insert into public.categories (name, description, department_id, is_active)
select values_to_seed.name,
       values_to_seed.description,
       departments.id,
       true
from (
  values
    ('Hardware', 'Physical device issues including computers, monitors, peripherals, and printers.', 'Hardware Support'),
    ('Software', 'Application installation, activation, and software-related issues.', 'Systems & Applications'),
    ('Network / Connectivity', 'Wi-Fi, ethernet, VPN, and internet connectivity problems.', 'Network & Infrastructure'),
    ('Account & Access', 'Password resets, account creation, and permission management.', 'Systems & Applications'),
    ('System / Application', 'Campus-wide systems, learning management, and web applications.', 'Systems & Applications'),
    ('Other', 'Requests that do not fit into any specific category.', 'Systems & Applications')
) as values_to_seed(name, description, department_name)
join public.departments on departments.name = values_to_seed.department_name
on conflict (name) do update
set description = excluded.description,
    department_id = excluded.department_id,
    is_active = excluded.is_active;
