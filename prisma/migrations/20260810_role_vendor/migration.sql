-- Postgres will not let a newly added enum value be used in the same
-- transaction that adds it, so this lands in its own migration ahead of the
-- column that references it.
ALTER TYPE "Role" ADD VALUE 'VENDOR';
