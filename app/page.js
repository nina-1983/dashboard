import { getClientWorkItems, getClientTasks } from '../lib/notion';
import { getFinanceSnapshot } from '../lib/quickfile';
import { getWeather } from '../lib/weather';

// Refresh at most every 5 minutes. A dashboard you open a few times a day
// doesn't need to hit Notion/QuickFile on every single load.
export const revalidate = 300;

function formatGBP(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function Notice({ children }) {
  return <p className="notice">{children}</p>;
}

function Empty({ children }) {
  return <p className="label">{children}</p>;
}

function WorkRow({ item, compact }) {
  return (
    <article className={`workrow${compact ? ' compact' : ''}`}>
      <div className="workrow-top">
        <strong>{item.client || 'Untitled'}</strong>
        {item.priority && (
          <span className={`pill pill-${item.priority.toLowerCase()}`}>{item.priority}</span>
        )}
      </div>
      {item.weekFocus && <p>{item.weekFocus}</p>}
      {item.nextStep && <p className="label">Next: {item.nextStep}</p>}
      {item.waitingOn && <p className="label">Waiting on: {item.waitingOn}</p>}
      {item.dueDate && <p className="label">Due {formatDate(item.dueDate)}</p>}
    </article>
  );
}

function TaskRow({ task, compact }) {
  return (
    <article className={`workrow${compact ? ' compact' : ''}`}>
      <div className="workrow-top">
        <strong>{task.task || 'Untitled task'}</strong>
        {task.priority && (
          <span className={`pill pill-${task.priority.toLowerCase()}`}>{task.priority}</span>
        )}
      </div>
      {task.clientName && <p className="label">{task.clientName}</p>}
      {task.notes && <p>{task.notes}</p>}
      {task.dueDate && <p className="label">Due {formatDate(task.dueDate)}</p>}
    </article>
  );
}

function InvoiceRow({ invoice }) {
  return (
    <div className="invoicerow">
      <span>{invoice.client}</span>
      <span>{formatGBP(invoice.amount)}</span>
      <span className="label">{invoice.daysOverdue}d overdue</span>
    </div>
  );
}

export default async function Page() {
  const [work, tasks, finance, weather] = await Promise.all([
    getClientWorkItems(),
    getClientTasks(),
    getFinanceSnapshot(),
    getWeather(),
  ]);

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <main>
      <header className="hero">
        <div>
          <p className="eyebrow">{today}</p>
          <h1>Good morning, Nina.</h1>
        </div>
        <form action="/api/logout" method="post">
          <button className="ghost" type="submit">
            Log out
          </button>
        </form>
      </header>

      <section className="grid">
        <div className="card tone-primary">
          <h2>Focus this week</h2>
          {work.error && <Notice>Notion: {work.error}</Notice>}
          {!work.error && work.focus.length === 0 && <Empty>Nothing marked Focus This Week.</Empty>}
          {work.focus.map((item) => (
            <WorkRow key={item.id} item={item} />
          ))}
        </div>

        <div className="card tone-primary">
          <h2>Tasks</h2>
          {tasks.error && <Notice>Notion: {tasks.error}</Notice>}
          {!tasks.error && tasks.todo.length === 0 && <Empty>Nothing open on Client Tasks.</Empty>}
          {tasks.todo.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </div>

        <div className="card tone-finance">
          <h2>Money</h2>
          {finance.error && <Notice>QuickFile: {finance.error}</Notice>}
          {!finance.error && (
            <>
              <p className="bigstat">{formatGBP(finance.totalBalance)}</p>
              <p className="label">across connected bank accounts</p>

              {finance.weekly && (
                <p className="label">
                  {formatGBP(finance.weekly.thisWeek)} in this week · {formatGBP(finance.weekly.lastWeek)} last week
                </p>
              )}

              <h2 style={{ marginTop: 18, fontSize: 16 }}>Overdue</h2>
              {finance.overdue.length === 0 && <Empty>Nothing overdue.</Empty>}
              {finance.overdue.map((inv) => (
                <InvoiceRow key={inv.id} invoice={inv} />
              ))}
            </>
          )}
        </div>

        <div className="card tone-weather">
          <h2>Weather</h2>
          {weather.error && <Notice>Weather: {weather.error}</Notice>}
          {!weather.error && (
            <>
              <p className="bigstat">{weather.tempC}°C</p>
              <p className="label">{weather.summary}</p>
            </>
          )}
        </div>

        <div className="card tone-school">
          <h2>Alfie&rsquo;s school week</h2>
          <p className="label">Lunches, clubs and key dates for Maple Class.</p>
          {process.env.NEXT_SCHOOL_PAGE_URL ? (
            <a
              className="button"
              href={process.env.NEXT_SCHOOL_PAGE_URL}
              target="_blank"
              rel="noreferrer"
            >
              Open the school page →
            </a>
          ) : (
            <Notice>Add NEXT_SCHOOL_PAGE_URL to link this to the Gobowen page.</Notice>
          )}
        </div>

        <div className="card tone-secondary full">
          <h2>With Abbey</h2>

          <h2 style={{ fontSize: 15 }}>Client work</h2>
          {!work.error && work.abbey.length === 0 && <Empty>Nothing with Abbey right now.</Empty>}
          {work.abbey.map((item) => (
            <WorkRow key={item.id} item={item} compact />
          ))}

          <h2 style={{ fontSize: 15, marginTop: 18 }}>Tasks</h2>
          {!tasks.error && tasks.abbey.length === 0 && <Empty>No tasks with Abbey right now.</Empty>}
          {tasks.abbey.map((t) => (
            <TaskRow key={t.id} task={t} compact />
          ))}
        </div>
      </section>
    </main>
  );
}
