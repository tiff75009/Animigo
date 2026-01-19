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
import type * as admin_moderation from "../admin/moderation.js";
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
import type * as auth_login from "../auth/login.js";
import type * as auth_register from "../auth/register.js";
import type * as auth_session from "../auth/session.js";
import type * as auth_utils from "../auth/utils.js";
import type * as planning_availability from "../planning/availability.js";
import type * as planning_missions from "../planning/missions.js";
import type * as public_booking from "../public/booking.js";
import type * as public_emailVerify from "../public/emailVerify.js";
import type * as public_search from "../public/search.js";
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
  "admin/moderation": typeof admin_moderation;
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
  "auth/login": typeof auth_login;
  "auth/register": typeof auth_register;
  "auth/session": typeof auth_session;
  "auth/utils": typeof auth_utils;
  "planning/availability": typeof planning_availability;
  "planning/missions": typeof planning_missions;
  "public/booking": typeof public_booking;
  "public/emailVerify": typeof public_emailVerify;
  "public/search": typeof public_search;
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
