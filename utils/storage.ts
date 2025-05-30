const LEARNED_SET_INDEXES_KEY = 'eciaQuiz_learnedSetIndexes_v1';
const STUDY_SET_PROGRESS_KEY_PREFIX = 'eciaQuiz_studySetProgress_v1_';

export interface StudyProgressState {
  primaryDeckIds: number[];
  reviewPileIds: number[];
  masteredIds: number[];
  questionsSinceLastReview: number;
  allQuestionIdsInSetOrder?: number[]; // Optional: to preserve original shuffle or order if needed for rehydration
}

// --- Learned Sets Management ---
export const getLearnedSetIndexes = (): Set<number> => {
  try {
    const stored = localStorage.getItem(LEARNED_SET_INDEXES_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return new Set(parsed.filter(item => typeof item === 'number'));
      }
    }
  } catch (error) {
    console.error("Error reading learned set indexes from localStorage:", error);
  }
  return new Set();
};

export const saveLearnedSetIndexes = (setIndexes: Set<number>): void => {
  try {
    localStorage.setItem(LEARNED_SET_INDEXES_KEY, JSON.stringify(Array.from(setIndexes)));
  } catch (error) {
    console.error("Error saving learned set indexes to localStorage:", error);
  }
};

export const addLearnedSetIndex = (setIndex: number): void => {
  const currentLearned = getLearnedSetIndexes();
  currentLearned.add(setIndex);
  saveLearnedSetIndexes(currentLearned);
};

export const isSetLearned = (setIndex: number): boolean => {
  return getLearnedSetIndexes().has(setIndex);
};

// --- Study Set Progress Management ---
const getStudySetProgressKey = (setIndex: number) => `${STUDY_SET_PROGRESS_KEY_PREFIX}${setIndex}`;

export const getStudySetProgress = (setIndex: number): StudyProgressState | null => {
  try {
    const stored = localStorage.getItem(getStudySetProgressKey(setIndex));
    if (stored) {
      return JSON.parse(stored) as StudyProgressState;
    }
  } catch (error) {
    console.error(`Error reading study progress for set ${setIndex} from localStorage:`, error);
  }
  return null;
};

export const saveStudySetProgress = (setIndex: number, progress: StudyProgressState): void => {
  try {
    localStorage.setItem(getStudySetProgressKey(setIndex), JSON.stringify(progress));
  } catch (error) {
    console.error(`Error saving study progress for set ${setIndex} to localStorage:`, error);
  }
};

export const clearStudySetProgress = (setIndex: number): void => {
  try {
    localStorage.removeItem(getStudySetProgressKey(setIndex));
  } catch (error) {
    console.error(`Error clearing study progress for set ${setIndex} from localStorage:`, error);
  }
};

// --- Global Progress Management ---
export const clearAllProgress = (): void => {
  try {
    // Clear learned sets
    localStorage.removeItem(LEARNED_SET_INDEXES_KEY);
    
    // Clear all study set progresses
    // This requires iterating through keys or having a known max number of sets.
    // For simplicity, if App.tsx calls this, it can iterate its known sets.
    // Alternatively, we find all keys with the prefix.
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(STUDY_SET_PROGRESS_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    });

  } catch (error) {
    console.error("Error clearing all progress from localStorage:", error);
  }
};