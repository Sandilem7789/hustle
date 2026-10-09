-- Platform plan P1.1 step A: account fields and a direct shop-owner link.
-- Additive only: no existing column changes meaning and nothing is deleted.

-- D11: sellers and drivers must be 18 or older, so the account needs a date of birth.
ALTER TABLE public.app_users ADD COLUMN date_of_birth date;

-- D12: Community Agents (and drivers) verify and work nearest to where they live.
ALTER TABLE public.app_users ADD COLUMN home_latitude double precision;
ALTER TABLE public.app_users ADD COLUMN home_longitude double precision;

-- D19: Hub Coordinators are assigned the communities they work in; staff can change them.
CREATE TABLE public.app_user_communities (
    app_user_id uuid NOT NULL REFERENCES public.app_users(id),
    community_id uuid NOT NULL REFERENCES public.communities(id),
    PRIMARY KEY (app_user_id, community_id)
);

-- D3: a shop is owned by an account directly, instead of being reached through
-- application -> phone -> account. Backfilled where the owner can be found today;
-- the rest are linked when legacy accounts are migrated (P1.3).
ALTER TABLE public.business_profiles ADD COLUMN owner_id uuid REFERENCES public.app_users(id);
CREATE INDEX business_profiles_owner_id_idx ON public.business_profiles (owner_id);

UPDATE public.business_profiles bp
SET owner_id = COALESCE(ha.app_user_id, au.id)
FROM public.hustler_applications ha
LEFT JOIN public.app_users au ON au.phone = ha.phone
WHERE ha.id = bp.application_id
  AND COALESCE(ha.app_user_id, au.id) IS NOT NULL;

-- Not yet enforced in the database, because existing data breaks both rules
-- (one account owns three duplicate test shops; two emails are shared by two accounts):
--   one shop per account, and a unique email per account.
-- The service layer refuses new duplicates now; P1.3 cleans up and adds the constraints.
