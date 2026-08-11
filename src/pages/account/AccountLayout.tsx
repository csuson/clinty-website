import { NavLink, Outlet } from 'react-router-dom'
import { isAdminEmail } from '../../constants/admin'
import { useAuth } from '../../context/AuthContext'

const tabs = [
  {
    to: '/account',
    label: 'Account Settings',
    end: true,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    to: '/account/integrations',
    label: 'Integrations',
    end: true,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    to: '/account/billing',
    label: 'Billing',
    end: false,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    to: '/account/api-keys',
    label: 'API Keys',
    end: false,
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
      </svg>
    ),
  },
]

export default function AccountLayout() {
  const { profile, user, signOut } = useAuth()
  const showAdmin = isAdminEmail(user?.email)
  const navTabs = showAdmin
    ? [
        ...tabs,
        {
          to: '/admin',
          label: 'Admin',
          end: true,
          icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          ),
        },
      ]
    : tabs

  return (
    <div className="pt-28 pb-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
          <div>
            <h1 className="font-serif text-3xl md:text-4xl text-navy-900 mb-1">
              {profile?.full_name ? `${profile.full_name.split(' ')[0]}'s Account` : 'Your Account'}
            </h1>
            <p className="text-navy-600 text-sm">{profile?.email}</p>
          </div>
          <button
            onClick={() => signOut()}
            className="text-sm font-medium border border-navy-900/15 text-navy-900 px-4 py-2 rounded-lg hover:bg-navy-900/5 transition-colors self-start"
          >
            Sign Out
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          <nav className="md:w-56 shrink-0">
            <ul className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
              {navTabs.map((tab) => (
                <li key={tab.to} className="shrink-0">
                  <NavLink
                    to={tab.to}
                    end={tab.end}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                        isActive
                          ? 'bg-navy-900 text-cream'
                          : 'text-navy-600 hover:bg-navy-900/5 hover:text-navy-900'
                      }`
                    }
                  >
                    {tab.icon}
                    {tab.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex-1 min-w-0">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}
