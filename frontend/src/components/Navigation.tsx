/**
 * Navigation — top navigation bar with links to all major features.
 *
 * Features
 * --------
 * - Fixed glass-morphism header
 * - Desktop + responsive mobile menu
 * - Links: Home, Search, Analytics, Dashboard
 * - Action buttons: History sidebar, Bookmarks panel, Export, Settings
 * - Theme toggle (next-themes)
 * - Auth links (Login / Sign Up) or user avatar
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
  Home,
  Search,
  LayoutDashboard,
  Menu,
  X,
  Sparkles,
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

  // Panel / dialog state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/search', label: 'Search', icon: Search },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/collections', label: 'Collections', icon: FolderOpen },
    { href: '/plugins', label: 'Plugins', icon: Puzzle },
    { href: '/alerts', label: 'Alerts', icon: Bell },
    { href: '/trends', label: 'Trends', icon: TrendingUp },
    { href: '/api-keys', label: 'API Keys', icon: Key },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  ];

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled
            ? 'glass-strong backdrop-blur-xl shadow-lg'
            : 'bg-transparent'
        }`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" aria-label="Go to homepage">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-2 cursor-pointer"
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-8 h-8 md:w-10 md:h-10 bg-linear-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg"
                >
                  <Sparkles className="w-4 h-4 md:w-6 md:h-6 text-white" />
                </motion.div>
                <span className="text-lg md:text-xl font-bold bg-linear-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  SearchEngine
                </span>
              </motion.div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item, index) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <motion.div
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.3 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Button
                        variant={isActive ? 'default' : 'ghost'}
                        size="default"
                        className={`relative font-medium transition-all duration-300 ${
                          isActive
                            ? 'bg-linear-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                            : 'hover:bg-purple-50 dark:hover:bg-purple-950/20'
                        }`}
                      >
                        <item.icon className="w-4 h-4 mr-2" />
                        {item.label}
                        {isActive && (
                          <motion.div
                            layoutId="activeTab"
                            className="absolute inset-0 bg-linear-to-r from-purple-600 to-blue-600 rounded-md -z-10"
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                          />
                        )}
                      </Button>
                    </motion.div>
                  </Link>
                );
              })}
            </div>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-1">
              <TooltipProvider delayDuration={300}>
                {/* History */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsHistoryOpen(true)}
                      className="rounded-full"
                      aria-label="Open search history"
                    >
                      <History className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Search History</TooltipContent>
                </Tooltip>

                {/* Bookmarks */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsBookmarksOpen(true)}
                      className="rounded-full"
                      aria-label="Open bookmarks"
                    >
                      <Bookmark className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Bookmarks</TooltipContent>
                </Tooltip>

                {/* Export */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsExportOpen(true)}
                      className="rounded-full"
                      aria-label="Export search data"
                    >
                      <Download className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export</TooltipContent>
                </Tooltip>

                {/* Settings */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsSettingsOpen(true)}
                      className="rounded-full"
                      aria-label="Open settings"
                    >
                      <Settings className="w-5 h-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Settings</TooltipContent>
                </Tooltip>

                {/* Theme toggle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleTheme}
                      className="rounded-full"
                      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                    >
                      {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className="w-px h-6 bg-border mx-1" />

              <Link href="/login">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="ghost" size="default">
                    <LogIn className="w-4 h-4 mr-2" />
                    <span className="hidden lg:inline">Login</span>
                  </Button>
                </motion.div>
              </Link>

              <Link href="/register">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button variant="gradient" size="default" className="font-semibold">
                    <UserPlus className="w-4 h-4 mr-2" />
                    <span className="hidden lg:inline">Sign Up</span>
                  </Button>
                </motion.div>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <motion.div className="md:hidden" whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="md:hidden glass-strong backdrop-blur-xl border-t"
            >
              <div className="container mx-auto px-4 py-4 space-y-2">
                {navItems.map((item, index) => {
                  const isActive = pathname === item.href;
                  return (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.3 }}
                    >
                      <Link href={item.href} onClick={() => setIsMobileMenuOpen(false)}>
                        <Button
                          variant={isActive ? 'default' : 'ghost'}
                          size="default"
                          className={`w-full justify-start font-medium ${
                            isActive
                              ? 'bg-linear-to-r from-purple-600 to-blue-600 text-white shadow-lg'
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

                <div className="pt-2 border-t space-y-2">
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

                  <Button
                    variant="ghost"
                    onClick={toggleTheme}
                    className="w-full justify-start"
                  >
                    {theme === 'dark' ? (
                      <Sun className="w-4 h-4 mr-2" />
                    ) : (
                      <Moon className="w-4 h-4 mr-2" />
                    )}
                    {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                  </Button>
                </div>

                <div className="pt-2 border-t space-y-2">
                  <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start">
                      <LogIn className="w-4 h-4 mr-2" />
                      Login
                    </Button>
                  </Link>

                  <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
                    <Button variant="gradient" className="w-full font-semibold">
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

      {/* Spacer */}
      <div className="h-16" />

      {/* Panels & Dialogs */}
      <SearchHistorySidebar
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
      <BookmarksPanel
        isOpen={isBookmarksOpen}
        onClose={() => setIsBookmarksOpen(false)}
      />
      <ExportDialog open={isExportOpen} onOpenChange={setIsExportOpen} />
      <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
    </>
  );
}
