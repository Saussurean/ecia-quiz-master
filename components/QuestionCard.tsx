import React, { useEffect } from 'react';
import { QAItem } from '../types';

interface QuestionCardProps {
  item: QAItem;
  showAnswer: boolean;
  questionNumber?: number;
  totalQuestions?: number;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ 
  item, 
  showAnswer, 
  questionNumber, 
  totalQuestions
}) => {
  // Typewriter effect logic has been removed.
  // The onTypingComplete callback, if it were to be used by a parent,
  // would typically be called immediately now since display is instant.
  // However, the parent (StudyMode) will also be updated to not rely on it.

  return (
    <div className="bg-slate-700 p-6 rounded-lg shadow-lg w-full">
      {questionNumber && totalQuestions && (
        <p className="text-sm text-cyan-400 mb-2 font-medium">
          Questão {questionNumber} de {totalQuestions}
        </p>
      )}
      <div className="mb-4">
        <p className="text-lg font-semibold text-slate-200 mb-1">Pergunta:</p>
        <p className="text-slate-300 text-lg leading-relaxed min-h-[3em]">{item.question || ""}</p> 
      </div>
      {showAnswer && (
        <div className="mt-4 pt-4 border-t border-slate-600">
          <p className="text-lg font-semibold text-green-400 mb-1">Resposta:</p>
          <p className="text-slate-300 text-lg leading-relaxed">{item.answer}</p>
        </div>
      )}
    </div>
  );
};