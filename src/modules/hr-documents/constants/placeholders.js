// Centralized placeholder registry for the HR Documents module.
//
// Adding a new placeholder anywhere in the system means adding ONE entry
// here — nothing else needs to change. `resolve(ctx)` receives the fully
// built render context (see placeholder-engine.service.js's build_context)
// and returns the string to substitute, or '' if the underlying data is
// missing (never throws — a blank field beats a crashed render).
//
// `group` is purely for FE display grouping (Employee / Employment /
// Company / Manager / Salary / Dates) — it has no effect on rendering.

function fmt_date(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function fmt_money(amount, currency) {
  if (amount == null) return '';
  const n = Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return currency ? `${currency} ${n}` : n;
}

export const PLACEHOLDER_REGISTRY = [
  // ── Employee ────────────────────────────────────────────────────────────
  { token: 'employee_name', group: 'Employee', label: 'Employee full name', resolve: (c) => [c.user?.first_name, c.user?.last_name].filter(Boolean).join(' ') },
  { token: 'employee_first_name', group: 'Employee', label: 'Employee first name', resolve: (c) => c.user?.first_name || '' },
  { token: 'employee_last_name', group: 'Employee', label: 'Employee last name', resolve: (c) => c.user?.last_name || '' },
  { token: 'employee_email', group: 'Employee', label: 'Employee email', resolve: (c) => c.user?.email || '' },
  { token: 'employee_id', group: 'Employee', label: 'Employee ID', resolve: (c) => c.user?.employee_id || '' },
  { token: 'employee_phone', group: 'Employee', label: 'Employee phone', resolve: (c) => c.user?.phone || '' },
  { token: 'employee_address', group: 'Employee', label: 'Employee current address', resolve: (c) => c.profile?.current_address || '' },
  { token: 'employee_cnic', group: 'Employee', label: 'Employee CNIC/National ID', resolve: (c) => c.profile?.cnic || '' },

  // ── Employment ──────────────────────────────────────────────────────────
  { token: 'designation', group: 'Employment', label: 'Designation', resolve: (c) => c.designation?.name || c.user?.designation || '' },
  { token: 'department', group: 'Employment', label: 'Department', resolve: (c) => c.department?.name || '' },
  { token: 'business_unit', group: 'Employment', label: 'Business unit', resolve: (c) => c.business_unit?.name || '' },
  { token: 'grade', group: 'Employment', label: 'Grade', resolve: (c) => c.grade?.name || c.profile?.grade || '' },
  { token: 'employment_type', group: 'Employment', label: 'Employment type', resolve: (c) => c.profile?.employment_type || '' },
  { token: 'work_location', group: 'Employment', label: 'Work location', resolve: (c) => c.profile?.work_location || '' },

  // ── Manager ─────────────────────────────────────────────────────────────
  { token: 'manager_name', group: 'Manager', label: 'Reporting manager name', resolve: (c) => c.supervisor ? [c.supervisor.first_name, c.supervisor.last_name].filter(Boolean).join(' ') : '' },
  { token: 'manager_email', group: 'Manager', label: 'Reporting manager email', resolve: (c) => c.supervisor?.email || '' },
  { token: 'manager_designation', group: 'Manager', label: "Reporting manager's designation", resolve: (c) => c.supervisor?.designation || '' },

  // ── Salary / Compensation ───────────────────────────────────────────────
  { token: 'salary', group: 'Salary', label: 'Base salary (formatted)', resolve: (c) => fmt_money(c.profile?.base_salary ?? c.user?.salary, c.profile?.salary_currency) },
  { token: 'gross_salary', group: 'Salary', label: 'Gross salary (formatted)', resolve: (c) => fmt_money(c.profile?.gross_salary, c.profile?.salary_currency) },
  { token: 'salary_currency', group: 'Salary', label: 'Salary currency', resolve: (c) => c.profile?.salary_currency || '' },
  { token: 'pay_frequency', group: 'Salary', label: 'Pay frequency', resolve: (c) => c.profile?.pay_frequency || '' },

  // ── Dates ───────────────────────────────────────────────────────────────
  { token: 'joining_date', group: 'Dates', label: 'Joining / hire date', resolve: (c) => fmt_date(c.user?.hire_date) },
  { token: 'effective_date', group: 'Dates', label: "Today's date (document effective date)", resolve: () => fmt_date(new Date()) },
  { token: 'confirmation_date', group: 'Dates', label: 'Probation confirmation date', resolve: (c) => fmt_date(c.profile?.confirmation_date) },
  { token: 'probation_end_date', group: 'Dates', label: 'Probation end date', resolve: (c) => fmt_date(c.profile?.probation_end) },

  // ── Company ─────────────────────────────────────────────────────────────
  { token: 'company_name', group: 'Company', label: 'Company name', resolve: (c) => c.company?.name || '' },
  { token: 'company_address', group: 'Company', label: 'Company address', resolve: (c) => c.company?.address || '' },
  { token: 'company_email', group: 'Company', label: 'Company email', resolve: (c) => c.company?.email || '' },
  { token: 'company_phone', group: 'Company', label: 'Company phone', resolve: (c) => c.company?.phone || '' },
];

export const PLACEHOLDER_MAP = new Map(PLACEHOLDER_REGISTRY.map((p) => [p.token, p]));

export const DOCUMENT_STATUSES = [
  'DRAFT', 'GENERATED', 'SENT', 'VIEWED', 'SIGNED', 'REJECTED', 'CANCELLED', 'EXPIRED', 'ARCHIVED',
];

export const SIGNER_ROLES = ['EMPLOYEE', 'HR', 'COMPANY'];
