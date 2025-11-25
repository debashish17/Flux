# ⚡ FLUX

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![React](https://img.shields.io/badge/React-19.2.0-61dafb?logo=react)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688?logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.10+-3776ab?logo=python)
![License](https://img.shields.io/badge/license-MIT-green.svg)

**AI-Powered Document & Presentation Generation Platform**

*Transform your ideas into professional documents and presentations with the power of AI*

[Features](#-features) • [Quick Start](#-quick-start) • [Tech Stack](#-tech-stack) • [Usage Guide](#-usage-guide)

</div>

---

## 🎯 What is FLUX?

FLUX is a full-stack platform that combines the intelligence of Google Gemini AI with an intuitive interface to help you create, edit, and manage professional documents (.docx) and presentations (.pptx). Think of it as **Gamma.app meets Google Docs** - but with more control and customization.

### 💡 The Problem

Creating presentations and documents is time-consuming. You spend hours:
- 📝 Structuring content
- ✍️ Writing and rewriting sections
- 🎨 Formatting and styling
- 🔄 Getting feedback and making revisions

### ✨ The Solution

FLUX automates the heavy lifting while giving you full creative control:
1. **Tell FLUX what you want** - Describe your topic and requirements
2. **AI plans the structure** - Get a professional outline in seconds
3. **Generate & refine** - AI creates content, you provide feedback
4. **Export & share** - Download polished .docx or .pptx files

---

## 🚀 Features

### Core Features

<table>
<tr>
<td width="50%">

#### 🤖 **AI-Powered Generation**
- **Smart Planning**: AI analyzes your topic and creates structured outlines
- **Content Generation**: Google Gemini Flash generates professional content
- **Iterative Refinement**: Tell AI what to improve, get instant rewrites
- **Feedback-Based Regeneration**: Dislike a section? Add feedback and regenerate

</td>
<td width="50%">

#### ✏️ **Manual Editing**
- **Inline Editing**: Click to edit titles, bullets, and content
- **Add/Remove Sections**: Full control over document structure
- **Drag to Reorder**: Move sections up and down
- **Real-time Preview**: See changes as you type
- **Auto-save**: Never lose your work (1.5s debounced)

</td>
</tr>
<tr>
<td width="50%">

#### 👍 **Interactive Feedback System**
- **Like/Dislike Buttons**: Mark sections you want to keep or improve
- **Comment Box**: Explain what needs improvement
- **Smart Regeneration**: AI regenerates content based on your feedback
- **Feedback Protection**: Confirmation dialog prevents accidental regeneration

</td>
<td width="50%">

#### 💬 **AI Chat Assistant**
- **Persistent History**: Conversations saved to database
- **Project Context**: AI knows your entire project
- **Copy Responses**: One-click copy of AI suggestions
- **Refinement Suggestions**: Get ideas for improving content

</td>
</tr>
<tr>
<td width="50%">

#### 📊 **Dashboard & Management**
- **Statistics Cards**: Track total projects, documents, presentations
- **Search & Filter**: Find projects by title, type, or date
- **Sort Options**: Recent, A-Z, Z-A, by type
- **Last Modified**: See when projects were updated
- **Delete Confirmation**: Prevent accidental deletions

</td>
<td width="50%">

#### 📤 **Export & Share**
- **Professional Exports**: Download as .docx or .pptx
- **Markdown Support**: Rich formatting with headers, lists, bold, italic
- **Image Suggestions**: AI suggests relevant images for slides
- **One-Click Download**: Export polished files instantly

</td>
</tr>
</table>

---

## 🎨 User Experience Highlights

### Document Editor (DOCX)
```
📄 Live Preview → 🤖 AI Chat → ✏️ Inline Editing → 💬 Section Feedback
```

- **Split View**: Markdown editor on left, HTML preview on right
- **Section Management**: Add, remove, reorder sections with buttons
- **Refinement Form**: Input custom instructions per section
- **Feedback System**: Like/dislike buttons with comment box

### Presentation Editor (PPTX)
```
🎬 Slide Navigation → 🎯 Live Preview → 🔄 Regenerate → 👍 Feedback
```

- **Slide Thumbnails**: Navigate with visual previews
- **Editable Bullets**: Click any bullet point to edit
- **Image Suggestions**: AI recommends relevant imagery
- **Auto-generation**: Empty slides fill automatically in batches

### Workflow Example

```mermaid
graph LR
    A[Enter Topic] --> B[AI Plans Structure]
    B --> C[Generate Content]
    C --> D{Like it?}
    D -->|No| E[Add Feedback]
    E --> F[AI Regenerates]
    F --> D
    D -->|Yes| G[Manual Edits]
    G --> H[Export File]
```

---

## 🛠️ Tech Stack

### Frontend
- **⚛️ React 19.2.0** - Latest React with concurrent features
- **⚡ Vite** - Lightning-fast dev server and builds
- **🎨 Tailwind CSS** - Utility-first styling
- **🧭 React Router 7** - Client-side routing
- **🔌 Axios** - Promise-based HTTP client
- **🎭 Lucide Icons** - Beautiful, consistent icons

### Backend
- **🚀 FastAPI** - Modern, fast Python web framework
- **🤖 Google Gemini Flash** - AI content generation
- **🗄️ Prisma ORM** - Type-safe database access
- **🐘 PostgreSQL** - Production database (Supabase)
- **🔐 JWT Authentication** - Secure token-based auth
- **📝 Python-DOCX** - Document generation
- **🎬 Python-PPTX** - Presentation generation

---

## 🚦 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.10+
- **PostgreSQL** (or Supabase account)
- **Google Gemini API Key** ([Get one here](https://makersuite.google.com/app/apikey))

### Installation

#### 1️⃣ Clone the Repository

```bash
git clone https://github.com/yourusername/flux.git
cd flux
```

#### 2️⃣ Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/Scripts/activate  # Windows
source venv/bin/activate       # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Setup environment variables
cp .env.example .env
# Edit .env and add:
#   - DATABASE_URL (PostgreSQL connection string)
#   - GEMINI_API_KEY (Google AI API key)
#   - SECRET_KEY (JWT secret - generate with `openssl rand -hex 32`)

# Generate Prisma client
prisma generate

# Run migrations
prisma db push

# Start backend server
python -m uvicorn main:app --reload --port 8000
```

**Backend will run on**: `http://127.0.0.1:8000`
**API Docs**: `http://127.0.0.1:8000/docs`

#### 3️⃣ Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Setup environment (if needed)
cp .env.example .env
# Edit .env if custom backend URL

# Start development server
npm run dev
```

**Frontend will run on**: `http://localhost:5173`

#### 4️⃣ Create Your First Account

1. Navigate to `http://localhost:5173`
2. Click "Sign Up"
3. Enter email and password
4. Login and start creating!

---

## 📖 Usage Guide

### Creating a Document

1. **Click "New Document"** from dashboard
2. **Enter Project Details**:
   - Title: "Marketing Strategy for 2025"
   - Description: "Comprehensive marketing plan focusing on digital channels"
   - Type: Document (.docx)
3. **Review AI Structure**: AI suggests sections like Introduction, Goals, Strategy, etc.
4. **Generate Content**: Click "Generate Full Document" or generate section-by-section
5. **Refine & Edit**:
   - Click section titles to edit
   - Use feedback buttons (👍/👎) to mark sections
   - Add feedback comments for improvements
   - Chat with AI for suggestions
6. **Export**: Click "Export" to download .docx file

### Creating a Presentation

1. **Click "New Presentation"** from dashboard
2. **Enter Project Details**:
   - Title: "Q4 Sales Review"
   - Description: "Sales performance analysis and future projections"
   - Type: Presentation (.pptx)
3. **Review Slide Structure**: AI suggests slides like Title, Overview, Data, Conclusion
4. **Auto-generation**: Empty slides generate automatically in batches
5. **Edit Slides**:
   - Click slide titles to rename
   - Edit bullet points inline
   - Add/remove bullets with buttons
   - Modify image suggestions
6. **Provide Feedback**:
   - 👍 Like slides you want to keep
   - 👎 Dislike and add feedback for regeneration
   - Comments auto-save as you type
7. **Export**: Click "Export" to download .pptx file

### Using the Feedback System

```
Step 1: Click 👎 Dislike
   ↓
Step 2: Comment box appears (red background)
   ↓
Step 3: Type feedback (auto-saves in 1.5s)
   ↓
Step 4: See "Auto-saved" indicator
   ↓
Step 5: Click "Regenerate" button
   ↓
Step 6: AI applies feedback and regenerates
   ↓
Step 7: Feedback clears, buttons reset
```

---

## 🎨 Screenshots

### Dashboard
![Dashboard](https://via.placeholder.com/800x450/4f46e5/ffffff?text=Dashboard+with+Statistics+%26+Filters)
*Search, filter, and manage all your projects*

### Document Editor
![Document Editor](https://via.placeholder.com/800x450/10b981/ffffff?text=Split+View+Editor+with+Live+Preview)
*Markdown editing with real-time HTML preview*

### Presentation Editor
![Presentation Editor](https://via.placeholder.com/800x450/f59e0b/ffffff?text=Slide+Editor+with+Thumbnails)
*Visual slide editing with navigation sidebar*

### Feedback System
![Feedback System](https://via.placeholder.com/800x450/ef4444/ffffff?text=Like%2FDislike+with+Comment+Box)
*Interactive feedback with auto-save comments*

---

## 🧪 Development

### Environment Variables

#### Backend `.env`
```env
DATABASE_URL="postgresql://user:password@localhost:5432/flux"
GEMINI_API_KEY="your-google-ai-api-key"
SECRET_KEY="your-secret-key-for-jwt"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

#### Frontend `.env` (optional)
```env
VITE_API_URL="http://localhost:8000"
```

### Building for Production

#### Backend
```bash
cd backend
# Use production WSGI server
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

#### Frontend
```bash
cd frontend
npm run build
# Output in dist/ folder
```

---

## 🗺️ Roadmap

### ✅ Completed (v1.0)
- [x] User authentication (JWT)
- [x] Dashboard with statistics
- [x] AI structure planning
- [x] Document & presentation editors
- [x] Manual editing (inline, add/remove, reorder)
- [x] Feedback system (like/dislike/comments)
- [x] Auto-save comments (debounced)
- [x] AI chat assistant with history
- [x] Export to DOCX/PPTX
- [x] Search & filter projects

### 🚧 Planned Features

#### Phase 1: Enhanced Editing
- [ ] Rich text editor (replace plain textarea)
- [ ] Image upload and management
- [ ] Custom themes and templates
- [ ] Version history (Git-like commits)
- [ ] Collaborative editing (real-time)

#### Phase 2: Advanced AI
- [ ] Multi-language support
- [ ] Tone adjustment (formal, casual, technical)
- [ ] Citation and reference management
- [ ] Plagiarism detection
- [ ] AI-powered grammar checking

#### Phase 3: Sharing & Collaboration
- [ ] Share projects with team members
- [ ] Role-based permissions (view, edit, admin)
- [ ] Comment threads on sections
- [ ] Real-time collaboration
- [ ] Activity feed

#### Phase 4: Export & Integration
- [ ] Export to PDF
- [ ] Export to HTML
- [ ] Google Drive integration
- [ ] Dropbox integration
- [ ] Email sharing

#### Phase 5: Analytics & Insights
- [ ] Writing analytics (word count, reading time)
- [ ] AI quality scoring
- [ ] Usage statistics
- [ ] Popular templates

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Contribution Guidelines
- Follow existing code style
- Write clear commit messages
- Add tests for new features
- Update documentation
- Keep PRs focused on single features

---

## 🙏 Acknowledgments

- **Google Gemini** - For powering our AI content generation
- **FastAPI** - For the blazing-fast backend framework
- **React Team** - For the amazing frontend library
- **Tailwind CSS** - For making styling a breeze
- **Prisma** - For type-safe database access
- **Lucide** - For beautiful icons

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/flux/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/flux/discussions)
- **Email**: support@flux.dev
- **Twitter**: [@FluxAI](https://twitter.com/fluxai)

---

## 📊 Stats

![GitHub Stars](https://img.shields.io/github/stars/yourusername/flux?style=social)
![GitHub Forks](https://img.shields.io/github/forks/yourusername/flux?style=social)
![GitHub Issues](https://img.shields.io/github/issues/yourusername/flux)
![GitHub Pull Requests](https://img.shields.io/github/issues-pr/yourusername/flux)

---

<div align="center">

**Made with ❤️ by the FLUX Team**

⭐ Star us on GitHub — it helps!

[Website](https://flux.dev) • [Documentation](https://docs.flux.dev) • [Blog](https://blog.flux.dev)

</div>
