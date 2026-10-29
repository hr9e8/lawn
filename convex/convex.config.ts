import { defineApp } from "convex/server";
import { v } from "convex/values";
import migrations from "@convex-dev/migrations/convex.config.js";
import presence from "@convex-dev/presence/convex.config.js";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";
import stripe from "@convex-dev/stripe/convex.config.js";

const app = defineApp({ env: { BILLING_ENABLED: v.optional(v.string()) } });

app.use(migrations);
app.use(presence);
app.use(rateLimiter);
app.use(stripe);

export default app;
