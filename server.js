require("dotenv").config();
const express = require("express");
const compression = require("compression");
const morgan = require("morgan");
const dotenv = require("dotenv");
const mysqlpool = require("./config/db");
const bodyParser = require('body-parser');
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const http = require("http");
const app = express();
const server = http.createServer(app);

const securityHeaders = require("./middlewares/securityHeaders");
const { authLimiter, generalLimiter } = require("./middlewares/rateLimiter");
const { initializeSocket } = require("./config/soketConfig");
const passport = require('passport');
const session = require('express-session');
require('./config/userLoginWithGoogle'); 
const admin = require('firebase-admin');

// Safe Firebase Admin Initialization (Prevents crash if serviceAccountKey.json is missing on VPS/Server)
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
try {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin initialized successfully.");
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin initialized via FIREBASE_SERVICE_ACCOUNT env.");
  } else {
    console.warn("⚠️ [Warning] serviceAccountKey.json not found. Push notifications will be disabled until configured.");
  }
} catch (fcmErr) {
  console.warn("⚠️ [Warning] Failed to initialize Firebase Admin:", fcmErr.message);
}

app.use(securityHeaders);
app.use(cors());
app.use(compression());
app.use(generalLimiter);

initializeSocket(server);

const port = process.env.PORT || 3002
const IP = '0.0.0.0'


app.use(session({
  secret: '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',
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

// Health & Monitoring
app.use("/api/v1/health", require("./Routes/healthRoutes"));

app.use('/auth', authLimiter, require("./Routes/customerRoutes"));
app.use('/auth/mobile', require('./Routes/googleMobileAuth'));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use(express.json());

app.use("/api/v1/auth", authLimiter, require("./Routes/customerRoutes"));
app.use("/api/v1/users", require("./Routes/customerRoutes"));
app.use("/api/v1/pandit", require("./Routes/panditRoutes"));
app.use("/api/v1/agent",require('./Routes/agentRoutes'));
app.use("/api/v1/panditComment",require('./Routes/panditComment'));
app.use("/api/v1/payment", require("./Routes/paymentRoutes"));
app.use("/api/v1/user/services", require("./Routes/serviceRoutes"));
app.use("/api/v1/user/onlinePuja", require("./Routes/onlinePujaRoutes"));
app.use("/api/v1/user/prasad", require("./Routes/prasadRoutes"));
app.use("/api/v1/live_stream", require("./Routes/liveStreamRoute"));
app.use("/api/v1/chats", require("./Routes/chatRoutes"));
app.use("/api/v1/call", require("./Routes/callRoutes"));
app.use("/api/v1/request", require("./Routes/requestRoute"))
app.use("/api/v1/products", require("./Routes/productRoutes"));
app.use("/api/v1/orders", require("./Routes/orderRoutes"));
app.use("/api/v1/cart", require("./Routes/cartRoutes"));
app.use('/api/v1/admin', require('./Routes/adminRoutes'));
app.use("/api/v1/enquiry", require('./Routes/enquiryRoutes'));
app.use('/api/v1/temple', require('./Routes/templeRoutes'));
app.use('/api/v1/feedback', require('./Routes/feedbackRoutes'));
app.use('/api/v1/pooja', require('./Routes/bookpoojaRoutes'));
app.use('/api/v1/yoga', require('./Routes/yogaRoutes'));
app.use('/api/v1/muhurat', require('./Routes/muhuratRoutes'));
app.use('/api/v1/newsletter', require('./Routes/newletterRouter'));
app.use('/api/v1/blog', require('./Routes/blogRoutes'));
app.use('/api/v1/problem', require('./Routes/problemRoutes'));
app.use('/api/v1/banner',require('./Routes/bannerRoutes'));
app.use('/api/v1/footer',require('./Routes/footerRoutes'));
app.use('/api/v1/category',require('./Routes/categoryRoutes'));
app.use('/api/v1/tinyblog',require('./Routes/tinyRoutes'));
app.use('/api/v1/seller',require('./Routes/sellerRoutes'));
app.use('/api/v1/bankDetail',require('./Routes/bankDetailRoute'));
app.use("/api/v1/notifications", require("./Routes/notificationRoutes"));
app.use("/api/v1/coupon", require("./Routes/ProductCouponRoutes"));
app.use("/api/v1/media",require('./Routes/mediaRoutes'));
app.use("/api/v1/pushNotification", require('./Routes/mobilePushNotification'));
app.use("/api/v1/pushNotificatin", require('./Routes/mobilePushNotification'));

app.use("/api/v1/rudraAbhishek",require('./Routes/rudraAbhishekRoutes'));
app.use("/api/v1/events", require('./Routes/eventRoutes'));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.send("Welcome to Prabhu Pooja API");
});

const invoicePath = path.join(__dirname, "invoices");
if (!fs.existsSync(invoicePath)) {
  fs.mkdirSync(invoicePath, { recursive: true });
}

app.use("/invoices", express.static(invoicePath));

// 404 Catch-All Route
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `API Route not found: ${req.method} ${req.originalUrl}`
  });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("Global Error Handler caught:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

const createEventTable = require("./createEventTable");
const runMigrations = require("./scripts/migrations");

mysqlpool.query("SELECT 1").then(async () => {
  console.log("database is connected");
  try {
    await runMigrations();
    await createEventTable();
  } catch (tErr) {
    console.warn("Database sync init warning:", tErr.message);
  }
  server.listen(port, IP, () => {
    console.log(`App is running on port ${port} and IP ${IP}`);
  });
})
  .catch((error) => {
    console.error("Database connection failed:", error);
    process.exit(1);
  });