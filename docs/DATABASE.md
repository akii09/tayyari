# TayyariAI Database Documentation

## Overview

TayyariAI uses **SQLite** as its database solution, making it:
- ✅ **Zero Configuration** - No separate database server required
- ✅ **Portable** - Single file database
- ✅ **Open Source Friendly** - Easy to set up and contribute
- ✅ **Performance** - Fast for small to medium applications
- ✅ **ACID Compliant** - Reliable data integrity

## Quick Start

### 1. Installation
The database dependencies are automatically installed with the project:

```bash
npm install
```

### 2. Database Initialization
The database is automatically initialized when the application starts:

```bash
npm run dev
```

The database file will be created at: `./data/tayyari.db`

### 3. Manual Database Operations

```bash
# Generate new migrations (if schema changes)
npm run db:generate

# Apply migrations
npm run db:migrate

# View database in Drizzle Studio
npm run db:studio
```

## Database Schema

### Core Tables

#### 1. Users Table
Stores user onboarding information and profiles.

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,           -- UUID
  name TEXT NOT NULL,           -- Full name
  email TEXT UNIQUE,            -- Email address
  role TEXT NOT NULL,           -- Job role/title
  experience_level TEXT,        -- junior/mid/senior/lead
  years_of_experience INTEGER,  -- Years in the field
  
  -- Interview Preparation
  target_companies TEXT,        -- JSON array of companies
  target_roles TEXT,           -- JSON array of desired roles
  interview_types TEXT,        -- JSON: ['dsa', 'system_design', 'behavioral']
  target_date TEXT,            -- ISO date for target interview
  hours_per_week INTEGER,      -- Study commitment
  
  -- Skills & Preferences
  current_skills TEXT,         -- JSON object with skill ratings
  weak_areas TEXT,            -- JSON array of focus areas
  strong_areas TEXT,          -- JSON array of strengths
  difficulty_preference TEXT, -- easy/medium/hard
  learning_style TEXT,        -- visual/hands-on/reading/mixed
  
  -- Progress Tracking
  onboarding_completed BOOLEAN DEFAULT FALSE,
  current_streak INTEGER DEFAULT 0,
  total_study_hours REAL DEFAULT 0,
  last_active_date TEXT,
  
  -- Metadata
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

#### 2. Study Sessions Table
Tracks individual study sessions and practice.

```sql
CREATE TABLE study_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  session_type TEXT NOT NULL,      -- dsa/system_design/behavioral/mock_interview
  topic TEXT,                     -- Specific topic covered
  duration INTEGER NOT NULL,      -- Duration in minutes
  questions_attempted INTEGER,
  questions_completed INTEGER,
  difficulty_level TEXT,         -- easy/medium/hard
  score REAL,                    -- Performance score
  notes TEXT,                    -- User notes
  started_at TEXT NOT NULL,
  completed_at TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
```

#### 3. Conversations Table
Stores AI chat conversations.

```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  title TEXT,                    -- Auto-generated or user-defined
  context TEXT,                  -- general/dsa/system_design/behavioral
  message_count INTEGER DEFAULT 0,
  last_message_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

#### 4. Messages Table
Stores individual chat messages.

```sql
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id),
  role TEXT NOT NULL,            -- user/assistant
  content TEXT NOT NULL,         -- Message content
  attachments TEXT,              -- JSON array of file info
  tokens INTEGER,                -- Token count for AI messages
  model TEXT,                    -- AI model used
  feedback TEXT,                 -- positive/negative/null
  feedback_note TEXT,            -- Optional feedback details
  created_at TEXT DEFAULT (datetime('now'))
);
```

#### 5. User Progress Table
Tracks learning progress across different areas.

```sql
CREATE TABLE user_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  category TEXT NOT NULL,        -- dsa/system_design/behavioral
  subcategory TEXT,             -- arrays/graphs/caching
  total_questions INTEGER DEFAULT 0,
  completed_questions INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  average_time REAL,            -- Average time per question
  easy_completed INTEGER DEFAULT 0,
  medium_completed INTEGER DEFAULT 0,
  hard_completed INTEGER DEFAULT 0,
  last_practiced TEXT,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

#### 6. User Settings Table
Stores user preferences and settings.

```sql
CREATE TABLE user_settings (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  theme TEXT DEFAULT 'dark',     -- light/dark/system
  language TEXT DEFAULT 'en',
  font_size TEXT DEFAULT 'medium',
  email_notifications BOOLEAN DEFAULT TRUE,
  push_notifications BOOLEAN DEFAULT TRUE,
  weekly_reports BOOLEAN DEFAULT TRUE,
  reminder_time TEXT,           -- Daily reminder time
  share_progress BOOLEAN DEFAULT FALSE,
  public_profile BOOLEAN DEFAULT FALSE,
  analytics_opt_in BOOLEAN DEFAULT TRUE,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

## Database Services

### UserService
Handles all user-related operations:

```typescript
import { UserService } from '@/lib/database/services/userService';

// Create a new user
const user = await UserService.createUser({
  name: 'John Doe',
  email: 'john@example.com',
  role: 'Software Engineer',
  experienceLevel: 'mid',
  hoursPerWeek: 10,
});

// Get user with settings
const userData = await UserService.getUserById(userId);

// Complete onboarding
await UserService.completeOnboarding(userId, {
  targetCompanies: JSON.stringify(['Google', 'Meta']),
  interviewTypes: JSON.stringify(['dsa', 'system_design']),
});

// Get user statistics
const stats = await UserService.getUserStats(userId);
```

### ChatService
Handles chat conversations and messages:

```typescript
import { ChatService } from '@/lib/database/services/chatService';

// Create a conversation
const conversation = await ChatService.createConversation({
  userId: 'user-id',
  title: 'System Design Chat',
  context: 'system_design',
});

// Add a message
const message = await ChatService.addMessage({
  conversationId: conversation.id,
  role: 'user',
  content: 'How do I design a URL shortener?',
});

// Update message feedback
await ChatService.updateMessageFeedback(message.id, 'positive');

// Get conversation with messages
const chatData = await ChatService.getConversationWithMessages(conversationId);
```

## Database Configuration

### Environment Variables

```bash
# Optional: Custom database path
DATABASE_PATH=./data/tayyari.db

# For production, you might want to use a different path
DATABASE_PATH=/var/data/tayyari/database.db
```

### Performance Optimizations

The database is configured with the following optimizations:

```typescript
// WAL mode for better concurrent access
sqlite.pragma('journal_mode = WAL');

// Normal synchronous mode for better performance
sqlite.pragma('synchronous = NORMAL');

// Increased cache size
sqlite.pragma('cache_size = 1000000');

// Enable foreign keys
sqlite.pragma('foreign_keys = ON');

// Memory temp store
sqlite.pragma('temp_store = MEMORY');
```

## Data Types and Relationships

### JSON Fields
Several fields store JSON data for flexibility:

- `target_companies`: Array of company names
- `target_roles`: Array of desired roles
- `interview_types`: Array of interview types
- `current_skills`: Object with skill ratings
- `weak_areas` / `strong_areas`: Arrays of skill areas
- `attachments`: Array of file information

### Relationships
- Users have many StudySessions, Conversations, UserProgress entries
- Conversations have many Messages
- All user data cascades on user deletion

## Backup and Migration

### Creating Backups

```bash
# Simple file copy (database must be idle)
cp ./data/tayyari.db ./backups/tayyari-$(date +%Y%m%d).db

# Using SQLite backup command
sqlite3 ./data/tayyari.db ".backup ./backups/tayyari-backup.db"
```

### Database Migration

```bash
# Generate new migration
npm run db:generate

# Apply migrations
npm run db:migrate

# Reset database (development only)
rm ./data/tayyari.db && npm run db:migrate
```

## Development Tools

### Drizzle Studio
Visual database browser:

```bash
npm run db:studio
```

Access at: http://localhost:4983

### Direct SQLite Access

```bash
# Open database in SQLite CLI
sqlite3 ./data/tayyari.db

# Common queries
.tables                    # List all tables
.schema users             # Show table schema
SELECT * FROM users;      # Query data
```

## Production Considerations

### File Permissions
```bash
# Ensure proper permissions
chmod 644 ./data/tayyari.db
chown app:app ./data/tayyari.db
```

### Monitoring
- Monitor database file size
- Set up log rotation for WAL files
- Regular integrity checks: `PRAGMA integrity_check`

### Scaling
For high-traffic scenarios, consider:
- Read replicas using SQLite replication
- Connection pooling
- Migration to PostgreSQL if needed

## Troubleshooting

### Common Issues

1. **Database locked error**
   ```bash
   # Usually resolved by WAL mode, but check for long-running transactions
   sqlite3 ./data/tayyari.db "PRAGMA wal_checkpoint(FULL);"
   ```

2. **Permission denied**
   ```bash
   # Check file and directory permissions
   ls -la ./data/
   chmod 755 ./data/
   chmod 644 ./data/tayyari.db
   ```

3. **Corrupted database**
   ```bash
   # Check integrity
   sqlite3 ./data/tayyari.db "PRAGMA integrity_check;"
   
   # Repair if needed
   sqlite3 ./data/tayyari.db ".recover" | sqlite3 ./data/tayyari-recovered.db
   ```

## Contributing

When making schema changes:

1. Update `src/lib/database/schema.ts`
2. Generate migration: `npm run db:generate`
3. Test migration on development database
4. Update this documentation
5. Submit PR with schema changes and migration files

## Support

For database-related issues:
- Check the logs for detailed error messages
- Verify file permissions and disk space
- Use Drizzle Studio for debugging
- Refer to [SQLite documentation](https://sqlite.org/docs.html)
