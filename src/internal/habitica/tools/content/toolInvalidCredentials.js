const habitoolsUrl = process.env.FRONTEND_HOST;

export default toolName => `
Looks like something went wrong on HabiTools. The ${ toolName } tool has encountered an error and is unable to continue running. 
This tool has been deactivated as a precaution. **Please unlink and relink your Habitica account** 
again to continue using it. You can do so from [your account page](${ habitoolsUrl }/my-account/).

If this issue persists after relinking your account, please reach out. The [feedback page](${ habitoolsUrl }/feedback) is the quickest way for us to receive your message.
`;