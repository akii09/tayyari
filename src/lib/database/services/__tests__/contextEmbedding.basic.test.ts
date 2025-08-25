/**
 * Basic Context Embedding Service Tests
 * Simple tests to verify core functionality
 */

import { describe, it, expect } from 'vitest';
import { ContextEmbeddingService } from '../contextEmbeddingService';

describe('ContextEmbeddingService - Basic Tests', () => {
  const service = new ContextEmbeddingService();

  describe('generateEmbedding', () => {
    it('should generate consistent embeddings', async () => {
      const content = 'Test content for embedding';
      
      const embedding1 = await service.generateEmbedding(content);
      const embedding2 = await service.generateEmbedding(content);
      
      expect(embedding1).toEqual(embedding2);
      expect(embedding1.length).toBe(1536);
      expect(embedding1.every(val => typeof val === 'number')).toBe(true);
    });

    it('should generate different embeddings for different content', async () => {
      const content1 = 'First test content';
      const content2 = 'Second test content';
      
      const embedding1 = await service.generateEmbedding(content1);
      const embedding2 = await service.generateEmbedding(content2);
      
      expect(embedding1).not.toEqual(embedding2);
    });
  });

  describe('calculateCosineSimilarity', () => {
    it('should calculate similarity correctly', () => {
      // Access private method for testing
      const calculateSimilarity = (service as any).calculateCosineSimilarity.bind(service);
      
      // Test identical vectors
      const identical = calculateSimilarity([1, 0, 0], [1, 0, 0]);
      expect(identical).toBeCloseTo(1.0, 5);
      
      // Test orthogonal vectors
      const orthogonal = calculateSimilarity([1, 0, 0], [0, 1, 0]);
      expect(orthogonal).toBeCloseTo(0.0, 5);
      
      // Test opposite vectors
      const opposite = calculateSimilarity([1, 0, 0], [-1, 0, 0]);
      expect(opposite).toBeCloseTo(-1.0, 5);
    });

    it('should handle zero vectors', () => {
      const calculateSimilarity = (service as any).calculateCosineSimilarity.bind(service);
      
      const result = calculateSimilarity([0, 0, 0], [1, 0, 0]);
      expect(result).toBe(0);
    });

    it('should throw error for different length vectors', () => {
      const calculateSimilarity = (service as any).calculateCosineSimilarity.bind(service);
      
      expect(() => calculateSimilarity([1, 0], [1, 0, 0]))
        .toThrow('Vectors must have the same length');
    });
  });

  describe('simpleHash', () => {
    it('should generate consistent hashes', () => {
      const simpleHash = (service as any).simpleHash.bind(service);
      
      const hash1 = simpleHash('test string');
      const hash2 = simpleHash('test string');
      
      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('number');
    });

    it('should generate different hashes for different strings', () => {
      const simpleHash = (service as any).simpleHash.bind(service);
      
      const hash1 = simpleHash('string one');
      const hash2 = simpleHash('string two');
      
      expect(hash1).not.toBe(hash2);
    });
  });
});