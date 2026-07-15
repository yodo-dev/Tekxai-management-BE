export function validate_asset(body) {
  if (!body?.name?.trim()) return { valid: false, message: 'Asset name required' };
  if (!body?.category_id?.trim()) return { valid: false, message: 'Category required' };
  return { valid: true };
}

export function validate_assignment(body) {
  if (!body?.user_id?.trim()) return { valid: false, message: 'user_id required' };
  return { valid: true };
}

// Mirrors the existing storage-module denylist pattern (upload-validation.js's
// dangerous-extension blocklist) — not a new validation architecture.
const PROHIBITED_MEDICINE_TERMS = [
  'paracetamol', 'ibuprofen', 'antibiotic', 'amoxicillin', 'aspirin',
  'prescription', 'eye drop', 'injectable', 'injection', 'pain killer',
  'painkiller', 'allergy medicine', 'antihistamine', 'panadol', 'disprin',
  'brufen', 'augmentin', 'flagyl', 'insulin', 'morphine', 'antibiotics',
];

export function is_prohibited_medicine(text) {
  const lower = (text || '').toLowerCase();
  return PROHIBITED_MEDICINE_TERMS.some((term) => lower.includes(term));
}

// Tracking-type-aware rules (Safety & Compliance) — called by the service
// layer once the asset's category is known, since the rule depends on
// category.tracking_type, not on the request body alone.
export function validate_tracking_type_rules(category, body, { is_update = false } = {}) {
  if (category.tracking_type === 'SERIALIZED') return { valid: true };

  // QUANTITY tracking
  if (body.asset_tag) {
    return { valid: false, message: 'Quantity-based assets (category tracking_type=QUANTITY) do not use an asset tag' };
  }
  if (!is_update && (body.required_quantity === undefined || body.required_quantity === null)) {
    return { valid: false, message: 'required_quantity is required for quantity-based assets' };
  }
  for (const field of ['required_quantity', 'current_quantity', 'minimum_quantity', 'reorder_quantity']) {
    if (body[field] !== undefined && body[field] !== null && (+body[field] < 0 || Number.isNaN(+body[field]))) {
      return { valid: false, message: `${field} must be a non-negative number` };
    }
  }
  return { valid: true };
}

// Medicines must never be stored, regardless of category — checked whenever
// the category is Medical/First-Aid-adjacent (by name/code).
export function validate_not_a_medicine(category, body) {
  const is_medical_category = /medical|first.?aid/i.test(category.name) || /medical|first_aid/i.test(category.code);
  if (!is_medical_category) return { valid: true };
  const text = `${body.name || ''} ${body.description || body.notes || ''}`;
  if (is_prohibited_medicine(text)) {
    return { valid: false, message: 'Medicines/prescription drugs are prohibited — only First Aid equipment and supplies are allowed in this category' };
  }
  return { valid: true };
}
