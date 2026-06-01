import { returnOrSendResponse } from './returnOrSendResponse';
import deepTrim from 'deep-trim';
import { validate as propertyValidator } from './propertyValidator';
// List of available validation helpers:
// https://www.npmjs.com/package/property-validator#validation-helpers


/**
 * Sanitize and validate properties from a payload based on the provided configuration.
 * This function can be used in both API route handlers (with req/res) and in internal functions (without req/res).
 * @param {Object} payload - The input object containing properties to sanitize and validate.
 * @param {Object} config - Configuration for sanitization and validation.
 * @param {Array} config.requiredKeys - List of keys that must be present in the payload.
 * @param {Array} config.optionalKeys - List of keys that are allowed but not required in the payload.
 * @param {boolean} config.trimPayload - Whether to trim whitespace from string properties in the payload.
 * @param {boolean} config.removeDisallowedKeys - Whether to remove keys from the payload that are not in requiredKeys or optionalKeys.
 * @param {boolean} config.atLeastOneOptionalProp - Whether at least one optional property is required.
 * @param {boolean} config.parseInts - Whether to parse string properties that look like integers into actual integers.
 * @param {boolean} config.parseBools - Whether to parse string properties that look like booleans into actual booleans.
 * @param {Array} config.propertyValidations - An array of validation rules to apply to the properties (using property-validator). https://www.npmjs.com/package/property-validator#validation-helpers
 * @param {Object} [req] - The Express request object (optional, only needed if you want to send a response).
 * @param {Object} [res] - The Express response object (optional, only needed if you want to send a response).
 * @returns {Object} An object containing the validity of the payload, the sanitized properties, and any error information.
 */
export const sanitizeProperties = (payload, config, req, res) => {
  // Convert the payload into a map to make it easier to manipulate.
  const payloadMap = new Map(Object.entries(payload || {}));
  const {
    requiredKeys = [],
    optionalKeys = [],
    trimPayload = false,
    removeDisallowedKeys = false,
    atLeastOneOptionalProp = false,
    parseInts = false,
    parseBools = false,
    propertyValidations,
  } = config;
  const allowedKeys = [ ...optionalKeys, ...requiredKeys ];
  
  if (removeDisallowedKeys) {
    payloadMap.forEach((_value, key) => {
      if (!allowedKeys.includes(key)) {
        payloadMap.delete(key);
      }
    });
  }

  if (trimPayload) {
    payloadMap.forEach((value, key) => {
      payloadMap.set(key, deepTrim(value));
    });
  }

  if (parseInts) {
    payloadMap.forEach((value, key) => {
      if (typeof value === 'string' && /^\s*-?\d+(\.\d+)?\s*$/.test(value)) {
        payloadMap.set(key, parseFloat(value, 10));
      }
    });
  }

  if (parseBools) {
    payloadMap.forEach((value, key) => {
      if (typeof value === 'string') {
        const lowerValue = value.trim().toLowerCase();
        if (lowerValue === 'true') {
          payloadMap.set(key, true);
        } else if (lowerValue === 'false') {
          payloadMap.set(key, false);
        }
      }
    });
  }
  

  let errorFromKeys = undefined;

  if (payloadMap.size < 1 && (requiredKeys.length > 0 || atLeastOneOptionalProp)) {
    errorFromKeys = {
      status: 'INCORRECT_INSERT_DATA',
      message: 'Request does not contain correct data to insert',
    };
  }
  
  if (!removeDisallowedKeys) {
    const payloadKeys = Array.from(payloadMap.keys()).filter(key => !!payloadMap.has(key));
    const allowedKeysSet = new Set(allowedKeys);
    const providedKeysArePermitted = payloadKeys.every(key => allowedKeysSet.has(key));
    if (!providedKeysArePermitted) {
      errorFromKeys = {
        status: 'UNPERMITTED_PROPERTY',
        message: `Invalid property found in payload. Only these are allowed: ${ allowedKeys }. Found these: ${ payloadKeys }`,
      };
    }
  }

  // Remove all undefined values from the payload.
  payloadMap.forEach((value, key) => {
    if (value === undefined) {
      payloadMap.delete(key);
    }
  });

  const allRequiredKeysExist = requiredKeys.every(requiredKey => payloadMap.has(requiredKey));
  if (!errorFromKeys && !allRequiredKeysExist) {
    errorFromKeys = {
      status: 'MISSING_REQUIRED_PROPERTY',
      message: `Payload is missing a required property. These are required: ${ requiredKeys }`,
    };
  }

  // Check if at least one optional property is required and if so, check if at least one is provided.
  if (!errorFromKeys && (atLeastOneOptionalProp && optionalKeys.length > 0)) {
    const includesOneFromOptional = optionalKeys.some(optionalKey => payloadMap.has(optionalKey));
    if (!includesOneFromOptional) {
      errorFromKeys = {
        status: 'REQUIRES_ONE_OPTIONAL_PROPERTY',
        message: 'Payload requires at least one property to be declared',
      };
    }
  }

  // Convert the payload back into an object.
  const newPayload = Object.fromEntries(payloadMap);

  let validationsErrors = undefined;
  if (!errorFromKeys && propertyValidations?.length) {
    // Validate the payload properties using the property-validator package.
    const validatorResult = propertyValidator(newPayload, propertyValidations);
    if (!validatorResult.valid) {
      validationsErrors = validatorResult?.messages;
    }
  }

  // Check if there are any errors in the payload, then build the response.
  const isValidPayload = !errorFromKeys && !validationsErrors;
  let responseContent = undefined;
  if (!isValidPayload) {
    if (errorFromKeys) { responseContent = errorFromKeys; }
    if (!responseContent && validationsErrors) {
      responseContent = {
        status: 'INVALID_PROPERTY_VALUE',
        message: validationsErrors,
      };
    }
    // Note: This will only ever send a response or do nothing.
    // If the req/res isn't defined, it's not being returned, so nothing happens.
    // The true return is at the bottom.
    returnOrSendResponse(400, responseContent, req, res);
  }

  return {
    valid: isValidPayload,
    properties: newPayload,
    error: !isValidPayload && {
      code: 400,
      responseContent,
    },
  };
};