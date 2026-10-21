
const express = require("express");
const router = express.Router();
const Student = require("../models/Student");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const uploadDir = path.join(
  process.cwd(),
  "uploads",
  "students"
);

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const allowedExtensions = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".pdf",
]);

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 4 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isPhoto = ["studentPhoto", "fatherPhoto", "motherPhoto"]
      .includes(file.fieldname);

    if (!allowedExtensions.has(ext)) {
      return cb(new Error("Only JPG, PNG, WEBP and PDF files are allowed."));
    }

    if (isPhoto && ext === ".pdf") {
      return cb(new Error("Photo fields must contain image files."));
    }

    cb(null, true);
  },
});

const admissionUploads = upload.fields([
  { name: "studentPhoto", maxCount: 1 },
  { name: "birthCertificate", maxCount: 1 },
  { name: "fatherPhoto", maxCount: 1 },
  { name: "motherPhoto", maxCount: 1 },
]);

function filePath(req, fieldName) {
  const file = req.files?.[fieldName]?.[0];
  return file ? `/uploads/students/${file.filename}` : "";
}

// Create student: JSON fields + uploaded files
router.post("/", (req, res) => {
  admissionUploads(req, res, async (uploadError) => {
    if (uploadError) {
      return res.status(400).json({
        success: false,
        message: uploadError.message,
      });
    }

    let payload;

    try {
      payload = JSON.parse(req.body.studentData || "{}");

      payload.studentPhoto = filePath(req, "studentPhoto");
      payload.birthCertificate = filePath(req, "birthCertificate");

      payload.father = {
        ...(payload.father || {}),
        photo: filePath(req, "fatherPhoto"),
      };

      payload.mother = {
        ...(payload.mother || {}),
        photo: filePath(req, "motherPhoto"),
      };

      const student = await Student.create(payload);

      return res.status(201).json({
        success: true,
        message: "Student admitted successfully!",
        data: student,
      });
    } catch (error) {
      // Remove files if database creation fails.
      for (const list of Object.values(req.files || {})) {
        for (const file of list) {
          fs.promises.unlink(file.path).catch(() => {});
        }
      }

      return res.status(400).json({
        success: false,
        message: error.message || "Student could not be created.",
      });
    }
  });
});

// Get all students
router.get("/", async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch students.",
    });
  }
});

// Update student (JSON fields)
router.put("/:id", async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    res.json({ success: true, data: student });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

// Delete student record
router.delete("/:id", async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    res.json({
      success: true,
      message: "Student deleted successfully.",
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
