let habiticaContentJson;
let shouldSkipHabiticaContentSeed = false;


try {
  habiticaContentJson = require('./data/habitica-content');
  // You will need to generate this file manually because it will be too massive for version control. To do so:
  // Hit the endpoint `https://habitica.com/api/v3/content` and save the response data to `src/knex/seeds/data/habitica-content.json`
  //   You won't be able to hit this endpoint without passing in a valid Habitica user ID and API key. 
} catch (error) {
  if (error?.code === 'MODULE_NOT_FOUND' && error?.message?.includes('habitica-content')) {
    shouldSkipHabiticaContentSeed = true;
    habiticaContentJson = null;
  } else {
    throw error;
  }
}


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
      id: gear.key,
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
        id: key,
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

exports.seed = async (knex) => {
  const habiticaContentId = '10000001-0016-4000-a000-000000000000';
  const asJson = value => JSON.stringify(value);
  const shouldSeedHabiticaContent = !shouldSkipHabiticaContentSeed && !!habiticaContentJson;
  const contentData = shouldSeedHabiticaContent ? (habiticaContentJson?.data || {}) : {};
  const appVersion = shouldSeedHabiticaContent ? (habiticaContentJson?.appVersion || null) : null;
  const language = 'en';
  const lastUpdated = Date.now();

  const contentRow = {
    id: habiticaContentId,
    last_updated: lastUpdated,
    language,
    appVersion,
    achievements: asJson(contentData.achievements),
    quests: asJson(contentData.quests),
    questsByLevel: asJson(contentData.questsByLevel),
    userCanOwnQuestCategories: asJson(contentData.userCanOwnQuestCategories),
    itemList: asJson(contentData.itemList),
    spells: asJson(contentData.spells),
    mystery: asJson(contentData.mystery),
    officialPinnedItems: asJson(contentData.officialPinnedItems),
    bundles: asJson(contentData.bundles),
    categoryOptions: asJson(contentData.categoryOptions),
    potion: asJson(contentData.potion),
    armoire: asJson(contentData.armoire),
    events: asJson(contentData.events),
    repeatingEvents: asJson(contentData.repeatingEvents),
    classes: asJson(contentData.classes),
    gearTypes: asJson(contentData.gearTypes),
    cardTypes: asJson(contentData.cardTypes),
    special: asJson(contentData.special),
    dropEggs: asJson(contentData.dropEggs),
    questEggs: asJson(contentData.questEggs),
    eggs: asJson(contentData.eggs),
    timeTravelStable: asJson(contentData.timeTravelStable),
    dropHatchingPotions: asJson(contentData.dropHatchingPotions),
    premiumHatchingPotions: asJson(contentData.premiumHatchingPotions),
    wackyHatchingPotions: asJson(contentData.wackyHatchingPotions),
    hatchingPotions: asJson(contentData.hatchingPotions),
    food: asJson(contentData.food),
    appearances: asJson(contentData.appearances),
    backgrounds: asJson(contentData.backgrounds),
  };

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

  if (shouldSeedHabiticaContent) {
    await knex('habitica_content').insert([ contentRow ]);
    await insertInChunks(knex, 'habitica_content_gear', gearRows);
    await insertInChunks(knex, 'habitica_content_pets', petRows);
    await insertInChunks(knex, 'habitica_content_mounts', mountRows);
  } else {
    console.warn('============================================================');
    console.warn('!!! HABITICA CONTENT SEED SKIPPED !!!');
    console.warn('Missing seed source: src/knex/seeds/data/habitica-content.json');
    console.warn('You must generate it manually.');
    console.warn('============================================================');
  }
};