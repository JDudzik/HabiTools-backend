const habitoolsUrl = process.env.FRONTEND_HOST;

export default toolName => `
Looks like something went wrong on HabiTools. The ${ toolName } tool has encountered an error and is unable to continue running. 
This tool has been deactivated as a precaution. You can try to re-enable it.

If this issue happens to all of your tools, you may need to unlink and relink your Habitica account.
If the issues still continues, please reach out. The [feedback page](${ habitoolsUrl }/feedback) is the quickest way for us to receive your message.
`;