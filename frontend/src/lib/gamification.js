/**
 * Gamification Engine - LocalStorage Based
 * 
 * Manages user stats, XP, streaks, and weekly goals using localStorage.
 * This is a temporary solution until backend APIs are ready.
 */

// LocalStorage Keys
const KEYS = {
  USER_PROFILE: 'userProfile',
  USER_STATS: 'userStats',
  ACTIVITY: 'activity',
};

/**
 * Initialize user stats from profile
 */
export function initUserStats(profile) {
  const stats = {
    xpTotal: 0,
    level: 1,
    currentStreak: 0,
    lastTestDateISO: null,
    weeklyGoalCount: getWeeklyGoalFromPreference(profile.testsPerWeek || '1-2 tests'),
    weeklyCompletedCount: 0,
    lastWeekISO: getCurrentWeekISO(),
  };

  saveUserStats(stats);
  return stats;
}

/**
 * Get weekly goal count from preference string
 */
function getWeeklyGoalFromPreference(preference) {
  if (preference === 'Daily practice') return 7;
  if (preference === '3-5 tests') return 4;
  if (preference === '1-2 tests') return 2;
  return 2; // default
}

/**
 * Get current week ISO string (YYYY-WW format)
 */
function getCurrentWeekISO() {
  const now = new Date();
  const year = now.getFullYear();
  const week = getWeekNumber(now);
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

/**
 * Get week number of year
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Award XP to user
 */
export function awardXP(reason, amount) {
  const stats = getUserStats();
  if (!stats) return;

  stats.xpTotal = (stats.xpTotal || 0) + amount;
  stats.level = computeLevel(stats.xpTotal);

  saveUserStats(stats);

  // Log XP award (optional, for debugging)
  console.log(`Awarded ${amount} XP for: ${reason}`);

  return stats;
}

/**
 * Update streak on test completion
 */
export function updateStreakOnTestCompletion(dateISO) {
  const stats = getUserStats();
  if (!stats) return;

  const testDate = new Date(dateISO);
  const lastTestDate = stats.lastTestDateISO ? new Date(stats.lastTestDateISO) : null;

  if (!lastTestDate) {
    // First test
    stats.currentStreak = 1;
  } else {
    const daysDiff = Math.floor((testDate - lastTestDate) / (1000 * 60 * 60 * 24));

    if (daysDiff === 1) {
      // Consecutive day
      stats.currentStreak = (stats.currentStreak || 0) + 1;
    } else if (daysDiff === 0) {
      // Same day, don't change streak
      // Keep current streak
    } else {
      // Streak broken
      stats.currentStreak = 1;
    }
  }

  stats.lastTestDateISO = dateISO;
  saveUserStats(stats);

  return stats.currentStreak;
}

/**
 * Update weekly progress
 */
export function updateWeeklyProgress(dateISO) {
  const stats = getUserStats();
  if (!stats) return;

  const currentWeek = getCurrentWeekISO();

  // If new week, reset count
  if (stats.lastWeekISO !== currentWeek) {
    stats.weeklyCompletedCount = 1;
    stats.lastWeekISO = currentWeek;
  } else {
    stats.weeklyCompletedCount = (stats.weeklyCompletedCount || 0) + 1;
  }

  saveUserStats(stats);

  return stats.weeklyCompletedCount;
}

/**
 * Compute level from XP total
 */
export function computeLevel(xpTotal) {
  return Math.floor(xpTotal / 500) + 1;
}

/**
 * Get XP progress within current level
 */
export function getXPProgress(xpTotal) {
  const level = computeLevel(xpTotal);
  const xpInCurrentLevel = xpTotal % 500;
  const xpForNextLevel = 500;
  const progress = (xpInCurrentLevel / xpForNextLevel) * 100;

  return {
    level,
    xpInCurrentLevel,
    xpForNextLevel,
    progress: Math.min(progress, 100),
  };
}

/**
 * Get today's focus tasks
 */
export function getTodaysTasks(profile, stats, activity) {
  const tasks = [];
  const today = new Date().toISOString().split('T')[0];
  
  // Ensure activity is always an object
  const safeActivity = activity || { recentTests: [], weakSubjects: [] };
  if (!safeActivity.recentTests) {
    safeActivity.recentTests = [];
  }
  if (!safeActivity.weakSubjects) {
    safeActivity.weakSubjects = [];
  }
  
  const lastTestDate = safeActivity.recentTests?.[0]?.dateISO?.split('T')[0];

  // Task 1: Take practice test (if not taken today)
  if (lastTestDate !== today) {
    tasks.push({
      id: 'take-test',
      title: 'Take a practice test',
      description: 'Complete a mock test to track your progress',
      xpReward: 50,
      href: '/mock-tests',
      cta: 'Start Test',
      priority: 'high',
    });
  }

  // Task 2: Weekly goal check
  if (stats && stats.weeklyCompletedCount !== undefined && stats.weeklyGoalCount !== undefined) {
    if (stats.weeklyCompletedCount < stats.weeklyGoalCount) {
      const remaining = stats.weeklyGoalCount - stats.weeklyCompletedCount;
      tasks.push({
        id: 'weekly-goal',
        title: `Complete weekly goal (${remaining} ${remaining === 1 ? 'test' : 'tests'} left)`,
        description: `You've completed ${stats.weeklyCompletedCount}/${stats.weeklyGoalCount} tests this week`,
        xpReward: 30,
        href: '/mock-tests',
        cta: 'Take Test',
        priority: 'medium',
      });
    }
  }

  // Task 3: Review wrong questions (if tests exist)
  if (safeActivity.recentTests && safeActivity.recentTests.length > 0) {
    tasks.push({
      id: 'review-questions',
      title: 'Review weak questions',
      description: 'Go through questions you got wrong to improve',
      xpReward: 20,
      href: '/mock-tests',
      cta: 'Review',
      priority: 'low',
    });
  }

  return tasks.slice(0, 3); // Max 3 tasks
}

/**
 * Add test result to activity
 */
export function addTestResult(testResult) {
  const activity = getActivity();
  
  if (!activity.recentTests) {
    activity.recentTests = [];
  }

  // Add to beginning
  activity.recentTests.unshift({
    testId: testResult.testId,
    testTitle: testResult.testTitle,
    score: testResult.score,
    percentile: testResult.percentile,
    dateISO: testResult.dateISO || new Date().toISOString(),
  });

  // Keep only last 10
  if (activity.recentTests.length > 10) {
    activity.recentTests = activity.recentTests.slice(0, 10);
  }

  saveActivity(activity);
  return activity;
}

/**
 * Update weak subjects from test results
 */
export function updateWeakSubjects(subjectAccuracy) {
  const activity = getActivity();
  
  // Simple implementation: track subjects with < 70% accuracy
  const weakSubjects = Object.entries(subjectAccuracy)
    .filter(([_, accuracy]) => accuracy < 70)
    .map(([subject, _]) => subject);

  activity.weakSubjects = [...new Set(weakSubjects)]; // Remove duplicates
  saveActivity(activity);

  return activity.weakSubjects;
}

// ==================== LocalStorage Helpers ====================

/**
 * Get user profile from localStorage
 */
export function getUserProfile() {
  try {
    const data = localStorage.getItem(KEYS.USER_PROFILE);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error reading user profile:', error);
    return null;
  }
}

/**
 * Save user profile to localStorage
 */
export function saveUserProfile(profile) {
  try {
    localStorage.setItem(KEYS.USER_PROFILE, JSON.stringify(profile));
  } catch (error) {
    console.error('Error saving user profile:', error);
  }
}

/**
 * Get user stats from localStorage
 */
export function getUserStats() {
  try {
    const data = localStorage.getItem(KEYS.USER_STATS);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error reading user stats:', error);
    return null;
  }
}

/**
 * Save user stats to localStorage
 */
export function saveUserStats(stats) {
  try {
    localStorage.setItem(KEYS.USER_STATS, JSON.stringify(stats));
  } catch (error) {
    console.error('Error saving user stats:', error);
  }
}

/**
 * Get activity from localStorage
 */
export function getActivity() {
  try {
    const data = localStorage.getItem(KEYS.ACTIVITY);
    return data ? JSON.parse(data) : { recentTests: [], weakSubjects: [] };
  } catch (error) {
    console.error('Error reading activity:', error);
    return { recentTests: [], weakSubjects: [] };
  }
}

/**
 * Save activity to localStorage
 */
export function saveActivity(activity) {
  try {
    localStorage.setItem(KEYS.ACTIVITY, JSON.stringify(activity));
  } catch (error) {
    console.error('Error saving activity:', error);
  }
}

/**
 * Initialize user data (call after registration/preferences)
 */
export function initializeUserData(profile) {
  // Save profile
  saveUserProfile(profile);

  // Initialize stats if not exists
  let stats = getUserStats();
  if (!stats) {
    stats = initUserStats(profile);
  } else {
    // Update weekly goal if preference changed
    stats.weeklyGoalCount = getWeeklyGoalFromPreference(profile.testsPerWeek || '1-2 tests');
    saveUserStats(stats);
  }

  // Initialize activity if not exists
  let activity = getActivity();
  if (!activity.recentTests) {
    activity.recentTests = [];
  }
  if (!activity.weakSubjects) {
    activity.weakSubjects = [];
  }
  saveActivity(activity);
}

