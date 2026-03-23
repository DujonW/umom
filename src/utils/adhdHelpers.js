/**
 * Maps a 1-10 score to a descriptive emoji label.
 */
function scoreToEmoji(score) {
  if (score <= 2) return '😔 Very low';
  if (score <= 4) return '😕 Low';
  if (score <= 6) return '😐 Moderate';
  if (score <= 8) return '🙂 Good';
  return '😄 Great';
}

/**
 * Returns a symptom/strategy profile for a given menstrual cycle phase.
 */
function phaseToSymptomProfile(phase) {
  const profiles = {
    menstrual: {
      adhdImpact: 'high',
      commonSymptoms: ['brain fog', 'fatigue', 'emotional sensitivity', 'pain distraction'],
      recommendedStrategies: ['rest-friendly tasks', 'body doubling for basics', 'self-compassion focus'],
      capacityMultiplier: 0.6,
    },
    follicular: {
      adhdImpact: 'low',
      commonSymptoms: ['increased energy', 'improved focus', 'optimism'],
      recommendedStrategies: ['tackle harder tasks', 'start new projects', 'social commitments'],
      capacityMultiplier: 1.0,
    },
    ovulatory: {
      adhdImpact: 'minimal',
      commonSymptoms: ['high energy', 'social confidence', 'verbal fluency'],
      recommendedStrategies: ['important conversations', 'creative work', 'presentations'],
      capacityMultiplier: 1.1,
    },
    luteal: {
      adhdImpact: 'moderate-to-high',
      commonSymptoms: ['irritability', 'rejection sensitivity', 'brain fog late in phase', 'overwhelm'],
      recommendedStrategies: ['structured routines', 'reduce decision load', 'extra self-compassion'],
      capacityMultiplier: 0.75,
    },
  };
  return profiles[phase] || profiles.follicular;
}

/**
 * Breaks a task description into ADHD-friendly micro-steps.
 * Returns up to 5 steps starting with the smallest physical action.
 */
function breakTaskIntoSteps(task) {
  // This is a heuristic helper; actual AI-driven breakdown happens in ai.service.js
  return [
    `Open whatever you need to do "${task}"`,
    'Write down or say out loud what "done" looks like',
    'Do just the first 5 minutes',
    'Take a break if needed',
    'Decide: continue or call it a valid attempt',
  ];
}

/**
 * Estimates task difficulty for ADHD based on task properties.
 * Returns: 'low' | 'medium' | 'high'
 */
function estimateTaskDifficulty({ estimatedMinutes = 30, tags = [], description = '' } = {}) {
  const highDifficultyKeywords = ['call', 'email', 'phone', 'paperwork', 'taxes', 'appointment', 'confrontation'];
  const hasHighKeyword = highDifficultyKeywords.some(
    (kw) => description.toLowerCase().includes(kw) || tags.map((t) => t.toLowerCase()).includes(kw)
  );

  if (hasHighKeyword || estimatedMinutes > 60) return 'high';
  if (estimatedMinutes > 20) return 'medium';
  return 'low';
}

module.exports = { scoreToEmoji, phaseToSymptomProfile, breakTaskIntoSteps, estimateTaskDifficulty };
