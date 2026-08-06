import pg from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });

async function main() {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT count(*) FROM "KnowledgeEmbedding"');
    console.log('✅ FINAL VECTOR COUNT:', res.rows[0].count);
    client.release();
  } catch (e) {
    console.error('Error connecting to DB:', e.message);
  } finally {
    await pool.end();
  }
}

main();
