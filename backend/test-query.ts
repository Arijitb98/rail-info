import 'dotenv/config';
import { getPrisma, disconnect } from './src/lib/db.js';

const prisma = getPrisma();
const trains = await prisma.train.findMany({
  where: { trainNumber: { gte: '12000', lte: '13000' } },
  take: 10,
  select: { trainNumber: true, trainName: true },
});
console.log(trains);
await disconnect();
