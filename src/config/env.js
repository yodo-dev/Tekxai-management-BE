import { config } from "dotenv";

const env = process.env.NODE_ENV || "development";
config({ path: `.env.${env}` });

const required = [
  "DATABASE_URL",
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
  "JWT_REFRESH_SECRET",
  "JWT_REFRESH_EXPIRES_IN",
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(", ")}`,
  );
}

function is_weak_secret(value = "") {
  const normalized = String(value).toLowerCase();
  const placeholder_words = ["change", "your_", "example", "secret", "dev_"];
  const contains_placeholder = placeholder_words.some((word) =>
    normalized.includes(word),
  );
  return value.length < 64 || contains_placeholder;
}

if (is_weak_secret(process.env.JWT_SECRET)) {
  throw new Error(
    "JWT_SECRET is weak. Use a high-entropy secret (recommended: openssl rand -hex 64).",
  );
}

if (is_weak_secret(process.env.JWT_REFRESH_SECRET)) {
  throw new Error(
    "JWT_REFRESH_SECRET is weak. Use a high-entropy secret (recommended: openssl rand -hex 64).",
  );
}

export const env_config = {
  env,
  port: Number(process.env.PORT || 4000),
  cors_origin: process.env.CORS_ORIGIN || "*",
  jwt_secret: process.env.JWT_SECRET,
  jwt_expires_in: process.env.JWT_EXPIRES_IN,
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET,
  jwt_refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN,
};
