# TeamDesk: Employee Management System

A full-stack web application to manage employee records and departments, built as **Task 4** of the Auspify Software Development Internship.

## Features

- Add, view, update and delete employees
- Department management (add, edit, delete); a department that still has employees cannot be deleted
- Search employees by name, ID or email
- Filter by department and status, with pagination
- Dashboard with payroll, average salary, headcount and charts
- Reports: employee list, headcount by department, salary summary, recent joiners
- Print reports and export them as CSV
- Form validation and toast notifications
- Responsive layout

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express.js
- **Database:** MongoDB Atlas with Mongoose
- **Tools:** Postman, Git, GitHub

## Project Structure

```
├── server.js
├── employee.js, department.js          (models)
├── employeeRoutes.js, departmentRoutes.js, reportRoutes.js
├── seed.js                             (sample data)
├── index.html, style.css, script.js    (frontend)
└── ScreenShots/
```

## Setup

1. Clone the repository
```
   git clone https://github.com/priyanshuattri657/YOUR-REPO-NAME.git
   cd YOUR-REPO-NAME
```
2. Install dependencies
```
   npm install
```
3. Create a `.env` file
```
   PORT=5000
   MONGO_URI=your_mongodb_connection_string
```
4. (Optional) Add sample data
```
   node seed.js
```
5. Start the server
```
   npm run dev
```
6. Open `index.html` in your browser (or with Live Server).

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/employees` | List employees (`search`, `department`, `status`, `page`, `limit`) |
| GET | `/api/employees/:id` | Get one employee |
| POST | `/api/employees` | Add an employee |
| PUT | `/api/employees/:id` | Update an employee |
| DELETE | `/api/employees/:id` | Delete an employee |
| GET | `/api/departments` | List departments with employee counts |
| POST | `/api/departments` | Add a department |
| PUT | `/api/departments/:id` | Update a department |
| DELETE | `/api/departments/:id` | Delete a department (blocked if it has employees) |
| GET | `/api/reports/summary` | Dashboard totals |
| GET | `/api/reports/by-department` | Headcount and salary per department |
| GET | `/api/reports/recent-joiners` | Recent joiners (`days`) |
| GET | `/api/reports/joiners-by-month` | Joiners per month, last 6 months |

## Screenshots

### Dashboard
![Dashboard](ScreenShots/dashboard.png)

### Employees
![Employees](ScreenShots/employees.png)

### Add Employee
![Add Employee](ScreenShots/add-employee.png)

### Search and Filter
![Search and Filter](ScreenShots/search-filter.png)

### Departments
![Departments](ScreenShots/departments.png)

### Delete Blocked
![Delete Blocked](ScreenShots/delete-blocked.png)

### Reports
![Reports](ScreenShots/reports.png)

### API Test (Postman)
![Postman](ScreenShots/postman-get-summary.png)

## Live Demo

Add your Render link here after deploying.

## Author

**Priyanshu Attri**
GitHub: [priyanshuattri657](https://github.com/priyanshuattri657) · LinkedIn: [priyanshuattri](https://linkedin.com/in/priyanshuattri)

#Auspify #AuspifyTechnologies #AuspifyInternship #AuspifyProjects