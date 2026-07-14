// Enterprise Service Desk seed data — pure configuration (categories + ticket
// types). No business logic lives here; everything the ticket module needs
// to render/validate/route a ticket comes from these rows. Adding a new
// ticket type later is a data change (via the admin CRUD UI), not a code
// change.

const DEFAULT_FIELDS = [
  { section: 'Details', fields: [
    { key: 'location', label: 'Location', type: 'text' },
    { key: 'notes', label: 'Additional Notes', type: 'textarea' },
  ] },
];

function generic_workflow() {
  return [
    { key: 'OPEN', label: 'Open' },
    { key: 'ASSIGNED', label: 'Assigned' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'CLOSED', label: 'Closed' },
  ];
}

const CATEGORIES = [
  { key: 'IT', label: 'IT' },
  { key: 'DEVELOPMENT', label: 'Development' },
  { key: 'QA', label: 'QA / Testing' },
  { key: 'HR', label: 'HR' },
  { key: 'FINANCE', label: 'Finance' },
  { key: 'ADMINISTRATION', label: 'Administration' },
  { key: 'FACILITIES', label: 'Facilities' },
  { key: 'PROCUREMENT', label: 'Procurement' },
  { key: 'OPERATIONS', label: 'Operations' },
  { key: 'PROJECTS', label: 'Projects' },
  { key: 'SECURITY', label: 'Security' },
  { key: 'LEGAL', label: 'Legal' },
  { key: 'GENERAL', label: 'General' },
];

// Types with a fully bespoke field_schema (the ones your spec gave explicit
// field lists for). Every other type in the category list gets a sensible
// generic form (DEFAULT_FIELDS) — expandable later with zero code changes.
function bespoke_types() {
  return [
    {
      key: 'QA_BUG_REPORT', label: 'Bug Report', category_key: 'QA',
      department_key: 'DEVELOPMENT', project_association: 'REQUIRED',
      response_sla_mins: 240, resolution_sla_mins: 2880,
      workflow: [
        { key: 'OPEN', label: 'Open' },
        { key: 'ASSIGNED', label: 'Assigned' },
        { key: 'DEVELOPMENT', label: 'Development' },
        { key: 'READY_FOR_QA', label: 'Ready for QA' },
        { key: 'QA_TESTING', label: 'QA Testing' },
        { key: 'CLOSED', label: 'Closed' },
      ],
      field_schema: [
        { section: 'Bug Details', fields: [
          { key: 'module', label: 'Module', type: 'text', required: true },
          { key: 'feature', label: 'Feature', type: 'text' },
          { key: 'version', label: 'Version', type: 'text' },
          { key: 'build', label: 'Build', type: 'text' },
          { key: 'sprint', label: 'Sprint', type: 'text' },
        ] },
        { section: 'Environment', fields: [
          { key: 'browser', label: 'Browser', type: 'text' },
          { key: 'os', label: 'Operating System', type: 'text' },
          { key: 'device', label: 'Device', type: 'text' },
          { key: 'environment', label: 'Environment', type: 'select', options: ['DEVELOPMENT', 'STAGING', 'PRODUCTION'] },
          { key: 'api', label: 'API', type: 'text' },
        ] },
        { section: 'Reproduction', fields: [
          { key: 'scenario', label: 'Scenario', type: 'textarea', required: true },
          { key: 'steps_to_reproduce', label: 'Steps to Reproduce', type: 'textarea', required: true },
          { key: 'expected_result', label: 'Expected Result', type: 'textarea', required: true },
          { key: 'actual_result', label: 'Actual Result', type: 'textarea', required: true },
          { key: 'console_log', label: 'Console Log', type: 'textarea' },
        ] },
      ],
    },
    {
      key: 'QA_REGRESSION', label: 'Regression', category_key: 'QA',
      department_key: 'DEVELOPMENT', project_association: 'REQUIRED',
      response_sla_mins: 240, resolution_sla_mins: 2880,
      workflow: [
        { key: 'OPEN', label: 'Open' }, { key: 'ASSIGNED', label: 'Assigned' },
        { key: 'DEVELOPMENT', label: 'Development' }, { key: 'READY_FOR_QA', label: 'Ready for QA' },
        { key: 'QA_TESTING', label: 'QA Testing' }, { key: 'CLOSED', label: 'Closed' },
      ],
      field_schema: [
        { section: 'Details', fields: [
          { key: 'module', label: 'Module', type: 'text', required: true },
          { key: 'scenario', label: 'Scenario', type: 'textarea', required: true },
          { key: 'expected_result', label: 'Expected Result', type: 'textarea' },
          { key: 'actual_result', label: 'Actual Result', type: 'textarea' },
        ] },
      ],
    },
    {
      key: 'IT_SUPPORT', label: 'IT Support', category_key: 'IT',
      department_key: 'IT', project_association: 'NONE',
      response_sla_mins: 60, resolution_sla_mins: 480,
      workflow: generic_workflow(),
      field_schema: [
        { section: 'Issue Details', fields: [
          { key: 'device', label: 'Device', type: 'text' },
          { key: 'issue_category', label: 'Issue Category', type: 'select', options: ['HARDWARE', 'SOFTWARE', 'NETWORK', 'OTHER'] },
          { key: 'urgency', label: 'Urgency', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH'] },
          { key: 'location', label: 'Location', type: 'text' },
          { key: 'remote_support_ok', label: 'Remote Support Required', type: 'boolean' },
        ] },
      ],
    },
    {
      key: 'HARDWARE_REQUEST', label: 'Hardware Request', category_key: 'IT',
      department_key: 'IT', project_association: 'NONE',
      response_sla_mins: 480, resolution_sla_mins: 4320,
      workflow: [
        { key: 'OPEN', label: 'Open' },
        { key: 'MANAGER_APPROVAL', label: 'Manager Approval', requires_approval: true, approver_role: 'MANAGER' },
        { key: 'PURCHASE', label: 'Purchase' },
        { key: 'DELIVERED', label: 'Delivered' },
        { key: 'CLOSED', label: 'Closed' },
      ],
      integration_hooks: { on_approve: 'CREATE_REQUISITION' },
      field_schema: [
        { section: 'Request Details', fields: [
          { key: 'asset_category', label: 'Asset Category', type: 'text', required: true },
          { key: 'required_item', label: 'Required Item', type: 'text', required: true },
          { key: 'quantity', label: 'Quantity', type: 'number', required: true },
          { key: 'reason', label: 'Reason', type: 'textarea', required: true },
        ] },
      ],
    },
    {
      key: 'SOFTWARE_REQUEST', label: 'Software Request', category_key: 'IT',
      department_key: 'IT', project_association: 'NONE',
      response_sla_mins: 480, resolution_sla_mins: 4320,
      workflow: [
        { key: 'OPEN', label: 'Open' },
        { key: 'MANAGER_APPROVAL', label: 'Manager Approval', requires_approval: true, approver_role: 'MANAGER' },
        { key: 'PROVISIONED', label: 'Provisioned' },
        { key: 'CLOSED', label: 'Closed' },
      ],
      field_schema: [
        { section: 'Request Details', fields: [
          { key: 'software_name', label: 'Software / License', type: 'text', required: true },
          { key: 'quantity', label: 'Seats', type: 'number' },
          { key: 'reason', label: 'Reason', type: 'textarea', required: true },
        ] },
      ],
    },
    {
      key: 'INTERNET_NETWORK', label: 'Network / Internet', category_key: 'IT',
      department_key: 'IT', project_association: 'NONE',
      response_sla_mins: 60, resolution_sla_mins: 240,
      workflow: generic_workflow(),
      field_schema: [
        { section: 'Issue Details', fields: [
          { key: 'department', label: 'Department', type: 'text' },
          { key: 'location', label: 'Location', type: 'text', required: true },
          { key: 'issue', label: 'Issue', type: 'textarea', required: true },
          { key: 'urgency', label: 'Urgency', type: 'select', options: ['LOW', 'MEDIUM', 'HIGH'] },
        ] },
      ],
    },
    {
      key: 'FURNITURE', label: 'Furniture', category_key: 'FACILITIES',
      department_key: 'ADMINISTRATION', project_association: 'NONE',
      response_sla_mins: 480, resolution_sla_mins: 4320,
      workflow: [
        { key: 'OPEN', label: 'Open' },
        { key: 'MANAGER_APPROVAL', label: 'Manager Approval', requires_approval: true, approver_role: 'MANAGER' },
        { key: 'PURCHASE', label: 'Purchase' },
        { key: 'DELIVERED', label: 'Delivered' },
        { key: 'CLOSED', label: 'Closed' },
      ],
      integration_hooks: { on_approve: 'CREATE_REQUISITION' },
      field_schema: [
        { section: 'Request Details', fields: [
          { key: 'item', label: 'Item', type: 'text', required: true },
          { key: 'quantity', label: 'Quantity', type: 'number', required: true },
          { key: 'location', label: 'Location', type: 'text', required: true },
          { key: 'reason', label: 'Reason', type: 'textarea' },
        ] },
      ],
    },
    {
      key: 'CLEANING', label: 'Cleaning / Housekeeping', category_key: 'FACILITIES',
      department_key: 'ADMINISTRATION', project_association: 'NONE',
      response_sla_mins: 60, resolution_sla_mins: 240,
      workflow: [
        { key: 'OPEN', label: 'Open' }, { key: 'ASSIGNED', label: 'Assigned' },
        { key: 'COMPLETED', label: 'Completed' }, { key: 'CLOSED', label: 'Closed' },
      ],
      field_schema: [
        { section: 'Details', fields: [
          { key: 'area', label: 'Area', type: 'text', required: true },
          { key: 'floor', label: 'Floor', type: 'text' },
        ] },
      ],
    },
  ];
}

// Every remaining example type from your list, generic form/workflow —
// fully functional today, upgradeable to a bespoke field_schema later via
// the admin CRUD UI with zero code changes.
const GENERIC_TYPES = [
  ['PRINTER', 'Printer', 'IT', 'IT'],
  ['LAPTOP', 'Laptop', 'IT', 'IT'],
  ['DESKTOP', 'Desktop', 'IT', 'IT'],
  ['VPN', 'VPN', 'IT', 'IT'],
  ['EMAIL', 'Email', 'IT', 'IT'],
  ['ACCESS_REQUEST', 'Access Request', 'IT', 'IT'],
  ['NEW_EMPLOYEE_SETUP', 'New Employee Setup', 'IT', 'IT'],
  ['FEATURE_REQUEST', 'Feature Request', 'DEVELOPMENT', 'DEVELOPMENT'],
  ['ENHANCEMENT', 'Enhancement', 'DEVELOPMENT', 'DEVELOPMENT'],
  ['API_ISSUE', 'API Issue', 'DEVELOPMENT', 'DEVELOPMENT'],
  ['DATABASE_ISSUE', 'Database Issue', 'DEVELOPMENT', 'DEVELOPMENT'],
  ['UAT_ISSUE', 'UAT Issue', 'QA', 'DEVELOPMENT'],
  ['PERFORMANCE_ISSUE', 'Performance Issue', 'QA', 'DEVELOPMENT'],
  ['HR_ATTENDANCE', 'Attendance', 'HR', 'HR'],
  ['HR_LEAVE', 'Leave', 'HR', 'HR'],
  ['HR_REQUEST', 'HR Request', 'HR', 'HR'],
  ['HR_COMPLAINT', 'Complaint', 'HR', 'HR'],
  ['PAYROLL_QUERY', 'Payroll Query', 'FINANCE', 'FINANCE'],
  ['FINANCE_PAYMENT', 'Payment', 'FINANCE', 'FINANCE'],
  ['FINANCE_REIMBURSEMENT', 'Reimbursement', 'FINANCE', 'FINANCE'],
  ['FINANCE_VENDOR', 'Vendor', 'FINANCE', 'FINANCE'],
  ['ADMIN_REQUEST', 'Admin Request', 'ADMINISTRATION', 'ADMINISTRATION'],
  ['OFFICE_SUPPLIES', 'Office Supplies', 'ADMINISTRATION', 'ADMINISTRATION'],
  ['WASHROOM_FACILITY', 'Washroom / Facility', 'FACILITIES', 'ADMINISTRATION'],
  ['WATER_PANTRY', 'Water / Pantry', 'FACILITIES', 'ADMINISTRATION'],
  ['AIR_CONDITIONER', 'Air Conditioner', 'FACILITIES', 'ADMINISTRATION'],
  ['ELECTRICAL', 'Electrical', 'FACILITIES', 'ADMINISTRATION'],
  ['MECHANICAL_MAINTENANCE', 'Mechanical / Maintenance', 'FACILITIES', 'ADMINISTRATION'],
  ['PROCUREMENT_REQUEST', 'Vendor / Procurement Request', 'PROCUREMENT', 'FINANCE'],
  ['ASSET_ISSUE', 'Asset Issue', 'OPERATIONS', 'IT'],
  ['ASSET_RETURN', 'Asset Return', 'OPERATIONS', 'IT'],
  ['PROJECT_SUPPORT', 'Project Support', 'PROJECTS', 'DEVELOPMENT'],
  ['CLIENT_ISSUE', 'Client Issue', 'PROJECTS', 'DEVELOPMENT'],
  ['CHANGE_REQUEST', 'Change Request', 'PROJECTS', 'DEVELOPMENT'],
  ['SECURITY_REQUEST', 'Security', 'SECURITY', 'IT'],
  ['LEGAL_QUERY', 'Legal Query', 'LEGAL', 'ADMINISTRATION'],
  ['GENERAL_REQUEST', 'General Request', 'GENERAL', 'ADMINISTRATION'],
];

// ASSET_RETURN gets the asset-integration hook wired; PROJECT_SUPPORT/
// CLIENT_ISSUE/CHANGE_REQUEST get project association since they clearly need it.
const OVERRIDES = {
  ASSET_RETURN: { integration_hooks: { on_approve: 'ASSET_RETURN' } },
  ASSET_ISSUE: { integration_hooks: { on_approve: 'ASSET_RETURN' } },
  PROJECT_SUPPORT: { project_association: 'REQUIRED' },
  CLIENT_ISSUE: { project_association: 'REQUIRED' },
  CHANGE_REQUEST: { project_association: 'OPTIONAL' },
  PROCUREMENT_REQUEST: { integration_hooks: { on_approve: 'CREATE_REQUISITION' } },
};

export async function seed_ticket_desk(prisma) {
  const category_ids = {};
  for (const [i, c] of CATEGORIES.entries()) {
    const row = await prisma.ticket_categories.upsert({
      where: { key: c.key },
      update: { label: c.label },
      create: { key: c.key, label: c.label, sort_order: i },
    });
    category_ids[c.key] = row.id;
  }

  const department_ids = {};
  const departments = await prisma.departments.findMany({ select: { id: true, name: true } });
  for (const d of departments) department_ids[d.name.toUpperCase()] = d.id;

  function dept_id(key) {
    // Best-effort match against seeded department names; null is fine —
    // department stays unset and can be configured later via the admin UI.
    return department_ids[key] || null;
  }

  for (const t of bespoke_types()) {
    await prisma.ticket_types.upsert({
      where: { key: t.key },
      update: {},
      create: {
        key: t.key,
        label: t.label,
        category_id: category_ids[t.category_key],
        department_id: dept_id(t.department_key),
        project_association: t.project_association || 'NONE',
        field_schema: t.field_schema,
        workflow: t.workflow,
        response_sla_mins: t.response_sla_mins,
        resolution_sla_mins: t.resolution_sla_mins,
        integration_hooks: t.integration_hooks || undefined,
      },
    });
  }

  for (const [i, [key, label, category_key, department_key]] of GENERIC_TYPES.entries()) {
    const override = OVERRIDES[key] || {};
    await prisma.ticket_types.upsert({
      where: { key },
      update: {},
      create: {
        key,
        label,
        category_id: category_ids[category_key],
        department_id: dept_id(department_key),
        project_association: override.project_association || 'NONE',
        field_schema: DEFAULT_FIELDS,
        workflow: generic_workflow(),
        response_sla_mins: 480,
        resolution_sla_mins: 2880,
        integration_hooks: override.integration_hooks || undefined,
        sort_order: i,
      },
    });
  }

  console.log(`[seed] Ticket Desk: ${CATEGORIES.length} categories, ${bespoke_types().length + GENERIC_TYPES.length} ticket types`);
}
