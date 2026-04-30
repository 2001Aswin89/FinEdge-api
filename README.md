# FinEdge API

A Node.js + Express REST API for tracking personal income, expenses, and monthly budgets. Built as a 4-member group project for the Airtribe AI-First Backend course.

## Tech stack

- **Node.js** >= 18
- **Express 5** for HTTP routing
- **CommonJS modules** (`require` / `module.exports`)
- **`fs/promises`** for JSON file persistence (no database)
- **jsonwebtoken** for mock session tokens
- **dotenv** for environment configuration
- **Jest 29** + **Supertest 7** for tests
- **nodemon** for development hot-reload

## Setup

```bash
git clone https://github.com/2001Aswin89/FinEdge-api.git
cd FinEdge-api
npm install
cp .env.example .env       # edit values as needed (JWT_SECRET is required)
npm run dev                # nodemon, hot reload
# or
npm start                  # plain node
```

The server runs on `http://localhost:5000` by default. Health check: `GET /health`.

## Folder structure

```
FinEdge-api/
├── package.json
├── README.md
├── FinEdge.postman_collection.json
├── .env / .env.example
├── src/
│   ├── app.js                          # server entry, mounts everything
│   ├── routes/
│   │   ├── userRoutes.js
│   │   ├── transactionRoutes.js
│   │   ├── budgetRoutes.js
│   │   └── summaryRoutes.js
│   ├── controllers/
│   │   ├── userController.js
│   │   ├── transactionController.js
│   │   ├── budgetController.js
│   │   └── summaryController.js
│   ├── services/
│   │   ├── userService.js
│   │   ├── transactionService.js
│   │   └── budgetService.js
│   ├── models/
│   │   ├── userModel.js
│   │   ├── transactionModel.js
│   │   └── budgetModel.js
│   ├── middleware/
│   │   ├── logger.js                   # request/response logging
│   │   ├── validator.js                # input validators
│   │   └── errorHandler.js             # global error handler + 404 fallback
│   ├── utils/
│   │   ├── errors.js                   # custom error classes
│   │   └── analytics.js                # totals, category breakdown, trends
│   └── data/
│       ├── users.json
│       ├── transactions.json
│       └── budgets.json
└── tests/
    ├── users.test.js
    ├── transactions.test.js
    ├── budgets.test.js
    ├── middleware.test.js
    ├── summary.test.js
    └── utils.test.js
```

## Routes

| Method | Route | Description | Owner |
|---|---|---|---|
| GET | `/health` | Server health check | M1 |
| POST | `/users` | Register a new user (returns user + JWT) | M1 |
| POST | `/transactions` | Create an income or expense transaction | M2 |
| GET | `/transactions` | List with optional filters (`type`, `category`, `startDate`, `endDate`, `userId`) | M2 |
| GET | `/transactions/:id` | Fetch one transaction | M2 |
| PATCH | `/transactions/:id` | Partial update | M2 |
| DELETE | `/transactions/:id` | Delete | M2 |
| POST | `/budgets` | Create a monthly budget (`userId`, `month`, `monthlyGoal`, `savingsTarget`) | M2 |
| GET | `/budgets` | List with optional filters (`userId`, `month`) | M2 |
| GET | `/budgets/:id` | Fetch one budget | M2 |
| PATCH | `/budgets/:id` | Partial update | M2 |
| DELETE | `/budgets/:id` | Delete | M2 |
| GET | `/summary` | Income/expense totals, category breakdown, monthly trends (filters: `category`, `startDate`, `endDate`, `userId`) | M4 |

## Response shape

All endpoints return a flat JSON object. Successful responses include a human-readable `message` plus the data spread alongside it (no envelope).

**Success, single resource:**

```json
{
  "message": "Transaction created successfully",
  "transaction": {
    "id": "552c033c-4973-4831-8def-56c24340987c",
    "userId": null,
    "type": "expense",
    "category": "Groceries",
    "amount": 250,
    "date": "2026-04-30T00:00:00.000Z",
    "description": "",
    "createdAt": "2026-04-30T12:38:58.531Z",
    "updatedAt": "2026-04-30T12:38:58.531Z"
  }
}
```

**Success, list:**

```json
{
  "message": "Transactions fetched successfully",
  "count": 3,
  "transactions": [ ... ]
}
```

**Error, validation:**

```json
{
  "message": "Invalid transaction payload",
  "errors": [
    { "field": "type", "message": "must be one of: income, expense" },
    { "field": "amount", "message": "must be a positive number" }
  ]
}
```

**Error, operational (NotFound, Conflict, malformed JSON):**

```json
{
  "message": "Transaction with id '...' not found"
}
```

## Sample requests

### Register a user

```bash
curl -X POST http://localhost:5000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@example.com"}'
```

### Create a transaction

```bash
curl -X POST http://localhost:5000/transactions \
  -H "Content-Type: application/json" \
  -d '{"type":"expense","category":"Groceries","amount":1500,"date":"2026-04-15","description":"Weekly run"}'
```

### Filter transactions by type and date range

```bash
curl "http://localhost:5000/transactions?type=expense&startDate=2026-01-01&endDate=2026-04-30"
```

### Update a transaction

```bash
curl -X PATCH http://localhost:5000/transactions/<id> \
  -H "Content-Type: application/json" \
  -d '{"amount":1750,"category":"Food"}'
```

### Create a monthly budget

```bash
curl -X POST http://localhost:5000/budgets \
  -H "Content-Type: application/json" \
  -d '{"userId":"user-1","month":"2026-04","monthlyGoal":50000,"savingsTarget":10000}'
```

### List budgets for a user

```bash
curl "http://localhost:5000/budgets?userId=user-1"
```

### Get summary

```bash
curl "http://localhost:5000/summary"
curl "http://localhost:5000/summary?category=Groceries"
curl "http://localhost:5000/summary?startDate=2026-03-01&endDate=2026-04-30"
```

A full Postman collection covering every endpoint with example payloads is included at [FinEdge.postman_collection.json](FinEdge.postman_collection.json). Import it into Postman and set the `baseUrl` collection variable to `http://localhost:5000`.

## Running tests

```bash
npm test
```

Jest runs all 84 tests across 6 suites in under 10 seconds.

| Suite | Tests | Covers |
|---|---|---|
| `tests/utils.test.js` | 5 | analytics functions and edge cases |
| `tests/transactions.test.js` | 25 | 5 CRUD endpoints, validation, filtering, PATCH integrity, date strictness |
| `tests/budgets.test.js` | 33 | 5 CRUD endpoints, validation, filtering, `(userId, month)` uniqueness |
| `tests/middleware.test.js` | 6 | validator, errorHandler, notFoundHandler, malformed JSON |
| `tests/summary.test.js` | 5 | response shape, aggregation correctness, byCategory sort, filter validation |
| `tests/users.test.js` | 7 | `GET /health`, `POST /users` (registration, validation, duplicate handling) |

Each suite uses unique tmp file fixtures via `os.tmpdir()` and `randomUUID()`, so suites are parallel-safe and never touch the production data files in `src/data/`.

## Architecture notes

- **MVC + service layer.** Routes do routing only. Controllers translate HTTP. Services hold business logic. Models do file I/O. The layering keeps persistence isolated; swapping the JSON files for a real database only touches the model layer.
- **Async/await everywhere.** Every file I/O call is awaited; no callbacks.
- **CommonJS modules.** Chosen to match Member 1's existing convention.
- **Centralized error handling.** Domain errors (`AppError`, `NotFoundError`, `ValidationError`, `ConflictError`) thrown by services bubble through `next(err)` and are formatted by the global error handler middleware. The user controller retains its inline catch pattern from Member 1; transaction, budget, and summary controllers all delegate to the global handler.
- **Lazy env-var reads.** Models read `process.env.USERS_FILE`, `TRANSACTIONS_FILE`, and `BUDGETS_FILE` inside `getFilePath()`, not at module top-level, so tests can swap fixture paths after the module loads.
- **Request logging.** A simple stdout logger records every request on entry and the final status + duration on exit, captured via `res.on('finish')` so the status reflects the actual response.

## Core entities

### User (`src/models/userModel.js`)

Schema: `{ id, name, email, createdAt }`

- `id`: timestamp-based string assigned by the service layer
- `email`: normalized to lowercase before save; must be unique
- A JWT is issued on registration, signed with `JWT_SECRET`

### Transaction (`src/models/transactionModel.js`)

Schema: `{ id, userId, type, category, amount, date, description, createdAt, updatedAt }`

- `id`: UUID v4 via `crypto.randomUUID()`
- `userId`: foreign key to users (nullable in this build; the JWT layer is mocked)
- `type`: `income` or `expense`
- `amount`: positive number
- `date`: ISO date string (YYYY-MM-DD or full ISO 8601 with timezone)

### Budget (`src/models/budgetModel.js`)

Schema: `{ id, userId, month, monthlyGoal, savingsTarget, createdAt, updatedAt }`

- `month`: `YYYY-MM`
- `monthlyGoal`: positive number (target spend ceiling for the month)
- `savingsTarget`: non-negative number
- `(userId, month)` is unique. Enforced on `POST /budgets` and on `PATCH /budgets/:id` when `month` is changing.

## Data integrity guarantees

- `id`, `userId`, `createdAt`, `updatedAt` on `Transaction` and `Budget` are system-managed and **cannot** be mutated through `PATCH`. Attempts return `400` with the offending field listed in `errors[]`.
- `PATCH` rejects unknown body keys outright (no silent persistence of `{ "evil": "data" }`).
- `POST /transactions` and `POST /budgets` reject unknown body keys for the same reason.
- Dates must match `YYYY-MM-DD` or full ISO 8601. `"2026"`, `"April"`, and other shorthand are rejected by `validateTransactionCreate`.
- `?type=banana` and `?startDate=banana` on GET endpoints return `400` with structured `errors[]`, not a silent empty array.
- `(userId, month)` uniqueness on budgets is enforced on both create and on PATCH-to-different-month.

## Bonus features delivered (Section 5 of brief)

Two of the four bonus options are delivered:

- **A.** Analytics & Reporting: `GET /summary` with totals (income, expense, balance, transaction count), category breakdown (sorted highest first), and monthly trends per `YYYY-MM`. Filter support on `/transactions` (`type`, `category`, `startDate`, `endDate`, `userId`) and `/summary` (same set minus `type`, since summary aggregates both).
- **C.** Data Persistence: JSON file storage via `fs/promises` for users, transactions, and budgets. File paths are configurable via env vars.

The Section 4 bonus (mock JWT session) is also implemented: a JWT is returned on `POST /users` registration.

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `5000` | HTTP listen port |
| `JWT_SECRET` | (required) | Secret used to sign JWTs on registration |
| `TRANSACTIONS_FILE` | `./src/data/transactions.json` | Override the transactions data file path (used by tests) |
| `BUDGETS_FILE` | `./src/data/budgets.json` | Override the budgets data file path (used by tests) |
| `USERS_FILE` | `./src/data/users.json` | Override the users data file path (used by tests) |
| `NODE_ENV` | unset | Set to `development` to surface raw error messages in 500 responses |

See `.env.example` for the canonical list.

## Member responsibilities

- **M1**: User APIs and project setup. `app.js` scaffolding, user route/controller/service/model, JWT helper, `users.json`, `GET /health` endpoint.
- **M2**: Transaction and Budget APIs. Transaction route/controller/service/model, Budget route/controller/service/model, custom error classes (`AppError`, `NotFoundError`, `ValidationError`, `ConflictError`).
- **M3**: Async and Middleware. Request logger, input validators, global error handler with 404 fallback. Refactored transaction and budget controllers from inline catch to `next(err)`.
- **M4**: Analytics, tests, and documentation. Analytics utility, summary controller and route, full Jest test suite, README, Postman collection.

## License

Coursework. Not licensed for redistribution.
