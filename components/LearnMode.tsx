import React, { useState, useCallback, useEffect } from 'react';
import { QAItem } from '../types';
import { QuestionCard } from './QuestionCard';
import { ArrowLeftCircleIcon, ArrowRightCircleIcon, CheckCircleIcon } from './Icons';

interface LearnModeProps {
  questions: QAItem[];
  setIdentifier: number; // Using number for index
  onSetLearned: (setIdentifier: number) => void;
  onBack: () => void;
  setName: string;
}

export const LearnMode: React.FC<LearnModeProps> = ({ questions, setIdentifier, onSetLearned, onBack, setName }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewedIndices, setViewedIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    // Reset when questions/set changes
    setCurrentIndex(0);
    if (questions.length > 0) {
        setViewedIndices(new Set([0])); // Mark the first question as viewed only if questions exist
    } else {
        setViewedIndices(new Set());
    }
  }, [questions]);

  useEffect(() => {
    if (viewedIndices.size === questions.length && questions.length > 0) {
      onSetLearned(setIdentifier);
    }
  }, [viewedIndices, questions.length, onSetLearned, setIdentifier]);

  const handleNext = useCallback(() => {
    if (questions.length === 0) return;
    setCurrentIndex((prevIndex) => {
      const nextIdx = (prevIndex + 1) % questions.length;
      setViewedIndices(prev => new Set(prev).add(nextIdx));
      return nextIdx;
    });
  }, [questions.length]);

  const handlePrevious = useCallback(() => {
    if (questions.length === 0) return;
    setCurrentIndex((prevIndex) => {
      const prevIdx = (prevIndex - 1 + questions.length) % questions.length;
      setViewedIndices(prev => new Set(prev).add(prevIdx));
      return prevIdx;
    });
  }, [questions.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (questions.length === 0) return;

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePrevious();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleNext, handlePrevious, questions.length]);


  if (questions.length === 0) {
    return (
        <div className="text-center space-y-4">
            <p className="text-slate-400">Nenhuma questão carregada para este bloco.</p>
            <button
                onClick={onBack}
                className="bg-slate-600 hover:bg-slate-500 text-white font-semibold py-2 px-4 rounded-lg"
            >
                Voltar
            </button>
        </div>
    );
  }
  
  const allQuestionsInSetViewed = viewedIndices.size === questions.length;

  return (
    <div className="space-y-6 flex flex-col items-center">
      {allQuestionsInSetViewed && (
         <div className="p-4 mb-4 bg-green-500/20 text-green-300 rounded-lg border border-green-400 flex items-center space-x-2">
            <CheckCircleIcon className="w-6 h-6"/>
            <span>Parabéns! Você visualizou todas as questões do {setName}.</span>
        </div>
      )}
      <QuestionCard 
        item={questions[currentIndex]} 
        showAnswer={true} 
        questionNumber={currentIndex + 1}
        totalQuestions={questions.length}
      />
      <div className="flex justify-between w-full max-w-md mt-6">
        <button
          onClick={handlePrevious}
          className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors duration-200 flex items-center space-x-2 transform hover:scale-105"
          aria-label="Questão anterior (Seta Esquerda)"
        >
          <ArrowLeftCircleIcon className="w-5 h-5" />
          <span>Anterior</span>
        </button>
        <button
          onClick={handleNext}
          className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors duration-200 flex items-center space-x-2 transform hover:scale-105"
          aria-label="Próxima questão (Seta Direita)"
        >
          <span>Próxima</span>
          <ArrowRightCircleIcon className="w-5 h-5" />
        </button>
      </div>
       {allQuestionsInSetViewed && (
         <button
          onClick={onBack}
          className="mt-6 bg-slate-600 hover:bg-slate-500 text-white font-semibold py-3 px-8 rounded-lg shadow-md transition-colors duration-200"
        >
          Voltar para Seleção de Blocos
        </button>
       )}
    </div>
  );
};