# TakeoffAI

AI-powered construction estimating and proposal generation for low-voltage systems.

## Features

- **Multi-Agent AI System**: Specialized AI agents for Fire Alarm, CCTV, Access Control, Data/Cabling, Audio/Visual, and more
- **Document Processing**: Upload PDFs, Excel files, and text documents for automatic analysis
- **Intelligent Takeoffs**: Generate material lists, labor estimates, and pricing
- **Professional Proposals**: Create client-ready proposals with scope narratives and exclusions
- **Code Compliance**: Built-in knowledge of NFPA, NEC, ADA, IBC standards

## Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS
- **Backend**: Node.js, Express
- **AI**: Anthropic Claude API
- **Document Processing**: pdf-parse, xlsx

## Quick Start

### Prerequisites

- Node.js 18+
- Anthropic API key

### Installation

```bash
# Install dependencies
npm install

# Copy environment file and add your API key
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

# Start development servers
npm run dev
```

This starts:
- Frontend at http://localhost:5173
- Backend at http://localhost:3001

### Production Build

```bash
# Build frontend
npm run build

# Start production server
npm start
```

## Project Structure

```
takeoff/
├── server/                 # Backend Express server
│   ├── index.js           # Server entry point
│   ├── config/
│   │   └── agents.js      # AI agent definitions
│   ├── routes/
│   │   ├── anthropic.js   # AI chat endpoints
│   │   ├── documents.js   # File upload/processing
│   │   └── projects.js    # Project CRUD
│   └── utils/
│       └── logger.js      # Winston logger
├── src/                    # React frontend
│   ├── components/        # Reusable components
│   ├── views/             # Page views
│   ├── services/          # API client
│   └── App.jsx            # Main app component
├── public/                 # Static assets
└── dist/                   # Production build output
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key | Required |
| `PORT` | Server port | 3001 |
| `NODE_ENV` | Environment | development |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:5173 |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | 60000 |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 30 |
| `MAX_FILE_SIZE_MB` | Max upload file size | 50 |

## API Endpoints

### AI
- `GET /api/ai/agents` - List available agents
- `POST /api/ai/chat` - Chat with an agent
- `POST /api/ai/analyze` - Analyze project documents

### Documents
- `POST /api/documents/upload` - Upload and process documents

### Projects
- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

## Security Features

- API key stored server-side only (never exposed to browser)
- Helmet.js security headers
- Rate limiting on all API endpoints
- CORS configuration
- Input validation and sanitization
- File type and size restrictions

## License

Proprietary - 3D Technology Services
