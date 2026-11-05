# Patient Service

A microservice for managing patient records in the CareSync AI HIMS system. This service provides RESTful APIs for patient CRUD operations with HIPAA compliance, encryption, and event-driven architecture.

## Features

- **Patient Management**: Complete CRUD operations for patient records
- **HIPAA Compliance**: Data encryption and secure logging
- **Event-Driven**: Kafka integration for inter-service communication
- **Caching**: Redis-based caching for improved performance
- **Authentication**: JWT-based authentication with role-based access
- **API Documentation**: OpenAPI/Swagger documentation
- **Health Checks**: Comprehensive health monitoring endpoints

## Architecture

- **Framework**: Fastify (high-performance Node.js web framework)
- **Database**: PostgreSQL with connection pooling
- **Cache**: Redis for session and data caching
- **Message Queue**: Apache Kafka for event streaming
- **Validation**: Zod schemas for type-safe validation
- **Logging**: Pino with HIPAA-compliant sanitization

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Apache Kafka 3.0+

### Installation

1. Clone the repository and navigate to the service:
   ```bash
   cd services/patient-service
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Start infrastructure (using Docker Compose):
   ```bash
   docker-compose up -d postgres redis kafka
   ```

5. Run database migrations:
   ```bash
   npm run migrate
   ```

6. Start the service:
   ```bash
   npm run dev
   ```

The service will be available at `http://localhost:3001`

## API Endpoints

### Patient Management

- `GET /health` - Health check
- `GET /ready` - Readiness check
- `POST /api/v1/patients` - Create patient
- `GET /api/v1/patients/:id` - Get patient by ID
- `PUT /api/v1/patients/:id` - Update patient
- `DELETE /api/v1/patients/:id` - Delete patient (soft delete)
- `GET /api/v1/patients` - Search patients with filtering and pagination

### Authentication

All patient endpoints require JWT authentication. Include the Authorization header:
```
Authorization: Bearer <jwt-token>
```

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run migrate` - Run database migrations
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run docker:build` - Build Docker image
- `npm run docker:run` - Run with Docker Compose

### Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

### Code Quality

```bash
# Lint code
npm run lint

# Fix linting issues
npm run lint:fix

# Type check
npm run type-check
```

## Database Schema

The service uses a dedicated PostgreSQL database with the following main table:

### patients

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| hospital_id | UUID | Hospital identifier |
| medical_record_number | VARCHAR(50) | Unique medical record number |
| first_name | VARCHAR(100) | Patient first name |
| last_name | VARCHAR(100) | Patient last name |
| date_of_birth | TIMESTAMP | Date of birth |
| gender | VARCHAR(20) | Patient gender |
| email | VARCHAR(255) | Email address |
| phone | VARCHAR(20) | Phone number |
| address | JSONB | Address information |
| emergency_contact | JSONB | Emergency contact details |
| insurance_info | JSONB | Insurance information |
| medical_history | JSONB | Medical history array |
| allergies | JSONB | Allergies array |
| current_medications | JSONB | Current medications array |
| vital_signs | JSONB | Latest vital signs |
| status | VARCHAR(20) | Patient status |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |
| created_by | UUID | User who created the record |
| updated_by | UUID | User who last updated the record |
| encrypted_data | TEXT | Encrypted sensitive data |

## Security

### HIPAA Compliance

- **Data Encryption**: Sensitive patient data is encrypted using AES-256-GCM
- **Access Logging**: All access is logged with PHI sanitization
- **Row Level Security**: Database-level access controls
- **Audit Trail**: Complete audit logging for all changes

### Authentication & Authorization

- JWT-based authentication
- Role-based access control (RBAC)
- Hospital-scoped data access
- Rate limiting protection

## Monitoring

### Health Checks

- `/health` - Basic health check
- `/ready` - Readiness check including database connectivity

### Metrics

The service exposes metrics for:
- Request/response times
- Error rates
- Database connection pool status
- Cache hit/miss ratios
- Kafka message processing

## Deployment

### Docker

```bash
# Build image
docker build -t patient-service .

# Run container
docker run -p 3001:3001 patient-service
```

### Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f patient-service

# Stop services
docker-compose down
```

### Production Considerations

- Use environment-specific configuration
- Enable SSL/TLS for all connections
- Configure proper resource limits
- Set up monitoring and alerting
- Implement backup strategies
- Use managed database services

## Event Streaming

The service publishes events to Kafka topics:

- `patient.created` - When a new patient is created
- `patient.updated` - When patient data is modified
- `patient.deleted` - When a patient is deleted

## Contributing

1. Follow the established code style and conventions
2. Write tests for new features
3. Update documentation as needed
4. Ensure HIPAA compliance for any data handling changes
5. Run the full test suite before submitting PRs

## License

This service is part of the CareSync AI HIMS system. See the main project license for details.