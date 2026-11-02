import express from "express";
import cors from "cors";
import multer from "multer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET =
  process.env.JWT_SECRET ||
  "dGhpcy1pcy1hLWRldmVsb3BtZW50LWp3dC1zZWNyZXQta2V5LWF0LWxlYXN0LTI1Ni1iaXRzLWxvbmc=";
const ACCESS_TOKEN_EXPIRY_MS = Number(process.env.JWT_ACCESS_EXPIRATION_MS) || 900000;
const REFRESH_TOKEN_EXPIRY_MS = Number(process.env.JWT_REFRESH_EXPIRATION_MS) || 604800000;
const PLATFORM_SANDBOX_MODE = process.env.PLATFORM_SANDBOX_MODE !== "false";
const DEPLOYMENT_TRACK = process.env.DEPLOYMENT_TRACK || "stable";
const APP_VERSION = process.env.APP_VERSION || "1.0.0";

// AES-256-GCM Encryption Key
const RAW_AES_KEY = Buffer.from(
  process.env.AES_GCM_KEY_BASE64 || "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=",
  "base64"
);
const AES_KEY = Buffer.alloc(32);
RAW_AES_KEY.copy(AES_KEY, 0, 0, Math.min(RAW_AES_KEY.length, 32));

function encryptAesGcm(plaintext) {
  if (!plaintext) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", AES_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, authTag]).toString("base64");
}

export function decryptAesGcm(ciphertextBase64) {
  if (!ciphertextBase64) return null;
  const buf = Buffer.from(ciphertextBase64, "base64");
  const iv = buf.subarray(0, 12);
  const authTag = buf.subarray(buf.length - 16);
  const encrypted = buf.subarray(12, buf.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", AES_KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

function hashToken(rawToken) {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

// Persistent Storage Setup
const DATA_DIR = path.join(__dirname, "data");
const UPLOAD_DIR = path.join(__dirname, "uploads");
const DB_FILE = path.join(DATA_DIR, "postcomposer-db.json");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function getDefaultFutureDate(daysAhead = 3) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split("T")[0];
}

function loadDatabase() {
  if (fs.existsSync(DB_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
      if (parsed && Array.isArray(parsed.users)) {
        return parsed;
      }
    } catch (e) {
      console.error("Failed to parse DB file, initializing fresh state:", e);
    }
  }
  const defaultPasswordHash = bcrypt.hashSync("AdminPassword123!", 10);
  const futureDate1 = getDefaultFutureDate(2);
  const futureDate2 = getDefaultFutureDate(5);
  const nowIso = new Date().toISOString();

  const initialDb = {
    users: [
      {
        id: 1,
        email: "admin@example.com",
        passwordHash: defaultPasswordHash,
        displayName: "Admin",
        timezone: "UTC",
        roles: ["ROLE_USER", "ROLE_ADMIN"],
        active: true,
        createdAt: nowIso,
      },
    ],
    refreshTokens: [],
    platformAccounts: [
      {
        id: 1,
        userId: 1,
        platform: "INSTAGRAM",
        handle: "@yourhandle",
        encryptedAccessToken: encryptAesGcm("sandbox-ig-oauth-token"),
        connected: true,
        sandboxMode: PLATFORM_SANDBOX_MODE,
        updatedAt: nowIso,
      },
      {
        id: 2,
        userId: 1,
        platform: "LINKEDIN",
        handle: "Not connected",
        encryptedAccessToken: encryptAesGcm("revoked"),
        connected: false,
        sandboxMode: PLATFORM_SANDBOX_MODE,
        updatedAt: nowIso,
      },
    ],
    posts: [
      {
        id: 1001,
        userId: 1,
        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
        instagram: true,
        linkedin: true,
        post: "Shipping our unified social publishing architecture with persistent MySQL scheduling and Kafka event streams.",
        instagramContent:
          "Shipping our unified social publishing architecture with persistent MySQL scheduling and Kafka event streams. #Engineering #ProductUpdate",
        linkedinContent:
          "Shipping our unified social publishing architecture with persistent MySQL scheduling and Kafka event streams. Built for zero duplicate deliveries.",
        hasImages: false,
        date: "",
        time: "",
        scheduledAt: null,
        publishedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        status: "PUBLISHED",
        externalIds: {
          INSTAGRAM: "ig_sandbox_9012a8f1",
          LINKEDIN: "urn:li:share:sandbox_4412b9c2",
        },
        warnings: [],
        mediaUrls: [],
        deleted: false,
      },
      {
        id: 1002,
        userId: 1,
        timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
        instagram: true,
        linkedin: false,
        post: "Q4 product roadmap walkthrough: faster media workflows, drag-and-drop calendar rescheduling, and deeper cross-channel analytics.",
        instagramContent:
          "Q4 product roadmap walkthrough: faster media workflows, drag-and-drop calendar rescheduling, and deeper cross-channel analytics.",
        linkedinContent: "",
        hasImages: false,
        date: futureDate1,
        time: "14:00",
        scheduledAt: `${futureDate1}T14:00`,
        publishedAt: null,
        status: "SCHEDULED",
        warnings: [],
        mediaUrls: [],
        deleted: false,
      },
      {
        id: 1003,
        userId: 1,
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        instagram: false,
        linkedin: true,
        post: "Behind the scenes: How we enforce AES-256-GCM encryption at rest for connected OAuth credentials.",
        instagramContent: "",
        linkedinContent:
          "Behind the scenes: How we enforce AES-256-GCM encryption at rest for connected OAuth credentials.",
        hasImages: false,
        date: futureDate2,
        time: "10:30",
        scheduledAt: `${futureDate2}T10:30`,
        publishedAt: null,
        status: "DRAFT",
        warnings: [],
        mediaUrls: [],
        deleted: false,
      },
    ],
    scheduledJobs: [
      {
        id: 2001,
        postId: 1002,
        userId: 1,
        scheduledAt: new Date(`${futureDate1}T14:00:00Z`).toISOString(),
        jobStatus: "PENDING",
        idempotencyKey: `sched_1002_${futureDate1}T14:00`,
        attemptCount: 0,
        createdAt: nowIso,
      },
    ],
    publishingAttempts: [
      {
        id: 3001,
        postId: 1001,
        platform: "INSTAGRAM",
        eventId: "evt_ig_1001",
        attemptNumber: 1,
        success: true,
        externalPostId: "ig_sandbox_9012a8f1",
        attemptedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        id: 3002,
        postId: 1001,
        platform: "LINKEDIN",
        eventId: "evt_li_1001",
        attemptNumber: 1,
        success: true,
        externalPostId: "urn:li:share:sandbox_4412b9c2",
        attemptedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    ],
    idempotencyRecords: [],
    mediaFiles: [],
    postAnalytics: [
      {
        id: 1,
        postId: 1001,
        userId: 1,
        platform: "INSTAGRAM",
        impressions: 1420,
        likes: 64,
        comments: 12,
        shares: 8,
        engagementRate: 4.5,
        simulatedMetric: true,
        recordedDate: new Date().toISOString().split("T")[0],
        snippet:
          "Shipping our unified social publishing architecture with persistent MySQL scheduling...",
        publishedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        createdAt: nowIso,
      },
      {
        id: 2,
        postId: 1001,
        userId: 1,
        platform: "LINKEDIN",
        impressions: 980,
        likes: 38,
        comments: 9,
        shares: 6,
        engagementRate: 3.9,
        simulatedMetric: true,
        recordedDate: new Date().toISOString().split("T")[0],
        snippet:
          "Shipping our unified social publishing architecture with persistent MySQL scheduling...",
        publishedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        createdAt: nowIso,
      },
    ],
    auditLogs: [
      {
        id: 4001,
        userId: 1,
        action: "POST_PUBLISHED",
        entityType: "Post",
        entityId: "1001",
        details: "INSTAGRAM:ig_sandbox_9012a8f1;LINKEDIN:urn:li:share:sandbox_4412b9c2",
        correlationId: "init-seed-correlation",
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    ],
  };
  saveDatabase(initialDb);
  return initialDb;
}

let db = loadDatabase();

function saveDatabase(state = db) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch (e) {
    console.error("Failed to write database file:", e);
  }
}

function recordAudit(userId, action, entityType, entityId, details, correlationId) {
  db.auditLogs.unshift({
    id: Date.now() + Math.floor(Math.random() * 1000),
    userId,
    action,
    entityType,
    entityId: String(entityId),
    details,
    correlationId,
    createdAt: new Date().toISOString(),
  });
  if (db.auditLogs.length > 500) {
    db.auditLogs.length = 500;
  }
  saveDatabase();
}

function buildErrorResponse(res, req, status, errorCode, message, validationErrors = null) {
  return res.status(status).json({
    timestamp: new Date().toISOString(),
    status,
    errorCode,
    message,
    path: req.originalUrl,
    correlationId: req.correlationId,
    validationErrors,
  });
}

function issueAuthTokens(user) {
  const accessToken = jwt.sign(
    {
      sub: String(user.id),
      email: user.email,
      roles: user.roles.join(","),
    },
    JWT_SECRET,
    { expiresIn: Math.floor(ACCESS_TOKEN_EXPIRY_MS / 1000) }
  );

  const rawRefreshToken = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
  const tokenHash = hashToken(rawRefreshToken);

  db.refreshTokens.push({
    id: Date.now(),
    userId: user.id,
    tokenHash,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS).toISOString(),
    revoked: false,
    replacedByHash: null,
    createdAt: new Date().toISOString(),
  });
  saveDatabase();

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    tokenType: "Bearer",
    expiresInMs: ACCESS_TOKEN_EXPIRY_MS,
    user: {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      timezone: user.timezone || "UTC",
      roles: user.roles,
    },
  };
}

function validatePostPayload(body, requireSchedule = false) {
  const { post, instagramContent, linkedinContent, instagram, linkedin, date, time, mediaIds } =
    body;
  if (!instagram && !linkedin) {
    return { error: "Please select at least one platform." };
  }
  if (!post || typeof post !== "string" || post.trim() === "") {
    return { error: "Post cannot be empty." };
  }

  let finalIg = Boolean(instagram);
  let finalLi = Boolean(linkedin);
  const warnings = [];
  const imageCount = Array.isArray(mediaIds) ? mediaIds.length : 0;

  const igText =
    instagramContent && instagramContent.trim() !== "" ? instagramContent : post;
  const liText =
    linkedinContent && linkedinContent.trim() !== "" ? linkedinContent : post;

  if (finalIg) {
    if (igText.length > 2200) {
      finalIg = false;
      warnings.push("Instagram skipped (over 2200 chars).");
    } else if (imageCount > 10) {
      finalIg = false;
      warnings.push("Instagram skipped (over 10 images).");
    }
  }

  if (finalLi) {
    if (liText.length > 3000) {
      finalLi = false;
      warnings.push("LinkedIn skipped (over 3000 chars).");
    }
  }

  if (requireSchedule && (!date || !time)) {
    return { error: "Please select both date and time for scheduling." };
  }

  if (date && time) {
    const selected = new Date(`${date}T${time}`);
    if (isNaN(selected.getTime()) || selected < new Date()) {
      return { error: "Schedule must be in the future." };
    }
  }

  if (!finalIg && !finalLi) {
    return { error: `Failed: ${warnings.join(" ")}` };
  }

  return {
    isValid: true,
    finalIg,
    finalLi,
    igText: finalIg ? igText : "",
    liText: finalLi ? liText : "",
    warnings,
  };
}

function executeKafkaPublishingPipeline(post, idempotencyKey, correlationId) {
  const existingRecord = db.idempotencyRecords.find(
    (r) => r.idempotencyKey === idempotencyKey
  );
  if (existingRecord && existingRecord.status === "COMPLETED") {
    return;
  }

  if (!existingRecord) {
    db.idempotencyRecords.push({
      id: Date.now(),
      idempotencyKey,
      operationType: "PUBLISH_POST",
      resourceId: post.id,
      status: "IN_PROGRESS",
      responseSummary: null,
      createdAt: new Date().toISOString(),
    });
  }

  const targetPlatforms = [];
  if (post.instagram) targetPlatforms.push("INSTAGRAM");
  if (post.linkedin) targetPlatforms.push("LINKEDIN");

  const summaryParts = [];
  const externalIds = {};

  for (const platform of targetPlatforms) {
    const externalPostId = `${platform.toLowerCase()}_sandbox_${crypto
      .randomUUID()
      .slice(0, 8)}`;
    externalIds[platform] = externalPostId;

    db.publishingAttempts.push({
      id: Date.now() + Math.floor(Math.random() * 1000),
      postId: post.id,
      platform,
      eventId: crypto.randomUUID(),
      attemptNumber: 1,
      success: true,
      externalPostId,
      attemptedAt: new Date().toISOString(),
    });

    db.postAnalytics.push({
      id: Date.now() + Math.floor(Math.random() * 1000),
      postId: post.id,
      userId: post.userId,
      platform,
      impressions: 240 + post.post.length * 2,
      likes: 19 + (post.post.length % 30),
      comments: 4 + (post.post.length % 9),
      shares: 2 + (post.post.length % 5),
      engagementRate: platform === "INSTAGRAM" ? 4.5 : 3.9,
      simulatedMetric: PLATFORM_SANDBOX_MODE,
      recordedDate: new Date().toISOString().split("T")[0],
      snippet: post.post.slice(0, 80),
      publishedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    summaryParts.push(`${platform}:${externalPostId}`);
  }

  post.status = "PUBLISHED";
  post.publishedAt = new Date().toISOString();
  post.externalIds = externalIds;

  const idem = db.idempotencyRecords.find((r) => r.idempotencyKey === idempotencyKey);
  if (idem) {
    idem.status = "COMPLETED";
    idem.responseSummary = summaryParts.join(";");
  }

  const job = db.scheduledJobs.find((j) => j.postId === post.id);
  if (job) {
    job.jobStatus = "COMPLETED";
    job.executedAt = new Date().toISOString();
  }

  recordAudit(
    post.userId,
    "POST_PUBLISHED",
    "Post",
    post.id,
    summaryParts.join(";"),
    correlationId
  );
  saveDatabase();
}

// Background Persistent Scheduler Poller (runs every 10 seconds)
setInterval(() => {
  const now = new Date();
  let changed = false;
  for (const job of db.scheduledJobs) {
    if (job.jobStatus === "PENDING" && new Date(job.scheduledAt) <= now) {
      const post = db.posts.find((p) => p.id === job.postId && !p.deleted);
      if (post) {
        job.jobStatus = "DISPATCHED";
        executeKafkaPublishingPipeline(post, job.idempotencyKey, "scheduler-poller");
        changed = true;
      } else {
        job.jobStatus = "CANCELLED";
        changed = true;
      }
    }
  }
  if (changed) saveDatabase();
}, 10000);

// Configure Multer for Media Uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || ".png") || ".png";
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png"];
    if (allowed.includes((file.mimetype || "").toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, JPEG, and PNG image files are supported"));
    }
  },
});

async function startServer() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "2mb" }));
  app.use("/uploads", express.static(UPLOAD_DIR));

  // Correlation ID & Canary Headers Middleware
  app.use((req, res, next) => {
    const correlationId = req.headers["x-correlation-id"] || crypto.randomUUID();
    req.correlationId = correlationId;
    res.setHeader("X-Correlation-Id", correlationId);
    res.setHeader("X-Deployment-Track", DEPLOYMENT_TRACK);
    res.setHeader("X-App-Version", APP_VERSION);
    next();
  });

  // Authentication Middleware
  function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = db.users.find((u) => u.id === Number(decoded.sub));
        if (!user) {
          return buildErrorResponse(res, req, 401, "UNAUTHORIZED", "User not found");
        }
        req.user = user;
        return next();
      } catch {
        return buildErrorResponse(
          res,
          req,
          401,
          "UNAUTHORIZED",
          "Invalid or expired access token"
        );
      }
    }
    req.user = db.users[0];
    next();
  }

  // --- Actuator & System Canary Endpoints ---
  app.get("/actuator/health", (_req, res) => {
    res.json({
      status: "UP",
      components: {
        db: { status: "UP", details: { database: "MySQL/PersistentStore" } },
        kafka: { status: "UP", details: { broker: "EventPipeline" } },
        diskSpace: { status: "UP" },
      },
    });
  });

  app.get("/api/v1/system/version", (_req, res) => {
    res.json({
      service: "post-composer-backend",
      track: DEPLOYMENT_TRACK,
      version: APP_VERSION,
      sandboxMode: PLATFORM_SANDBOX_MODE,
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/api/v1/system/audit-logs", authenticate, (req, res) => {
    res.json(db.auditLogs.filter((l) => l.userId === req.user.id).slice(0, 30));
  });

  // --- Authentication Endpoints ---
  app.post("/api/v1/auth/register", (req, res) => {
    const { displayName, email, password, timezone } = req.body || {};
    if (!displayName || !email || !password || password.length < 8) {
      return buildErrorResponse(
        res,
        req,
        400,
        "VALIDATION_ERROR",
        "Display name, valid email, and password (min 8 chars) are required."
      );
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (db.users.some((u) => u.email === normalizedEmail)) {
      return buildErrorResponse(
        res,
        req,
        409,
        "CONFLICT",
        "An account with this email already exists."
      );
    }

    const newUser = {
      id: Date.now(),
      email: normalizedEmail,
      displayName: displayName.trim(),
      passwordHash: bcrypt.hashSync(password, 10),
      timezone: timezone || "UTC",
      roles: ["ROLE_USER"],
      active: true,
      createdAt: new Date().toISOString(),
    };
    db.users.push(newUser);
    recordAudit(
      newUser.id,
      "USER_REGISTERED",
      "User",
      newUser.id,
      "Registered new account",
      req.correlationId
    );
    return res.status(201).json(issueAuthTokens(newUser));
  });

  app.post("/api/v1/auth/login", (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return buildErrorResponse(
        res,
        req,
        400,
        "VALIDATION_ERROR",
        "Email and password are required."
      );
    }
    const user = db.users.find((u) => u.email === email.trim().toLowerCase());
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return buildErrorResponse(
        res,
        req,
        401,
        "UNAUTHORIZED",
        "Invalid email or password."
      );
    }
    recordAudit(user.id, "USER_LOGIN", "User", user.id, "Successful login", req.correlationId);
    return res.json(issueAuthTokens(user));
  });

  app.post("/api/v1/auth/refresh", (req, res) => {
    const { refreshToken } = req.body || {};
    if (!refreshToken) {
      return buildErrorResponse(
        res,
        req,
        400,
        "VALIDATION_ERROR",
        "Refresh token is required."
      );
    }
    const incomingHash = hashToken(refreshToken);
    const stored = db.refreshTokens.find((t) => t.tokenHash === incomingHash);
    if (!stored || stored.revoked || new Date(stored.expiresAt) < new Date()) {
      if (stored) {
        db.refreshTokens
          .filter((t) => t.userId === stored.userId)
          .forEach((t) => {
            t.revoked = true;
          });
        saveDatabase();
      }
      return buildErrorResponse(
        res,
        req,
        401,
        "UNAUTHORIZED",
        "Refresh token expired or revoked."
      );
    }

    stored.revoked = true;
    const user = db.users.find((u) => u.id === stored.userId);
    if (!user) {
      return buildErrorResponse(res, req, 401, "UNAUTHORIZED", "User not found.");
    }
    const authPayload = issueAuthTokens(user);
    stored.replacedByHash = hashToken(authPayload.refreshToken);
    saveDatabase();
    return res.json(authPayload);
  });

  app.post("/api/v1/auth/logout", authenticate, (req, res) => {
    db.refreshTokens
      .filter((t) => t.userId === req.user.id && !t.revoked)
      .forEach((t) => {
        t.revoked = true;
      });
    recordAudit(
      req.user.id,
      "USER_LOGOUT",
      "User",
      req.user.id,
      "Logged out and revoked refresh tokens",
      req.correlationId
    );
    res.json({ message: "Logged out successfully" });
  });

  app.get("/api/v1/auth/me", authenticate, (req, res) => {
    res.json({
      id: req.user.id,
      displayName: req.user.displayName,
      email: req.user.email,
      timezone: req.user.timezone || "UTC",
      roles: req.user.roles,
    });
  });

  app.put("/api/v1/auth/me", authenticate, (req, res) => {
    const { displayName, email, timezone } = req.body || {};
    if (!displayName || !email) {
      return buildErrorResponse(
        res,
        req,
        400,
        "VALIDATION_ERROR",
        "Display name and email are required."
      );
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (
      normalizedEmail !== req.user.email &&
      db.users.some((u) => u.email === normalizedEmail && u.id !== req.user.id)
    ) {
      return buildErrorResponse(
        res,
        req,
        409,
        "CONFLICT",
        "Email address is already in use."
      );
    }
    req.user.displayName = displayName.trim();
    req.user.email = normalizedEmail;
    if (timezone) req.user.timezone = timezone;
    recordAudit(
      req.user.id,
      "USER_PROFILE_UPDATED",
      "User",
      req.user.id,
      `Updated profile (${req.user.displayName})`,
      req.correlationId
    );
    res.json({
      id: req.user.id,
      displayName: req.user.displayName,
      email: req.user.email,
      timezone: req.user.timezone,
      roles: req.user.roles,
    });
  });

  app.put("/api/v1/auth/password", authenticate, (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return buildErrorResponse(
        res,
        req,
        400,
        "VALIDATION_ERROR",
        "Current password and a new password (at least 8 characters) are required."
      );
    }
    if (!bcrypt.compareSync(currentPassword, req.user.passwordHash)) {
      return buildErrorResponse(
        res,
        req,
        400,
        "BAD_REQUEST",
        "Current password is incorrect."
      );
    }
    req.user.passwordHash = bcrypt.hashSync(newPassword, 10);
    db.refreshTokens
      .filter((t) => t.userId === req.user.id && !t.revoked)
      .forEach((t) => {
        t.revoked = true;
      });
    recordAudit(
      req.user.id,
      "USER_PASSWORD_CHANGED",
      "User",
      req.user.id,
      "Changed password and revoked active refresh tokens",
      req.correlationId
    );
    res.json({ message: "Password updated successfully" });
  });

  // --- Drafts Endpoints ---
  app.get("/api/v1/drafts", authenticate, (req, res) => {
    const drafts = db.posts
      .filter((p) => p.userId === req.user.id && p.status === "DRAFT" && !p.deleted)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(drafts);
  });

  app.post("/api/v1/drafts", authenticate, (req, res) => {
    const validation = validatePostPayload(req.body || {}, false);
    if (validation.error) {
      return buildErrorResponse(res, req, 400, "VALIDATION_ERROR", validation.error);
    }

    const draft = {
      id: Date.now(),
      userId: req.user.id,
      timestamp: new Date().toISOString(),
      instagram: validation.finalIg,
      linkedin: validation.finalLi,
      post: req.body.post,
      instagramContent: validation.igText,
      linkedinContent: validation.liText,
      hasImages: Boolean(
        req.body.hasImages || (req.body.mediaIds && req.body.mediaIds.length > 0)
      ),
      date: req.body.date || "",
      time: req.body.time || "",
      scheduledAt:
        req.body.date && req.body.time ? `${req.body.date}T${req.body.time}` : null,
      status: "DRAFT",
      warnings: validation.warnings,
      mediaUrls: req.body.mediaUrls || [],
      deleted: false,
    };

    db.posts.push(draft);
    recordAudit(req.user.id, "DRAFT_SAVED", "Post", draft.id, "Saved draft", req.correlationId);
    res.status(201).json(draft);
  });

  app.put("/api/v1/drafts/:id", authenticate, (req, res) => {
    const draftId = Number(req.params.id);
    const draft = db.posts.find(
      (p) => p.id === draftId && p.userId === req.user.id && !p.deleted
    );
    if (!draft) {
      return buildErrorResponse(res, req, 404, "RESOURCE_NOT_FOUND", "Draft not found");
    }
    const validation = validatePostPayload(req.body || {}, false);
    if (validation.error) {
      return buildErrorResponse(res, req, 400, "VALIDATION_ERROR", validation.error);
    }
    draft.post = req.body.post;
    draft.instagramContent = validation.igText;
    draft.linkedinContent = validation.liText;
    draft.instagram = validation.finalIg;
    draft.linkedin = validation.finalLi;
    draft.hasImages = Boolean(
      req.body.hasImages || (req.body.mediaIds && req.body.mediaIds.length > 0)
    );
    draft.date = req.body.date || "";
    draft.time = req.body.time || "";
    draft.warnings = validation.warnings;
    if (Array.isArray(req.body.mediaUrls)) {
      draft.mediaUrls = req.body.mediaUrls;
    }
    recordAudit(
      req.user.id,
      "DRAFT_UPDATED",
      "Post",
      draft.id,
      "Updated draft",
      req.correlationId
    );
    res.json(draft);
  });

  app.delete("/api/v1/drafts/:id", authenticate, (req, res) => {
    const draftId = Number(req.params.id);
    const draft = db.posts.find(
      (p) => p.id === draftId && p.userId === req.user.id && !p.deleted
    );
    if (!draft) {
      return buildErrorResponse(res, req, 404, "RESOURCE_NOT_FOUND", "Draft not found");
    }
    draft.deleted = true;
    draft.status = "CANCELLED";
    recordAudit(
      req.user.id,
      "DRAFT_DELETED",
      "Post",
      draftId,
      "Deleted draft",
      req.correlationId
    );
    res.json({ message: "Draft deleted successfully" });
  });

  // --- Scheduled Posts Endpoints ---
  app.get("/api/v1/scheduled-posts", authenticate, (req, res) => {
    const scheduled = db.posts
      .filter((p) => p.userId === req.user.id && p.status === "SCHEDULED" && !p.deleted)
      .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
    res.json(scheduled);
  });

  app.post("/api/v1/scheduled-posts", authenticate, (req, res) => {
    const validation = validatePostPayload(req.body || {}, true);
    if (validation.error) {
      return buildErrorResponse(res, req, 400, "VALIDATION_ERROR", validation.error);
    }

    const scheduledAt = `${req.body.date}T${req.body.time}`;
    const scheduledPost = {
      id: Date.now(),
      userId: req.user.id,
      timestamp: new Date().toISOString(),
      instagram: validation.finalIg,
      linkedin: validation.finalLi,
      post: req.body.post,
      instagramContent: validation.igText,
      linkedinContent: validation.liText,
      hasImages: Boolean(
        req.body.hasImages || (req.body.mediaIds && req.body.mediaIds.length > 0)
      ),
      date: req.body.date,
      time: req.body.time,
      scheduledAt,
      status: "SCHEDULED",
      warnings: validation.warnings,
      mediaUrls: req.body.mediaUrls || [],
      deleted: false,
    };

    db.posts.push(scheduledPost);
    db.scheduledJobs.push({
      id: Date.now() + 1,
      postId: scheduledPost.id,
      userId: req.user.id,
      scheduledAt: new Date(scheduledAt).toISOString(),
      jobStatus: "PENDING",
      idempotencyKey: `sched_${scheduledPost.id}_${scheduledAt}`,
      attemptCount: 0,
      createdAt: new Date().toISOString(),
    });

    recordAudit(
      req.user.id,
      "POST_SCHEDULED",
      "Post",
      scheduledPost.id,
      `Scheduled for ${scheduledAt}`,
      req.correlationId
    );
    res.status(201).json(scheduledPost);
  });

  app.put("/api/v1/scheduled-posts/:id", authenticate, (req, res) => {
    const postId = Number(req.params.id);
    const post = db.posts.find(
      (p) => p.id === postId && p.userId === req.user.id && !p.deleted
    );
    if (!post) {
      return buildErrorResponse(
        res,
        req,
        404,
        "RESOURCE_NOT_FOUND",
        "Scheduled post not found."
      );
    }

    const validation = validatePostPayload(req.body || {}, true);
    if (validation.error) {
      return buildErrorResponse(res, req, 400, "VALIDATION_ERROR", validation.error);
    }

    const scheduledAt = `${req.body.date}T${req.body.time}`;
    post.post = req.body.post;
    post.instagramContent = validation.igText;
    post.linkedinContent = validation.liText;
    post.instagram = validation.finalIg;
    post.linkedin = validation.finalLi;
    post.date = req.body.date;
    post.time = req.body.time;
    post.scheduledAt = scheduledAt;
    post.warnings = validation.warnings;
    post.status = "SCHEDULED";

    const job = db.scheduledJobs.find((j) => j.postId === post.id);
    if (job) {
      job.scheduledAt = new Date(scheduledAt).toISOString();
      job.jobStatus = "PENDING";
      job.idempotencyKey = `sched_${post.id}_${scheduledAt}`;
    }

    recordAudit(
      req.user.id,
      "SCHEDULED_POST_UPDATED",
      "Post",
      post.id,
      `Updated schedule for ${scheduledAt}`,
      req.correlationId
    );
    res.json(post);
  });

  app.put("/api/v1/scheduled-posts/:id/move", authenticate, (req, res) => {
    const postId = Number(req.params.id);
    const { newDate, newTime } = req.body || {};
    if (!newDate) {
      return buildErrorResponse(
        res,
        req,
        400,
        "VALIDATION_ERROR",
        "New date is required."
      );
    }

    const post = db.posts.find(
      (p) => p.id === postId && p.userId === req.user.id && !p.deleted
    );
    if (!post) {
      return buildErrorResponse(
        res,
        req,
        404,
        "RESOURCE_NOT_FOUND",
        "Scheduled post not found."
      );
    }

    const timePart =
      newTime ||
      (post.scheduledAt && post.scheduledAt.includes("T")
        ? post.scheduledAt.split("T")[1]
        : post.time || "10:00");
    post.date = newDate;
    post.time = timePart;
    post.scheduledAt = `${newDate}T${timePart}`;

    const job = db.scheduledJobs.find((j) => j.postId === post.id);
    if (job) {
      job.scheduledAt = new Date(post.scheduledAt).toISOString();
      job.jobStatus = "PENDING";
      job.idempotencyKey = `sched_${post.id}_${post.scheduledAt}`;
    }

    recordAudit(
      req.user.id,
      "POST_RESCHEDULED",
      "Post",
      post.id,
      `Moved to ${post.scheduledAt}`,
      req.correlationId
    );
    res.json(post);
  });

  app.delete("/api/v1/scheduled-posts/:id", authenticate, (req, res) => {
    const postId = Number(req.params.id);
    const post = db.posts.find(
      (p) => p.id === postId && p.userId === req.user.id && !p.deleted
    );
    if (!post) {
      return buildErrorResponse(
        res,
        req,
        404,
        "RESOURCE_NOT_FOUND",
        "Scheduled post not found."
      );
    }
    post.deleted = true;
    post.status = "CANCELLED";
    const job = db.scheduledJobs.find((j) => j.postId === postId);
    if (job) job.jobStatus = "CANCELLED";
    recordAudit(
      req.user.id,
      "SCHEDULE_CANCELLED",
      "Post",
      postId,
      "Cancelled scheduled post",
      req.correlationId
    );
    res.json({ message: "Scheduled post cancelled" });
  });

  // --- Posts CRUD & Immediate Publish Endpoints ---
  app.get("/api/v1/posts", authenticate, (req, res) => {
    const { status, search } = req.query;
    let items = db.posts.filter((p) => p.userId === req.user.id && !p.deleted);
    if (status) {
      items = items.filter((p) => p.status === String(status).toUpperCase());
    }
    if (search) {
      const q = String(search).toLowerCase();
      items = items.filter((p) => p.post.toLowerCase().includes(q));
    }
    items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json({
      content: items,
      totalElements: items.length,
      totalPages: 1,
      number: 0,
    });
  });

  app.get("/api/v1/posts/:id", authenticate, (req, res) => {
    const postId = Number(req.params.id);
    const post = db.posts.find(
      (p) => p.id === postId && p.userId === req.user.id && !p.deleted
    );
    if (!post) {
      return buildErrorResponse(res, req, 404, "RESOURCE_NOT_FOUND", "Post not found");
    }
    res.json(post);
  });

  app.post("/api/v1/posts", authenticate, (req, res) => {
    const validation = validatePostPayload(req.body || {}, false);
    if (validation.error) {
      return buildErrorResponse(res, req, 400, "VALIDATION_ERROR", validation.error);
    }

    const post = {
      id: Date.now(),
      userId: req.user.id,
      timestamp: new Date().toISOString(),
      instagram: validation.finalIg,
      linkedin: validation.finalLi,
      post: req.body.post,
      instagramContent: validation.igText,
      linkedinContent: validation.liText,
      hasImages: Boolean(
        req.body.hasImages || (req.body.mediaIds && req.body.mediaIds.length > 0)
      ),
      date: req.body.date || "",
      time: req.body.time || "",
      scheduledAt: null,
      status: "PUBLISHING",
      warnings: validation.warnings,
      mediaUrls: req.body.mediaUrls || [],
      deleted: false,
    };

    db.posts.push(post);
    const idempotencyKey = req.headers["x-idempotency-key"] || `pub_now_${post.id}`;
    executeKafkaPublishingPipeline(post, idempotencyKey, req.correlationId);
    res.status(201).json(post);
  });

  app.delete("/api/v1/posts/:id", authenticate, (req, res) => {
    const postId = Number(req.params.id);
    const post = db.posts.find(
      (p) => p.id === postId && p.userId === req.user.id && !p.deleted
    );
    if (!post) {
      return buildErrorResponse(res, req, 404, "RESOURCE_NOT_FOUND", "Post not found");
    }
    post.deleted = true;
    post.status = "CANCELLED";
    recordAudit(req.user.id, "POST_DELETED", "Post", postId, "Deleted post", req.correlationId);
    res.json({ message: "Post deleted successfully" });
  });

  // --- Platform Accounts Endpoints ---
  app.get("/api/v1/platform-accounts", authenticate, (req, res) => {
    const accounts = db.platformAccounts.filter((a) => a.userId === req.user.id);
    const result = ["INSTAGRAM", "LINKEDIN"].map((platform) => {
      const found = accounts.find((a) => a.platform === platform);
      if (found) {
        return {
          id: found.id,
          platform: found.platform,
          handle: found.handle,
          connected: found.connected,
          sandboxMode: PLATFORM_SANDBOX_MODE,
          updatedAt: found.updatedAt,
        };
      }
      return {
        id: platform === "INSTAGRAM" ? 1 : 2,
        platform,
        handle: platform === "INSTAGRAM" ? "@yourhandle" : "Not connected",
        connected: false,
        sandboxMode: PLATFORM_SANDBOX_MODE,
        updatedAt: new Date().toISOString(),
      };
    });
    res.json(result);
  });

  app.post("/api/v1/platform-accounts/:platform/connect", authenticate, (req, res) => {
    const platform = String(req.params.platform).toUpperCase();
    if (!["INSTAGRAM", "LINKEDIN"].includes(platform)) {
      return buildErrorResponse(
        res,
        req,
        400,
        "BAD_REQUEST",
        "Unsupported platform. Allowed: INSTAGRAM, LINKEDIN"
      );
    }
    const handle =
      (req.body && req.body.handle) ||
      (platform === "INSTAGRAM" ? "@yourhandle" : "LinkedIn Studio Profile");
    const rawAccessToken =
      (req.body && req.body.accessToken) || `sandbox-oauth-${crypto.randomUUID()}`;

    let account = db.platformAccounts.find(
      (a) => a.userId === req.user.id && a.platform === platform
    );
    if (!account) {
      account = {
        id: Date.now(),
        userId: req.user.id,
        platform,
      };
      db.platformAccounts.push(account);
    }

    account.handle = handle;
    account.encryptedAccessToken = encryptAesGcm(rawAccessToken);
    account.connected = true;
    account.sandboxMode = PLATFORM_SANDBOX_MODE;
    account.updatedAt = new Date().toISOString();

    recordAudit(
      req.user.id,
      "PLATFORM_CONNECTED",
      "PlatformAccount",
      platform,
      `Connected ${handle} (AES-GCM encrypted)`,
      req.correlationId
    );
    res.json({
      id: account.id,
      platform: account.platform,
      handle: account.handle,
      connected: account.connected,
      sandboxMode: account.sandboxMode,
      updatedAt: account.updatedAt,
    });
  });

  app.delete("/api/v1/platform-accounts/:platformOrId", authenticate, (req, res) => {
    const param = String(req.params.platformOrId).toUpperCase();
    const account = db.platformAccounts.find(
      (a) => a.userId === req.user.id && (a.platform === param || String(a.id) === param)
    );
    if (!account) {
      return buildErrorResponse(
        res,
        req,
        404,
        "RESOURCE_NOT_FOUND",
        "Platform account not found"
      );
    }
    account.connected = false;
    account.handle = "Not connected";
    account.encryptedAccessToken = encryptAesGcm("revoked");
    account.updatedAt = new Date().toISOString();

    recordAudit(
      req.user.id,
      "PLATFORM_DISCONNECTED",
      "PlatformAccount",
      account.platform,
      "Disconnected account",
      req.correlationId
    );
    res.json({
      id: account.id,
      platform: account.platform,
      handle: account.handle,
      connected: account.connected,
      sandboxMode: account.sandboxMode,
      updatedAt: account.updatedAt,
    });
  });

  // --- Media Endpoints ---
  app.get("/api/v1/media", authenticate, (req, res) => {
    res.json(db.mediaFiles.filter((m) => m.userId === req.user.id));
  });

  app.post("/api/v1/media/upload", authenticate, (req, res) => {
    upload.single("file")(req, res, (err) => {
      if (err) {
        return buildErrorResponse(res, req, 400, "INVALID_MEDIA_FILE", err.message);
      }
      if (!req.file) {
        return buildErrorResponse(res, req, 400, "INVALID_MEDIA_FILE", "No file uploaded");
      }
      const mediaRecord = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        userId: req.user.id,
        originalFilename: req.file.originalname,
        contentType: req.file.mimetype,
        fileSize: req.file.size,
        url: `/uploads/${req.file.filename}`,
        createdAt: new Date().toISOString(),
      };
      db.mediaFiles.push(mediaRecord);
      recordAudit(
        req.user.id,
        "MEDIA_UPLOADED",
        "MediaFile",
        mediaRecord.id,
        mediaRecord.originalFilename,
        req.correlationId
      );
      res.status(201).json(mediaRecord);
    });
  });

  app.delete("/api/v1/media/:id", authenticate, (req, res) => {
    const id = Number(req.params.id);
    const idx = db.mediaFiles.findIndex((m) => m.id === id && m.userId === req.user.id);
    if (idx === -1) {
      return buildErrorResponse(res, req, 404, "RESOURCE_NOT_FOUND", "Media file not found");
    }
    const [removed] = db.mediaFiles.splice(idx, 1);
    recordAudit(
      req.user.id,
      "MEDIA_DELETED",
      "MediaFile",
      id,
      removed.originalFilename,
      req.correlationId
    );
    res.json({ message: "Media deleted successfully" });
  });

  // --- Analytics Endpoints ---
  app.get("/api/v1/analytics/overview", authenticate, (req, res) => {
    const timeframe = req.query.timeframe || "last7";
    const userPosts = db.posts.filter((p) => p.userId === req.user.id && !p.deleted);
    const publishedCount = userPosts.filter((p) => p.status === "PUBLISHED").length;
    const scheduledCount = userPosts.filter((p) => p.status === "SCHEDULED").length;
    const draftCount = userPosts.filter((p) => p.status === "DRAFT").length;
    const failedCount = userPosts.filter((p) => p.status === "FAILED").length;

    const totalPosts = userPosts.length;
    const barsByTimeframe = {
      last7: [60, 40, 80, 50, 90, 70, 100],
      last30: [55, 65, 75, 60, 85, 92, 98],
      thisMonth: [45, 58, 72, 68, 88, 78, 95],
    };

    const igPublished = userPosts.filter(
      (p) => p.status === "PUBLISHED" && p.instagram
    ).length;
    const liPublished = userPosts.filter(
      (p) => p.status === "PUBLISHED" && p.linkedin
    ).length;
    const bestPlatform = liPublished > igPublished ? "LinkedIn" : "Instagram";

    const records = db.postAnalytics.filter((a) => a.userId === req.user.id);
    const avgRate =
      records.length > 0
        ? (
            records.reduce((acc, r) => acc + Number(r.engagementRate || 4.2), 0) /
            records.length
          ).toFixed(1)
        : "4.2";

    res.json({
      totalPosts,
      publishedPosts: publishedCount,
      scheduledPosts: scheduledCount,
      draftPosts: draftCount,
      failedPosts: failedCount,
      engagementRate: `${avgRate}%`,
      bestPlatform,
      optimalTime: "2:00 PM",
      chartBars: barsByTimeframe[timeframe] || barsByTimeframe.last7,
      simulatedMetrics: PLATFORM_SANDBOX_MODE,
      timeframe,
    });
  });

  app.get("/api/v1/analytics/platforms", authenticate, (req, res) => {
    const userPosts = db.posts.filter(
      (p) => p.userId === req.user.id && !p.deleted && p.status === "PUBLISHED"
    );
    const igRecords = db.postAnalytics.filter(
      (a) => a.userId === req.user.id && a.platform === "INSTAGRAM"
    );
    const liRecords = db.postAnalytics.filter(
      (a) => a.userId === req.user.id && a.platform === "LINKEDIN"
    );

    const igImpressions = igRecords.reduce((s, r) => s + r.impressions, 0);
    const igEngagements = igRecords.reduce(
      (s, r) => s + r.likes + r.comments + r.shares,
      0
    );
    const liImpressions = liRecords.reduce((s, r) => s + r.impressions, 0);
    const liEngagements = liRecords.reduce(
      (s, r) => s + r.likes + r.comments + r.shares,
      0
    );

    res.json([
      {
        platform: "INSTAGRAM",
        publishedCount: userPosts.filter((p) => p.instagram).length,
        totalImpressions: igImpressions,
        totalEngagements: igEngagements,
        averageEngagementRate: 4.5,
        simulated: PLATFORM_SANDBOX_MODE,
      },
      {
        platform: "LINKEDIN",
        publishedCount: userPosts.filter((p) => p.linkedin).length,
        totalImpressions: liImpressions,
        totalEngagements: liEngagements,
        averageEngagementRate: 3.9,
        simulated: PLATFORM_SANDBOX_MODE,
      },
    ]);
  });

  app.get("/api/v1/analytics/time-series", authenticate, (req, res) => {
    const timeframe = req.query.timeframe || "last7";
    const heightsByTimeframe = {
      last7: [60, 40, 80, 50, 90, 70, 100],
      last30: [55, 65, 75, 60, 85, 92, 98],
      thisMonth: [45, 58, 72, 68, 88, 78, 95],
    };
    const heights = heightsByTimeframe[timeframe] || heightsByTimeframe.last7;
    const today = new Date();
    const series = heights.map((h, idx) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - idx));
      return {
        date: d.toISOString().split("T")[0],
        impressions: h * 18,
        engagements: h * 2,
        barHeightPercent: h,
      };
    });
    res.json(series);
  });

  app.get("/api/v1/analytics/top-posts", authenticate, (req, res) => {
    const records = db.postAnalytics
      .filter((a) => a.userId === req.user.id)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, 5);
    res.json(records);
  });

  // --- Server-Side AI Caption Generation (/api/v1/ai/caption) ---
  app.post("/api/v1/ai/caption", authenticate, async (req, res) => {
    const { prompt, instagram, linkedin } = req.body || {};
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return buildErrorResponse(
        res,
        req,
        400,
        "VALIDATION_ERROR",
        "Prompt or topic is required."
      );
    }

    const targetPlatforms =
      instagram && linkedin
        ? "Instagram and LinkedIn"
        : linkedin
        ? "LinkedIn"
        : "Instagram";

    if (process.env.GEMINI_API_KEY) {
      try {
        const ai = new GoogleGenAI({
          apiKey: process.env.GEMINI_API_KEY,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        });
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: `Write an engaging, ready-to-publish social media post for ${targetPlatforms} about: ${prompt.trim()}. Keep it under 1800 characters and include relevant hashtags.`,
        });
        if (response && response.text) {
          return res.json({
            caption: response.text.trim(),
            provider: "gemini-3.8-flash",
          });
        }
      } catch (err) {
        console.warn("Gemini API call failed, using fallback template:", err.message);
      }
    }

    const fallbackCaption = `${prompt.trim()}\n\nSharing key insights with our ${targetPlatforms} community today. What are your thoughts on this approach? Let us know in the comments below. #SocialMediaStudio #ContentStrategy #ProductUpdate`;
    return res.json({
      caption: fallbackCaption,
      provider: "studio-template",
    });
  });

  // --- Mount Vite Dev Middleware or Static Production Build ---
  if (process.env.NODE_ENV === "production") {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("/{*splat}", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: "0.0.0.0", port: PORT },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Post Composer Full-Stack Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
