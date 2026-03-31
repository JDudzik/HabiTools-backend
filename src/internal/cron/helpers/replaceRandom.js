/**
 * Replace 'RAND()' or 'RAND(min,max)' with a random number in the specified range.
 * @param {string} text - The text containing 'RAND()' or 'RAND(min,max)'.
 * @returns {string} - The text with 'RAND()' replaced by a random number.
 */
export const replaceRandom = (text) => {
  return text?.replace?.(
    /RAND\((\d+),\s*(\d+)\)|RAND\(\)/g,
    (_match, min, max) => {
      const lower = min ? parseInt(min, 10) : 0;
      const upper = max ? parseInt(max, 10) : 59;
      return Math.floor(Math.random() * (upper - lower + 1)) + lower;
    },
  );
};