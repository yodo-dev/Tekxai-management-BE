import { run_ticket_sla_escalation } from '../../compliance-escalation/services/compliance-escalation.service.js';

// Thin wrapper so the scheduler and any manual trigger share the exact same
// engine entry point (compliance-escalation.service.js — the escalation
// engine is generic across entity types, tickets included).
export async function run_ticket_sla_escalation_job() {
  return run_ticket_sla_escalation();
}
