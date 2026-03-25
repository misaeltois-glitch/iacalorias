import { Router, type IRouter, type Request, type Response } from "express";
import Stripe from "stripe";
import { db, subscriptionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetSubscriptionStatusResponse,
  CreateCheckoutSessionResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-02-24.acacia" });

const PRICE_LIMITED = "price_1TEVxU5gtu657TZjDayM6rkR";
const PRICE_UNLIMITED = "price_1TEVyY5gtu657TZjVELJthbH";

const FREE_TRIAL_LIMIT = 3;
const LIMITED_PLAN_LIMIT = 20;

async function resolveSub(userId?: string, sessionId?: string) {
  if (userId) {
    const sub = await db.query.subscriptionsTable.findFirst({
      where: eq(subscriptionsTable.userId, userId),
    });
    if (sub) return sub;
  }
  const effectiveSessionId = sessionId ?? (userId ? `user-${userId}` : undefined);
  if (!effectiveSessionId) return null;

  let sub = await db.query.subscriptionsTable.findFirst({
    where: eq(subscriptionsTable.sessionId, effectiveSessionId),
  });
  if (!sub) {
    await db.insert(subscriptionsTable).values({ sessionId: effectiveSessionId, userId: userId ?? null, tier: "free", analysisCount: 0 });
    sub = await db.query.subscriptionsTable.findFirst({ where: eq(subscriptionsTable.sessionId, effectiveSessionId) });
  } else if (userId && !sub.userId) {
    await db.update(subscriptionsTable).set({ userId }).where(eq(subscriptionsTable.sessionId, effectiveSessionId));
    sub = { ...sub, userId };
  }
  return sub!;
}

router.get("/status", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;
  const userId = req.user?.userId;

  if (!sessionId && !userId) {
    res.status(400).json({ error: "bad_request", message: "sessionId is required" });
    return;
  }

  const sub = await resolveSub(userId, sessionId);
  if (!sub) {
    const tier = "free";
    const result = GetSubscriptionStatusResponse.parse({
      sessionId: sessionId ?? "",
      tier,
      analysisCount: 0,
      analysisLimit: FREE_TRIAL_LIMIT,
      trialRemaining: FREE_TRIAL_LIMIT,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
    });
    res.json(result);
    return;
  }

  const tier = sub.tier as "free" | "limited" | "unlimited";
  const analysisLimit = tier === "limited" ? LIMITED_PLAN_LIMIT : tier === "unlimited" ? null : FREE_TRIAL_LIMIT;
  const trialRemaining = tier === "free" ? Math.max(0, FREE_TRIAL_LIMIT - sub.analysisCount) : 0;

  const result = GetSubscriptionStatusResponse.parse({
    sessionId: sub.sessionId,
    tier,
    analysisCount: sub.analysisCount,
    analysisLimit,
    trialRemaining,
    stripeCustomerId: sub.stripeCustomerId,
    stripeSubscriptionId: sub.stripeSubscriptionId,
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
  });

  res.json(result);
});

router.post("/checkout", async (req: Request, res: Response) => {
  const { sessionId, plan } = req.body;
  const userId = req.user?.userId;

  if (!sessionId || !plan) {
    res.status(400).json({ error: "bad_request", message: "sessionId and plan are required" });
    return;
  }

  const priceId = plan === "limited" ? PRICE_LIMITED : PRICE_UNLIMITED;

  const domain = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : "http://localhost:80";

  try {
    let sub = await resolveSub(userId, sessionId);
    if (!sub) {
      await db.insert(subscriptionsTable).values({ sessionId, userId: userId ?? null, tier: "free", analysisCount: 0 });
      sub = await db.query.subscriptionsTable.findFirst({ where: eq(subscriptionsTable.sessionId, sessionId) });
    }

    let customerId = sub!.stripeCustomerId ?? undefined;

    if (!customerId) {
      const customer = await stripe.customers.create({ metadata: { sessionId, ...(userId ? { userId } : {}) } });
      customerId = customer.id;
      await db.update(subscriptionsTable)
        .set({ stripeCustomerId: customerId, updatedAt: new Date() })
        .where(eq(subscriptionsTable.sessionId, sub!.sessionId));
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${domain}/?checkout_success=true&session_id=${sessionId}`,
      cancel_url: `${domain}/?checkout_cancelled=true`,
      metadata: { sessionId, plan, ...(userId ? { userId } : {}) },
    });

    const result = CreateCheckoutSessionResponse.parse({ url: session.url });
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Error creating checkout session");
    res.status(500).json({ error: "internal_error", message: "Failed to create checkout" });
  }
});

router.post("/webhook", async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    req.log.error({ err }, "Webhook signature verification failed");
    res.status(400).json({ error: "invalid_signature" });
    return;
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const sessionId = session.metadata?.sessionId;
      const plan = session.metadata?.plan as "limited" | "unlimited";

      if (sessionId && plan) {
        const stripeSubscriptionId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id ?? null;

        let currentPeriodEnd: Date | null = null;
        if (stripeSubscriptionId) {
          const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
          currentPeriodEnd = new Date(stripeSub.current_period_end * 1000);
        }

        await db.update(subscriptionsTable)
          .set({ tier: plan, analysisCount: 0, stripeSubscriptionId: stripeSubscriptionId ?? undefined, currentPeriodEnd: currentPeriodEnd ?? undefined, updatedAt: new Date() })
          .where(eq(subscriptionsTable.sessionId, sessionId));
      }
    }

    if (event.type === "invoice.paid") {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeSubscriptionId = typeof invoice.subscription === "string"
        ? invoice.subscription
        : invoice.subscription?.id ?? null;

      if (stripeSubscriptionId) {
        const stripeSub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        const sessionId = stripeSub.metadata?.sessionId;
        const plan = stripeSub.metadata?.plan as "limited" | "unlimited" | undefined;

        if (sessionId) {
          await db.update(subscriptionsTable)
            .set({ analysisCount: 0, tier: plan ?? "limited", currentPeriodEnd: new Date(stripeSub.current_period_end * 1000), updatedAt: new Date() })
            .where(eq(subscriptionsTable.sessionId, sessionId));
        }
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const stripeSub = event.data.object as Stripe.Subscription;
      const sessionId = stripeSub.metadata?.sessionId;
      if (sessionId) {
        await db.update(subscriptionsTable)
          .set({ tier: "free", stripeSubscriptionId: null, currentPeriodEnd: null, updatedAt: new Date() })
          .where(eq(subscriptionsTable.sessionId, sessionId));
      }
    }

    res.json({ status: "ok" });
  } catch (err) {
    req.log.error({ err }, "Error processing webhook");
    res.status(500).json({ error: "internal_error" });
  }
});

export default router;
