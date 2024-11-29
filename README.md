# Disclaimer
In case you have received this project as a zip, here is the link to the original repository: https://github.com/Luquish/Chatbot.git

# Vercel AI SDK RAG Guide Starter Project

This is the starter project for the Vercel AI SDK [Retrieval-Augmented Generation (RAG) guide](https://sdk.vercel.ai/docs/guides/rag-chatbot).

In this project, you will build a chatbot that will only respond with information that it has within its knowledge base. The chatbot will be able to both store and retrieve information. This project has many interesting use cases from customer support through to building your own second brain!

## Tech Stack

This project uses the following technologies:

- [Next.js](https://nextjs.org) 14 (App Router)
- [Vercel AI SDK](https://sdk.vercel.ai/docs)
- [OpenAI](https://openai.com)
- [Drizzle ORM](https://orm.drizzle.team)
- [Postgres](https://www.postgresql.org/) with [pgvector](https://github.com/pgvector/pgvector)
- [shadcn-ui](https://ui.shadcn.com) and [TailwindCSS](https://tailwindcss.com) for styling

## Prerequisites

Before you begin, ensure you have:

- Node.js 18+ installed
- pnpm installed (`npm install -g pnpm`)
- PostgreSQL with pgvector extension installed
- An OpenAI API key
- Google OAuth credentials (for authentication)

## Getting Started

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <project-directory>
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up your environment variables:
   ```bash
   cp .env.example .env
   ```
   Fill in your environment variables in `.env`:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`: Your Google OAuth credentials

4. Initialize the database:
   ```bash
   pnpm db:generate   # Generate database schemas
   pnpm db:migrate    # Run migrations
   ```

5. Process your knowledge base:
   - Place PDF files in `data/pdfs/`
   - Place CSV files in `data/csvs/`
   ```bash
   pnpm process-pdfs  # Process PDF files
   pnpm process-csvs  # Process CSV files
   ```

6. Start the development server:
   ```bash
   pnpm dev
   ```

## Available Scripts

- `pnpm dev`: Start development server
- `pnpm build`: Build for production
- `pnpm start`: Start production server
- `pnpm lint`: Run linting
- `pnpm type-check`: Check TypeScript types
- `pnpm test`: Run tests
- `pnpm db:generate`: Generate database schemas
- `pnpm db:migrate`: Run database migrations
- `pnpm process-pdfs`: Process PDF files in data/pdfs/
- `pnpm process-csvs`: Process CSV files in data/csvs/

## Project Structure

```
.
├── app/                 # Next.js app directory
├── components/         # React components
├── lib/               # Core functionality
│   ├── actions/      # Database actions
│   ├── ai/           # AI-related functionality
│   ├── auth/         # Authentication
│   ├── db/           # Database configuration
│   └── utils/        # Utility functions
├── data/             # Data directory for PDFs and CSVs
│   ├── pdfs/        # PDF files for knowledge base
│   └── csvs/        # CSV files for knowledge base
└── extension/        # Browser extension files
```

## Features

- **RAG-powered Chatbot**: 
  - Responds using information from your knowledge base
  - Supports context-aware conversations
  - Provides relevant citations and sources

- **Document Processing**:
  - PDF processing with OCR support
  - CSV data integration
  - Automatic text chunking and embedding generation

- **Authentication & Security**:
  - Google OAuth integration
  - Secure session management
  - Role-based access control

- **Browser Extension**:
  - Access the chatbot from any webpage
  - Quick information lookup
  - Seamless integration with the main application

- **Calendar Integration**:
  - Meeting preparation assistance
  - Schedule awareness
  - Proactive meeting reminders

- **User Experience**:
  - Responsive design
  - Dark mode support
  - Markdown rendering
  - Real-time feedback system

## Development Guidelines

### Adding to the Knowledge Base

1. **PDF Documents**:
   - Place PDF files in `data/pdfs/`
   - Files should be text-searchable (OCR will be used as fallback)
   - Run `pnpm process-pdfs` to process new files

2. **CSV Data**:
   - Place CSV files in `data/csvs/`
   - Ensure proper column headers
   - Run `pnpm process-csvs` to process new files

### Database Management

- Use `pnpm db:generate` after schema changes
- Run `pnpm db:migrate` to apply migrations
- Back up your database regularly

### Environment Variables

Required environment variables:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
OPENAI_API_KEY="your-openai-api-key"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret"
```

## Browser Extension Setup

### Installation

1. Build the extension:
   ```bash
   pnpm generate-icons  # Generate extension icons
   pnpm build-extension # Build the extension files
   ```

2. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked"
   - Select the `extension` folder from your project directory

### Using the Extension

1. **Access the Chatbot**:
   - Click the Onwy icon in your Chrome toolbar
   - The chatbot interface will open in a popup window

2. **Features**:
   - **Quick Access**: Chat with Onwy from any webpage
   - **Calendar Integration**: 
     - Click the calendar icon to:
       - Schedule meetings
       - Check availability
       - Get meeting preparation assistance
   - **Meeting Tools**:
     - Use the meeting menu to:
       - Schedule new meetings
       - Get help with meeting preparation
   - **Course Information**:
     - Click the "Cursos" button for course-related queries

3. **Proactive Assistance**:
   The extension includes an intelligent system that will proactively offer help:
   - Meeting reminders
   - Task suggestions
   - Schedule awareness
   - Productivity tips

4. **Interface Elements**:
   - Message input at the bottom
   - Send button (or press Enter)
   - Loading indicators for responses
   - Markdown support for rich text formatting
   - Dark mode support for comfortable viewing

### Troubleshooting the Extension

1. **Extension Not Loading**:
   - Verify the extension is enabled in Chrome
   - Check that all extension files are properly built
   - Try removing and re-adding the extension

2. **Connection Issues**:
   - Ensure the main application is running
   - Check your internet connection
   - Verify the CORS settings in `next.config.js`

3. **Authentication Problems**:
   - Make sure you're logged in to the main application
   - Clear browser cookies if experiencing session issues
   - Check that Google OAuth is properly configured

### Security Notes

- The extension communicates only with your deployed instance
- All data is encrypted in transit
- Authentication tokens are securely stored
- The extension requests only necessary permissions

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Troubleshooting

Common issues and solutions:

1. **Database Connection Issues**:
   - Verify PostgreSQL is running
   - Check DATABASE_URL format
   - Ensure pgvector extension is installed

2. **PDF Processing Errors**:
   - Verify PDF files are not corrupted
   - Check OCR dependencies are installed
   - Ensure sufficient disk space

3. **Authentication Problems**:
   - Verify Google OAuth credentials
   - Check NEXTAUTH_URL matches your domain
   - Ensure all required environment variables are set

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Vercel AI SDK](https://sdk.vercel.ai/docs) team
- [OpenAI](https://openai.com) for their API
- All contributors who have helped shape this project