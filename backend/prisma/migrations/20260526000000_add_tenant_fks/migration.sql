-- Add missing foreign-key constraints so a tenant deletion correctly
-- cascades to its denormalized child rows. Without these, deleting a
-- Tenant left orphaned Message and KnowledgeChunk rows in place, which
-- silently broke multi-tenant integrity.

ALTER TABLE "Message"
  ADD CONSTRAINT "Message_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "KnowledgeChunk"
  ADD CONSTRAINT "KnowledgeChunk_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
