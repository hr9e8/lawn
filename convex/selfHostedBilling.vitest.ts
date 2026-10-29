/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import { assertTeamCanStoreBytes, isBillingEnabled } from "./billingHelpers";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
afterEach(() => vi.unstubAllEnvs());

async function setup() {
  const t = convexTest(schema, modules);
  const teamId = await t.run(async (ctx) => {
    const id = await ctx.db.insert("teams", {
      name: "Lawn",
      slug: "lawn",
      ownerClerkId: "owner",
      plan: "basic",
    });
    await ctx.db.insert("teamMembers", {
      teamId: id,
      userClerkId: "owner",
      userEmail: "owner@example.com",
      userName: "Owner",
      role: "owner",
    });
    return id;
  });
  return { t, teamId, owner: t.withIdentity({ subject: "owner" }) };
}

test("billing remains enabled unless explicitly disabled", () => {
  vi.stubEnv("BILLING_ENABLED", undefined);
  expect(isBillingEnabled()).toBe(true);
  vi.stubEnv("BILLING_ENABLED", "true");
  expect(isBillingEnabled()).toBe(true);
});

test("self-hosted teams can create projects without Stripe and retain storage limits", async () => {
  vi.stubEnv("BILLING_ENABLED", "false");
  const { t, owner, teamId } = await setup();
  const projectId = await owner.mutation(api.projects.create, { teamId, name: "First project" });
  expect(projectId).toBeTruthy();
  const billing = await owner.query(api.billing.getTeamBilling, { teamId });
  expect(billing).toMatchObject({
    billingEnabled: false,
    hasActiveSubscription: true,
    monthlyPriceUsd: 0,
    canManageBilling: false,
  });
  await expect(
    t.run((ctx) => assertTeamCanStoreBytes(ctx, teamId, 101 * 1024 ** 3)),
  ).rejects.toThrow("Storage limit reached");
});

test("self-hosted mode preserves membership checks and blocks checkout", async () => {
  vi.stubEnv("BILLING_ENABLED", "false");
  const { t, owner, teamId } = await setup();
  await expect(
    t
      .withIdentity({ subject: "outsider" })
      .mutation(api.projects.create, { teamId, name: "Forbidden" }),
  ).rejects.toThrow("Not a team member");
  await expect(
    owner.action(api.billing.createSubscriptionCheckout, {
      teamId,
      plan: "basic",
      successUrl: "https://example.com/",
      cancelUrl: "https://example.com/",
    }),
  ).rejects.toThrow("Billing is disabled");
});

test("owners can delete self-hosted teams without a subscription cancellation", async () => {
  vi.stubEnv("BILLING_ENABLED", "false");
  const { t, owner, teamId } = await setup();
  await owner.mutation(api.teams.deleteTeam, { teamId });
  expect(await t.run((ctx) => ctx.db.get(teamId))).toBeNull();
});
