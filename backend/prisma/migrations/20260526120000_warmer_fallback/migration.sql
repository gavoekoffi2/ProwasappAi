-- Warmer default for the AI fallback message. We also update existing
-- AiConfig rows that still hold the previous, more clinical phrasing so
-- live customers see the new wording immediately.

ALTER TABLE "AiConfig"
  ALTER COLUMN "fallbackMessage"
  SET DEFAULT 'Bonne question 🙏 Je vérifie cette information avec notre équipe et je reviens vers vous très vite.';

UPDATE "AiConfig"
   SET "fallbackMessage" = 'Bonne question 🙏 Je vérifie cette information avec notre équipe et je reviens vers vous très vite.'
 WHERE "fallbackMessage" = 'Un agent va vous répondre sous peu.';
