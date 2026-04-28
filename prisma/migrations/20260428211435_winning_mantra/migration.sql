-- AlterTable
ALTER TABLE "meta_integrations" ADD COLUMN     "winning_formula" JSONB,
ADD COLUMN     "winning_formula_built_at" TIMESTAMPTZ(3);
