'use client';
import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import styles from './page.module.css'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, FileText, Plus, MessageSquare, Settings, Loader2, Check, ChevronLeft, ChevronRight, Heart, X, Flame } from 'lucide-react'

const SubmitButton = () => {
  const [hovered, setHovered] = useState(false)

  const blobs = [
    { left: '-20%', top: '-26%', delay: 0, toX: 34, toY: 36 },
    { left: '8%', top: '-30%', delay: 0.08, toX: 16, toY: 30 },
    { left: '46%', top: '-28%', delay: 0.14, toX: 0, toY: 26 },
    { left: '88%', top: '-20%', delay: 0.2, toX: -26, toY: 24 },
    { left: '-24%', bottom: '-28%', delay: 0.26, toX: 38, toY: -34 },
    { left: '10%', bottom: '-26%', delay: 0.32, toX: 18, toY: -30 },
    { left: '52%', bottom: '-30%', delay: 0.38, toX: 0, toY: -28 },
    { right: '-18%', bottom: '-24%', delay: 0.44, toX: -30, toY: -26 },
  ]

  return (
    <motion.button
      className={styles.submitButton}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileTap={{ scale: 0.97 }}
      animate={hovered ? 'hover' : 'rest'}
      variants={{
        rest: { backgroundColor: '#ffffff' },
        hover: { backgroundColor: '#0c0c0c' },
      }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className={styles.submitBlobLayer}>
        {blobs.map((blob, idx) => (
          <motion.span
            key={idx}
            className={styles.submitBlob}
            style={{
              left: blob.left,
              top: blob.top,
              bottom: blob.bottom,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={
              hovered
                ? { scale: 2.4, opacity: 1, x: blob.toX, y: blob.toY }
                : { scale: 0, opacity: 0, x: 0, y: 0 }
            }
            transition={{
              type: 'spring',
              stiffness: 220,
              damping: 26,
              delay: blob.delay,
            }}
          />
        ))}
      </div>
      <motion.span
        className={styles.submitLabel}
        animate={hovered ? { color: '#f6f7fb' } : { color: '#0f1115' }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      >
        Submit
      </motion.span>
    </motion.button>
  )
}

const InlineToast = () => {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1200)
    return () => clearTimeout(timer)
  }, [copied])

  return (
    <motion.div
      className={styles.toastWrap}
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 24 }}
    >
      <motion.div
        className={styles.toastBody}
        layout
        transition={{ layout: { duration: 0.24, ease: [0.4, 0, 0.2, 1] } }}
      >
        <AnimatePresence initial={false} mode="wait">
          {!copied ? (
            <motion.div
              key="idle"
              className={styles.toastContent}
              initial={{ opacity: 0, scale: 0.9, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 6 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <span className={styles.toastCode}>B3E45S7T</span>
              <motion.button
                className={styles.toastCopyBtn}
                whileTap={{ scale: 0.96 }}
                onClick={() => setCopied(true)}
              >
                Copy
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="copied"
              className={styles.toastContentCopied}
              initial={{ opacity: 0, scale: 0.9, y: 6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -6 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
            >
              <div className={styles.toastCheck}>
                <Check size={18} />
              </div>
              <span className={styles.toastCopiedText}>Code Copied!</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {copied && (
            <motion.div
              key="progress"
              className={styles.toastProgress}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.5, ease: 'easeInOut' }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
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

const RadialCarousel = () => {
  const radialImages = [
    'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1468818438311-4bab781ab9b8?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=400&q=80',
    'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=400&q=80'
  ]
  const wheelRef = useRef<HTMLDivElement | null>(null)
  const dragState = useRef({
    startAngle: 0,
    startRotation: 0,
    active: false,
  })
  const [rotation, setRotation] = useState(0)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const radius = 170

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [])

  const getAngle = (clientX: number, clientY: number) => {
    const rect = wheelRef.current?.getBoundingClientRect()
    if (!rect) return 0
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    return Math.atan2(clientY - centerY, clientX - centerX)
  }

  const handlePointerMove = (event: PointerEvent) => {
    if (!dragState.current.active) return
    const currentAngle = getAngle(event.clientX, event.clientY)
    const delta = currentAngle - dragState.current.startAngle
    setRotation(dragState.current.startRotation + (delta * 180) / Math.PI)
  }

  const handlePointerUp = () => {
    dragState.current.active = false
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
  }

  const handlePointerDown = (event: React.PointerEvent) => {
    event.preventDefault()
    dragState.current = {
      startAngle: getAngle(event.clientX, event.clientY),
      startRotation: rotation,
      active: true,
    }
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  return (
    <div className={styles.radialContainer}>
      <AnimatePresence mode="wait">
        {selectedIndex === null ? (
          <motion.div
            key="wheel"
            className={styles.radialWheelWrap}
            onPointerDown={handlePointerDown}
            ref={wheelRef}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.4, ease: [0.65, 0, 0.35, 1] }}
          >
            <motion.div
              className={styles.radialWheel}
              style={{ transform: `translate(-50%, -50%) rotate(${rotation}deg)` }}
            >
              {radialImages.map((src, index) => {
                const angle = (360 / radialImages.length) * index
                return (
                  <motion.button
                    key={`${src}-${index}`}
                    className={styles.radialCard}
                    style={{
                      transform: `translate(-50%, -50%) rotate(${angle}deg) translate(${radius}px)`,
                    }}
                    onClick={() => setSelectedIndex(index)}
                  >
                    <Image
                      src={src}
                      alt={`carousel-${index}`}
                      width={96}
                      height={96}
                      className={styles.radialImage}
                    />
                  </motion.button>
                )
              })}
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="viewer"
            className={styles.radialSelected}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.4, ease: [0.65, 0, 0.35, 1] }}
          >
            <button className={styles.radialClose} onClick={() => setSelectedIndex(null)}>
              <X size={18} />
            </button>
            <Image
              src={radialImages[selectedIndex]}
              alt="selected card"
              width={320}
              height={320}
              className={styles.radialSelectedImage}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const TodoList = () => {
  const [items, setItems] = useState([
    { id: 1, label: 'Organize a user testing session', done: false },
    { id: 2, label: 'Prepare designs for client review', done: false },
    { id: 3, label: '15-minute meditation', done: false },
  ])
  const reorderTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleToggle = (id: number) => {
    if (reorderTimer.current) clearTimeout(reorderTimer.current)

    setItems((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, done: !item.done } : item
      )
      return updated
    })

    // delay the reorder so the right-shift animation is visible first
    reorderTimer.current = setTimeout(() => {
      setItems((prev) => [...prev].sort((a, b) => Number(a.done) - Number(b.done)))
    }, 260)
  }

  return (
    <div className={styles.todoWrapper}>
      <ul className={styles.todoList}>
        {items.map((item) => (
          <motion.li
            key={item.id}
            layout
            className={`${styles.todoItem} ${item.done ? styles.todoItemDone : ''}`}
            transition={{
              layout: { type: 'spring', stiffness: 180, damping: 24, mass: 1.2 },
              type: 'spring',
              stiffness: 180,
              damping: 24,
              mass: 1.2,
            }}
            animate={
              item.done
                ? {
                    x: [0, 14, 0],
                    transition: { duration: 0.5, ease: [0.42, 0, 0.58, 1] },
                  }
                : { x: 0 }
            }
          >
            <motion.button
              className={`${styles.todoCheckbox} ${item.done ? styles.todoCheckboxChecked : ''}`}
              onClick={() => handleToggle(item.id)}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 220, damping: 20 }}
            >
              <AnimatePresence>
                {item.done && (
                  <motion.span
                    key="check"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                    className={styles.todoCheckMark}
                  >
                    <Check size={14} />
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
            <span className={styles.todoLabel}>{item.label}</span>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}

export const SegmentControl = () => {
  const [selectedTab, setSelectedTab] = useState<'popular' | 'favorites'>('favorites')
  const [isSearchExpanded, setIsSearchExpanded] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isSearchExpanded && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isSearchExpanded])

  const handleSearchClick = () => {
    setIsSearchExpanded(true)
  }

  const handleClose = () => {
    setIsSearchExpanded(false)
    setSearchValue('')
  }

  const backgroundVariants = {
    popular: {
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 500,
        damping: 30,
        mass: 0.8,
      },
    },
    favorites: {
      x: '100%',
      transition: {
        type: 'spring',
        stiffness: 500,
        damping: 30,
        mass: 0.8,
      },
    },
  }

  const segmentControlVariants = {
    visible: {
      opacity: 1,
      width: 'auto',
      marginLeft: 12,
      transition: {
        type: 'linear',
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      },
    },
    hidden: {
      opacity: 0,
      width: 0,
      marginLeft: 0,
      overflow: 'hidden',
      transition: {
        type: 'linear',
        duration: 0.3,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  }

  const closeButtonVariants = {
    initial: {
      opacity: 0,
      scale: 0.8,
      x: -20,
    },
    visible: {
      opacity: 1,
      scale: 1,
      x: 0,
      transition: {
        type: 'linear',
        duration: 0.15,
        ease: [0.4, 0, 0.2, 1],
        delay: 0.1,
      },
    },
    exit: {
      opacity: 0,
      scale: 0.8,
      x: -20,
      transition: {
        type: 'linear',
        duration: 0.15,
        ease: [0.4, 0, 0.2, 1],
      },
    },
  }

  return (
    <div className={styles.segmentControlContainer}>
      <AnimatePresence mode="wait" initial={false}>
        {!isSearchExpanded ? (
          <motion.div
            key="collapsed"
            className={styles.collapsedContainer}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'linear', duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            <motion.button
              layoutId="search-button"
              className={styles.searchButtonCircle}
              onClick={handleSearchClick}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ borderRadius: '50%', width: '48px', height: '48px' }}
              animate={{ borderRadius: '50%', width: '48px', height: '48px' }}
              transition={{ 
                type: 'linear',
                duration: 0.25,
                ease: [0.4, 0, 0.2, 1],
                layout: {
                  type: 'linear',
                  duration: 0.25,
                  ease: [0.4, 0, 0.2, 1],
                },
                borderRadius: { 
                  type: 'linear', 
                  duration: 0.25, 
                  ease: [0.4, 0, 0.2, 1] 
                },
                width: {
                  type: 'linear',
                  duration: 0.25,
                  ease: [0.4, 0, 0.2, 1],
                },
                height: {
                  type: 'linear',
                  duration: 0.25,
                  ease: [0.4, 0, 0.2, 1],
                },
              }}
            >
              <Search size={20} />
            </motion.button>
            
            <AnimatePresence>
              <motion.div
                className={styles.segmentControl}
                variants={segmentControlVariants}
                initial="visible"
                animate="visible"
                exit="hidden"
              >
              <motion.div
                className={styles.segmentBackground}
                variants={backgroundVariants}
                animate={selectedTab}
                initial={false}
              />
              
              <button
                className={`${styles.segmentButton} ${selectedTab === 'popular' ? styles.segmentButtonActive : ''}`}
                onClick={() => setSelectedTab('popular')}
              >
                <Flame 
                  size={18} 
                  className={styles.segmentIcon}
                  fill={selectedTab === 'popular' ? '#ef4444' : 'none'}
                  color={selectedTab === 'popular' ? '#ef4444' : '#000'}
                />
                <span className={styles.segmentText}>Popular</span>
              </button>
              
              <button
                className={`${styles.segmentButton} ${selectedTab === 'favorites' ? styles.segmentButtonActive : ''}`}
                onClick={() => setSelectedTab('favorites')}
              >
                <Heart 
                  size={18} 
                  className={styles.segmentIcon}
                  fill={selectedTab === 'favorites' ? '#ef4444' : 'none'}
                  color={selectedTab === 'favorites' ? '#ef4444' : '#000'}
                />
                <span className={styles.segmentText}>Favorites</span>
              </button>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="expanded"
            className={styles.expandedContainer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'linear', duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          >
            <motion.div
              layoutId="search-button"
              className={styles.searchBarExpanded}
              initial={{ borderRadius: '50%', width: '48px', height: '48px' }}
              animate={{ borderRadius: '28px', width: '100%', height: '44px' }}
              exit={{ borderRadius: '50%', width: '48px', height: '48px' }}
              transition={{
                type: 'linear',
                duration: 0.25,
                ease: [0.4, 0, 0.2, 1],
                layout: {
                  type: 'linear',
                  duration: 0.25,
                  ease: [0.4, 0, 0.2, 1],
                },
                borderRadius: {
                  type: 'linear',
                  duration: 0.25,
                  ease: [0.4, 0, 0.2, 1],
                },
                width: {
                  type: 'linear',
                  duration: 0.25,
                  ease: [0.4, 0, 0.2, 1],
                },
                height: {
                  type: 'linear',
                  duration: 0.25,
                  ease: [0.4, 0, 0.2, 1],
                },
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Search size={20} className={styles.searchBarIcon} />
              </div>
              <input
                ref={inputRef}
                type="text"
                className={styles.searchBarInput}
                placeholder="Search"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
              />
            </motion.div>
            
            <motion.button
              className={styles.searchBarClose}
              onClick={handleClose}
              variants={closeButtonVariants}
              initial="initial"
              animate="visible"
              exit="exit"
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'linear', duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            >
              <X size={20} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.grid}>
        <div className={styles.gridItem}>
          <SubmitButton />
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
        <div className={styles.gridItem}>
          <RadialCarousel />
        </div> 
        <div className={styles.gridItem}>
          <SegmentControl />
        </div>
        <div className={styles.gridItem}>
          <TodoList />
        </div>
        <div className={styles.gridItem}>
          <SubmitButton />
        </div>
        <div className={styles.gridItem}>
          <InlineToast />
        </div>
      </div>
    </main>
  )
}
