# Database Schema Documentation

This directory contains the Prisma schema and migrations for the Restaurant Management System.

## Database Support

The application supports both **SQLite** (default) and **PostgreSQL** databases.

### SQLite (Default)

SQLite is configured by default for local development and single-restaurant deployments.

**Configuration:**
- Schema file: `schema.prisma`
- Database file: `restaurant.db` (created automatically)
- Connection string: `file:./restaurant.db`

**Limitations:**
- Uses `String` for enum types (validated in application code)
- Uses `Float` for decimal values (precision handled in application)

### PostgreSQL (Production)

PostgreSQL is recommended for production deployments with multiple locations or cloud hosting.

**Configuration:**
1. Copy `schema.postgresql.prisma` to `schema.prisma` (backup the SQLite version first)
2. Update `.env` with PostgreSQL connection string:
   ```
   DATABASE_URL="postgresql://username:password@localhost:5432/restaurant_db?schema=public"
   ```
3. Run migrations: `npm run prisma:migrate`

**Benefits:**
- Native enum types for better type safety
- Decimal type with precision for monetary values
- Better performance for large datasets
- Support for concurrent connections

## Schema Overview

### Models

- **User**: Staff accounts with role-based access (Admin, Waiter, Chef)
- **Table**: Restaurant tables with QR codes and status tracking
- **MenuItem**: Menu items with categories, pricing, and availability
- **Order**: Customer orders with status tracking and calculations
- **OrderItem**: Individual items within an order
- **Payment**: Payment records with method and reference
- **Setting**: Key-value store for application configuration

### Enums (String values in SQLite, native enums in PostgreSQL)

- **Role**: ADMIN, WAITER, CHEF
- **TableStatus**: FREE, OCCUPIED, RESERVED
- **OrderStatus**: PENDING, PREPARING, READY, SERVED, PAID, CANCELLED
- **PaymentMethod**: CASH, CARD, WALLET

### Indexes

Performance indexes are configured on:
- `MenuItem`: category, available
- `Order`: tableId, status, createdAt
- `OrderItem`: orderId
- `Payment`: createdAt

## Commands

```bash
# Generate Prisma Client
npm run prisma:generate

# Create a new migration
npm run prisma:migrate

# Open Prisma Studio (database GUI)
npm run prisma:studio

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# Push schema changes without migration (development only)
npx prisma db push
```

## Migration Files

Migrations are stored in `migrations/` directory with timestamps. Each migration contains:
- `migration.sql`: SQL statements to apply the migration
- Automatic rollback support via Prisma

## Type Safety

TypeScript enum types are defined in `packages/shared/src/types/enums.ts` to maintain type safety across the application, regardless of the database provider.

## Switching Databases

### From SQLite to PostgreSQL

1. Backup your SQLite database:
   ```bash
   cp restaurant.db restaurant.db.backup
   ```

2. Export data (if needed):
   ```bash
   npx prisma db pull
   ```

3. Replace schema:
   ```bash
   cp prisma/schema.prisma prisma/schema.sqlite.prisma
   cp prisma/schema.postgresql.prisma prisma/schema.prisma
   ```

4. Update `.env` with PostgreSQL connection string

5. Run migrations:
   ```bash
   npm run prisma:migrate
   ```

### From PostgreSQL to SQLite

1. Replace schema:
   ```bash
   cp prisma/schema.prisma prisma/schema.postgresql.prisma
   cp prisma/schema.sqlite.prisma prisma/schema.prisma
   ```

2. Update `.env`:
   ```
   DATABASE_URL="file:./restaurant.db"
   ```

3. Run migrations:
   ```bash
   npm run prisma:migrate
   ```

## Best Practices

1. **Always backup** before switching databases or running migrations
2. **Test migrations** in development before applying to production
3. **Use transactions** for data integrity in application code
4. **Monitor indexes** for query performance
5. **Regular backups** via the Settings page in the application

## Troubleshooting

### Migration Conflicts

If you encounter migration conflicts:
```bash
npx prisma migrate resolve --rolled-back <migration-name>
npx prisma migrate deploy
```

### Schema Out of Sync

If schema and database are out of sync:
```bash
npx prisma db push
```

### Reset Everything

To start fresh (WARNING: deletes all data):
```bash
npx prisma migrate reset
```
