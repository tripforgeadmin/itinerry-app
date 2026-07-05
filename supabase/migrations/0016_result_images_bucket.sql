-- 0016: public bucket for customer result images (LINE image messages need public HTTPS URLs)
insert into storage.buckets (id, name, public)
values ('result-images', 'result-images', true)
on conflict (id) do nothing;
