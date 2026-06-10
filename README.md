# Smart Kirana Assistant

AI-powered web application for small grocery/kirana shop merchants to manage customer udhar (credit), payments, and stock inventory.

## Features

- **Dashboard** - Total pending udhar, today's payments, low stock alerts, daily sales summary
- **Customer Udhar Management** - Add customers, record udhar/payments, full ledger history
- **AI WhatsApp Entry Detection** - Paste WhatsApp messages, AI extracts customer/amount/action automatically
- **Voice-to-Entry** - Speak in Hindi/Hinglish/English, AI creates structured entries
- **Smart Inventory** - Product management with low stock alerts and quick stock updates
- **AI Stock Predictions** - Predicts which products will run out soon using Groq AI
- **Reports** - Weekly/monthly sales, top customers, pending dues, inventory insights
- **Notifications** - Payment reminders with WhatsApp integration
- **Offline-First** - Works with weak internet, auto-syncs when online
- **PWA Support** - Installable on mobile devices

## Tech Stack

- **Frontend**: Next.js 14, React, Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes, MongoDB (Mongoose)
- **Auth**: OTP-based login with JWT
- **AI**: Groq API (Llama 3.3 70B)
- **Charts**: Recharts
- **State**: Zustand, localStorage

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (or local MongoDB)

### Setup

1. Clone the repository:
```bash
git clone <repo-url>
cd "Smart Kirana Assistant"
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local`:
```
MONGODB_URI=mongodb+srv://your-connection-string
GROQ_API_KEY=your-groq-api-key
JWT_SECRET=your-jwt-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

### Load Demo Data

Click "Try Demo Account" on the login page, or call:
```bash
curl -X POST http://localhost:3000/api/seed
```

This creates:
- 1 demo merchant (Kumar Kirana Store)
- 12 customers
- 30+ transactions
- 19 products
- Payment reminders

### Dev Login

In development mode, use OTP `123456` for any phone number.

## API Documentation

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/send-otp` | Send OTP to phone number |
| POST | `/api/auth/verify-otp` | Verify OTP and login |

### Customers
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/customers` | List customers (supports `?search=`) |
| POST | `/api/customers` | Add new customer |
| GET | `/api/customers/[id]` | Get customer with transactions |
| PUT | `/api/customers/[id]` | Update customer |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/transactions` | List transactions (supports `?customerId=`) |
| POST | `/api/transactions` | Create udhar/payment entry |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/products` | List products (supports `?category=&search=`) |
| POST | `/api/products` | Add new product |
| PUT | `/api/products/[id]` | Update product stock/details |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Aggregated dashboard data |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports` | Report data (supports `?range=week/month/all`) |

### AI
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/parse-whatsapp` | Parse WhatsApp message to entry |
| POST | `/api/ai/voice-entry` | Process voice transcription |
| GET | `/api/ai/stock-predictions` | Get AI stock predictions |

### Reminders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reminders` | List reminders |
| POST | `/api/reminders` | Create reminder |

### Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile` | Get merchant profile |
| PUT | `/api/profile` | Update merchant profile |

### Seed
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/seed` | Create demo data |

## Database Schema

### Merchants
- name, phone, shopName, language, businessType

### Customers
- merchantId, name, phone, totalUdhar, totalPaid, balance

### Transactions
- merchantId, customerId, type (udhar/payment), amount, description, items, date, synced

### Products
- merchantId, name, category, price, stock, minStock, unit, lastRestocked

### Reminders
- merchantId, customerId, type, message, dueDate, sent

## Folder Structure

```
src/
  app/
    (auth)/login/          - Login page
    (dashboard)/           - Protected pages
      page.tsx             - Dashboard
      customers/           - Customer list, detail, add
      entry/add/           - Add transaction entry
      inventory/           - Product management
      ai-assistant/        - AI chat, voice, predictions
      reports/             - Sales reports
      settings/            - Profile and settings
      notifications/       - Reminders
    api/                   - API routes
  components/
    layout/                - Header, BottomNav
  lib/
    mongodb.ts             - DB connection
    groq.ts                - Groq AI client
    auth.ts                - JWT/OTP helpers
    offline.ts             - Offline queue
    utils.ts               - Utilities
  models/                  - Mongoose schemas
  context/                 - React contexts
  hooks/                   - Custom hooks
  types/                   - TypeScript types
```

## Deployment

The app is deployment-ready for Vercel:

```bash
npm run build
```

Set environment variables in your hosting platform.

## License

MIT
