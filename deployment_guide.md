# Deployment Guide: LinkRoom

This guide walks you through deploying the **LinkRoom** application (React frontend + Node.js backend with Socket.io + MongoDB Atlas).

Since the application uses WebSockets (`socket.io`) for real-time chat, **serverless platforms like Vercel or Netlify are not recommended for hosting the backend**, as serverless functions do not support long-lived WebSocket connections. 

Instead, the recommended stack is:
1. **Backend (Node.js + Sockets)**: Deploy to [Render.com](https://render.com/) or [Railway.app](https://railway.app/).
2. **Frontend (React + Vite)**: Deploy to [Vercel](https://vercel.com/) or [Render (Static Site)](https://render.com/).
3. **Database**: Already hosted on **MongoDB Atlas** (no changes needed).

---

## Phase 1: Code Adjustments for Production

Before deploying, we need to ensure the client and server communicate using the dynamic production URLs instead of `localhost`.

### 1. Backend CORS setup (`server/server.js`)
Ensure your Socket.io initialization in the backend dynamically allows the frontend origin from environment variables:

```javascript
// server/server.js
const origin = process.env.FRONTEND_URL || 'http://localhost:5173';

const io = new Server(server, {
  cors: {
    origin: origin,
    methods: ['GET', 'POST'],
    credentials: true
  },
});
```

### 2. Frontend API/Socket base URLs
In your React code, instead of hardcoding `http://localhost:5000`, use an environment variable:

```javascript
// Example Client Connection configuration
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const socket = io(API_URL);
```

---

## Phase 2: Deploying the Backend (on Render)

Render is free and supports persistent WebSockets out-of-the-box.

1. Create a free account on [Render.com](https://render.com/).
2. Click **New** -> **Web Service**.
3. Connect your GitHub repository.
4. Set the following settings:
   * **Name**: `linkroom-backend`
   * **Root Directory**: `server`
   * **Runtime**: `Node`
   * **Build Command**: `npm install`
   * **Start Command**: `node server.js`
5. Click **Advanced** to add **Environment Variables**:
   * `PORT`: `10000` (Render's default)
   * `MONGO_URI`: *Your MongoDB Atlas Connection String*
   * `JWT_SECRET`: *Your JWT Secret*
   * `FRONTEND_URL`: *Your Frontend Deployment URL (e.g., https://linkroom.vercel.app)*
6. Click **Create Web Service**. Render will build and deploy the backend. Copy the generated Web Service URL (e.g., `https://linkroom-backend.onrender.com`).

---

## Phase 3: Deploying the Frontend (on Vercel)

Vercel is the fastest and most reliable place to host static React/Vite websites.

1. Install the Vercel CLI (optional) or go to [Vercel.com](https://vercel.com/) and connect your GitHub repository.
2. Click **Add New** -> **Project** and select your repository.
3. Configure the following project settings:
   * **Framework Preset**: `Vite`
   * **Root Directory**: `client`
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
4. Expand **Environment Variables** and add:
   * `VITE_API_URL`: *The URL of your deployed Render backend (e.g., `https://linkroom-backend.onrender.com`)*
5. Click **Deploy**. Vercel will build your static files and deploy them to a global CDN.

---

## Phase 4: Linking Them Together

Once both are deployed:
1. Copy your Vercel frontend URL (e.g., `https://linkroom.vercel.app`).
2. Go back to your **Render Dashboard** -> **LinkRoom Backend** -> **Environment Variables**.
3. Update the `FRONTEND_URL` environment variable value to match your Vercel URL.
4. Render will automatically redeploy with the updated CORS policy.

Your LinkRoom app is now live!
