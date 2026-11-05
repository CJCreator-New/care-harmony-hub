# Appointment Service

A microservice for managing healthcare appointment scheduling with advanced conflict detection, availability management, and HIPAA compliance.

## Features

- **Advanced Scheduling**: Intelligent appointment scheduling with conflict detection
- **Availability Management**: Provider availability slots and scheduling rules
- **HIPAA Compliance**: Encrypted sensitive data and structured logging
- **Real-time Updates**: Event-driven architecture with Kafka integration
- **Caching**: Redis-based caching for improved performance
- **RESTful API**: Comprehensive REST endpoints for appointment management

## Architecture

### Components

- **Business Logic**: `AppointmentService` handles all appointment operations
- **API Routes**: RESTful endpoints for CRUD operations and search
- **Database**: PostgreSQL with service-specific schema
- **Caching**: Redis for session and data caching
- **Events**: Kafka for inter-service communication
- **Security**: AES-256-GCM encryption and JWT authentication

### Database Schema

- `appointments`: Main appointment records
- `availability_slots`: Provider availability windows
- `scheduling_rules`: Business rules for appointment scheduling

## API Endpoints

### Appointments

- `POST /appointments` - Create new appointment
- `GET /appointments/:id` - Get appointment by ID
- `PUT /appointments/:id` - Update appointment
- `DELETE /appointments/:id` - Cancel appointment (soft delete)
- `GET /appointments` - Search appointments with filters

### Health Check

- `GET /health` - Service health status

## Development

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Kafka 2.8+

### Installation

```bash
npm install
```

### Environment Setup

Create `.env` file:

```env
NODE_ENV=development
PORT=3002
DATABASE_URL=postgresql://user:password@localhost:5432/appointment_service
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-32-byte-encryption-key
HOSPITAL_ID=your-hospital-id
```

### Database Migration

```bash
# Run migrations
npm run migrate
```

### Running the Service

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### Testing

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# All tests
npm test
```

## Docker

### Build and Run

```bash
# Build image
docker build -t appointment-service .

# Run with docker-compose
docker-compose up -d
```

### Environment Variables

Set the following environment variables for Docker:

- `DATABASE_URL`
- `REDIS_URL`
- `KAFKA_BROKERS`
- `JWT_SECRET`
- `ENCRYPTION_KEY`
- `HOSPITAL_ID`

## Security

- All sensitive appointment data is encrypted using AES-256-GCM
- Structured logging with PHI stripping
- Row Level Security (RLS) policies on database tables
- Input validation with Zod schemas
- Rate limiting and CORS protection

## Monitoring

- Health check endpoint at `/health`
- Structured logging with Pino
- Performance metrics collection
- Error tracking and alerting

## Deployment

The service is designed to run in containerized environments with:

- Horizontal scaling capability
- Database connection pooling
- Redis cluster support
- Kafka consumer groups for load balancing

## Contributing

1. Follow the established code patterns
2. Add tests for new features
3. Update documentation
4. Ensure HIPAA compliance
5. Run full test suite before submitting PR

## License

Proprietary - Care Harmony Hub