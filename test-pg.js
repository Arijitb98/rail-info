const { Pool } = require('pg');
const fs = require('fs');

async function main() {
  const env = process.env;
  const connectionString = env.DATABASE_URL;
  const caPath = env.DATABASE_CA_CERT_PATH || '.secrets/ca.pem';

  console.log('Using CA path:', caPath);
  let ca;
  try {
    ca = fs.readFileSync(caPath, 'utf8');
  } catch (err) {
    console.error('Failed to read CA file:', err.message);
  }

  // Try different CA formats: string, array, Buffer
  const attempts = [
    { desc: 'string', ssl: ca ? { rejectUnauthorized: true, ca } : { rejectUnauthorized: false } },
    { desc: 'array', ssl: ca ? { rejectUnauthorized: true, ca: [ca] } : { rejectUnauthorized: false } },
    { desc: 'buffer', ssl: ca ? { rejectUnauthorized: true, ca: Buffer.from(ca) } : { rejectUnauthorized: false } },
  ];

  for (const attempt of attempts) {
    console.log('Trying CA format:', attempt.desc);
    const pool = new Pool({ connectionString, ssl: attempt.ssl });
    try {
      const res = await pool.query('select version() as v');
      console.log(`[${attempt.desc}] Connected, pg version:`, res.rows[0].v);
      await pool.end();
      return;
    } catch (err) {
      console.error(`[${attempt.desc}] Connection error:`, err && err.message ? err.message : err);
      await pool.end();
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
