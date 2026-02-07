/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_announcers from "../admin/announcers.js";
import type * as admin_categoryTypes from "../admin/categoryTypes.js";
import type * as admin_commissions from "../admin/commissions.js";
import type * as admin_config from "../admin/config.js";
import type * as admin_credits from "../admin/credits.js";
import type * as admin_devPresence from "../admin/devPresence.js";
import type * as admin_disputeReasons from "../admin/disputeReasons.js";
import type * as admin_disputes from "../admin/disputes.js";
import type * as admin_emailTemplates from "../admin/emailTemplates.js";
import type * as admin_faq from "../admin/faq.js";
import type * as admin_finances from "../admin/finances.js";
import type * as admin_financesInternal from "../admin/financesInternal.js";
import type * as admin_invitations from "../admin/invitations.js";
import type * as admin_invoices from "../admin/invoices.js";
import type * as admin_legalPages from "../admin/legalPages.js";
import type * as admin_login from "../admin/login.js";
import type * as admin_maintenance from "../admin/maintenance.js";
import type * as admin_moderation from "../admin/moderation.js";
import type * as admin_reservations from "../admin/reservations.js";
import type * as admin_seed from "../admin/seed.js";
import type * as admin_serviceCategories from "../admin/serviceCategories.js";
import type * as admin_stats from "../admin/stats.js";
import type * as admin_support from "../admin/support.js";
import type * as admin_transfers from "../admin/transfers.js";
import type * as admin_users from "../admin/users.js";
import type * as admin_utils from "../admin/utils.js";
import type * as animals from "../animals.js";
import type * as api_email from "../api/email.js";
import type * as api_emailInternal from "../api/emailInternal.js";
import type * as api_googleMaps from "../api/googleMaps.js";
import type * as api_societe from "../api/societe.js";
import type * as api_stripe from "../api/stripe.js";
import type * as api_stripeClient from "../api/stripeClient.js";
import type * as api_stripeConnect from "../api/stripeConnect.js";
import type * as api_stripeConnectQueries from "../api/stripeConnectQueries.js";
import type * as api_stripeInternal from "../api/stripeInternal.js";
import type * as api_stripeWebhook from "../api/stripeWebhook.js";
import type * as auth_login from "../auth/login.js";
import type * as auth_register from "../auth/register.js";
import type * as auth_session from "../auth/session.js";
import type * as auth_username from "../auth/username.js";
import type * as auth_utils from "../auth/utils.js";
import type * as client_addresses from "../client/addresses.js";
import type * as client_favorites from "../client/favorites.js";
import type * as client_profile from "../client/profile.js";
import type * as config from "../config.js";
import type * as crons from "../crons.js";
import type * as dashboard_fiscalSummary from "../dashboard/fiscalSummary.js";
import type * as dashboard_payments from "../dashboard/payments.js";
import type * as http from "../http.js";
import type * as lib_batchLoaders from "../lib/batchLoaders.js";
import type * as lib_capacityUtils from "../lib/capacityUtils.js";
import type * as lib_geoUtils from "../lib/geoUtils.js";
import type * as lib_notificationTemplates from "../lib/notificationTemplates.js";
import type * as lib_qstash from "../lib/qstash.js";
import type * as lib_redis from "../lib/redis.js";
import type * as lib_timeUtils from "../lib/timeUtils.js";
import type * as maintenance_visitRequests from "../maintenance/visitRequests.js";
import type * as messaging_mutations from "../messaging/mutations.js";
import type * as messaging_queries from "../messaging/queries.js";
import type * as migrations_migrateOptionsToVariants from "../migrations/migrateOptionsToVariants.js";
import type * as migrations_migrateProfilesGeoGrid from "../migrations/migrateProfilesGeoGrid.js";
import type * as migrations_migrateProfilesToRedis from "../migrations/migrateProfilesToRedis.js";
import type * as notifications_actions from "../notifications/actions.js";
import type * as notifications_index from "../notifications/index.js";
import type * as notifications_mutations from "../notifications/mutations.js";
import type * as notifications_queries from "../notifications/queries.js";
import type * as planning_acceptanceDeadline from "../planning/acceptanceDeadline.js";
import type * as planning_availability from "../planning/availability.js";
import type * as planning_cancellation from "../planning/cancellation.js";
import type * as planning_cancellationActions from "../planning/cancellationActions.js";
import type * as planning_collectiveSlots from "../planning/collectiveSlots.js";
import type * as planning_disputes from "../planning/disputes.js";
import type * as planning_missions from "../planning/missions.js";
import type * as planning_paymentDeadline from "../planning/paymentDeadline.js";
import type * as planning_payouts from "../planning/payouts.js";
import type * as planning_regularity from "../planning/regularity.js";
import type * as planning_regularityActions from "../planning/regularityActions.js";
import type * as planning_regularitySeed from "../planning/regularitySeed.js";
import type * as planning_reviews from "../planning/reviews.js";
import type * as public_announcer from "../public/announcer.js";
import type * as public_booking from "../public/booking.js";
import type * as public_categoryTypes from "../public/categoryTypes.js";
import type * as public_emailVerify from "../public/emailVerify.js";
import type * as public_legal from "../public/legal.js";
import type * as public_profile from "../public/profile.js";
import type * as public_search from "../public/search.js";
import type * as public_searchWithRedis from "../public/searchWithRedis.js";
import type * as seo_serviceCities from "../seo/serviceCities.js";
import type * as seo_serviceCityPages from "../seo/serviceCityPages.js";
import type * as seo_servicePages from "../seo/servicePages.js";
import type * as services_activities from "../services/activities.js";
import type * as services_options from "../services/options.js";
import type * as services_photos from "../services/photos.js";
import type * as services_preferences from "../services/preferences.js";
import type * as services_pricing from "../services/pricing.js";
import type * as services_profile from "../services/profile.js";
import type * as services_services from "../services/services.js";
import type * as services_variants from "../services/variants.js";
import type * as support_faq from "../support/faq.js";
import type * as support_tickets from "../support/tickets.js";
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
  "admin/announcers": typeof admin_announcers;
  "admin/categoryTypes": typeof admin_categoryTypes;
  "admin/commissions": typeof admin_commissions;
  "admin/config": typeof admin_config;
  "admin/credits": typeof admin_credits;
  "admin/devPresence": typeof admin_devPresence;
  "admin/disputeReasons": typeof admin_disputeReasons;
  "admin/disputes": typeof admin_disputes;
  "admin/emailTemplates": typeof admin_emailTemplates;
  "admin/faq": typeof admin_faq;
  "admin/finances": typeof admin_finances;
  "admin/financesInternal": typeof admin_financesInternal;
  "admin/invitations": typeof admin_invitations;
  "admin/invoices": typeof admin_invoices;
  "admin/legalPages": typeof admin_legalPages;
  "admin/login": typeof admin_login;
  "admin/maintenance": typeof admin_maintenance;
  "admin/moderation": typeof admin_moderation;
  "admin/reservations": typeof admin_reservations;
  "admin/seed": typeof admin_seed;
  "admin/serviceCategories": typeof admin_serviceCategories;
  "admin/stats": typeof admin_stats;
  "admin/support": typeof admin_support;
  "admin/transfers": typeof admin_transfers;
  "admin/users": typeof admin_users;
  "admin/utils": typeof admin_utils;
  animals: typeof animals;
  "api/email": typeof api_email;
  "api/emailInternal": typeof api_emailInternal;
  "api/googleMaps": typeof api_googleMaps;
  "api/societe": typeof api_societe;
  "api/stripe": typeof api_stripe;
  "api/stripeClient": typeof api_stripeClient;
  "api/stripeConnect": typeof api_stripeConnect;
  "api/stripeConnectQueries": typeof api_stripeConnectQueries;
  "api/stripeInternal": typeof api_stripeInternal;
  "api/stripeWebhook": typeof api_stripeWebhook;
  "auth/login": typeof auth_login;
  "auth/register": typeof auth_register;
  "auth/session": typeof auth_session;
  "auth/username": typeof auth_username;
  "auth/utils": typeof auth_utils;
  "client/addresses": typeof client_addresses;
  "client/favorites": typeof client_favorites;
  "client/profile": typeof client_profile;
  config: typeof config;
  crons: typeof crons;
  "dashboard/fiscalSummary": typeof dashboard_fiscalSummary;
  "dashboard/payments": typeof dashboard_payments;
  http: typeof http;
  "lib/batchLoaders": typeof lib_batchLoaders;
  "lib/capacityUtils": typeof lib_capacityUtils;
  "lib/geoUtils": typeof lib_geoUtils;
  "lib/notificationTemplates": typeof lib_notificationTemplates;
  "lib/qstash": typeof lib_qstash;
  "lib/redis": typeof lib_redis;
  "lib/timeUtils": typeof lib_timeUtils;
  "maintenance/visitRequests": typeof maintenance_visitRequests;
  "messaging/mutations": typeof messaging_mutations;
  "messaging/queries": typeof messaging_queries;
  "migrations/migrateOptionsToVariants": typeof migrations_migrateOptionsToVariants;
  "migrations/migrateProfilesGeoGrid": typeof migrations_migrateProfilesGeoGrid;
  "migrations/migrateProfilesToRedis": typeof migrations_migrateProfilesToRedis;
  "notifications/actions": typeof notifications_actions;
  "notifications/index": typeof notifications_index;
  "notifications/mutations": typeof notifications_mutations;
  "notifications/queries": typeof notifications_queries;
  "planning/acceptanceDeadline": typeof planning_acceptanceDeadline;
  "planning/availability": typeof planning_availability;
  "planning/cancellation": typeof planning_cancellation;
  "planning/cancellationActions": typeof planning_cancellationActions;
  "planning/collectiveSlots": typeof planning_collectiveSlots;
  "planning/disputes": typeof planning_disputes;
  "planning/missions": typeof planning_missions;
  "planning/paymentDeadline": typeof planning_paymentDeadline;
  "planning/payouts": typeof planning_payouts;
  "planning/regularity": typeof planning_regularity;
  "planning/regularityActions": typeof planning_regularityActions;
  "planning/regularitySeed": typeof planning_regularitySeed;
  "planning/reviews": typeof planning_reviews;
  "public/announcer": typeof public_announcer;
  "public/booking": typeof public_booking;
  "public/categoryTypes": typeof public_categoryTypes;
  "public/emailVerify": typeof public_emailVerify;
  "public/legal": typeof public_legal;
  "public/profile": typeof public_profile;
  "public/search": typeof public_search;
  "public/searchWithRedis": typeof public_searchWithRedis;
  "seo/serviceCities": typeof seo_serviceCities;
  "seo/serviceCityPages": typeof seo_serviceCityPages;
  "seo/servicePages": typeof seo_servicePages;
  "services/activities": typeof services_activities;
  "services/options": typeof services_options;
  "services/photos": typeof services_photos;
  "services/preferences": typeof services_preferences;
  "services/pricing": typeof services_pricing;
  "services/profile": typeof services_profile;
  "services/services": typeof services_services;
  "services/variants": typeof services_variants;
  "support/faq": typeof support_faq;
  "support/tickets": typeof support_tickets;
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
