import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezonePlugin from 'dayjs/plugin/timezone';


// Extend dayjs with the required plugins
dayjs.extend(utc);
dayjs.extend(timezonePlugin);

/**
 * Replace 'DELAY(minuteDuration,hourDuration)' with computed "<minute> <hour>" cron segments.
 * @param {string} text - The text containing one or more 'DELAY(minuteDuration,hourDuration)' tokens.
 * @param {string} timezone - The timezone used for calculating the future time.
 * @returns {string} - The text with each token replaced by "<minute> <hour>".
 */
export const replaceDelay = (text, timezone) => {
  const now = dayjs().tz(timezone);

  return text?.replace?.(
    /DELAY\((\d+),\s*(\d+)\)/g,
    (_match, minuteDuration, hourDuration) => {
      const parsedMinuteDuration = Number.parseInt(minuteDuration, 10) || 0;
      const parsedHourDuration = Number.parseInt(hourDuration, 10) || 0;

      const futureTime = now
        .add(parsedHourDuration, 'hour')
        .add(parsedMinuteDuration, 'minute');

      return `${ futureTime.minute() } ${ futureTime.hour() }`;
    },
  );
};