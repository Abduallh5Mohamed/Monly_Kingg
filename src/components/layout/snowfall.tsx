'use client';
import React from 'react';
import './snowfall.css';

const Snowfall = () => {
  const flakes = Array.from({ length: 150 }).map((_, i) => {
    const style: React.CSSProperties = {
      '--random-x-start': Math.random(),
      '--random-x-end': Math.random(),
      '--random-y-end': Math.random(),
      '--random-scale': Math.random(),
      '--random-delay': `${Math.random() * -10}s`,
      '--random-duration': `${5 + Math.random() * 5}s`,
      '--random-opacity': Math.random() * 0.5 + 0.5,
    } as React.CSSProperties;

    return <div className="snowflake" key={i} style={style} />;
  });
  return <div className="snowfall-container">{flakes}</div>;
};

export default Snowfall;
