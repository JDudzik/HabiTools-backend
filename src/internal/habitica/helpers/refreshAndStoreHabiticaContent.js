import HabiticaContent from 'knex/models/HabiticaContent';
import HabiticaUser from 'knex/models/HabiticaUser';
import { returnOrSendResponse } from 'utils';
import { v4 as uuidv4 } from 'uuid';
import { callHabiticaApi } from './callHabiticaApi';
import { getLinkedHabiticaUser } from '../core/getLinkedHabiticaUser';


const toChunks = (items, size = 250) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const insertInChunks = async (knex, tableName, rows, chunkSize = 250) => {
  if (!rows.length) {
    return;
  }

  const chunks = toChunks(rows, chunkSize);
  for (const chunk of chunks) {
    await knex(tableName).insert(chunk);
  }
};

const buildGearRows = ({ contentData, habiticaContentId, lastUpdated, language }) => {
  const flatGear = contentData?.gear?.flat || {};

  return Object.values(flatGear)
    .filter(gear => gear?.key)
    .map(gear => ({
      id: uuidv4(),
      last_updated: lastUpdated,
      language,
      key: gear.key,
      set: gear.set,
      specialClass: gear.specialClass,
      text: gear.text,
      notes: gear.notes,
      value: gear.value,
      season: gear.season,
      str: gear.str,
      type: gear.type,
      klass: gear.klass,
      index: gear.index,
      int: gear.int,
      per: gear.per,
      con: gear.con,
      event: gear.event,
      last: gear.last,
      mystery: gear.mystery,
      habitica_content_id: habiticaContentId,
    }));
};

const buildAnimalRows = ({
  keySources,
  infoMap,
  habiticaContentId,
  lastUpdated,
  language,
}) => {
  const allKeys = new Set();

  keySources.forEach((source) => {
    Object.keys(source || {}).forEach(key => allKeys.add(key));
  });

  return Array.from(allKeys)
    .map((key) => {
      const info = infoMap?.[key];
      if (!info) {
        return null;
      }

      return {
        id: uuidv4(),
        last_updated: lastUpdated,
        language,
        key: info.key || key,
        type: info.type,
        potion: info.potion,
        egg: info.egg,
        text: info.text,
        habitica_content_id: habiticaContentId,
      };
    })
    .filter(Boolean);
};

const toJson = value => (value !== null ? JSON.stringify(value) : null);

const mapContentRow = ({ contentData, appVersion, habiticaContentId, lastUpdated, language }) => ({
  id: habiticaContentId,
  last_updated: lastUpdated,
  language,
  appVersion,
  achievements: toJson(contentData.achievements),
  quests: toJson(contentData.quests),
  questsByLevel: toJson(contentData.questsByLevel),
  userCanOwnQuestCategories: toJson(contentData.userCanOwnQuestCategories),
  itemList: toJson(contentData.itemList),
  spells: toJson(contentData.spells),
  mystery: toJson(contentData.mystery),
  officialPinnedItems: toJson(contentData.officialPinnedItems),
  bundles: toJson(contentData.bundles),
  categoryOptions: toJson(contentData.categoryOptions),
  potion: toJson(contentData.potion),
  armoire: toJson(contentData.armoire),
  events: toJson(contentData.events),
  repeatingEvents: toJson(contentData.repeatingEvents),
  classes: toJson(contentData.classes),
  gearTypes: toJson(contentData.gearTypes),
  cardTypes: toJson(contentData.cardTypes),
  special: toJson(contentData.special),
  dropEggs: toJson(contentData.dropEggs),
  questEggs: toJson(contentData.questEggs),
  eggs: toJson(contentData.eggs),
  timeTravelStable: toJson(contentData.timeTravelStable),
  dropHatchingPotions: toJson(contentData.dropHatchingPotions),
  premiumHatchingPotions: toJson(contentData.premiumHatchingPotions),
  wackyHatchingPotions: toJson(contentData.wackyHatchingPotions),
  hatchingPotions: toJson(contentData.hatchingPotions),
  food: toJson(contentData.food),
  appearances: toJson(contentData.appearances),
  backgrounds: toJson(contentData.backgrounds),
});


/**
 * Retrieves the latest Habitica content from Habitica and stores it locally.
 * This method updates the main content row and also refreshes gear, pets, and mounts tables for the specified language.
 * When storing, it deletes existing data for that language and inserts new content.
 * @param {string} [language='en'] - The language code for the content being stored (e.g., 'en', 'es', 'fr').
 * @returns {Promise<Object>} Result with metadata about the refresh, or a standardized error response object.
 */
export const refreshAndStoreHabiticaContent = async (language = 'en') => {
  // Query for existing content ID for this language, or generate new one
  const existingContent = await HabiticaContent.query()
    .select([ 'id' ])
    .where({ language })
    .first();

  const habiticaContentId = existingContent?.id || uuidv4();

  const sourceHabiticaUser = await HabiticaUser.query()
    .select([ 'habitica_user_id' ])
    .orderBy('created_at', 'desc')
    .first();

  if (!sourceHabiticaUser?.habitica_user_id) {
    return returnOrSendResponse(404, {
      status: 'HABITICA_USER_NOT_FOUND',
      message: 'Cannot refresh Habitica content because no linked Habitica user was found.',
    });
  }

  const remoteHabiticaContent = await callHabiticaApi({
    method: 'GET',
    path: `/content?language=${ language }`,
    habiticaUserId: sourceHabiticaUser.habitica_user_id,
  });
  if (remoteHabiticaContent?.code) { return returnOrSendResponse(remoteHabiticaContent.code, remoteHabiticaContent.responseContent); }

  if (!remoteHabiticaContent?.success || !remoteHabiticaContent?.data) {
    return returnOrSendResponse(503, {
      status: 'HABITICA_UNREACHABLE',
      message: 'Habitica content payload was invalid or empty.',
    });
  }

  const contentData = remoteHabiticaContent.data || {};
  const appVersion = remoteHabiticaContent.appVersion || null;
  const lastUpdated = Date.now();

  const contentRow = mapContentRow({
    contentData,
    appVersion,
    habiticaContentId,
    lastUpdated,
    language,
  });

  const gearRows = buildGearRows({
    contentData,
    habiticaContentId,
    lastUpdated,
    language,
  });

  const petRows = buildAnimalRows({
    keySources: [
      contentData.pets,
      contentData.premiumPets,
      contentData.questPets,
      contentData.specialPets,
      contentData.wackyPets,
    ],
    infoMap: contentData.petInfo,
    habiticaContentId,
    lastUpdated,
    language,
  });

  const mountRows = buildAnimalRows({
    keySources: [
      contentData.mounts,
      contentData.premiumMounts,
      contentData.questMounts,
      contentData.specialMounts,
    ],
    infoMap: contentData.mountInfo,
    habiticaContentId,
    lastUpdated,
    language,
  });

  const knex = HabiticaContent.knex();
  await knex.transaction(async (trx) => {
    await trx('habitica_content_mounts').where({ language }).del();
    await trx('habitica_content_pets').where({ language }).del();
    await trx('habitica_content_gear').where({ language }).del();
    await trx('habitica_content').where({ language }).del();

    await trx('habitica_content').insert([ contentRow ]);
    await insertInChunks(trx, 'habitica_content_gear', gearRows);
    await insertInChunks(trx, 'habitica_content_pets', petRows);
    await insertInChunks(trx, 'habitica_content_mounts', mountRows);
  });

  return {
    success: true,
    id: habiticaContentId,
    language,
    last_updated: lastUpdated,
    appVersion,
  };
};