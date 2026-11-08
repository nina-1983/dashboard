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
