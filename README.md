# SFIT Lost & Found Portal

A full-stack web application built for the campus community of **St. Francis Institute of Technology (SFIT), Borivali**, to streamline the process of reporting, discovering, and reclaiming lost items.

## Overview

Losing personal belongings on campus is a common problem, and there's often no centralized way to report or search for them. I built this platform to solve that — giving students, faculty, and staff a simple, modern interface to:

- **Report** lost or found items with descriptions, categories, and photos
- **Browse & Search** listings filtered by category, location, date, and status
- **Claim Items** through a secure, in-app claim request system
- **Get Notified** in real-time when there's activity on your listings
- **Manage Submissions** through a personal dashboard

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, TypeScript, Vite |
| **UI Components** | shadcn/ui, Lucide Icons |
| **Styling** | Tailwind CSS |
| **Backend & Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth (PKCE flow) |
| **Storage** | Supabase Storage (item images) |
| **Real-time** | Supabase Realtime (notifications) |
| **Validation** | Zod |

## Features

- **Authentication** — Secure sign-up and login with Supabase Auth
- **Post Items** — Report lost or found items with image uploads, categories, and location details
- **Item Listings** — Browse all reported items with filtering and search
- **Claim System** — Submit claims on found items; item owners can approve or reject
- **Dashboard** — View and manage your posted items, claims, and notifications
- **Role-Based Access** — Admin and moderator roles for content moderation
- **Row Level Security** — All database tables are protected with granular RLS policies
- **Responsive Design** — Fully responsive UI that works across devices

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm (comes with Node.js)
- A [Supabase](https://supabase.com/) project (free tier works)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/kencoelhoo-source/student-return-help.git
   cd student-return-help
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory:

   ```env
   VITE_SUPABASE_PROJECT_ID=your_project_id
   VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   ```

4. **Run the database migrations**

   Apply the SQL migration files located in `supabase/migrations/` to your Supabase project via the SQL Editor in the Supabase Dashboard.

5. **Start the development server**

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`.

## Project Structure

```
src/
├── components/       # Reusable UI components
├── lib/              # Supabase client, auth context, utilities
├── pages/            # Application pages (Home, Items, Dashboard, etc.)
└── App.tsx           # Root component with routing
```

## Database Schema

The application uses the following core tables with Row Level Security enabled on each:

- **profiles** — User profile information
- **items** — Lost and found item listings
- **item_images** — Photos associated with items
- **claims** — Claim requests submitted by users
- **notifications** — In-app notifications
- **user_roles** — Role assignments for access control

## License

This project is open source and available for educational purposes.

---

Built as a project for **St. Francis Institute of Technology (SFIT)**, Mumbai.
