import prisma from '../../../shared/database/client.js';
import { PLACEHOLDER_MAP } from '../constants/placeholders.js';

// Single fetch that gathers everything any registered placeholder could
// possibly need — new placeholders that only need fields already selected
// here require zero changes to this function, only a new registry entry.
export async function build_placeholder_context(user_id) {
  const user = await prisma.users.findUnique({
    where: { id: user_id },
    select: {
      id: true, first_name: true, last_name: true, email: true, phone: true,
      employee_id: true, designation: true, salary: true, hire_date: true,
      designation_ref: { select: { id: true, name: true } },
      department: { select: { id: true, name: true } },
      grade: { select: { id: true, name: true } },
      supervisor: { select: { id: true, first_name: true, last_name: true, email: true, designation: true } },
    },
  });
  if (!user) return null;

  const [profile, company, dept_with_bu] = await Promise.all([
    prisma.employee_profiles.findUnique({ where: { user_id } }),
    prisma.company_settings.findFirst(),
    user.department?.id
      ? prisma.departments.findUnique({ where: { id: user.department.id }, select: { business_unit: { select: { id: true, name: true } } } })
      : null,
  ]);

  return {
    user,
    profile,
    designation: user.designation_ref,
    department: user.department,
    business_unit: dept_with_bu?.business_unit || null,
    grade: user.grade,
    supervisor: user.supervisor,
    company,
  };
}

// Replaces every {{token}} in `content` using the registry. Unknown tokens
// are left untouched (visibly wrong beats silently blank on a legal
// document) and reported back in `unresolved` so the caller/FE can warn.
export function render_placeholders(content, context) {
  const unresolved = [];
  const rendered = String(content || '').replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (match, token) => {
    const entry = PLACEHOLDER_MAP.get(token);
    if (!entry) {
      unresolved.push(token);
      return match;
    }
    try {
      return entry.resolve(context) ?? '';
    } catch {
      unresolved.push(token);
      return match;
    }
  });
  return { rendered, unresolved };
}

// Convenience wrapper: build context + render in one call, the shape most
// callers actually want.
export async function render_document_for_user(content, user_id) {
  const context = await build_placeholder_context(user_id);
  if (!context) return { rendered: content, unresolved: [], context: null };
  const { rendered, unresolved } = render_placeholders(content, context);
  return { rendered, unresolved, context };
}
