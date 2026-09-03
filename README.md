# Prabhu Pooja Backend (2026)

Robust REST API backend and real-time communication server for the **Prabhu Pooja** ecosystem (Customer App, Pandit Platform, Seller & Admin Dashboards).

---

## 🌟 Tech Stack & Infrastructure

- **Runtime**: Node.js (Express.js)
- **Database**: MySQL (Connection Pooling via `mysql2/promise`)
- **Realtime**: WebSockets / Socket.io & uWebSockets
- **Cloud Storage**: AWS S3 (`@aws-sdk/client-s3` + `multer-s3`)
- **Authentication**: JWT, Google OAuth 2.0 (`passport`, `google-auth-library`), Firebase Admin
- **Payments**: Razorpay Gateway Integration
- **Notifications**: Firebase Cloud Messaging (FCM Mobile Push), MSG91 SMS, Twilio, Nodemailer

---

## 📁 Photos & Videos Storage Architecture

All media files (images, certificates, banners, documents, and videos) are uploaded and organized cleanly in **AWS S3** (`prabhupooja1` bucket in `ap-south-1` region) with local fallback capability:

| Media Type | Storage Directory / S3 Prefix | File Types Allowed | Stored in DB As |
| :--- | :--- | :--- | :--- |
| **Media Feed Images** | `media/` | JPG, PNG, WEBP | JSON Array of S3 URLs in `media.file` |
| **Media Feed Videos / Reels** | `media/` | MP4, MOV, WEBM | JSON Array of S3 URLs in `media.file` |
| **Product Images & Reviews** | `products/` | JPG, PNG, WEBP | JSON Array of URLs in `products.image` |
| **Pandit KYC & Profiles** | `panditDocs/` | JPG, PNG, PDF | S3 URL strings (`aadharCard`, `panCard`, etc.) |
| **Temple Photos & Gallery** | `temple/` | JPG, PNG, WEBP | Main Image & JSON array `gallery` in `temple` |
| **Prasad Images** | `prasad/` | JPG, PNG | S3 URL string in `prasad.image` |
| **Online Puja Images** | `onlinePooja/` | JPG, PNG | S3 URL string in `online_puja.image` |
| **Services & Muhurat** | `services/` | JPG, PNG | S3 URL string in `services.image` |
| **Events & Festivals** | `events/` (or `uploads/`) | JPG, PNG | S3 / Local URL in `events.image` |
| **Banners & Offers** | `banners/` / `products/` | JPG, PNG | S3 URL in `banner.image` / `user.offer_banner` |
| **Generated Invoices** | `invoices/` | PDF | Generated PDF in `/invoices/` + S3 Backup |

---

## 🚀 Getting Started

### 1. Installation
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
PORT=3002

# Database Settings
DbHost=localhost
DbUser=root
DbPassword=
DbName=prabhupooja

# AWS S3 Storage
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-south-1
S3_BUCKET_NAME=prabhupooja1

# JWT & Authentication
JWT_SECRET_KEY=your_jwt_secret

# Payment Gateways
RazorPay_Key_Id=your_razorpay_key
RazorPay_Key_Secret=your_razorpay_secret
```

### 3. Running the Server
```bash
# Development Mode
npm run dev

# Production Mode
npm start
```

---

## 🛠️ Key API Endpoints

- **Health Check**: `GET /api/v1/health`
- **Database Stats**: `GET /api/v1/health/db-stats`
- **Media & Reels**: `GET|POST /api/v1/media/*`
- **Puja & Services**: `GET|POST /api/v1/user/services/*`, `GET|POST /api/v1/user/onlinePuja/*`
- **Pandit Management**: `GET|POST /api/v1/pandit/*`
- **E-Commerce Products & Orders**: `GET|POST /api/v1/products/*`, `GET|POST /api/v1/orders/*`
- **Temples & Bookings**: `GET|POST /api/v1/temple/*`
- **Events**: `GET|POST /api/v1/events/*`
