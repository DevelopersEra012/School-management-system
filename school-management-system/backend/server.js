
const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const feeTypeRoutes = require("./routes/feeTypeRoutes");
const feeGroupRoutes = require("./routes/feeGroupRoutes");
const attendanceRoutes = require("./routes/attendanceRoutes");
const teacherRoutes = require("./routes/teacherRoutes");

require("dotenv").config();

const fs = require("fs");


const studentRoutes = require("./routes/studentRoutes");
const feeRoutes = require("./routes/feeRoutes");

const app = express();

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

app.use("/uploads", express.static(uploadDir));

const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());


// Serve uploaded documents and photos
app.use(
  "/uploads",
  express.static(path.join(process.cwd(), "uploads"))
);

// API routes
app.use("/api/students", studentRoutes);
app.use("/api/fees", feeRoutes);
app.use("/api/fee-types", feeTypeRoutes);
app.use("/api/fee-groups", feeGroupRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/teachers", teacherRoutes);


app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/api/teachers", teacherRoutes);



// Test route
app.get("/", (req, res) => {
  res.send("School Management System API is running!");
});

// Health-check API
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Backend is working successfully!",
  });
});

// Connect to MongoDB, then start server
async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error(
        "MONGODB_URI is missing from the backend .env file"
      );
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected successfully!");

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
}

startServer();
