"use client";

import { useState, useEffect } from "react";
import { GlassCard } from "@/components/base/GlassCard";
import { Button } from "@/components/base/Button";
import { CheckIcon, PlusIcon, StarIcon } from "@/components/icons/Icons";

interface LearningConcept {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours: number;
  prerequisites: string[];
  isRecommended?: boolean;
}

interface ConceptSelectionProps {
  availableConcepts: LearningConcept[];
  selectedConcepts: string[];
  onConceptsChange: (conceptIds: string[]) => void;
  onSkip: () => void;
  maxSelections?: number;
  showRecommendations?: boolean;
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
  beginner: "text-green-400 bg-green-400/10",
  intermediate: "text-yellow-400 bg-yellow-400/10",
  advanced: "text-red-400 bg-red-400/10",
};

export function ConceptSelection({
  availableConcepts,
  selectedConcepts,
  onConceptsChange,
  onSkip,
  maxSelections = 5,
  showRecommendations = true,
}: ConceptSelectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");

  // Get unique categories
  const categories = ["all", ...new Set(availableConcepts.map(c => c.category))];
  const difficulties = ["all", "beginner", "intermediate", "advanced"];

  // Filter concepts based on search and filters
  const filteredConcepts = availableConcepts.filter(concept => {
    const matchesSearch = concept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         concept.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || concept.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === "all" || concept.difficulty === selectedDifficulty;
    
    return matchesSearch && matchesCategory && matchesDifficulty;
  });

  // Separate recommended and other concepts
  const recommendedConcepts = filteredConcepts.filter(c => c.isRecommended);
  const otherConcepts = filteredConcepts.filter(c => !c.isRecommended);

  const handleConceptToggle = (conceptId: string) => {
    const isSelected = selectedConcepts.includes(conceptId);
    
    if (isSelected) {
      onConceptsChange(selectedConcepts.filter(id => id !== conceptId));
    } else if (selectedConcepts.length < maxSelections) {
      onConceptsChange([...selectedConcepts, conceptId]);
    }
  };

  const handleSelectRecommended = () => {
    const recommendedIds = recommendedConcepts.slice(0, maxSelections).map(c => c.id);
    onConceptsChange(recommendedIds);
  };

  const canSelectMore = selectedConcepts.length < maxSelections;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Choose Your Learning Concepts</h2>
        <p className="text-text-secondary">
          Select up to {maxSelections} concepts you'd like to learn. You can always add more later.
        </p>
        <div className="text-sm text-text-muted">
          {selectedConcepts.length} of {maxSelections} selected
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 justify-center">
        {showRecommendations && recommendedConcepts.length > 0 && (
          <Button
            variant="secondary"
            onClick={handleSelectRecommended}
            className="flex items-center gap-2"
          >
            <StarIcon size={16} />
            Select Recommended ({Math.min(recommendedConcepts.length, maxSelections)})
          </Button>
        )}
        <Button
          variant="outline"
          onClick={onSkip}
          className="flex items-center gap-2"
        >
          Skip for Now
        </Button>
      </div>

      {/* Search and Filters */}
      <GlassCard className="p-4">
        <div className="space-y-4">
          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="Search concepts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border border-white/10 rounded-md px-3 py-2 focus:border-electric-blue transition-colors"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-32">
              <label className="text-xs text-text-secondary uppercase tracking-wide">Category</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full mt-1 bg-bg-secondary border border-white/10 rounded-md px-3 py-2 text-sm focus:border-electric-blue transition-colors"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category === "all" ? "All Categories" : category.charAt(0).toUpperCase() + category.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 min-w-32">
              <label className="text-xs text-text-secondary uppercase tracking-wide">Difficulty</label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full mt-1 bg-bg-secondary border border-white/10 rounded-md px-3 py-2 text-sm focus:border-electric-blue transition-colors"
              >
                {difficulties.map(difficulty => (
                  <option key={difficulty} value={difficulty}>
                    {difficulty === "all" ? "All Levels" : difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Recommended Concepts */}
      {showRecommendations && recommendedConcepts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <StarIcon size={16} className="text-yellow-400" />
            <h3 className="font-medium">Recommended for You</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recommendedConcepts.map(concept => (
              <ConceptCard
                key={concept.id}
                concept={concept}
                isSelected={selectedConcepts.includes(concept.id)}
                onToggle={() => handleConceptToggle(concept.id)}
                canSelect={canSelectMore || selectedConcepts.includes(concept.id)}
                isRecommended
              />
            ))}
          </div>
        </div>
      )}

      {/* Other Concepts */}
      {otherConcepts.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium">All Concepts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {otherConcepts.map(concept => (
              <ConceptCard
                key={concept.id}
                concept={concept}
                isSelected={selectedConcepts.includes(concept.id)}
                onToggle={() => handleConceptToggle(concept.id)}
                canSelect={canSelectMore || selectedConcepts.includes(concept.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {filteredConcepts.length === 0 && (
        <div className="text-center py-8 text-text-secondary">
          <p>No concepts found matching your criteria.</p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("all");
              setSelectedDifficulty("all");
            }}
            className="mt-3"
          >
            Clear Filters
          </Button>
        </div>
      )}
    </div>
  );
}

interface ConceptCardProps {
  concept: LearningConcept;
  isSelected: boolean;
  onToggle: () => void;
  canSelect: boolean;
  isRecommended?: boolean;
}

function ConceptCard({ concept, isSelected, onToggle, canSelect, isRecommended }: ConceptCardProps) {
  return (
    <button
      onClick={onToggle}
      disabled={!canSelect && !isSelected}
      className={`
        text-left w-full transition-all duration-200
        ${isSelected 
          ? "ring-2 ring-electric-blue" 
          : canSelect 
            ? "hover:ring-1 hover:ring-white/20" 
            : "opacity-50 cursor-not-allowed"
        }
      `}
    >
      <GlassCard className={`p-4 h-full relative ${isSelected ? "bg-electric-blue/5" : ""}`}>
        {/* Recommended Badge */}
        {isRecommended && (
          <div className="absolute top-2 right-2">
            <StarIcon size={14} className="text-yellow-400" />
          </div>
        )}

        {/* Selection Indicator */}
        <div className="absolute top-2 left-2">
          <div className={`
            w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors
            ${isSelected 
              ? "bg-electric-blue border-electric-blue" 
              : "border-white/20"
            }
          `}>
            {isSelected && <CheckIcon size={12} className="text-white" />}
          </div>
        </div>

        <div className="pt-6 space-y-3">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="text-2xl">
              {categoryIcons[concept.category] || categoryIcons.general}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-text-primary truncate">{concept.name}</h4>
              <p className="text-sm text-text-secondary line-clamp-2 mt-1">
                {concept.description}
              </p>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full ${difficultyColors[concept.difficulty]}`}>
                {concept.difficulty}
              </span>
              <span className="text-text-muted">
                ~{concept.estimatedHours}h
              </span>
            </div>
            
            {concept.prerequisites.length > 0 && (
              <span className="text-text-muted">
                {concept.prerequisites.length} prereq{concept.prerequisites.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </GlassCard>
    </button>
  );
}