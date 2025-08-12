import React from "react";

interface ImagePopupProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  altText: string;
}

const ImagePopup: React.FC<ImagePopupProps> = ({ isOpen, onClose, imageUrl, altText }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        position: 'relative',
        background: 'white',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
        maxWidth: '90%',
        maxHeight: '90%',
        overflow: 'hidden',
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '5px',
            right: '10px',
            background: 'none',
            border: 'none',
            fontSize: '2rem',
            cursor: 'pointer',
            color: '#333',
            lineHeight: '1',
          }}
        >
          &times; {/* Close button */} 
        </button>
        <img
          src={imageUrl}
          alt={altText}
          style={{
            maxWidth: '100%',
            maxHeight: 'calc(100vh - 100px)',
            display: 'block',
            borderRadius: '4px',
          }}
        />
      </div>
    </div>
  );
};

export default ImagePopup;