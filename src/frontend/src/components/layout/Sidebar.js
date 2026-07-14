import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/',        icon: '⊞',  label: 'Home',      exact: true },
  { to: '/movies',  icon: '▦',  label: 'All Movies' },
  { to: '/discover', icon: '◈', label: 'Discover' },
  { to: '/search',  icon: '⌕',  label: 'Search' },
  { to: '/trending', icon: '↑', label: 'Trending' },
  { to: '/watchlist', icon: '♥', label: 'Watchlist' },
];

const adminItems = [
  { to: '/admin/movies', icon: '⚙', label: 'Manage Movies' },
];

export default function Sidebar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="nav-sidebar">
      {/* Logo */}
      <div className="nav-logo">
        <span className="text-2xl">◈</span>
        <div>
          <div className="logo-text font-display font-extrabold text-[var(--primary)]">
            The Curator
          </div>
          <span>Premium Screening</span>
        </div>
      </div>

      {/* Nav Items */}
      <div className="flex-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon text-[1.2rem]">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}

        {isAdmin && (
          <>
            <div className="divider" />
            <div className="mb-2 px-4 text-xs uppercase text-[var(--on-surface-variant)]">Admin</div>
            {adminItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              >
                <span className="nav-icon text-[1.2rem]">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </>
        )}
      </div>

      {/* User Profile */}
      <div className="mt-auto">
        <div className="divider" />
        {user ? (
          <div className="flex flex-col gap-2">
            <NavLink
              to="/profile"
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--primary),var(--secondary))] text-xs font-bold text-black">
                {(user.full_name?.[0] || user.email?.[0] || 'U').toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <div className="truncate whitespace-nowrap text-sm font-semibold text-[var(--on-surface)]">
                  {user.full_name || user.email?.split('@')[0]}
                </div>
                <div className="text-[0.6875rem] text-[var(--on-surface-variant)]">Cinema Curator</div>
              </div>
            </NavLink>
            <button
              onClick={handleLogout}
              className="nav-item btn-ghost w-full border-none bg-transparent text-left"
            >
              <span className="nav-icon">⏻</span>
              <span>Logout</span>
            </button>
          </div>
        ) : (
          <NavLink to="/login" className="nav-item">
            <span className="nav-icon">→</span>
            <span>Sign In</span>
          </NavLink>
        )}
      </div>
    </nav>
  );
}
