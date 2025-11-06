import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
}

interface BadgeCelebrationProps {
  badge: Badge | null;
  onComplete: () => void;
}

export const BadgeCelebration = ({ badge, onComplete }: BadgeCelebrationProps) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (badge) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onComplete, 500);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [badge, onComplete]);

  return (
    <AnimatePresence>
      {show && badge && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
        >
          {/* Animated particles */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(12)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  opacity: 0,
                  x: '50%',
                  y: '50%',
                  scale: 0
                }}
                animate={{ 
                  opacity: [0, 1, 0],
                  x: `${50 + (Math.cos((i / 12) * Math.PI * 2) * 40)}%`,
                  y: `${50 + (Math.sin((i / 12) * Math.PI * 2) * 40)}%`,
                  scale: [0, 1, 0]
                }}
                transition={{ 
                  duration: 2,
                  delay: i * 0.1,
                  ease: "easeOut"
                }}
                className="absolute w-2 h-2 bg-primary/40 rounded-full"
                style={{
                  left: '50%',
                  top: '50%'
                }}
              />
            ))}
          </div>

          {/* Main content */}
          <div className="relative flex flex-col items-center gap-6 px-8">
            {/* Badge container with glow */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ 
                type: "spring",
                stiffness: 200,
                damping: 15,
                delay: 0.2
              }}
              className="relative"
            >
              {/* Glow effect */}
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 0.8, 0.5]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 bg-primary/20 rounded-full blur-2xl"
              />
              
              {/* Badge image */}
              <div className="relative w-32 h-32 rounded-full bg-card border-2 border-primary/20 overflow-hidden shadow-2xl">
                <img 
                  src={badge.icon} 
                  alt={badge.name}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Sparkle icon */}
              <motion.div
                initial={{ scale: 0, rotate: 0 }}
                animate={{ 
                  scale: [0, 1.2, 1],
                  rotate: [0, 180, 360]
                }}
                transition={{ 
                  duration: 0.6,
                  delay: 0.5
                }}
                className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg"
              >
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </motion.div>
            </motion.div>

            {/* Text content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="text-center space-y-2"
            >
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-sm font-medium text-muted-foreground tracking-wider uppercase"
              >
                Badge Unlocked
              </motion.p>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="text-3xl font-bold text-foreground"
              >
                {badge.name}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                className="text-sm text-muted-foreground max-w-xs"
              >
                {badge.description}
              </motion.p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
