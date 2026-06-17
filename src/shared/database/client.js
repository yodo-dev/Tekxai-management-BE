/**
 * Prisma 7 Client Engine requires a Driver Adapter.
 * The adapter passed to PrismaClient must implement the DriverAdapterFactory interface:
 *   adapter.connect() -> Promise<DriverAdapter>
 *
 * This module builds a pg-based factory that satisfies Prisma 7's requirements.
 */
import { PrismaClient } from '@prisma/client';
import pg from 'pg';

const { Pool } = pg;

// Prisma column type constants
const ColumnType = {
  Int32: 0, Int64: 1, Float: 2, Double: 3, Numeric: 4,
  Boolean: 5, Character: 6, Text: 7, Date: 8, Time: 9,
  DateTime: 10, Json: 11, Enum: 12, Bytes: 13, Uuid: 15,
};

const OID_TO_COLUMN_TYPE = {
  16: ColumnType.Boolean,   // bool
  20: ColumnType.Int64,     // int8/bigint
  21: ColumnType.Int32,     // int2/smallint
  23: ColumnType.Int32,     // int4/integer
  25: ColumnType.Text,      // text
  114: ColumnType.Json,     // json
  700: ColumnType.Float,    // float4
  701: ColumnType.Double,   // float8/double
  1042: ColumnType.Character, // char
  1043: ColumnType.Text,    // varchar
  1082: ColumnType.Date,    // date
  1083: ColumnType.Time,    // time
  1114: ColumnType.DateTime,// timestamp
  1184: ColumnType.DateTime,// timestamptz
  1700: ColumnType.Numeric, // numeric/decimal
  2950: ColumnType.Uuid,    // uuid
  3802: ColumnType.Json,    // jsonb
};

function pg_oid_to_prisma_type(oid) {
  return OID_TO_COLUMN_TYPE[oid] ?? ColumnType.Text;
}

async function pg_query_to_result_set(client, sql, args = []) {
  const result = await client.query(sql, args);
  return {
    columnNames: result.fields.map((f) => f.name),
    columnTypes: result.fields.map((f) => pg_oid_to_prisma_type(f.dataTypeID)),
    rows: result.rows.map((row) => result.fields.map((f) => row[f.name])),
    lastInsertId: undefined,
  };
}

function build_connection_adapter(pool_client) {
  return {
    provider: 'postgres',
    adapterName: 'tekxai-pg-adapter',
    options: { usePhantomQuery: false },

    async queryRaw({ sql, args = [] }) {
      return pg_query_to_result_set(pool_client, sql, args);
    },

    async executeRaw({ sql, args = [] }) {
      const result = await pool_client.query(sql, args);
      return result.rowCount || 0;
    },

    async startTransaction(isolationLevel) {
      await pool_client.query('BEGIN');
      if (isolationLevel) {
        await pool_client.query(`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`);
      }
      return {
        provider: 'postgres',
        adapterName: 'tekxai-pg-adapter',
        options: { usePhantomQuery: false },

        async queryRaw({ sql, args = [] }) {
          return pg_query_to_result_set(pool_client, sql, args);
        },

        async executeRaw({ sql, args = [] }) {
          const result = await pool_client.query(sql, args);
          return result.rowCount || 0;
        },

        async commit() {
          await pool_client.query('COMMIT');
          pool_client.release();
        },

        async rollback() {
          try { await pool_client.query('ROLLBACK'); } catch { /* ignore */ }
          pool_client.release();
        },

        async dispose() {
          pool_client.release();
        },
      };
    },

    async dispose() {
      pool_client.release();
    },

    getConnectionInfo() {
      return {
        supportsRelationJoins: true,
        maxBindValues: 32766,
      };
    },
  };
}

/**
 * DriverAdapterFactory — wraps the pg Pool and implements the factory
 * interface that Prisma 7 ClientEngine expects:
 *   factory.connect() -> Promise<DriverAdapter>
 */
function build_driver_adapter_factory(pool) {
  return {
    provider: 'postgres',
    adapterName: 'tekxai-pg-adapter',

    async connect() {
      const client = await pool.connect();
      return build_connection_adapter(client);
    },
  };
}

// ── Initialise ─────────────────────────────────────────────────────────────

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('[db] Idle pg client error:', err.message);
});

const adapter = build_driver_adapter_factory(pool);

const prisma = new PrismaClient({
  adapter,
  log:
    process.env.NODE_ENV === 'development'
      ? ['query', 'warn', 'error']
      : ['error'],
});

export default prisma;
