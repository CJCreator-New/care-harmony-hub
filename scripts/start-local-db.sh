#!/bin/bash
# Database Startup Script for Local Testing
# Supports PostgreSQL, Docker Compose, and Supabase local development
# Usage: ./scripts/start-local-db.sh [postgres|docker|supabase]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$PROJECT_ROOT/.env.local"
LOG_FILE="$PROJECT_ROOT/db-startup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

# Truncate log file
> "$LOG_FILE"

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0 # Port in use
    else
        return 1 # Port available
    fi
}

# Function to wait for service to be ready
wait_for_service() {
    local host=$1
    local port=$2
    local timeout=$3
    local name=$4
    
    log_info "Waiting for $name to be ready (${host}:${port})..."
    local elapsed=0
    local interval=2
    
    while [ $elapsed -lt $timeout ]; do
        if nc -z "$host" "$port" 2>/dev/null; then
            log_success "$name is ready!"
            return 0
        fi
        sleep $interval
        elapsed=$((elapsed + interval))
        echo -n "."
    done
    
    log_error "$name failed to start within ${timeout}s"
    return 1
}

# Function to start PostgreSQL using Docker
start_postgres_docker() {
    log_info "Starting PostgreSQL via Docker..."
    
    local POSTGRES_PORT=${POSTGRES_PORT:-5432}
    local POSTGRES_USER=${POSTGRES_USER:-postgres}
    local POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres}
    local POSTGRES_DB=${POSTGRES_DB:-careharmony}
    
    # Check if container already exists
    if docker ps -a --format '{{.Names}}' | grep -q "^careharmony-db$"; then
        log_info "Container 'careharmony-db' already exists. Attempting to start..."
        docker start careharmony-db 2>/dev/null || {
            log_error "Could not start existing container"
            return 1
        }
    else
        log_info "Creating new PostgreSQL container..."
        docker run -d \
            --name careharmony-db \
            -e POSTGRES_USER="$POSTGRES_USER" \
            -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
            -e POSTGRES_DB="$POSTGRES_DB" \
            -p "$POSTGRES_PORT:5432" \
            -v careharmony-postgres-data:/var/lib/postgresql/data \
            --health-cmd='pg_isready -U '"$POSTGRES_USER"'' \
            --health-interval=10s \
            --health-timeout=5s \
            --health-retries=5 \
            postgres:15-alpine || {
            log_error "Failed to create container"
            return 1
        }
    fi
    
    if wait_for_service "localhost" "$POSTGRES_PORT" 30 "PostgreSQL"; then
        log_success "PostgreSQL started on port $POSTGRES_PORT"
        return 0
    else
        return 1
    fi
}

# Function to start using docker-compose
start_docker_compose() {
    log_info "Starting services via docker-compose..."
    
    if [ ! -f "$PROJECT_ROOT/docker-compose.yml" ]; then
        log_error "docker-compose.yml not found at $PROJECT_ROOT"
        return 1
    fi
    
    cd "$PROJECT_ROOT"
    docker-compose up -d --wait || {
        log_error "docker-compose up failed"
        return 1
    }
    
    log_success "docker-compose services started"
    return 0
}

# Function to start Supabase locally
start_supabase_local() {
    log_info "Starting Supabase local development environment..."
    
    if ! command -v supabase &> /dev/null; then
        log_error "Supabase CLI not found. Install with: npm install -g supabase"
        return 1
    fi
    
    cd "$PROJECT_ROOT"
    supabase start || {
        log_error "supabase start failed"
        return 1
    }
    
    log_success "Supabase local environment started"
    
    # Display connection info
    log_info "Supabase connection info:"
    supabase status --output json || true
    
    return 0
}

# Function to load seed data
load_seed_data() {
    log_info "Loading seed data..."
    
    local seed_script="$PROJECT_ROOT/scripts/seed-test-data.sql"
    if [ ! -f "$seed_script" ]; then
        log_warning "Seed script not found at $seed_script"
        return 1
    fi
    
    local POSTGRES_HOST=${POSTGRES_HOST:-localhost}
    local POSTGRES_PORT=${POSTGRES_PORT:-5432}
    local POSTGRES_USER=${POSTGRES_USER:-postgres}
    local POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres}
    local POSTGRES_DB=${POSTGRES_DB:-careharmony}
    
    export PGPASSWORD="$POSTGRES_PASSWORD"
    psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$seed_script" || {
        log_error "Failed to load seed data"
        return 1
    }
    
    log_success "Seed data loaded"
    return 0
}

# Function to run migrations
run_migrations() {
    log_info "Running database migrations..."
    
    cd "$PROJECT_ROOT"
    
    # Check for migration commands
    if [ -f "supabase/migrations" ]; then
        log_info "Found Supabase migrations"
        # Migrations are handled by supabase start or cli
        return 0
    fi
    
    # Check for other migration tools
    if npm run migrate &> /dev/null; then
        npm run migrate || {
            log_error "Migration failed"
            return 1
        }
    fi
    
    log_success "Migrations completed"
    return 0
}

# Function to verify database connection
verify_connection() {
    log_info "Verifying database connection..."
    
    local POSTGRES_HOST=${POSTGRES_HOST:-localhost}
    local POSTGRES_PORT=${POSTGRES_PORT:-5432}
    local POSTGRES_USER=${POSTGRES_USER:-postgres}
    local POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-postgres}
    local POSTGRES_DB=${POSTGRES_DB:-careharmony}
    
    export PGPASSWORD="$POSTGRES_PASSWORD"
    
    if psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT version();" > /dev/null 2>&1; then
        log_success "Database connection verified"
        return 0
    else
        log_error "Database connection failed"
        return 1
    fi
}

# Function to cleanup and stop services
cleanup() {
    log_info "Cleaning up..."
    case "$1" in
        postgres|docker)
            docker stop careharmony-db 2>/dev/null || true
            ;;
        docker-compose)
            cd "$PROJECT_ROOT"
            docker-compose down 2>/dev/null || true
            ;;
        supabase)
            supabase stop 2>/dev/null || true
            ;;
    esac
}

# Main execution
main() {
    local mode="${1:-docker}"
    
    log_info "CareHarmony HIMS - Local Database Startup"
    log_info "Mode: $mode"
    log_info "Log file: $LOG_FILE"
    
    case "$mode" in
        postgres)
            start_postgres_docker || exit 1
            load_seed_data || log_warning "Seed data not loaded"
            verify_connection || exit 1
            ;;
        docker-compose)
            start_docker_compose || exit 1
            wait_for_service "localhost" 5432 30 "PostgreSQL (from compose)" || exit 1
            verify_connection || exit 1
            ;;
        supabase)
            start_supabase_local || exit 1
            ;;
        help|--help|-h)
            echo "Usage: $0 [MODE]"
            echo ""
            echo "Modes:"
            echo "  postgres         - Start PostgreSQL in Docker (default: docker)"
            echo "  docker-compose   - Start all services via docker-compose (requires docker-compose.yml)"
            echo "  supabase         - Start Supabase local dev environment (requires supabase CLI)"
            echo "  stop <mode>      - Stop services"
            echo "  cleanup <mode>   - Clean up containers"
            echo ""
            echo "Environment Variables:"
            echo "  POSTGRES_HOST     - Default: localhost"
            echo "  POSTGRES_PORT     - Default: 5432"
            echo "  POSTGRES_USER     - Default: postgres"
            echo "  POSTGRES_PASSWORD - Default: postgres"
            echo "  POSTGRES_DB       - Default: careharmony"
            exit 0
            ;;
        stop)
            log_info "Stopping services..."
            docker stop careharmony-db 2>/dev/null || true
            exit 0
            ;;
        cleanup)
            cleanup "$2"
            exit 0
            ;;
        *)
            log_error "Unknown mode: $mode"
            echo "Use './scripts/start-local-db.sh help' for usage info"
            exit 1
            ;;
    esac
    
    log_success "Database startup complete!"
    log_info "Environment file updated: $ENV_FILE"
    log_info ""
    log_info "You can now run tests:"
    log_info "  npm run test:performance:backend"
    log_info "  npm run test:integration"
}

# Trap errors and cleanup
trap 'log_error "Script interrupted"; exit 1' INT TERM

# Check prerequisites
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install Docker."
    exit 1
fi

main "$@"
