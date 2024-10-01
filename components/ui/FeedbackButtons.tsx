// components/ui/FeedbackButtons.tsx

import React from 'react';
import { HandThumbUpIcon, HandThumbDownIcon } from '@heroicons/react/24/outline';

interface FeedbackButtonsProps {
  prompt: string;
  response: string;
  onFeedbackSubmit: () => void;
}

const FeedbackButton: React.FC<FeedbackButtonsProps> = ({ prompt, response, onFeedbackSubmit }) => {
  const handleLike = () => {
    // Implementa la lógica para "Me gusta"
    console.log('Feedback: Me gusta');
    onFeedbackSubmit();
  };

  const handleDislike = () => {
    // Implementa la lógica para "No me gusta"
    console.log('Feedback: No me gusta');
    onFeedbackSubmit();
  };

  return (
    <div className="flex space-x-4">
      {/* Botón "Me gusta" */}
      <button
        onClick={handleLike}
        className="p-2 rounded-full hover:stroke-[#680dcc] transition-colors duration-200"
        aria-label="Me gusta"
      >
        <HandThumbUpIcon
          className="h-6 w-6 stroke-gray-400 hover:stroke-[#680dcc] transition-colors duration-200"
          fill="none"
        />
      </button>

      {/* Botón "No me gusta" */}
      <button
        onClick={handleDislike}
        className="p-2 rounded-full hover:stroke-red-500 transition-colors duration-200"
        aria-label="No me gusta"
      >
        <HandThumbDownIcon
          className="h-6 w-6 stroke-gray-400 hover:stroke-red-500 transition-colors duration-200"
          fill="none"
        />
      </button>
    </div>
  );
};

export default FeedbackButton;
