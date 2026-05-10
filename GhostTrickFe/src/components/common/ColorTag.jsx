import React from 'react';
import '../../styles/components/ColorTag.css';

/**
 * @param {Object} props
 * @param {string} props.name - Color name (e.g. "Black")
 * @param {string} props.hex - Hex code (e.g. "#000000")
 * @param {string} [props.size='sm'] - 'sm' | 'md' | 'lg'
 * @param {boolean} [props.showLabel=true]
 */
const ColorTag = ({ name, hex, size = 'sm', showLabel = true, className = '' }) => {
  return (
    <div className={`color-tag-container ${size} ${className}`} title={name}>
      <span 
        className="color-swatch" 
        style={{ backgroundColor: hex || '#ccc' }}
      />
      {showLabel && <span className="color-label">{name}</span>}
    </div>
  );
};

export default ColorTag;
