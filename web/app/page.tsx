'use client';
import { useState } from 'react'
import Image from 'next/image'
import styles from './page.module.css'
import { motion } from 'framer-motion'

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

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.grid}>
        <div className={styles.gridItem}>
          <DemoButton />
        </div>
        <div className={styles.gridItem}>2</div>
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
