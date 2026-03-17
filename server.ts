import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";

import fs from "fs";

// Load config to get project ID
let configProjectId = "";
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    configProjectId = config.projectId;
  }
} catch (error) {
  console.error("Error loading firebase config in server:", error);
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    // If we have a project ID from config, try to use it
    if (configProjectId) {
      console.log(`Initializing Firebase Admin with project ID: ${configProjectId}`);
      admin.initializeApp({
        projectId: configProjectId
      });
    } else {
      console.log("Initializing Firebase Admin with default credentials");
      admin.initializeApp();
    }
  } catch (e) {
    console.error("Firebase Admin initialization error:", e);
    // Final fallback
    admin.initializeApp({
      projectId: "portal-do-cliente-b1cc3"
    });
  }
}

const db_admin = admin.firestore();
const auth_admin = admin.auth();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Portal do Cliente API is running" });
  });

  app.post("/api/admin/create-user", async (req, res) => {
    const { email, password, name, role, clientId } = req.body;
    
    try {
      // 1. Create user in Firebase Auth
      const userRecord = await auth_admin.createUser({
        email,
        password,
        displayName: name
      });

      // 2. Create user profile in Firestore
      await db_admin.collection('users').doc(userRecord.uid).set({
        name,
        email,
        role,
        clientId: clientId || null,
        createdAt: new Date().toISOString()
      });

      res.status(201).json({ uid: userRecord.uid });
    } catch (error: any) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/delete-user", async (req, res) => {
    const { uid } = req.body;
    
    try {
      // 1. Delete user from Firebase Auth
      await auth_admin.deleteUser(uid);

      // 2. Delete user profile from Firestore
      await db_admin.collection('users').doc(uid).delete();

      res.status(200).json({ success: true });
    } catch (error: any) {
      console.error("Error deleting user:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
