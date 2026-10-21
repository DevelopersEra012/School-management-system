
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Teacher = require("../models/Teacher");

const router = express.Router();

// ==========================================
// 1. CREATE UPLOADS FOLDER
// ==========================================

const uploadDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ==========================================
// 2. PHOTO UPLOAD CONFIGURATION
// ==========================================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    const uniqueName =
      "teacher-" +
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      ext;

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Maximum 5 MB
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error("Only JPG, PNG, WEBP and GIF images are allowed.")
      );
    }
  },
});

// ==========================================
// 3. HELPER: DELETE PHOTO FILE
// ==========================================

function removePhoto(photo) {
  if (!photo || !photo.startsWith("/uploads/")) {
    return;
  }

  const filename = path.basename(photo);
  const filePath = path.join(uploadDir, filename);

  if (fs.existsSync(filePath)) {
    fs.unlink(filePath, (error) => {
      if (error) {
        console.error("Unable to remove teacher photo:", error.message);
      }
    });
  }
}

// ==========================================
// 4. HELPER: PARSE ARRAY FIELDS
// ==========================================

function parseArray(value, fallback = []) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (Array.isArray(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      throw new Error("Expected an array.");
    }

    return parsed;
  } catch {
    throw new Error(
      "Subjects and assigned classes must be valid JSON arrays."
    );
  }
}

// ==========================================
// 5. GET ALL TEACHERS
// GET /api/teachers
// ==========================================

router.get("/", async (req, res) => {
  try {
    const teachers = await Teacher.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: teachers.length,
      data: teachers,
    });
  } catch (error) {
    console.error("Get teachers error:", error);

    res.status(500).json({
      success: false,
      message: "Unable to fetch teachers.",
    });
  }
});

// ==========================================
// 6. GET SINGLE TEACHER
// GET /api/teachers/:id
// ==========================================

router.get("/:id", async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found.",
      });
    }

    res.status(200).json({
      success: true,
      data: teacher,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Invalid teacher ID or request.",
    });
  }
});

// ==========================================
// 7. ADD NEW TEACHER
// POST /api/teachers
// ==========================================

router.post("/", (req, res, next) => {
  upload.single("photo")(req, res, (uploadError) => {
    if (uploadError) {
      return res.status(400).json({
        success: false,
        message: uploadError.message,
      });
    }

    next();
  });
}, async (req, res) => {
  try {
    const body = req.body;

    const teacherData = {
      employeeId: body.employeeId,
      firstName: body.firstName,
      lastName: body.lastName || "",
      email: body.email || "",
      phone: body.phone || "",

      // Personal information
      gender: body.gender || "",
      dateOfBirth: body.dateOfBirth || null,

      // Employment information
      department: body.department || "",
      designation: body.designation || "Teacher",
      qualification: body.qualification || "",
      joiningDate: body.joiningDate || null,
      status: body.status || "Active",
      address: body.address || "",

      // Arrays
      subjects: parseArray(body.subjects),
      assignedClasses: parseArray(body.assignedClasses),

      // Uploaded photo path
      photo: req.file
        ? `/uploads/${req.file.filename}`
        : body.photo || "",
    };

    const teacher = await Teacher.create(teacherData);

    return res.status(201).json({
      success: true,
      message: "Teacher added successfully!",
      data: teacher,
    });
  } catch (error) {
    if (req.file) {
      removePhoto(`/uploads/${req.file.filename}`);
    }

    console.error("Add teacher error:", error);

    return res.status(400).json({
      success: false,
      message:
        error.code === 11000
          ? "This Employee ID already exists."
          : error.message,
    });
  }
});

// ==========================================
// 8. UPDATE TEACHER
// PUT /api/teachers/:id
// ==========================================

router.put("/:id", (req, res, next) => {
  upload.single("photo")(req, res, (uploadError) => {
    if (uploadError) {
      return res.status(400).json({
        success: false,
        message: uploadError.message,
      });
    }

    next();
  });
}, async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);

    if (!teacher) {
      if (req.file) {
        removePhoto(`/uploads/${req.file.filename}`);
      }

      return res.status(404).json({
        success: false,
        message: "Teacher not found.",
      });
    }

    const body = req.body;

    const updates = {
      employeeId: body.employeeId ?? teacher.employeeId,
      firstName: body.firstName ?? teacher.firstName,
      lastName: body.lastName ?? teacher.lastName,
      email: body.email ?? teacher.email,
      phone: body.phone ?? teacher.phone,

      // Personal information
      gender: body.gender ?? teacher.gender,
      dateOfBirth:
        body.dateOfBirth === ""
          ? null
          : body.dateOfBirth ?? teacher.dateOfBirth,

      // Employment information
      department: body.department ?? teacher.department,
      designation: body.designation ?? teacher.designation,
      qualification: body.qualification ?? teacher.qualification,
      joiningDate:
        body.joiningDate === ""
          ? null
          : body.joiningDate ?? teacher.joiningDate,
      status: body.status ?? teacher.status,
      address: body.address ?? teacher.address,
    };

    // Update array fields only when provided
    if (body.subjects !== undefined) {
      updates.subjects = parseArray(body.subjects);
    }

    if (body.assignedClasses !== undefined) {
      updates.assignedClasses = parseArray(body.assignedClasses);
    }

    // Replace photo only when a new photo is uploaded
    if (req.file) {
      updates.photo = `/uploads/${req.file.filename}`;
    } else if (body.photo !== undefined) {
      updates.photo = body.photo;
    }

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      updates,
      {
        new: true,
        runValidators: true,
      }
    );

    // Remove old uploaded photo after successful replacement
    if (
      req.file &&
      teacher.photo &&
      teacher.photo !== updatedTeacher.photo
    ) {
      removePhoto(teacher.photo);
    }

    return res.status(200).json({
      success: true,
      message: "Teacher updated successfully!",
      data: updatedTeacher,
    });
  } catch (error) {
    if (req.file) {
      removePhoto(`/uploads/${req.file.filename}`);
    }

    console.error("Update teacher error:", error);

    return res.status(400).json({
      success: false,
      message:
        error.code === 11000
          ? "This Employee ID already exists."
          : error.message,
    });
  }
});

// ==========================================
// 9. DELETE TEACHER
// DELETE /api/teachers/:id
// ==========================================

router.delete("/:id", async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: "Teacher not found.",
      });
    }

    // Remove the uploaded photo from the uploads folder
    removePhoto(teacher.photo);

    return res.status(200).json({
      success: true,
      message: "Teacher deleted successfully!",
    });
  } catch (error) {
    console.error("Delete teacher error:", error);

    return res.status(400).json({
      success: false,
      message: "Unable to delete teacher.",
    });
  }
});

module.exports = router;
