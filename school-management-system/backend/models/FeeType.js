const mongoose = require("mongoose");

const feeTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Fee type name is required."],
      trim: true,
      maxlength: 100,
    },

    code: {
      type: String,
      required: [true, "Fee type code is required."],
      trim: true,
      uppercase: true,
      maxlength: 30,
    },

    defaultAmount: {
      type: Number,
      required: true,
      min: [0, "Default amount cannot be negative."],
      default: 0,
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate fee codes.
feeTypeSchema.index({ code: 1 }, { unique: true });

module.exports = mongoose.model("FeeType", feeTypeSchema);