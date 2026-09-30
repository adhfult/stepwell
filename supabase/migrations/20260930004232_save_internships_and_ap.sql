-- Save internships and AP classes to the plan (docs/specs/saved-plan.md).
-- Internship postings are replaced by every daily merge, so like scholarships
-- they have no foreign key and keep a title copy ("No longer listed").
-- AP courses are fixed seed data that is never deleted, so a key is safe.

alter table public.saved_items
  add column opportunity_id text
    constraint saved_items_opportunity_id_valid check (opportunity_id ~ '^\d{1,20}$'),
  add column ap_course_code text references public.ap_courses (code),
  add constraint saved_items_one_per_opportunity unique (user_id, opportunity_id),
  add constraint saved_items_one_per_ap_course unique (user_id, ap_course_code);

alter table public.saved_items drop constraint saved_items_exactly_one;
alter table public.saved_items
  add constraint saved_items_exactly_one
    check (num_nonnulls(onet_code, scholarship_id, unitid, opportunity_id, ap_course_code) = 1);

grant insert (onet_code, scholarship_id, unitid, opportunity_id, ap_course_code, title)
  on table public.saved_items to authenticated;
