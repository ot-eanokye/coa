-- Support assay sub-tests: a spec/result row may hang under a parent test.
-- parent is null for a top-level test; for a sub-test it holds the parent test's name.
alter table public.product_specifications add column if not exists parent text;
alter table public.batch_results add column if not exists parent text;
