
const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

function getAssignmentBalance(assignment) {
  return Math.max(
    0,
    Number(
      assignment.balanceDue ??
        assignment.remaining ??
        assignment.amount ??
        assignment.totalAmount ??
        0
    ) || 0
  );
}

function getAssignmentPaid(assignment) {
  return Math.max(0, Number(assignment.paidAmount || 0) || 0);
}

function getStudentName(student) {
  return (
    [
      student.firstName,
      student.middleName,
      student.lastName,
    ]
      .filter(Boolean)
      .join(" ") ||
    student.name ||
    "Unnamed Student"
  );
}

function validPaymentDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Roll back assignment balances if saving a combined payment fails.
async function rollbackAssignmentUpdates(db, appliedUpdates) {
  for (const item of [...appliedUpdates].reverse()) {
    await db.collection("feeAssignments").updateOne(
      {
        _id: item._id,
        balanceDue: item.newBalance,
        paidAmount: item.newPaid,
      },
      {
        $set: {
          balanceDue: item.oldBalance,
          remaining: item.oldRemaining,
          paidAmount: item.oldPaid,
          status: item.oldStatus,
          updatedAt: item.oldUpdatedAt,
        },
      }
    );
  }

  appliedUpdates.length = 0;
}

// GET: All saved payment records
router.get("/", async (req, res) => {
  try {
    const db = mongoose.connection.db;

    if (!db) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected.",
      });
    }

    const fees = await db
      .collection("fees")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return res.json(fees);
  } catch (error) {
    console.error("Error fetching payments:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch payment records.",
    });
  }
});

// POST: Legacy single fee payment endpoint.
// Kept so older frontend requests are not abruptly broken.
router.post("/", async (req, res) => {
  try {
    const db = mongoose.connection.db;

    if (!db) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected.",
      });
    }

    const {
      studentId,
      feeType,
      totalDue,
      amountPaid,
      paymentMethod,
      paymentDate,
      reference,
    } = req.body;

    if (!studentId || !feeType || !paymentMethod || !paymentDate) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required payment details.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID.",
      });
    }

    const totalAmount = Number(totalDue);
    const paidAmount = Number(amountPaid);
    const parsedDate = validPaymentDate(paymentDate);

    if (
      !Number.isFinite(totalAmount) ||
      !Number.isFinite(paidAmount) ||
      totalAmount <= 0 ||
      paidAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Fee and payment amounts must be greater than zero.",
      });
    }

    if (paidAmount > totalAmount) {
      return res.status(400).json({
        success: false,
        message: "Payment cannot exceed the total fee amount.",
      });
    }

    if (!parsedDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment date.",
      });
    }

    const student = await db.collection("students").findOne({
      _id: new mongoose.Types.ObjectId(studentId),
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    const remaining = roundMoney(totalAmount - paidAmount);
    const now = new Date();
    const name = getStudentName(student);

    const record = {
      recordType: "payment",
      studentId: student._id,
      student: {
        _id: student._id,
        name,
        studentPhoto: student.studentPhoto || "",
      },
      studentName: name,
      admissionNumber: student.admissionNumber || "",
      className: student.className || "",
      feeType: feeType.trim(),
      totalAmount,
      totalDue: totalAmount,
      amount: totalAmount,
      paidAmount,
      amountPaid: paidAmount,
      balanceDue: remaining,
      remaining,
      paymentMethod,
      paymentDate: parsedDate,
      reference: reference || "",
      receiptNumber: `FEE-${Date.now()}`,
      status: remaining === 0 ? "Paid" : "Partially Paid",
      createdAt: now,
      updatedAt: now,
    };

    const inserted = await db.collection("fees").insertOne(record);

    return res.status(201).json({
      success: true,
      message: "Payment saved successfully.",
      data: {
        ...record,
        _id: inserted.insertedId,
      },
    });
  } catch (error) {
    console.error("Error saving payment:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to save payment.",
    });
  }
});

// POST: Collect one payment and distribute it among selected assignments.
router.post("/collect", async (req, res) => {
  const appliedUpdates = [];

  try {
    const db = mongoose.connection.db;

    if (!db) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected.",
      });
    }

    const {
      studentId,
      allocations,
      paymentMethod,
      paymentDate,
      reference,
    } = req.body;

    if (
      !studentId ||
      !paymentMethod ||
      !paymentDate ||
      !Array.isArray(allocations) ||
      allocations.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Student, selected fees, payment method and date are required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid student ID.",
      });
    }

    const parsedDate = validPaymentDate(paymentDate);

    if (!parsedDate) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment date.",
      });
    }

    const studentObjectId =
      new mongoose.Types.ObjectId(studentId);

    const student = await db.collection("students").findOne({
      _id: studentObjectId,
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found.",
      });
    }

    const seenIds = new Set();
    const validated = [];

    for (const item of allocations) {
      if (
        !item.assignmentId ||
        !mongoose.Types.ObjectId.isValid(item.assignmentId)
      ) {
        return res.status(400).json({
          success: false,
          message: "An assignment ID is invalid.",
        });
      }

      const assignmentId = String(item.assignmentId);

      if (seenIds.has(assignmentId)) {
        return res.status(400).json({
          success: false,
          message: "An assignment was included more than once.",
        });
      }

      seenIds.add(assignmentId);

      const assignment = await db
        .collection("feeAssignments")
        .findOne({
          _id: new mongoose.Types.ObjectId(assignmentId),
          studentId: studentObjectId,
        });

      if (!assignment) {
        return res.status(404).json({
          success: false,
          message: "One of the selected assignments was not found for this student.",
        });
      }

      const balanceBefore = getAssignmentBalance(assignment);
      const paidBefore = getAssignmentPaid(assignment);
      const amountToAllocate = Number(item.amountPaid);

      if (
        !Number.isFinite(amountToAllocate) ||
        amountToAllocate < 0
      ) {
        return res.status(400).json({
          success: false,
          message: "An allocated payment amount is invalid.",
        });
      }

      if (amountToAllocate > balanceBefore) {
        return res.status(400).json({
          success: false,
          message: `Payment exceeds the remaining balance for ${assignment.feeType}. Please refresh and try again.`,
        });
      }

      if (balanceBefore <= 0 && amountToAllocate > 0) {
        return res.status(409).json({
          success: false,
          message: "One of the selected fees has already been paid.",
        });
      }

      validated.push({
        assignment,
        balanceBefore,
        paidBefore,
        amountToAllocate: roundMoney(amountToAllocate),
      });
    }

    const amountReceived = roundMoney(
      validated.reduce(
        (sum, item) => sum + item.amountToAllocate,
        0
      )
    );

    const selectedOutstanding = roundMoney(
      validated.reduce(
        (sum, item) => sum + item.balanceBefore,
        0
      )
    );

    if (amountReceived <= 0) {
      return res.status(400).json({
        success: false,
        message: "Enter an amount greater than zero.",
      });
    }

    if (amountReceived > selectedOutstanding) {
      return res.status(400).json({
        success: false,
        message: "Received amount exceeds the selected outstanding fees.",
      });
    }

    const assignmentCollection = db.collection("feeAssignments");
    const breakdown = [];

    // Update only assignments that receive a positive allocation.
    for (const item of validated) {
      const {
        assignment,
        balanceBefore,
        paidBefore,
        amountToAllocate,
      } = item;

      const balanceAfter = roundMoney(
        balanceBefore - amountToAllocate
      );

      const paidAfter = roundMoney(
        paidBefore + amountToAllocate
      );

      if (amountToAllocate > 0) {
        const updateResult = await assignmentCollection.updateOne(
          {
            _id: assignment._id,
            balanceDue: balanceBefore,
            paidAmount: paidBefore,
          },
          {
            $set: {
              paidAmount: paidAfter,
              balanceDue: balanceAfter,
              remaining: balanceAfter,
              status:
                balanceAfter <= 0
                  ? "Paid"
                  : paidAfter > 0
                    ? "Partially Paid"
                    : "Pending",
              updatedAt: new Date(),
            },
          }
        );

        if (updateResult.matchedCount !== 1) {
          await rollbackAssignmentUpdates(db, appliedUpdates);

          return res.status(409).json({
            success: false,
            message: "An assignment changed while the payment was being processed. Refresh and try again.",
          });
        }

        appliedUpdates.push({
          _id: assignment._id,
          oldBalance: balanceBefore,
          newBalance: balanceAfter,
          oldRemaining: assignment.remaining ?? balanceBefore,
          oldPaid: paidBefore,
          newPaid: paidAfter,
          oldStatus: assignment.status || "Pending",
          oldUpdatedAt: assignment.updatedAt || assignment.createdAt || new Date(),
        });
      }

      breakdown.push({
        assignmentId: assignment._id,
        feeType: assignment.feeType,
        feePeriod: assignment.feePeriod,
        dueDate: assignment.dueDate,
        assignedAmount: Number(
          assignment.amount ?? assignment.totalAmount ?? 0
        ),
        balanceBefore,
        amountPaid: amountToAllocate,
        remainingAfter: balanceAfter,
      });
    }

    const remainingAfterPayment = roundMoney(
      selectedOutstanding - amountReceived
    );

    const assignedTotal = roundMoney(
      validated.reduce(
        (sum, item) =>
          sum +
          Number(
            item.assignment.amount ??
              item.assignment.totalAmount ??
              0
          ),
        0
      )
    );

    const feeTypes = [
      ...new Set(validated.map((item) => item.assignment.feeType)),
    ];

    const periods = [
      ...new Set(validated.map((item) => item.assignment.feePeriod)),
    ];

    const now = new Date();
    const name = getStudentName(student);

    const paymentRecord = {
      recordType: "payment",
      studentId: student._id,
      student: {
        _id: student._id,
        name,
        studentPhoto: student.studentPhoto || "",
      },
      studentName: name,
      admissionNumber: student.admissionNumber || "",
      className: student.className || "",

      feeType:
        feeTypes.length === 1 ? feeTypes[0] : "Multiple Fees",

      feePeriod:
        periods.length === 1 ? periods[0] : "Multiple Periods",

      // Total originally assigned across the selected assignments.
      totalAmount: assignedTotal,
      amount: assignedTotal,

      // Outstanding amount before this collection.
      totalDue: selectedOutstanding,

      // The payment amount received in this transaction.
      paidAmount: amountReceived,
      amountPaid: amountReceived,
      paymentAmount: amountReceived,

      balanceDue: remainingAfterPayment,
      remaining: remainingAfterPayment,

      allocations: breakdown,
      assignmentIds: breakdown.map((item) => item.assignmentId),

      paymentMethod,
      paymentDate: parsedDate,
      reference: String(reference || "").trim(),
      receiptNumber: `FEE-${Date.now()}-${Math.floor(Math.random() * 1000)}`,

      status:
        remainingAfterPayment <= 0
          ? "Paid"
          : "Partially Paid",

      createdAt: now,
      updatedAt: now,
    };

    try {
      const inserted = await db
        .collection("fees")
        .insertOne(paymentRecord);

      appliedUpdates.length = 0;

      return res.status(201).json({
        success: true,
        message: "Payment saved and assigned fee balances updated.",
        data: {
          ...paymentRecord,
          _id: inserted.insertedId,
        },
      });
    } catch (insertError) {
      await rollbackAssignmentUpdates(db, appliedUpdates);
      throw insertError;
    }
  } catch (error) {
    if (appliedUpdates.length > 0) {
      try {
        await rollbackAssignmentUpdates(
          mongoose.connection.db,
          appliedUpdates
        );
      } catch (rollbackError) {
        console.error("Payment rollback failed:", rollbackError);
      }
    }

    console.error("Error collecting payment:", error);

    return res.status(500).json({
      success: false,
      message: "Payment could not be completed.",
    });
  }
});

// GET: All saved fee assignments
router.get("/assignments", async (req, res) => {
  try {
    const db = mongoose.connection.db;

    if (!db) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected.",
      });
    }

    const assignments = await db
      .collection("feeAssignments")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return res.json({
      success: true,
      count: assignments.length,
      data: assignments,
    });
  } catch (error) {
    console.error("Error fetching assignments:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch fee assignments.",
    });
  }
});

// POST: Assign fees to one student, a class/section or all students
router.post("/assignments", async (req, res) => {
  try {
    const db = mongoose.connection.db;

    if (!db) {
      return res.status(503).json({
        success: false,
        message: "Database is not connected.",
      });
    }

    const {
      scope = "individual",
      studentId,
      className,
      section,
      feeType,
      amount,
      feePeriod,
      dueDate,
      description,
    } = req.body;

    if (
      !["individual", "class", "all"].includes(scope) ||
      !feeType?.trim() ||
      !feePeriod ||
      !dueDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid assignment scope, fee type, period and due date.",
      });
    }

    const assignedAmount = Number(amount);

    if (
      !Number.isFinite(assignedAmount) ||
      assignedAmount <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Enter a fee amount greater than zero.",
      });
    }

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(feePeriod)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid fee period.",
      });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid due date.",
      });
    }

    const parsedDueDate = new Date(`${dueDate}T00:00:00.000Z`);

    if (
      Number.isNaN(parsedDueDate.getTime()) ||
      parsedDueDate.toISOString().slice(0, 10) !== dueDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid due date.",
      });
    }

    const studentsCollection = db.collection("students");
    let targetStudents = [];

    if (scope === "individual") {
      if (!studentId || !mongoose.Types.ObjectId.isValid(studentId)) {
        return res.status(400).json({
          success: false,
          message: "Please select a valid student.",
        });
      }

      const student = await studentsCollection.findOne({
        _id: new mongoose.Types.ObjectId(studentId),
      });

      if (student) targetStudents = [student];
    }

    if (scope === "class") {
      if (!className?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Please select a class.",
        });
      }

      const query = { className: className.trim() };

      if (section && section !== "All Sections") {
        query.section = section;
      }

      targetStudents = await studentsCollection
        .find(query)
        .toArray();
    }

    if (scope === "all") {
      targetStudents = await studentsCollection
        .find({})
        .toArray();
    }

    if (targetStudents.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No matching students were found.",
      });
    }

    const assignmentsCollection = db.collection("feeAssignments");
    const created = [];
    let skippedCount = 0;

    for (const student of targetStudents) {
      const duplicate = await assignmentsCollection.findOne({
        studentId: student._id,
        feeType: feeType.trim(),
        feePeriod,
      });

      if (duplicate) {
        skippedCount += 1;
        continue;
      }

      const name = getStudentName(student);
      const now = new Date();

      const assignment = {
        recordType: "assignment",
        studentId: student._id,
        student: {
          _id: student._id,
          name,
          studentPhoto: student.studentPhoto || "",
        },
        studentName: name,
        admissionNumber: student.admissionNumber || "",
        rollNumber: student.rollNumber || "",
        className: student.className || "",
        section: student.section || "",

        feeType: feeType.trim(),
        feePeriod,
        description: String(description || "").trim(),

        amount: assignedAmount,
        totalAmount: assignedAmount,
        paidAmount: 0,
        balanceDue: assignedAmount,
        remaining: assignedAmount,

        dueDate: parsedDueDate,
        status: "Pending",
        createdAt: now,
        updatedAt: now,
      };

      const inserted = await assignmentsCollection.insertOne(assignment);

      created.push({
        ...assignment,
        _id: inserted.insertedId,
      });
    }

    const message =
      created.length > 0
        ? `Fee assigned to ${created.length} student(s). ${skippedCount} duplicate assignment(s) skipped.`
        : `No new assignments created. ${skippedCount} matching assignment(s) already exist for this period.`;

    return res.status(created.length > 0 ? 201 : 200).json({
      success: true,
      message,
      count: created.length,
      skippedCount,
      data: created,
    });
  } catch (error) {
    console.error("Error assigning fees:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to assign fees.",
    });
  }
});

module.exports = router;
