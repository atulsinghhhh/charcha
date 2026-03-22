# Charcha 🌍💬

**Charcha** is a proximity-based social and real-time messaging application built on React Native & Expo, powered entirely by Supabase. It uses your device's GPS to find users locally, allowing you to instantly engage in 1:1 Direct Messages, or drop into your local community's Sector Hub!

## 📥 Download the App

You can download the latest Android build of Charcha directly from Expo and try it out yourself:
👉 **[Download Charcha APK](https://expo.dev/accounts/atulsinghh/projects/charcha/builds/c0aad11c-3b5b-4dfd-834d-1d22acfb6f7e)**

---

## 🚀 Key Features

* **Proximity User Discovery:** Instantly find other active users within a 5km or 10km radius using your device's location.
* **Real-Time 1:1 Direct Messaging:** Chat seamlessly with nearby individuals. Features include unread counters, native inverted list auto-scrolling, and instantaneous message delivery powered by Supabase Realtime via WebSockets.
* **Sector-Based Community Hubs:** The world map is automatically divided into ~5km grid sectors. Users can drop into their specific sector's Community Chat to talk with everyone currently situated in their zone!
* **Custom Local Communities:** Users can create custom community chat rooms within their active 5km sector grid. Manage and grow your own topic-based local communities, running in parallel with the default Sector Hub.
* **Modern Dark UI:** A fully custom, sleek dark-mode aesthetic consistent across all screens, featuring custom splash screens and icons.
* **Secure Architecture:** Built ground-up with PostgreSQL Row Level Security (RLS). Users can only access direct messages they are participants in, ensuring absolute privacy. 
* **Dynamic Hooks:** Uses a highly optimized Javascript approach to derive chat lists and metrics entirely off the `messages` table in `src/hooks/realtime.tsx`.

---

## 🛠️ Tech Stack

* **Frontend Framework:** React Native / Expo
* **Navigation:** Expo Router (`expo-router`)
* **Backend:** Supabase (PostgreSQL, Auth, Realtime)
* **Location Services:** `expo-location`

---

## 📁 Project Structure

```text
charcha/
│
├── src/
│   ├── app/
│   │   ├── (auth)/         # Login & Signup flows
│   │   ├── (tabs)/         # Main application navigation
│   │   │   ├── index.tsx       # Home Screen: Nearby users & Sector portal
│   │   │   ├── messages.tsx    # Inbox: List of active 1:1 DMs w/ unread counts
│   │   │   ├── chat.tsx        # Private Chat Room: 1:1 Realtime interface
│   │   │   └── community.tsx   # Sector Hub: Location-based public chat
│   │   │
│   │   └── _layout.tsx     # Global Router Layout
│   │
│   ├── hooks/
│   │   ├── realtime.tsx    # Supabase Realtime listeners for 1:1 DMs
│   │   └── community.tsx   # Supabase logic for grid/sector coordination
│   │
│   └── lib/
│       ├── supabase/       # Supabase instance initialization
│       └── community.ts    # GPS -> Grid Key conversion logic
│
├── supabase_schema.sql     # Reference file for SQL Table & RLS creations
├── package.json            
└── app.json                
```

---

## ⚙️ Database Architecture

This app relies on three core Supabase tables:

1. **`profiles`**
   * Mirrors authenticated users (`auth.users`).
   * Tracks standard information (`id`, `username`, `latitude`, `longitude`).
   * *Requirement:* Must have a permissive `SELECT` RLS policy to allow chat participants to fetch usernames.

2. **`messages`**
   * Acts as the single source of truth for both 1:1 DMs and Community chats.
   * `sender_id`: The user who sent the message.
   * `receiver_id`: Used exclusively for 1:1 Direct Messages.
   * `room_id`: Used exclusively for Community Sector chats. (If this is populated, `receiver_id` is null).
   * `is_read`: Read receipt boolean for calculating inbox badges.

3. **`rooms`**
   * Acts as the registry for Community Hub sectors.
   * `grid_key`: A unique key generated via GPS (e.g. `210_-583`) that defines a given 5km region.
   * Supabase Channels listen directly to the `room_id` linked to the active sector.

---

## 💻 Local Development Setup

**1. Clone and Install Dependencies:**
```bash
npm install
```

**2. Configure Environment Variables:**
Create a `.env` file at the root of your project:
```env
EXPO_PUBLIC_SUPABASE_URL=your-supabase-url
EXPO_PUBLIC_SUPABASE_KEY=your-supabase-anon-key
```

**3. Setup the Database:**
Ensure all tables, Postgres Functions, and Row Level Security (RLS) policies are active via your Supabase SQL Editor.

**4. Start the Expo Server:**
```bash
npx expo start --dev-client
```
Press `a` to run on an Android emulator/device, or `i` for iOS!'

*(Ensure your simulator/device has Location permissions granted for Sector calculations).*

~Atul Rathore ~
