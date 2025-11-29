'use client';
import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import styles from './page.module.css'
import { motion } from 'framer-motion'
import { Search, FileText, Plus, MessageSquare, Settings, Loader2, Check, ChevronLeft, ChevronRight } from 'lucide-react'

const accentVariants = {
  initial: { width: 86 },
  hover: { width: '100%' },
}

const labelVariants = {
  initial: { color: '#f4f6fb', opacity: 1 },
  hover: { color: '#0c0d10', opacity: 0 },
}

export const DemoButton = () => {
  const [isHovering, setIsHovering] = useState(false)

  return (
    <motion.button
      className={styles.demoButton}
      initial="initial"
      whileHover="hover"
      animate="initial"
      onHoverStart={() => setIsHovering(true)}
      onHoverEnd={() => setIsHovering(false)}
    >
      <motion.div
        className={styles.demoAccent}
        variants={accentVariants}
        transition={{ duration: 0.5, ease: [1, 0.4, 1, 1.6] }}
      >
        <div className={styles.arrowTrack}>
          {Array.from({ length: 6 }).map((_, idx) => (
            <motion.div
              className={styles.arrowIcon}
              key={idx}
              animate={
                isHovering
                  ? {
                      opacity: [0.5, 1, 0.5],
                      scale: [1, 1, 1],
                      transition: {
                        duration: 1.2,
                        repeat: Infinity,
                        delay: idx * 0.5,
                        ease: 'easeInOut',
                      },
                    }
                  : { opacity: 1}
              }
            >
              <Image src="/dotarrow.svg" alt="dot arrow" width={52} height={52} />
            </motion.div>
          ))}
        </div>
      </motion.div>
      <motion.span
        className={styles.buttonLabel}
        variants={labelVariants}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        Book a Demo
      </motion.span>
    </motion.button>
  )
}

const SaveButton = () => {
  const [state, setState] = useState<'initial' | 'loading' | 'saved'>('initial')

  const handleClick = () => {
    if (state === 'initial') {
      setState('loading')
      // Simulate loading for 2 seconds
      setTimeout(() => {
        setState('saved')
      }, 2000)
    } else if (state === 'saved') {
      // Reset to initial state
      setState('initial')
    }
  }

  const buttonVariants = {
    initial: { scale: 1, backgroundColor: '#E8E6E1' },
    loading: { 
      scale: [1, 0.95, 1],
      padding: '12px 12px',
      backgroundColor: '#000',
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 15,
        mass: 0.8
      }
    },
    saved: { 
      scale: 1,
      backgroundColor: '#fff',
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 15,
        mass: 0.8
      }
    }
  }

  const contentVariants = {
    initial: { opacity: 1, scale: 1 },
    loading: { 
      opacity: [0, 1], 
      scale: [0.8, 1.1, 1],
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 18,
        mass: 0.5
      }
    },
    saved: { 
      opacity: [0, 1], 
      scale: [0.8, 1.15, 1],
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 15,
        mass: 0.6
      }
    }
  }

  return (
    <motion.button
      className={styles.saveButton}
      onClick={handleClick}
      variants={buttonVariants}
      animate={state}
      whileTap={state === 'initial' ? { scale: 0.95 } : {}}
      disabled={state === 'loading'}
    >
      {state === 'initial' && (
        <motion.span
          key="save-text"
          className={styles.saveText}
          initial={{ opacity: 0, y: -10, scale: 0.8 }}
          animate={{ 
            opacity: 1, 
            y: 0, 
            scale: 1 
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 15,
            mass: 0.8
          }}
        >
          Save
        </motion.span>
      )}
      
      {state === 'loading' && (
        <motion.div
          key="loader"
          className={styles.saveLoader}
          variants={contentVariants}
          initial="initial"
          animate="loading"
        >
          <Loader2 className={styles.loaderIcon} />
        </motion.div>
      )}
      
      {state === 'saved' && (
        <motion.div
          key="saved-content"
          className={styles.savedContent}
          variants={contentVariants}
          initial="initial"
          animate="saved"
        >
          <motion.div 
            className={styles.checkIconContainer}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 500,
              damping: 15,
              mass: 0.5,
              delay: 0.1
            }}
          >
            <Check className={styles.checkIcon} />
          </motion.div>
          <span className={styles.savedText}>Saved</span>
        </motion.div>
      )}
    </motion.button>
  )
}

const NavigationBar = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [selectedIndex, setSelectedIndex] = useState(2)

  const navItems = [
    { icon: Search, label: 'Search' },
    { icon: FileText, label: 'Documents' },
    { icon: Plus, label: 'Add', isSelected: true },
    { icon: MessageSquare, label: 'Messages', hasNotification: true },
    { icon: Settings, label: 'Settings' },
  ]

  const buttonVariants = {
    initial: { y: 0, scale: 1 },
    hover: { 
      y: -18, 
      scale: 1.2,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 12,
        mass: 0.8
      }
    },
  }

  const dotVariants = {
    hidden: { scale: 0, opacity: 0, y: 4 },
    visible: { 
      scale: 1, 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 15,
        mass: 0.5
      }
    },
  }

  return (
    <nav className={styles.navBar}>
      {navItems.map((item, idx) => {
        const isHovered = hoveredIndex === idx
        const isSelected = selectedIndex === idx
        const IconComponent = item.icon

        return (
          <div key={idx} className={styles.navButtonWrapper}>
            <motion.button
              className={`${styles.navButton} ${isSelected ? styles.navButtonSelected : ''}`}
              variants={buttonVariants}
              initial="initial"
              whileHover="hover"
              animate={isHovered ? 'hover' : 'initial'}
              onHoverStart={() => setHoveredIndex(idx)}
              onHoverEnd={() => setHoveredIndex(null)}
              onClick={() => setSelectedIndex(idx)}
            >
              <div className={styles.navIconContainer}>
                {item.hasNotification && (
                  <span className={styles.notificationDot} />
                )}
                <IconComponent 
                  size={24} 
                  strokeWidth={isSelected ? 2.5 : 2}
                />
              </div>
            </motion.button>
            <motion.div
              className={styles.navDot}
              variants={dotVariants}
              initial="hidden"
              animate={isHovered ? 'visible' : 'hidden'}
            />
          </div>
        )
      })}
    </nav>
  )
}

const Pagination = () => {
  const [activePage, setActivePage] = useState(2)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [framePosition, setFramePosition] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])
  const totalPages = 5

  useEffect(() => {
    const updateFramePosition = () => {
      const activeButton = buttonRefs.current[activePage - 1]
      const container = containerRef.current
      if (activeButton && container) {
        const containerRect = container.getBoundingClientRect()
        const buttonRect = activeButton.getBoundingClientRect()
        const position = buttonRect.left - containerRect.left
        setFramePosition(position)
      }
    }

    updateFramePosition()
    window.addEventListener('resize', updateFramePosition)
    return () => window.removeEventListener('resize', updateFramePosition)
  }, [activePage])

  const handlePageClick = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setActivePage(page)
    }
  }

  const handlePrev = () => {
    if (activePage > 1) {
      setActivePage(activePage - 1)
    }
  }

  const handleNext = () => {
    if (activePage < totalPages) {
      setActivePage(activePage + 1)
    }
  }

  const buttonVariants = {
    initial: { y: 0, scale: 1 },
    hover: { 
      y: -8, 
      scale: [1, 1.1, 1.05],
      transition: {
        type: "spring",
        stiffness: 500,
        damping: 12,
        mass: 0.5
      }
    },
  }

  const frameVariants = {
    initial: { scale: 1 },
    hover: {
      scale: [1, 1.05, 1],
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 15,
        mass: 0.6
      }
    }
  }

  return (
    <div ref={containerRef} className={styles.paginationContainer}>
      <motion.div 
        className={styles.paginationActiveFrame}
        animate={{ 
          x: framePosition,
        }}
        whileHover="hover"
        variants={frameVariants}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 18,
          mass: 0.6
        }}
      />
      
      <motion.button
        className={styles.paginationButton}
        onClick={handlePrev}
        disabled={activePage === 1}
        whileHover={{ 
          y: -8,
          scale: [1, 1.1, 1.05],
          transition: {
            type: "spring",
            stiffness: 500,
            damping: 12,
            mass: 0.5
          }
        }}
        whileTap={{ scale: 0.95 }}
      >
        <ChevronLeft size={20} />
      </motion.button>

      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
        const isActive = activePage === page
        const isHovered = hoveredIndex === page && !isActive

        return (
          <motion.button
            key={page}
            ref={(el) => {
              buttonRefs.current[page - 1] = el
            }}
            className={`${styles.paginationButton} ${isActive ? styles.paginationButtonActive : ''}`}
            onClick={() => handlePageClick(page)}
            variants={buttonVariants}
            initial="initial"
            whileHover={isActive ? undefined : "hover"}
            animate={isHovered ? 'hover' : 'initial'}
            onHoverStart={() => !isActive && setHoveredIndex(page)}
            onHoverEnd={() => !isActive && setHoveredIndex(null)}
            whileTap={isActive ? undefined : { scale: 0.95 }}
          >
            {page}
          </motion.button>
        )
      })}

      <motion.button
        className={styles.paginationButton}
        onClick={handleNext}
        disabled={activePage === totalPages}
        whileHover={{ 
          y: -8,
          scale: [1, 1.1, 1.05],
          transition: {
            type: "spring",
            stiffness: 500,
            damping: 12,
            mass: 0.5
          }
        }}
        whileTap={{ scale: 0.95 }}
      >
        <ChevronRight size={20} />
      </motion.button>
    </div>
  )
}

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.grid}>
        <div className={styles.gridItem}>
          <DemoButton />
        </div>
        <div className={styles.gridItem}>
          <NavigationBar />
        </div>
        <div className={styles.gridItem}>
          <SaveButton />
        </div>
        <div className={styles.gridItem}>
          <Pagination />
        </div>
        <div className={styles.gridItem}>5</div>
        <div className={styles.gridItem}>6</div>
        <div className={styles.gridItem}>7</div>
        <div className={styles.gridItem}>8</div>
        <div className={styles.gridItem}>9</div>
      </div>
    </main>
  )
}
