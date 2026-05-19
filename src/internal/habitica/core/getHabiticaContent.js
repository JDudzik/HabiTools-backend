import HabiticaContent from 'knex/models/HabiticaContent';
import HabiticaContentGear from 'knex/models/HabiticaContentGear';
import HabiticaContentPets from 'knex/models/HabiticaContentPets';
import HabiticaContentMounts from 'knex/models/HabiticaContentMounts';
import { sanitizeProperties, returnOrSendResponse } from 'utils';
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

const ALLOWED_SPECIAL_BLOCKS = new Set([ 'gear', 'pets', 'mounts' ]);

const SPECIAL_BLOCK_MODELS = {
  gear: HabiticaContentGear,
  pets: HabiticaContentPets,
  mounts: HabiticaContentMounts,
};


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
 * This method returns selected columns from habitica_content plus optional gear/pets/mounts table queries.
 * @param {Object} properties - Request payload.
 * @param {Object<string, boolean|Function>} properties.dataItems - Object map of requested blocks.
 * Standard blocks must be set to true. Special blocks (gear, pets, mounts) accept true or a callback that receives an Objection query builder.
 * @param {string} [properties.language='en'] - The language code for content retrieval (e.g., 'en', 'es', 'fr').
 * @returns {Promise<Object>} Object containing only requested blocks, or a standardized error response object.
 */
export const getHabiticaContent = async (properties) => {
  const sanitizedPayload = sanitizeProperties(properties, {
    requiredKeys: [ 'dataItems' ],
    optionalKeys: [ 'language' ],
    trimPayload: true,
    removeDisallowedKeys: true,
  });
  if (!sanitizedPayload.valid) { return sanitizedPayload.error; }

  const { dataItems, language = 'en' } = sanitizedPayload.properties;

  if (typeof dataItems !== 'object' || Array.isArray(dataItems) || Object.keys(dataItems).length === 0) {
    return returnOrSendResponse(400, {
      status: 'INVALID_PROPERTY_VALUE',
      message: 'dataItems must be a non-empty object map of requested content blocks.',
    });
  }

  const requestedStandardBlocks = [];
  const requestedSpecialBlocks = [];

  for (const [ item, value ] of Object.entries(dataItems)) {
    if (ALLOWED_CONTENT_BLOCKS.has(item)) {
      if (value !== true) {
        return returnOrSendResponse(400, {
          status: 'INVALID_PROPERTY_VALUE',
          message: `Standard content blocks must be set to true: ${ item }`,
        });
      }
      requestedStandardBlocks.push(item);
    } else if (ALLOWED_SPECIAL_BLOCKS.has(item)) {
      if (value !== true && typeof value !== 'function') {
        return returnOrSendResponse(400, {
          status: 'INVALID_PROPERTY_VALUE',
          message: `Special content blocks (gear, pets, mounts) must be true or a callback function: ${ item }`,
        });
      }
      requestedSpecialBlocks.push(item);
    } else {
      return returnOrSendResponse(400, {
        status: 'INVALID_PROPERTY_VALUE',
        message: `Unsupported dataItem: ${ item }`,
      });
    }
  }

  // Fast freshness check using only metadata before selecting large JSON columns.
  const contentVersion = await HabiticaContent.query()
    .select([ 'id', 'last_updated' ])
    .where({ language })
    .orderBy('last_updated', 'desc')
    .first();

  const isStale = !contentVersion?.last_updated || (Date.now() - contentVersion.last_updated) > ONE_DAY_MS;

  let contentId = contentVersion?.id;
  if (isStale) {
    const refreshResult = await refreshAndStoreHabiticaContent(language);
    if (refreshResult?.code) { return refreshResult; }
    contentId = refreshResult.id;
  }

  if (!contentId) {
    return returnOrSendResponse(404, {
      status: 'HABITICA_CONTENT_NOT_FOUND',
      message: 'No Habitica content is currently available.',
    });
  }

  const response = {};

  if (requestedStandardBlocks.length > 0) {
    const contentRow = await HabiticaContent.query()
      .findById(contentId)
      .select(requestedStandardBlocks);

    if (!contentRow) {
      return returnOrSendResponse(404, {
        status: 'HABITICA_CONTENT_NOT_FOUND',
        message: 'Habitica content record could not be retrieved.',
      });
    }

    requestedStandardBlocks.forEach((item) => {
      response[item] = parseMaybeJson(contentRow[item]);
    });
  }

  for (const item of requestedSpecialBlocks) {
    const callbackOrFlag = dataItems[item];
    const model = SPECIAL_BLOCK_MODELS[item];

    let rows;
    try {
      const query = model.query().where({
        language,
        habitica_content_id: contentId,
      });

      if (typeof callbackOrFlag === 'function') {
        callbackOrFlag(query);
      }

      rows = await query;
    } catch {
      return returnOrSendResponse(400, {
        status: 'INVALID_PROPERTY_VALUE',
        message: `Invalid query builder callback for ${ item }.`,
      });
    }

    response[item] = rows.map((row) => {
      const rowJson = row?.toJSON ? row.toJSON() : row;
      return Object.entries(rowJson).reduce((parsedRow, [ key, value ]) => {
        parsedRow[key] = parseMaybeJson(value);
        return parsedRow;
      }, {});
    });
  }

  return response;
};