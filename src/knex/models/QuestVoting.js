import { Model } from 'objection';

export default class QuestVoting extends Model {
  static tableName = 'quest_votings';

  static jsonSchema = {
    type: 'object',
    required: [ 'created_at', 'party_habitica_id' ],
    properties: {
      id: { type: 'string' },
      created_at: { type: 'integer' },
      updated_at: { type: [ 'integer', 'null' ]},
      deleted_at: { type: [ 'integer', 'null' ]},
      party_habitica_id: { type: 'string' },
      party_name: { type: [ 'string', 'null' ]},
      leader_user_id: { type: [ 'string', 'null' ]},
      leader_habitica_user_id: { type: [ 'string', 'null' ]},
      leader_tool_resource_id: { type: [ 'string', 'null' ]},
      paused: { type: [ 'boolean', 'null' ]},
      secure_voting: { type: [ 'boolean', 'null' ]},
      party_filters: { type: [ 'object', 'null' ]},
      participants: { type: [ 'array', 'null' ]},
      active_ballot: { type: [ 'object', 'null' ]},
      vote_links: { type: [ 'array', 'null' ]},
      vote_history: { type: [ 'array', 'null' ]},
      last_known_quest: { type: [ 'object', 'null' ]},
      last_vote_opened_at: { type: [ 'integer', 'null' ]},
      last_vote_closed_at: { type: [ 'integer', 'null' ]},
    },
  };
}
