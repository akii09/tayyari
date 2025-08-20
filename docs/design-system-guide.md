# Interview Prep Platform - Design System

## 🎨 Visual Identity

### Color Palette
```css
/* Primary Colors */
--electric-blue: #0066FF
--neon-green: #00FF88
--deep-purple: #6366F1

/* Neutral Palette */
--bg-primary: #0A0A0B      /* Deep black */
--bg-secondary: #161618    /* Card backgrounds */
--bg-tertiary: #242428     /* Elevated surfaces */

--text-primary: #FFFFFF    /* Primary text */
--text-secondary: #A1A1AA  /* Secondary text */
--text-muted: #71717A      /* Muted text */

/* Accent Colors */
--success: #10B981
--warning: #F59E0B
--error: #EF4444
--info: #3B82F6

/* Glass Effects */
--glass-bg: rgba(22, 22, 24, 0.8)
--glass-border: rgba(255, 255, 255, 0.1)
```

### Typography Scale
```css
/* Font Family */
font-family: 'Inter Variable', 'Geist', -apple-system, system-ui

/* Scale */
--text-xs: 12px     /* Labels, captions */
--text-sm: 14px     /* Body small */
--text-base: 16px   /* Body */
--text-lg: 18px     /* Body large */
--text-xl: 20px     /* Headings small */
--text-2xl: 24px    /* Headings */
--text-3xl: 30px    /* Headings large */
--text-4xl: 36px    /* Display */
--text-5xl: 48px    /* Hero */
```

### Spacing System
```css
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-6: 24px
--space-8: 32px
--space-12: 48px
--space-16: 64px
--space-24: 96px
```

### Border Radius
```css
--radius-sm: 8px
--radius-md: 12px
--radius-lg: 16px
--radius-xl: 24px
--radius-full: 9999px
```

## 🏗️ Layout Architecture

### Container System
```css
.container-sm { max-width: 640px }   /* Mobile-first */
.container-md { max-width: 768px }   /* Tablet */
.container-lg { max-width: 1024px }  /* Desktop */
.container-xl { max-width: 1280px }  /* Large desktop */
```

### Grid System (CSS Grid)
```css
.grid-responsive {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: var(--space-6);
}
```

## 🎯 Component Anatomy

### 1. Onboarding Flow

**Layout**: Full-screen stepped wizard
```
┌─────────────────────────────────────┐
│  ●●○○ Progress Dots (top-center)    │
│                                     │
│         [Animated Icon/Visual]      │
│              Question Title         │
│           Subtitle/Description      │
│                                     │
│         [Interactive Element]       │
│          • Text input               │
│          • Multi-select cards       │
│          • Slider/Range             │
│                                     │
│    [Skip]              [Continue] → │
└─────────────────────────────────────┘
```

**Interactions**:
- Smooth page transitions (slide/fade)
- Auto-progress for certain inputs
- Smart validation with inline feedback
- Progress persistence

### 2. Main Chat Interface

**Layout**: Conversational with integrated tools
```
┌─────────────────────────────────────────────────────┐
│ ◐ AI Prep Assistant    📊 Progress    ⚡ 94% Ready │ Header
├─────────────────────────────────────────────────────┤
│                                                     │
│  💬 AI: Ready to tackle system design? Let's start │ 
│      with a classic: "Design a URL shortener"      │
│                                                     │ Chat Area
│  👤 You: Can you give me hints about the database? │ (Scrollable)
│                                                     │
│  💬 AI: [Code Editor Opens Inline]                 │
│      ```sql                                        │
│      CREATE TABLE urls (                           │
│        id BIGINT PRIMARY KEY,                      │
│        short_url VARCHAR(10),                      │
│        original_url TEXT                           │
│      );                                           │
│      ```                                          │
├─────────────────────────────────────────────────────┤
│ 💭 Type your answer... │ 📎 │ 🎯 │ </> │ ➤ Submit │ Input
└─────────────────────────────────────────────────────┘
```

**Features**:
- Floating action buttons for tools
- Inline code editor with syntax highlighting
- Rich text formatting toolbar
- Smart suggestions as you type
- Voice input option

### 3. Progress Dashboard (Floating Overlay)

**Trigger**: Click progress indicator in header
**Layout**: Glass morphism modal
```
┌─────────────────────────────┐
│  🎯 Your Progress           │
│  ─────────────────────────  │
│                             │
│  ██████████░░  83%          │
│  System Design              │
│                             │
│  █████████░░░  75%          │
│  Data Structures            │
│                             │
│  ████████████  100%         │
│  JavaScript Fundamentals    │
│                             │
│  📅 Next: Mock Interview    │
│      Tomorrow at 2:00 PM    │
│                             │
│  [View Full Roadmap]        │
└─────────────────────────────┘
```

## 🎨 Visual Elements

### Glassmorphism Cards
```css
.glass-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
```

### Gradient Accents
```css
.gradient-primary {
  background: linear-gradient(135deg, var(--electric-blue), var(--deep-purple));
}

.gradient-success {
  background: linear-gradient(135deg, var(--neon-green), var(--success));
}
```

### Interactive States
```css
/* Hover Effects */
.interactive:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 40px rgba(0, 102, 255, 0.15);
  transition: all 0.2s ease;
}

/* Focus States */
.interactive:focus {
  outline: 2px solid var(--electric-blue);
  outline-offset: 2px;
}
```

## 🔄 Micro-Interactions

### Loading States
- **Skeleton screens** for content loading
- **Pulse animations** for real-time AI responses
- **Progress bars** with smooth animations

### Transitions
```css
/* Page transitions */
.page-enter {
  opacity: 0;
  transform: translateX(20px);
}

.page-enter-active {
  opacity: 1;
  transform: translateX(0);
  transition: all 0.3s ease-out;
}
```

### Feedback Animations
- **Success**: Green checkmark with bounce
- **Error**: Red shake animation
- **Processing**: Pulsing dots or spinner

## 📱 Responsive Behavior

### Breakpoints
```css
/* Mobile First */
@media (min-width: 640px)  { /* sm */ }
@media (min-width: 768px)  { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

### Mobile Optimizations
- **Touch targets**: Minimum 44px
- **Swipe gestures**: Navigate between steps
- **Bottom sheet**: For tool selection
- **Sticky input**: Always visible chat input

## 🎭 Component Library Structure

### Base Components
```
Button/
├── Button.tsx
├── Button.variants.ts
└── Button.stories.tsx

Input/
├── Input.tsx
├── InputGroup.tsx
└── Input.variants.ts

Card/
├── Card.tsx
├── GlassCard.tsx
└── InteractiveCard.tsx
```

### Composite Components
```
ChatMessage/
├── ChatMessage.tsx
├── CodeBlock.tsx
├── MessageActions.tsx
└── MessageThread.tsx

ProgressIndicator/
├── CircularProgress.tsx
├── LinearProgress.tsx
└── SkillProgress.tsx
```

## 🌟 Special Features

### Code Editor Integration
- **Monaco Editor** embedded in chat
- **Syntax highlighting** for 20+ languages
- **Auto-completion** and error detection
- **Resizable** and **fullscreen** modes

### Rich Text Support
- **Markdown** rendering in real-time
- **Math equations** with KaTeX
- **Diagrams** with Mermaid
- **Tables** and **lists** formatting

### Accessibility
- **High contrast** mode toggle
- **Keyboard navigation** for all interactions
- **Screen reader** optimized
- **Focus management** in modals

## 🚀 Animation Library

### Custom Animations
```css
@keyframes pulse-glow {
  0% { box-shadow: 0 0 0 0 rgba(0, 102, 255, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(0, 102, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(0, 102, 255, 0); }
}

@keyframes typing {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}
```

This design system creates a modern, engaging experience that feels more like a premium AI assistant than a traditional learning platform. The focus is on conversation, progress, and seamless interaction.