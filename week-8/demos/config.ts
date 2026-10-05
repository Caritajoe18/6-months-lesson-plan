// config.ts
export const config = {
  accessSecret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret",
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? "dev-refresh-secret",
  accessTtl: "15m",
  refreshTtl: "7d"
} as const;