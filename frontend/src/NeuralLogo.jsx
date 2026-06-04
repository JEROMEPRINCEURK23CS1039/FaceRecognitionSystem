import React from 'react';
import { motion } from 'framer-motion';

export default function NeuralLogo({ size = 32 }) {
  return (
    <div style={{ width: size, height: size }} className="relative flex items-center justify-center group">
      {/* Background ambient glow */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 bg-cyan-500/30 blur-md rounded-full" 
      />
      
      {/* Outer spinning tracking ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 rounded-full border-[1.5px] border-cyan-400/40"
        style={{ borderTopColor: 'transparent', borderBottomColor: 'transparent' }}
      />
      
      {/* Middle counter-spinning dashed ring */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute inset-[4px] rounded-full border border-purple-500/60 border-dashed"
      />

      {/* Inner precision targeting ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        className="absolute inset-[8px] rounded-full border border-cyan-300/30"
        style={{ borderRightColor: 'transparent' }}
      />
      
      {/* Core biometric sensor pulse */}
      <motion.div
        animate={{ scale: [0.75, 1.15, 0.75], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute w-2 h-2 rounded-full bg-cyan-300 shadow-[0_0_10px_2px_rgba(103,232,249,0.8)]"
      />
    </div>
  );
}
