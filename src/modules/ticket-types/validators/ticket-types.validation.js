export const PROJECT_ASSOCIATIONS = ['NONE', 'OPTIONAL', 'REQUIRED'];

function is_valid_field_schema(field_schema) {
  if (!Array.isArray(field_schema)) return false;
  return field_schema.every((section) =>
    section && typeof section.section === 'string' && Array.isArray(section.fields) &&
    section.fields.every((f) => f && typeof f.key === 'string' && typeof f.label === 'string' && typeof f.type === 'string'));
}

function is_valid_workflow(workflow) {
  if (!Array.isArray(workflow) || workflow.length === 0) return false;
  return workflow.every((s) => s && typeof s.key === 'string' && typeof s.label === 'string');
}

export function validate_ticket_type(body, { is_update = false } = {}) {
  if (!is_update) {
    if (!body?.key?.trim()) return { valid: false, message: 'key is required' };
    if (!body?.category_id?.trim()) return { valid: false, message: 'category_id is required' };
  }
  if (!is_update && !body?.label?.trim()) return { valid: false, message: 'label is required' };
  if (body.project_association !== undefined && !PROJECT_ASSOCIATIONS.includes(body.project_association)) {
    return { valid: false, message: `project_association must be one of ${PROJECT_ASSOCIATIONS.join(', ')}` };
  }
  if (!is_update || body.field_schema !== undefined) {
    if (!is_valid_field_schema(body.field_schema)) {
      return { valid: false, message: 'field_schema must be an array of { section, fields: [{key,label,type}] }' };
    }
  }
  if (!is_update || body.workflow !== undefined) {
    if (!is_valid_workflow(body.workflow)) {
      return { valid: false, message: 'workflow must be a non-empty array of { key, label }' };
    }
  }
  return { valid: true };
}

// Validates a ticket's custom_fields against a (possibly snapshotted) field_schema —
// reused both at creation (live ticket_type.field_schema) and anywhere the
// snapshot needs re-checking. Rejects unknown keys and missing required fields.
export function validate_custom_fields(field_schema, custom_fields = {}) {
  const known_keys = new Set();
  const missing = [];
  for (const section of field_schema || []) {
    for (const f of section.fields || []) {
      known_keys.add(f.key);
      const value = custom_fields ? custom_fields[f.key] : undefined;
      const is_empty = value === undefined || value === null || value === ''
        || (Array.isArray(value) && value.length === 0);
      if (f.required && is_empty) {
        missing.push(f.label || f.key);
      }
    }
  }
  const unknown = Object.keys(custom_fields || {}).filter((k) => !known_keys.has(k));
  if (missing.length) return { valid: false, message: `Missing required field(s): ${missing.join(', ')}` };
  if (unknown.length) return { valid: false, message: `Unknown custom field(s): ${unknown.join(', ')}` };
  return { valid: true };
}

// Validates a status transition against a workflow definition (an array of
// {key,label,requires_approval?,approver_role?}) — used against the ticket's
// OWN type_snapshot.workflow, never the live ticket_type, so historical
// tickets keep validating against the workflow as it existed when created.
export function validate_workflow_transition(workflow, current_status, new_status) {
  const steps = Array.isArray(workflow) ? workflow : [];
  const current_step = steps.find((s) => s.key === current_status);
  const target_step = steps.find((s) => s.key === new_status);
  if (!target_step) return { valid: false, message: `Invalid workflow transition: "${new_status}" is not a step in this ticket's workflow` };
  if (current_step?.requires_approval) {
    return { valid: false, message: `Cannot change status directly — "${current_step.label}" requires approval. Use the approvals endpoint.` };
  }
  return { valid: true, target_step };
}
