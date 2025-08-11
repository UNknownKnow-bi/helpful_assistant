# 智时助手 (Cortex Assistant)

An AI-powered intelligent assistant for Chinese knowledge workers with task management, AI chat, and configurable AI services.

## Features

### ✅ Implemented (Foundation Setup)

1. **Authentication System**
   - Simple username/password registration and login
   - JWT token-based authentication
   - Secure password hashing with bcrypt

2. **AI Service Integration**  
   - LangChain-based AI provider abstraction
   - Support for OpenAI and DeepSeek APIs
   - Configurable AI parameters (temperature, max_tokens, etc.)
   - Connection testing functionality

3. **AI Chat Interface**
   - Real-time WebSocket streaming
   - Markdown rendering support
   - Collapsible thinking blocks for reasoning models
   - Chat session management
   - Message history persistence

4. **Task Generation & Management**
   - AI-powered task parsing from Chinese text
   - Structured task cards with JSON schema
   - Manual task creation
   - Task filtering and search
   - Status management (pending/in-progress/completed)
   - Priority levels and difficulty scoring

5. **Modern Frontend**
   - React 18 with TypeScript
   - Tailwind CSS styling
   - Responsive design
   - Zustand state management
   - React Query for API data fetching

## Tech Stack

### Backend
- **FastAPI** - High-performance async web framework
- **MongoDB** - Document database with Motor async driver
- **LangChain** - AI provider abstraction and streaming
- **JWT** - Token-based authentication
- **WebSockets** - Real-time chat streaming

### Frontend
- **React 18** - Modern UI framework with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **Zustand** - Lightweight state management
- **React Query** - Server state management

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB 6+
- pnpm (recommended) or npm

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your MongoDB connection and secret key
```

5. Start the server:
```bash
python run.py
```

The backend API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
pnpm install  # or npm install
```

3. Start development server:
```bash
pnpm dev  # or npm run dev
```

The frontend will be available at `http://localhost:3000`

### MongoDB Setup

1. Install MongoDB 6+ locally or use MongoDB Atlas
2. Start MongoDB service:
```bash
mongod  # For local installation
```

## API Documentation

Once the backend is running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Usage

1. **Register/Login**: Create an account or login with existing credentials
2. **Configure AI Provider**: Go to AI配置 to add your AI service (OpenAI/DeepSeek)
3. **Generate Tasks**: Use natural language to describe tasks, AI will parse them
4. **Chat with AI**: Real-time conversations with markdown and thinking support
5. **Manage Tasks**: View, filter, and update task status

## Project Structure

```
helpful-assistant/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API route handlers
│   │   ├── core/           # Configuration and security
│   │   ├── models/         # Pydantic data models
│   │   ├── services/       # Business logic services
│   │   └── database/       # Database connection
│   ├── requirements.txt    # Python dependencies
│   └── run.py             # Application entry point
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route components
│   │   ├── services/       # API client functions
│   │   ├── stores/         # Zustand state stores
│   │   └── types/          # TypeScript definitions
│   ├── package.json        # Node.js dependencies
│   └── vite.config.ts      # Vite configuration
└── README.md               # This file
```

## Development Status

- ✅ Foundation Setup (Week 1) - **COMPLETED**
- ⏳ User Profiling System (Week 2) - *Next Phase*
- ⏳ Browser Extension (Week 3) - *Future*
- ⏳ Advanced Analytics (Week 4) - *Future*

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details