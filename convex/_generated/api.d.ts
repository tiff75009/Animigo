/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_config from "../admin/config.js";
import type * as admin_login from "../admin/login.js";
import type * as admin_moderation from "../admin/moderation.js";
import type * as admin_seed from "../admin/seed.js";
import type * as admin_serviceCategories from "../admin/serviceCategories.js";
import type * as admin_stats from "../admin/stats.js";
import type * as admin_users from "../admin/users.js";
import type * as admin_utils from "../admin/utils.js";
import type * as api_societe from "../api/societe.js";
import type * as auth_login from "../auth/login.js";
import type * as auth_register from "../auth/register.js";
import type * as auth_session from "../auth/session.js";
import type * as auth_utils from "../auth/utils.js";
import type * as planning_availability from "../planning/availability.js";
import type * as planning_missions from "../planning/missions.js";
import type * as services_photos from "../services/photos.js";
import type * as services_pricing from "../services/pricing.js";
import type * as services_profile from "../services/profile.js";
import type * as services_services from "../services/services.js";
import type * as utils_contentModeration from "../utils/contentModeration.js";
import type * as utils_defaultPricing from "../utils/defaultPricing.js";
import type * as utils_location from "../utils/location.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admin/config": typeof admin_config;
  "admin/login": typeof admin_login;
  "admin/moderation": typeof admin_moderation;
  "admin/seed": typeof admin_seed;
  "admin/serviceCategories": typeof admin_serviceCategories;
  "admin/stats": typeof admin_stats;
  "admin/users": typeof admin_users;
  "admin/utils": typeof admin_utils;
  "api/societe": typeof api_societe;
  "auth/login": typeof auth_login;
  "auth/register": typeof auth_register;
  "auth/session": typeof auth_session;
  "auth/utils": typeof auth_utils;
  "planning/availability": typeof planning_availability;
  "planning/missions": typeof planning_missions;
  "services/photos": typeof services_photos;
  "services/pricing": typeof services_pricing;
  "services/profile": typeof services_profile;
  "services/services": typeof services_services;
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
