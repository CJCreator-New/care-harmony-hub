import { describe, it, expect } from 'vitest'
import { Pool } from 'pg'

// Requires TEST_DATABASE_URL env var pointing to a test Postgres/Supabase instance
const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL })

describe('audit_events append-only trigger', () => {
  it('rejects UPDATE and DELETE operations on audit_events', async () => {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      // Insert a test audit row
      const res = await client.query(`INSERT INTO audit_events (event_type, payload) VALUES ($1, $2) RETURNING id`, ['test_event', '{"x":1}'])
      const id = res.rows[0].id

      // Attempt an UPDATE - should raise
      await expect(client.query(`UPDATE audit_events SET payload = $1 WHERE id = $2`, ['{"x":2}', id])).rejects.toThrow()

      // Attempt a DELETE - should raise
      await expect(client.query(`DELETE FROM audit_events WHERE id = $1`, [id])).rejects.toThrow()

      await client.query('ROLLBACK')
    } finally {
      client.release()
    }
  })
})
