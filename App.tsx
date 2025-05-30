
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { LearnMode } from './components/LearnMode';
import { StudyMode } from './components/StudyMode';
import { quizData, QUIZ_TITLE, QUESTIONS_PER_SET } from './constants';
import { AppMode, QAItem } from './types';
import { AcademicCapIconSolid, BookOpenIconSolid, CheckCircleIcon, ArrowLeftCircleIcon } from './components/Icons';
import { getLearnedSetIndexes, addLearnedSetIndex, clearAllProgress as clearStorageProgress, getStudySetProgress, clearStudySetProgress as clearStorageStudyProgressForSet } from './utils/storage';

interface QuizSet {
  index: number;
  name: string;
  questions: QAItem[];
  isLearned: boolean;
  masteredCount?: number;
  totalQuestionsInSet?: number;
}

const createQuizSets = (
    data: QAItem[], 
    questionsPerSet: number, 
    learnedIndexes: Set<number>
): QuizSet[] => {
  const sets: QuizSet[] = [];
  for (let i = 0; i < data.length; i += questionsPerSet) {
    const setIndex = Math.floor(i / questionsPerSet);
    const currentSetQuestions = data.slice(i, i + questionsPerSet);
    const studyProgress = getStudySetProgress(setIndex);

    sets.push({
      index: setIndex,
      name: `Bloco ${setIndex + 1}`,
      questions: currentSetQuestions,
      isLearned: learnedIndexes.has(setIndex),
      masteredCount: studyProgress ? studyProgress.masteredIds.length : 0,
      totalQuestionsInSet: currentSetQuestions.length,
    });
  }
  return sets;
};

const App: React.FC = () => {
  const [appView, setAppView] = useState<'setSelection' | 'learn' | 'study'>('setSelection');
  const [currentSetIndex, setCurrentSetIndex] = useState<number | null>(null);
  const [learnedSetIndexes, setLearnedSetIndexes] = useState<Set<number>>(new Set());
  const [globalAppMode, setGlobalAppMode] = useState<AppMode>(AppMode.Learn);
  const [progressVersion, setProgressVersion] = useState(0); // For forcing progress refresh

  useEffect(() => {
    setLearnedSetIndexes(getLearnedSetIndexes());
  }, []);

  useEffect(() => {
    // Refresh progress when returning to set selection
    if (appView === 'setSelection') {
      setProgressVersion(v => v + 1);
    }
  }, [appView]);

  const quizSets = useMemo(() => {
    return createQuizSets(quizData, QUESTIONS_PER_SET, learnedSetIndexes);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learnedSetIndexes, progressVersion]);

  const handleSelectSet = useCallback((index: number) => {
    setCurrentSetIndex(index);
    if (globalAppMode === AppMode.Study) {
      setAppView('study'); 
    } else { 
      setAppView('learn');
    }
  }, [globalAppMode]);

  const handleSetLearned = useCallback((setIndex: number) => {
    addLearnedSetIndex(setIndex);
    setLearnedSetIndexes(prev => {
      const newSet = new Set(prev);
      newSet.add(setIndex);
      return newSet;
    });
    setAppView('setSelection'); 
  }, []);

  const handleBackToSetSelection = useCallback(() => {
    setCurrentSetIndex(null);
    setAppView('setSelection');
    // setProgressVersion(v => v + 1); // Already handled by useEffect on appView change
  }, []);

  const handleGlobalModeChange = useCallback((newMode: AppMode) => {
    setGlobalAppMode(newMode);
    if (appView !== 'setSelection' && currentSetIndex !== null) {
        setAppView(newMode === AppMode.Learn ? 'learn' : 'study');
    }
  }, [appView, currentSetIndex]);
  
  const handleClearProgress = () => {
    if (window.confirm("Tem certeza que deseja apagar todo o seu progresso? Esta ação não pode ser desfeita.")) {
        clearStorageProgress(); 
        setLearnedSetIndexes(new Set());
        setAppView('setSelection');
        setCurrentSetIndex(null);
        setProgressVersion(v => v + 1); // Force refresh of progress display
    }
  }

  if (appView === 'setSelection') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100 flex flex-col items-center p-4 font-sans">
        <header className="w-full max-w-4xl mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-cyan-400 mb-4">{QUIZ_TITLE}</h1>
          <p className="text-slate-400 mb-6">Selecione um bloco de questões para começar.</p>
          <nav className="flex justify-center space-x-4 mb-8">
            <button
              onClick={() => handleGlobalModeChange(AppMode.Learn)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ease-in-out flex items-center space-x-2 shadow-lg hover:shadow-cyan-500/50 transform hover:scale-105
                ${globalAppMode === AppMode.Learn ? 'bg-cyan-500 text-white ring-2 ring-cyan-300' : 'bg-slate-700 hover:bg-cyan-600 text-slate-300 hover:text-white'}`}
            >
              <BookOpenIconSolid className="w-6 h-6" />
              <span>Modo Aprender</span>
            </button>
            <button
              onClick={() => handleGlobalModeChange(AppMode.Study)}
              className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ease-in-out flex items-center space-x-2 shadow-lg hover:shadow-purple-500/50 transform hover:scale-105
                ${globalAppMode === AppMode.Study ? 'bg-purple-500 text-white ring-2 ring-purple-300' : 'bg-slate-700 hover:bg-purple-600 text-slate-300 hover:text-white'}`}
            >
              <AcademicCapIconSolid className="w-6 h-6" />
              <span>Modo Estudar</span>
            </button>
          </nav>
        </header>
        
        <main className="w-full max-w-2xl bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8">
          <h2 className="text-2xl font-semibold text-slate-200 mb-6 text-center">Blocos de Questões</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {quizSets.map((set) => (
              <button
                key={set.index}
                onClick={() => handleSelectSet(set.index)}
                className={`p-4 rounded-lg shadow-lg transition-all duration-200 transform hover:scale-105
                  ${set.isLearned ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-700 hover:bg-slate-600'}
                   text-white font-medium text-left flex flex-col justify-between min-h-[10rem]`} // min-h for consistent height
              >
                <div>
                  <div className="flex justify-between items-start">
                    <span className="text-lg font-semibold">{set.name}</span>
                    {set.isLearned && <CheckCircleIcon className="w-6 h-6 text-green-300" />}
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{set.totalQuestionsInSet ?? set.questions.length} questões</p>
                  <p className="text-xs text-slate-400 mt-0.5">IDs: {set.questions[0].id} - {set.questions[set.questions.length-1].id}</p>
                </div>
                <div className="mt-2">
                  <p className="text-xs text-cyan-300">
                    Estudo: {set.masteredCount ?? 0} / {set.totalQuestionsInSet ?? set.questions.length} dominadas
                  </p>
                  { (set.totalQuestionsInSet ?? 0) > 0 &&
                    <div className="w-full bg-slate-600 rounded-full h-1.5 mt-1">
                      <div
                        className="bg-cyan-500 h-1.5 rounded-full"
                        style={{ width: `${((set.masteredCount ?? 0) / (set.totalQuestionsInSet || 1)) * 100}%` }}
                      ></div>
                    </div>
                  }
                </div>
              </button>
            ))}
          </div>
           <div className="mt-8 text-center">
            <button
                onClick={handleClearProgress}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors duration-200 text-sm"
            >
                Apagar Progresso
            </button>
          </div>
        </main>
        <footer className="mt-12 text-center text-slate-500 text-sm">
          <p>&copy; {new Date().getFullYear()} ECIA Quiz Master. Estude com afinco!</p>
        </footer>
      </div>
    );
  }

  const currentSet = currentSetIndex !== null ? quizSets.find(s => s.index === currentSetIndex) : null;
  const currentQuestions = currentSet?.questions ?? [];
  const currentSetName = currentSet?.name ?? "";


  if (!currentSet || currentQuestions.length === 0 || currentSetIndex === null) {
     return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-slate-100 p-4">
            <p className="text-xl mb-4">Nenhum bloco selecionado ou bloco inválido.</p>
            <button
                onClick={handleBackToSetSelection}
                className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md"
            >
                Voltar para Seleção de Blocos
            </button>
        </div>
     )
  }
  
  const renderActiveMode = () => {
    if (appView === 'learn') {
      return (
        <LearnMode
          questions={currentQuestions}
          setIdentifier={currentSetIndex}
          onSetLearned={handleSetLearned}
          onBack={handleBackToSetSelection}
          setName={currentSetName}
        />
      );
    }
    if (appView === 'study') {
      return (
        <StudyMode
          key={currentSetIndex} 
          initialQuestionsForSet={currentQuestions}
          setIdentifier={currentSetIndex}
          onBack={handleBackToSetSelection}
          setName={currentSetName}
        />
      );
    }
    return null; 
  }

  return (
     <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-slate-100 flex flex-col items-center p-4 font-sans">
        <header className="w-full max-w-4xl mb-8 text-center">
            <div className="flex items-center justify-between mb-4">
                 <button
                    onClick={handleBackToSetSelection}
                    className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-2 transition-colors"
                    aria-label="Voltar para seleção de blocos"
                >
                    <ArrowLeftCircleIcon className="w-8 h-8" />
                    <span className="text-sm">Blocos</span>
                </button>
                <h1 className="text-3xl md:text-4xl font-bold text-cyan-400">{QUIZ_TITLE} - {currentSetName}</h1>
                <div className="w-12"> {/* Placeholder for symmetry or future icon */} </div>
            </div>
            <nav className="flex justify-center space-x-4">
                <button
                    onClick={() => handleGlobalModeChange(AppMode.Learn)}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ease-in-out flex items-center space-x-2 shadow-lg hover:shadow-cyan-500/50 transform hover:scale-105
                    ${appView === 'learn' ? 'bg-cyan-500 text-white ring-2 ring-cyan-300' : 'bg-slate-700 hover:bg-cyan-600 text-slate-300 hover:text-white'}`}
                >
                    <BookOpenIconSolid className="w-6 h-6" />
                    <span>Modo Aprender</span>
                </button>
                <button
                    onClick={() => handleGlobalModeChange(AppMode.Study)}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all duration-300 ease-in-out flex items-center space-x-2 shadow-lg hover:shadow-purple-500/50 transform hover:scale-105
                    ${appView === 'study' ? 'bg-purple-500 text-white ring-2 ring-purple-300' : 'bg-slate-700 hover:bg-purple-600 text-slate-300 hover:text-white'}`}
                >
                    <AcademicCapIconSolid className="w-6 h-6" />
                    <span>Modo Estudar</span>
                </button>
            </nav>
        </header>
        <main className="w-full max-w-3xl bg-slate-800 shadow-2xl rounded-xl p-6 md:p-8 min-h-[60vh]">
            {renderActiveMode()}
        </main>
        <footer className="mt-12 text-center text-slate-500 text-sm">
          <p>&copy; {new Date().getFullYear()} ECIA Quiz Master. Estude com afinco!</p>
        </footer>
     </div>
  );
};

export default App;
