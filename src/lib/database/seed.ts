#!/usr/bin/env node

/**
 * Database Seed Script
 * 
 * This script seeds the database with sample data for development and testing.
 * 
 * Usage:
 *   npm run db:seed
 *   node -r ts-node/register src/lib/database/seed.ts
 */

import { UserService } from './services/userService';
import { ChatService } from './services/chatService';
import { initializeDatabase } from './config';

async function seedUsers() {
  console.log('👥 Seeding sample users...');
  
  const sampleUsers = [
    {
      name: 'Alex Chen',
      email: 'alex.chen@example.com',
      role: 'Software Engineer',
      experienceLevel: 'mid' as const,
      yearsOfExperience: 3,
      currentCompany: 'TechStart Inc',
      currentTitle: 'Frontend Developer',
      targetCompanies: JSON.stringify(['Google', 'Meta', 'Apple']),
      targetRoles: JSON.stringify(['Senior Software Engineer', 'Staff Engineer']),
      interviewTypes: JSON.stringify(['dsa', 'system_design', 'behavioral']),
      hoursPerWeek: 10,
      targetDate: '2024-06-01',
      currentSkills: JSON.stringify({
        'javascript': 8,
        'react': 9,
        'system_design': 6,
        'algorithms': 7,
        'databases': 6
      }),
      weakAreas: JSON.stringify(['system_design', 'distributed_systems', 'databases']),
      strongAreas: JSON.stringify(['frontend', 'react', 'javascript']),
      difficultyPreference: 'medium',
      learningStyle: 'hands-on',
      onboardingCompleted: true,
    },
    {
      name: 'Sarah Johnson',
      email: 'sarah.j@example.com',
      role: 'Product Manager',
      experienceLevel: 'senior' as const,
      yearsOfExperience: 6,
      currentCompany: 'Enterprise Corp',
      currentTitle: 'Senior Product Manager',
      targetCompanies: JSON.stringify(['Microsoft', 'Amazon', 'Netflix']),
      targetRoles: JSON.stringify(['Principal PM', 'Director of Product']),
      interviewTypes: JSON.stringify(['behavioral', 'system_design']),
      hoursPerWeek: 8,
      targetDate: '2024-07-15',
      currentSkills: JSON.stringify({
        'product_strategy': 9,
        'user_research': 8,
        'system_design': 7,
        'analytics': 8,
        'leadership': 9
      }),
      weakAreas: JSON.stringify(['technical_depth', 'system_design']),
      strongAreas: JSON.stringify(['product_strategy', 'user_research', 'leadership']),
      difficultyPreference: 'medium',
      learningStyle: 'mixed',
      onboardingCompleted: true,
    },
    {
      name: 'Mike Rodriguez',
      email: 'mike.r@example.com',
      role: 'Backend Engineer',
      experienceLevel: 'junior' as const,
      yearsOfExperience: 1,
      currentCompany: 'StartupCo',
      currentTitle: 'Junior Backend Developer',
      targetCompanies: JSON.stringify(['Stripe', 'Coinbase', 'Shopify']),
      targetRoles: JSON.stringify(['Software Engineer', 'Backend Engineer']),
      interviewTypes: JSON.stringify(['dsa', 'behavioral']),
      hoursPerWeek: 15,
      targetDate: '2024-05-01',
      currentSkills: JSON.stringify({
        'python': 7,
        'databases': 6,
        'algorithms': 5,
        'system_design': 3,
        'apis': 7
      }),
      weakAreas: JSON.stringify(['algorithms', 'system_design', 'data_structures']),
      strongAreas: JSON.stringify(['python', 'apis', 'databases']),
      difficultyPreference: 'easy',
      learningStyle: 'visual',
      onboardingCompleted: false, // Still in onboarding
    }
  ];

  const createdUsers = [];
  for (const userData of sampleUsers) {
    try {
      const user = await UserService.createUser(userData);
      createdUsers.push(user);
      console.log(`   ✅ Created user: ${user.name}`);
    } catch (error) {
      console.log(`   ❌ Failed to create user: ${userData.name}`);
    }
  }

  return createdUsers;
}

async function seedConversations(users: any[]) {
  console.log('💬 Seeding sample conversations...');

  const sampleConversations = [
    {
      userId: users[0]?.id,
      title: 'System Design: URL Shortener',
      context: 'system_design',
      messages: [
        {
          role: 'user' as const,
          content: 'Can you help me design a URL shortener like bit.ly? I have an interview coming up and this is a common system design question.',
        },
        {
          role: 'assistant' as const,
          content: `Great question! URL shorteners are indeed popular in system design interviews. Let me break this down step by step.

## High-Level Requirements

**Functional Requirements:**
- Shorten long URLs to short aliases
- Redirect short URLs to original URLs  
- Custom aliases (optional)
- URL expiration
- Analytics (click tracking)

**Non-Functional Requirements:**
- High availability (99.9%+)
- Low latency for redirects (<100ms)
- Scale: 100M URLs shortened per day
- Read-heavy: 100:1 read/write ratio

## System Architecture

\`\`\`
[Client] -> [Load Balancer] -> [App Servers] -> [Database]
                                    |
                                [Cache Layer]
\`\`\`

## Database Design

**URL Table:**
- short_url (PK)
- long_url
- user_id
- created_at
- expires_at
- click_count

Would you like me to dive deeper into any specific component?`,
          tokens: 185,
          model: 'gpt-4',
        }
      ]
    },
    {
      userId: users[1]?.id,
      title: 'Product Strategy Discussion',
      context: 'behavioral',
      messages: [
        {
          role: 'user' as const,
          content: 'I need help preparing for behavioral questions about product failures. Can you help me structure my responses?',
        },
        {
          role: 'assistant' as const,
          content: `Absolutely! Behavioral questions about failures are common and important. Here's how to structure your responses using the STAR method:

## STAR Framework for Failure Questions

**Situation:** Set the context
- What product/feature?
- Your role and team
- Timeline and constraints

**Task:** What was the goal?
- Success metrics
- User problems to solve
- Business objectives

**Action:** What did you do?
- Decisions made
- Process followed
- Stakeholder management

**Result:** What happened?
- Metrics/outcome
- Lessons learned
- How you applied learnings

## Key Tips:
1. **Choose real failures** - authenticity matters
2. **Own your part** - don't blame others
3. **Focus on learning** - what you'd do differently
4. **Quantify impact** - use specific numbers
5. **End positively** - how it made you better

Would you like to practice with a specific failure scenario?`,
          tokens: 156,
          model: 'gpt-4',
        }
      ]
    }
  ];

  for (const convData of sampleConversations) {
    if (!convData.userId) continue;

    try {
      const conversation = await ChatService.createConversation({
        userId: convData.userId,
        title: convData.title,
        context: convData.context,
      });

      // Add messages
      for (const msgData of convData.messages) {
        await ChatService.addMessage({
          conversationId: conversation.id,
          role: msgData.role,
          content: msgData.content,
          tokens: msgData.tokens,
          model: msgData.model,
        });
      }

      console.log(`   ✅ Created conversation: ${conversation.title}`);
    } catch (error) {
      console.log(`   ❌ Failed to create conversation: ${convData.title}`);
    }
  }
}

async function main() {
  console.log('🌱 Starting database seeding...\n');

  try {
    // Ensure database is initialized
    initializeDatabase();

    // Seed data
    const users = await seedUsers();
    await seedConversations(users);

    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📊 Sample data created:');
    console.log('   - 3 sample users with different experience levels');
    console.log('   - 2 sample conversations with messages');
    console.log('   - User settings and preferences');
    
    console.log('\n🔧 Next steps:');
    console.log('   - Run `npm run dev` to start the application');
    console.log('   - Run `npm run db:studio` to view the seeded data');
    console.log('   - Login with any of the sample email addresses');

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
