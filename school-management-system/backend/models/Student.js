
const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    admissionNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    rollNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    admissionDate: { type: Date, required: true },
    className: { type: String, required: true, trim: true },
    section: { type: String, required: true, trim: true },
    biometricId: { type: String, default: "" },

    firstName: { type: String, required: true, trim: true },
    middleName: { type: String, default: "", trim: true },
    lastName: { type: String, required: true, trim: true },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: true,
    },
    dateOfBirth: { type: Date, required: true },
    bloodGroup: { type: String, default: "" },
    religion: { type: String, default: "" },
    caste: { type: String, default: "" },
    motherTongue: { type: String, default: "" },
    placeOfBirth: { type: String, default: "" },
    nationality: { type: String, default: "Pakistani" },
    studentPhone: { type: String, default: "" },
    studentEmail: { type: String, default: "", lowercase: true, trim: true },

    studentPhoto: { type: String, default: "" },
    birthCertificate: { type: String, default: "" },

    father: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      occupation: { type: String, default: "" },
      qualification: { type: String, default: "" },
      cnic: { type: String, default: "" },
      photo: { type: String, default: "" },
    },

    mother: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      occupation: { type: String, default: "" },
      qualification: { type: String, default: "" },
      cnic: { type: String, default: "" },
      photo: { type: String, default: "" },
    },

    emergencyContact: {
      name: { type: String, default: "" },
      phone: { type: String, default: "" },
      relationship: { type: String, default: "" },
      email: { type: String, default: "", lowercase: true, trim: true },
      occupation: { type: String, default: "" },
    },

    parentLoginEmail: {
      type: String,
      default: "",
      lowercase: true,
      trim: true,
    },
    guardianAddress: { type: String, default: "" },
    currentAddress: { type: String, default: "" },
    permanentAddress: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Student", studentSchema);
