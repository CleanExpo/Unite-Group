-- Teardown — reverses the entire spine. Used by CI before a clean rebuild.
-- Safe + idempotent (if exists). NEVER run against production.
drop schema if exists core, marketing, leadgen, onboarding, nrpg, carsi, field, sales cascade;
