import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard' },
  { to: '/discover', label: 'Discover Buyers' },
  { to: '/buyers', label: 'Buyer Leads' },
  { to: '/campaigns', label: 'Campaigns' },
  { to: '/emails', label: 'Email Logs' },
  { to: '/reports', label: 'Weekly Report' },
];

export default function Layout({ children }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-navy text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-cyan-300">API EXPORT</p>
            <h1 className="text-xl font-bold">Buyer Outreach Platform</h1>
          </div>
          <p className="hidden text-sm text-slate-300 md:block">Export lead generation · validation · Gmail outreach</p>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="card sticky top-6 space-y-1 p-3">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2 text-sm font-medium ${
                    isActive ? 'bg-cyan-50 text-cyan-700' : 'text-slate-600 hover:bg-slate-50'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white md:hidden">
        <div className="flex overflow-x-auto">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `flex-1 whitespace-nowrap px-3 py-3 text-center text-xs font-medium ${
                  isActive ? 'text-cyan-700' : 'text-slate-500'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
