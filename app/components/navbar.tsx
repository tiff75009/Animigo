"use client";

import { cn } from "@/app/lib/utils";
import { navLinks } from "@/app/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Search, Heart, Sparkles } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);

  const handleScroll = useCallback(() => {
    setIsScrolled(window.scrollY > 20);
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <>
      <motion.nav
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className={cn(
          "fixed top-4 left-4 right-4 z-50 transition-all duration-500 rounded-2xl",
          isScrolled
            ? "bg-white/70 backdrop-blur-xl shadow-lg shadow-primary/10 border border-white/50"
            : "bg-white/40 backdrop-blur-md"
        )}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <motion.a
              href="#"
              className="flex items-center gap-3 group"
              whileHover={{ scale: 1.02 }}
            >
              {/* Animated paw logo */}
              <div className="relative">
                <motion.div
                  className="w-11 h-11 bg-gradient-to-br from-primary to-secondary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30"
                  whileHover={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.5 }}
                >
                  <motion.span
                    className="text-xl"
                    animate={{ y: [0, -2, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    🐾
                  </motion.span>
                </motion.div>
                {/* Sparkle effect */}
                <motion.div
                  className="absolute -top-1 -right-1 text-xs"
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
                  transition={{ duration: 3, repeat: Infinity }}
                >
                  ✨
                </motion.div>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold text-foreground leading-tight">
                  Anim<span className="text-primary">igo</span>
                </span>
                <span className="text-[10px] text-text-light font-medium -mt-1 hidden sm:block">
                  Le bonheur de vos animaux
                </span>
              </div>
            </motion.a>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  className="relative px-4 py-2 rounded-xl font-medium text-foreground/70 hover:text-foreground transition-colors"
                  onHoverStart={() => setHoveredLink(link.href)}
                  onHoverEnd={() => setHoveredLink(null)}
                  whileHover={{ y: -2 }}
                >
                  <span className="relative z-10 flex items-center gap-2">
                    <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                      {link.emoji}
                    </span>
                    {link.label}
                  </span>
                  {/* Animated background on hover */}
                  <AnimatePresence>
                    {hoveredLink === link.href && (
                      <motion.div
                        layoutId="navHover"
                        className="absolute inset-0 bg-primary/10 rounded-xl"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      />
                    )}
                  </AnimatePresence>
                  {/* Underline effect */}
                  <motion.div
                    className="absolute bottom-1 left-4 right-4 h-0.5 bg-gradient-to-r from-primary to-secondary rounded-full"
                    initial={{ scaleX: 0 }}
                    whileHover={{ scaleX: 1 }}
                    transition={{ duration: 0.2 }}
                  />
                </motion.a>
              ))}
            </div>

            {/* Desktop CTAs */}
            <div className="hidden lg:flex items-center gap-3">
              <motion.a
                href="#"
                className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-foreground/80 hover:text-primary transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Heart className="w-4 h-4" />
                <span>Devenir garde</span>
              </motion.a>
              <motion.a
                href="#"
                className="group flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all"
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
              >
                <Search className="w-4 h-4" />
                <span>Trouver un garde</span>
                <motion.span
                  className="text-sm"
                  animate={{ x: [0, 3, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  →
                </motion.span>
              </motion.a>
            </div>

            {/* Mobile Menu Button */}
            <motion.button
              className="lg:hidden p-2.5 rounded-xl bg-primary/10 text-primary"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <AnimatePresence mode="wait">
                {isMobileMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X size={22} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu size={22} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Menu - Full screen overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 lg:hidden"
          >
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-background/80 backdrop-blur-xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
            />

            {/* Menu content */}
            <motion.div
              className="absolute top-24 left-4 right-4 bg-white rounded-3xl shadow-2xl shadow-primary/20 p-6 border border-primary/10"
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {/* Links */}
              <div className="space-y-2">
                {navLinks.map((link, index) => (
                  <motion.a
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-4 p-4 rounded-2xl hover:bg-primary/5 transition-colors group"
                    onClick={() => setIsMobileMenuOpen(false)}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <span className="text-2xl group-hover:scale-110 transition-transform">
                      {link.emoji}
                    </span>
                    <span className="font-semibold text-foreground text-lg">
                      {link.label}
                    </span>
                  </motion.a>
                ))}
              </div>

              {/* Divider */}
              <div className="my-6 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />

              {/* CTAs */}
              <div className="space-y-3">
                <motion.a
                  href="#"
                  className="flex items-center justify-center gap-2 w-full p-4 rounded-2xl font-semibold text-primary border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 transition-all"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Heart className="w-5 h-5" />
                  Devenir garde
                </motion.a>
                <motion.a
                  href="#"
                  className="flex items-center justify-center gap-2 w-full p-4 rounded-2xl font-semibold text-white bg-gradient-to-r from-primary to-secondary shadow-lg shadow-primary/30"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Search className="w-5 h-5" />
                  Trouver un garde
                  <Sparkles className="w-4 h-4" />
                </motion.a>
              </div>

              {/* Fun decoration */}
              <motion.div
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-2xl"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🐕
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
