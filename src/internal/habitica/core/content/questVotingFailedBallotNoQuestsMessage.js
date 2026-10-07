const habitoolsUrl = process.env.FRONTEND_HOST;

export default `
### [**HabiTools Quest Voting**](${ habitoolsUrl }):\n\n---\n
# Oops!
Quest Voting could not open a ballot because there aren't any eligible quests from participating members.\n
- You can add your own quests to the roster by enabling it on Habitools: [**Quest Voting Tool**](${ habitoolsUrl }/tools/quest-voting/).
- Quest Voting has been paused. The party leader will need to [**manually unpause it**](${ habitoolsUrl }/tools/quest-voting/) when the party is ready.
`;
