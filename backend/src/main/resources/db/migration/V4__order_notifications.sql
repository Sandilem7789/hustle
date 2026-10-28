ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
    CHECK (((type)::text = ANY ((ARRAY['SURVEY_ASSIGNED'::character varying, 'APPLICATION_REVIEWED'::character varying, 'ORDER'::character varying, 'OTHER'::character varying])::text[])));
