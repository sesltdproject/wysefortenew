-- Backfill the two existing admin transactions with created_by column
-- Setting them to the first admin user found in the system

UPDATE public.transactions
SET created_by = '62373aa2-ee3d-4716-bc9c-0a016cb15892'
WHERE id IN (
  'f697a1ba-2b3f-45bb-bf39-f94f8b28ee66',
  'b56d2b67-a97d-40c1-9b5f-c6698aa71601'
);