-- Prisma migration for Hustle Economy schema
CREATE TYPE "Role" AS ENUM ('HUSTLER', 'FACILITATOR', 'ADMIN');
CREATE TYPE "ApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "User" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "email" TEXT NOT NULL UNIQUE,
  "phone" TEXT,
  "passwordHash" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'HUSTLER',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "Community" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL UNIQUE,
  "region" TEXT,
  "description" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "CommunityFacilitator" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "communityId" UUID NOT NULL REFERENCES "Community"("id") ON DELETE CASCADE,
  "facilitatorId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "assignedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT community_facilitator_unique UNIQUE ("communityId", "facilitatorId")
);

CREATE TABLE "HustlerApplication" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "communityId" UUID REFERENCES "Community"("id") ON DELETE SET NULL,
  "businessName" TEXT NOT NULL,
  "businessType" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "vision" TEXT NOT NULL,
  "mission" TEXT NOT NULL,
  "targetCustomers" TEXT NOT NULL,
  "operatingArea" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
  "facilitatorNotes" TEXT,
  "submittedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "decidedAt" TIMESTAMPTZ,
  "facilitatorId" UUID REFERENCES "User"("id") ON DELETE SET NULL
);

CREATE INDEX "HustlerApplication_community_idx" ON "HustlerApplication"("communityId");

CREATE TABLE "BusinessProfile" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "ownerId" UUID REFERENCES "User"("id") ON DELETE SET NULL,
  "applicationId" UUID UNIQUE REFERENCES "HustlerApplication"("id") ON DELETE SET NULL,
  "communityId" UUID NOT NULL REFERENCES "Community"("id") ON DELETE CASCADE,
  "businessName" TEXT NOT NULL,
  "businessType" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "vision" TEXT NOT NULL,
  "mission" TEXT NOT NULL,
  "targetCustomers" TEXT NOT NULL,
  "operatingArea" TEXT NOT NULL,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "status" "ApplicationStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE "Product" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "businessId" UUID NOT NULL REFERENCES "BusinessProfile"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "price" DECIMAL(10,2) NOT NULL,
  "mediaUrl" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
