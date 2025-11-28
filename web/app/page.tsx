'use client';
import { useState } from 'react'
import Image from 'next/image'
import styles from './page.module.css'
import { motion } from 'framer-motion'
import { Search, FileText, Plus, MessageSquare, Settings } from 'lucide-react'

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
        <div className={styles.gridItem}>3</div>
        <div className={styles.gridItem}>4</div>
        <div className={styles.gridItem}>5</div>
        <div className={styles.gridItem}>6</div>
        <div className={styles.gridItem}>7</div>
        <div className={styles.gridItem}>8</div>
        <div className={styles.gridItem}>9</div>
      </div>
    </main>
  )
}
