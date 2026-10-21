
const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    attendanceDate: {
      type: String,
      required: true,
    },
    className: {
      type: String,
      required: true,
    },
    section: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["Present", "Absent", "Late", "Leave"],
      required: true,
      default: "Present",
    },
    remarks: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

attendanceSchema.index(
  { studentId: 1, attendanceDate: 1 },
  { unique: true }
);

module.exports = mongoose.model("Attendance", attendanceSchema);
