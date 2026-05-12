<div align="center">

# USRA PLUS

### Your Family Operating System

<img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js" alt="Next.js 16" />
<img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" alt="TypeScript 5" />
<img src="https://img.shields.io/badge/Supabase-PostgreSQL-green?style=for-the-badge&logo=supabase" alt="Supabase" />
<img src="https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS 4" />

*A premium family coordination and household management SaaS — Saudi-first, bilingual (Arabic RTL + English), mobile-first, real-time.*

[Getting Started](#-getting-started) · [User Guide](#-user-guide) · [Admin Guide](#-super-admin-dashboard-guide) · [API Reference](#-api-reference) · [Deployment](#-deployment)

</div>

---

## Table of Contents

1. [Overview](#-overview)
2. [Features at a Glance](#-features-at-a-glance)
3. [Getting Started](#-getting-started)
4. [Installation Guide](#-installation-guide)
5. [Configuration](#-configuration)
6. [User Guide](#-user-guide)
   - [Creating an Account](#creating-an-account)
   - [Onboarding: Setting Up Your Family](#onboarding-setting-up-your-family)
   - [Inviting Family Members](#inviting-family-members)
   - [Navigating the App](#navigating-the-app)
   - [Task Management](#task-management)
   - [Calendar](#calendar)
   - [Grocery List](#grocery-list)
   - [Meal Planning](#meal-planning)
   - [Family Chat](#family-chat)
   - [Budget Tracking](#budget-tracking)
   - [Family Milestones](#family-milestones)
   - [Household Chores](#household-chores)
   - [Family Files](#family-files)
   - [Settings](#settings)
   - [Notifications](#notifications)
   - [AI Features](#ai-features)
   - [Keyboard Shortcuts](#keyboard-shortcuts)
   - [Switching Languages (EN / AR)](#switching-languages-en--ar)
7. [Subscription Plans & Free Trial](#-subscription-plans--free-trial)
   - [3-Day Free Trial](#3-day-free-trial)
   - [Plan Comparison](#plan-comparison)
   - [How Plan Limits Are Enforced](#how-plan-limits-are-enforced)
   - [Upgrading Your Plan](#upgrading-your-plan)
8. [Super Admin Dashboard Guide](#-super-admin-dashboard-guide)
   - [Accessing the Admin Dashboard](#accessing-the-admin-dashboard)
   - [Platform Overview](#platform-overview)
   - [User Analytics](#user-analytics)
   - [Family Analytics](#family-analytics)
   - [Feature Flags](#feature-flags--feature-usage)
   - [Subscriptions (Revenue Vault)](#subscriptions--revenue-vault)
   - [Bug Detection](#bug-detection)
   - [Infrastructure](#infrastructure)
   - [Support Center](#support-center)
   - [System Settings](#system-settings)
   - [Admin Security Features](#admin-security-features)
   - [Audit Logging](#audit-logging)
9. [Architecture](#-architecture)
   - [Technology Stack](#technology-stack)
   - [Project Structure](#project-structure)
   - [State Management](#state-management)
   - [Authentication Flow](#authentication-flow)
   - [Data Flow](#data-flow-architecture)
10. [API Reference](#-api-reference)
11. [Database Schema](#-database-schema)
12. [Deployment](#-deployment)
13. [Troubleshooting](#-troubleshooting)
14. [Security](#-security)

---

## 🌟 Overview

USRA PLUS is not just another to-do list. It's a **complete family operating system** that brings every aspect of household management into one seamless platform:

- 🇸🇦 **Saudi-First Design** — Arabic (RTL) as a first-class language, Hijri date support, Saudi Riyal (SAR) currency, prayer times
- 👨‍👩‍👧‍👦 **Family-Centric** — Every feature is designed around families, not individuals
- 📱 **Mobile-First** — Touch-optimized with swipe navigation, bottom nav, responsive layouts
- 🌙 **Dark & Light Themes** — Beautiful in both modes
- ⚡ **Real-Time Sync** — Powered by Supabase Realtime for instant updates across all family members
- 🔒 **Enterprise Security** — Row Level Security (RLS), HMAC-signed admin sessions, rate limiting, server-side subscription enforcement
- 🛡️ **Super Admin Dashboard** — Full control over users, families, subscriptions, feature flags, bug detection, and infrastructure
- 🆓 **3-Day Free Trial** — No credit card required, auto-downgrade to Free plan after trial

---

## ✨ Features at a Glance

| Feature | Description |
|---------|-------------|
| **📋 Task Management** | Kanban board + list view, priorities, assignments, due dates, subtasks, recurring tasks |
| **📅 Calendar** | Month/Week/Day/Agenda views, recurring events, family assignment |
| **🛒 Grocery List** | Smart categories, quantity tracking, AI recipes, export to WhatsApp |
| **🍽️ Meal Planning** | Weekly planner, AI suggestions, auto-add ingredients to grocery |
| **💬 Family Chat** | Real-time messaging, voice messages, image/file sharing, reactions, online status |
| **💰 Budget Tracking** | Monthly budget, SAR currency, spending charts, expense categories |
| **🎯 Milestones** | Birthdays, anniversaries, Hijri dates, recurring reminders |
| **🏠 Chores** | Chore rotation, difficulty levels, completion leaderboard |
| **📂 Family Files** | File upload, storage tracking, search |
| **🔔 Notifications** | Real-time delivery, category filters, quiet hours |
| **🤖 AI Features** | Activity summary, meal suggestions, recipe ideas, avatar generation |
| **🛡️ Super Admin** | User management, feature flags, subscription control, bug detection, audit logs |
| **🆓 Free Trial** | 3-day trial with no credit card, auto-downgrade |

---

## 🚀 Getting Started

### Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| **Node.js** | 18+ | JavaScript runtime |
| **Bun** | Latest | Package manager (recommended, much faster) |
| **Supabase Account** | — | Backend database, auth, realtime, storage |
| **Vercel Account** | — | Deployment platform (recommended) |

### Quick Start (5 minutes)

```bash
# 1. Clone the repository
git clone https://github.com/ahmedibm9-cyber/usra-plus.git
cd usra-plus

# 2. Install dependencies
bun install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials (see Configuration section)

# 4. Run the development server
bun run dev

# 5. Open the Preview Panel to see the app
```

> **Note:** The app runs on port 3000. Use the Preview Panel on the right side of the interface to view it. Click "Open in New Tab" for a full-screen experience.

---

## 📦 Installation Guide

### Step 1: Clone the Repository

```bash
git clone https://github.com/ahmedibm9-cyber/usra-plus.git
cd usra-plus
```

### Step 2: Install Dependencies

```bash
# Using Bun (recommended — significantly faster)
bun install

# Or using npm
npm install
```

### Step 3: Set Up Supabase

1. **Create a Supabase project** at [supabase.com](https://supabase.com)
2. **Copy your project URL and keys** from Project Settings → API
3. **Run the database migration** (see [Database Schema](#-database-schema) section)

### Step 4: Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# ────────────── Required ──────────────
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Admin
ADMIN_PASSWORD=your-secure-admin-password
ADMIN_SESSION_SECRET=your-hmac-secret-key

# ────────────── Optional ──────────────
# AI Features
ZAI_API_KEY=your-z-ai-api-key
```

> ⚠️ **Security**: `SUPABASE_SERVICE_ROLE_KEY` must NEVER be exposed to the client-side. It is only used in server-side API routes.

### Step 5: Run Database Migrations

Open your **Supabase SQL Editor** and run the migration file:

```
supabase/rls-and-indexes-migration.sql
```

Copy the contents and paste it into the Supabase SQL Editor, then click **Run**.

This will:
- Create all required tables (profiles, families, tasks, chat_messages, etc.)
- Enable Row Level Security (RLS) on every table
- Create security policies that enforce data access rules
- Add performance indexes for high-frequency queries

### Step 6: Start the Development Server

```bash
bun run dev
```

The app will be available in the Preview Panel.

---

## ⚙️ Configuration

### Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous key (safe for client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (server-side ONLY — never expose to client) |
| `ADMIN_PASSWORD` | ✅ | Password for super-admin dashboard access |
| `ADMIN_SESSION_SECRET` | ✅ | HMAC secret for signing admin session tokens |
| `ZAI_API_KEY` | ❌ | Z-AI API key for AI features (summary, meal suggestions, avatars) |

### Supabase Configuration

1. **Authentication**: Enable Email/Password provider in Supabase Dashboard → Authentication → Providers
2. **Google OAuth** (optional): Enable Google provider and configure OAuth credentials
3. **Storage**: Create a `family-files` bucket in Supabase Dashboard → Storage
4. **Realtime**: Enable Realtime for the `chat_messages` and `notifications` tables
   - Go to Database → Replication
   - Enable Realtime for `chat_messages` and `notifications`

### Next.js Configuration

The app uses `next.config.ts` with conditional output settings:

```typescript
// For Vercel deployment (serverless)
output: process.env.VERCEL ? undefined : "standalone"
```

This means:
- **On Vercel**: Uses serverless output (auto-detected)
- **Self-hosted**: Uses standalone output for Docker/bare-metal deployment

---

## 📱 User Guide

### Creating an Account

1. Open the app — you'll see the **Login** screen
2. Click **"Create Account"** to switch to the signup form
3. Enter your **first name**, **last name**, **email**, and **password** (minimum 8 characters)
4. Click **"Sign Up"**
5. Check your email for a verification link from Supabase
6. After verifying, log in with your credentials
7. **Your 3-day free trial starts automatically** — no credit card needed

> 💡 **Tip**: You can switch between English and Arabic on the login screen using the language toggle.

### Onboarding: Setting Up Your Family

After your first login, the **Onboarding Flow** will guide you through 4 steps:

1. **Create a Family** — Enter a family name (e.g., "Al-Ahmad Family") and optional description
2. **Choose an Avatar** — Pick a family avatar and color theme
3. **Invite Members** — Share the invite code or QR code with family members
4. **Get Started** — You're ready to use USRA PLUS!

> 💡 **Tip**: You can skip the onboarding and complete it later from Settings → Family Management.

### Inviting Family Members

1. Go to **Settings** → **Family Management**
2. Find your **Invite Code** at the top
3. Share the code in one of these ways:
   - **Copy Code** — Paste it in a message to your family
   - **Share via WhatsApp** — Sends a pre-written message with the code
   - **QR Code** — Family members can scan the QR code with their phone camera to join
4. Family members enter the code during their onboarding process

### Navigating the App

#### Desktop
- **Sidebar** (left) — Click any page icon to navigate between sections
- **Command Palette** — Press `⌘K` (Mac) or `Ctrl+K` (Windows) to open search and quick actions
- **Header** — Quick actions, search, notifications, and profile menu

#### Mobile
- **Bottom Navigation** — Tap icons to switch between Dashboard, Tasks, Chat, Settings, and more
- **Swipe Navigation** — Swipe left/right to move between pages
- **Floating Action Button (FAB)** — Quick-create tasks, events, or grocery items from any page

### Task Management

#### Creating a Task
1. Navigate to **Tasks** page (sidebar or bottom nav)
2. Click the **"+"** button or the floating action button
3. Fill in:
   - **Title** (required) — What needs to be done
   - **Description** (optional) — More details
   - **Assign To** — Pick a family member
   - **Priority** — Low, Medium, High, or Urgent (color-coded)
   - **Due Date** — When it should be completed
4. Click **"Create Task"**

#### Using the Kanban Board
- **Drag and drop** tasks between columns: To Do → In Progress → Done
- **Click** a task card to see details, add comments, or edit
- **Filter** by assignee, priority, or due date using the filter bar
- **Switch to List View** using the toggle in the page header

#### Task Features
- **Subtasks** — Break large tasks into smaller steps
- **Comments** — Discuss tasks with family members
- **Recurring Tasks** — Set tasks to repeat daily, weekly, or monthly
- **Completion Sound** — Hear a satisfying sound when you mark a task as done 🎉
- **Confetti** — Visual celebration when completing tasks

### Calendar

1. Navigate to **Calendar** page
2. **Switch views** using the view selector: Month, Week, Day, or Agenda
3. **Create events** by clicking on a date or the "+" button:
   - **Title** (required) — Event name
   - **Start/End Time** — When it happens
   - **All Day** — Toggle for full-day events
   - **Color** — Color-code events for different family members
   - **Location** — Where it takes place
   - **Assign To** — Who it's for
   - **Recurring** — Daily, weekly, monthly, or yearly
4. **Navigate months** using the mini calendar in the sidebar
5. **Click** an event to see details or edit it

### Grocery List

1. Navigate to **Grocery** page
2. **Add items** by typing the name and selecting a category:
   - 🍎 Fruits & Vegetables
   - 🥛 Dairy
   - 🥩 Meat
   - 🍞 Bakery
   - 🥤 Beverages
   - 🍿 Snacks
   - 🧊 Frozen
   - 🧹 Household
3. **Set quantities** for each item
4. **Check off** items as you shop — the progress bar updates in real-time
5. **Export** your list:
   - **Copy to Clipboard** — Paste anywhere
   - **Share via WhatsApp** — Sends a formatted list
   - **Download as Text** — Save as a .txt file
6. **Clear checked** items when you're done shopping
7. **Recipe Ideas** — At the bottom, get AI-powered recipe suggestions based on your items

### Meal Planning

1. Navigate to **Meal Plan** page
2. You'll see a **weekly grid** with meal slots: Breakfast, Lunch, Dinner, Snack
3. Click on any empty slot to add a meal:
   - **Meal Title** — What you're cooking
   - **Prep Time** — How long it takes
   - **Calories** — Nutritional information
   - **Ingredients** — What you need (with quantities)
   - **Recipe URL** — Link to the full recipe
4. Click **"Add All Ingredients to Grocery"** — this automatically populates your grocery list with all the meal's ingredients
5. **AI Suggestions** — Click the AI button to get meal ideas based on your grocery list and preferences
6. **Week Summary** — See total meals planned, ingredients needed, and nutritional overview

### Family Chat

1. Navigate to **Chat** page
2. **Type** a message and press Enter or click Send
3. **Send images** by clicking the image icon 📷
4. **Send files** by clicking the paperclip icon 📎
5. **Record voice messages** by tapping and holding the microphone 🎤
6. **React** to messages by hovering and picking an emoji
7. **Search** messages using the search bar at the top
8. **Online Status** — See who's currently online (green dot) and who's typing
9. **Connection Indicator** — Know when you're connected (green) or offline (gray)

> 💡 **Tip**: Chat messages sync in real-time across all family members via Supabase Realtime. If someone is offline, they'll see new messages when they reconnect.

### Budget Tracking

1. Navigate to **Budget** page
2. **Set your monthly budget** — Enter the total amount in SAR (Saudi Riyal)
3. **Add expenses** with:
   - **Title** — What you spent on
   - **Amount** — How much (SAR)
   - **Category** — Food, Housing, Transport, Education, Health, Entertainment, Shopping, Utilities
   - **Date** — When you spent it
   - **Paid By** — Which family member paid
4. **View charts** — Spending breakdown by category with Recharts visualizations
5. **Progress bar** — Shows how much of your budget is used (green → yellow → red)
6. **Sort** expenses by date or amount
7. **Auto-Distribute** — Split expenses among family members

> 📌 **Note**: Budget Tracking is available on Pro and Family+ plans only.

### Family Milestones

1. Navigate to **Milestones** page
2. **Add milestones** for important dates:
   - 🎂 Birthdays
   - 💍 Anniversaries
   - 🎓 Graduations
   - 🏆 Achievements
   - 📅 Custom events
3. **Set reminders** — Choose how many days before to get notified
4. **Enable Hijri dates** — See Islamic calendar equivalents alongside Gregorian dates
5. **Mark as recurring** — Yearly reminders for birthdays and anniversaries
6. **Timeline View** — Visual timeline of all family milestones
7. **Upcoming Alerts** — See what's coming up today, tomorrow, this week, this month
8. **Age Calculator** — Automatically calculates ages for birthday milestones

### Household Chores

1. Navigate to **Chores** page
2. **Create chores** with:
   - **Title** — What needs to be done
   - **Frequency** — Daily, weekly, bi-weekly, or monthly
   - **Difficulty** — Easy, Medium, Hard (with estimated time)
   - **Assignees** — Which family members rotate through this chore
3. **Chore Rotation** — The app automatically rotates chores between assigned family members
4. **Rotation Preview** — See the next 2 weeks of chore assignments
5. **Completion Tracking** — Leaderboard showing who's contributing most
6. **Pause & Resume** — Temporarily pause chores when someone's away

### Family Files

1. Navigate to **Files** page
2. **Upload files** by clicking the upload button or dragging and dropping
3. **Supported types** — Documents, photos, PDFs, and more
4. **Storage tracking** — See how much of your plan's storage limit you've used
5. **Search** — Find files by name or type
6. **Upload details** — See who uploaded what and when

> 📌 **Storage Limits**: Free = 100 MB, Pro = 1 GB, Family+ = 10 GB

### Settings

Access Settings from the sidebar or bottom navigation.

#### Profile Management
- Edit first name, last name, phone number
- Change your avatar (or generate one with AI)
- Update email (requires verification)

#### Family Management
- Change family name and description
- View all family members and their roles
- Generate new invite code
- Remove family members (owner/admin only)
- Leave a family

#### Preferences
- **Language** — Switch between English and Arabic (full RTL support)
- **Theme** — Dark mode, Light mode, or System preference
- **Notification Preferences** — Fine-grained control:
  - Push notifications (on/off by category)
  - Email notifications (on/off by category)
  - In-app notifications
  - Quiet Hours — Mute notifications during specified hours

#### Data Control
- **Export Data** — Download your data as JSON or CSV
- **Import Data** — Upload a previously exported file
- **Clear Data** — Remove all your data (irreversible)

#### Keyboard Shortcuts
- View and customize all keyboard shortcuts

#### Guided Tour
- Restart the interactive walkthrough for new users

### Notifications

- **Real-Time Delivery** — Instant notifications via Supabase Realtime
- **Categories**: Tasks, Calendar, Grocery, Family, Chat
- **Notification Sound** — Customizable sound for new notifications
- **Mark All Read** — Clear notification badges in one tap
- **Quiet Hours** — Schedule notification-free periods (e.g., 10 PM – 7 AM)

### AI Features

| Feature | Plan Required | Description |
|---------|--------------|-------------|
| **AI Summary** | Pro, Family+ | Daily family activity summary — what was accomplished, what's upcoming |
| **Meal Suggestions** | Pro, Family+ | AI-powered meal recommendations based on your preferences and groceries |
| **Recipe Ideas** | Pro, Family+ | Recipe suggestions based on items in your grocery list |
| **Avatar Generation** | Family+ | AI-generated family avatars and profile pictures |

> 💡 **Tip**: AI features use the Z-AI API. Set `ZAI_API_KEY` in your environment variables to enable them.

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘/Ctrl + K` | Open command palette / search |
| `⌘/Ctrl + /` | Show keyboard shortcuts modal |
| `1` – `9` | Navigate to pages (1=Dashboard, 2=Tasks, 3=Calendar, etc.) |
| `N` | New task / event / item (context-dependent) |
| `Escape` | Close dialog / modal |
| `?` | Show help |

### Switching Languages (EN / AR)

1. **On the Login screen** — Click the language toggle (EN / AR) in the top-right corner
2. **In Settings** → **Preferences** → Select English or Arabic
3. The entire app switches immediately, including:
   - Navigation labels and buttons
   - Form fields and error messages
   - Date formats (Gregorian ↔ Hijri)
   - Text direction (LTR ↔ RTL) — the entire layout flips
   - Currency formatting (SAR)

> 🇸🇦 **Arabic is a first-class language** — not a translation afterthought. All features work identically in both languages.

---

## 💎 Subscription Plans & Free Trial

### 3-Day Free Trial

Every new user automatically receives a **3-day free trial** of the Pro plan:

- ✅ **No credit card required** — just sign up and start
- ✅ **Full Pro features** for 3 days — unlimited tasks, AI insights, meal planning, budget tracking
- ⏰ **Auto-downgrade** — After 3 days, your account automatically reverts to the Free plan
- 🔔 **Reminder notification** — You'll get a notification before your trial expires
- 🔄 **No data loss** — All data created during the trial is preserved, but access to Pro features is restricted after downgrade

**Trial Timeline:**
```
Day 0: Sign up → Trial starts → Full Pro access
Day 1: Enjoy all Pro features
Day 2: Reminder notification: "Your trial expires tomorrow"
Day 3: Trial expires → Auto-downgrade to Free plan
       → Tasks beyond 10 are read-only
       → Pro features show upgrade prompt
```

### Plan Comparison

| Feature | 🆓 Free | ⭐ Pro | 👨‍👩‍👧‍👦 Family+ |
|---------|---------|-------|----------|
| **Price** | SAR 0/month | SAR 9.99/month | SAR 19.99/month |
| **Free Trial** | — | 3 days (auto) | — |
| **Tasks** | 10 tasks | Unlimited | Unlimited |
| **Family Members** | 5 | 15 | Unlimited |
| **Families** | 1 | 1 | Unlimited |
| **Storage** | 100 MB | 1 GB | 10 GB |
| **Real-Time Sync** | ✅ | ✅ | ✅ |
| **Chat** | ✅ | ✅ | ✅ |
| **Calendar** | ✅ | ✅ | ✅ |
| **Meal Planning** | ✅ | ✅ | ✅ |
| **Grocery List** | ✅ | ✅ | ✅ |
| **Chores** | ✅ | ✅ | ✅ |
| **Milestones** | ✅ | ✅ | ✅ |
| **Budget Tracking** | ❌ | ✅ | ✅ |
| **AI Features** | ❌ | ✅ | ✅ |
| **Advanced Analytics** | ❌ | ❌ | ✅ |
| **Priority Support** | ❌ | ❌ | ✅ |
| **Custom Avatars** | ❌ | ❌ | ✅ |
| **Hijri Calendar** | ❌ | ✅ | ✅ |
| **QR Code Invites** | ✅ | ✅ | ✅ |

### How Plan Limits Are Enforced

USRA PLUS uses a **three-layer enforcement** system to ensure plan limits are always respected:

```
┌──────────────────────────────────────────────────────┐
│ Layer 1: Client-Side (UX)                            │
│ → Shows upgrade prompts when limits are reached      │
│ → Visual indicators (plan badges, lock icons)        │
│ → NOT security — can be bypassed with dev tools      │
└──────────────────────┬───────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────┐
│ Layer 2: Server-Side API (Validation)                │
│ → API routes validate subscription before actions    │
│ → Returns 403 Forbidden if plan limit exceeded       │
│ → Cannot be bypassed by client-side modifications    │
└──────────────────────┬───────────────────────────────┘
                       │
┌──────────────────────▼───────────────────────────────┐
│ Layer 3: Supabase RLS (Database)                     │
│ → Row Level Security policies prevent data access    │
│ → Users can ONLY read/write within their plan limits │
│ → Even direct database queries are blocked           │
└──────────────────────────────────────────────────────┘
```

**Example: Creating a task on the Free plan**
```
User clicks "Create Task"
  → Client checks: "You have 10/10 tasks. Show upgrade modal."
  → If bypassed: API returns 403 "Task limit reached for Free plan"
  → If further bypassed: Supabase RLS blocks the INSERT query
```

### Upgrading Your Plan

1. Click the **Upgrade** button (appears when you hit a plan limit)
2. Or go to **Settings** → **Subscription**
3. Choose your plan (Pro or Family+)
4. Complete payment (coming soon — payment integration via RevenueCat)
5. Your plan is updated on the server — no client-side manipulation possible

> 📌 **Note**: The upgrade modal currently shows "Coming Soon" for payment. Until payment integration is live, the super-admin can manually upgrade users from the admin dashboard.

---

## 🛡️ Super Admin Dashboard Guide

The super-admin dashboard provides **complete control** over the USRA PLUS platform. It's designed for platform operators and customer support staff.

### Accessing the Admin Dashboard

1. On the **Login screen**, click the **USRA PLUS logo 7 times** quickly (rapid succession)
2. An admin login dialog will appear titled "Internal Control Center"
3. Enter your **admin email** and **password** (configured in environment variables)
4. Click **"Access Control Center"**
5. You'll be logged into the admin dashboard

> ⚠️ **Security Notes**:
> - The 7-click gesture is a stealth access method — it's not discoverable by regular users
> - Admin sessions are HMAC-signed and expire after 4 hours
> - Rate limiting applies: 5 login attempts per session, then 30-minute lockout
> - All admin actions are audit-logged

### Admin Dashboard Sections

The admin dashboard has a collapsible sidebar with 9 sections organized into 3 groups:

#### 📊 Analytics Group

##### Platform Overview
The main dashboard showing platform health at a glance:
- **Platform Statistics** — Total users, active users, daily/monthly active users, total families, new registrations
- **Revenue Metrics** — MRR (Monthly Recurring Revenue), ARR (Annual Recurring Revenue)
- **System Health** — Server response time, error rates, active connections
- **Regional Distribution** — User breakdown by region
- **Language Usage** — EN vs AR user split
- **Device Breakdown** — Mobile vs Desktop usage
- **Quick Actions** — Common administrative tasks
- **Data Source Indicator** — Shows "Live" (connected to Supabase) or "Demo" (using mock data)

##### User Analytics
Deep dive into user behavior:
- **Registration Trends** — Time series chart of new sign-ups
- **Login Frequency** — How often users return
- **Average Session Duration** — Engagement metric
- **Retention Rate** — Percentage of users who return
- **User Lifecycle Stages** — New → Active → Churning → Churned
- **User Table** — Searchable, filterable list of all users with:
  - Name, email, avatar
  - Plan (Free / Pro / Family+)
  - Status (Active / Suspended / Flagged)
  - Last login, registration date
  - Family count, language, country
- **User Actions** — View details, change role, suspend/unsuspend account, extend trial

##### Family Analytics
Insights into family engagement:
- **Family Metrics** — Total families, average family size, retention rate
- **Activity Trends** — Task, grocery, calendar, and chat activity over time
- **Module Usage** — Which features are most popular (tasks, chat, calendar, etc.)
- **Invite Conversion Rate** — How many invites turn into active members
- **Family Table** — All families with member counts, activity levels, plan info

#### 📈 Business Group

##### Feature Flags & Feature Usage
Control which features are available to which users:

**Feature Flags** — Toggle features on/off:
- **Global flags** — Enable/disable a feature for ALL users
- **Per-plan flags** — Restrict a feature to specific plans (e.g., Budget Tracking = Pro+ only)
- **Rollout percentage** — Gradually roll out features (e.g., 50% of users)
- **Examples**: AI Insights, Hijri Calendar, Voice Messages, Budget Tracking, Chores Module, QR Code Invites

**Feature Usage Analytics**:
- Total usage count per feature
- Daily average usage
- Weekly trend (up/down/stable)
- Adoption rate (percentage of users using the feature)
- Drop-off rate (percentage who tried but stopped)

**Feature Funnel**:
- Step-by-step conversion tracking (e.g., Viewed → Tried → Completed → Retained)

##### Subscriptions — Revenue Vault
The financial heart of the platform:

- **Revenue KPI Ticker**:
  - MRR (Monthly Recurring Revenue)
  - ARR (Annual Recurring Revenue)
  - Average Customer Lifetime Value (CLV)
  - Churn Rate

- **Revenue Trends Chart** — Area chart showing new subscriptions vs churned users over time

- **Plan Distribution** — Visual pillar cards showing:
  - Free / Pro / Family+ user counts and percentages
  - Revenue per plan
  - Lifetime and trial user counts per plan

- **Conversion Funnel** — Visual flow: Free → Pro → Family+ with conversion rates

- **Monthly Revenue Breakdown** — Detailed table with:
  - New subscriptions, churned users, net new, revenue, churn rate per month

- **Payment Health**:
  - Failed payments count
  - Refunds processed
  - Average days to churn
  - Retry success rate

- **Cohort Retention Analysis** — Heatmap showing user retention by signup month (M1–M6)

#### 🔧 Operations Group

##### Bug Detection
Monitor and track bugs across the platform:

- **Health Checks** — System component status:
  - Supabase Database (healthy/degraded/down)
  - Supabase Auth Service
  - Supabase Storage
  - Supabase Realtime
  - Next.js API Routes
  - External AI Service

- **Bug Reports Table**:
  - Title, description, severity (Critical / High / Medium / Low / Info)
  - Status (Open → Investigating → Fixing → Resolved / Won't Fix)
  - Source (client, server, API, database)
  - Error type and stack trace
  - Reported by and when
  - Assigned to

- **Database Table Status** — Which tables exist, row counts, RLS status
- **Connection Tests** — Supabase, API, Storage, Realtime connectivity
- **Performance Metrics** — Response time, error rate, threshold status

##### Infrastructure
System-level monitoring:

- **Database Metrics** — Size, growth rate, connection count
- **Storage Metrics** — Usage, growth rate
- **API Performance** — Request volume, error rate, average response time
- **Uptime** — Current uptime percentage
- **Security Alerts** — Count of security-related events
- **Error Logs** — Server-side errors with severity levels and occurrence counts

##### Support Center
Manage user support requests:

- **Support Metrics**:
  - Total tickets, open tickets, resolved tickets
  - Average resolution time
  - Customer satisfaction score
  - NPS (Net Promoter Score)

- **Common Issues** — Most frequently reported problems
- **Feature Requests** — Most requested features from users
- **Ticket Management** — View, respond to, and close support tickets

##### System Settings
Platform-wide configuration:

- **Feature Flags** — Enable/disable features globally or per-plan
- **Plan Configuration** — Edit plan prices, features, and limits:
  - Free: SAR 0, 10 tasks, 5 members, 100 MB storage
  - Pro: SAR 9.99, unlimited tasks, 15 members, 1 GB storage
  - Family+: SAR 19.99, unlimited everything, 10 GB storage

- **Announcements** — Create and manage platform-wide announcements:
  - Title, message, type (Info / Warning / Critical)
  - Start/end dates
  - Active/inactive toggle

- **Rate Limiting** — Configure API rate limits per endpoint
- **Notification Templates** — Customize system notification messages

### Admin Security Features

| Feature | Description |
|---------|-------------|
| **HMAC Sessions** | Admin sessions are cryptographically signed with SHA-256 HMAC. Tokens cannot be tampered with or forged. |
| **httpOnly Cookies** | Session tokens are stored in httpOnly cookies — inaccessible to JavaScript/XSS attacks. |
| **Rate Limiting** | Max 5 login attempts per session, then 30-minute lockout. API routes: 60 requests/minute. |
| **Session Expiry** | Sessions expire after 4 hours. Validated every 60 seconds. |
| **7-Click Gesture** | Stealth access method — the admin login is not discoverable by regular users. |
| **Server-Side Validation** | All admin actions are validated on the server — no client-side bypass possible. |
| **Brute Force Protection** | After 10 failed login attempts, the IP is locked out for 30 minutes. |
| **Timing-Safe Comparison** | HMAC verification uses constant-time comparison to prevent timing attacks. |

### Audit Logging

All admin actions are logged for accountability:

| Action | What's Logged |
|--------|---------------|
| Admin Login | Email, IP address, user agent, timestamp |
| Admin Logout | Timestamp |
| User Suspension | Target user ID, reason, admin who performed it |
| User Role Change | Previous role, new role, admin who changed it |
| Plan Override | Previous plan, new plan, reason, admin |
| Feature Flag Toggle | Flag key, previous state, new state |
| Family Data Edit | What was changed, previous values |
| Support Ticket Response | Ticket ID, response content |
| Failed Login Attempts | Email, IP, attempt count |

> 📌 **Note**: Audit logs are stored in the `admin_audit_logs` table with full RLS protection. Only super-admins can view them.

---

## 🏗️ Architecture

### Technology Stack

```
┌──────────────────────────────────────────────────────┐
│                    Frontend                           │
│  Next.js 16 (App Router) + React 19 + TypeScript 5  │
│  Tailwind CSS 4 + shadcn/ui + Lucide Icons          │
│  Zustand (state) + Recharts (charts) + Framer Motion │
│  @dnd-kit (drag & drop) + date-fns (dates)          │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│                    Backend                            │
│  Next.js API Routes (App Router)                     │
│  Supabase Client (anon key) + Admin Client (SRK)     │
│  Rate Limiting + Error Capture + Audit Logging       │
│  HMAC Session Management + Server-Side Validation    │
└──────────────────────┬───────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────┐
│                 Database & Auth                       │
│  Supabase PostgreSQL with Row Level Security (RLS)   │
│  Supabase Auth (Email/Password + Google OAuth)       │
│  Supabase Realtime (Chat + Notifications)            │
│  Supabase Storage (File uploads)                     │
└──────────────────────────────────────────────────────┘
```

### Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Main SPA entry (all views rendered here)
│   ├── layout.tsx                  # Root layout with ThemeProvider
│   ├── globals.css                 # Global styles + CSS variables
│   ├── error.tsx                   # Error boundary
│   ├── global-error.tsx            # Global error boundary
│   └── api/
│       ├── admin/                  # Admin API routes
│       │   ├── login/route.ts      # Admin authentication
│       │   ├── overview/route.ts   # Dashboard statistics
│       │   ├── users/route.ts      # User management
│       │   ├── families/route.ts   # Family management
│       │   ├── subscriptions/route.ts  # Subscription control
│       │   ├── bugs/route.ts       # Bug reports & health checks
│       │   ├── features/route.ts   # Feature flags
│       │   ├── infrastructure/route.ts  # System health
│       │   └── support/route.ts    # Support tickets
│       ├── auth/callback/route.ts  # Supabase auth callback
│       ├── subscription/plan/route.ts  # Plan validation (server-side)
│       ├── weather/route.ts        # Weather data
│       ├── ai/                     # AI feature routes
│       │   ├── generate-image/route.ts  # AI avatar generation
│       │   ├── meal-suggestions/route.ts # AI meal ideas
│       │   ├── recipes/route.ts    # AI recipe suggestions
│       │   └── summary/route.ts    # AI daily summary
│       └── migrate/route.ts        # Database migration helper
│
├── components/
│   ├── admin/                      # Admin dashboard components
│   │   ├── admin-layout.tsx        # Admin shell with collapsible sidebar
│   │   ├── admin-login.tsx         # Admin login modal (7-click gesture)
│   │   ├── demo-mode-banner.tsx    # Demo mode indicator
│   │   └── pages/                  # Admin page components (lazy-loaded)
│   │       ├── admin-overview.tsx  # Platform Overview dashboard
│   │       ├── admin-users.tsx     # User Analytics & management
│   │       ├── admin-families.tsx  # Family Analytics
│   │       ├── admin-features.tsx  # Feature flags & usage
│   │       ├── admin-subscriptions.tsx  # Revenue Vault
│   │       ├── admin-bugs.tsx      # Bug Detection & health checks
│   │       ├── admin-infrastructure.tsx # System monitoring
│   │       ├── admin-support.tsx   # Support Center
│   │       └── admin-settings.tsx  # System Settings
│   ├── auth/                       # Authentication components
│   │   ├── login-form.tsx          # Login form with Google OAuth
│   │   ├── signup-form.tsx         # Registration form
│   │   ├── forgot-password-form.tsx # Password reset
│   │   ├── language-selector.tsx   # EN/AR toggle
│   │   └── terms-modal.tsx         # Terms of service
│   ├── layout/                     # App layout components
│   │   ├── app-header.tsx          # Top header bar
│   │   ├── app-sidebar.tsx         # Desktop sidebar navigation
│   │   ├── bottom-nav.tsx          # Mobile bottom navigation
│   │   └── notification-panel.tsx  # Notification drawer
│   ├── dashboard/                  # Dashboard widgets
│   │   ├── dashboard-page.tsx      # Main dashboard layout
│   │   ├── activity-feed-widget.tsx  # Recent family activity
│   │   ├── activity-timeline-widget.tsx # Activity timeline
│   │   ├── ai-summary-widget.tsx   # AI-powered daily summary
│   │   ├── family-analytics-widget.tsx # Family stats
│   │   └── weather-widget.tsx      # Weather display
│   ├── tasks/                      # Task management
│   │   ├── tasks-page.tsx          # Tasks page with list/kanban toggle
│   │   └── kanban-board.tsx        # Drag-and-drop Kanban board
│   ├── calendar/                   # Calendar views
│   │   └── calendar-page.tsx       # Month/Week/Day/Agenda views
│   ├── grocery/                    # Grocery list
│   │   └── grocery-page.tsx        # Categories, quantities, recipes
│   ├── chat/                       # Family chat
│   │   └── chat-page.tsx           # Real-time messaging
│   ├── meal-plan/                  # Meal planning
│   │   └── meal-plan-page.tsx      # Weekly meal planner
│   ├── budget/                     # Budget tracking
│   │   └── budget-page.tsx         # Expenses, charts, SAR
│   ├── milestones/                 # Family milestones
│   │   └── milestones-page.tsx     # Important dates, Hijri
│   ├── chores/                     # Household chores
│   │   └── chores-page.tsx         # Rotation, leaderboard
│   ├── files/                      # File management
│   │   └── files-page.tsx          # Upload, storage tracking
│   ├── onboarding/                 # First-time setup
│   │   └── onboarding-flow.tsx     # 4-step setup wizard
│   ├── settings/                   # User settings
│   │   └── settings-page.tsx       # Profile, family, preferences
│   ├── shared/                     # Shared components
│   │   ├── command-palette.tsx     # ⌘K search
│   │   ├── shortcuts-modal.tsx     # Keyboard shortcuts
│   │   ├── guided-tour.tsx         # Interactive walkthrough
│   │   ├── page-wrapper.tsx        # Page transition wrapper
│   │   ├── upgrade-modal.tsx       # Subscription upgrade prompt
│   │   ├── plan-badge.tsx          # Plan indicator badge
│   │   ├── family-qr-code.tsx      # QR code generator (lazy-loaded)
│   │   ├── avatar-generator.tsx    # AI avatar generator
│   │   ├── empty-state.tsx         # Empty state illustrations
│   │   ├── fab.tsx                 # Floating action button
│   │   ├── page-error-boundary.tsx # Page-level error boundary
│   │   └── skeleton-patterns.tsx   # Loading skeletons
│   └── ui/                         # shadcn/ui components (50+)
│       ├── button.tsx, card.tsx, dialog.tsx, ...
│       └── (full shadcn/ui component library)
│
├── stores/                         # Zustand state stores
│   ├── app-store.ts               # Global app state (page, family, onboarding)
│   ├── auth-store.ts              # Authentication state
│   ├── subscription-store.ts      # Plan & limits (fetched from server)
│   ├── admin-auth-store.ts        # Admin auth state (HMAC sessions)
│   ├── admin-store.ts             # Admin dashboard data & settings
│   ├── task-store.ts              # Task management
│   ├── calendar-store.ts          # Calendar events
│   ├── grocery-store.ts           # Grocery items
│   ├── chat-store.ts              # Chat messages & presence
│   ├── budget-store.ts            # Budget tracking
│   ├── meal-store.ts              # Meal planning
│   ├── chore-store.ts             # Chore rotation
│   ├── milestone-store.ts         # Milestones
│   ├── files-store.ts             # File management
│   ├── notification-store.ts      # Notifications
│   ├── notification-preferences-store.ts  # Notification settings
│   ├── presence-store.ts          # Online presence
│   ├── activity-store.ts          # Activity feed
│   ├── comment-store.ts           # Comments
│   └── tour-store.ts              # Guided tour progress
│
├── hooks/                          # Custom React hooks
│   ├── use-admin-data.ts          # Admin data fetching with live/demo detection
│   ├── use-mobile.ts              # Mobile detection
│   └── use-toast.ts               # Toast notifications
│
├── lib/                            # Utility libraries
│   ├── supabase/                  # Supabase clients
│   │   ├── client.ts              # Browser client (anon key)
│   │   ├── server.ts              # Server component client
│   │   ├── server-client.ts       # Server action client
│   │   ├── admin.ts               # Admin client (service role key)
│   │   └── middleware.ts          # Auth middleware helper
│   ├── admin-auth.ts              # Admin authentication logic
│   ├── admin-session.ts           # HMAC session management (SHA-256)
│   ├── rate-limit.ts              # Sliding window rate limiter
│   ├── error-capture.ts           # Client-side error tracking
│   ├── server-error-logger.ts     # Server-side error logging
│   ├── optimistic-updates.ts      # Optimistic UI with rollback
│   ├── performance.ts             # Pagination, debounce, throttle utilities
│   ├── demo-data.ts               # Demo/mock data generator
│   ├── confetti.ts                # Celebration effects
│   ├── completion-sound.ts        # Task completion sound
│   ├── notification-sound.ts      # Notification sound
│   ├── live-announcer.ts          # Accessibility announcer
│   ├── tour-config.ts             # Guided tour configuration
│   └── utils.ts                   # General utilities (cn, etc.)
│
├── i18n/                           # Internationalization
│   ├── en.ts                      # English translations (800+ keys)
│   ├── ar.ts                      # Arabic translations (800+ keys)
│   └── use-translation.ts         # Translation hook + Zustand store
│
└── types/                          # TypeScript type definitions
    ├── index.ts                   # Core app types
    └── admin.ts                   # Admin dashboard types (metrics, flags, bugs)
```

### State Management

```
Zustand Stores (Client-Side State)
├── Auth Store          → User session, login/logout, profile
├── App Store           → Current page, family selection, onboarding state
├── Subscription Store  → Plan type, feature limits (fetched from server, 5-min cache)
├── Task Store          → CRUD tasks, filters, kanban state
├── Calendar Store      → Events, date selection, view mode
├── Grocery Store       → Items, categories, shopping progress
├── Chat Store          → Messages, online users, typing indicators
├── Budget Store        → Expenses, budget limits, categories
├── Meal Store          → Weekly meals, ingredients
├── Chore Store         → Rotation, completion tracking
├── Milestone Store     → Important dates, reminders
├── Notification Store  → Real-time notifications
├── Admin Auth Store    → Admin session, HMAC tokens
└── Admin Store         → Admin dashboard data, feature flags, plan configs
```

### Authentication Flow

```
1. User enters email/password on Login form
2. Supabase Auth validates credentials
3. On success: Session token stored in httpOnly cookie (Supabase manages this)
4. Client fetches user profile from `profiles` table
5. Client fetches subscription plan from /api/subscription/plan (server-side)
6. App renders the MainApp with user's data
7. On each page load: Middleware validates session with Supabase
8. On session expiry: User is redirected to login
```

### Data Flow Architecture

```
User Action → Zustand Store (optimistic update) → Supabase (real update)
                                                    ↓
                                              Supabase Realtime
                                                    ↓
                                          Other family members' clients
                                                    ↓
                                          Their Zustand Stores update
```

**Optimistic Updates with Rollback:**

```
1. User marks task as done → UI immediately shows task as done
2. Supabase query runs in background
3. If success: ✅ No further action needed
4. If failure: ❌ Rollback to previous state + show error toast
5. With retry: Retry up to 3 times with exponential backoff before rollback
```

---

## 🔌 API Reference

### Authentication Endpoints

#### `POST /api/auth/callback`
Supabase auth callback handler. Processes OAuth redirects (Google, etc.).

#### `GET /api/subscription/plan?userId=xxx`
Fetches the subscription plan for a user. **Server-side validation only.**

**Response:**
```json
{ "plan": "free" | "pro" | "family_plus" }
```

### Admin Endpoints

All admin endpoints require HMAC-signed session cookies.

#### `POST /api/admin/login`
Authenticates admin and creates signed session.

**Body:**
```json
{ "email": "admin@usraplus.com", "password": "admin-password" }
```

**Response:**
- Sets `admin_session` httpOnly cookie with HMAC-signed token
- Returns `{ success: true, role: "super_admin" }`

#### `GET /api/admin/overview`
Returns platform statistics for the dashboard.

**Response:**
```json
{
  "totalUsers": 1234,
  "activeUsers": 890,
  "totalFamilies": 567,
  "totalTasks": 8901,
  "totalMessages": 23456,
  "activeSubscriptions": 89,
  "monthlyRevenue": 1780.11,
  "source": "live" | "demo"
}
```

#### `GET /api/admin/users`
List all users with search, filtering, and pagination.

#### `PATCH /api/admin/users`
Update user — role change, account suspend/unsuspend, trial extension.

**Body:**
```json
{ "userId": "xxx", "action": "suspend", "reason": "Terms violation" }
```

#### `GET /api/admin/families`
List all families with member counts and activity data.

#### `GET /api/admin/subscriptions`
List all subscriptions with plan details, revenue metrics, and conversion data.

#### `PATCH /api/admin/subscriptions`
Modify subscriptions — upgrade, downgrade, extend trial, manual override.

#### `GET /api/admin/bugs`
List all bug reports, health checks, connection tests, and performance metrics.

#### `GET /api/admin/features`
List all feature flags with rollout percentages and target plans.

#### `PATCH /api/admin/features`
Toggle feature flags — enable/disable globally or per-plan.

#### `GET /api/admin/infrastructure`
System health metrics — database size, API performance, error logs.

#### `GET /api/admin/support`
List support tickets with metrics and common issues.

### AI Endpoints

#### `POST /api/ai/summary`
Generate AI summary of family activity.

**Body:**
```json
{ "familyId": "xxx", "date": "2024-01-15" }
```

#### `POST /api/ai/meal-suggestions`
Get AI-powered meal suggestions.

**Body:**
```json
{ "groceryItems": ["chicken", "rice", "tomatoes"], "preferences": "Middle Eastern" }
```

#### `POST /api/ai/recipes`
Get recipe recommendations based on grocery items.

#### `POST /api/ai/generate-image`
Generate AI images (avatars, etc.).

### Other Endpoints

#### `GET /api/weather?city=Riyadh`
Fetch weather data for a city.

#### `GET /api/migrate`
Database migration helper (development only).

---

## 🗄️ Database Schema

### Core Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `profiles` | User profiles | id, email, first_name, last_name, language, theme, phone, avatar_url |
| `families` | Family groups | id, name, invite_code, avatar_url, description |
| `family_members` | Family membership | family_id, user_id, role (owner/admin/member) |
| `tasks` | Task management | family_id, title, status, priority, assigned_to, due_date, recurring |
| `calendar_events` | Calendar events | family_id, title, start_time, end_time, all_day, color, location |
| `grocery_items` | Grocery lists | family_id, name, category, quantity, checked |
| `chat_messages` | Family chat | family_id, content, sender_id, message_type (text/image/file/voice) |
| `family_files` | File storage | family_id, name, file_type, file_size, storage_path |
| `milestones` | Important dates | family_id, title, type, date, recurring, hijri_date |
| `chores` | Household chores | family_id, title, frequency, assignees, rotation_enabled |
| `notifications` | User notifications | user_id, title, message, type, read |
| `subscriptions` | Plan tracking | user_id, plan, status, current_period_start, current_period_end, trial_end |
| `admin_audit_logs` | Admin actions | admin_id, action, target_type, target_id, details, ip_address |

### Row Level Security (RLS)

All tables have RLS enabled. Key policies:

| Policy | Description |
|--------|-------------|
| **Family-scoped reads** | Users can only see data from their own family — `family_members` check on all family-scoped tables |
| **No self-subscription** | Users cannot modify their own subscription — only `service_role` can INSERT/UPDATE subscriptions |
| **No self-role-change** | Users cannot change their own role — only admins can modify roles |
| **Admin-only tables** | `admin_audit_logs` requires `is_admin()` or `is_super_admin()` checks |
| **Public plan info** | Plans table is publicly readable (prices, features) |
| **Family admin writes** | Family admins can manage members and settings; regular members can contribute data |

### Running Migrations

1. Open your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/rls-and-indexes-migration.sql`
4. Paste and click **Run**
5. Verify by checking **Table Editor** → tables should have shield icons (RLS enabled)

### Indexes for Performance

The migration creates composite indexes for all high-frequency queries:

```sql
-- Chat messages: family + time (most common query)
CREATE INDEX idx_chat_messages_family_created ON chat_messages(family_id, created_at DESC);

-- Tasks: family + status (kanban board loading)
CREATE INDEX idx_tasks_family_status ON tasks(family_id, status);

-- Grocery items: family + checked (shopping progress)
CREATE INDEX idx_grocery_family_checked ON grocery_items(family_id, checked);

-- Calendar events: family + time (calendar view)
CREATE INDEX idx_calendar_family_start ON calendar_events(family_id, start_time DESC);

-- Subscriptions: user (plan checking)
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);

-- Notifications: user + unread (badge count)
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false;
```

---

## 🚢 Deployment

### Deploying to Vercel (Recommended)

1. **Push to GitHub:**
   ```bash
   git add -A
   git commit -m "feat: USRA PLUS production build"
   git push origin main
   ```

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click **"New Project"**
   - Import your GitHub repository: `ahmedibm9-cyber/usra-plus`
   - Vercel will auto-detect Next.js settings

3. **Configure Environment Variables** in Vercel Dashboard → Settings → Environment Variables:

   | Variable | Value |
   |----------|-------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
   | `ADMIN_PASSWORD` | Your chosen admin password |
   | `ADMIN_SESSION_SECRET` | A random HMAC secret (32+ characters) |

4. **Deploy:**
   - Vercel will automatically build and deploy
   - Every push to `main` triggers a new deployment
   - Build time: ~2-3 minutes

5. **Verify:**
   - Check the Vercel deployment logs for any errors
   - Visit your deployed URL and test login, navigation, and admin access

### Production Build (Self-Hosted)

```bash
# Build the application
bun run build

# Start the production server (standalone mode)
bun run start
```

The `next.config.ts` automatically uses `output: "standalone"` for self-hosted deployments, which produces an optimized standalone build.

### Build Verification

```bash
# Check for TypeScript errors
bun run build

# Check for lint issues
bun run lint
```

---

## 🔧 Troubleshooting

### Common Issues

#### "Authentication service is not yet configured"
**Cause**: Supabase environment variables are missing or incorrect.
**Fix**: Verify `.env.local` contains valid `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Check that the Supabase project is active and not paused.

#### App loads but shows demo/mock data
**Cause**: Supabase connection failed, app falls back to demo mode.
**Fix**:
1. Check browser console for Supabase connection errors
2. Verify your Supabase project is active (not paused due to inactivity)
3. Check that environment variables are correct
4. The admin dashboard will show a "Demo" badge when using mock data, and "Live" when connected to Supabase

#### "Limit Reached" when creating tasks
**Cause**: You've hit the task limit on the Free plan (10 tasks).
**Fix**:
- **User**: Upgrade to Pro or Family+ plan, or delete some existing tasks
- **Admin**: Manually upgrade the user from the admin dashboard → Subscriptions

#### Admin login doesn't appear
**Cause**: The 7-click gesture must be done quickly on the USRA PLUS logo.
**Fix**: Click the USRA PLUS logo on the login screen 7 times in rapid succession. A dark "Internal Control Center" dialog should appear.

#### Chat messages not updating in real-time
**Cause**: Supabase Realtime not enabled for the `chat_messages` table.
**Fix**: In Supabase Dashboard → Database → Replication, enable Realtime for `chat_messages`.

#### RTL layout issues
**Cause**: The language might not be switching properly.
**Fix**: Go to Settings → Preferences → Language → Select Arabic. The entire layout should flip to RTL, including sidebar, navigation, and text alignment.

#### Subscription shows "Free" even though I paid
**Cause**: The subscription store has a 5-minute cache.
**Fix**: Wait 5 minutes and refresh, or clear your browser cache. The plan is fetched from the server API, not stored in localStorage.

#### Build fails with "out of memory"
**Cause**: Next.js build requires significant memory for large projects.
**Fix**: Increase Node.js memory limit:
```bash
NODE_OPTIONS="--max-old-space-size=4096" bun run build
```

#### Vercel deployment fails
**Cause**: The `output: "standalone"` config conflicts with Vercel's serverless format.
**Fix**: This is already handled in `next.config.ts` — the output mode is conditional based on the `VERCEL` environment variable. If it still fails, ensure you're on the latest commit.

#### "Cannot find module 'socket.io-client'"
**Cause**: Old cached import from before Socket.IO was removed.
**Fix**: This has been fixed. If you see this error, pull the latest code. Socket.IO was completely replaced with Supabase Realtime.

---

## 🔒 Security

### Security Architecture Overview

| Layer | Mechanism | Purpose |
|-------|-----------|---------|
| **Client** | Plan badges, upgrade modals | UX indicators only (not security) |
| **API Routes** | Session validation, rate limiting | Server-side enforcement |
| **Database** | Row Level Security (RLS) | Data-level access control |
| **Admin** | HMAC-signed sessions, httpOnly cookies | Tamper-proof admin access |
| **Auth** | Supabase Auth, httpOnly session cookies | Secure user authentication |

### What We Protect Against

| Threat | Protection |
|--------|------------|
| **Self-upgrade** | Users cannot modify their own subscription (RLS + API validation) |
| **Admin impersonation** | HMAC-signed sessions with timing-safe comparison |
| **Brute force** | Rate limiting on all auth endpoints (5 attempts, then 30-min lockout) |
| **XSS** | httpOnly cookies, no sensitive data in localStorage |
| **CSRF** | SameSite cookies, server-side session validation |
| **SQL injection** | Supabase client uses parameterized queries |
| **Data leaks** | RLS ensures users only see their own family's data |
| **Timing attacks** | Constant-time HMAC comparison |

### Known Limitations

1. **In-memory rate limiting** — Doesn't persist across server restarts. For production at scale, use Redis.
2. **No payment integration** — Subscription upgrades currently require manual admin action. RevenueCat integration is planned.
3. **No offline handling** — The app requires an internet connection. PWA service worker for offline support is planned.
4. **No concurrent edit resolution** — Last-write-wins on tasks and grocery items. Operational transforms are planned for future versions.

---

<div align="center">

**USRA PLUS** — Bringing families together, one task at a time. 🏠

Built with ❤️ in Saudi Arabia 🇸🇦

</div>
