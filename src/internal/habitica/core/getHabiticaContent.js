import HabiticaContent from 'knex/models/HabiticaContent';
import { sanitizeProperties, isArray, returnOrSendResponse } from 'utils';
import { refreshAndStoreHabiticaContent } from '../helpers/refreshAndStoreHabiticaContent';


const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const ALLOWED_CONTENT_BLOCKS = new Set([
  'appVersion',
  'achievements',
  'quests',
  'questsByLevel',
  'userCanOwnQuestCategories',
  'itemList',
  'spells',
  'mystery',
  'officialPinnedItems',
  'bundles',
  'categoryOptions',
  'potion',
  'armoire',
  'events',
  'repeatingEvents',
  'classes',
  'gearTypes',
  'cardTypes',
  'special',
  'dropEggs',
  'questEggs',
  'eggs',
  'timeTravelStable',
  'dropHatchingPotions',
  'premiumHatchingPotions',
  'wackyHatchingPotions',
  'hatchingPotions',
  'food',
  'appearances',
  'backgrounds',
]);


const parseMaybeJson = (value) => {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};


/**
 * Retrieves stored Habitica content blocks and refreshes from Habitica if stale (>24 hours).
 * This method only returns columns from habitica_content and does not read gear/pets/mounts tables.
 * @param {Object} properties - Request payload.
 * @param {Array<string>} properties.dataItems - List of top-level content blocks to return.
 * @param {string} [properties.language='en'] - The language code for content retrieval (e.g., 'en', 'es', 'fr').
 * @returns {Promise<Object>} Object containing only requested blocks, or a standardized error response object.
 */
export const getHabiticaContent = async (properties) => {
  const sanitizedPayload = sanitizeProperties(properties, {
    requiredKeys: [ 'dataItems' ],
    optionalKeys: [ 'language' ],
    trimPayload: true,
    removeDisallowedKeys: true,
    propertyValidations: [
      isArray('dataItems'),
    ],
  });
  if (!sanitizedPayload.valid) { return sanitizedPayload.error; }

  const language = sanitizedPayload.properties.language || 'en';

  const requestedItems = Array.from(new Set(sanitizedPayload.properties.dataItems || []));
  if (requestedItems.length < 1) {
    return returnOrSendResponse(400, {
      status: 'MISSING_REQUIRED_PROPERTY',
      message: 'At least one content data item must be requested.',
    });
  }

  const unsupportedItems = requestedItems.filter(item => !ALLOWED_CONTENT_BLOCKS.has(item));
  if (unsupportedItems.length > 0) {
    return returnOrSendResponse(400, {
      status: 'INVALID_PROPERTY_VALUE',
      message: `Unsupported dataItems requested: ${ unsupportedItems.join(', ') }`,
    });
  }

  // Fast freshness check using only metadata before selecting large JSON columns.
  let contentVersion = await HabiticaContent.query()
    .select([ 'id', 'last_updated' ])
    .where({ language })
    .orderBy('last_updated', 'desc')
    .first();

  const now = Date.now();
  const isStale = !contentVersion?.last_updated || (now - contentVersion.last_updated) > ONE_DAY_MS;
  if (isStale) {
    const refreshResult = await refreshAndStoreHabiticaContent(language);
    if (refreshResult?.code) {
      return refreshResult;
    }

    contentVersion = {
      id: refreshResult.id,
      last_updated: refreshResult.last_updated,
    };
  }

  if (!contentVersion?.id) {
    return returnOrSendResponse(404, {
      status: 'HABITICA_CONTENT_NOT_FOUND',
      message: 'No Habitica content is currently available.',
    });
  }

  const contentRow = await HabiticaContent.query()
    .findById(contentVersion.id)
    .select(requestedItems);

  if (!contentRow) {
    return returnOrSendResponse(404, {
      status: 'HABITICA_CONTENT_NOT_FOUND',
      message: 'Habitica content record could not be retrieved.',
    });
  }

  return requestedItems.reduce((result, item) => {
    result[item] = parseMaybeJson(contentRow[item]);
    return result;
  }, {});
};