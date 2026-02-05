import * as React from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"

interface HeroAction {
  label: string
  href: string
  variant?: "default" | "outline" | "ghost" | "hero" | "destructive" | "secondary" | "link"
  size?: "default" | "sm" | "lg" | "xl" | "icon"
  icon?: React.ReactNode
  className?: string
}

interface HeroProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  gradient?: boolean
  blur?: boolean
  title: React.ReactNode
  subtitle?: string
  actions?: HeroAction[]
  titleClassName?: string
  subtitleClassName?: string
  actionsClassName?: string
}

const Hero = React.forwardRef<HTMLDivElement, HeroProps>(
  (
    {
      className,
      gradient = true,
      blur = true,
      title,
      subtitle,
      actions,
      titleClassName,
      subtitleClassName,
      actionsClassName,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative flex flex-col items-center justify-center overflow-hidden pt-32 pb-20",
          className
        )}
        {...props}
      >
        {gradient && (
          <div className="absolute inset-0">
            {blur && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-3xl" />
            )}

            {/* Main glow */}
            <motion.div
              className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-primary/20 rounded-full blur-3xl"
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.3, 0.4, 0.3],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />

            {/* Lamp effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-40 bg-gradient-to-b from-primary/50 to-transparent" />

            {/* Top line */}
            <div className="absolute top-40 left-1/2 -translate-x-1/2 w-40 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

            {/* Left gradient cone */}
            <div className="absolute top-40 left-1/2 origin-top -translate-x-full">
              <motion.div
                className="w-[300px] h-[400px] bg-gradient-to-b from-primary/30 via-primary/10 to-transparent"
                style={{
                  clipPath: "polygon(100% 0%, 100% 0%, 0% 100%, 0% 100%)",
                }}
                initial={{ opacity: 0, rotate: -15 }}
                animate={{ opacity: 1, rotate: -15 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              />
              <motion.div
                className="absolute inset-0 w-[300px] h-[400px] bg-gradient-to-b from-primary/20 to-transparent blur-xl"
                style={{
                  clipPath: "polygon(100% 0%, 100% 0%, 0% 100%, 0% 100%)",
                }}
                initial={{ opacity: 0, rotate: -15 }}
                animate={{ opacity: 1, rotate: -15 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              />
            </div>

            {/* Right gradient cone */}
            <div className="absolute top-40 left-1/2 origin-top">
              <motion.div
                className="w-[300px] h-[400px] bg-gradient-to-b from-primary/30 via-primary/10 to-transparent"
                style={{
                  clipPath: "polygon(0% 0%, 0% 0%, 100% 100%, 100% 100%)",
                }}
                initial={{ opacity: 0, rotate: 15 }}
                animate={{ opacity: 1, rotate: 15 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              />
              <motion.div
                className="absolute inset-0 w-[300px] h-[400px] bg-gradient-to-b from-primary/20 to-transparent blur-xl"
                style={{
                  clipPath: "polygon(0% 0%, 0% 0%, 100% 100%, 100% 100%)",
                }}
                initial={{ opacity: 0, rotate: 15 }}
                animate={{ opacity: 1, rotate: 15 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              />
            </div>
          </div>
        )}

        <div className="container relative mx-auto px-4">
          <motion.div
            className="max-w-4xl mx-auto text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <motion.h1
              className={cn(
                "text-4xl md:text-6xl font-bold tracking-tight mb-6",
                titleClassName
              )}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              {title}
            </motion.h1>

            {subtitle && (
              <motion.p
                className={cn(
                  "text-xl text-muted-foreground mb-8 mx-auto",
                  subtitleClassName
                )}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                {subtitle}
              </motion.p>
            )}

            {actions && actions.length > 0 && (
              <motion.div
                className={cn(
                  "flex flex-col sm:flex-row items-center justify-center gap-4",
                  actionsClassName
                )}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                {actions.map((action) => (
                  <Button
                    key={`${action.href}-${action.label}`}
                    variant={action.variant || "default"}
                    size={action.size || "xl"}
                    asChild
                    className={cn("w-full sm:w-auto", action.className)}
                  >
                    <Link to={action.href}>
                      {action.icon}
                      {action.label}
                    </Link>
                  </Button>
                ))}
              </motion.div>
            )}

            {children && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                {children}
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    )
  }
)
Hero.displayName = "Hero"

export { Hero }
export type { HeroProps, HeroAction }
