
import React from 'react';

interface ImageCardProps {
  imageUrl: string;
  title: string;
  altText: string;
}

const ImageCard: React.FC<ImageCardProps> = ({ imageUrl, title, altText }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-lg transition-shadow duration-300 hover:shadow-2xl flex flex-col items-center">
      <h3 className="text-xl font-bold mb-4 text-gray-700 dark:text-gray-300">{title}</h3>
      <div className="aspect-square w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
        <img
          src={imageUrl}
          alt={altText}
          className="w-full h-full object-contain bg-white"
        />
      </div>
    </div>
  );
};

export default ImageCard;
