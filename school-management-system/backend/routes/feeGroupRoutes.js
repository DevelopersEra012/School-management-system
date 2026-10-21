const express = require("express");
const mongoose = require("mongoose");
const FeeGroup = require("../models/FeeGroup");

const router = express.Router();

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeFeeTypeIds(value) {
  if (!Array.isArray(value)) return [];

  const ids = [...new Set(
    value.map((id) => String(id).trim()).filter(Boolean)
  )];

  if (ids.some((id) => !mongoose.isValidObjectId(id))) {
    throw new Error("One or more selected fee types are invalid.");
  }

  return ids;
}

function validateStatus(status) {
  return ["Active", "Inactive"].includes(status);
}

// GET: all fee groups
router.get("/", async (req, res) => {
  try {
    const groups = await FeeGroup.find()
      .populate("feeTypes", "name code defaultAmount status")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: groups.length,
      data: groups,
    });
  } catch (error) {
    console.error("Get fee groups error:", error);

    res.status(500).json({
      success: false,
      message: "Could not load fee groups.",
    });
  }
});

// POST: create a fee group
router.post("/", async (req, res) => {
  try {
    const {
      name,
      code,
      description = "",
      status = "Active",
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "Fee group name is required.",
      });
    }

    if (!code || !String(code).trim()) {
      return res.status(400).json({
        success: false,
        message: "Fee group code is required.",
      });
    }

    if (!validateStatus(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Active or Inactive.",
      });
    }

    let feeTypeIds;

    try {
      feeTypeIds = normalizeFeeTypeIds(req.body.feeTypes);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (feeTypeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select at least one fee type.",
      });
    }

    const cleanName = String(name).trim();
    const cleanCode = String(code).trim().toUpperCase();

    const duplicate = await FeeGroup.findOne({
      $or: [
        {
          name: {
            $regex: `^${escapeRegex(cleanName)}$`,
            $options: "i",
          },
        },
        { code: cleanCode },
      ],
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "A fee group with this name or code already exists.",
      });
    }

    const group = await FeeGroup.create({
      name: cleanName,
      code: cleanCode,
      description: String(description || "").trim(),
      status,
      feeTypes: feeTypeIds,
    });

    const savedGroup = await FeeGroup.findById(group._id).populate(
      "feeTypes",
      "name code defaultAmount status"
    );

    res.status(201).json({
      success: true,
      message: "Fee group created successfully.",
      data: savedGroup,
    });
  } catch (error) {
    console.error("Create fee group error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This fee group code already exists.",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Could not create fee group.",
    });
  }
});

// PUT: update a fee group
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid fee group ID.",
      });
    }

    const {
      name,
      code,
      description = "",
      status = "Active",
    } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({
        success: false,
        message: "Fee group name is required.",
      });
    }

    if (!code || !String(code).trim()) {
      return res.status(400).json({
        success: false,
        message: "Fee group code is required.",
      });
    }

    if (!validateStatus(status)) {
      return res.status(400).json({
        success: false,
        message: "Status must be Active or Inactive.",
      });
    }

    let feeTypeIds;

    try {
      feeTypeIds = normalizeFeeTypeIds(req.body.feeTypes);
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (feeTypeIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select at least one fee type.",
      });
    }

    const cleanName = String(name).trim();
    const cleanCode = String(code).trim().toUpperCase();

    const duplicate = await FeeGroup.findOne({
      _id: { $ne: id },
      $or: [
        {
          name: {
            $regex: `^${escapeRegex(cleanName)}$`,
            $options: "i",
          },
        },
        { code: cleanCode },
      ],
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: "Another fee group already uses this name or code.",
      });
    }

    const group = await FeeGroup.findByIdAndUpdate(
      id,
      {
        name: cleanName,
        code: cleanCode,
        description: String(description || "").trim(),
        status,
        feeTypes: feeTypeIds,
      },
      {
        new: true,
        runValidators: true,
      }
    ).populate("feeTypes", "name code defaultAmount status");

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Fee group not found.",
      });
    }

    res.json({
      success: true,
      message: "Fee group updated successfully.",
      data: group,
    });
  } catch (error) {
    console.error("Update fee group error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This fee group code already exists.",
      });
    }

    res.status(500).json({
      success: false,
      message: error.message || "Could not update fee group.",
    });
  }
});

// DELETE: delete a fee group
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid fee group ID.",
      });
    }

    const group = await FeeGroup.findByIdAndDelete(id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: "Fee group not found.",
      });
    }

    res.json({
      success: true,
      message: "Fee group deleted successfully.",
    });
  } catch (error) {
    console.error("Delete fee group error:", error);

    res.status(500).json({
      success: false,
      message: "Could not delete fee group.",
    });
  }
});

module.exports = router;