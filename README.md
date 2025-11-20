# MyShoppingMate Backend

Microservices-based backend for the MyShoppingMate application.

## Architecture

This backend consists of 5 microservices and 4 infrastructure components:

### Infrastructure Services
- **PostgreSQL** - Relational database for users, shopping lists, and prices
- **MongoDB** - Document database for product catalog and price data
- **RabbitMQ** - Message queue for asynchronous data ingestion
- **Traefik** - Reverse proxy and load balancer

### Application Services
- **auth-service** (Port 3000) - User authentication and authorization
- **list-service** (Port 3001) - Shopping list management
- **product-catalog-service** (Port 3002) - Product information and search
- **price-data-service** (Port 3003) - Price tracking and comparison
- **data-ingestion-worker** - Background worker for web scraping

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- At least 4GB of available RAM

### Running the Backend

1. **Start all services:**
   ```bash
   docker-compose up -d
   ```

2. **Build and start (if you made code changes):**
   ```bash
   docker-compose up -d --build
   ```

3. **View logs:**
   ```bash
   docker-compose logs -f
   ```

4. **Stop all services:**
   ```bash
   docker-compose down
   ```

5. **Stop and remove all data:**
   ```bash
   docker-compose down -v
   ```

### Accessing Services

Once running, services are available at:

- **Main API Gateway:** http://localhost:8000
  - Auth endpoints: http://localhost:8000/auth
  - List endpoints: http://localhost:8000/lists
  - Product endpoints: http://localhost:8000/products
  - Price endpoints: http://localhost:8000/prices

- **Traefik Dashboard:** http://localhost:8080
- **RabbitMQ Management:** http://localhost:15672 (user: `rabbitmq`, pass: `rabbitmq_password`)

### For Production Deployment

When deploying to your server at `10.10.20.100`:

1. The Flutter app expects the backend at `http://10.10.20.100:8000`
2. Ensure port 8000 is accessible from your network
3. **IMPORTANT:** Change the default passwords in `docker-compose.yml`:
   - `POSTGRES_PASSWORD`
   - `MONGO_INITDB_ROOT_PASSWORD`
   - `RABBITMQ_DEFAULT_PASS`
   - `JWT_SECRET`

## Development

### Service Structure

Each service follows this structure:
```
services/[service-name]/
├── src/
│   ├── api/          # Route handlers and controllers
│   ├── config/       # Configuration
│   ├── data/         # Database models and connections
│   ├── services/     # Business logic
│   └── index.ts      # Entry point
├── Dockerfile
├── package.json
└── tsconfig.json
```

### Database Initialization

The PostgreSQL database is automatically initialized with the schema from:
- `infrastructure/postgres/01-init-schema.sql`

This creates:
- Users table
- Shopping lists table
- Stores table
- Prices table (time-series data)

### Health Checks

All infrastructure services have health checks configured. Services will wait for their dependencies to be healthy before starting.

## Troubleshooting

### Services won't start
```bash
# Check service logs
docker-compose logs [service-name]

# Restart a specific service
docker-compose restart [service-name]
```

### Database connection errors
```bash
# Check if databases are healthy
docker-compose ps

# Restart database services
docker-compose restart postgres mongo
```

### Port conflicts
If ports 5432, 27017, 5672, 8000, or 8080 are already in use, modify the port mappings in `docker-compose.yml`.

### Orphaned containers
```bash
# Clean up old containers
docker-compose down --remove-orphans
```

## Environment Variables

See `.env.example` for all available environment variables.

## Security Notes

⚠️ **The default configuration uses weak passwords for development only.**

For production:
1. Use strong, unique passwords
2. Store secrets in environment variables or a secrets manager
3. Enable HTTPS/TLS
4. Configure proper CORS settings
5. Review and update rate limiting settings
6. Use a proper JWT secret (at least 32 random characters)
