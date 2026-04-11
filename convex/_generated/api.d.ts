/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as chatConversations from "../chatConversations.js";
import type * as chatIntegrations from "../chatIntegrations.js";
import type * as chatMessages from "../chatMessages.js";
import type * as emails from "../emails.js";
import type * as identity from "../identity.js";
import type * as mailboxes from "../mailboxes.js";
import type * as orders from "../orders.js";
import type * as payments from "../payments.js";
import type * as profiles from "../profiles.js";
import type * as senderIdentities from "../senderIdentities.js";
import type * as sms from "../sms.js";
import type * as usage from "../usage.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  chatConversations: typeof chatConversations;
  chatIntegrations: typeof chatIntegrations;
  chatMessages: typeof chatMessages;
  emails: typeof emails;
  identity: typeof identity;
  mailboxes: typeof mailboxes;
  orders: typeof orders;
  payments: typeof payments;
  profiles: typeof profiles;
  senderIdentities: typeof senderIdentities;
  sms: typeof sms;
  usage: typeof usage;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
