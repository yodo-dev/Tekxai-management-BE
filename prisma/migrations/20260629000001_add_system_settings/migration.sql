CREATE TABLE IF NOT EXISTS "system_settings" (
    "key"        TEXT NOT NULL,
    "value"      TEXT NOT NULL,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

INSERT INTO "system_settings" ("key", "value", "updated_at") VALUES ('screenshot_interval_minutes', '10', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
