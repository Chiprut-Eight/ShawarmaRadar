import React from 'react';
import './TensionMeter.css';

interface TensionMeterProps {
  value: number; // 0 to 100 percentage
}

const TensionMeter: React.FC<TensionMeterProps> = ({ value }) => {
  // Color calculation based on tension value
  const hue = ((1 - (value / 100)) * 120).toString(10);
  const color = `hsl(${hue}, 100%, 50%)`;

  return (
    <div className="tension-meter-wrapper">
      <div className="meter-track">
        <div 
          className="meter-fill" 
          style={{ 
            width: `${value}%`,
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}`
          }}
        ></div>
      </div>
      <div className="meter-markers">
        <span>0% (Calm)</span>
        <span>100% (Warzone)</span>
      </div>
    </div>
  );
};

export default TensionMeter;
