const mongoose = require("mongoose");
require("dotenv").config();

const Department = require("./department");
const Employee = require("./employee");

const departments = [
  { name: "Engineering", description: "Software development team" },
  { name: "Human Resources", description: "Hiring and employee welfare" },
  { name: "Finance", description: "Accounts and payroll" },
  { name: "Marketing", description: "Brand and campaigns" }
];

const employees = [
  ["EMP001", "Rahul Sharma", "rahul@example.com", "9876543210", "Developer", 50000, "2026-10-01", "Active", "Engineering"],
  ["EMP002", "Priya Verma", "priya@example.com", "9876500001", "Senior Developer", 85000, "2025-03-15", "Active", "Engineering"],
  ["EMP003", "Amit Singh", "amit@example.com", "9876500002", "QA Engineer", 45000, "2026-08-10", "Active", "Engineering"],
  ["EMP004", "Neha Gupta", "neha@example.com", "9876500003", "HR Manager", 60000, "2024-06-01", "Active", "Human Resources"],
  ["EMP005", "Karan Mehta", "karan@example.com", "9876500004", "Recruiter", 38000, "2026-09-05", "On Leave", "Human Resources"],
  ["EMP006", "Sneha Reddy", "sneha@example.com", "9876500005", "Accountant", 48000, "2025-11-20", "Active", "Finance"],
  ["EMP007", "Vikram Joshi", "vikram@example.com", "9876500006", "Finance Analyst", 55000, "2026-07-12", "Active", "Finance"],
  ["EMP008", "Anjali Nair", "anjali@example.com", "9876500007", "Marketing Lead", 65000, "2024-12-01", "Active", "Marketing"],
  ["EMP009", "Rohan Das", "rohan@example.com", "9876500008", "Content Writer", 32000, "2026-10-08", "Active", "Marketing"],
  ["EMP010", "Pooja Kapoor", "pooja@example.com", "9876500009", "SEO Specialist", 42000, "2026-05-18", "On Leave", "Marketing"]
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);

  const deptMap = {};
  for (const d of departments) {
    const doc = await Department.findOneAndUpdate({ name: d.name }, d, { upsert: true, new: true });
    deptMap[d.name] = doc._id;
  }

  for (const e of employees) {
    const [employeeId, name, email, phone, designation, salary, joinDate, status, dept] = e;
    await Employee.findOneAndUpdate(
      { employeeId },
      { employeeId, name, email, phone, designation, salary, joinDate, status, department: deptMap[dept] },
      { upsert: true, new: true }
    );
  }

  console.log("Seeded " + departments.length + " departments and " + employees.length + " employees");
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err.message);
  process.exit(1);
});