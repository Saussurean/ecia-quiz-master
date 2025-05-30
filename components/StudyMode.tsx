import React, { useState, useEffect, useCallback, useRef } from 'react';
import { QAItem } from '../types';
import { QuestionCard } from './QuestionCard';
import { CheckCircleIcon, XCircleIcon } from './Icons';
import { getStudySetProgress, saveStudySetProgress, clearStudySetProgress, StudyProgressState } from '../utils/storage';

interface StudyModeProps {
  initialQuestionsForSet: QAItem[]; 
  onBack: () => void;
  setName: string;
  setIdentifier: number;
}

const REVIEW_INTERVAL = 3; 
const ANSWER_TIME_LIMIT_S = 5; 
const TIMER_UPDATE_INTERVAL_MS = 50; 

export const StudyMode: React.FC<StudyModeProps> = ({ initialQuestionsForSet, onBack, setName, setIdentifier }) => {
  const [allQuestionsInThisSet, setAllQuestionsInThisSet] = useState<QAItem[]>([]);
  const [primaryDeck, setPrimaryDeck] = useState<QAItem[]>([]);
  const [reviewPile, setReviewPile] = useState<QAItem[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<QAItem | null>(null);
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [questionsSinceLastReview, setQuestionsSinceLastReview] = useState<number>(0);
  const [isQuizOver, setIsQuizOver] = useState<boolean>(false);
  const [masteredIds, setMasteredIds] = useState<Set<number>>(new Set());

  // isQuestionTyping state is removed
  const [timerValue, setTimerValue] = useState<number>(100); 
  const [isAwaitingWrongConfirm, setIsAwaitingWrongConfirm] = useState<boolean>(false);
  
  const answerTimerIdRef = useRef<number | null>(null);
  
  const stateRefs = useRef({
    primaryDeck,
    reviewPile,
    masteredIds,
    questionsSinceLastReview,
    isQuizOver,
    currentQuestion,
    allQuestionsInThisSet,
    showAnswer,
    isAwaitingWrongConfirm,
    // isQuestionTyping removed
  });

  useEffect(() => {
    stateRefs.current = {
      primaryDeck,
      reviewPile,
      masteredIds,
      questionsSinceLastReview,
      isQuizOver,
      currentQuestion,
      allQuestionsInThisSet,
      showAnswer,
      isAwaitingWrongConfirm,
      // isQuestionTyping removed
    };
  }, [primaryDeck, reviewPile, masteredIds, questionsSinceLastReview, isQuizOver, currentQuestion, allQuestionsInThisSet, showAnswer, isAwaitingWrongConfirm]);


  const clearAnswerTimer = useCallback(() => {
    if (answerTimerIdRef.current !== null) {
      clearInterval(answerTimerIdRef.current);
      answerTimerIdRef.current = null;
    }
  }, []);

  const processEvaluationAndMoveNext = useCallback((isCorrect: boolean) => {
    const questionToEvaluate = stateRefs.current.currentQuestion;
    if (!questionToEvaluate) return;

    setMasteredIds(prev => {
        const newSet = new Set(prev);
        if (isCorrect) newSet.add(questionToEvaluate.id);
        else newSet.delete(questionToEvaluate.id);
        return newSet;
    });

    setReviewPile(prevPile => {
        let newPile = prevPile.filter(q => q.id !== questionToEvaluate.id);
        if (!isCorrect) newPile.push(questionToEvaluate);
        return newPile;
    });
        
    setShowAnswer(false);
    // setIsQuestionTyping(true); // Removed
    setIsAwaitingWrongConfirm(false);
    setCurrentQuestion(null); 
  }, []); 

  const handleUserInteraction = useCallback((action: 'correct' | 'incorrect' | 'show_answer' | 'time_up') => {
    clearAnswerTimer();

    if (action === 'time_up') {
      if (stateRefs.current.currentQuestion && !stateRefs.current.isQuizOver) { 
        setShowAnswer(true);
        setIsAwaitingWrongConfirm(true);
      }
      return;
    }

    if (action === 'show_answer') {
      setShowAnswer(true);
      return;
    }

    if (action === 'correct') {
      if (!stateRefs.current.isAwaitingWrongConfirm) {
        processEvaluationAndMoveNext(true);
      }
      return;
    }

    if (action === 'incorrect') {
      if (stateRefs.current.isAwaitingWrongConfirm) { 
        processEvaluationAndMoveNext(false);
      } else if (!stateRefs.current.showAnswer) { 
        setShowAnswer(true);
        setIsAwaitingWrongConfirm(true);
      } else { 
        processEvaluationAndMoveNext(false);
      }
      return;
    }
  }, [clearAnswerTimer, processEvaluationAndMoveNext]);
  
  const startAnswerTimer = useCallback(() => {
    clearAnswerTimer();
    setTimerValue(100); 
    
    const totalDurationMs = ANSWER_TIME_LIMIT_S * 1000;
    const updatesCount = totalDurationMs / TIMER_UPDATE_INTERVAL_MS;
    const decrementAmount = 100 / updatesCount;

    answerTimerIdRef.current = window.setInterval(() => {
      setTimerValue(prev => {
        const newTimerValue = prev - decrementAmount;
        if (newTimerValue <= 0) {
          if (answerTimerIdRef.current !== null) clearInterval(answerTimerIdRef.current);
          answerTimerIdRef.current = null;
          handleUserInteraction('time_up'); 
          return 0;
        }
        return newTimerValue;
      });
    }, TIMER_UPDATE_INTERVAL_MS);
  }, [clearAnswerTimer, handleUserInteraction]);

  // stableOnTypingComplete is removed

  useEffect(() => {
    // Timer starts if not showing answer, not awaiting confirm, not quiz over, and there's a current question
    if (!stateRefs.current.showAnswer && !stateRefs.current.isAwaitingWrongConfirm && !stateRefs.current.isQuizOver && stateRefs.current.currentQuestion) {
        startAnswerTimer();
    }
    // isQuestionTyping removed from dependencies
  }, [showAnswer, isAwaitingWrongConfirm, currentQuestion, isQuizOver, startAnswerTimer]);

  const loadNextQuestionInternal = useCallback(() => {
    clearAnswerTimer(); 
    setShowAnswer(false);
    // setIsQuestionTyping(true); // Removed
    setIsAwaitingWrongConfirm(false);
    setTimerValue(100); 

    let nextQ: QAItem | undefined = undefined;
    let pDeck = [...stateRefs.current.primaryDeck];
    let rPile = [...stateRefs.current.reviewPile];
    let qslr = stateRefs.current.questionsSinceLastReview;

    if (rPile.length > 0 && qslr >= REVIEW_INTERVAL && pDeck.length > 0) { 
        nextQ = rPile.shift();
        qslr = 0;
    } else if (pDeck.length > 0) {
        nextQ = pDeck.shift();
        qslr += 1;
    } else if (rPile.length > 0) { 
        nextQ = rPile.shift();
        qslr = 0; 
    }
    
    setPrimaryDeck(pDeck);
    setReviewPile(rPile);
    setQuestionsSinceLastReview(qslr);
    
    if (nextQ) {
        setCurrentQuestion(nextQ);
    } else {
        setIsQuizOver(true);
        setCurrentQuestion(null);
    }
  }, [clearAnswerTimer]);

  const resetQuizForCurrentSet = useCallback((forceClearSavedProgress: boolean = false) => {
    clearAnswerTimer();
    if (forceClearSavedProgress) {
        clearStudySetProgress(setIdentifier);
    }

    const savedProgress = forceClearSavedProgress ? null : getStudySetProgress(setIdentifier);
    const questionsToUse = [...initialQuestionsForSet];
    setAllQuestionsInThisSet(questionsToUse);

    if (savedProgress) {
        const allQsMap = new Map(questionsToUse.map(q => [q.id, q]));
        const rehydrateDeck = (ids: number[]): QAItem[] => ids.map(id => allQsMap.get(id)).filter(Boolean) as QAItem[];

        setPrimaryDeck(rehydrateDeck(savedProgress.primaryDeckIds));
        setReviewPile(rehydrateDeck(savedProgress.reviewPileIds));
        setMasteredIds(new Set(savedProgress.masteredIds));
        setQuestionsSinceLastReview(savedProgress.questionsSinceLastReview);
        setIsQuizOver(false);
    } else {
        const shuffledInitial = questionsToUse.sort(() => 0.5 - Math.random());
        setPrimaryDeck(shuffledInitial);
        setReviewPile([]);
        setMasteredIds(new Set());
        setQuestionsSinceLastReview(0);
        setIsQuizOver(false);
    }
    
    setShowAnswer(false);
    // setIsQuestionTyping(true); // Removed
    setIsAwaitingWrongConfirm(false);
    setTimerValue(100);
    setCurrentQuestion(null); 
  }, [initialQuestionsForSet, clearAnswerTimer, setIdentifier]);

  useEffect(() => {
    resetQuizForCurrentSet(); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestionsForSet, setIdentifier]);

  useEffect(() => {
    if (!stateRefs.current.currentQuestion && !stateRefs.current.isQuizOver && stateRefs.current.allQuestionsInThisSet.length > 0) {
        loadNextQuestionInternal();
    }
  }, [currentQuestion, isQuizOver, allQuestionsInThisSet, loadNextQuestionInternal]);


  useEffect(() => {
    return () => {
      if (!stateRefs.current.isQuizOver && stateRefs.current.allQuestionsInThisSet.length > 0) {
        const progress: StudyProgressState = {
          primaryDeckIds: stateRefs.current.primaryDeck.map(q => q.id),
          reviewPileIds: stateRefs.current.reviewPile.map(q => q.id),
          masteredIds: Array.from(stateRefs.current.masteredIds),
          questionsSinceLastReview: stateRefs.current.questionsSinceLastReview,
        };
        saveStudySetProgress(setIdentifier, progress);
      }
    };
  }, [setIdentifier]); 

   useEffect(() => {
    if (stateRefs.current.isQuizOver || stateRefs.current.allQuestionsInThisSet.length === 0 || stateRefs.current.currentQuestion === undefined ) {
        return;
    }
    if (stateRefs.current.currentQuestion === null && stateRefs.current.primaryDeck.length === stateRefs.current.allQuestionsInThisSet.length && stateRefs.current.reviewPile.length === 0) {
      return;
    }

    const progress: StudyProgressState = {
        primaryDeckIds: primaryDeck.map(q => q.id),
        reviewPileIds: reviewPile.map(q => q.id),
        masteredIds: Array.from(masteredIds),
        questionsSinceLastReview: questionsSinceLastReview,
    };
    saveStudySetProgress(setIdentifier, progress);

  }, [primaryDeck, reviewPile, masteredIds, questionsSinceLastReview, setIdentifier]);


  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // isQuestionTyping removed from condition
      if (stateRefs.current.isQuizOver) return; 

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (!stateRefs.current.showAnswer && !stateRefs.current.isAwaitingWrongConfirm) {
            handleUserInteraction('show_answer');
        } else if (stateRefs.current.showAnswer && stateRefs.current.isAwaitingWrongConfirm) {
            handleUserInteraction('incorrect'); 
        } else if (stateRefs.current.showAnswer && !stateRefs.current.isAwaitingWrongConfirm) {
            handleUserInteraction('correct');
        }
      } else if (event.code === 'Space') { 
        event.preventDefault();
         if (stateRefs.current.showAnswer || stateRefs.current.isAwaitingWrongConfirm) {
           handleUserInteraction('incorrect');
         } else {
           handleUserInteraction('show_answer');
         }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearAnswerTimer(); 
    };
  }, [handleUserInteraction, clearAnswerTimer]); 


  if (initialQuestionsForSet.length === 0) {
    return (
        <div className="text-center space-y-4">
            <p className="text-slate-400">Nenhuma questão carregada para este bloco.</p>
             <button
                onClick={onBack}
                className="mt-6 bg-slate-600 hover:bg-slate-500 text-white font-semibold py-3 px-8 rounded-lg shadow-md"
            >
                Voltar para Seleção de Blocos
            </button>
        </div>
    );
  }
  
  if (isQuizOver) {
    const totalQuestionsInThisSet = allQuestionsInThisSet.length;
    return (
      <div className="text-center space-y-4 p-8 bg-slate-700 rounded-lg shadow-xl">
        <h2 className="text-3xl font-bold text-green-400">Quiz do {setName} Concluído!</h2>
        <p className="text-xl text-slate-300">
          Você masterizou {masteredIds.size} de {totalQuestionsInThisSet} questões neste bloco.
        </p>
        <div className="w-full bg-slate-600 rounded-full h-6">
          <div 
            className="bg-green-500 h-6 rounded-full text-xs font-medium text-blue-100 text-center p-1 leading-none transition-all duration-500 ease-out"
            style={{ width: `${totalQuestionsInThisSet > 0 ? (masteredIds.size / totalQuestionsInThisSet) * 100 : 0}%` }}
          >
            {totalQuestionsInThisSet > 0 ? Math.round((masteredIds.size / totalQuestionsInThisSet) * 100) : 0}%
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4 mt-6">
            <button
                onClick={() => resetQuizForCurrentSet(true)}
                className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 px-8 rounded-lg shadow-md transition-colors duration-200 transform hover:scale-105"
            >
                Reiniciar Bloco
            </button>
            <button
                onClick={onBack}
                className="bg-slate-600 hover:bg-slate-500 text-white font-semibold py-3 px-8 rounded-lg shadow-md transition-colors duration-200 transform hover:scale-105"
            >
                Outros Blocos
            </button>
        </div>
      </div>
    );
  }

  if (!currentQuestion) {
     return <p className="text-center text-slate-400 text-xl py-10">Carregando próxima questão...</p>;
  }
  
  const progressPercentage = allQuestionsInThisSet.length > 0 ? (masteredIds.size / allQuestionsInThisSet.length) * 100 : 0;
  // isQuestionTyping removed from condition
  const showTimerBarActive = !showAnswer && !isAwaitingWrongConfirm && answerTimerIdRef.current !== null;

  return (
    <div className="space-y-6 flex flex-col items-center w-full">
      <div className="w-full mb-2"> 
        <div className="flex justify-between text-sm text-slate-400 mb-1">
          <span>Progresso do {setName}</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
        <div className="w-full bg-slate-600 rounded-full h-3">
          <div 
            className="bg-cyan-500 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>Masterizadas: {masteredIds.size} / {allQuestionsInThisSet.length}</span>
            <span>Revisão: {reviewPile.length}</span>
        </div>
      </div>

      <div className="w-full max-h-[55vh] overflow-y-auto mb-2 rounded-lg"> 
        <QuestionCard 
            item={currentQuestion} 
            showAnswer={showAnswer} 
            // enableTypewriter and onTypingComplete props removed
        />
      </div>
      
      {showTimerBarActive && (
        <div className="w-full h-2.5 bg-slate-600 rounded-full my-2">
          <div 
            className="h-2.5 bg-yellow-400 rounded-full"
            style={{ width: `${timerValue}%` }}
          ></div>
        </div>
      )}

      {!showAnswer && !isAwaitingWrongConfirm && (
        <button
          onClick={() => handleUserInteraction('show_answer')}
          // isQuestionTyping removed from disabled condition
          className={`bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-8 rounded-lg shadow-md transition-colors duration-200 w-full max-w-xs transform hover:scale-105`}
        >
          Mostrar Resposta
        </button>
      )}

      {showAnswer && (
        <div className="flex flex-col sm:flex-row justify-around w-full max-w-md space-y-4 sm:space-y-0 sm:space-x-4">
          <button
            onClick={() => handleUserInteraction('incorrect')}
            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors duration-200 flex items-center justify-center space-x-2 flex-1 transform hover:scale-105"
            aria-label="Marcar como Errei (Espaço)"
          >
            <XCircleIcon className="w-5 h-5" />
            <span>{isAwaitingWrongConfirm ? 'Confirmar Erro / Próxima' : 'Errei'}</span>
          </button>
          {!isAwaitingWrongConfirm && (
            <button
              onClick={() => handleUserInteraction('correct')}
              className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors duration-200 flex items-center justify-center space-x-2 flex-1 transform hover:scale-105"
              aria-label="Marcar como Acertei (Seta Direita)"
            >
              <CheckCircleIcon className="w-5 h-5" />
              <span>Acertei!</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};