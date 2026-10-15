(function () {
  "use strict";

  // Change this to your Render URL after deploying (e.g. https://your-app.onrender.com/api)
  const API = "http://localhost:5000/api";
  const PAGE_SIZE = 10;

  /* ================= API + STORE ================= */
  async function request(path, options) {
    const res = await fetch(API + path, Object.assign({ headers: { "Content-Type": "application/json" } }, options));
    let data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) throw new Error((data && data.message) || "Request failed (" + res.status + ")");
    return data;
  }

  const Store = {
    departments: [],
    employees: [],
    page: 1,
    pages: 1,
    total: 0,
    filters: { search: "", department: "", status: "" },

    async loadDepartments() { this.departments = await request("/departments"); },

    async loadEmployees() {
      const p = new URLSearchParams({ page: this.page, limit: PAGE_SIZE });
      if (this.filters.search) p.set("search", this.filters.search);
      if (this.filters.department) p.set("department", this.filters.department);
      if (this.filters.status) p.set("status", this.filters.status);
      const data = await request("/employees?" + p.toString());
      this.employees = data.employees;
      this.total = data.total;
      this.pages = data.pages || 1;
      this.page = data.page;
    },

    saveEmployee(id, body) {
      return id
        ? request("/employees/" + id, { method: "PUT", body: JSON.stringify(body) })
        : request("/employees", { method: "POST", body: JSON.stringify(body) });
    },
    deleteEmployee(id) { return request("/employees/" + id, { method: "DELETE" }); },

    saveDepartment(id, body) {
      return id
        ? request("/departments/" + id, { method: "PUT", body: JSON.stringify(body) })
        : request("/departments", { method: "POST", body: JSON.stringify(body) });
    },
    deleteDepartment(id) { return request("/departments/" + id, { method: "DELETE" }); }
  };

  /* ================= UTILITIES ================= */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));
  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
  const fmtMoney = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
  const escapeHtml = (str) => String(str == null ? "" : str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const deptName = (e) => (e.department && e.department.name) || "—";
  const COLOR = "#4f46e5";

  function debounce(fn, ms) {
    let t;
    return function () { const a = arguments; clearTimeout(t); t = setTimeout(() => fn.apply(null, a), ms); };
  }

  /* ================= TOASTS ================= */
  const ICONS = {
    success: '<svg viewBox="0 0 24 24"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>',
    error: '<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-2h2zm0-4h-2V7h2z"/></svg>',
    warning: '<svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2zm0-4h-2v-4h2z"/></svg>'
  };
  function toast(message, type) {
    type = type || "success";
    const el = document.createElement("div");
    el.className = "toast " + type;
    el.innerHTML = '<span class="toast-icon">' + ICONS[type] + '</span><span class="toast-msg">' + escapeHtml(message) + '</span><button class="toast-close" aria-label="Dismiss">&times;</button>';
    el.querySelector(".toast-close").addEventListener("click", () => el.remove());
    $("#toastStack").appendChild(el);
    setTimeout(() => el.remove(), 4500);
  }

  /* ================= MODALS ================= */
  const backdrop = $("#modalBackdrop");
  function openModal(id) {
    backdrop.classList.add("show");
    $$(".modal", backdrop).forEach((m) => m.classList.remove("show"));
    $("#" + id).classList.add("show");
  }
  function closeModal() {
    backdrop.classList.remove("show");
    $$(".modal", backdrop).forEach((m) => m.classList.remove("show"));
  }
  backdrop.addEventListener("click", (e) => { if (e.target === backdrop) closeModal(); });
  $$("[data-close-modal]").forEach((b) => b.addEventListener("click", closeModal));

  function confirmAction(text, onConfirm, title) {
    $("#confirmModalTitle").textContent = title || "Are you sure?";
    $("#confirmModalText").textContent = text;
    openModal("confirmModal");
    const old = $("#confirmModalOk");
    const fresh = old.cloneNode(true);
    old.replaceWith(fresh);
    fresh.addEventListener("click", () => { closeModal(); onConfirm(); });
  }

  function showDetails(title, rows) {
    $("#detailsModalTitle").textContent = title;
    $("#detailsModalBody").innerHTML = rows.map((r) =>
      '<div class="detail-row"><span class="k">' + escapeHtml(r[0]) + '</span><span class="v">' + escapeHtml(r[1]) + '</span></div>').join("");
    openModal("detailsModal");
  }

  /* ================= VALIDATION ================= */
  function setFieldError(inputId, message) {
    const input = $("#" + inputId);
    const err = $('.field-error[data-for="' + inputId + '"]');
    const field = input ? input.closest(".field") : null;
    if (err) err.textContent = message || "";
    if (field) field.classList.toggle("invalid", !!message);
  }
  const clearErrors = (ids) => ids.forEach((id) => setFieldError(id, ""));

  /* ================= NAVIGATION ================= */
  async function switchView(name) {
    $$(".view").forEach((v) => v.classList.remove("active"));
    $("#view-" + name).classList.add("active");
    $$(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
    if ($("#sidebar").classList.contains("open")) closeSidebar();
    await refreshView(name);
  }

  async function refreshView(name) {
    try {
      if (name === "dashboard") await renderDashboard();
      else if (name === "employees") await renderEmployees();
      else if (name === "departments") await renderDepartments();
      else if (name === "reports") await generateReport();
    } catch (err) {
      toast(err.message || "Could not load data", "error");
    }
  }

  const currentView = () => ($(".view.active").id || "").replace("view-", "");

  $$(".nav-item").forEach((b) => b.addEventListener("click", () => switchView(b.dataset.view)));
  function openSidebar() { $("#sidebar").classList.add("open"); $("#sidebarScrim").classList.add("show"); }
  function closeSidebar() { $("#sidebar").classList.remove("open"); $("#sidebarScrim").classList.remove("show"); }
  $("#menuToggle").addEventListener("click", openSidebar);
  $("#sidebarScrim").addEventListener("click", closeSidebar);

  /* ================= DASHBOARD ================= */
  function setupCanvas(id) {
    const c = $(id);
    const ctx = c.getContext("2d");
    const ratio = window.devicePixelRatio || 1;
    const w = c.clientWidth || 420, h = 220;
    c.width = w * ratio; c.height = h * ratio;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  }

  function drawHBarChart(id, entries) {
    const { ctx, w } = setupCanvas(id);
    if (!entries.length) return;
    const max = Math.max(...entries.map((e) => e.value), 1);
    const padL = 10, padTop = 10, barH = 22, gap = 14, labelW = 110;
    entries.slice(0, 6).forEach((e, i) => {
      const y = padTop + i * (barH + gap);
      const barMaxW = w - padL - labelW - 40;
      const barW = Math.max(4, (e.value / max) * barMaxW);
      ctx.fillStyle = "#64748b"; ctx.font = "12px Inter, sans-serif"; ctx.textBaseline = "middle";
      ctx.fillText(e.label.length > 16 ? e.label.slice(0, 15) + "…" : e.label, padL, y + barH / 2);
      ctx.fillStyle = "#eef2ff"; ctx.fillRect(padL + labelW, y, barMaxW, barH);
      ctx.fillStyle = COLOR; ctx.fillRect(padL + labelW, y, barW, barH);
      ctx.fillStyle = "#0f172a"; ctx.font = "600 12px Inter, sans-serif";
      ctx.fillText(String(e.value), padL + labelW + barW + 8, y + barH / 2);
    });
  }

  function drawVBarChart(id, entries) {
    const { ctx, w, h } = setupCanvas(id);
    const max = Math.max(1, ...entries.map((e) => e.value));
    const padL = 30, padB = 26, padTop = 16, padR = 10;
    const plotW = w - padL - padR, plotH = h - padB - padTop;
    const colW = plotW / entries.length;

    ctx.strokeStyle = "#e2e8f0";
    ctx.beginPath(); ctx.moveTo(padL, padTop); ctx.lineTo(padL, padTop + plotH); ctx.lineTo(padL + plotW, padTop + plotH); ctx.stroke();

    entries.forEach((e, i) => {
      const bh = (e.value / max) * plotH;
      const x = padL + i * colW + colW * 0.25;
      ctx.fillStyle = COLOR; ctx.fillRect(x, padTop + plotH - bh, colW * 0.5, bh);
      ctx.fillStyle = "#0f172a"; ctx.font = "600 11px Inter, sans-serif"; ctx.textAlign = "center";
      if (e.value > 0) ctx.fillText(String(e.value), x + colW * 0.25, padTop + plotH - bh - 6);
      ctx.fillStyle = "#64748b"; ctx.font = "10.5px Inter, sans-serif";
      ctx.fillText(e.label, padL + i * colW + colW / 2, padTop + plotH + 16);
    });
    ctx.textAlign = "left";
  }

  async function renderDashboard() {
    const [s, byDept, joiners, recent] = await Promise.all([
      request("/reports/summary"),
      request("/reports/by-department"),
      request("/reports/joiners-by-month"),
      request("/reports/recent-joiners?days=90")
    ]);

    const cards = [
      { label: "Total Employees", value: s.totalEmployees, icon: "teal", svg: '<path d="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4zm-8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm8 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>' },
      { label: "Departments", value: s.totalDepartments, icon: "ink", svg: '<path d="M12 7V3H2v18h20V7H12z"/>' },
      { label: "Total Payroll", value: fmtMoney(s.totalPayroll), icon: "green", svg: '<path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>' },
      { label: "Average Salary", value: fmtMoney(s.avgSalary), icon: "teal", svg: '<path d="M3 17h2v4H3v-4zm4-6h2v10H7V11zm4-4h2v14h-2V7zm4 6h2v8h-2v-8zm4-9h2v17h-2V4z"/>' },
      { label: "Active", value: s.active, icon: "green", svg: '<path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>' },
      { label: "On Leave", value: s.onLeave, icon: "orange", svg: '<path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2zm0-4h-2v-4h2z"/>' }
    ];
    $("#statGrid").innerHTML = cards.map((c) =>
      '<div class="stat-card"><div class="stat-icon ' + c.icon + '"><svg viewBox="0 0 24 24">' + c.svg + '</svg></div>' +
      '<div class="stat-value">' + c.value + '</div><div class="stat-label">' + c.label + '</div></div>').join("");

    drawHBarChart("#chartDept", byDept.map((d) => ({ label: d.department, value: d.headcount })));

    // last 6 months, filled with zeros where no joiners
    const counts = {};
    joiners.forEach((j) => { counts[j.year + "-" + j.month] = j.count; });
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i);
      months.push({
        label: d.toLocaleDateString("en-IN", { month: "short" }),
        value: counts[d.getFullYear() + "-" + (d.getMonth() + 1)] || 0
      });
    }
    drawVBarChart("#chartJoiners", months);

    $("#deptSummaryList").innerHTML = byDept.map((d) =>
      '<div class="mini-item"><div class="mini-item-main"><span class="mini-item-title">' + escapeHtml(d.department) +
      '</span><span class="mini-item-sub">Avg salary ' + fmtMoney(d.avgSalary) + '</span></div>' +
      '<span class="mini-item-count">' + d.headcount + '</span></div>').join("")
      || '<div class="mini-item"><span class="mini-item-sub">No data yet.</span></div>';

    $("#recentJoinersList").innerHTML = recent.slice(0, 6).map((e) =>
      '<div class="mini-item"><div class="mini-item-main"><span class="mini-item-title">' + escapeHtml(e.name) +
      '</span><span class="mini-item-sub">' + escapeHtml(e.designation) + ' · ' + escapeHtml(deptName(e)) + '</span></div>' +
      '<span class="badge badge-teal">' + fmtDate(e.joinDate) + '</span></div>').join("")
      || '<div class="mini-item"><span class="mini-item-sub">No new joiners in the last 90 days.</span></div>';
  }

  /* ================= EMPLOYEES ================= */
  function populateDeptFilter() {
    const sel = $("#empDeptFilter");
    const current = sel.value;
    sel.innerHTML = '<option value="">All departments</option>' +
      Store.departments.map((d) => '<option value="' + d._id + '">' + escapeHtml(d.name) + '</option>').join("");
    sel.value = current;
  }

  async function renderEmployees() {
    await Store.loadDepartments();
    populateDeptFilter();
    await Store.loadEmployees();
    if (Store.employees.length === 0 && Store.page > 1) { Store.page -= 1; await Store.loadEmployees(); }

    $("#empEmpty").classList.toggle("show", Store.employees.length === 0);
    $("#empTableBody").innerHTML = Store.employees.map((e) => {
      const badge = e.status === "Active"
        ? '<span class="badge badge-green"><span class="badge-dot"></span>Active</span>'
        : '<span class="badge badge-orange"><span class="badge-dot"></span>On Leave</span>';
      return '<tr>' +
        '<td class="cell-strong">' + escapeHtml(e.employeeId) + '</td>' +
        '<td class="cell-strong">' + escapeHtml(e.name) + '</td>' +
        '<td class="cell-muted">' + escapeHtml(e.email) + '</td>' +
        '<td>' + escapeHtml(deptName(e)) + '</td>' +
        '<td>' + escapeHtml(e.designation) + '</td>' +
        '<td>' + fmtMoney(e.salary) + '</td>' +
        '<td>' + fmtDate(e.joinDate) + '</td>' +
        '<td>' + badge + '</td>' +
        '<td><div class="row-actions">' +
          '<button class="icon-action" data-view-emp="' + e._id + '" title="View"><svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zm0 12.5a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/></svg></button>' +
          '<button class="icon-action" data-edit-emp="' + e._id + '" title="Edit"><svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"/></svg></button>' +
          '<button class="icon-action danger" data-delete-emp="' + e._id + '" title="Delete"><svg viewBox="0 0 24 24"><path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button>' +
        '</div></td></tr>';
    }).join("");

    $("#pageInfo").textContent = "Page " + Store.page + " of " + Store.pages + " · " + Store.total + " employees";
    $("#btnPrevPage").disabled = Store.page <= 1;
    $("#btnNextPage").disabled = Store.page >= Store.pages;
  }

  const applyFilters = debounce(async () => {
    Store.filters.search = $("#empSearch").value.trim();
    Store.filters.department = $("#empDeptFilter").value;
    Store.filters.status = $("#empStatusFilter").value;
    Store.page = 1;
    try { await renderEmployees(); } catch (err) { toast(err.message, "error"); }
  }, 300);
  ["empSearch", "empDeptFilter", "empStatusFilter"].forEach((id) => $("#" + id).addEventListener("input", applyFilters));

  $("#btnPrevPage").addEventListener("click", async () => { Store.page -= 1; await refreshView("employees"); });
  $("#btnNextPage").addEventListener("click", async () => { Store.page += 1; await refreshView("employees"); });

  function fillEmployeeForm(emp) {
    $("#fDepartment").innerHTML = '<option value="">Select a department</option>' +
      Store.departments.map((d) => '<option value="' + d._id + '">' + escapeHtml(d.name) + '</option>').join("");
    $("#empEditId").value = emp ? emp._id : "";
    $("#fEmpId").value = emp ? emp.employeeId : "";
    $("#fEmpId").disabled = !!emp;
    $("#fName").value = emp ? emp.name : "";
    $("#fEmail").value = emp ? emp.email : "";
    $("#fPhone").value = emp ? (emp.phone || "") : "";
    $("#fDesignation").value = emp ? emp.designation : "";
    $("#fDepartment").value = emp && emp.department ? emp.department._id : "";
    $("#fSalary").value = emp ? emp.salary : "";
    $("#fJoinDate").value = emp ? String(emp.joinDate).slice(0, 10) : new Date().toISOString().slice(0, 10);
    $("#fStatus").value = emp ? emp.status : "Active";
    clearErrors(["fEmpId", "fName", "fEmail", "fPhone", "fDesignation", "fDepartment", "fSalary", "fJoinDate"]);
  }

  $("#btnAddEmployee").addEventListener("click", async () => {
    try {
      await Store.loadDepartments();
      if (!Store.departments.length) { toast("Add a department first.", "warning"); return; }
      $("#employeeModalTitle").textContent = "Add Employee";
      fillEmployeeForm(null);
      openModal("employeeModal");
    } catch (err) { toast(err.message, "error"); }
  });

  $("#employeeForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = $("#empEditId").value;
    const employeeId = $("#fEmpId").value.trim();
    const name = $("#fName").value.trim();
    const email = $("#fEmail").value.trim();
    const phone = $("#fPhone").value.trim();
    const designation = $("#fDesignation").value.trim();
    const department = $("#fDepartment").value;
    const salary = parseFloat($("#fSalary").value);
    const joinDate = $("#fJoinDate").value;
    const status = $("#fStatus").value;

    const fields = ["fEmpId", "fName", "fEmail", "fPhone", "fDesignation", "fDepartment", "fSalary", "fJoinDate"];
    clearErrors(fields);
    let ok = true;

    if (!editId && !employeeId) { setFieldError("fEmpId", "Employee ID is required."); ok = false; }
    if (!name) { setFieldError("fName", "Name is required."); ok = false; }
    if (!email) { setFieldError("fEmail", "Email is required."); ok = false; }
    else if (!/^\S+@\S+\.\S+$/.test(email)) { setFieldError("fEmail", "Enter a valid email."); ok = false; }
    if (phone && !/^[0-9+\-\s]{7,15}$/.test(phone)) { setFieldError("fPhone", "Enter a valid phone number."); ok = false; }
    if (!designation) { setFieldError("fDesignation", "Designation is required."); ok = false; }
    if (!department) { setFieldError("fDepartment", "Select a department."); ok = false; }
    if (isNaN(salary) || salary <= 0) { setFieldError("fSalary", "Salary must be greater than 0."); ok = false; }
    if (!joinDate) { setFieldError("fJoinDate", "Join date is required."); ok = false; }
    if (!ok) return;

    const body = { name, email, phone, designation, department, salary, joinDate, status };
    if (!editId) body.employeeId = employeeId;

    try {
      await Store.saveEmployee(editId, body);
      toast(editId ? "Employee updated." : "Employee added.", "success");
      closeModal();
      await refreshView("employees");
    } catch (err) {
      toast(err.message, "error");
    }
  });

  $("#empTableBody").addEventListener("click", (e) => {
    const v = e.target.closest("[data-view-emp]");
    const ed = e.target.closest("[data-edit-emp]");
    const del = e.target.closest("[data-delete-emp]");
    const find = (id) => Store.employees.find((x) => x._id === id);

    if (v) {
      const emp = find(v.dataset.viewEmp);
      if (!emp) return;
      showDetails(emp.name, [
        ["Employee ID", emp.employeeId], ["Email", emp.email], ["Phone", emp.phone || "—"],
        ["Department", deptName(emp)], ["Designation", emp.designation],
        ["Salary", fmtMoney(emp.salary)], ["Joined", fmtDate(emp.joinDate)], ["Status", emp.status]
      ]);
    } else if (ed) {
      const emp = find(ed.dataset.editEmp);
      if (!emp) return;
      $("#employeeModalTitle").textContent = "Edit Employee";
      fillEmployeeForm(emp);
      openModal("employeeModal");
    } else if (del) {
      const emp = find(del.dataset.deleteEmp);
      if (!emp) return;
      confirmAction('Delete "' + emp.name + '"? This cannot be undone.', async () => {
        try {
          await Store.deleteEmployee(emp._id);
          toast("Employee deleted.", "success");
          await refreshView("employees");
        } catch (err) { toast(err.message, "error"); }
      }, "Delete employee");
    }
  });

  /* ================= DEPARTMENTS ================= */
  async function renderDepartments() {
    await Store.loadDepartments();
    $("#deptEmpty").classList.toggle("show", Store.departments.length === 0);
    $("#deptTableBody").innerHTML = Store.departments.map((d) =>
      '<tr><td class="cell-strong">' + escapeHtml(d.name) + '</td>' +
      '<td class="cell-muted">' + escapeHtml(d.description || "—") + '</td>' +
      '<td><span class="badge badge-teal">' + d.employeeCount + '</span></td>' +
      '<td><div class="row-actions">' +
        '<button class="icon-action" data-edit-dept="' + d._id + '" title="Edit"><svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"/></svg></button>' +
        '<button class="icon-action danger" data-delete-dept="' + d._id + '" title="Delete"><svg viewBox="0 0 24 24"><path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg></button>' +
      '</div></td></tr>').join("");
  }

  $("#btnAddDepartment").addEventListener("click", () => {
    $("#departmentModalTitle").textContent = "Add Department";
    $("#deptEditId").value = "";
    $("#fDeptName").value = "";
    $("#fDeptDesc").value = "";
    clearErrors(["fDeptName"]);
    openModal("departmentModal");
  });

  $("#departmentForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const editId = $("#deptEditId").value;
    const name = $("#fDeptName").value.trim();
    const description = $("#fDeptDesc").value.trim();
    clearErrors(["fDeptName"]);
    if (!name) { setFieldError("fDeptName", "Department name is required."); return; }

    try {
      await Store.saveDepartment(editId, { name, description });
      toast(editId ? "Department updated." : "Department added.", "success");
      closeModal();
      await refreshView("departments");
    } catch (err) {
      toast(err.message, "error");
    }
  });

  $("#deptTableBody").addEventListener("click", (e) => {
    const ed = e.target.closest("[data-edit-dept]");
    const del = e.target.closest("[data-delete-dept]");
    if (ed) {
      const d = Store.departments.find((x) => x._id === ed.dataset.editDept);
      if (!d) return;
      $("#departmentModalTitle").textContent = "Edit Department";
      $("#deptEditId").value = d._id;
      $("#fDeptName").value = d.name;
      $("#fDeptDesc").value = d.description || "";
      clearErrors(["fDeptName"]);
      openModal("departmentModal");
    } else if (del) {
      const d = Store.departments.find((x) => x._id === del.dataset.deleteDept);
      if (!d) return;
      confirmAction('Delete department "' + d.name + '"?', async () => {
        try {
          await Store.deleteDepartment(d._id);
          toast("Department deleted.", "success");
          await refreshView("departments");
        } catch (err) { toast(err.message, "error"); }
      }, "Delete department");
    }
  });

  /* ================= REPORTS ================= */
  let lastReport = { head: [], rows: [], title: "" };

  async function generateReport() {
    const type = $("#reportType").value;
    let head = [], rows = [], title = "", summary = [];

    if (type === "employee-list") {
      const data = await request("/employees?limit=100");
      head = ["ID", "Name", "Email", "Department", "Designation", "Salary", "Joined", "Status"];
      rows = data.employees.map((e) => [e.employeeId, e.name, e.email, deptName(e), e.designation, fmtMoney(e.salary), fmtDate(e.joinDate), e.status]);
      title = "Employee list";
      summary = [["Employees", data.total], ["Total payroll", fmtMoney(data.employees.reduce((s, e) => s + e.salary, 0))]];
    } else if (type === "by-department") {
      const data = await request("/reports/by-department");
      head = ["Department", "Headcount"];
      rows = data.map((d) => [d.department, d.headcount]);
      title = "Headcount by department";
      summary = [["Departments", rows.length], ["Employees", data.reduce((s, d) => s + d.headcount, 0)]];
    } else if (type === "salary-summary") {
      const data = await request("/reports/by-department");
      head = ["Department", "Headcount", "Average", "Minimum", "Maximum", "Total"];
      rows = data.map((d) => [d.department, d.headcount, fmtMoney(d.avgSalary), fmtMoney(d.minSalary), fmtMoney(d.maxSalary), fmtMoney(d.totalSalary)]);
      title = "Salary summary by department";
      summary = [["Total payroll", fmtMoney(data.reduce((s, d) => s + d.totalSalary, 0))]];
    } else if (type === "recent-joiners") {
      const data = await request("/reports/recent-joiners?days=90");
      head = ["ID", "Name", "Department", "Designation", "Joined"];
      rows = data.map((e) => [e.employeeId, e.name, deptName(e), e.designation, fmtDate(e.joinDate)]);
      title = "Recent joiners (90 days)";
      summary = [["New joiners", rows.length]];
    }

    lastReport = { head, rows, title };
    $("#reportSummary").innerHTML = summary.map((s) =>
      '<div class="stat-card"><div class="stat-value">' + s[1] + '</div><div class="stat-label">' + s[0] + '</div></div>').join("");
    $("#reportTableHead").innerHTML = "<tr>" + head.map((h) => "<th>" + escapeHtml(h) + "</th>").join("") + "</tr>";
    $("#reportEmpty").classList.toggle("show", rows.length === 0);
    $("#reportTableBody").innerHTML = rows.map((r) => "<tr>" + r.map((c) => "<td>" + escapeHtml(c) + "</td>").join("") + "</tr>").join("");
  }

  $("#btnGenerateReport").addEventListener("click", () => refreshView("reports"));
  $("#reportType").addEventListener("change", () => refreshView("reports"));

  $("#btnPrintReport").addEventListener("click", () => {
    if (!lastReport.rows.length) { toast("Generate a report before printing.", "warning"); return; }
    const w = window.open("", "_blank");
    w.document.write("<html><head><title>" + escapeHtml(lastReport.title) + "</title>" +
      "<style>body{font-family:Arial,sans-serif;padding:24px;}h1{font-size:18px;}table{width:100%;border-collapse:collapse;margin-top:16px;}th,td{border:1px solid #ddd;padding:8px;font-size:12px;text-align:left;}th{background:#f5f5f5;}</style></head><body>" +
      "<h1>" + escapeHtml(lastReport.title) + "</h1><p>Generated on " + fmtDate(new Date()) + "</p>" +
      "<table><thead><tr>" + lastReport.head.map((h) => "<th>" + escapeHtml(h) + "</th>").join("") + "</tr></thead><tbody>" +
      lastReport.rows.map((r) => "<tr>" + r.map((c) => "<td>" + escapeHtml(c) + "</td>").join("") + "</tr>").join("") +
      "</tbody></table></body></html>");
    w.document.close(); w.focus(); w.print();
  });

  $("#btnExportReport").addEventListener("click", () => {
    if (!lastReport.rows.length) { toast("Generate a report before exporting.", "warning"); return; }
    const csv = [lastReport.head.join(",")].concat(
      lastReport.rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(","))
    );
    const blob = new Blob([csv.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = lastReport.title.replace(/\s+/g, "_").toLowerCase() + ".csv";
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    toast("Report exported as CSV.", "success");
  });

  /* ================= GLOBAL SEARCH ================= */
  $("#globalSearch").addEventListener("keydown", async (e) => {
    if (e.key !== "Enter") return;
    const q = e.target.value.trim();
    if (!q) return;
    $("#empSearch").value = q;
    Store.filters.search = q;
    Store.page = 1;
    await switchView("employees");
  });

  /* ================= INIT ================= */
  window.addEventListener("resize", debounce(() => { if (currentView() === "dashboard") refreshView("dashboard"); }, 200));

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      await Store.loadDepartments();
      await renderDashboard();
    } catch (err) {
      toast("Cannot reach the server. Is the backend running?", "error");
    }
  });
})();