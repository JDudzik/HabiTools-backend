/* eslint-disable require-await */
/* eslint-disable default-param-last */
export const asyncArray = async (method, array = [], callback) => Promise.all(array[method](callback));