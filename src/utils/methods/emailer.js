import { handleApiAnalytic } from './handleApiAnalytic';

const brevo = require('@getbrevo/brevo');

let apiInstance = undefined;

export const sendTemplate = (emailDetails) => {
  // //////////////////////////
  // Initial source for email details: https://github.com/getbrevo/brevo-node
  // //////////////////////////

  if (!process.env.EMAILER_API_KEY) {
    // eslint-disable-next-line no-console
    console.log('--- env variable "EMAILER_API_KEY" does not exist. Skipped sending email ---');
    return false;
  }

  if (!apiInstance) {
    apiInstance = new brevo.TransactionalEmailsApi();
    const apiKey = apiInstance.authentications.apiKey;
    apiKey.apiKey = process.env.EMAILER_API_KEY;
  }

  let sendSmtpEmail = new brevo.SendSmtpEmail();
  sendSmtpEmail = emailDetails;

  if (!sendSmtpEmail.templateId || !sendSmtpEmail.to[0].name || !sendSmtpEmail.to[0].email) {
    throw [ new Error('sendTemplate params incorrect. Requires: {templateId, to: [{name, email}]}'), 'emailer.sendTemplate' ];
  }

  if (process.env.EMAILER_OVERRIDE_SEND_ADDRESS) {
    sendSmtpEmail.to = [{ name: 'OVERRIDDEN NAME', email: process.env.EMAILER_OVERRIDE_SEND_ADDRESS }];
  }

  apiInstance.sendTransacEmail(sendSmtpEmail).then((data) => {
    const analyticData = { template: sendSmtpEmail.templateId, to: sendSmtpEmail.to[0].email, result: data };
    handleApiAnalytic(undefined, 'emailer_sendTemplate', JSON.stringify(analyticData));
  }).catch((error) => { throw [ error, 'emailer.sendTemplate' ]; });
};

export const feedbackEmail = (topic, email, message, source) => {
  const date = new Date(Date.now());
  const dayName = date.toString().split(' ')[0];
  const monthDayYear = `${ date.getMonth() + 1 }/${ date.getDate() }/${ date.getFullYear() }`;
  const hoursMinutes = `${ date.getHours() + 1 }:${ date.getMinutes() }`;
  const dateString = `${ dayName } ${ monthDayYear } ${ hoursMinutes }`;

  if (!topic || !email || !message) {
    throw [ new Error(`feedbackEmail params incorrect. Requires: {topic, email, message}. Found ${ topic }, ${ email }, ${ message }`), 'emailer.feedbackEmail' ];
  }

  sendTemplate({
    templateId: 5,
    to: [{
      name: 'JD',
      email: 'masterlink950@gmail.com',
    }],
    subject: `${ topic } - ${ dateString }`,
    params: {
      'TOPIC': topic,
      'EMAIL': email,
      'MESSAGE': message,
      'SOURCE': source,
    },
  });
};
