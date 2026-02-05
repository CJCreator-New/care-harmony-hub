import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion"
import { ChevronLeft, ChevronRight, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"

const testimonials = [
  {
    quote: "We cut our revenue cycle from 60 days to 35 days. The automated insurance claims process alone saves us Rs 40 lakhs annually.",
    author: "Dr. Rajesh Sharma",
    role: "Medical Director",
    company: "Apollo Hospitals, Delhi NCR",
    metric: "35 days average AR",
    rating: 5,
  },
  {
    quote: "The system is so intuitive that our nursing staff needed minimal training. Adoption was 95% within 2 weeks. We now process 40% more patients daily.",
    author: "Priya Menon",
    role: "Chief Operating Officer",
    company: "Max Healthcare, Bangalore",
    metric: "95% adoption in 2 weeks",
    rating: 5,
  },
  {
    quote: "HIPAA-ready compliance and real-time audit logs give us peace of mind. Our data security posture improved significantly.",
    author: "Amit Verma",
    role: "CFO",
    company: "Fortis Hospitals, Mumbai",
    metric: "100% audit compliance",
    rating: 5,
  },
  {
    quote: "Integration with our existing PACS system was seamless. The support team went above and beyond. Highly recommend!",
    author: "Dr. Kavya Iyer",
    role: "Head of Diagnostics",
    company: "Manipal Hospitals, Hyderabad",
    metric: "Zero integration issues",
    rating: 5,
  },
]

export function Testimonial() {
  const [activeIndex, setActiveIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const springConfig = { damping: 20, stiffness: 150 }
  const x = useSpring(mouseX, springConfig)
  const y = useSpring(mouseY, springConfig)

  const numberX = useTransform(x, [-200, 200], [-30, 30])
  const numberY = useTransform(y, [-200, 200], [-15, 15])
  
  // Card tilt transforms
  const rotateX = useTransform(y, [-200, 200], [8, -8])
  const rotateY = useTransform(x, [-200, 200], [-8, 8])

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      mouseX.set(e.clientX - centerX)
      mouseY.set(e.clientY - centerY)
    }
  }

  const goNext = () => setActiveIndex((prev) => (prev + 1) % testimonials.length)
  const goPrev = () => setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)

  useEffect(() => {
    const timer = setInterval(goNext, 6000)
    return () => clearInterval(timer)
  }, [])

  const current = testimonials[activeIndex]

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative w-full max-w-6xl mx-auto px-4 py-16 overflow-hidden"
    >
      <div className="relative">
        {/* Oversized index number */}
        <div className="absolute -left-4 md:-left-12 top-0 pointer-events-none opacity-10">
          <motion.div style={{ x: numberX, y: numberY }}>
            <motion.span
              key={activeIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-[120px] md:text-[200px] font-bold text-primary select-none"
            >
              {String(activeIndex + 1).padStart(2, "0")}
            </motion.span>
          </motion.div>
        </div>

        {/* Main content with 3D tilt */}
        <motion.div 
          className="relative z-10 flex flex-col md:flex-row gap-8 md:gap-16 p-6 rounded-2xl transition-shadow duration-300"
          style={{ 
            rotateX, 
            rotateY,
            transformStyle: 'preserve-3d',
          }}
          whileHover={{
            boxShadow: '0 25px 50px -12px hsl(var(--primary) / 0.15)',
          }}
        >
          {/* Left column - vertical text */}
          <div className="hidden md:flex flex-col items-center gap-6 pt-8">
            <span className="text-xs tracking-widest uppercase text-muted-foreground rotate-180" style={{ writingMode: 'vertical-rl' }}>
              Testimonials
            </span>

            {/* Vertical progress line */}
            <div className="relative w-px h-24 bg-border">
              <motion.div
                className="absolute top-0 left-0 w-full bg-primary"
                initial={{ height: 0 }}
                animate={{ height: `${((activeIndex + 1) / testimonials.length) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Center - main content */}
          <div className="flex-1 min-w-0">
            {/* Company badge */}
            <AnimatePresence mode="wait">
              <motion.div
                key={current.company}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6"
              >
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {current.company}
                </span>
              </motion.div>
            </AnimatePresence>

            {/* Quote */}
            <div className="min-h-[120px] md:min-h-[160px]">
              <AnimatePresence mode="wait">
                <motion.blockquote
                  key={activeIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-2xl md:text-4xl lg:text-5xl font-medium leading-tight"
                >
                  {current.quote.split(" ").map((word, i) => (
                    <motion.span
                      key={`${current.author}-${word}-${i}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="inline-block mr-2"
                    >
                      {word}
                    </motion.span>
                  ))}
                </motion.blockquote>
              </AnimatePresence>
            </div>

            {/* Author row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mt-8 pt-8 border-t border-border">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current.author}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex items-center gap-4"
                >
                {/* Avatar with ripple effect */}
                  <motion.div 
                    className="relative w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0 group cursor-pointer"
                    whileHover={{ scale: 1.1 }}
                  >
                    {current.author.split(' ').map(n => n[0]).join('')}
                    {/* Ripple effect on hover */}
                    <motion.span
                      className="absolute inset-0 rounded-full bg-primary/20"
                      initial={{ scale: 1, opacity: 0 }}
                      whileHover={{ scale: 1.5, opacity: 0 }}
                      transition={{ duration: 0.6 }}
                    />
                  </motion.div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-foreground">{current.author}</p>
                      {/* Star Rating */}
                      <div className="flex">
                        {[...Array(current.rating || 5)].map((_, i) => (
                          <Star key={`${current.author}-star-${i}`} className="w-3 h-3 fill-warning text-warning" />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{current.role}</p>
                    {current.metric && (
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {current.metric}
                      </Badge>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex items-center gap-2">
                <button
                  onClick={goPrev}
                  className="p-2 rounded-full border border-border hover:bg-accent hover:border-primary/20 transition-colors"
                  aria-label="Previous testimonial"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={goNext}
                  className="p-2 rounded-full border border-border hover:bg-accent hover:border-primary/20 transition-colors"
                  aria-label="Next testimonial"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom ticker */}
        <div className="mt-12 overflow-hidden opacity-30">
          <motion.div
            animate={{ x: [0, -1000] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="flex whitespace-nowrap text-sm text-muted-foreground"
          >
            {[...Array(10)].map((_, i) => (
              <span key={`ticker-${i}`} className="mx-4">
                {testimonials.map((t) => t.company).join(" • ")} •
              </span>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
