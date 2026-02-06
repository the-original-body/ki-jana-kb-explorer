# D1 Database Migrations

Place SQL migration files here. Files are applied in alphabetical order.

## Naming Convention
```
YYYYMMDDHHMMSS_description.sql
```

Example: `20240109120000_create_users_table.sql`

## Creating Migrations
```bash
# Generate timestamp
TIMESTAMP=$(date +"%Y%m%d%H%M%S")

# Create migration file
echo "-- Add your SQL here" > migrations/${TIMESTAMP}_your_description.sql
```

## Best Practices
- Use `CREATE TABLE IF NOT EXISTS` for idempotency
- Use text-based IDs (UUID/CUID) instead of AUTOINCREMENT
- Test locally: `npx wrangler d1 execute DB --local --file migrations/your_file.sql`

## Resources
- [D1 Documentation](https://developers.cloudflare.com/d1/)
- [D1 Migrations](https://developers.cloudflare.com/d1/platform/migrations/)