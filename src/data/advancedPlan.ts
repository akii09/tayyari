export const advancedPlanContent = `
# Personalized Prep Roadmap

> Focused on DSA + System Design with weekly mocks. Target: 6 weeks.

## Week 1–2: Foundations
- Arrays, Strings, Hashing
- Sorting patterns (two-pointers, sliding window)
- Daily practice: 2 easy + 1 medium

\`\`\`python
# Sliding Window Template (Python)
def find_max_sum(nums, k):
    window_sum = 0
    left = 0
    best = 0
    for right, value in enumerate(nums):
        window_sum += value
        if right - left + 1 > k:
            window_sum -= nums[left]
            left += 1
        best = max(best, window_sum)
    return best
\`\`\`

## Week 3–4: System Design
- Caching, Sharding, Queues, Rate limiting
- Design 2 systems: URL Shortener, Chat Service

\`\`\`mermaid
graph TD;
A[Client] --> B[API Gateway]
B --> C[Auth]
B --> D[Services]
D --> E[DB/Cache]
\`\`\`

## Week 5: Mocks + Behavioral
- 2 mock interviews (live)
- STAR stories polish

## Week 6: Review + Final Sprint
- Address weak areas from analytics
- Interview stamina & timing drills

### Resources
- NeetCode patterns
- Grokking System Design
- Company-specific guides
`;

