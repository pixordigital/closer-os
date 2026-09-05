-- Drop catalog tables removed from schema (Product, Proposal, Quota)
DROP TABLE IF EXISTS "public"."Product" CASCADE;
DROP TABLE IF EXISTS "public"."Proposal" CASCADE;
DROP TABLE IF EXISTS "public"."Quota" CASCADE;
-- Drop enums if they existed (none for these, but safe)
