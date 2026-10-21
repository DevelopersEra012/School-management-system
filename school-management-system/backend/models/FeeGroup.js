const mongoose = require("mongoose");

const feeGroupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Fee group name is required."],
      trim: true,
      maxlength: 100,
    },

    code: {
      type: String,
      required: [true, "Fee group code is required."],
      trim: true,
      uppercase: true,
      maxlength: 30,
    },

    description: {
      type: String,
      trim: true,
      default: "",
      maxlength: 500,
    },

    feeTypes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "FeeType",
      },
    ],

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

feeGroupSchema.index({ code: 1 }, { unique: true });

module.exports = mongoose.model("FeeGroup", feeGroupSchema);