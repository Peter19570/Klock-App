import type React from 'react';
import { useState, useRef } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  useSpring,
} from 'framer-motion';

interface LocationMapProps {
  location?: string;
  coordinates?: string;
  className?: string;
}

// Scattered building block definitions — fixed positions so they don't shift on re-render
const BUILDINGS = [
  { x: '8%',  y: '12%', w: 38, h: 52, opacity: 0.13, delay: 0.15 },
  { x: '18%', y: '48%', w: 24, h: 34, opacity: 0.09, delay: 0.22 },
  { x: '28%', y: '20%', w: 50, h: 28, opacity: 0.11, delay: 0.18 },
  { x: '42%', y: '55%', w: 30, h: 44, opacity: 0.08, delay: 0.28 },
  { x: '55%', y: '10%', w: 44, h: 36, opacity: 0.12, delay: 0.20 },
  { x: '63%', y: '42%', w: 26, h: 58, opacity: 0.10, delay: 0.25 },
  { x: '72%', y: '18%', w: 36, h: 24, opacity: 0.14, delay: 0.17 },
  { x: '80%', y: '58%', w: 20, h: 40, opacity: 0.07, delay: 0.30 },
  { x: '88%', y: '28%', w: 32, h: 32, opacity: 0.10, delay: 0.23 },
  { x: '5%',  y: '70%', w: 42, h: 22, opacity: 0.09, delay: 0.26 },
  { x: '48%', y: '72%', w: 28, h: 30, opacity: 0.11, delay: 0.32 },
  { x: '75%', y: '74%', w: 38, h: 20, opacity: 0.08, delay: 0.35 },
];

export function LocationMap({
  location = 'Current Location',
  coordinates = '',
  className,
}: LocationMapProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-50, 50], [8, -8]);
  const rotateY = useTransform(mouseX, [-50, 50], [-8, 8]);
  const springRotateX = useSpring(rotateX, { stiffness: 300, damping: 30 });
  const springRotateY = useSpring(rotateY, { stiffness: 300, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - (rect.left + rect.width / 2));
    mouseY.set(e.clientY - (rect.top + rect.height / 2));
  };

  return (
    <motion.div
      ref={containerRef}
      className={`relative cursor-pointer select-none ${className ?? ''}`}
      style={{ perspective: 1000 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        mouseX.set(0);
        mouseY.set(0);
        setIsHovered(false);
      }}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      <motion.div
        className="relative overflow-hidden rounded-2xl bg-background border border-border"
        style={{
          rotateX: springRotateX,
          rotateY: springRotateY,
          transformStyle: 'preserve-3d',
        }}
        animate={{ width: isExpanded ? 360 : 240, height: isExpanded ? 280 : 140 }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-muted/20 via-transparent to-muted/40" />

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              {/* Base map background */}
              <div className="absolute inset-0 bg-muted" />

              {/* Grid lines */}
              <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                {[[0, '35%', '100%', '35%'], [0, '65%', '100%', '65%']].map(
                  ([x1, y1, x2, y2], i) => (
                    <motion.line
                      key={i}
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      className="stroke-foreground/25"
                      strokeWidth="4"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.8, delay: 0.2 + i * 0.1 }}
                    />
                  ),
                )}
                {['30%', '70%'].map((x, i) => (
                  <motion.line
                    key={i}
                    x1={x} y1="0%" x2={x} y2="100%"
                    className="stroke-foreground/20"
                    strokeWidth="3"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.6, delay: 0.4 + i * 0.1 }}
                  />
                ))}
                {[20, 50, 80].map((y, i) => (
                  <motion.line
                    key={i}
                    x1="0%" y1={`${y}%`} x2="100%" y2={`${y}%`}
                    className="stroke-foreground/10"
                    strokeWidth="1.5"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }}
                  />
                ))}
              </svg>

              {/* ── Building block decorations ───────────────────────────── */}
              {BUILDINGS.map((b, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-sm"
                  style={{
                    left: b.x,
                    top: b.y,
                    width: b.w,
                    height: b.h,
                    backgroundColor: `rgba(120,120,140,${b.opacity})`,
                    backdropFilter: 'blur(1px)',
                  }}
                  initial={{ opacity: 0, scale: 0.6, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.6, y: 8 }}
                  transition={{
                    type: 'spring',
                    stiffness: 260,
                    damping: 22,
                    delay: b.delay,
                  }}
                />
              ))}

              {/* Location pin */}
              <motion.div
                className="absolute"
                style={{
                  top: '35%',
                  left: '50%',
                  transform: 'translate(-50%, -100%)',
                }}
                initial={{ scale: 0, y: -20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 20,
                  delay: 0.3,
                }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ filter: 'drop-shadow(0 0 10px rgba(52, 211, 153, 0.5))' }}
                >
                  <path
                    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                    fill="#34D399"
                  />
                  <circle cx="12" cy="9" r="2.5" fill="white" />
                </svg>
              </motion.div>

              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-60" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* UI overlay */}
        <div className="relative z-10 h-full flex flex-col justify-between p-5">
          <div className="flex items-start justify-between">
            <motion.div
              animate={{ opacity: isExpanded ? 0 : 1 }}
              transition={{ duration: 0.3 }}
            >
              <svg
                width="18" height="18" viewBox="0 0 24 24"
                fill="none" stroke="#34D399"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
                <line x1="9" x2="9" y1="3" y2="18" />
                <line x1="15" x2="15" y1="6" y2="21" />
              </svg>
            </motion.div>
            <motion.div
              className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-foreground/5 backdrop-blur-sm"
              animate={{ scale: isHovered ? 1.05 : 1 }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-medium text-muted-foreground tracking-wide uppercase">
                Live
              </span>
            </motion.div>
          </div>

          <div className="space-y-1">
            <motion.h3
              className="text-foreground font-medium text-sm tracking-tight"
              animate={{ x: isHovered ? 4 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {location}
            </motion.h3>
            <AnimatePresence>
              {isExpanded && coordinates && (
                <motion.p
                  className="text-muted-foreground text-xs font-mono"
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                >
                  {coordinates}
                </motion.p>
              )}
            </AnimatePresence>
            <motion.div
              className="h-px bg-gradient-to-r from-emerald-500/50 via-emerald-400/30 to-transparent"
              initial={{ scaleX: 0, originX: 0 }}
              animate={{ scaleX: isHovered || isExpanded ? 1 : 0.3 }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>
      </motion.div>

      <motion.p
        className="absolute -bottom-6 left-1/2 text-[10px] text-muted-foreground whitespace-nowrap"
        style={{ x: '-50%' }}
        animate={{
          opacity: isHovered && !isExpanded ? 1 : 0,
          y: isHovered ? 0 : 4,
        }}
      >
        Click to expand
      </motion.p>
    </motion.div>
  );
}
