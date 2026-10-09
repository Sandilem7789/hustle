-- Remove duplicate shops and duplicate emails, then make both impossible (D3).
-- Every removed shop or email is written to data_cleanup_log first, so it can be traced
-- or restored by staff. Nothing attached to a shop is deleted: it is moved to the kept shop.

CREATE TABLE public.data_cleanup_log (
    id bigserial PRIMARY KEY,
    table_name character varying(64) NOT NULL,
    record_id uuid NOT NULL,
    detail text NOT NULL,
    cleaned_at timestamp(6) with time zone NOT NULL DEFAULT now()
);

-- ── Shops: one account may own one shop ─────────────────────────────────────
-- For an account owning several shops, keep the one with the most activity
-- (oldest on a tie) and fold the others into it.
CREATE TEMP TABLE shop_activity ON COMMIT DROP AS
SELECT bp.id, bp.owner_id, bp.created_at,
       (SELECT count(*) FROM public.products         t WHERE t.business_id = bp.id)
     + (SELECT count(*) FROM public.orders           t WHERE t.business_profile_id = bp.id)
     + (SELECT count(*) FROM public.income_entries   t WHERE t.business_profile_id = bp.id)
     + (SELECT count(*) FROM public.sales            t WHERE t.business_profile_id = bp.id)
     + (SELECT count(*) FROM public.notifications    t WHERE t.business_profile_id = bp.id)
     + (SELECT count(*) FROM public.survey_assignments t WHERE t.business_profile_id = bp.id)
     + (SELECT count(*) FROM public.monthly_check_ins t WHERE t.business_profile_id = bp.id) AS activity
FROM public.business_profiles bp
WHERE bp.owner_id IS NOT NULL;

CREATE TEMP TABLE shop_merge ON COMMIT DROP AS
SELECT id AS duplicate_id, keeper_id
FROM (SELECT id,
             first_value(id) OVER (PARTITION BY owner_id ORDER BY activity DESC, created_at ASC, id) AS keeper_id
      FROM shop_activity) ranked
WHERE id <> keeper_id;

INSERT INTO public.data_cleanup_log (table_name, record_id, detail)
SELECT 'business_profiles', bp.id,
       'Duplicate shop "' || bp.business_name || '" merged into ' || m.keeper_id
       || '; its application ' || coalesce(bp.application_id::text, 'none') || ' was kept'
FROM public.business_profiles bp JOIN shop_merge m ON m.duplicate_id = bp.id;

UPDATE public.products           t SET business_id = m.keeper_id         FROM shop_merge m WHERE t.business_id = m.duplicate_id;
UPDATE public.orders             t SET business_profile_id = m.keeper_id FROM shop_merge m WHERE t.business_profile_id = m.duplicate_id;
UPDATE public.income_entries     t SET business_profile_id = m.keeper_id FROM shop_merge m WHERE t.business_profile_id = m.duplicate_id;
UPDATE public.sales              t SET business_profile_id = m.keeper_id FROM shop_merge m WHERE t.business_profile_id = m.duplicate_id;
UPDATE public.notifications      t SET business_profile_id = m.keeper_id FROM shop_merge m WHERE t.business_profile_id = m.duplicate_id;
UPDATE public.survey_assignments t SET business_profile_id = m.keeper_id FROM shop_merge m WHERE t.business_profile_id = m.duplicate_id;
UPDATE public.monthly_check_ins  t SET business_profile_id = m.keeper_id FROM shop_merge m WHERE t.business_profile_id = m.duplicate_id;
UPDATE public.hustler_sessions   t SET business_profile_id = m.keeper_id FROM shop_merge m WHERE t.business_profile_id = m.duplicate_id;

DELETE FROM public.business_profiles bp USING shop_merge m WHERE bp.id = m.duplicate_id;

DROP INDEX public.business_profiles_owner_id_idx;
CREATE UNIQUE INDEX business_profiles_owner_id_key ON public.business_profiles (owner_id) WHERE owner_id IS NOT NULL;

-- ── Emails: optional, but unique when present ───────────────────────────────
UPDATE public.app_users SET email = trim(email) WHERE email <> trim(email);

-- Values without an @ are not emails (usually a phone number typed into the email box).
INSERT INTO public.data_cleanup_log (table_name, record_id, detail)
SELECT 'app_users', id, 'Removed email value that is not an email address: ' || email
FROM public.app_users
WHERE email IS NOT NULL AND (email = '' OR position('@' IN email) = 0);

UPDATE public.app_users SET email = NULL
WHERE email IS NOT NULL AND (email = '' OR position('@' IN email) = 0);

-- A shared email stays with the account that registered first.
CREATE TEMP TABLE email_losers ON COMMIT DROP AS
SELECT id, email
FROM (SELECT id, email,
             row_number() OVER (PARTITION BY lower(email) ORDER BY created_at, id) AS rn
      FROM public.app_users WHERE email IS NOT NULL) ranked
WHERE rn > 1;

INSERT INTO public.data_cleanup_log (table_name, record_id, detail)
SELECT 'app_users', id, 'Removed email shared with an older account: ' || email
FROM email_losers;

UPDATE public.app_users au SET email = NULL FROM email_losers l WHERE au.id = l.id;

CREATE UNIQUE INDEX app_users_email_key ON public.app_users (lower(email)) WHERE email IS NOT NULL;
