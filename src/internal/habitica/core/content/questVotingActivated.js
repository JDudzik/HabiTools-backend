const habitoolsUrl = process.env.FRONTEND_HOST;

export default `
### [**HabiTools Quest Voting**](${ habitoolsUrl }):\n\n---\n
Greetings adventures! This is an automated message to let you know that your party leader has enabled **Quest Voting** for your party!\n
**How it works**:
- A ballot has been created for everyone to vote on the next quest. When the current quest ends (or in 1 hour if you aren't in a quest), the option with the most votes will automatically be opened. The cycle repeats with a new ballot being opened to vote for the follow-up quest.
- If your party leader has enabled _Secure Mode_, then you will need to link your Habitica account to [**HabiTools**](${ habitoolsUrl }) in order to be able to vote.
- Quests need to come from somewhere! If you want to let your inventory of quests be a part of the roster, make sure to visit HabiTools and enable the [**Quest Voting Tool**](${ habitoolsUrl }/tools/quest-voting/).
`;