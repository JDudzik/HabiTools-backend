import { readdirSync } from 'fs';
import path from 'path';
import Knex_Data_Migration from 'knex/models/Knex_Data_Migration';


const relativePath = '../../knex/data_migrations';
const migrationsPath = path.join(__dirname, relativePath);

async function migrateDataLatest() {
  const files = listMigrationFiles();
  const completedMigrations = await listMigrationDatabase();

  await asyncForEach(files, async (file) => {
    const alreadyCompleted = completedMigrations.find(migration => migration.name === file);
    if (!alreadyCompleted) {
      try {
        // eslint-disable-next-line no-console
        console.log(`Running data migration: ${ file }`);
        const migrationScript = require(`${ migrationsPath }/${ file }`);
        const completed = await migrationScript.migrateUp();

        if (completed !== false) {
          await addMigrationToDatabase(file);
        } else {
          // eslint-disable-next-line no-console
          console.log('--!! Migration returned "false", skipped saving !!--');
        }
      } catch (err) {
        throw [ err, 'dataMigrations.migrateDataLatest' ];
      }
    }
  });
}



// //////////// Private Methods ////////////


function listMigrationFiles() {
  return readdirSync(migrationsPath);
}

async function listMigrationDatabase() {
  return await Knex_Data_Migration.query()
    .select('name');
}

async function addMigrationToDatabase(name) {
  return await Knex_Data_Migration.query()
    .insert({
      name: name,
      migration_time: Date.now(),
    });
}

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}


export {
  migrateDataLatest,
};
