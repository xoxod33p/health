'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, Check } from 'lucide-react';
import { useTheme } from './theme-provider';

interface ThemeToggleProps {
  variant?: 'icon' | 'compact' | 'segmented' | 'dropdown';
  className?: string;
}

export function ThemeToggle({ variant = 'icon', className = '' }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  if (!mounted) {
    // Avoid hydration mismatch by rendering placeholder with identical geometry
    return (
      <div className={`theme-toggle-skeleton ${className}`} aria-hidden="true" style={{ width: 34, height: 34 }} />
    );
  }

  // Variant: Segmented Control (System / Light / Dark tabs)
  if (variant === 'segmented') {
    return (
      <div className={`theme-segmented-control ${className}`} role="radiogroup" aria-label="Theme mode selection">
        <button
          type="button"
          className={`theme-segment-btn ${theme === 'light' ? 'active' : ''}`}
          onClick={() => setTheme('light')}
          aria-checked={theme === 'light'}
          role="radio"
          title="Light mode"
        >
          <Sun size={14} />
          <span>Light</span>
        </button>
        <button
          type="button"
          className={`theme-segment-btn ${theme === 'dark' ? 'active' : ''}`}
          onClick={() => setTheme('dark')}
          aria-checked={theme === 'dark'}
          role="radio"
          title="Dark mode"
        >
          <Moon size={14} />
          <span>Dark</span>
        </button>
        <button
          type="button"
          className={`theme-segment-btn ${theme === 'system' ? 'active' : ''}`}
          onClick={() => setTheme('system')}
          aria-checked={theme === 'system'}
          role="radio"
          title="Device preference (System)"
        >
          <Monitor size={14} />
          <span>System</span>
        </button>
      </div>
    );
  }

  // Variant: Dropdown Selection with System / Light / Dark
  if (variant === 'dropdown') {
    return (
      <div className={`theme-dropdown-wrapper ${className}`} ref={menuRef}>
        <button
          type="button"
          className="theme-toggle-btn icon-button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-haspopup="true"
          title={`Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)} (Current: ${resolvedTheme})`}
        >
          {resolvedTheme === 'dark' ? (
            <Moon size={17} className="theme-icon dark" />
          ) : (
            <Sun size={17} className="theme-icon light" />
          )}
        </button>

        {menuOpen && (
          <div className="theme-menu-popover">
            <button
              type="button"
              className={`theme-menu-item ${theme === 'light' ? 'active' : ''}`}
              onClick={() => {
                setTheme('light');
                setMenuOpen(false);
              }}
            >
              <div className="theme-menu-item-content">
                <Sun size={15} />
                <span>Light</span>
              </div>
              {theme === 'light' && <Check size={14} className="theme-check" />}
            </button>

            <button
              type="button"
              className={`theme-menu-item ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => {
                setTheme('dark');
                setMenuOpen(false);
              }}
            >
              <div className="theme-menu-item-content">
                <Moon size={15} />
                <span>Dark</span>
              </div>
              {theme === 'dark' && <Check size={14} className="theme-check" />}
            </button>

            <button
              type="button"
              className={`theme-menu-item ${theme === 'system' ? 'active' : ''}`}
              onClick={() => {
                setTheme('system');
                setMenuOpen(false);
              }}
            >
              <div className="theme-menu-item-content">
                <Monitor size={15} />
                <span>Device preference</span>
              </div>
              {theme === 'system' && <Check size={14} className="theme-check" />}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Variant: Icon Button (Quick toggle between light & dark, double-click or right-click to cycle system)
  return (
    <button
      type="button"
      className={`theme-toggle-btn ${className}`}
      onClick={toggleTheme}
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Current: ${theme === 'system' ? `Device preference (${resolvedTheme})` : resolvedTheme}. Click to toggle.`}
    >
      <div className="theme-icon-container">
        {resolvedTheme === 'dark' ? (
          <Moon size={17} className="theme-icon moon-icon" />
        ) : (
          <Sun size={17} className="theme-icon sun-icon" />
        )}
      </div>
    </button>
  );
}
