export * from 'property-validator';
import { validate as propertyValidator } from 'property-validator';

// Note: This file wraps "property-validator" as well as
// provide some custom validators.

/**
 * Validator for properties that are expected to be arrays. Takes in a validator function that will be applied to each element of the array.
 * @param {string} paramName - The name of the property to validate
 * @param {function} validator - The validator function to apply to each element of the array
 * @param  {...any} validatorArgs - Additional arguments to pass to the validator function
 * @returns {object} An object with a "valid" boolean and an optional "message" if invalid
 */
export const arrayOf = (paramName, validator, ...validatorArgs) => {
  return (payload) => {
    const array = payload[paramName];
    if (!Array.isArray(array)) {
      return {
        valid: false,
        field: paramName,
        message: `"${ paramName }" must be an array.`,
      };
    }

    for (let i = 0; i < array.length; i++) {
      const element = array[i];
      const validationResult = propertyValidator({ [paramName]: element }, [
        validator(paramName, ...validatorArgs),
      ]);

      if (!validationResult.valid) {
        return {
          result: false,
          message: `${ validationResult.messages[0] }`,
          field: paramName,
        };
      }
    }

    return { result: true };
  };
};

export const isBoolean = (paramName, message) => {
  return (payload) => {
    const value = payload[paramName];
    if (typeof value !== 'boolean') {
      return {
        valid: false,
        field: paramName,
        message: message || `"${ paramName }" must be a boolean.`,
      };
    }
    return { valid: true };
  };
};