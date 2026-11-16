"use node";

import { sendNotification } from "web-push";
import type { PushSubscription } from "web-push";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

const subscriptionValidator = v.object({
  endpoint: v.string(),
  keys: v.object({ p256dh: v.string(), auth: v.string() }),
});

export const sendNewMail = internalAction({
  args: { subscriptions: v.array(subscriptionValidator) },
  handler: async (ctx, args) => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const subject = process.env.VAPID_SUBJECT;
    if (!publicKey || !privateKey || !subject) {
      console.error("Mailico push delivery is not configured in Convex.");
      return;
    }

    const expiredEndpoints: string[] = [];
    let failures = 0;
    for (let start = 0; start < args.subscriptions.length; start += 20) {
      const batch = args.subscriptions.slice(start, start + 20);
      const results = await Promise.allSettled(batch.map((subscription) =>
        sendNotification(
          subscription as PushSubscription,
          JSON.stringify({
            title: "New email",
            body: "You have a new message in your company inbox.",
            url: "/mail",
          }),
          {
            vapidDetails: { subject, publicKey, privateKey },
            TTL: 60,
            urgency: "high",
            timeout: 5000,
          },
        ),
      ));

      results.forEach((result, index) => {
        if (result.status !== "rejected") return;
        const statusCode = result.reason && typeof result.reason === "object" &&
          "statusCode" in result.reason ? result.reason.statusCode : undefined;
        if (statusCode === 404 || statusCode === 410) {
          expiredEndpoints.push(batch[index].endpoint);
        } else {
          failures += 1;
          console.error("Mailico push delivery failed", { statusCode });
        }
      });
    }

    if (expiredEndpoints.length) {
      await ctx.runMutation(internal.notifications.removeExpired, {
        endpoints: expiredEndpoints,
      });
    }
    if (failures) console.error("Mailico push delivery failures", { count: failures });
  },
});
