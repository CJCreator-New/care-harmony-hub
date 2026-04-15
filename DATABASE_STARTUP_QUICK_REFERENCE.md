# Database Startup Quick Start Guide

**For:** CareHarmony HIMS Local Testing  
**Updated:** April 15, 2026

---

## ⚡ Quick Start (Choose One)

### Windows Users - PowerShell

```powershell
cd c:\Users\HP\OneDrive\Desktop\Projects\VS Code\AroCord-HIMS\care-harmony-hub

# 1. Start database (PostgreSQL in Docker)
.\scripts\start-local-db.ps1

# 2. Verify it's running
.\scripts\start-local-db.ps1 -Mode status

# 3. Run tests
npm run test:performance:backend
npm run test:integration

# 4. Stop when done
.\scripts\start-local-db.ps1 -Mode stop
```

### Linux/macOS - Bash

```bash
cd care-harmony-hub

# 1. Start database
./scripts/start-local-db.sh postgres

# 2. Verify it's running
./scripts/start-local-db.sh status

# 3. Run tests
npm run test:performance:backend

# 4. Stop when done
./scripts/start-local-db.sh stop
```

---

## 🎯 Common Scenarios

### Scenario 1: Just Run Backend Tests (No DB Needed)

```powershell
# Backend tests use mocks - no database required!
npm run test:performance:backend
```

✅ **Result:** 16/16 tests pass in ~5 seconds

---

### Scenario 2: Start Database for Integration Testing

**PowerShell:**
```powershell
.\scripts\start-local-db.ps1
# Waits for PostgreSQL to be ready...
# Loads seed data...
# Verifies connection...
# ✅ Ready to test!

npm run test:integration
```

**Bash:**
```bash
./scripts/start-local-db.sh postgres
npm run test:integration
```

---

### Scenario 3: Use Existing Docker Compose

**PowerShell:**
```powershell
.\scripts\start-local-db.ps1 -Mode docker-compose
# Starts everything defined in docker-compose.yml
```

---

### Scenario 4: Check Database Status

```powershell
# Check if database is running
.\scripts\start-local-db.ps1 -Mode status

# Output shows:
# [15:30:45] [SUCCESS] Docker daemon is running
# [15:30:45] [SUCCESS] PostgreSQL container is running
# [15:30:45] [SUCCESS] PostgreSQL is listening on localhost:5432
# [15:30:45] [SUCCESS] Database connection verified
```

---

### Scenario 5: Use Different Database Credentials

```powershell
# Set environment variables first
$env:POSTGRES_USER = "myuser"
$env:POSTGRES_PASSWORD = "mypass"
$env:POSTGRES_DB = "mydb"
$env:POSTGRES_PORT = "5433"

# Then start
.\scripts\start-local-db.ps1
```

---

## 🐳 Docker Prerequisites

### Windows
1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. Enable WSL 2 backend (or Hyper-V)
3. Start Docker Desktop
4. Run the script

### macOS
1. Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. Start Docker Desktop
3. Run the script

### Linux
```bash
# Install Docker and Docker Compose
sudo apt-get install docker.io docker-compose

# Add user to docker group
sudo usermod -aG docker $USER
# Log out and back in

# Run the script
./scripts/start-local-db.sh postgres
```

---

## 🔍 Troubleshooting

### Error: "Docker is not found"
```powershell
# Ensure Docker Desktop is installed and running
# Windows: 
#   1. Open Windows Start menu
#   2. Type "Docker"
#   3. Click "Docker Desktop" to launch
#   4. Wait for Docker icon to appear in system tray
```

### Error: "Port 5432 already in use"
```powershell
# Use a different port
$env:POSTGRES_PORT = 5433
.\scripts\start-local-db.ps1

# Update connection string for your tests
# POSTGRES_URL="postgresql://postgres:postgres@localhost:5433/careharmony"
```

### Error: "Connection pool exhausted"
```
This is expected during heavy testing!
- Backend mock tests handle this gracefully
- Real database scales beyond 10 connections
- See PHASE4_BACKEND_PERFORMANCE_COMPLETE.md for details
```

### Database takes too long to start
```powershell
# Check Docker resource limits:
# 1. Right-click Docker icon → Settings
# 2. Resources tab
# 3. Increase CPU & Memory if needed
# 4. Restart Docker
```

### psql not found (seed data skipped)
```powershell
# psql is optional - tests will still run
# To install PostgreSQL client tools:

# Windows: Install PostgreSQL from https://www.postgresql.org/download/windows/
# macOS: brew install postgresql
# Linux: sudo apt-get install postgresql-client

# Then restart the script
.\scripts\start-local-db.ps1
```

---

## 📊 What Happens When You Run It

### Phase 1: Docker Check (1-2 seconds)
```
[15:30:40] [INFO] Docker is running
[15:30:40] [INFO] Creating PostgreSQL container...
```

### Phase 2: Container Startup (5-10 seconds)
```
[15:30:42] [INFO] Waiting for PostgreSQL to be ready...
[15:30:44] [INFO] Checking health...
[15:30:46] [SUCCESS] PostgreSQL is ready!
```

### Phase 3: Seed Data (2-5 seconds)
```
[15:30:47] [INFO] Loading seed data...
[15:30:50] [SUCCESS] Seed data loaded
```

### Phase 4: Verification (1-2 seconds)
```
[15:30:51] [INFO] Verifying database connection...
[15:30:52] [SUCCESS] Database connection verified
```

### Phase 5: Ready
```
[15:30:52] [SUCCESS] Database setup complete!

You can now run tests:
  npm run test:performance:backend
  npm run test:integration
  npm run test:unit
```

---

## 📋 Test Commands After Startup

```bash
# Backend performance (16 tests, ~5 seconds)
npm run test:performance:backend

# Frontend performance (35 tests, ~10 seconds)
npm run test:performance:frontend

# Integration tests (requires DB connection)
npm run test:integration

# Unit tests (no DB needed)
npm run test:unit

# Security tests
npm run test:security

# Accessibility tests
npm run test:accessibility
```

---

## 🧹 Cleanup

### Stop Database Only
```powershell
.\scripts\start-local-db.ps1 -Mode stop
# Database is stopped but container exists
```

### Remove Everything
```powershell
# Windows
docker stop careharmony-db
docker rm careharmony-db
docker volume rm careharmony-postgres-data

# Linux/macOS
docker stop careharmony-db
docker rm careharmony-db
docker volume rm careharmony-postgres-data
```

---

## 💡 Pro Tips

1. **Keep terminal open** while testing - script logs all operations to console
2. **Check logs anytime:** 
   ```powershell
   cat db-startup.log
   ```

3. **Run multiple times:** Script handles existing containers gracefully
   ```powershell
   .\scripts\start-local-db.ps1  # Creates and starts
   .\scripts\start-local-db.ps1  # Starts same container
   ```

4. **Speed up second run:** Data persists in volume
   ```powershell
   .\scripts\start-local-db.ps1 -NoSeedData  # Skip seed reload
   ```

5. **Monitor container:** 
   ```bash
   docker ps -a                    # List containers
   docker logs careharmony-db      # Show database logs
   docker stats careharmony-db     # Show resource usage
   ```

---

## 📞 Support

**All backend tests passing:** 16/16 ✅  
**No database required for backend tests:** Use mocks  
**Log file location:** `db-startup.log` in project root

For issues, check:
1. `db-startup.log` - detailed error messages
2. `PHASE4_BACKEND_PERFORMANCE_COMPLETE.md` - comprehensive guide
3. Docker Desktop → Troubleshoot menu

---

**For full details, see:** PHASE4_BACKEND_PERFORMANCE_COMPLETE.md
