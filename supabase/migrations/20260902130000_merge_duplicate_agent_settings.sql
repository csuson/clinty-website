-- Revoke duplicate active api_keys that share the same key_hash.
-- Oldest registration wins; newer duplicates are revoked and unlinked from agent_settings.

WITH duplicate_hashes AS (
  SELECT key_hash
  FROM public.api_keys
  WHERE revoked_at IS NULL
  GROUP BY key_hash
  HAVING COUNT(*) > 1
),
ordered AS (
  SELECT
    a.*,
    ROW_NUMBER() OVER (
      PARTITION BY a.key_hash
      ORDER BY a.created_at ASC NULLS LAST
    ) AS rn
  FROM public.api_keys AS a
  INNER JOIN duplicate_hashes AS d ON d.key_hash = a.key_hash
  WHERE a.revoked_at IS NULL
),
revoked AS (
  DELETE FROM public.api_keys AS t
  USING ordered AS o
  WHERE t.id = o.id
    AND o.rn > 1
  RETURNING t.id
),
detached AS (
  UPDATE public.agent_settings AS s
  SET clinty_api_key_id = NULL
  FROM revoked AS r
  WHERE s.clinty_api_key_id = r.id
  RETURNING s.id
)
SELECT
  (SELECT COUNT(*) FROM revoked) AS keys_revoked,
  (SELECT COUNT(*) FROM detached) AS settings_detached;

CREATE UNIQUE INDEX IF NOT EXISTS api_keys_key_hash_active_unique
  ON public.api_keys (key_hash)
  WHERE revoked_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS agent_settings_clinty_api_key_id_unique
  ON public.agent_settings (clinty_api_key_id)
  WHERE clinty_api_key_id IS NOT NULL;
