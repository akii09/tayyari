/**
 * Centralized Application Metadata Configuration
 * 
 * This file contains all branding, metadata, and configuration constants
 * used throughout the TayyarAI application.
 */

export const APP_METADATA = {
  // Brand Identity
  name: 'TayyarAI',
  displayName: 'TayyarAI',
  tagline: 'Smarter Prep. Faster Progress.',
  description: 'AI-powered interview preparation platform for developers',
  
  // URLs and Domains
  url: process.env.NEXT_PUBLIC_APP_URL || 'https://tayyarai.com',
  domain: 'tayyarai.com',
  
  // Social and SEO
  keywords: [
    'interview preparation',
    'coding interviews',
    'system design',
    'AI assistant',
    'developer tools',
    'technical interviews',
    'career development'
  ],
  
  // File naming conventions
  filePrefix: 'tayyarai',
  
  // Database and Session
  sessionCookieName: 'tayyarai-session',
  databaseName: 'tayyarai.db',
  
  // AI Assistant
  aiName: 'TayyarAI Assistant',
  aiModel: 'tayyarai-v1',
  
  // Company Info
  company: {
    name: 'TayyarAI',
    founded: new Date().getFullYear(),
    copyright: `© ${new Date().getFullYear()} TayyarAI. All rights reserved.`,
  },
  
  // Contact and Support
  contact: {
    email: 'support@tayyarai.com',
    twitter: '@tayyarai',
    github: 'https://github.com/tayyarai',
  },
  
  // Technical Configuration
  version: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
} as const;

// SEO Metadata Templates
export const SEO_TEMPLATES = {
  default: {
    title: `${APP_METADATA.name} — ${APP_METADATA.tagline}`,
    description: APP_METADATA.description,
    keywords: APP_METADATA.keywords.join(', '),
  },
  
  chat: {
    title: `AI Chat — ${APP_METADATA.name}`,
    description: 'Interactive AI assistant for coding interviews and technical preparation',
  },
  
  settings: {
    title: `Settings — ${APP_METADATA.name}`,
    description: 'Manage your account, preferences, and privacy settings',
  },
  
  onboarding: {
    title: `Get Started — ${APP_METADATA.name}`,
    description: 'Set up your personalized interview preparation journey',
  },
} as const;

// Export utility functions
export const getPageTitle = (page?: keyof typeof SEO_TEMPLATES) => {
  return page ? SEO_TEMPLATES[page].title : SEO_TEMPLATES.default.title;
};

export const getPageDescription = (page?: keyof typeof SEO_TEMPLATES) => {
  return page ? SEO_TEMPLATES[page].description : SEO_TEMPLATES.default.description;
};

export const getFilePrefix = () => APP_METADATA.filePrefix;
export const getAIName = () => APP_METADATA.aiName;
export const getCopyright = () => APP_METADATA.company.copyright;
