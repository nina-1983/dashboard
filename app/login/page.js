export default function LoginPage({ searchParams }) {
  const error = searchParams?.error;

  return (
    <main className="login">
      <form className="login-card" action="/api/login" method="post">
        <h1>The Dashboard</h1>
        <p className="label">Enter your password to continue.</p>
        {error === '1' && <p className="notice">That password didn&rsquo;t match. Try again.</p>}
        {error === 'config' && (
          <p className="notice">DASHBOARD_PASSWORD isn&rsquo;t set in Vercel yet.</p>
        )}
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <input type="password" name="password" placeholder="Password" required autoFocus />
        <button type="submit">Enter</button>
      </form>
    </main>
  );
}
