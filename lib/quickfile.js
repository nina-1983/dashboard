// QuickFile's REST API is in beta (api-beta.quickfile.co.uk). Auth is a
// personal bearer token (Account Settings > Third Party Integration > API).
//
// IMPORTANT: I built this against QuickFile's documented auth flow, but
// could not test it live (no credentials in this session) and could not
// reach their Swagger reference to confirm exact field names on the
// responses. The fetch calls and auth header are correct; the field names
// marked "ADJUST IF NEEDED" below are my best guess from the typical
// QuickFile data shape and may need a one-line fix once you add a real
// token — open https://api-beta.quickfile.co.uk/api-docs/ (logged in) to
// check field names against your actual account if the Money card shows
// blank or wrong figures.

const BASE_URL = process.env.QUICKFILE_API_BASE || 'https://api-beta.quickfile.co.uk';

async function qfFetch(path) {
  const token = process.env.QUICKFILE_API_TOKEN;
  if (!token) throw new Error('not configured (QUICKFILE_API_TOKEN)');

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: token },
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    throw new Error(`QuickFile ${path} returned ${res.status}`);
  }
  return res.json();
}

function asArray(payload, ...keys) {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
}

function sumBalances(banksPayload) {
  const banks = asArray(banksPayload, 'data', 'Banks', 'banks');
  // ADJUST IF NEEDED: balance field name
  return banks.reduce((total, b) => total + Number(b.Balance ?? b.balance ?? b.CurrentBalance ?? 0), 0);
}

function overdueInvoices(invoicesPayload) {
  const invoices = asArray(invoicesPayload, 'data', 'Invoices', 'invoices');
  const today = new Date();

  return invoices
    .map((inv) => {
      // ADJUST IF NEEDED: field names for client, amount, due date
      const dueDateRaw = inv.DueDate ?? inv.dueDate;
      const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;
      const daysOverdue = dueDate ? Math.floor((today - dueDate) / 86400000) : null;
      return {
        id: inv.InvoiceID ?? inv.id,
        client: inv.ClientName ?? inv.clientName ?? inv.ContactName ?? 'Unknown client',
        amount: Number(inv.Amount ?? inv.amount ?? inv.Total ?? 0),
        daysOverdue,
      };
    })
    .filter((inv) => inv.daysOverdue !== null && inv.daysOverdue > 0)
    .sort((a, b) => b.daysOverdue - a.daysOverdue);
}

function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sunday
  const diff = (day === 0 ? -6 : 1) - day; // Monday as start of week
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function weeklyInflow(paidPayload) {
  const invoices = asArray(paidPayload, 'data', 'Invoices', 'invoices');
  const now = new Date();
  const startThis = startOfWeek(now);
  const startLast = new Date(startThis);
  startLast.setDate(startLast.getDate() - 7);

  let thisWeek = 0;
  let lastWeek = 0;

  for (const inv of invoices) {
    // ADJUST IF NEEDED: paid-date field name
    const paidRaw = inv.PaidDate ?? inv.paidDate ?? inv.DatePaid;
    if (!paidRaw) continue;
    const paidDate = new Date(paidRaw);
    const amount = Number(inv.Amount ?? inv.amount ?? inv.Total ?? 0);
    if (paidDate >= startThis) thisWeek += amount;
    else if (paidDate >= startLast && paidDate < startThis) lastWeek += amount;
  }

  return { thisWeek, lastWeek };
}

// Returns { totalBalance, overdue, weekly, error }
export async function getFinanceSnapshot() {
  try {
    const [banks, unpaid, paid] = await Promise.all([
      qfFetch('/Banks'),
      qfFetch('/Invoices?status=UNPAID'),
      qfFetch('/Invoices?status=PAID'),
    ]);

    return {
      totalBalance: sumBalances(banks),
      overdue: overdueInvoices(unpaid),
      weekly: weeklyInflow(paid),
      error: null,
    };
  } catch (err) {
    return { totalBalance: null, overdue: [], weekly: null, error: err.message };
  }
}
