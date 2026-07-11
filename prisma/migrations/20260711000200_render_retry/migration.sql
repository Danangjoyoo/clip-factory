-- Add retry-of-render relationship for failed render retries.
ALTER TABLE "renders"
    ADD COLUMN "retry_of_render_id" UUID;

ALTER TABLE "renders"
    ADD CONSTRAINT "renders_retry_of_render_id_fkey"
    FOREIGN KEY ("retry_of_render_id")
    REFERENCES "renders"("id")
    ON DELETE SET NULL;

CREATE INDEX "renders_retry_of_render_id_idx"
    ON "renders"("retry_of_render_id");
