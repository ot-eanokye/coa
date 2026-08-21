-- Carry the product code onto each batch so it flows to the Certificate of Analysis.
alter table public.batches add column if not exists code text;
