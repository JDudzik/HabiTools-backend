import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezonePlugin from 'dayjs/plugin/timezone';


// Extend dayjs with the required plugins
dayjs.extend(utc);
dayjs.extend(timezonePlugin);

const adjustNumber = (base, range, upperLimit = 59) => {
  const min = Math.max(0, base - range);
  const max = Math.min(upperLimit, base + range);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

/**
 * Replace 'SEC(<range>)', 'MIN(<range>)', or 'HOUR(<range>)' with adjusted numbers.
 * @param {string} text - The text containing 'SEC(<range>)', 'MIN(<range>)', or 'HOUR(<range>)'.
 * @param {string} timezone - The timezone to use for calculations.
 * @returns {string} - The text with replacements applied.
 */
export const replaceTimeAdjustments = (text, timezone) => {
  const now = dayjs().tz(timezone);
  return text?.replace?.(
    /SEC\((\d+)\)|MIN\((\d+)\)|HOUR\((\d+)\)/g,
    (match, secRange, minRange, hourRange) => {
      if (secRange) {
        return adjustNumber(now.second(), parseInt(secRange, 10));
      }
      if (minRange) {
        return adjustNumber(now.minute(), parseInt(minRange, 10));
      }
      if (hourRange) {
        return adjustNumber(now.hour(), parseInt(hourRange, 10), 23);
      }
    },
  );
};