import { fetch_weekly_update_events } from './providers/weekly-update.provider.js';
import { fetch_discussion_events } from './providers/discussions.provider.js';
import { fetch_meeting_events } from './providers/meetings.provider.js';
import { fetch_activity_events } from './providers/activity.provider.js';

// Each provider owns fetching + normalizing exactly one communication
// source into CommunicationEvent[]. Adding a new source means adding one
// provider file and one entry here — the aggregator itself never grows.
const PROVIDERS = [
  fetch_weekly_update_events,
  fetch_discussion_events,
  fetch_meeting_events,
  fetch_activity_events,
];

// Pure aggregation — this function must never write to the database. Writes
// for each source go through that source's own dedicated endpoint; this is
// read-only composition only.
export async function get_project_communication_timeline(project_id) {
  const results = await Promise.all(PROVIDERS.map((provider) => provider(project_id)));
  const events = results.flat();

  events.sort((a, b) => new Date(b.date) - new Date(a.date));

  return { records: events, total: events.length };
}
