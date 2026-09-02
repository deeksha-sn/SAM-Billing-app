import { seedDatabase } from '../src/seed';

seedDatabase()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
