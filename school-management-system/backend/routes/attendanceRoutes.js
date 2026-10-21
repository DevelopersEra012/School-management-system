
const express = require("express");
const mongoose = require("mongoose");
const Attendance = require("../models/Attendance");
const Student = require("../models/Student");

const router = express.Router();

const VALID_STATUSES = ["Present", "Absent", "Late", "Leave"];

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

// Get available classes and sections
router.get("/options", async (req, res) => {
  try {
    const students = await Student.find({})
      .select("className section")
      .lean();

    const classes = [
      ...new Set(
        students.map((s) => s.className).filter(Boolean)
      ),
    ].sort();

    const sections = [
      ...new Set(
        students.map((s) => s.section).filter(Boolean)
      ),
    ].sort();

    res.json({ success: true, classes, sections });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not load classes and sections.",
    });
  }
});

// Get students for attendance
router.get("/students", async (req, res) => {
  try {
    const { className, section, search } = req.query;
    const filter = {};

    if (className) filter.className = className;
    if (section) filter.section = section;

    if (search && search.trim()) {
      const escaped = search.trim().replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );
      const regex = new RegExp(escaped, "i");

      filter.$or = [
        { firstName: regex },
        { middleName: regex },
        { lastName: regex },
        { rollNumber: regex },
        { admissionNumber: regex },
      ];
    }

    const students = await Student.find(filter)
      .select(
        "firstName middleName lastName rollNumber admissionNumber className section studentPhoto"
      )
      .sort({ rollNumber: 1 })
      .lean();

    res.json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not load students.",
    });
  }
});

// Get attendance for a selected date
router.get("/", async (req, res) => {
  try {
    const { date, className, section } = req.query;

    if (!isValidDate(date)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid date in YYYY-MM-DD format.",
      });
    }

    const filter = { attendanceDate: date };
    if (className) filter.className = className;
    if (section) filter.section = section;

    const records = await Attendance.find(filter)
      .populate(
        "studentId",
        "firstName middleName lastName rollNumber admissionNumber"
      )
      .lean();

    res.json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Could not load attendance.",
    });
  }
});

// Save attendance for multiple students
router.post("/bulk", async (req, res) => {
  try {
    const { attendanceDate, records } = req.body;

    if (!isValidDate(attendanceDate)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid attendance date.",
      });
    }

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No attendance records were provided.",
      });
    }

    if (records.length > 1000) {
      return res.status(400).json({
        success: false,
        message: "Please submit fewer records at a time.",
      });
    }

    const studentIds = records.map((r) => String(r.studentId || ""));

    if (
      studentIds.some((id) => !mongoose.isValidObjectId(id)) ||
      new Set(studentIds).size !== studentIds.length
    ) {
      return res.status(400).json({
        success: false,
        message: "Student IDs are invalid or duplicated.",
      });
    }

    if (
      records.some(
        (r) => !VALID_STATUSES.includes(r.status)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "One or more attendance statuses are invalid.",
      });
    }

    const students = await Student.find({
      _id: { $in: studentIds },
    })
      .select("_id className section")
      .lean();

    const studentMap = new Map(
      students.map((s) => [String(s._id), s])
    );

    if (students.length !== records.length) {
      return res.status(400).json({
        success: false,
        message: "One or more students could not be found.",
      });
    }

    const operations = records.map((record) => {
      const student = studentMap.get(String(record.studentId));

      return {
        updateOne: {
          filter: {
            studentId: student._id,
            attendanceDate,
          },
          update: {
            $set: {
              className: student.className || "",
              section: student.section || "",
              status: record.status,
              remarks: String(record.remarks || "").trim(),
            },
          },
          upsert: true,
        },
      };
    });

    await Attendance.bulkWrite(operations);

    res.json({
      success: true,
      message: "Attendance saved successfully!",
    });
  } catch (error) {
    console.error("Attendance save error:", error);

    res.status(500).json({
      success: false,
      message: "Could not save attendance.",
    });
  }
});

// Student-wise report for a selected class and date range
router.get("/report", async (req, res) => {
  try {
    const { className, section, startDate, endDate } = req.query;

    if (
      !className ||
      !isValidDate(startDate) ||
      !isValidDate(endDate) ||
      startDate > endDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Please select a class and valid date range.",
      });
    }

    const studentFilter = { className };
    if (section) studentFilter.section = section;

    const students = await Student.find(studentFilter)
      .select(
        "firstName middleName lastName rollNumber admissionNumber className section"
      )
      .sort({ rollNumber: 1 })
      .lean();

    const attendanceRecords = await Attendance.find({
      className,
      ...(section ? { section } : {}),
      attendanceDate: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .sort({ attendanceDate: 1 })
      .lean();

    const byStudent = new Map();

    for (const record of attendanceRecords) {
      const id = String(record.studentId);

      if (!byStudent.has(id)) {
        byStudent.set(id, []);
      }

      byStudent.get(id).push(record);
    }

    const data = students.map((student) => {
      const history = byStudent.get(String(student._id)) || [];

      const totals = {
        Present: 0,
        Absent: 0,
        Late: 0,
        Leave: 0,
      };

      for (const record of history) {
        if (Object.prototype.hasOwnProperty.call(totals, record.status)) {
          totals[record.status] += 1;
        }
      }

      const countedDays =
        totals.Present + totals.Absent + totals.Late;

      const percentage = countedDays
        ? Math.round(
            ((totals.Present + totals.Late) / countedDays) * 100
          )
        : 0;

      return {
        ...student,
        totals,
        percentage,
        history: history.map((record) => ({
          attendanceDate: record.attendanceDate,
          status: record.status,
          remarks: record.remarks || "",
        })),
      };
    });

    const classTotals = data.reduce(
      (totals, student) => {
        totals.Present += student.totals.Present;
        totals.Absent += student.totals.Absent;
        totals.Late += student.totals.Late;
        totals.Leave += student.totals.Leave;
        return totals;
      },
      { Present: 0, Absent: 0, Late: 0, Leave: 0 }
    );

    res.json({
      success: true,
      totalStudents: students.length,
      classTotals,
      data,
    });
  } catch (error) {
    console.error("Attendance report error:", error);

    res.status(500).json({
      success: false,
      message: "Could not generate attendance report.",
    });
  }
});

module.exports = router;
