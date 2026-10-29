import { defineRailway, github, preserve, project, service } from "railway/iac";

// This repository manages only its own resources in the environment. Other
// repositories export their own partial name.
// See https://docs.railway.com/infrastructure-as-code#multi-repo-projects
export const partial = "lawn";

export default defineRailway(() => {
  const lawn = service("lawn", {
    source: github("hr9e8/lawn", { branch: "main" }),
    env: {
      CONVEX_DEPLOY_KEY: preserve(),
      VITE_CLERK_PUBLISHABLE_KEY: preserve(),
      VITE_CONVEX_SITE_URL: preserve(),
      PORT: "8080",
    },
    build: "bun run build:railway",
    start: "bun run start:railway",
    healthcheck: "/",
    healthcheckTimeout: 120,
    // builder from CaC: "RAILPACK"
  });
  return project("lawn", {
    resources: [lawn],
  });
});
