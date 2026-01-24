/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_commissions from "../admin/commissions.js";
import type * as admin_config from "../admin/config.js";
import type * as admin_devPresence from "../admin/devPresence.js";
import type * as admin_emailTemplates from "../admin/emailTemplates.js";
import type * as admin_invitations from "../admin/invitations.js";
import type * as admin_login from "../admin/login.js";
import type * as admin_maintenance from "../admin/maintenance.js";
import type * as admin_moderation from "../admin/moderation.js";
import type * as admin_reservations from "../admin/reservations.js";
import type * as admin_seed from "../admin/seed.js";
import type * as admin_serviceCategories from "../admin/serviceCategories.js";
import type * as admin_stats from "../admin/stats.js";
import type * as admin_users from "../admin/users.js";
import type * as admin_utils from "../admin/utils.js";
import type * as animals from "../animals.js";
import type * as api_email from "../api/email.js";
import type * as api_emailInternal from "../api/emailInternal.js";
import type * as api_googleMaps from "../api/googleMaps.js";
import type * as api_societe from "../api/societe.js";
import type * as api_stripe from "../api/stripe.js";
import type * as api_stripeClient from "../api/stripeClient.js";
import type * as api_stripeInternal from "../api/stripeInternal.js";
import type * as api_stripeWebhook from "../api/stripeWebhook.js";
import type * as auth_login from "../auth/login.js";
import type * as auth_register from "../auth/register.js";
import type * as auth_session from "../auth/session.js";
import type * as auth_utils from "../auth/utils.js";
import type * as client_profile from "../client/profile.js";
import type * as config from "../config.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as lib_capacityUtils from "../lib/capacityUtils.js";
import type * as lib_notificationTemplates from "../lib/notificationTemplates.js";
import type * as lib_qstash from "../lib/qstash.js";
import type * as lib_timeUtils from "../lib/timeUtils.js";
import type * as maintenance_visitRequests from "../maintenance/visitRequests.js";
import type * as notifications_actions from "../notifications/actions.js";
import type * as notifications_index from "../notifications/index.js";
import type * as notifications_mutations from "../notifications/mutations.js";
import type * as notifications_queries from "../notifications/queries.js";
import type * as planning_availability from "../planning/availability.js";
import type * as planning_missions from "../planning/missions.js";
import type * as public_announcer from "../public/announcer.js";
import type * as public_booking from "../public/booking.js";
import type * as public_emailVerify from "../public/emailVerify.js";
import type * as public_search from "../public/search.js";
import type * as services_activities from "../services/activities.js";
import type * as services_options from "../services/options.js";
import type * as services_photos from "../services/photos.js";
import type * as services_preferences from "../services/preferences.js";
import type * as services_pricing from "../services/pricing.js";
import type * as services_profile from "../services/profile.js";
import type * as services_services from "../services/services.js";
import type * as services_variants from "../services/variants.js";
import type * as utils_contentModeration from "../utils/contentModeration.js";
import type * as utils_defaultPricing from "../utils/defaultPricing.js";
import type * as utils_location from "../utils/location.js";
import type * as verification_autoVerify from "../verification/autoVerify.js";
import type * as verification_verification from "../verification/verification.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admin/commissions": typeof admin_commissions;
  "admin/config": typeof admin_config;
  "admin/devPresence": typeof admin_devPresence;
  "admin/emailTemplates": typeof admin_emailTemplates;
  "admin/invitations": typeof admin_invitations;
  "admin/login": typeof admin_login;
  "admin/maintenance": typeof admin_maintenance;
  "admin/moderation": typeof admin_moderation;
  "admin/reservations": typeof admin_reservations;
  "admin/seed": typeof admin_seed;
  "admin/serviceCategories": typeof admin_serviceCategories;
  "admin/stats": typeof admin_stats;
  "admin/users": typeof admin_users;
  "admin/utils": typeof admin_utils;
  animals: typeof animals;
  "api/email": typeof api_email;
  "api/emailInternal": typeof api_emailInternal;
  "api/googleMaps": typeof api_googleMaps;
  "api/societe": typeof api_societe;
  "api/stripe": typeof api_stripe;
  "api/stripeClient": typeof api_stripeClient;
  "api/stripeInternal": typeof api_stripeInternal;
  "api/stripeWebhook": typeof api_stripeWebhook;
  "auth/login": typeof auth_login;
  "auth/register": typeof auth_register;
  "auth/session": typeof auth_session;
  "auth/utils": typeof auth_utils;
  "client/profile": typeof client_profile;
  config: typeof config;
  crons: typeof crons;
  http: typeof http;
  "lib/capacityUtils": typeof lib_capacityUtils;
  "lib/notificationTemplates": typeof lib_notificationTemplates;
  "lib/qstash": typeof lib_qstash;
  "lib/timeUtils": typeof lib_timeUtils;
  "maintenance/visitRequests": typeof maintenance_visitRequests;
  "notifications/actions": typeof notifications_actions;
  "notifications/index": typeof notifications_index;
  "notifications/mutations": typeof notifications_mutations;
  "notifications/queries": typeof notifications_queries;
  "planning/availability": typeof planning_availability;
  "planning/missions": typeof planning_missions;
  "public/announcer": typeof public_announcer;
  "public/booking": typeof public_booking;
  "public/emailVerify": typeof public_emailVerify;
  "public/search": typeof public_search;
  "services/activities": typeof services_activities;
  "services/options": typeof services_options;
  "services/photos": typeof services_photos;
  "services/preferences": typeof services_preferences;
  "services/pricing": typeof services_pricing;
  "services/profile": typeof services_profile;
  "services/services": typeof services_services;
  "services/variants": typeof services_variants;
  "utils/contentModeration": typeof utils_contentModeration;
  "utils/defaultPricing": typeof utils_defaultPricing;
  "utils/location": typeof utils_location;
  "verification/autoVerify": typeof verification_autoVerify;
  "verification/verification": typeof verification_verification;
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
