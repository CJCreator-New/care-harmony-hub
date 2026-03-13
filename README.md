# CareSync - Hospital Management System

<div align="center">
  <img src="public/pwa-512x512.png" alt="CareSync Logo" width="120" />
  
  **Modern Hospital Management Built for Safer Patient Care**
  
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
  [![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://reactjs.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8.svg)](https://tailwindcss.com/)
  [![Supabase](https://img.shields.io/badge/Supabase-Backend-3ecf8e.svg)](https://supabase.com/)
</div>

---

## 📋 Overview

CareSync is a comprehensive, enterprise-grade Hospital Management System (HMS) designed to streamline healthcare operations from patient registration to discharge. Built with modern technologies and HIPAA-ready compliance, it serves clinics, hospitals, and multi-facility healthcare systems.

### Key Highlights

- 🏥 **Unified Operations** - OPD, IPD, OT, Pharmacy, Lab all in one platform
- 🔐 **Enterprise Security** - Role-based access, audit logs, encryption
- 📊 **Real-time Analytics** - Live dashboards and KPI tracking
- 💳 **Smart Billing** - Insurance claims, payment plans, automated invoicing
- 📱 **Patient Portal** - Self-service appointments, prescriptions, lab results

## ⚡ Performance & Optimization
The system has been finalized with advanced production optimizations:
- **Lazy Load Architecture**: Dashboards are role-scoped and dynamically imported, reducing initial bundle size by 96%.
- **Optimized Build Pipeline**: Uses SWC and Terser for high-performance minification and clean production bundles.
- **Visual Bundle Analysis**: Built-in Rollup Visualizer for continuous performance monitoring.
- **Real-time Event Bus**: Sub-millisecond clinical workflow updates via Supabase Realtime.

## 📊 Product Strategy & Planning (v1.2.1)

**New Integration**: Product-Strategy-Session Skill provides comprehensive market analysis, roadmap planning, and go-to-market strategy support:

```bash
/product-strategy-session — Develop go-to-market strategy for telemedicine implementation
/product-strategy-session — Create 3-year financial projections for hospital market expansion
/product-strategy-session — Build competitive analysis for clinical AI features
```

**Documentation Hub**: All 32+ project documents consolidated in a single, self-contained skill directory:
- 📚 [Consolidated Documentation](./github/copilot-instructions.md?region=product-strategy-session) — All business, technical, security, and operational docs
- 🎯 [Product Strategy Skill](./agents/skills/product-strategy-session/) — Market analysis, roadmap, business cases
- 🗓️ [Index & Navigation](./agents/skills/product-strategy-session/INDEX.md) — Complete documentation master index
- 📖 [Implementation Guide](./docs/IMPLEMENTATION_GUIDE.md) — Code patterns and development standards

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ & npm
- Docker & Docker Compose (for full microservices setup)
- Git

### Installation

#### Option 1: Development with API Gateway (Recommended)

```bash
# Clone the repository
git clone <YOUR_GIT_URL>
cd caresync

# Install dependencies
npm install

# Start full microservices stack
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Initialize Kong API Gateway
docker-compose --profile init up kong-init

# Start development frontend
npm run dev
```

The app will be available at `http://localhost:5173` with API Gateway at `http://localhost:8000`

#### Option 2: Simple Development (Frontend Only)

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Environment Setup

The project uses Lovable Cloud for backend services. Environment variables are automatically configured.

For local microservices development, see [API_GATEWAY.md](docs/API_GATEWAY.md) for detailed setup instructions.

### Recent Updates (January 2026)

✅ **All 8 Phases Complete**: Production-Ready Healthcare Management System
- **Phase 1**: Foundation & Authentication System
- **Phase 2**: Core Operations & Patient Management
- **Phase 3**: Clinical Workflows & Consultations
- **Phase 4**: Operations Management & Billing
- **Phase 5**: Pharmacy & Laboratory Automation
- **Phase 6**: Patient Portal & Mobile Experience
- **Phase 7**: Analytics & Reporting System
- **Phase 8**: Cross-Role Integration & Workflow Automation
- **50+ database tables** with comprehensive RLS policies
- **16+ edge functions** for advanced automation
- **AI-powered task routing** and real-time communication
- See [PHASES_1-8_COMPLETE_SUMMARY.md](PHASES_1-8_COMPLETE_SUMMARY.md) for complete implementation details
- See [PHASES_1-4_COMPLETE_SUMMARY.md](PHASES_1-4_COMPLETE_SUMMARY.md) for Phase 1-4 details
- See [CHANGELOG.md](docs/CHANGELOG.md) for complete feature history

---

## 📁 Project Structure

```
caresync/
├── src/
│   ├── components/          # React components
│   │   ├── admin/          # Admin dashboard components
│   │   ├── appointments/   # Appointment scheduling
│   │   ├── billing/        # Billing & invoicing
│   │   ├── consultations/  # Clinical workflow
│   │   ├── dashboard/      # Role-based dashboards
│   │   ├── inventory/      # Stock management
│   │   ├── landing/        # Marketing pages
│   │   ├── nurse/          # Nursing workflow
│   │   ├── patient/        # Patient portal
│   │   ├── prescriptions/  # Rx management
│   │   └── ui/             # Shadcn UI components
│   ├── contexts/           # React contexts (Auth)
│   ├── hooks/              # Custom React hooks
│   ├── pages/              # Route pages
│   ├── types/              # TypeScript types
│   └── utils/              # Utility functions
├── supabase/
│   ├── functions/          # Edge functions
│   └── migrations/         # Database migrations
├── public/                 # Static assets
└── docs/                   # Documentation
```

---

## 🔑 User Roles

| Role | Description | Key Capabilities |
|------|-------------|------------------|
| **Admin** | Hospital administrators | Full system access, settings, analytics |
| **Doctor** | Physicians | Consultations, prescriptions, lab orders |
| **Nurse** | Nursing staff | Vitals, medication admin, patient prep |
| **Receptionist** | Front desk | Registration, scheduling, check-in/out |
| **Pharmacist** | Pharmacy staff | Dispensing, inventory, refill requests |
| **Lab Tech** | Laboratory staff | Sample collection, result entry |
| **Patient** | End users | Portal access, appointments, records |

---

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Shadcn/UI** - Component library
- **Framer Motion** - Animations
- **React Router** - Navigation
- **TanStack Query** - Data fetching
- **React Hook Form + Zod** - Form handling

### Backend (Lovable Cloud)
- **Supabase** - Database & Auth
- **PostgreSQL** - Relational database
- **Edge Functions** - Serverless logic
- **Row Level Security** - Data protection

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | System architecture & design |
| [Features](docs/FEATURES.md) | Complete feature documentation |
| [Database Schema](docs/DATABASE.md) | Database structure & relations |
| [API Reference](docs/API.md) | Edge functions & endpoints |
| [Security](docs/SECURITY.md) | Security & compliance |
| [Deployment](docs/DEPLOYMENT.md) | Deployment guide |
| [Contributing](docs/CONTRIBUTING.md) | Contribution guidelines |
| [Changelog](docs/CHANGELOG.md) | Version history |

---

## 🔒 Security & Compliance

- ✅ HIPAA-ready architecture
- ✅ NABH compliance support
- ✅ End-to-end encryption
- ✅ Role-based access control (RBAC)
- ✅ Complete audit logging
- ✅ Row Level Security (RLS)
- ✅ Session management

---

## 📞 Support

- **Documentation**: [docs.caresync.health](https://docs.lovable.dev)
- **Email**: support@caresync.health
- **Schedule Demo**: [Book a 30-min demo](/hospital/signup)

---

## 📄 License

This project is proprietary software. All rights reserved.

---

<div align="center">
  <strong>Built with ❤️ for Healthcare</strong>
</div>
