'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Github, Star, Menu, X, ArrowUpRight, Heart, Code, Eye, X as CloseIcon } from 'lucide-react'
import { PreviewRail } from './components/preview-rail'
import type { PreviewRailItem } from './components/preview-rail'
import styles from './page.module.css'

const NAV_ITEMS = [
  { label: 'Components', href: '#components' },
  { label: 'Sponsorships', href: 'https://github.com/sponsors/sandeepannandi', external: true },
]

const COMPONENT_LIST = [
  {
    id: 'preview-rail',
    title: 'Preview Rail',
    description: 'A navigation rail that shows live previews on hover — perfect for showcasing sections, themes, or pages.',
    icon: 'LayoutGrid',
  },
  { id: 'coming-soon-1', title: 'Coming Soon', description: 'Another polished component on its way.', icon: 'Box' },
  { id: 'coming-soon-2', title: 'Coming Soon', description: 'Stay tuned for more motion components.', icon: 'Box' },
  { id: 'coming-soon-3', title: 'Coming Soon', description: 'More animations landing shortly.', icon: 'Box' },
]

const PREVIEW_RAIL_ITEMS: PreviewRailItem[] = [
  { id: 'hero', label: 'Hero', description: 'Full-screen hero section with animated typography and a platform toggle.', href: '#' },
  { id: 'cards', label: 'Cards', description: 'Animated card grid with spring-based hover effects and layout transitions.', href: '#' },
  { id: 'nav', label: 'Nav', description: 'Sticky navigation bar with blur backdrop and smooth mobile menu.', href: '#' },
]

const COMPONENT_CODE: Record<string, string> = {
  'preview-rail': `"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useId, useState, type ReactNode } from "react";
import { EASE_OUT, SPRING_LAYOUT } from "@/lib/ease";
import { useHoverCapable } from "@/lib/hooks/use-hover-capable";
import { cn } from "@/lib/utils";

export interface PreviewRailItem {
  id: string;
  label: string;
  description?: ReactNode;
  href: string;
  target?: "_blank" | "_self" | "_parent" | "_top";
  rel?: string;
}

export interface PreviewRailProps {
  items: PreviewRailItem[];
  orientation?: "vertical" | "horizontal";
  activeId?: string;
  defaultActiveId?: string;
  onActiveChange?: (id: string) => void;
  renderPreview?: (item: PreviewRailItem) => ReactNode;
  children?: ReactNode;
  className?: string;
  railClassName?: string;
  previewClassName?: string;
}

function DefaultPreview({ item }: { item: PreviewRailItem }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="font-medium text-card-foreground">{item.label}</p>
      {item.description ? (
        <div className="mt-1 text-sm leading-6 text-muted-foreground">
          {item.description}
        </div>
      ) : null}
    </div>
  );
}

export function PreviewRail({
  items,
  orientation = "vertical",
  activeId,
  defaultActiveId,
  onActiveChange,
  renderPreview,
  children,
  className,
  railClassName,
  previewClassName,
}: PreviewRailProps) {
  const uid = useId();
  const reduce = useReducedMotion();
  const canHover = useHoverCapable();
  const [internalActiveId, setInternalActiveId] = useState(
    defaultActiveId ?? items[0]?.id ?? "",
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const requestedActiveId = activeId ?? internalActiveId;
  const selectedId = items.some((item) => item.id === requestedActiveId)
    ? requestedActiveId
    : (items[0]?.id ?? "");
  const displayedId = hoveredId ?? focusedId ?? "";
  const displayedIndex = items.findIndex((item) => item.id === displayedId);
  const rowTemplate = items.length
    ? \`repeat(\${items.length}, 1.25rem)\`
    : undefined;
  const isHorizontal = orientation === "horizontal";

  const selectItem = (id: string) => {
    if (activeId === undefined) setInternalActiveId(id);
    onActiveChange?.(id);
  };

  return (
    <motion.div
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocusedId(null);
        }
      }}
      className={cn(
        "isolate relative flex w-full overflow-visible",
        isHorizontal
          ? "min-h-64 flex-col items-center justify-center"
          : "min-h-80",
        className,
      )}
    >
      <nav
        aria-label="Section navigation"
        onPointerLeave={() => setHoveredId(null)}
        style={
          isHorizontal
            ? { gridTemplateColumns: rowTemplate }
            : { gridTemplateRows: rowTemplate }
        }
        className={cn(
          "relative z-10 grid shrink-0",
          isHorizontal
            ? "h-12 w-fit max-w-full self-center justify-center"
            : "w-12 content-center",
          railClassName,
        )}
      >
        {items.map((item, index) => {
          const selected = item.id === selectedId;
          const displayed = item.id === displayedId;
          const highlighted = displayed;
          const distance =
            displayedIndex < 0 ? Number.POSITIVE_INFINITY : Math.abs(index - displayedIndex);
          const scale = highlighted
            ? 1
            : distance === 1
              ? 0.68
              : distance === 2
                ? 0.44
                : 0.25;

          return (
            <a
              key={item.id}
              href={item.href}
              target={item.target}
              rel={
                item.rel ??
                (item.target === "_blank" ? "noreferrer noopener" : undefined)
              }
              aria-label={item.label}
              aria-current={selected ? "page" : undefined}
              onPointerEnter={() => {
                if (canHover) setHoveredId(item.id);
              }}
              onPointerDown={() => setFocusedId(null)}
              onFocus={(event) => {
                if (event.currentTarget.matches(":focus-visible")) {
                  setFocusedId(item.id);
                }
              }}
              onClick={() => selectItem(item.id)}
              className={cn(
                "relative flex text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isHorizontal
                  ? "h-12 w-5 items-end justify-center"
                  : "h-5 w-12 items-center",
              )}
            >
              <motion.span
                aria-hidden="true"
                animate={isHorizontal ? { scaleY: scale } : { scaleX: scale }}
                transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                className={cn(
                  "block bg-current",
                  isHorizontal
                    ? "h-12 w-0.5 origin-bottom"
                    : "h-0.5 w-12 origin-left",
                  highlighted ? "text-foreground" : undefined,
                )}
              />
            </a>
          );
        })}
      </nav>

      <div
        aria-hidden="true"
        style={
          isHorizontal
            ? { gridTemplateColumns: rowTemplate }
            : { gridTemplateRows: rowTemplate }
        }
        className={cn(
          "pointer-events-none absolute z-50 grid",
          isHorizontal
            ? "top-1/2 left-1/2 h-5 w-fit max-w-full -translate-x-1/2 -translate-y-1/2 justify-center"
            : "inset-y-0 right-4 left-16 content-center",
        )}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "relative flex h-5 items-center",
              isHorizontal ? "w-5 justify-center" : undefined,
            )}
          >
            {item.id === displayedId ? (
              <div
                className={cn(
                  isHorizontal
                    ? "absolute bottom-12 left-1/2 w-72 -translate-x-1/2"
                    : "w-full max-w-sm",
                  previewClassName,
                )}
              >
                <motion.div
                  layoutId={\`preview-rail-card-\${uid}\`}
                  transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={item.id}
                      initial={
                        reduce
                          ? { opacity: 0 }
                          : { opacity: 0, y: 4, filter: "blur(6px)" }
                      }
                      animate={
                        reduce
                          ? { opacity: 1 }
                          : { opacity: 1, y: 0, filter: "blur(0px)" }
                      }
                      exit={
                        reduce
                          ? { opacity: 0 }
                          : {
                              opacity: 0,
                              y: -2,
                              filter: "blur(4px)",
                              transition: {
                                duration: 0.12,
                                ease: EASE_OUT,
                              },
                            }
                      }
                      transition={{
                        duration: reduce ? 0 : 0.18,
                        ease: EASE_OUT,
                      }}
                    >
                      {renderPreview ? (
                        renderPreview(item)
                      ) : (
                        <DefaultPreview item={item} />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </motion.div>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {children ? (
        <div className="min-h-0 min-w-0 flex-1">{children}</div>
      ) : null}
    </motion.div>
  );
}`,
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'web' | 'mobile'>('web')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)
  const [modalMode, setModalMode] = useState<'preview' | 'code'>('preview')
  const [codeCopied, setCodeCopied] = useState(false)

  return (
    <div className={styles.page}>
      {/* Header */}
      <motion.header
        className={styles.header}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <img src="/icon.png" alt="" className={styles.logoIcon} />
            <span className={styles.logoText}>Nativelet</span>
          </div>

          {/* Desktop Nav */}
          <nav className={styles.desktopNav}>
            {NAV_ITEMS.map((item) => (
              <motion.a
                key={item.label}
                href={item.href}
                className={styles.navLink}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                whileHover={{ y: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <span>{item.label}</span>
              </motion.a>
            ))}
            <motion.a
              href="https://github.com/sandeepannandi/Nativelet"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.navGithub}
              whileHover={{ y: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <Github size={16} />
              <span>GitHub</span>
              <span className={styles.githubBadge}>
                <Star size={12} />
                <span>17</span>
              </span>
            </motion.a>
          </nav>

          {/* Mobile Menu Button */}
          <button
            className={styles.mobileMenuBtn}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              className={styles.mobileNav}
              initial={{ maxHeight: 0, opacity: 0 }}
              animate={{ maxHeight: 400, opacity: 1 }}
              exit={{ maxHeight: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
            <div className={styles.mobileNavInner}>
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className={styles.mobileNavLink}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noopener noreferrer' : undefined}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span>{item.label}</span>
                </a>
              ))}
              <div className={styles.mobileNavDivider} />
              <a href="https://github.com/sandeepannandi/Nativelet" target="_blank" rel="noopener noreferrer" className={styles.mobileNavGithub}>
                <Github size={16} />
                <span>GitHub</span>
                <span className={styles.mobileGithubBadge}>
                  <Star size={12} />
                  <span>17</span>
                </span>
              </a>
            </div>
          </motion.nav>
        )}
        </AnimatePresence>
      </motion.header>

      <main>
        {/* Hero */}
        <section className={styles.hero}>
          <motion.div
            className={styles.heroContent}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              className={styles.badge}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Free & Open Source
            </motion.div>

            <h1 className={styles.heroTitle}>
              The motion toolkit for{' '}
              <span>Next.js</span>
              {' '}&{' '}
              <span>React Native</span>
            </h1>

            <p className={styles.heroSubtitle}>
              Copy-paste animated components built on{' '}
              <strong>Framer Motion</strong> and <strong>Animated</strong>.
              <br />Free and open source.
            </p>

            {/* Platform Toggle */}
            <motion.div
              className={styles.toggleWrapper}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div className={styles.toggle}>
                <motion.div
                  className={styles.toggleBg}
                  animate={{ x: activeTab === 'web' ? 0 : '100%' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30, mass: 0.8 }}
                />
                <button
                  className={`${styles.toggleBtn} ${activeTab === 'web' ? styles.toggleBtnActive : ''}`}
                  onClick={() => setActiveTab('web')}
                >
                  Web
                </button>
                <button
                  className={`${styles.toggleBtn} ${activeTab === 'mobile' ? styles.toggleBtnActive : ''}`}
                  onClick={() => setActiveTab('mobile')}
                >
                  Mobile
                </button>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* Components Grid */}
        <section className={styles.componentsSection} id="components">
          <motion.div
            className={styles.componentsInner}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className={styles.componentsGrid}>
              {COMPONENT_LIST.map((comp, index) => (
                <motion.button
                  key={comp.id}
                  className={styles.componentCard}
                  layoutId={comp.id !== 'preview-rail' ? undefined : `component-card-${comp.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.15 + index * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    if (comp.id !== 'coming-soon-1' && comp.id !== 'coming-soon-2' && comp.id !== 'coming-soon-3') {
                      setSelectedComponent(comp.id)
                      setModalMode('preview')
                    }
                  }}
                  disabled={comp.id.startsWith('coming-soon')}
                >
                  <div className={styles.cardPreview}>
                    {comp.id === 'preview-rail' ? (
                      <PreviewRail
                        items={PREVIEW_RAIL_ITEMS}
                        orientation="vertical"
                      />
                    ) : (
                      <div className={styles.cardPlaceholder}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className={styles.cardBody}>
                    <h3 className={styles.cardTitle}>{comp.title}</h3>
                    <p className={styles.cardDesc}>{comp.description}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </section>

        {/* Work With Me */}
        <section className={styles.workSection}>
          <motion.div
            className={styles.workInner}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              className={styles.workBadge}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              Work with me
            </motion.div>

            <h2 className={styles.workTitle}>
              Let's build something
              <br />
              <span className={styles.workHighlight}>great together</span>
            </h2>

            <p className={styles.workDesc}>
              I design and build custom motion components, design systems,
              and frontend architecture for your project. Polished,
              production-ready UI to your spec, on your timeline.
            </p>

            <div className={styles.workButtons}>
              <motion.a
                href="https://cal.com/sandeepannandi"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.workBtnPrimary}
              >
                Book a call
              </motion.a>
              <motion.button
                type="button"
                className={styles.workBtnSecondary}
                onClick={() => {
                  navigator.clipboard.writeText('sandipannandi9825@gmail.com')
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
              >
                {copied ? 'Copied!' : 'Email me'}
              </motion.button>
            </div>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <motion.footer
        className={styles.footer}
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-40px' }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <span className={styles.footerLogo}>Nativelet</span>
            <p className={styles.footerTagline}>
              The motion toolkit for Next.js &amp; React Native.
              <br />
              Free and open source.
            </p>
            
          </div>
          <div className={styles.footerLinks}>
            <div className={styles.footerCol}>
              <h4 className={styles.footerColTitle}>Product</h4>
              <a href="#components" className={styles.footerLink}>
                <span className={styles.footerLinkText}>Components</span>
              </a>
              <motion.a
                href="https://github.com/sponsors/sandeepannandi"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.footerLink}
              >
                <span className={styles.footerLinkText}>Sponsorships</span>
                <ArrowUpRight size={12} className={styles.linkIcon} />
              </motion.a>
              <motion.a
                href="https://github.com/sandeepannandi/Nativelet"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.footerLink}
              >
                <span className={styles.footerLinkText}>GitHub</span>
                <ArrowUpRight size={12} className={styles.linkIcon} />
              </motion.a>
            </div>
            <div className={styles.footerCol}>
              <h4 className={styles.footerColTitle}>Connect</h4>
              <motion.button
                type="button"
                className={styles.footerLink}
                whileHover={{ x: 2 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                onClick={() => {
                  navigator.clipboard.writeText('sandipannandi9825@gmail.com')
                  setCopiedEmail(true)
                  setTimeout(() => setCopiedEmail(false), 2000)
                }}
              >
                <span className={styles.footerLinkText}>{copiedEmail ? 'Copied!' : 'Email'}</span>
              </motion.button>
              <motion.a
                href="https://x.com/SandeepanNandi"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.footerLink}
              >
                <span className={styles.footerLinkText}>Twitter / X</span>
                <ArrowUpRight size={12} className={styles.linkIcon} />
              </motion.a>
            </div>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <p>
            &copy; {new Date().getFullYear()} Nativelet.
          </p>
          <div className={styles.footerBottomLinks}>
            <a target="_blank" rel="noopener noreferrer">MIT License</a>
          </div>
        </div>
      </motion.footer>

      {/* Component Modal */}
      <AnimatePresence>
        {selectedComponent && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => setSelectedComponent(null)}
          >
            <motion.div
              className={styles.modalContent}
              layoutId={`component-card-${selectedComponent}`}
              onClick={(e) => e.stopPropagation()}
              transition={{ type: 'spring', stiffness: 400, damping: 30, mass: 0.8 }}
            >
              {/* Modal Header */}
              <div className={styles.modalHeader}>
                <div className={styles.modalToggle}>
                  <motion.button
                    className={`${styles.modalToggleBtn} ${modalMode === 'preview' ? styles.modalToggleActive : ''}`}
                    onClick={() => setModalMode('preview')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Eye size={14} />
                    <span>Preview</span>
                  </motion.button>
                  <motion.button
                    className={`${styles.modalToggleBtn} ${modalMode === 'code' ? styles.modalToggleActive : ''}`}
                    onClick={() => setModalMode('code')}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Code size={14} />
                    <span>Code</span>
                  </motion.button>
                </div>
                <motion.button
                  className={styles.modalClose}
                  onClick={() => setSelectedComponent(null)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  aria-label="Close modal"
                >
                  <CloseIcon size={16} />
                </motion.button>
              </div>

              {/* Modal Body */}
              <div className={styles.modalBody}>
                <AnimatePresence mode="wait">
                  {modalMode === 'preview' ? (
                    <motion.div
                      key="preview"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className={styles.modalPreview}
                    >
                      {selectedComponent === 'preview-rail' && (
                        <PreviewRail
                          items={PREVIEW_RAIL_ITEMS}
                          orientation="vertical"
                        />
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="code"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className={styles.modalCode}
                    >
                      <div className={styles.codeHeader}>
                        <span className={styles.codeLang}>TSX</span>
                        <motion.button
                          className={styles.codeCopyBtn}
                          onClick={() => {
                            navigator.clipboard.writeText(COMPONENT_CODE[selectedComponent] || '')
                            setCodeCopied(true)
                            setTimeout(() => setCodeCopied(false), 2000)
                          }}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          {codeCopied ? (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                              <span>Copy</span>
                            </>
                          )}
                        </motion.button>
                      </div>
                      <pre className={styles.codeBlock}>
                        <code>{COMPONENT_CODE[selectedComponent] || '// Code coming soon'}</code>
                      </pre>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
