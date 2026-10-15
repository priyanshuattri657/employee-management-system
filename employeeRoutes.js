const express = require("express");
const Employee = require("./employee");

const router = express.Router();

const FIELDS = [
  "employeeId", "name", "email", "phone",
  "designation", "salary", "joinDate", "status", "department"
];

const pick = (body) =>
  Object.fromEntries(FIELDS.filter((f) => body[f] !== undefined).map((f) => [f, body[f]]));

const dupMessage = (error) => {
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || "value";
    return `This ${field} already exists`;
  }
  return error.message;
};

// GET employees: ?search=&department=&status=&page=&limit=
router.get("/", async (req, res) => {
  try {
    const { search, department, status } = req.query;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 100);

    const filter = {};
    if (department) filter.department = department;
    if (status) filter.status = status;
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: rx }, { employeeId: rx }, { email: rx }];
    }

    const [employees, total] = await Promise.all([
      Employee.find(filter)
        .populate("department", "name")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Employee.countDocuments(filter)
    ]);

    res.json({ employees, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET one employee
router.get("/:id", async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id).populate("department", "name");
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json(employee);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ADD employee
router.post("/", async (req, res) => {
  try {
    const saved = await new Employee(pick(req.body)).save();
    res.status(201).json(await saved.populate("department", "name"));
  } catch (error) {
    res.status(400).json({ message: dupMessage(error) });
  }
});

// UPDATE employee
router.put("/:id", async (req, res) => {
  try {
    const employee = await Employee.findByIdAndUpdate(req.params.id, pick(req.body), {
      new: true,
      runValidators: true
    }).populate("department", "name");
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json(employee);
  } catch (error) {
    res.status(400).json({ message: dupMessage(error) });
  }
});

// DELETE employee
router.delete("/:id", async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json({ message: "Employee deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;