import { verify } from 'hcaptcha';
import { handleApiError } from 'utils/methods/handleApiError';
import { handleApiAnalytic } from 'utils/methods/handleApiAnalytic';


export const verifyHcaptcha = async (hcaptchaToken, fullResponse) => {
  const secret = process.env.HCAPTCHA_SITE_VERIFY_SECRET;
  const data = await verify(secret, hcaptchaToken)
    .catch((err) => {
      handleApiError(err, 'verifyCaptcha.verify', { skipPosthog: true });
      return false;
    });

  handleApiAnalytic(undefined, 'verifyCaptcha.complete', { data });
  if (data?.success === true) {
    return fullResponse ? data : true;
  } 
  return fullResponse ? data : false;
};