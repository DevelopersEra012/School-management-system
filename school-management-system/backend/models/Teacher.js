
const mongoose = require("mongoose");

const teacherSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      default: "",
      trim: true,
    },
    email: {
      type: String,
      default: "",
      trim: true,
    },
    phone: {
      type: String,
      default: "",
    },
    photo: {
      type: String,
      default: "",
    },
    subjects: {
      type: [String],
      default: [],
    },
    assignedClasses: {
      type: [String],
      default: [],
    },
    department: {
      type: String,
      default: "",
    },
    designation: {
      type: String,
      default: "Teacher",
    },
    qualification: {
      type: String,
      default: "",
    },
    joiningDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    address: {
      type: String,
      default: "",
    },

      gender: {
  type: String,
  default: "",
},
dateOfBirth: {
  type: Date,
  default: null,
},

  },
  { timestamps: true }




);



module.exports = mongoose.model("Teacher", teacherSchema);
