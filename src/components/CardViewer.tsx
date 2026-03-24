import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'motion/react';
import { Check, Layers3, Heart, PackageCheck, PackageX, X } from 'lucide-react';
import { TCGCard } from '../services/tcgService';
import { cn } from '../lib/utils';
import { CardFinish } from '../types';

interface CardViewerProps {
  card: TCGCard;
  isCollected: boolean;
  isFavorite: boolean;
  preferredFinish: CardFinish;
  onToggleCollected: (collected: boolean) => void;
  onToggleFavorite: (favorite: boolean) => void;
  onChangeFinish: (finish: CardFinish) => void;
  onClose: () => void;
}

export const CardViewer: React.FC<CardViewerProps> = ({
  card,
  isCollected,
  isFavorite,
  preferredFinish,
  onToggleCollected,
  onToggleFavorite,
  onChangeFinish,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const variantOptions = [
    card.variants?.normal && { id: 'normal' as const, label: 'Normal' },
    card.variants?.reverse && { id: 'reverse' as const, label: 'Reverse' },
    card.variants?.holo && { id: 'holo' as const, label: 'Holo' },
  ].filter(Boolean);
  const selectedVariant = variantOptions.some((option) => option.id === preferredFinish)
    ? preferredFinish
    : (variantOptions[0]?.id ?? 'normal');

  const springConfig = { stiffness: 170, damping: 20, mass: 0.5 };
  const mouseXSpring = useSpring(x, springConfig);
  const mouseYSpring = useSpring(y, springConfig);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['14deg', '-14deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-18deg', '18deg']);
  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], ['8%', '92%']);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], ['10%', '90%']);
  const sheenOpacity = useTransform(mouseXSpring, [-0.5, 0, 0.5], [0.18, 0.28, 0.18]);
  const holoSheenOpacity = useTransform(mouseXSpring, [-0.5, 0, 0.5], [0.16, 0.28, 0.18]);
  const reverseSheenOpacity = useTransform(mouseYSpring, [-0.5, 0, 0.5], [0.16, 0.26, 0.18]);
  const floatX = useTransform(mouseXSpring, [-0.5, 0.5], ['-10px', '10px']);
  const floatY = useTransform(mouseYSpring, [-0.5, 0.5], ['-12px', '12px']);
  const foilBackground = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.42), rgba(255,255,255,0.14) 14%, rgba(255,255,255,0.02) 28%, transparent 44%), linear-gradient(135deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.14) 35%, rgba(255,255,255,0) 70%)`;
  const reverseFoilBackground = useMotionTemplate`linear-gradient(100deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.14) 18%, rgba(255,255,255,0.04) 34%, rgba(226,232,240,0.22) 52%, rgba(255,255,255,0.05) 68%, rgba(255,255,255,0.14) 84%, rgba(255,255,255,0.03) 100%), radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.26), transparent 42%)`;
  const reverseChromeBackground = useMotionTemplate`linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02) 24%, rgba(255,255,255,0) 45%, rgba(255,255,255,0.06) 70%, rgba(255,255,255,0.12) 100%), linear-gradient(125deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.18) 42%, rgba(255,255,255,0) 64%)`;
  const holoFoilBackground = useMotionTemplate`linear-gradient(110deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.08) 18%, rgba(250,204,21,0.16) 34%, rgba(244,114,182,0.15) 47%, rgba(96,165,250,0.16) 60%, rgba(45,212,191,0.14) 74%, rgba(255,255,255,0.08) 88%, rgba(255,255,255,0.02) 100%), radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.2), transparent 40%)`;
  const holoSpectrumBackground = useMotionTemplate`linear-gradient(118deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.04) 24%, rgba(253,224,71,0.2) 38%, rgba(244,114,182,0.18) 48%, rgba(96,165,250,0.2) 58%, rgba(45,212,191,0.16) 68%, rgba(255,255,255,0.04) 82%, rgba(255,255,255,0) 100%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const modal = (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-5xl bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl flex flex-col md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 bg-black/50 hover:bg-black/80 text-white rounded-full transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Card Display Area */}
        <div className="md:w-1/2 p-8 md:p-12 flex items-center justify-center bg-zinc-950 relative overflow-hidden">
          {/* Background Glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent pointer-events-none" />
          
          <motion.div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
              rotateX,
              rotateY,
              x: floatX,
              y: floatY,
              transformStyle: "preserve-3d",
            }}
            className="relative w-full max-w-[350px] aspect-[2.5/3.5] group cursor-default"
          >
            <motion.div 
              className="absolute inset-[-12%] z-0 rounded-[28px] blur-3xl pointer-events-none"
              style={{
                opacity: selectedVariant === 'holo' ? holoSheenOpacity : selectedVariant === 'reverse' ? reverseSheenOpacity : sheenOpacity,
                background: selectedVariant === 'reverse'
                  ? 'radial-gradient(circle, rgba(255,255,255,0.22), rgba(255,255,255,0.06), transparent 70%)'
                  : selectedVariant === 'holo'
                    ? 'radial-gradient(circle, rgba(255,255,255,0.18), rgba(250,204,21,0.08), rgba(96,165,250,0.08), transparent 72%)'
                    : 'radial-gradient(circle, rgba(255,255,255,0.18), rgba(251,146,60,0.12), transparent 70%)',
              }}
            />

            <motion.div 
              className="absolute inset-0 z-10 rounded-[20px] pointer-events-none"
              style={{
                opacity: sheenOpacity,
                background: foilBackground,
              }}
            />
            
            <img 
              src={card.images.large} 
              alt={card.name}
              className={cn(
                "w-full h-full object-contain rounded-[20px] shadow-2xl transition-all duration-300",
                !isCollected && "grayscale opacity-50",
                selectedVariant === 'reverse' && "contrast-[1.08] saturate-[1.02] brightness-[1.08] drop-shadow-[0_0_18px_rgba(226,232,240,0.18)]",
                selectedVariant === 'holo' && "contrast-[1.02] saturate-[1.08] brightness-[1.08] drop-shadow-[0_0_18px_rgba(250,204,21,0.16)]"
              )}
              referrerPolicy="no-referrer"
            />
            {selectedVariant !== 'normal' && (
              <>
                <motion.div
                  className={cn(
                    "absolute inset-0 rounded-[20px] pointer-events-none mix-blend-screen",
                    selectedVariant === 'holo' && 'opacity-72',
                    selectedVariant === 'reverse' && 'opacity-60'
                  )}
                  style={{
                    background: selectedVariant === 'reverse' ? reverseFoilBackground : holoFoilBackground,
                  }}
                />
                {selectedVariant === 'reverse' && (
                  <motion.div
                    className="absolute inset-0 rounded-[20px] pointer-events-none mix-blend-soft-light"
                    style={{
                      opacity: reverseSheenOpacity,
                      background: reverseChromeBackground,
                    }}
                  />
                )}
                {selectedVariant === 'holo' && (
                  <>
                    <motion.div
                      className="absolute inset-0 rounded-[20px] pointer-events-none mix-blend-soft-light"
                      style={{
                        opacity: holoSheenOpacity,
                        background: holoSpectrumBackground,
                      }}
                    />
                  </>
                )}
              </>
            )}
            {isFavorite && (
              <>
                <div className="pointer-events-none absolute inset-[-1px] rounded-[22px] border border-amber-200/70 shadow-[0_0_28px_rgba(251,191,36,0.2)]" />
                <div className="pointer-events-none absolute inset-[4px] rounded-[18px] border border-amber-100/35" />
              </>
            )}
            
            {!isCollected && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black/80 px-6 py-3 rounded-full border border-white/20 backdrop-blur-md">
                  <p className="text-white font-bold tracking-widest uppercase text-sm">Not in Collection</p>
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Info Area */}
        <div className="md:w-1/2 p-8 md:p-12 overflow-y-auto max-h-[60vh] md:max-h-none">
          <div className="space-y-6">
            <header>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-2 py-1 bg-zinc-800 text-zinc-400 rounded text-[10px] font-mono uppercase tracking-wider">
                  {card.set.name} #{card.number}
                </span>
                <span className="px-2 py-1 bg-orange-500/10 text-orange-500 rounded text-[10px] font-bold uppercase tracking-wider">
                  {card.rarity}
                </span>
              </div>
              <h2 className="text-4xl font-bold text-white leading-tight">{card.name}</h2>
              <p className="text-zinc-500 mt-1 italic">{card.flavorText || "No flavor text available."}</p>
            </header>

            <div className="grid grid-cols-1 gap-4">
              <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-800">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <PackageCheck className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Collection State</span>
                  </div>
                  <button
                    onClick={() => onToggleFavorite(!isFavorite)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold transition-colors",
                      isFavorite ? "bg-yellow-400 text-zinc-950" : "bg-zinc-950 text-zinc-300 hover:bg-zinc-700"
                    )}
                  >
                    <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
                    <span>Fav</span>
                  </button>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => onToggleCollected(true)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors",
                      isCollected ? "bg-orange-500 text-white" : "bg-zinc-950 text-zinc-400 hover:bg-zinc-700"
                    )}
                  >
                    <PackageCheck className="h-4 w-4" />
                    <span>Collected</span>
                  </button>
                  <button
                    onClick={() => onToggleCollected(false)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors",
                      !isCollected ? "bg-orange-500 text-white" : "bg-zinc-950 text-zinc-400 hover:bg-zinc-700"
                    )}
                  >
                    <PackageX className="h-4 w-4" />
                    <span>Missing</span>
                  </button>
                </div>
              </div>
              {variantOptions.length > 0 && (
                <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-800">
                  <div className="flex items-center gap-2 text-zinc-400 mb-3">
                    <Layers3 className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Finish</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {variantOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => onChangeFinish(option.id)}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors",
                          selectedVariant === option.id ? "bg-orange-500 text-white" : "bg-zinc-950 text-zinc-400 hover:bg-zinc-700"
                        )}
                      >
                        <Check className={cn("h-4 w-4", selectedVariant !== option.id && "opacity-0")} />
                        <span>{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {selectedVariant !== 'normal' && (
                <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-sm text-orange-200">
                  {selectedVariant === 'reverse'
                    ? 'Reverse view is shown with a reflective foil treatment.'
                    : 'Holo view is shown with a brighter foil treatment.'}
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-zinc-800">
              <p className="text-sm text-zinc-500">
                Toggle between collected and missing states, and swap finishes when that version exists for this card.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return createPortal(modal, document.body);
};
