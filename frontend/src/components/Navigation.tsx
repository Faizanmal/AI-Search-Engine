/**
 * Navigation — fixed product chrome for Atlas Search.
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Home,
  Search,
  LayoutDashboard,
  Menu,
  X,
  LogIn,
  UserPlus,
  Moon,
  Sun,
  History,
  Bookmark,
  Download,
  Settings,
  BarChart3,
  FolderOpen,
  Puzzle,
  Bell,
  Key,
  TrendingUp,
} from 'lucide-react';
import { SearchHistorySidebar } from './SearchHistorySidebar';
import { BookmarksPanel } from './BookmarksPanel';
import { ExportDialog } from './ExportDialog';
import { SettingsDialog } from './SettingsDialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const primaryNav = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/search', label: 'Search', icon: Search },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/collections', label: 'Collections', icon: FolderOpen },
    { href: '/dashboard', label: 'Forms', icon: LayoutDashboard },
  ];

  const moreNav = [
    { href: '/plugins', label: 'Plugins', icon: Puzzle },
    { href: '/alerts', label: 'Alerts', icon: Bell },
    { href: '/trends', label: 'Trends', icon: TrendingUp },
    { href: '/api-keys', label: 'API Keys', icon: Key },
  ];

  const navItems = [...primaryNav, ...moreNav];

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      <motion.nav
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'bg-[var(--paper)]/90 backdrop-blur-md border-b border-[var(--surface-border)] shadow-[var(--shadow-sm)]'
            : 'bg-[var(--paper)]/70 backdrop-blur-sm border-b border-transparent'
        }`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="mx-auto w-full max-w-7xl px-3 sm:px-5 lg:px-7">
          <div className="flex items-center justify-between h-16 gap-3">
            <Link href="/" aria-label="Atlas Search home" className="shrink-0">
              <div className="flex items-center gap-2.5 group">
                <div className="relative w-9 h-9 rounded-lg bg-[var(--ocean-deep)] flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-[1.03]">
                  <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(197,228,239,0.35),transparent_60%)]" />
                  <Search className="relative w-4.5 h-4.5 text-white" strokeWidth={2.25} />
                </div>
                <div className="leading-none">
                  <span className="font-display text-lg font-bold tracking-tight text-[var(--ink)]">
                    Atlas
                  </span>
                  <span className="font-display text-lg font-medium tracking-tight text-[var(--ocean)] ml-1">
                    Search
                  </span>
                </div>
              </div>
            </Link>

            <div className="hidden lg:flex items-center gap-0.5 min-w-0">
              {primaryNav.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`relative font-medium px-2.5 xl:px-3 rounded-md ${
                        isActive
                          ? 'text-[var(--ocean-deep)] bg-[var(--sea-light)]/60'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                      }`}
                    >
                      <item.icon className="w-4 h-4 xl:mr-1.5" />
                      <span className="hidden xl:inline">{item.label}</span>
                      {isActive && (
                        <motion.span
                          layoutId="nav-underline"
                          className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[var(--signal)]"
                        />
                      )}
                    </Button>
                  </Link>
                );
              })}
            </div>

            <div className="hidden lg:flex items-center gap-0.5">
              <TooltipProvider delayDuration={250}>
                {[
                  { label: 'Search History', icon: History, action: () => setIsHistoryOpen(true) },
                  { label: 'Bookmarks', icon: Bookmark, action: () => setIsBookmarksOpen(true) },
                  { label: 'Export', icon: Download, action: () => setIsExportOpen(true) },
                  { label: 'Settings', icon: Settings, action: () => setIsSettingsOpen(true) },
                ].map((action) => (
                  <Tooltip key={action.label}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={action.action}
                        className="rounded-md text-muted-foreground hover:text-foreground"
                        aria-label={action.label}
                      >
                        <action.icon className="w-4.5 h-4.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{action.label}</TooltipContent>
                  </Tooltip>
                ))}

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleTheme}
                      className="rounded-md text-muted-foreground hover:text-foreground"
                      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                    >
                      {theme === 'dark' ? <Sun className="w-4.5 h-4.5" /> : <Moon className="w-4.5 h-4.5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className="w-px h-5 bg-border mx-1.5" />

              <Link href="/login" className="hidden xl:inline-flex">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                  <LogIn className="w-4 h-4 mr-1.5" />
                  Login
                </Button>
              </Link>

              <Link href="/register" className="hidden xl:inline-flex">
                <Button
                  size="sm"
                  className="font-semibold bg-[var(--signal)] hover:bg-[var(--signal-deep)] text-white rounded-md"
                >
                  <UserPlus className="w-4 h-4 mr-1.5" />
                  Sign Up
                </Button>
              </Link>
            </div>

            <div className="lg:hidden">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isMobileMenuOpen}
                className="rounded-md"
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28 }}
              className="lg:hidden border-t border-[var(--surface-border)] bg-[var(--paper)]"
            >
              <div className="mx-auto max-w-7xl px-4 py-4 space-y-1">
                {navItems.map((item, index) => {
                  const isActive = pathname === item.href;
                  return (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Link href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                        <Button
                          variant="ghost"
                          className={`w-full justify-start font-medium rounded-md ${
                            isActive
                              ? 'bg-[var(--sea-light)]/70 text-[var(--ocean-deep)]'
                              : ''
                          }`}
                        >
                          <item.icon className="w-4 h-4 mr-2" />
                          {item.label}
                        </Button>
                      </Link>
                    </motion.div>
                  );
                })}

                <div className="pt-3 mt-2 border-t border-[var(--surface-border)] space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsHistoryOpen(true);
                    }}
                  >
                    <History className="w-4 h-4 mr-2" />
                    Search History
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsBookmarksOpen(true);
                    }}
                  >
                    <Bookmark className="w-4 h-4 mr-2" />
                    Bookmarks
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsExportOpen(true);
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setIsSettingsOpen(true);
                    }}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Button>
                  <Button variant="ghost" onClick={toggleTheme} className="w-full justify-start">
                    {theme === 'dark' ? (
                      <Sun className="w-4 h-4 mr-2" />
                    ) : (
                      <Moon className="w-4 h-4 mr-2" />
                    )}
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </Button>
                </div>

                <div className="pt-3 mt-2 border-t border-[var(--surface-border)] space-y-2">
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <LogIn className="w-4 h-4 mr-2" />
                      Login
                    </Button>
                  </Link>
                  <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button className="w-full font-semibold bg-[var(--signal)] hover:bg-[var(--signal-deep)] text-white">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Sign Up
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      <SearchHistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectEntry={(entry) => {
          setIsHistoryOpen(false);
          router.push(`/search?history=${entry.id}`);
        }}
      />
      <BookmarksPanel
        isOpen={isBookmarksOpen}
        onClose={() => setIsBookmarksOpen(false)}
        onSelectBookmark={(bookmark) => {
          setIsBookmarksOpen(false);
          const id = bookmark.search_query?.id;
          if (id) router.push(`/search?history=${id}`);
        }}
      />
      <ExportDialog open={isExportOpen} onOpenChange={setIsExportOpen} />
      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </>
  );
}
