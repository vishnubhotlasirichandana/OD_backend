// index.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import passport from "passport";
import rateLimit from "express-rate-limit";

import DBconnection from "./src/config/db.js";
import "./src/config/passport-setup.js";
import logger from "./src/utils/logger.js";
import config from "./src/config/env.js";

// Route Imports
import authRoutes from "./src/routes/authRoutes.js";
import ownerRegistrationRoutes from "./src/routes/ownerRegistration.routes.js";
import restaurantRoutes from "./src/routes/restaurant.routes.js";
import menuItemRoutes from "./src/routes/menuItem.routes.js";
import cartRoutes from "./src/routes/cart.routes.js";
import orderRoutes from "./src/routes/order.routes.js";
import announcementRoutes from "./src/routes/announcements.routes.js";
import adminRoutes from "./src/routes/admin.routes.js";
import ownerRoutes from "./src/routes/owner.routes.js";
import deliveryRoutes from "./src/routes/delivery.routes.js";
import paymentRoutes from "./src/routes/payment.routes.js";
import tableRoutes from "./src/routes/table.routes.js";
import bookingRoutes from "./src/routes/booking.routes.js";
import userRoutes from "./src/routes/user.routes.js";
import promoRoutes from "./src/routes/promo.routes.js";
import { stripeWebhookHandler } from "./src/controllers/webhookController.js";

const app = express();
app.set("trust proxy", 1);

// Stripe webhook (must be before express.json)
app.post(
  "/api/payment/stripe-webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler
);

// Core middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);

app.use(passport.initialize());

// Rate limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

// Routes
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/ownerRegistration", authLimiter, ownerRegistrationRoutes);
app.use("/api/restaurants", generalApiLimiter, restaurantRoutes);
app.use("/api/menuItems", generalApiLimiter, menuItemRoutes);
app.use("/api/cart", generalApiLimiter, cartRoutes);
app.use("/api/orders", generalApiLimiter, orderRoutes);
app.use("/api/announcements", generalApiLimiter, announcementRoutes);
app.use("/api/admin", generalApiLimiter, adminRoutes);
app.use("/api/owner", generalApiLimiter, ownerRoutes);
app.use("/api/delivery", generalApiLimiter, deliveryRoutes);
app.use("/api/payment", generalApiLimiter, paymentRoutes);
app.use("/api/tables", generalApiLimiter, tableRoutes);
app.use("/api/bookings", generalApiLimiter, bookingRoutes);
app.use("/api/users", generalApiLimiter, userRoutes);

if (config.featureFlags.enableOffers === true) {
  app.use("/api/promo", generalApiLimiter, promoRoutes);
}

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is healthy." });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(err.message, {
    stack: err.stack,
    path: req.path,
    statusCode: err.statusCode,
  });

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

// Start server
const PORT = config.port;

DBconnection()
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    logger.error("MongoDB connection error", { error: error.message });
    process.exit(1);
  });
