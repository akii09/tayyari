## 1. **Onboarding Flow (Fast & Smart)**

* Use your **glass cards (`.glass-card`)** for each step.

* Instead of a long wizard → keep **3–4 smart steps max**:

  1. Choose interview type (DSA, System Design, Behavioral).
  2. Set target date & hours/week.
  3. AI suggests a roadmap → user confirms → Done 🚀.

* **UI tokens in play**:

  * **Progress Dots** → `--electric-blue` active, `--text-muted` inactive.
  * **Buttons** → gradient accent (`.gradient-primary`).
  * **Transitions** → `page-enter` animation (already in system).

---

## 2. **Main Chat Interface (The Heart ❤️)**

Think **AI + IDE + Chat** combined.

### Layout

```
[Header]
  ◐ TayyariAI | 📊 Progress (clickable) | ⚡ Focus Score

[Chat Stream]
  - AI + User messages
  - Inline editor (Monaco)
  - Rich markdown (code, LaTeX, Mermaid)
  - Glass cards per message

[Input]
  [ 💭 Type here... ] [📎 Attach] [🎯 Quick Action] [</> Code Mode] [➤ Send]
```

### UX Enhancements

* **Inline Monaco Editor**: embedded inside `.glass-card`.
* **Quick Action Chips** → “Generate Plan”, “Mock Interview”, “Summarize”.
* **Rich Text Support**: markdown → code blocks, diagrams, equations.
* **Micro-interactions**: AI responses pulse with `pulse-glow`.

### Tokens in play

* **Chat bubbles**: `--bg-secondary` with `--radius-lg`.
* **Code blocks**: `--bg-tertiary`, syntax colors.
* **Hover actions**: `.interactive:hover` → lift & glow.

---

## 3. **Progress Dashboard (Floating Glass Overlay)**

Triggered by **📊 Progress** in header.

* Glass modal (`.glass-card`) sliding from top-right.
* Components:

  * **CircularProgress** → skill categories (System Design, DSA, JS).
  * **LinearProgress** → sub-skills.
  * **Timeline Node** → “Next: Mock Interview → Aug 25, 2PM”.
  * **Focus Score Orb** → glowing gradient orb (`.gradient-primary`) that grows/shrinks with performance.

### Tokens in play

* **Modal BG** → `--glass-bg` + `blur(12px)`.
* **Skill Progress Bars** → `.gradient-success`.
* **Animations** → smooth scale + opacity.

---

## 4. **Roadmap View (Interactive, Not Tabular)**

Instead of a boring dashboard → make it **scrollable, gamified**.

* Horizontal timeline with milestones (like Notion AI roadmaps).
* Nodes = `.glass-card` with emoji icons.
* Hover → expand node (progress, tasks, resources).
* **Completion** → glowing ring with `pulse-glow`.

---

## 5. **Utility Features**

* **Command Palette (`⌘K`)** → quick access to features.
* **Context Drawer** (toggleable right panel) → AI memory, notes, references.
* **Voice Input**: micro button in chat input.
* **Achievements**: gamified badges (glass pills with gradient border).

---

## 6. **Micro-interactions & Animations**

* **AI Typing** → 3 pulsing dots (`typing` animation).
* **Loading skeletons** → `--bg-tertiary` shimmer.
* **Message arrival** → slight slide-up + fade-in.
* **Progress ring** → animates with stroke-dasharray instead of instant jump.

---

## 7. **Responsive Strategy**

* **Mobile-first** → sticky chat input + bottom-sheet for roadmap/progress.
* **Tablet/Desktop** → floating overlays (glass modals) instead of fixed sidebars.
* **Large desktop** → split screen: Chat (left 2/3), Progress/Roadmap (right 1/3).

---

## 8. **Branding & Personality**

* Keep it **fun but professional** →

  * AI avatar = glowing orb (not robot face).
  * Tone = encouraging coach, not corporate.
* Slogan visible only in onboarding:
  **“Smarter Prep. Faster Progress.”**