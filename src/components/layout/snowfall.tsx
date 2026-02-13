'use client';
import React, { useState, useEffect } from 'react';
import './snowfall.css';

interface SnowfallProps {
  className?: string;
}

const Snowfall = ({ className }: SnowfallProps) => {
  const [flakes, setFlakes] = useState<React.ReactNode[]>([]);

  useEffect(() => {
    const generateFlakes = () => {
      return Array.from({ length: 12 }).map((_, i) => {
        const style: React.CSSProperties = {
          '--random-x-start': Math.random(),
          '--random-x-end': Math.random(),
          '--random-y-end': Math.random(),
          '--random-scale': Math.random() * 0.5 + 0.3,
          '--random-delay': `${Math.random() * -15}s`,
          '--random-duration': `${15 + Math.random() * 15}s`,
          '--random-opacity': Math.random() * 0.3 + 0.2,
        } as React.CSSProperties;

        return <div className="snowflake" key={i} style={style} />;
      });
    };

    setFlakes(generateFlakes());
  }, []);

  return <div className={`snowfall-container ${className}`}>{flakes}</div>;
};

export default Snowfall;
