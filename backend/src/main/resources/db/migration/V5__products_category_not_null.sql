-- Databases built by Hibernate before Flyway (production among them) left products.category
-- nullable and without its check constraint; V1 has both. Bring those databases into line.
-- On a database created by V1 this changes nothing.
UPDATE public.products SET category = 'OTHER' WHERE category IS NULL;
ALTER TABLE public.products ALTER COLUMN category SET NOT NULL;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_check;
ALTER TABLE public.products ADD CONSTRAINT products_category_check
    CHECK (((category)::text = ANY ((ARRAY['FAST_FOOD'::character varying, 'GROCERY'::character varying, 'CLOTHING'::character varying, 'SERVICES'::character varying, 'CRAFTS'::character varying, 'AGRI'::character varying, 'ELECTRONICS'::character varying, 'OTHER'::character varying])::text[])));
