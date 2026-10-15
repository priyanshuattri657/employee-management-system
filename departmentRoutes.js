const express = require("express");
const Department = require("./department");
const Employee = require("./employee");

const router = express.Router();

// GET all departments with headcount
router.get("/", async (req, res) => {
  try {
    const departments = await Department.find().sort({ name: 1 }).lean();
    const counts = await Employee.aggregate([
      { $group: { _id: "$department", count: { $sum: 1 } } }
    ]);
    const map = Object.fromEntries(counts.map((c) => [String(c._id), c.count]));

    res.json(
      departments.map((d) => ({ ...d, employeeCount: map[String(d._id)] || 0 }))
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ADD department
router.post("/", async (req, res) => {
  try {
    const { name, description } = req.body;
    const department = await new Department({ name, description }).save();
    res.status(201).json(department);
  } catch (error) {
    const msg = error.code === 11000 ? "Department already exists" : error.message;
    res.status(400).json({ message: msg });
  }
});

// UPDATE department
router.put("/:id", async (req, res) => {
  try {
    const { name, description } = req.body;
    const department = await Department.findByIdAndUpdate(
      req.params.id,
      { name, description },
      { new: true, runValidators: true }
    );
    if (!department) return res.status(404).json({ message: "Department not found" });
    res.json(department);
  } catch (error) {
    const msg = error.code === 11000 ? "Department already exists" : error.message;
    res.status(400).json({ message: msg });
  }
});

// DELETE department (blocked if it has employees)
router.delete("/:id", async (req, res) => {
  try {
    const count = await Employee.countDocuments({ department: req.params.id });
    if (count > 0) {
      return res.status(400).json({
        message: `Cannot delete: ${count} employee(s) belong to this department`
      });
    }
    const department = await Department.findByIdAndDelete(req.params.id);
    if (!department) return res.status(404).json({ message: "Department not found" });
    res.json({ message: "Department deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;