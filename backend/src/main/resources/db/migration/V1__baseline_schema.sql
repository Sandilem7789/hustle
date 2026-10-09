-- Baseline: the schema Hibernate generated from the entities at commit 8d61a73 (2026-10-09).
-- Fresh databases run this. Databases that already existed (dev, production) are
-- baselined at version 1 by spring.flyway.baseline-on-migrate and never run it.

CREATE TABLE public.app_user_roles (
    user_id uuid NOT NULL,
    role character varying(255),
    CONSTRAINT app_user_roles_role_check CHECK (((role)::text = ANY ((ARRAY['CUSTOMER'::character varying, 'HUSTLER'::character varying, 'DRIVER'::character varying, 'FACILITATOR'::character varying, 'COORDINATOR'::character varying])::text[])))
);

CREATE TABLE public.app_user_sessions (
    created_at timestamp(6) with time zone NOT NULL,
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token character varying(255) NOT NULL
);

CREATE TABLE public.app_users (
    created_at timestamp(6) with time zone NOT NULL,
    id uuid NOT NULL,
    email character varying(255),
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    phone character varying(255) NOT NULL
);

CREATE TABLE public.applicants (
    age integer,
    age_flag boolean NOT NULL,
    cohort_number integer NOT NULL,
    activated_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone NOT NULL,
    updated_at timestamp(6) with time zone,
    community_id uuid NOT NULL,
    id uuid NOT NULL,
    call_status character varying(255) NOT NULL,
    captured_by character varying(255),
    district_section character varying(255),
    email character varying(255),
    first_name character varying(255) NOT NULL,
    gender character varying(255),
    last_name character varying(255) NOT NULL,
    phone character varying(255) NOT NULL,
    pipeline_stage character varying(255) NOT NULL,
    rejection_reason character varying(255),
    type_of_hustle character varying(255) NOT NULL,
    CONSTRAINT applicants_call_status_check CHECK (((call_status)::text = ANY ((ARRAY['NOT_CALLED'::character varying, 'REACHED'::character varying, 'MISSED_CALL'::character varying, 'VOICEMAIL'::character varying])::text[]))),
    CONSTRAINT applicants_pipeline_stage_check CHECK (((pipeline_stage)::text = ANY ((ARRAY['CAPTURED'::character varying, 'CALLING'::character varying, 'INTERVIEW_SCHEDULED'::character varying, 'INTERVIEWED'::character varying, 'BUSINESS_VERIFICATION'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying])::text[])))
);

CREATE TABLE public.business_profiles (
    active boolean DEFAULT true NOT NULL,
    latitude double precision,
    longitude double precision,
    created_at timestamp(6) with time zone NOT NULL,
    updated_at timestamp(6) with time zone,
    application_id uuid,
    community_id uuid NOT NULL,
    id uuid NOT NULL,
    business_name character varying(255) NOT NULL,
    business_type character varying(255) NOT NULL,
    description text,
    mission text,
    operating_area character varying(255),
    status character varying(255),
    target_customers text,
    vision text,
    CONSTRAINT business_profiles_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying])::text[])))
);

CREATE TABLE public.business_verifications (
    latitude double precision,
    longitude double precision,
    visit_date date,
    created_at timestamp(6) with time zone NOT NULL,
    updated_at timestamp(6) with time zone,
    applicant_id uuid NOT NULL,
    id uuid NOT NULL,
    notes text,
    outcome character varying(255),
    verified_by character varying(255),
    CONSTRAINT business_verifications_outcome_check CHECK (((outcome)::text = ANY ((ARRAY['VERIFIED'::character varying, 'FAILED'::character varying])::text[])))
);

CREATE TABLE public.check_in_photos (
    check_in_id uuid NOT NULL,
    photo_url character varying(255)
);

CREATE TABLE public.communities (
    latitude double precision,
    longitude double precision,
    id uuid NOT NULL,
    description text,
    name character varying(255) NOT NULL,
    province character varying(255),
    region character varying(255)
);

CREATE TABLE public.customer_sessions (
    created_at timestamp(6) with time zone NOT NULL,
    customer_id uuid NOT NULL,
    id uuid NOT NULL,
    token character varying(255) NOT NULL
);

CREATE TABLE public.customers (
    created_at timestamp(6) with time zone NOT NULL,
    id uuid NOT NULL,
    email character varying(255),
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    phone character varying(255) NOT NULL
);

CREATE TABLE public.delivery_jobs (
    payout_amount numeric(12,2),
    accepted_at timestamp(6) with time zone,
    created_at timestamp(6) with time zone NOT NULL,
    delivered_at timestamp(6) with time zone,
    driver_id uuid,
    id uuid NOT NULL,
    order_id uuid NOT NULL,
    proof_photo_url character varying(255),
    status character varying(255) NOT NULL,
    CONSTRAINT delivery_jobs_status_check CHECK (((status)::text = ANY ((ARRAY['OPEN'::character varying, 'ASSIGNED'::character varying, 'PICKED_UP'::character varying, 'EN_ROUTE'::character varying, 'DELIVERED'::character varying, 'CANCELLED'::character varying])::text[])))
);

CREATE TABLE public.driver_sessions (
    created_at timestamp(6) with time zone NOT NULL,
    driver_id uuid NOT NULL,
    id uuid NOT NULL,
    token character varying(255) NOT NULL
);

CREATE TABLE public.drivers (
    created_at timestamp(6) with time zone NOT NULL,
    community_base_id uuid NOT NULL,
    id uuid NOT NULL,
    first_name character varying(255) NOT NULL,
    id_number character varying(255),
    last_name character varying(255) NOT NULL,
    licence_photo_url character varying(255),
    password_hash character varying(255) NOT NULL,
    phone character varying(255) NOT NULL,
    status character varying(255) NOT NULL,
    vehicle_type character varying(255) NOT NULL,
    CONSTRAINT drivers_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'ACTIVE'::character varying, 'SUSPENDED'::character varying])::text[]))),
    CONSTRAINT drivers_vehicle_type_check CHECK (((vehicle_type)::text = ANY ((ARRAY['BAKKIE'::character varying, 'MOTORBIKE'::character varying, 'CAR'::character varying, 'BICYCLE'::character varying])::text[])))
);

CREATE TABLE public.hustler_applications (
    latitude double precision,
    longitude double precision,
    decided_at timestamp(6) with time zone,
    submitted_at timestamp(6) with time zone NOT NULL,
    app_user_id uuid,
    community_id uuid,
    id uuid NOT NULL,
    business_name character varying(255) NOT NULL,
    business_type character varying(255) NOT NULL,
    description text,
    email character varying(255),
    facilitator_notes text,
    first_name character varying(255) NOT NULL,
    id_number character varying(255),
    last_name character varying(255) NOT NULL,
    mission text,
    operating_area character varying(255),
    password_hash character varying(255),
    phone character varying(255),
    role character varying(255),
    status character varying(255) NOT NULL,
    target_customers text,
    vision text,
    CONSTRAINT hustler_applications_role_check CHECK (((role)::text = ANY ((ARRAY['HUSTLER'::character varying, 'FACILITATOR'::character varying, 'COORDINATOR'::character varying])::text[]))),
    CONSTRAINT hustler_applications_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying])::text[])))
);

CREATE TABLE public.hustler_sessions (
    created_at timestamp(6) with time zone NOT NULL,
    business_profile_id uuid NOT NULL,
    id uuid NOT NULL,
    token character varying(255) NOT NULL
);

CREATE TABLE public.income_entries (
    amount numeric(12,2) NOT NULL,
    date date NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    business_profile_id uuid NOT NULL,
    id uuid NOT NULL,
    category character varying(255),
    channel character varying(255) NOT NULL,
    entry_type character varying(255),
    notes text,
    CONSTRAINT income_entries_entry_type_check CHECK (((entry_type)::text = ANY ((ARRAY['INCOME'::character varying, 'EXPENSE'::character varying])::text[])))
);

CREATE TABLE public.interviews (
    appears_genuine boolean,
    can_describe_business boolean,
    conducted_date date,
    has_running_business boolean,
    scheduled_date date,
    created_at timestamp(6) with time zone NOT NULL,
    updated_at timestamp(6) with time zone,
    applicant_id uuid NOT NULL,
    id uuid NOT NULL,
    conducted_by character varying(255),
    notes text,
    outcome character varying(255),
    CONSTRAINT interviews_outcome_check CHECK (((outcome)::text = ANY ((ARRAY['PASS'::character varying, 'FAIL'::character varying, 'NO_SHOW'::character varying])::text[])))
);

CREATE TABLE public.monthly_check_ins (
    created_at timestamp(6) with time zone NOT NULL,
    business_profile_id uuid NOT NULL,
    id uuid NOT NULL,
    notes text,
    visit_month character varying(255) NOT NULL,
    visited_by character varying(255)
);

CREATE TABLE public.notifications (
    read boolean DEFAULT false NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    business_profile_id uuid NOT NULL,
    id uuid NOT NULL,
    body text,
    link_path character varying(255),
    title character varying(255) NOT NULL,
    type character varying(255) NOT NULL,
    CONSTRAINT notifications_type_check CHECK (((type)::text = ANY ((ARRAY['SURVEY_ASSIGNED'::character varying, 'APPLICATION_REVIEWED'::character varying, 'OTHER'::character varying])::text[])))
);

CREATE TABLE public.order_items (
    quantity integer NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    id uuid NOT NULL,
    order_id uuid NOT NULL,
    product_id uuid,
    product_name character varying(255) NOT NULL
);

CREATE TABLE public.orders (
    delivery_lat double precision,
    delivery_lng double precision,
    total_amount numeric(12,2),
    created_at timestamp(6) with time zone NOT NULL,
    updated_at timestamp(6) with time zone,
    business_profile_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    id uuid NOT NULL,
    business_purchase_order_ref character varying(255),
    delivery_address text,
    fulfillment_type character varying(255) NOT NULL,
    pickup_token character varying(255),
    status character varying(255) NOT NULL,
    transaction_type character varying(255) NOT NULL,
    CONSTRAINT orders_fulfillment_type_check CHECK (((fulfillment_type)::text = ANY ((ARRAY['DELIVERY'::character varying, 'COLLECTION'::character varying])::text[]))),
    CONSTRAINT orders_status_check CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'CONFIRMED'::character varying, 'DRIVER_ASSIGNED'::character varying, 'EN_ROUTE'::character varying, 'DELIVERED'::character varying, 'COLLECTED'::character varying, 'CANCELLED'::character varying])::text[]))),
    CONSTRAINT orders_transaction_type_check CHECK (((transaction_type)::text = ANY ((ARRAY['B2C'::character varying, 'B2B'::character varying])::text[])))
);

CREATE TABLE public.products (
    price numeric(38,2) NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    updated_at timestamp(6) with time zone NOT NULL,
    business_id uuid NOT NULL,
    id uuid NOT NULL,
    barcode character varying(255),
    category character varying(255) NOT NULL,
    description text,
    media_url character varying(255),
    name character varying(255) NOT NULL,
    CONSTRAINT products_category_check CHECK (((category)::text = ANY ((ARRAY['FAST_FOOD'::character varying, 'GROCERY'::character varying, 'CLOTHING'::character varying, 'SERVICES'::character varying, 'CRAFTS'::character varying, 'AGRI'::character varying, 'ELECTRONICS'::character varying, 'OTHER'::character varying])::text[])))
);

CREATE TABLE public.sale_items (
    line_total numeric(12,2) NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(12,2) NOT NULL,
    id uuid NOT NULL,
    product_id uuid,
    sale_id uuid NOT NULL,
    item_name character varying(255) NOT NULL
);

CREATE TABLE public.sales (
    total_amount numeric(12,2) NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    sale_date timestamp(6) with time zone NOT NULL,
    business_profile_id uuid NOT NULL,
    id uuid NOT NULL
);

CREATE TABLE public.survey_answers (
    answered_at timestamp(6) with time zone NOT NULL,
    assignment_id uuid NOT NULL,
    id uuid NOT NULL,
    question_id uuid NOT NULL,
    answer_text text
);

CREATE TABLE public.survey_assignments (
    due_date date,
    assigned_at timestamp(6) with time zone NOT NULL,
    assigned_by_user_id uuid NOT NULL,
    business_profile_id uuid NOT NULL,
    id uuid NOT NULL,
    template_id uuid NOT NULL,
    financial_impact_json text,
    report_error character varying(255),
    report_status character varying(255),
    report_text text,
    status character varying(255) NOT NULL,
    CONSTRAINT survey_assignments_report_status_check CHECK (((report_status)::text = ANY ((ARRAY['PENDING'::character varying, 'READY'::character varying, 'FAILED'::character varying])::text[]))),
    CONSTRAINT survey_assignments_status_check CHECK (((status)::text = ANY ((ARRAY['ASSIGNED'::character varying, 'IN_PROGRESS'::character varying, 'SUBMITTED'::character varying, 'REVIEWED'::character varying])::text[])))
);

CREATE TABLE public.survey_questions (
    active boolean DEFAULT true NOT NULL,
    order_index integer NOT NULL,
    required boolean NOT NULL,
    id uuid NOT NULL,
    template_id uuid NOT NULL,
    field_key character varying(255) NOT NULL,
    help_text text,
    options text,
    question_text text NOT NULL,
    question_type character varying(255) NOT NULL,
    CONSTRAINT survey_questions_question_type_check CHECK (((question_type)::text = ANY ((ARRAY['TEXT'::character varying, 'TEXTAREA'::character varying, 'NUMBER'::character varying, 'DATE'::character varying, 'SINGLE_CHOICE'::character varying, 'MULTI_CHOICE'::character varying])::text[])))
);

CREATE TABLE public.survey_templates (
    active boolean DEFAULT true NOT NULL,
    created_at timestamp(6) with time zone NOT NULL,
    id uuid NOT NULL,
    description text,
    name character varying(255) NOT NULL,
    type character varying(255) NOT NULL,
    CONSTRAINT survey_templates_type_check CHECK (((type)::text = ANY ((ARRAY['BASELINE'::character varying, 'GROWTH_PLAN'::character varying, 'PROFILE'::character varying])::text[])))
);

CREATE TABLE public.verification_photos (
    verification_id uuid NOT NULL,
    photo_url character varying(255)
);

ALTER TABLE ONLY public.app_user_sessions
    ADD CONSTRAINT app_user_sessions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.app_user_sessions
    ADD CONSTRAINT app_user_sessions_token_key UNIQUE (token);

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_phone_key UNIQUE (phone);

ALTER TABLE ONLY public.app_users
    ADD CONSTRAINT app_users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.applicants
    ADD CONSTRAINT applicants_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.business_profiles
    ADD CONSTRAINT business_profiles_application_id_key UNIQUE (application_id);

ALTER TABLE ONLY public.business_profiles
    ADD CONSTRAINT business_profiles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.business_verifications
    ADD CONSTRAINT business_verifications_applicant_id_key UNIQUE (applicant_id);

ALTER TABLE ONLY public.business_verifications
    ADD CONSTRAINT business_verifications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.communities
    ADD CONSTRAINT communities_name_key UNIQUE (name);

ALTER TABLE ONLY public.communities
    ADD CONSTRAINT communities_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.customer_sessions
    ADD CONSTRAINT customer_sessions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.customer_sessions
    ADD CONSTRAINT customer_sessions_token_key UNIQUE (token);

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_phone_key UNIQUE (phone);

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.delivery_jobs
    ADD CONSTRAINT delivery_jobs_order_id_key UNIQUE (order_id);

ALTER TABLE ONLY public.delivery_jobs
    ADD CONSTRAINT delivery_jobs_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.driver_sessions
    ADD CONSTRAINT driver_sessions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.driver_sessions
    ADD CONSTRAINT driver_sessions_token_key UNIQUE (token);

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_phone_key UNIQUE (phone);

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.hustler_applications
    ADD CONSTRAINT hustler_applications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.hustler_sessions
    ADD CONSTRAINT hustler_sessions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.hustler_sessions
    ADD CONSTRAINT hustler_sessions_token_key UNIQUE (token);

ALTER TABLE ONLY public.income_entries
    ADD CONSTRAINT income_entries_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT interviews_applicant_id_key UNIQUE (applicant_id);

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT interviews_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.monthly_check_ins
    ADD CONSTRAINT monthly_check_ins_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pickup_token_key UNIQUE (pickup_token);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT sale_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.survey_answers
    ADD CONSTRAINT survey_answers_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.survey_assignments
    ADD CONSTRAINT survey_assignments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.survey_questions
    ADD CONSTRAINT survey_questions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.survey_templates
    ADD CONSTRAINT survey_templates_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.hustler_applications
    ADD CONSTRAINT fk1o4jtxcf4fktnbujkjyd4xt3t FOREIGN KEY (community_id) REFERENCES public.communities(id);

ALTER TABLE ONLY public.survey_questions
    ADD CONSTRAINT fk2wqi9sybuc5ax90w61197l62r FOREIGN KEY (template_id) REFERENCES public.survey_templates(id);

ALTER TABLE ONLY public.interviews
    ADD CONSTRAINT fk379kh0b6vfnnjvw7cii54kuh9 FOREIGN KEY (applicant_id) REFERENCES public.applicants(id);

ALTER TABLE ONLY public.delivery_jobs
    ADD CONSTRAINT fk411w8hj2xys4rdtvy57k2g0nl FOREIGN KEY (order_id) REFERENCES public.orders(id);

ALTER TABLE ONLY public.survey_assignments
    ADD CONSTRAINT fk4tbsmnyv9h80f3rlx4qff22b8 FOREIGN KEY (business_profile_id) REFERENCES public.business_profiles(id);

ALTER TABLE ONLY public.applicants
    ADD CONSTRAINT fk54d1eu5ut5p7pxuvo0hdpwmab FOREIGN KEY (community_id) REFERENCES public.communities(id);

ALTER TABLE ONLY public.survey_answers
    ADD CONSTRAINT fk6rra5rmbvxdn4cr6q06bqjhau FOREIGN KEY (assignment_id) REFERENCES public.survey_assignments(id);

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT fk7tcpbc5c5mpnm8fl2phl8ep7l FOREIGN KEY (sale_id) REFERENCES public.sales(id);

ALTER TABLE ONLY public.sale_items
    ADD CONSTRAINT fk8g0sjiqs7tg055o06p6wawu39 FOREIGN KEY (product_id) REFERENCES public.products(id);

ALTER TABLE ONLY public.delivery_jobs
    ADD CONSTRAINT fk9gl5f62yd9yo1xbnax7mj8rpp FOREIGN KEY (driver_id) REFERENCES public.drivers(id);

ALTER TABLE ONLY public.survey_assignments
    ADD CONSTRAINT fk9paw4dd50v6lykp8xbf5pcjt1 FOREIGN KEY (template_id) REFERENCES public.survey_templates(id);

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT fkbioxgbv59vetrxe0ejfubep1w FOREIGN KEY (order_id) REFERENCES public.orders(id);

ALTER TABLE ONLY public.hustler_sessions
    ADD CONSTRAINT fkcs8aojo7mp3dncl52ujn1fniu FOREIGN KEY (business_profile_id) REFERENCES public.business_profiles(id);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT fkdghkmgchs27o59usilijnbktg FOREIGN KEY (business_profile_id) REFERENCES public.business_profiles(id);

ALTER TABLE ONLY public.business_profiles
    ADD CONSTRAINT fkdrgql5wsgmet7ttgl3ac9oi0q FOREIGN KEY (community_id) REFERENCES public.communities(id);

ALTER TABLE ONLY public.hustler_applications
    ADD CONSTRAINT fke3n7hhxsjkiam8fgkm3g36eb7 FOREIGN KEY (app_user_id) REFERENCES public.app_users(id);

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT fkf118weay8ep092vmsdolrp963 FOREIGN KEY (business_profile_id) REFERENCES public.business_profiles(id);

ALTER TABLE ONLY public.business_profiles
    ADD CONSTRAINT fkg681okucf3x89njxbtmo6ogi5 FOREIGN KEY (application_id) REFERENCES public.hustler_applications(id);

ALTER TABLE ONLY public.app_user_sessions
    ADD CONSTRAINT fkgdknd28ouhhvidvj8dicmr9oh FOREIGN KEY (user_id) REFERENCES public.app_users(id);

ALTER TABLE ONLY public.survey_answers
    ADD CONSTRAINT fkgl5lld6jreh81eovnut8dtx5y FOREIGN KEY (question_id) REFERENCES public.survey_questions(id);

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT fkhwn7m53rx1q1novcfj34oth0w FOREIGN KEY (community_base_id) REFERENCES public.communities(id);

ALTER TABLE ONLY public.products
    ADD CONSTRAINT fkhwsjoq2kh6udvqv20qb9fqcmi FOREIGN KEY (business_id) REFERENCES public.business_profiles(id);

ALTER TABLE ONLY public.app_user_roles
    ADD CONSTRAINT fkjhld72ac4tj54kp371ixd1klk FOREIGN KEY (user_id) REFERENCES public.app_users(id);

ALTER TABLE ONLY public.business_verifications
    ADD CONSTRAINT fkkaoggu9jlqt73we82o8iv60b FOREIGN KEY (applicant_id) REFERENCES public.applicants(id);

ALTER TABLE ONLY public.check_in_photos
    ADD CONSTRAINT fkl6dg71t95i6vbhbpcwbhmpp1b FOREIGN KEY (check_in_id) REFERENCES public.monthly_check_ins(id);

ALTER TABLE ONLY public.income_entries
    ADD CONSTRAINT fkle35qbglc8t3syrhflocihlok FOREIGN KEY (business_profile_id) REFERENCES public.business_profiles(id);

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT fkm7wubp0jy4uyho95gckyyugqt FOREIGN KEY (business_profile_id) REFERENCES public.business_profiles(id);

ALTER TABLE ONLY public.customer_sessions
    ADD CONSTRAINT fkmc7fgrbk4ptta4vj1ht4b8sqm FOREIGN KEY (customer_id) REFERENCES public.customers(id);

ALTER TABLE ONLY public.monthly_check_ins
    ADD CONSTRAINT fkmdhelgplx93mcd8i0iehkc1h7 FOREIGN KEY (business_profile_id) REFERENCES public.business_profiles(id);

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT fkocimc7dtr037rh4ls4l95nlfi FOREIGN KEY (product_id) REFERENCES public.products(id);

ALTER TABLE ONLY public.verification_photos
    ADD CONSTRAINT fkpip6j8c571ndfkgx0tl0p7raq FOREIGN KEY (verification_id) REFERENCES public.business_verifications(id);

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT fkpxtb8awmi0dk6smoh2vp1litg FOREIGN KEY (customer_id) REFERENCES public.customers(id);

ALTER TABLE ONLY public.driver_sessions
    ADD CONSTRAINT fksh7jld51leva4295ylf81o7d0 FOREIGN KEY (driver_id) REFERENCES public.drivers(id);

