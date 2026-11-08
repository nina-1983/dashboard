import { Client } from '@notionhq/client';

// "High" should sort first on the dashboard, but Notion's own default sort
// is alphabetical (High, Low, Medium) — wrong order. Rank explicitly.
const PRIORITY_RANK = { High: 0, Medium: 1, Low: 2 };

function getClient() {
  if (!process.env.NOTION_TOKEN) return null;
  return new Client({ auth: process.env.NOTION_TOKEN });
}

function richText(arr) {
  if (!arr || !arr.length) return '';
  return arr.map((t) => t.plain_text).join('');
}

function normalize(pages) {
  return pages
    .map((page) => {
      const p = page.properties;
      return {
        id: page.id,
        client: richText(p['Clients']?.title),
        type: p['Type']?.select?.name ?? null,
        weekFocus: richText(p['This Week Focus']?.rich_text),
        nextStep: richText(p['Next Step']?.rich_text),
        waitingOn: richText(p['Waiting On']?.rich_text),
        priority: p['Priority']?.select?.name ?? null,
        dueDate: p['Due Date']?.date?.start ?? null,
        url: page.url,
      };
    })
    .sort((a, b) => {
      const pa = PRIORITY_RANK[a.priority] ?? 3;
      const pb = PRIORITY_RANK[b.priority] ?? 3;
      if (pa !== pb) return pa - pb;
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });
}

// Returns { focus, abbey, error }. `focus` is Nina's own Status = "Focus
// This Week" items; `abbey` is Status = "With Abbey", kept separate on
// purpose — delegated work, visible but not mixed into Nina's own list.
export async function getClientWorkItems() {
  const notion = getClient();
  const databaseId = process.env.NOTION_CLIENT_BOARD_DB_ID;

  if (!notion || !databaseId) {
    return { focus: [], abbey: [], error: 'not configured (NOTION_TOKEN / NOTION_CLIENT_BOARD_DB_ID)' };
  }

  try {
    const [focusRes, abbeyRes] = await Promise.all([
      notion.databases.query({
        database_id: databaseId,
        filter: { property: 'Status', select: { equals: 'Focus This Week' } },
      }),
      notion.databases.query({
        database_id: databaseId,
        filter: { property: 'Status', select: { equals: 'With Abbey' } },
      }),
    ]);

    return {
      focus: normalize(focusRes.results),
      abbey: normalize(abbeyRes.results),
      error: null,
    };
  } catch (err) {
    return { focus: [], abbey: [], error: err.message };
  }
}

function normalizeTasks(pages) {
  return pages.map((page) => {
    const p = page.properties;
    const clientRelation = p['Client']?.relation;
    return {
      id: page.id,
      task: richText(p['Task']?.title),
      status: p['Status']?.status?.name ?? null,
      priority: p['Priority']?.select?.name ?? null,
      dueDate: p['Due']?.date?.start ?? null,
      notes: richText(p['Notes']?.rich_text),
      abbey: p['Abbey?']?.checkbox === true,
      clientPageId: clientRelation?.[0]?.id ?? null,
      clientName: null,
      url: page.url,
    };
  });
}

function taskSort(a, b) {
  const pa = PRIORITY_RANK[a.priority] ?? 3;
  const pb = PRIORITY_RANK[b.priority] ?? 3;
  if (pa !== pb) return pa - pb;
  if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
  if (a.dueDate) return -1;
  if (b.dueDate) return 1;
  return 0;
}

// The "Client" field is a relation (a link to a page on the Client Work
// Board), not plain text — Notion's API returns it as a page ID, not a
// name. Resolve each unique client page once (deduplicated) rather than
// per task, so a list of a dozen tasks across three clients costs three
// lookups, not twelve.
async function attachClientNames(notion, tasks) {
  const ids = [...new Set(tasks.map((t) => t.clientPageId).filter(Boolean))];
  if (ids.length === 0) return tasks;

  const entries = await Promise.all(
    ids.map(async (id) => {
      try {
        const page = await notion.pages.retrieve({ page_id: id });
        const name = richText(page.properties?.['Clients']?.title) || 'Unknown client';
        return [id, name];
      } catch {
        return [id, 'Unknown client'];
      }
    })
  );
  const nameMap = new Map(entries);

  return tasks.map((t) => ({
    ...t,
    clientName: t.clientPageId ? nameMap.get(t.clientPageId) ?? 'Unknown client' : null,
  }));
}

// Returns { todo, abbey, error }. Only "To do" and "Doing" tasks surface —
// "Park for now" is a deliberate defer and "Done" is, well, done, so
// neither belongs on a daily brief. Split by the "Abbey?" checkbox, same
// pattern as the Client Work Board.
export async function getClientTasks() {
  const notion = getClient();
  const databaseId = process.env.NOTION_CLIENT_TASKS_DB_ID;

  if (!notion || !databaseId) {
    return { todo: [], abbey: [], error: 'not configured (NOTION_TOKEN / NOTION_CLIENT_TASKS_DB_ID)' };
  }

  try {
    const res = await notion.databases.query({ database_id: databaseId });

    const active = res.results.filter((page) => {
      const status = page.properties['Status']?.status?.name;
      return status === 'To do' || status === 'Doing';
    });

    const normalized = normalizeTasks(active);
    const withNames = await attachClientNames(notion, normalized);

    return {
      todo: withNames.filter((t) => !t.abbey).sort(taskSort),
      abbey: withNames.filter((t) => t.abbey).sort(taskSort),
      error: null,
    };
  } catch (err) {
    return { todo: [], abbey: [], error: err.message };
  }
}
