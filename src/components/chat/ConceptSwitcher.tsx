"use client";

import { useState, useRef, useEffect } from "react";
import { GlassCard } from "@/components/base/GlassCard";
import { Button } from "@/components/base/Button";
import { 
  ChevronDownIcon, 
  CheckIcon, 
  PlusIcon, 
  BookIcon,
  ClockIcon,
  TrendingUpIcon,
  BrainIcon
} from "@/components/icons/Icons";

interface LearningConcept {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  completionPercentage: number;
  timeSpent: number;
  lastStudied: Date | null;
  isActive: boolean;
  contextLoaded: boolean;
}

interface ConceptSwitcherProps {
  concepts: LearningConcept[];
  activeConcept: LearningConcept | null;
  onConceptChange: (concept: LearningConcept) => void;
  onAddConcept: () => void;
  isLoadingContext?: boolean;
  contextStatus?: {
    totalMessages: number;
    relevantKnowledge: number;
    lastUpdated: Date;
  };
}

const categoryIcons: Record<string, string> = {
  programming: "💻",
  mathematics: "📊",
  science: "🔬",
  business: "💼",
  design: "🎨",
  language: "🗣️",
  general: "📚",
};

const difficultyColors = {
  beginner: "text-green-400",
  intermediate: "text-yellow-400",
  advanced: "text-red-400",
};

export function ConceptSwitcher({
  concepts,
  activeConcept,
  onConceptChange,
  onAddConcept,
  isLoadingContext = false,
  contextStatus,
}: ConceptSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeConcepts = concepts.filter(c => c.isActive);
  const inactiveConcepts = concepts.filter(c => !c.isActive);

  const handleConceptSelect = (concept: LearningConcept) => {
    onConceptChange(concept);
    setIsOpen(false);
  };

  const formatTimeSpent = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    return `${Math.round(hours * 10) / 10}h`;
  };

  const formatLastStudied = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Current Concept Display */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full flex items-center justify-between p-3 rounded-lg transition-all
          ${activeConcept 
            ? 'glass-card hover:bg-white/10' 
            : 'border-2 border-dashed border-white/20 hover:border-white/40'
          }
          ${isLoadingContext ? 'animate-pulse' : ''}
        `}
      >
        <div className="flex items-center gap-3 min-w-0">
          {activeConcept ? (
            <>
              <div className="text-xl">
                {categoryIcons[activeConcept.category] || categoryIcons.general}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-text-primary truncate">
                    {activeConcept.name}
                  </span>
                  {isLoadingContext && (
                    <div className="w-3 h-3 border border-electric-blue border-t-transparent rounded-full animate-spin" />
                  )}
                  {activeConcept.contextLoaded && !isLoadingContext && (
                    <BrainIcon size={14} className="text-electric-blue" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <span className={difficultyColors[activeConcept.difficulty]}>
                    {activeConcept.difficulty}
                  </span>
                  <span>•</span>
                  <span>{Math.round(activeConcept.completionPercentage)}% complete</span>
                  <span>•</span>
                  <span>{formatTimeSpent(activeConcept.timeSpent)} studied</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <BookIcon size={20} className="text-text-muted" />
              <div className="text-left">
                <div className="font-medium text-text-secondary">Select Learning Concept</div>
                <div className="text-xs text-text-muted">Choose what you want to learn about</div>
              </div>
            </>
          )}
        </div>
        
        <ChevronDownIcon 
          size={16} 
          className={`text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Context Status Indicator */}
      {activeConcept && contextStatus && (
        <div className="mt-2 px-3 py-2 bg-electric-blue/10 rounded-lg">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <span className="text-electric-blue">
                {contextStatus.totalMessages} messages loaded
              </span>
              <span className="text-text-muted">
                {contextStatus.relevantKnowledge} knowledge chunks
              </span>
            </div>
            <span className="text-text-muted">
              Updated {formatLastStudied(contextStatus.lastUpdated)}
            </span>
          </div>
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50">
          <GlassCard className="p-2 max-h-96 overflow-y-auto">
            {/* Active Concepts */}
            {activeConcepts.length > 0 && (
              <div className="mb-4">
                <div className="px-3 py-2 text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Active Concepts
                </div>
                <div className="space-y-1">
                  {activeConcepts.map(concept => (
                    <ConceptOption
                      key={concept.id}
                      concept={concept}
                      isSelected={activeConcept?.id === concept.id}
                      onClick={() => handleConceptSelect(concept)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Inactive Concepts */}
            {inactiveConcepts.length > 0 && (
              <div className="mb-4">
                <div className="px-3 py-2 text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Other Concepts
                </div>
                <div className="space-y-1">
                  {inactiveConcepts.map(concept => (
                    <ConceptOption
                      key={concept.id}
                      concept={concept}
                      isSelected={false}
                      onClick={() => handleConceptSelect(concept)}
                      isInactive
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Add New Concept */}
            <div className="border-t border-white/10 pt-2">
              <button
                onClick={() => {
                  onAddConcept();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/5 transition-colors text-left"
              >
                <div className="w-8 h-8 bg-electric-blue/20 rounded-lg flex items-center justify-center">
                  <PlusIcon size={16} className="text-electric-blue" />
                </div>
                <div>
                  <div className="font-medium text-text-primary">Add New Concept</div>
                  <div className="text-xs text-text-secondary">Start learning something new</div>
                </div>
              </button>
            </div>

            {/* No Concepts */}
            {concepts.length === 0 && (
              <div className="text-center py-8 text-text-secondary">
                <BookIcon size={32} className="mx-auto mb-3 text-text-muted" />
                <p className="font-medium">No learning concepts yet</p>
                <p className="text-sm text-text-muted mt-1">Add your first concept to get started</p>
                <Button
                  onClick={() => {
                    onAddConcept();
                    setIsOpen(false);
                  }}
                  className="mt-3"
                  size="sm"
                >
                  Add Concept
                </Button>
              </div>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
}

interface ConceptOptionProps {
  concept: LearningConcept;
  isSelected: boolean;
  onClick: () => void;
  isInactive?: boolean;
}

function ConceptOption({ concept, isSelected, onClick, isInactive }: ConceptOptionProps) {
  const formatTimeSpent = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    return `${Math.round(hours * 10) / 10}h`;
  };

  const formatLastStudied = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 7)}w ago`;
  };

  return (
    <button
      onClick={onClick}
      className={`
        w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left
        ${isSelected 
          ? 'bg-electric-blue/20 ring-1 ring-electric-blue' 
          : 'hover:bg-white/5'
        }
        ${isInactive ? 'opacity-60' : ''}
      `}
    >
      <div className="flex-shrink-0">
        <div className="text-lg">
          {categoryIcons[concept.category] || categoryIcons.general}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-text-primary truncate">
            {concept.name}
          </span>
          {isSelected && <CheckIcon size={14} className="text-electric-blue" />}
          {concept.contextLoaded && (
            <BrainIcon size={12} className="text-electric-blue" />
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-text-secondary">
          <div className="flex items-center gap-1">
            <TrendingUpIcon size={12} />
            <span>{Math.round(concept.completionPercentage)}%</span>
          </div>
          
          <div className="flex items-center gap-1">
            <ClockIcon size={12} />
            <span>{formatTimeSpent(concept.timeSpent)}</span>
          </div>
          
          <span className={difficultyColors[concept.difficulty]}>
            {concept.difficulty}
          </span>
          
          <span className="text-text-muted">
            {formatLastStudied(concept.lastStudied)}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mt-2 w-full bg-white/10 rounded-full h-1">
          <div 
            className="bg-electric-blue h-1 rounded-full transition-all duration-300"
            style={{ width: `${concept.completionPercentage}%` }}
          />
        </div>
      </div>
    </button>
  );
}