const express = require("express");
const Employee = require("./employee");
const Department = require("./department");

const router = express.Router();

// Dashboard summary
router.get("/summary", async (req, res) => {
  try {
    const [stats] = await Employee.aggregate([
      {
        $group: {
          _id: null,
          totalEmployees: { $sum: 1 },
          totalPayroll: { $sum: "$salary" },
          avgSalary: { $avg: "$salary" },
          active: { $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] } },
          onLeave: { $sum: { $cond: [{ $eq: ["$status", "On Leave"] }, 1, 0] } }
        }
      }
    ]);
    const totalDepartments = await Department.countDocuments();

    res.json({
      totalEmployees: stats?.totalEmployees || 0,
      totalDepartments,
      totalPayroll: stats?.totalPayroll || 0,
      avgSalary: Math.round(stats?.avgSalary || 0),
      active: stats?.active || 0,
      onLeave: stats?.onLeave || 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Headcount and salary per department
router.get("/by-department", async (req, res) => {
  try {
    const data = await Employee.aggregate([
      {
        $group: {
          _id: "$department",
          headcount: { $sum: 1 },
          totalSalary: { $sum: "$salary" },
          avgSalary: { $avg: "$salary" },
          minSalary: { $min: "$salary" },
          maxSalary: { $max: "$salary" }
        }
      },
      {
        $lookup: {
          from: "departments",
          localField: "_id",
          foreignField: "_id",
          as: "dept"
        }
      },
      { $unwind: "$dept" },
      {
        $project: {
          _id: 0,
          department: "$dept.name",
          headcount: 1,
          totalSalary: 1,
          avgSalary: { $round: ["$avgSalary", 0] },
          minSalary: 1,
          maxSalary: 1
        }
      },
      { $sort: { headcount: -1 } }
    ]);
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Recent joiners: ?days=90
router.get("/recent-joiners", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 90;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const employees = await Employee.find({ joinDate: { $gte: since } })
      .populate("department", "name")
      .sort({ joinDate: -1 });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Joiners per month, last 6 months (for chart)
router.get("/joiners-by-month", async (req, res) => {
  try {
    const since = new Date();
    since.setMonth(since.getMonth() - 5);
    since.setDate(1);
    since.setHours(0, 0, 0, 0);

    const data = await Employee.aggregate([
      { $match: { joinDate: { $gte: since } } },
      {
        $group: {
          _id: { y: { $year: "$joinDate" }, m: { $month: "$joinDate" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id.y": 1, "_id.m": 1 } }
    ]);
    res.json(data.map((d) => ({ year: d._id.y, month: d._id.m, count: d.count })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;