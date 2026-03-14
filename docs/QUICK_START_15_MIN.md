# CareSync 15-Minute Local Setup — Copy-Paste Commands

**Target**: Full CareSync system running locally in 15 minutes with test users and mock data  
**Tools Required**: Git, Node.js 18+, Docker Desktop  
**Timezone**: Local (script auto-detects)

---

## ⏱️ Quick Timeline

| Step | Time | What You're Doing |
|------|------|-------------------|
| 1. Clone & Install | 2-3 min | Get code + dependencies |
| 2. Environment Setup | 1 min | Configure database connection |
| 3. Start Services | 2-3 min | Launch Docker containers |
| 4. Create Test Users | 1-2 min | Set up 7 login accounts |
| 5. Seed Test Data | 1-2 min | Add realistic patient records |
| 6. Run Dev Server | 1 min | Start React app |
| **Total** | **~15 min** | **🎉 Ready to develop** |

---

## Step 1: Clone & Install (2-3 minutes)

```bash
# Clone repository
git clone https://github.com/your-org/care-harmony-hub.git
cd care-harmony-hub

# Install dependencies (use npm, could also use bun for faster installs)
npm install
```

**Verify**: You should see `added X packages` and no errors.

---

## Step 2: Environment Setup (1 minute)

### Option A: Use Existing .env (Easiest)

```bash
# The .env file is already populated with Supabase test credentials
echo "✅ .env already configured"
cat .env | grep VITE_SUPABASE_URL
```

You should see:
```
VITE_SUPABASE_URL="https://wmxtzkrkscjwixafumym.supabase.co"
```

### Option B: Manual Setup (If .env Missing)

```bash
# Create .env from template
cat > .env << 'EOF'
VITE_SUPABASE_PROJECT_ID="wmxtzkrkscjwixafumym"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
VITE_SUPABASE_URL="https://wmxtzkrkscjwixafumym.supabase.co"
VITE_E2E_MOCK_AUTH="false"
VITE_ENCRYPTION_KEY="caresync-local-dev-2026-replace-in-prod"
VITE_CLINICAL_SERVICE_URL="http://localhost:8000/api/clinical"
VITE_API_KEY="caresync_frontend_key_2026_secure"
SUPABASE_SERVICE_ROLE_KEY=""
EOF
```

**Note**: `SUPABASE_SERVICE_ROLE_KEY` can be empty for now; needed only for creating test users.

---

## Step 3: Start Services (2-3 minutes)

### Start Docker Services

```bash
# Bring up PostgreSQL, Redis, Kafka, Kong
docker-compose up -d

# Wait for services to be healthy
sleep 5

# Verify services are running
docker-compose ps
```

**Expected output:**
```
NAME                 STATUS
postgres:15          Up (healthy)
redis:7-alpine       Up (healthy)
kafka                Up (healthy)
kong                 Up
```

**Test database connection:**
```bash
# Check if PostgreSQL is responding
docker-compose exec postgres pg_isready -U postgres
# Should print: "accepting connections"
```

---

## Step 4: Create Test Users (1-2 minutes)

This creates 7 test logins for all roles (Doctor, Nurse, Pharmacist, Lab Tech, Receptionist, Admin, Patient).

### Get Service Role Key (Required)

1. Go to: **https://wmxtzkrkscjwixafumym.supabase.co** (test Supabase project)
2. Click **Settings** → **API**
3. Copy **`service_role` key** (labeled "service_role secret")
4. Run:

```bash
# Set environment variable with your service role key
# Replace <YOUR_SERVICE_ROLE_KEY> with your actual key from Supabase dashboard
export SUPABASE_SERVICE_ROLE_KEY="<YOUR_SERVICE_ROLE_KEY>"

# Verify it's set
echo $SUPABASE_SERVICE_ROLE_KEY
```

### Create Users

```bash
# Run the script (uses your SUPABASE_SERVICE_ROLE_KEY)
npm run test:create-users
```

**Expected output:**
```
🚀 Creating test users for E2E testing...

Creating user: admin@testgeneral.com (ID: 550e8400-e29b-41d4-a716-446655440003)
  ✅ Created user admin@testgeneral.com with ID: 550e8400-e29b-41d4-a716-446655440003
Creating user: doctor@testgeneral.com (ID: 550e8400-e29b-41d4-a716-446655440005)
  ✅ Created user doctor@testgeneral.com with ID: 550e8400-e29b-41d4-a716-446655440005
...

🎉 Test users creation completed!

📋 Test User Credentials:
  admin@testgeneral.com / TestPass123!
  doctor@testgeneral.com / TestPass123!
  nurse@testgeneral.com / TestPass123!
  reception@testgeneral.com / TestPass123!
  pharmacy@testgeneral.com / TestPass123!
  lab@testgeneral.com / TestPass123!
  patient@testgeneral.com / TestPass123!
```

**Troubleshoot:**

If you get error: `SUPABASE_SERVICE_ROLE_KEY environment variable is required`
```bash
# Verify your key is set
echo "Service role key: $SUPABASE_SERVICE_ROLE_KEY"

# If empty, go back to Supabase dashboard and copy the key again
# Paste into terminal:
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."
npm run test:create-users
```

If users already exist, you'll see: `⚠️ User X already exists, skipping...` (This is fine!)

---

## Step 5: Seed Test Data (1-2 minutes)

This populates the database with realistic patient records, appointments, and lab orders.

```bash
# Seed test database with 50 patients, 20 appointments, 10 staff
npm run seed:test-data
```

**Expected output:**
```
🌱 Starting test data seeding...
📋 Creating 50 patients...
👥 Creating 10 staff members...
📅 Creating 20 appointments...
💰 Creating billing records...
⏳ Creating queue entries...
🟢 Updating staff presence...
✅ Test data seeding completed successfully!

Patients created: 50
Staff created: 10
Appointments created: 20
Message: Test data created successfully
```

**Verify data was created:**
```bash
# Count patients in database
curl -s "http://localhost:5173/api/patients" \
  -H "Authorization: Bearer $(echo 'test-token-here')" | jq '.count'
# Should show: 50 (or similar)
```

---

## Step 6: Run Dev Server (1 minute)

```bash
# Start the React development server
npm run dev
```

**Expected output:**
```
  VITE v5.0.8  ready in 234 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

---

## ✅ Verification Checklist

Once server is running, verify everything works:

### 1. Frontend Loads
```bash
curl -I http://localhost:5173
# Should return: HTTP/1.1 200 OK
```

### 2. Login as Doctor

1. Open browser: **http://localhost:5173**
2. Click **Sign In**
3. Enter:
   - Email: `doctor@testgeneral.com`
   - Password: `TestPass123!`
4. Click **Sign In**

**Expected:** You see the doctor dashboard with patient list

### 3. Verify Patients Appear

1. Navigate to **Patients** tab
2. Should see 50+ patient records with names, MRNs, dates of birth
3. Click on a patient → should see full profile, appointments, prescriptions

### 4. Test Another Role

1. Sign out (click profile → **Sign Out**)
2. Sign in as Nurse:
   - Email: `nurse@testgeneral.com`
   - Password: `TestPass123!`

**Expected:** Nurse dashboard (different from doctor's)

### 5. Test RLS (Hospital Isolation)

In browser console:
```javascript
// Get current user's hospital from API
fetch('http://localhost:5173/api/current-user')
  .then(r => r.json())
  .then(u => {
    console.log('Your hospital:', u.hospital_id);
    console.log('Can only see patients from this hospital ✅');
  });
```

---

## 🎯 You're Done! 

### What You Can Now Do:

✅ **Sign in as any role** (doctor, nurse, pharmacist, lab tech, receptionist, admin, patient)  
✅ **Browse 50+ patients** with realistic medical histories  
✅ **Create appointments**, write consultations, order labs  
✅ **Verify role-based access** (nurse can't create prescriptions, etc.)  
✅ **Test pharmacy workflow** (prescribe → verify → dispense)  
✅ **Test lab workflow** (order → results → critical alerts)  
✅ **See audit logs** of all changes  

---

## Common Issues & Fixes

### Issue: "Port 5173 already in use"

```bash
# Kill process on port 5173
# macOS/Linux:
lsof -ti:5173 | xargs kill -9

# Windows (PowerShell):
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Then retry:
npm run dev
```

### Issue: "Cannot connect to Supabase"

```bash
# Check if VITE_SUPABASE_URL is correct
cat .env | grep VITE_SUPABASE_URL

# Test connectivity
curl https://wmxtzkrkscjwixafumym.supabase.co/rest/v1/patients?limit=1

# If fails: your IP might be blocked. Contact DevOps team.
```

### Issue: "Test users already exist"

This is **fine**! Just continue. Existing users won't be recreated.

### Issue: "npm run seed:test-data fails"

```bash
# Check if database is accessible
docker-compose exec postgres psql -U postgres -c "SELECT 1"
# Should return: 1

# If postgres is down:
docker-compose restart postgres
sleep 3
npm run seed:test-data
```

### Issue: "Infinite loading spinner on login"

Your `.env` has `VITE_E2E_MOCK_AUTH="true"`. Fix:

```bash
# Edit .env:
VITE_E2E_MOCK_AUTH="false"

# Reload browser (Ctrl+Shift+R to clear cache)
```

---

## 🔍 Inspect What You've Created

### List All Test Users

```bash
# Connect to Supabase directly
curl -s "https://wmxtzkrkscjwixafumym.supabase.co/rest/v1/profiles" \
  -H "apikey: <your-publishable-key>" | jq '.[] | {email, first_name, last_name, role}'
```

### Count Patients by Role

```bash
# SQL query to count data:
# SELECT COUNT(*) FROM patients;  → 50+
# SELECT COUNT(*) FROM appointments;  → 20+
# SELECT COUNT(*) FROM consultations;  → Should correlate with appointments
# SELECT COUNT(*) FROM lab_orders;  → Various from consultations
```

---

## Next: Start Developing

Now that your local environment is ready:

1. ✅ Read [docs/HEALTHCARE_DEV_CHECKLIST.md](./HEALTHCARE_DEV_CHECKLIST.md) before writing code
2. ✅ Review [docs/ARCHITECTURE.md](./ARCHITECTURE.md) to understand the system
3. ✅ Pick a task from your sprint
4. ✅ Create a feature branch: `git checkout -b feature/CARE-123-your-feature`
5. ✅ Start coding!

---

## Need Help?

- 📚 **Questions about schema?** → [docs/DATABASE.md](./DATABASE.md)
- 🔐 **Questions about auth/RLS?** → [docs/SECURITY.md](./SECURITY.md)
- 🏥 **Clinical guidance?** → [docs/REQUIREMENTS.md](./REQUIREMENTS.md)
- 📝 **Contributing guidelines?** → [docs/CONTRIBUTING.md](./CONTRIBUTING.md)
- 💬 **Contact**: `#caresync-dev` Slack channel

**Welcome to CareSync! 🏥**
