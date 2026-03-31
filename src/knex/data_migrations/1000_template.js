/* eslint-disable no-console */
// import Example from '../models/Example';

// eslint-disable-next-line require-await
async function migrateUp() {
  // In case of an issue, throw an error to prevent this migration from saving as finished.
  // return false if you don't want to save as finished without throwing an error (useful during development)
  console.log('--Template migration executed--');

  // EXAMPLE:
  // const numberOfAffectedRows = await Example.query()
  //   .where('age', '<', 50)
  //   .patch({ age: 20 });
}


const migrateDown = undefined;



export {
  migrateUp,
  migrateDown,
};
