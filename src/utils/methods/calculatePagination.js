import { optional, isNumeric } from './propertyValidator';
import { sanitizeProperties } from './sanitizeProperties';


export const calculatePagination = (paginationPayload) => {
  const sanitizedPagination = sanitizeProperties(paginationPayload, {
    optionalKeys: [ 'page', 'page_size' ],
    trimPayload: true,
    removeDisallowedKeys: true,
    parseInts: true,
    propertyValidations: [
      optional(isNumeric('page')),
      optional(isNumeric('page_size')),
    ],
  });
  if (!sanitizedPagination.valid) { return sanitizedPagination.error; }
  const { page = 1, page_size = 10 } = sanitizedPagination.properties;

  const generatePagination = (totalItems) => {
    return {
      totalItems: totalItems,
      totalPages: Math.ceil(totalItems / page_size),
      currentPage: page,
      pageSize: page_size,
    };
  };

  return {
    page,
    page_size,
    generatePagination,
  };
};