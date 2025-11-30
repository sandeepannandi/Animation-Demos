'use client';
import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import styles from './page.module.css'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, FileText, Plus, MessageSquare, Settings, Loader2, Check, ChevronLeft, ChevronRight, Heart, X } from 'lucide-react'

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

const Carousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [liked, setLiked] = useState<boolean[]>(new Array(5).fill(false))
  const totalImages = 5

  // Sample images - using Unsplash for variety
  const images = [
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&q=80',
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
    'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800&q=80',
  ]

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % totalImages)
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + totalImages) % totalImages)
  }

  const handleDotClick = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1)
    setCurrentIndex(index)
  }

  const toggleLike = (index: number) => {
    setLiked((prev) => {
      const newLiked = [...prev]
      newLiked[index] = !newLiked[index]
      return newLiked
    })
  }

  const cardVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 350 : -350,
      opacity: 0,
      rotate: direction > 0 ? 10 : -10,
      scale: 0.88,
    }),
    center: {
      x: 0,
      opacity: 1,
      rotate: -8,
      scale: 1,
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -350 : 350,
      opacity: 0,
      rotate: direction > 0 ? -10 : 10,
      scale: 0.88,
      transition: {
        duration: 0.15,
        ease: "easeIn"
      }
    }),
  }

  const [direction, setDirection] = useState(0)
  const [dragX, setDragX] = useState(0)

  const handleDragEnd = (event: any, info: any) => {
    const threshold = 50
    if (Math.abs(info.offset.x) > threshold) {
      if (info.offset.x > 0) {
        setDirection(-1)
        handlePrev()
      } else {
        setDirection(1)
        handleNext()
      }
    }
    setDragX(0)
  }

  return (
    <div className={styles.carouselContainer}>
      <div className={styles.carouselWrapper}>
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentIndex}
            custom={direction}
            variants={cardVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: "spring", stiffness: 500, damping: 30, mass: 0.7 },
              opacity: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
              rotate: { type: "spring", stiffness: 400, damping: 25, mass: 0.6 },
              scale: { type: "spring", stiffness: 500, damping: 30, mass: 0.7 },
            }}
            
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.8}
            onDrag={(event, info) => setDragX(info.offset.x)}
            onDragEnd={handleDragEnd}
            className={styles.carouselCard}
          >
            <div className={styles.carouselImageWrapper}>
              <Image
                src={images[currentIndex]}
                alt={`Slide ${currentIndex + 1}`}
                fill
                className={styles.carouselImage}
                sizes="(max-width: 768px) 100vw, 600px"
                draggable={false}
              />
              <motion.button
                className={styles.heartButton}
                onClick={(e) => {
                  e.stopPropagation()
                  toggleLike(currentIndex)
                }}
                whileTap={{ scale: 0.85 }}
                initial={false}
                animate={{
                  scale: liked[currentIndex] ? [1, 1.3, 1.1, 1] : 1,
                  rotate: liked[currentIndex] ? [0, -10, 10, -5, 0] : 0,
                }}
                transition={{ 
                  duration: 0.6,
                  times: [0, 0.2, 0.4, 0.6, 1],
                  ease: "easeOut"
                }}
              >
                <motion.div
                  animate={{
                    scale: liked[currentIndex] ? [1, 1, 1] : 1,
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <Heart
                    size={22}
                    fill={liked[currentIndex] ? '#ef4444' : 'none'}
                    color={liked[currentIndex] ? '#ef4444' : '#000'}
                    strokeWidth={2}
                  />
                </motion.div>
              </motion.button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <motion.div 
        className={styles.carouselDots}
        animate={{ rotate: -8 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {Array.from({ length: totalImages }).map((_, index) => (
          <motion.button
            key={index}
            className={`${styles.carouselDot} ${index === currentIndex ? styles.carouselDotActive : ''}`}
            onClick={() => {
              setDirection(index > currentIndex ? 1 : -1)
              handleDotClick(index)
            }}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            animate={{
              scale: index === currentIndex ? 1.3 : 1,
              opacity: index === currentIndex ? 1 : 0.4,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          />
        ))}
      </motion.div>
    </div>
  )
}

export const Tags = () => {
  const [selectedTags, setSelectedTags] = useState<string[]>(['Node'])
  const [inputValue, setInputValue] = useState('')

  const allSuggestedTags = [
    'Chai', 'Coffee', 'Mutton', 'Chicken',
    'Soup', 'Rice', 'Bread', 'Butter',
    'Eggs', 'Omelette', 'Pizza', 'Burger',
    'Chocolate', 'Lollipop'
  ]

  const suggestedTags = allSuggestedTags.filter(tag => !selectedTags.includes(tag))

  const handleAddTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag])
    }
  }

  const handleRemoveTag = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag))
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      if (!selectedTags.includes(inputValue.trim())) {
        setSelectedTags([...selectedTags, inputValue.trim()])
        setInputValue('')
      }
    }
  }

  const chipVariants = {
    initial: { scale: 0.8, opacity: 0 },
    animate: { 
      scale: 1, 
      opacity: 1,
      transition: { type: "spring", stiffness: 400, damping: 17 }
    }
  }

  const selectedChipVariants = {
    initial: { 
      scale: 0.8, 
      opacity: 0
    },
    animate: { 
      scale: 1, 
      opacity: 1
    },
    exit: { 
      scale: 0.8, 
      opacity: 0,
      transition: { duration: 0.3 }
    }
  }

  return (
    <div className={styles.tagsContainer}>
      <h2 className={styles.tagsHeading}>TAGS</h2>
      
      <div className={styles.tagsInputContainer}>
        <div className={styles.selectedTags}>
          <AnimatePresence mode="popLayout">
            {selectedTags.map((tag) => (
              <motion.div
                key={tag}
                layoutId={tag}
                className={styles.selectedTag}
                variants={selectedChipVariants}
                initial="initial"
                animate={{
                  ...selectedChipVariants.animate,
                  rotate: [0, 8, 0]
                }}
                exit="exit"
                layout
                transition={{
                  layout: {
                    duration: 0.6,
                    ease: [0.4, 0, 0.2, 1]
                  },
                  rotate: {
                    duration: 0.6,
                    times: [0, 0.5, 1],
                    ease: [0.4, 0, 0.2, 1]
                  }
                }}
              >
                <span>{tag}</span>
                <button
                  className={styles.removeTagButton}
                  onClick={() => handleRemoveTag(tag)}
                >
                  <X size={14} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          <input
            type="text"
            className={styles.tagsInput}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={selectedTags.length === 0 ? "Add tags..." : ""}
          />
        </div>
      </div>

      <div className={styles.suggestedTags}>
        <AnimatePresence>
          {suggestedTags.map((tag, index) => (
            <motion.button
              key={tag}
              layoutId={tag}
              className={styles.suggestedTag}
              onClick={() => handleAddTag(tag)}
              variants={chipVariants}
              initial="initial"
              animate="animate"
              layout
              transition={{
                layout: {
                  duration: 0.6,
                  ease: [0.4, 0, 0.2, 1]
                }
              }}
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              {tag}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
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
        <div className={styles.gridItem}>
          <Carousel />
        </div>
        <div className={styles.gridItem}>
          <Tags />
        </div>
      </div>
    </main>
  )
}
