import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeft, PanelRight, ChevronLeft, ChevronRight } from 'lucide-react';

interface ThreePanelLayoutProps {
  leftPanel: React.ReactNode;
  centerPanel: React.ReactNode;
  rightPanel: React.ReactNode;
  leftPanelTitle?: string;
  centerPanelTitle?: string;
  rightPanelTitle?: string;
  defaultLeftWidth?: number;
  defaultRightWidth?: number;
}

export const ThreePanelLayout: React.FC<ThreePanelLayoutProps> = ({
  leftPanel,
  centerPanel,
  rightPanel,
  leftPanelTitle = 'News Search',
  centerPanelTitle = 'Content Generation',
  rightPanelTitle = 'Preview & Publish',
  defaultLeftWidth = 320,
  defaultRightWidth = 400,
}) => {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth);
  const [rightWidth, setRightWidth] = useState(defaultRightWidth);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);

  const handleLeftResize = (e: React.MouseEvent) => {
    const startX = e.clientX;
    const startWidth = leftWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.max(240, Math.min(500, startWidth + delta));
      setLeftWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleRightResize = (e: React.MouseEvent) => {
    const startX = e.clientX;
    const startWidth = rightWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX;
      const newWidth = Math.max(300, Math.min(600, startWidth + delta));
      setRightWidth(newWidth);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-bg-primary">
      {/* Left Panel - News Search */}
      <AnimatePresence initial={false}>
        {!isLeftCollapsed && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: leftWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex h-full flex-col border-r border-border-primary bg-bg-secondary"
            style={{ width: leftWidth }}
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-border-primary px-4 py-3">
              <div className="flex items-center gap-2">
                <PanelLeft className="h-4 w-4 text-text-secondary" />
                <h2 className="text-sm font-semibold text-text-primary">{leftPanelTitle}</h2>
              </div>
              <button
                onClick={() => setIsLeftCollapsed(true)}
                className="btn-ghost rounded p-1 hover:bg-bg-tertiary"
                aria-label="Collapse left panel"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
              {leftPanel}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left Panel Resize Handle */}
      {!isLeftCollapsed && (
        <div
          className="w-1 cursor-col-resize border-r border-border-primary bg-transparent hover:bg-accent-primary/20"
          onMouseDown={handleLeftResize}
          title="Resize panel"
        />
      )}

      {/* Center Panel - Content Generation */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-border-primary px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-text-primary">{centerPanelTitle}</h2>
          </div>
          <div className="flex items-center gap-2">
            {isLeftCollapsed && (
              <button
                onClick={() => setIsLeftCollapsed(false)}
                className="btn-ghost rounded p-1 hover:bg-bg-tertiary"
                aria-label="Expand left panel"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
            {isRightCollapsed && (
              <button
                onClick={() => setIsRightCollapsed(false)}
                className="btn-ghost rounded p-1 hover:bg-bg-tertiary"
                aria-label="Expand right panel"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
          {centerPanel}
        </div>
      </div>

      {/* Right Panel Resize Handle */}
      {!isRightCollapsed && (
        <div
          className="w-1 cursor-col-resize border-l border-border-primary bg-transparent hover:bg-accent-primary/20"
          onMouseDown={handleRightResize}
          title="Resize panel"
        />
      )}

      {/* Right Panel - Preview & Publish */}
      <AnimatePresence initial={false}>
        {!isRightCollapsed && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: rightWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex h-full flex-col border-l border-border-primary bg-bg-secondary"
            style={{ width: rightWidth }}
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between border-b border-border-primary px-4 py-3">
              <div className="flex items-center gap-2">
                <PanelRight className="h-4 w-4 text-text-secondary" />
                <h2 className="text-sm font-semibold text-text-primary">{rightPanelTitle}</h2>
              </div>
              <button
                onClick={() => setIsRightCollapsed(true)}
                className="btn-ghost rounded p-1 hover:bg-bg-tertiary"
                aria-label="Collapse right panel"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Panel Content */}
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
              {rightPanel}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed Panel Indicators */}
      {isLeftCollapsed && (
        <button
          onClick={() => setIsLeftCollapsed(false)}
          className="absolute left-0 top-1/2 z-10 -translate-y-1/2 rounded-r-lg border border-border-primary border-l-0 bg-bg-secondary px-2 py-4 shadow-md hover:bg-bg-tertiary"
          aria-label="Expand left panel"
        >
          <ChevronRight className="h-4 w-4 text-text-secondary" />
        </button>
      )}

      {isRightCollapsed && (
        <button
          onClick={() => setIsRightCollapsed(false)}
          className="absolute right-0 top-1/2 z-10 -translate-y-1/2 rounded-l-lg border border-border-primary border-r-0 bg-bg-secondary px-2 py-4 shadow-md hover:bg-bg-tertiary"
          aria-label="Expand right panel"
        >
          <ChevronLeft className="h-4 w-4 text-text-secondary" />
        </button>
      )}
    </div>
  );
};