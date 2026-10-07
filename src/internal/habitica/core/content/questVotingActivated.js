const habitoolsUrl = process.env.FRONTEND_HOST;

export default `
### [**HabiTools Quest Voting**](${ habitoolsUrl }):\n\n---\n
Greatings adventures! This is an automated message to let you know that your party leader has enabled Quest Voting for your party!\n
**How it works**:
- Everytime a quest is started, a new ballot will be created for your party to vote on the next quest. When the current quest ends, the quest with the most votes will automatically be opened.
- Quest need to come from somewhere! If you want to let your inventory of quests be a part of the roster, make sure to visit HabiTools and enable the [**Quest Voting Tool**](${ habitoolsUrl }/tools/quest-voting/).
- If your party leader has enabled _Secure Mode_, then you will need to link your Habitica account to HabiTools in order to be able to vote.
`;