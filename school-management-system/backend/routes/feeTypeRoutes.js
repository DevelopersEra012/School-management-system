const express = require("express");
const mongoose = require("mongoose");
const FeeType = require("../models/FeeType");

const router = express.Router();

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getErrorMessage(error) {
  if (error.code === 11000) {
    return "This fee type name or code already exists.";
  }

  if (error.name === "ValidationError") {
    return Object.values(error.errors)
      .map((item) => item.message)
      .join(" ");
  }

  return error.message || "Something went wrong.";
}

function validateFeeType(body) {
  const name = String(body.name || "").trim();
  const code = String(body.code || "").trim().toUpperCase();
  const description = String(body.description || "").trim();
  const status = body.status || "Active";
  const defaultAmount = Number(body.defaultAmount ?? 0);

  if (!name) {
    return { error: "Please enter a fee type name." };
  }

  if (!code) {
    return { error: "Please enter a fee type code." };
  }

  if (!Number.isFinite(defaultAmount) || defaultAmount < 0) {
    return { error: "Default amount must be zero or greater." };
  }

  if (!["Active", "Inactive"].includes(status)) {
    return { error: "Invalid fee type status." };
  }

  return {
    data: {
      name,
      code,
      description,
      defaultAmount,
      status,
    },
  };
}

// GET: fetch all fee types
router.get("/", async (req, res) => {
  try {
    const feeTypes = await FeeType.find().sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      count: feeTypes.length,
      data: feeTypes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
});

// POST: create a new fee type
router.post("/", async (req, res) => {
  try {
    const validation = validateFeeType(req.body);

    if (validation.error) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const data = validation.data;

    const duplicateName = await FeeType.findOne({
      name: {
        $regex: `^${escapeRegex(data.name)}$`,
        $options: "i",
      },
    });

    if (duplicateName) {
      return res.status(409).json({
        success: false,
        message: "A fee type with this name already exists.",
      });
    }

    const duplicateCode = await FeeType.findOne({
      code: data.code,
    });

    if (duplicateCode) {
      return res.status(409).json({
        success: false,
        message: "This fee code is already in use.",
      });
    }

    const feeType = await FeeType.create(data);

    return res.status(201).json({
      success: true,
      message: "Fee type created successfully.",
      data: feeType,
    });
  } catch (error) {
    const statusCode = error.code === 11000 ? 409 : 500;

    res.status(statusCode).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
});

// PUT: update an existing fee type
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid fee type ID.",
      });
    }

    const validation = validateFeeType(req.body);

    if (validation.error) {
      return res.status(400).json({
        success: false,
        message: validation.error,
      });
    }

    const data = validation.data;

    const existing = await FeeType.findById(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Fee type not found.",
      });
    }

    const duplicateName = await FeeType.findOne({
      _id: { $ne: id },
      name: {
        $regex: `^${escapeRegex(data.name)}$`,
        $options: "i",
      },
    });

    if (duplicateName) {
      return res.status(409).json({
        success: false,
        message: "Another fee type already uses this name.",
      });
    }

    const duplicateCode = await FeeType.findOne({
      _id: { $ne: id },
      code: data.code,
    });

    if (duplicateCode) {
      return res.status(409).json({
        success: false,
        message: "Another fee type already uses this code.",
      });
    }

    const updatedFeeType = await FeeType.findByIdAndUpdate(
      id,
      data,
      {
        new: true,
        runValidators: true,
      }
    );

    return res.json({
      success: true,
      message: "Fee type updated successfully.",
      data: updatedFeeType,
    });
  } catch (error) {
    const statusCode = error.code === 11000 ? 409 : 500;

    res.status(statusCode).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
});

// DELETE: remove a fee type
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid fee type ID.",
      });
    }

    const deletedFeeType = await FeeType.findByIdAndDelete(id);

    if (!deletedFeeType) {
      return res.status(404).json({
        success: false,
        message: "Fee type not found.",
      });
    }

    return res.json({
      success: true,
      message: "Fee type deleted successfully.",
      data: deletedFeeType,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: getErrorMessage(error),
    });
  }
});

module.exports = router;