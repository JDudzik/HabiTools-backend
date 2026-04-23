import { Model } from 'objection';

export default class HabiticaContent extends Model {
  static tableName = 'habitica_content';

  static jsonSchema = {
    type: 'object',
    properties: {
      id: { type: 'string' },
      last_updated: { type: [ 'integer', 'null' ]},
      language: { type: [ 'string', 'null' ], minLength: 1, maxLength: 50 },
      appVersion: { type: [ 'string', 'null' ], minLength: 1, maxLength: 50 },
      achievements: { type: [ 'object', 'array', 'null' ]},
      quests: { type: [ 'object', 'array', 'null' ]},
      questsByLevel: { type: [ 'object', 'array', 'null' ]},
      userCanOwnQuestCategories: { type: [ 'object', 'array', 'null' ]},
      itemList: { type: [ 'object', 'array', 'null' ]},
      spells: { type: [ 'object', 'array', 'null' ]},
      mystery: { type: [ 'object', 'array', 'null' ]},
      officialPinnedItems: { type: [ 'object', 'array', 'null' ]},
      bundles: { type: [ 'object', 'array', 'null' ]},
      categoryOptions: { type: [ 'object', 'array', 'null' ]},
      potion: { type: [ 'object', 'array', 'null' ]},
      armoire: { type: [ 'object', 'array', 'null' ]},
      events: { type: [ 'object', 'array', 'null' ]},
      repeatingEvents: { type: [ 'object', 'array', 'null' ]},
      classes: { type: [ 'object', 'array', 'null' ]},
      gearTypes: { type: [ 'object', 'array', 'null' ]},
      cardTypes: { type: [ 'object', 'array', 'null' ]},
      special: { type: [ 'object', 'array', 'null' ]},
      dropEggs: { type: [ 'object', 'array', 'null' ]},
      questEggs: { type: [ 'object', 'array', 'null' ]},
      eggs: { type: [ 'object', 'array', 'null' ]},
      timeTravelStable: { type: [ 'object', 'array', 'null' ]},
      dropHatchingPotions: { type: [ 'object', 'array', 'null' ]},
      premiumHatchingPotions: { type: [ 'object', 'array', 'null' ]},
      wackyHatchingPotions: { type: [ 'object', 'array', 'null' ]},
      hatchingPotions: { type: [ 'object', 'array', 'null' ]},
      food: { type: [ 'object', 'array', 'null' ]},
      appearances: { type: [ 'object', 'array', 'null' ]},
      backgrounds: { type: [ 'object', 'array', 'null' ]},
    },
  };

  static relationMappings = {
    gear: {
      relation: Model.HasManyRelation,
      modelClass: `${ __dirname }/HabiticaDataGear`,
      join: {
        from: 'habitica_content.id',
        to: 'habitica_content_gear.habitica_content_id',
      },
    },

    pets: {
      relation: Model.HasManyRelation,
      modelClass: `${ __dirname }/HabiticaDataPets`,
      join: {
        from: 'habitica_content.id',
        to: 'habitica_content_pets.habitica_content_id',
      },
    },

    mounts: {
      relation: Model.HasManyRelation,
      modelClass: `${ __dirname }/HabiticaDataMounts`,
      join: {
        from: 'habitica_content.id',
        to: 'habitica_content_mounts.habitica_content_id',
      },
    },
  };
}
