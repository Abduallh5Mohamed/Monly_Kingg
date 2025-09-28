'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

export function CyberLoginForm() {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const validateEmail = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!email.trim()) {
      setEmailError('[ ERROR: EMAIL_REQUIRED ]');
      return false;
    }
    
    if (!emailRegex.test(email)) {
      setEmailError('[ ERROR: INVALID_FORMAT ]');
      return false;
    }
    
    setEmailError('');
    return true;
  };

  const validatePassword = () => {
    if (!password) {
      setPasswordError('[ ERROR: ACCESS_CODE_REQUIRED ]');
      return false;
    }
    
    if (password.length < 6) {
      setPasswordError('[ ERROR: CODE_TOO_SHORT ]');
      return false;
    }
    
    setPasswordError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();
    
    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const success = await login(email, password);
      if (success) {
        setShowSuccess(true);
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearEmailError = () => setEmailError('');
  const clearPasswordError = () => setPasswordError('');

  return (
    <>
      <style jsx global>{`
        /* Cyber Grid Background */
        .cyber-grid {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          pointer-events: none;
        }

        .grid-line {
          position: absolute;
          background: linear-gradient(90deg, transparent, #00ff41, transparent);
          opacity: 0.1;
          animation: gridPulse 4s ease-in-out infinite;
        }

        .grid-h-1 {
          top: 20%;
          left: 0;
          width: 100%;
          height: 1px;
          animation-delay: 0s;
        }

        .grid-h-2 {
          top: 50%;
          left: 0;
          width: 100%;
          height: 1px;
          animation-delay: 1.5s;
        }

        .grid-h-3 {
          top: 80%;
          left: 0;
          width: 100%;
          height: 1px;
          animation-delay: 3s;
        }

        .grid-v-1 {
          top: 0;
          left: 25%;
          width: 1px;
          height: 100%;
          background: linear-gradient(0deg, transparent, #00ff41, transparent);
          animation-delay: 0.75s;
        }

        .grid-v-2 {
          top: 0;
          left: 75%;
          width: 1px;
          height: 100%;
          background: linear-gradient(0deg, transparent, #00ff41, transparent);
          animation-delay: 2.25s;
        }

        @keyframes gridPulse {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.3; }
        }

        .cyber-glitch {
          position: absolute;
          width: 200px;
          height: 2px;
          background: #ff0080;
          opacity: 0;
          animation: glitchFlash 6s ease-in-out infinite;
        }

        .glitch-1 {
          top: 30%;
          left: 10%;
          animation-delay: 2s;
        }

        .glitch-2 {
          top: 70%;
          right: 10%;
          animation-delay: 4s;
        }

        @keyframes glitchFlash {
          0%, 95%, 100% { opacity: 0; transform: scaleX(0); }
          96%, 99% { opacity: 0.8; transform: scaleX(1); }
        }

        /* Cyber Terminal */
        .cyber-terminal {
          background: rgba(0, 0, 0, 0.9);
          border: 2px solid #00ff41;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 0 30px rgba(0, 255, 65, 0.3), inset 0 0 0 1px rgba(0, 255, 65, 0.1);
          position: relative;
        }

        .terminal-header {
          background: linear-gradient(90deg, #1a1a1a, #2a2a2a);
          padding: 12px 16px;
          border-bottom: 1px solid #00ff41;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .terminal-buttons {
          display: flex;
          gap: 8px;
        }

        .term-btn {
          width: 12px;
          height: 12px;
          border-radius: 50%;
        }

        .btn-red {
          background: #ff5555;
          box-shadow: 0 0 8px rgba(255, 85, 85, 0.5);
        }

        .btn-yellow {
          background: #ffff55;
          box-shadow: 0 0 8px rgba(255, 255, 85, 0.5);
        }

        .btn-green {
          background: #55ff55;
          box-shadow: 0 0 8px rgba(85, 255, 85, 0.5);
        }

        .terminal-title {
          color: #00ff41;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .cyber-content {
          padding: 40px 32px;
        }

        /* Cyber Logo */
        .cyber-logo {
          position: relative;
          width: 80px;
          height: 80px;
          margin: 0 auto 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-frame {
          position: relative;
          z-index: 2;
          color: #00ff41;
          border: 2px solid #00ff41;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 255, 65, 0.05);
          animation: logoScan 3s ease-in-out infinite;
        }

        @keyframes logoScan {
          0%, 100% { 
            border-color: #00ff41; 
            box-shadow: 0 0 10px rgba(0, 255, 65, 0.3); 
          }
          50% { 
            border-color: #ff0080; 
            box-shadow: 0 0 15px rgba(255, 0, 128, 0.5); 
          }
        }

        .logo-scanner {
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(0, 255, 65, 0.6), transparent);
          animation: scanLine 2s linear infinite;
        }

        @keyframes scanLine {
          0% { left: -100%; }
          100% { left: 100%; }
        }

        .neon-glow {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(0, 255, 65, 0.2) 0%, transparent 70%);
          animation: neonPulse 2s ease-in-out infinite;
        }

        @keyframes neonPulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.2); opacity: 0.8; }
        }

        /* Cyber Title */
        .cyber-title {
          color: #00ff41;
          font-size: 1.75rem;
          font-weight: bold;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 2px;
          position: relative;
        }

        .title-glitch {
          position: relative;
          display: inline-block;
          animation: textGlitch 4s ease-in-out infinite;
        }

        @keyframes textGlitch {
          0%, 90%, 100% { 
            transform: translate(0); 
            filter: hue-rotate(0deg); 
          }
          91%, 95% { 
            transform: translate(-2px, 1px); 
            filter: hue-rotate(90deg); 
          }
          96%, 99% { 
            transform: translate(1px, -1px); 
            filter: hue-rotate(180deg); 
          }
        }

        .access-text {
          color: #ff0080;
          font-size: 13px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        /* Cyber Form Fields */
        .cyber-field {
          position: relative;
          margin-bottom: 28px;
        }

        .field-frame {
          position: relative;
          background: rgba(0, 0, 0, 0.8);
          border: 1px solid rgba(0, 255, 65, 0.3);
          border-radius: 4px;
          overflow: hidden;
        }

        .field-border {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border: 1px solid transparent;
          border-radius: 4px;
          background: linear-gradient(45deg, #00ff41, #ff0080) border-box;
          -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
          mask-composite: exclude;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .cyber-field input {
          width: 100%;
          background: transparent;
          border: none;
          padding: 16px 60px 16px 16px;
          color: #00ff41;
          font-size: 14px;
          font-weight: bold;
          outline: none;
          position: relative;
          z-index: 2;
          font-family: 'Courier New', monospace;
          letter-spacing: 1px;
        }

        .cyber-field input[type="password"] {
          text-transform: uppercase;
        }

        .cyber-field input::placeholder {
          color: transparent;
        }

        .cyber-field label {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(0, 255, 65, 0.6);
          font-size: 14px;
          font-weight: bold;
          pointer-events: none;
          transition: all 0.3s ease;
          z-index: 3;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .cyber-field input:focus + label,
        .cyber-field input:not(:placeholder-shown) + label {
          top: 8px;
          font-size: 10px;
          color: #00ff41;
          transform: translateY(0);
        }

        .cyber-field input:focus ~ .field-border {
          opacity: 1;
        }

        .cyber-scanner {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 1;
        }

        .scan-line {
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(0, 255, 65, 0.3), transparent);
          transition: left 0.5s ease;
        }

        .cyber-field input:focus ~ .cyber-scanner .scan-line {
          left: 100%;
          animation: continuousScan 2s linear infinite;
        }

        @keyframes continuousScan {
          0% { left: -100%; }
          100% { left: 100%; }
        }

        /* Password Toggle */
        .cyber-toggle {
          position: absolute;
          right: 16px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          z-index: 4;
          padding: 4px;
        }

        .toggle-frame {
          width: 24px;
          height: 24px;
          border: 1px solid rgba(0, 255, 65, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          color: #00ff41;
          transition: all 0.3s ease;
          background: rgba(0, 0, 0, 0.8);
        }

        .cyber-toggle:hover .toggle-frame {
          border-color: #00ff41;
          box-shadow: 0 0 8px rgba(0, 255, 65, 0.3);
        }

        .eye-blocked {
          display: none;
        }

        .cyber-toggle.toggle-active .eye-scan {
          display: none;
        }

        .cyber-toggle.toggle-active .eye-blocked {
          display: block;
        }

        /* Cyber Options */
        .cyber-options {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 32px;
          flex-wrap: wrap;
          gap: 16px;
        }

        .neon-checkbox {
          display: flex;
          align-items: center;
          cursor: pointer;
          font-size: 12px;
          color: #00ff41;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .neon-checkbox input[type="checkbox"] {
          display: none;
        }

        .checkbox-matrix {
          width: 20px;
          height: 20px;
          margin-right: 12px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .matrix-frame {
          width: 100%;
          height: 100%;
          border: 1px solid rgba(0, 255, 65, 0.5);
          background: rgba(0, 0, 0, 0.8);
          transition: all 0.3s ease;
          position: absolute;
        }

        .checkbox-matrix svg {
          color: transparent;
          transition: color 0.3s ease;
          position: relative;
          z-index: 1;
        }

        .neon-checkbox input[type="checkbox"]:checked + .checkbox-matrix .matrix-frame {
          background: rgba(0, 255, 65, 0.2);
          border-color: #00ff41;
          box-shadow: 0 0 8px rgba(0, 255, 65, 0.3);
        }

        .neon-checkbox input[type="checkbox"]:checked + .checkbox-matrix svg {
          color: #00ff41;
        }

        .cyber-link {
          color: #ff0080;
          text-decoration: none;
          font-size: 12px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          transition: all 0.3s ease;
          position: relative;
        }

        .cyber-link::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 0;
          height: 1px;
          background: #ff0080;
          transition: width 0.3s ease;
        }

        .cyber-link:hover::after {
          width: 100%;
        }

        .cyber-link:hover {
          color: #ff4da6;
          text-shadow: 0 0 5px rgba(255, 0, 128, 0.5);
        }

        /* Neon Button */
        .neon-button {
          width: 100%;
          background: transparent;
          color: #00ff41;
          border: 2px solid #00ff41;
          border-radius: 4px;
          padding: 0;
          cursor: pointer;
          font-family: inherit;
          font-size: 14px;
          font-weight: bold;
          position: relative;
          margin-bottom: 32px;
          overflow: hidden;
          min-height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          text-transform: uppercase;
          letter-spacing: 1px;
          transition: all 0.3s ease;
        }

        .btn-matrix {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          transition: all 0.3s ease;
        }

        .neon-button:hover {
          border-color: #ff0080;
          color: #ff0080;
          box-shadow: 0 0 15px rgba(255, 0, 128, 0.5);
        }

        .neon-button:hover .btn-matrix {
          background: rgba(255, 0, 128, 0.1);
        }

        .neon-button:active {
          transform: scale(0.98);
        }

        .btn-text {
          position: relative;
          z-index: 2;
          transition: opacity 0.3s ease;
        }

        .btn-loader {
          position: absolute;
          z-index: 2;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .matrix-loader {
          display: flex;
          gap: 4px;
        }

        .matrix-bar {
          width: 3px;
          height: 16px;
          background: #00ff41;
          animation: matrixPulse 1.2s ease-in-out infinite;
        }

        .matrix-bar:nth-child(2) { animation-delay: 0.1s; }
        .matrix-bar:nth-child(3) { animation-delay: 0.2s; }
        .matrix-bar:nth-child(4) { animation-delay: 0.3s; }

        @keyframes matrixPulse {
          0%, 80%, 100% { transform: scaleY(0.5); opacity: 0.5; }
          40% { transform: scaleY(1); opacity: 1; }
        }

        .neon-button.loading .btn-text {
          opacity: 0;
        }

        .neon-button.loading .btn-loader {
          opacity: 1;
        }

        .btn-glow {
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: #00ff41;
          border-radius: 6px;
          opacity: 0;
          filter: blur(8px);
          transition: opacity 0.3s ease;
          z-index: -1;
        }

        .neon-button:hover .btn-glow {
          opacity: 0.3;
        }

        /* Cyber Error */
        .cyber-error {
          color: #ff0080;
          font-size: 11px;
          font-weight: bold;
          margin-top: 6px;
          opacity: 0;
          transform: translateY(-4px);
          transition: all 0.3s ease;
          position: relative;
          z-index: 5;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .cyber-error.show {
          opacity: 1;
          transform: translateY(0);
        }

        .cyber-field.error .field-frame {
          border-color: #ff0080;
        }

        .cyber-field.error .field-border {
          opacity: 1;
        }

        .cyber-field.error label {
          color: #ff0080;
        }

        /* Success Matrix */
        .cyber-success {
          display: none;
          text-align: center;
          padding: 40px 20px;
          opacity: 0;
          transform: translateY(20px);
          transition: all 0.4s ease;
        }

        .cyber-success.show {
          display: block;
          opacity: 1;
          transform: translateY(0);
        }

        .success-matrix {
          position: relative;
          width: 100px;
          height: 100px;
          margin: 0 auto 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .matrix-rings {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .success-ring {
          position: absolute;
          border: 2px solid #00ff41;
          border-radius: 50%;
          animation: matrixExpand 1.5s ease-out forwards;
          opacity: 0;
        }

        .ring-1 {
          width: 60px;
          height: 60px;
          top: 20px;
          left: 20px;
          animation-delay: 0s;
        }

        .ring-2 {
          width: 80px;
          height: 80px;
          top: 10px;
          left: 10px;
          animation-delay: 0.3s;
        }

        .ring-3 {
          width: 100px;
          height: 100px;
          top: 0;
          left: 0;
          animation-delay: 0.6s;
        }

        @keyframes matrixExpand {
          0% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1.1); }
          100% { opacity: 0.8; transform: scale(1); }
        }

        .success-core {
          position: relative;
          z-index: 2;
          color: #00ff41;
          animation: coreActivate 0.8s ease-out 0.9s forwards;
          opacity: 0;
        }

        @keyframes coreActivate {
          0% { opacity: 0; transform: scale(0); }
          100% { opacity: 1; transform: scale(1); }
        }

        .success-title {
          color: #00ff41;
          font-size: 1.25rem;
          font-weight: bold;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 2px;
        }

        .success-desc {
          color: rgba(0, 255, 65, 0.7);
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        /* Cyber Divider */
        .cyber-divider {
          display: flex;
          align-items: center;
          margin: 32px 0;
          gap: 16px;
        }

        .divider-grid {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(0, 255, 65, 0.3), transparent);
          position: relative;
          overflow: hidden;
        }

        .divider-grid::after {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, #00ff41, transparent);
          animation: dividerScan 3s linear infinite;
        }

        @keyframes dividerScan {
          0% { left: -100%; }
          100% { left: 100%; }
        }

        .divider-text {
          color: rgba(0, 255, 65, 0.7);
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        /* Matrix Signup */
        .matrix-signup {
          text-align: center;
          font-size: 12px;
          color: rgba(0, 255, 65, 0.7);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .matrix-link {
          color: #ff0080;
          text-decoration: none;
          font-weight: bold;
          transition: all 0.3s ease;
          position: relative;
        }

        .matrix-link::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 0;
          width: 0;
          height: 1px;
          background: #ff0080;
          transition: width 0.3s ease;
        }

        .matrix-link:hover::after {
          width: 100%;
        }

        .matrix-link:hover {
          color: #ff4da6;
          text-shadow: 0 0 5px rgba(255, 0, 128, 0.5);
        }

        /* Mobile Responsive */
        @media (max-width: 480px) {
          .cyber-content {
            padding: 32px 24px;
          }
          
          .cyber-title {
            font-size: 1.5rem;
          }
          
          .cyber-logo {
            width: 60px;
            height: 60px;
          }
          
          .logo-frame {
            width: 50px;
            height: 50px;
          }
          
          .cyber-options {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          
          .grid-line {
            opacity: 0.05;
          }
        }
      `}</style>

      <div className="cyber-grid">
        <div className="grid-line grid-h-1"></div>
        <div className="grid-line grid-v-1"></div>
        <div className="grid-line grid-h-2"></div>
        <div className="grid-line grid-v-2"></div>
        <div className="grid-line grid-h-3"></div>
        <div className="cyber-glitch glitch-1"></div>
        <div className="cyber-glitch glitch-2"></div>
      </div>

      <div className="w-full max-w-md mx-auto">
        <div className="cyber-terminal">
          <div className="terminal-header">
            <div className="terminal-buttons">
              <div className="term-btn btn-red"></div>
              <div className="term-btn btn-yellow"></div>
              <div className="term-btn btn-green"></div>
            </div>
            <div className="terminal-title">NEURAL_INTERFACE.exe</div>
          </div>
          
          <div className="cyber-content">
            <div className="text-center mb-9">
              <div className="cyber-logo">
                <div className="logo-frame">
                  <div className="logo-core">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                      <path d="M20 4L36 12v16L20 36L4 28V12L20 4z" stroke="currentColor" strokeWidth="2" fill="none"/>
                      <circle cx="20" cy="20" r="6" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M14 14l12 12M26 14l-12 12" stroke="currentColor" strokeWidth="1"/>
                    </svg>
                  </div>
                  <div className="logo-scanner"></div>
                </div>
                <div className="neon-glow"></div>
              </div>
              <h1 className="cyber-title">
                <span className="title-glitch" data-text="CYPHER_NET">CYPHER_NET</span>
              </h1>
              <p className="access-text">[ SECURE_TERMINAL_ACCESS ]</p>
            </div>
            
            <form className="neon-form" onSubmit={handleSubmit}>
              <div className={`cyber-field ${emailError ? 'error' : ''}`}>
                <div className="field-frame">
                  <div className="field-border"></div>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      clearEmailError();
                    }}
                    onBlur={validateEmail}
                    required 
                    autoComplete="email"
                    placeholder=" "
                  />
                  <label>&gt; EMAIL_ADDRESS</label>
                  <div className="cyber-scanner">
                    <div className="scan-line"></div>
                  </div>
                </div>
                <span className={`cyber-error ${emailError ? 'show' : ''}`}>{emailError}</span>
              </div>

              <div className={`cyber-field ${passwordError ? 'error' : ''}`}>
                <div className="field-frame">
                  <div className="field-border"></div>
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      clearPasswordError();
                    }}
                    onBlur={validatePassword}
                    required 
                    autoComplete="current-password"
                    placeholder=" "
                  />
                  <label>&gt; ACCESS_CODE</label>
                  <button 
                    type="button" 
                    className={`cyber-toggle ${showPassword ? 'toggle-active' : ''}`}
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                  >
                    <div className="toggle-frame">
                      <svg className="eye-scan" width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M9 3c-4 0-7 3-8 6 1 3 4 6 8 6s7-3 8-6c-1-3-4-6-8-6zm0 10a4 4 0 110-8 4 4 0 010 8zm0-6a2 2 0 100 4 2 2 0 000-4z" fill="currentColor"/>
                      </svg>
                      <svg className="eye-blocked" width="18" height="18" viewBox="0 0 18 18" fill="none">
                        <path d="M3 3l12 12M7 7a3 3 0 003 3m3-3C13 7 10 4 9 4c-1 0-3 1-4 2M9 14c4 0 7-3 8-6-1-1-2-2-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </button>
                  <div className="cyber-scanner">
                    <div className="scan-line"></div>
                  </div>
                </div>
                <span className={`cyber-error ${passwordError ? 'show' : ''}`}>{passwordError}</span>
              </div>

              <div className="cyber-options">
                <label className="neon-checkbox">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span className="checkbox-matrix">
                    <div className="matrix-frame"></div>
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                  <span className="checkbox-text">MAINTAIN_SESSION</span>
                </label>
                <Link href="#" className="cyber-link">RECOVER_ACCESS</Link>
              </div>

              <button 
                type="submit" 
                className={`neon-button ${isSubmitting ? 'loading' : ''}`}
                disabled={isSubmitting || loading}
              >
                <div className="btn-matrix"></div>
                <span className="btn-text">[ INITIALIZE_CONNECTION ]</span>
                <div className="btn-loader">
                  <div className="matrix-loader">
                    <div className="matrix-bar"></div>
                    <div className="matrix-bar"></div>
                    <div className="matrix-bar"></div>
                    <div className="matrix-bar"></div>
                  </div>
                </div>
                <div className="btn-glow"></div>
              </button>
            </form>

            <div className="cyber-divider">
              <div className="divider-grid"></div>
              <span className="divider-text">[ ALT_PROTOCOLS ]</span>
              <div className="divider-grid"></div>
            </div>

            <div className="matrix-signup">
              <span className="signup-prefix">[ NEW_USER_DETECTED ]</span>{' '}
              <Link href="/register" className="matrix-link">CREATE_PROFILE</Link>
            </div>

            <div className={`cyber-success ${showSuccess ? 'show' : ''}`}>
              <div className="success-matrix">
                <div className="matrix-rings">
                  <div className="success-ring ring-1"></div>
                  <div className="success-ring ring-2"></div>
                  <div className="success-ring ring-3"></div>
                </div>
                <div className="success-core">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <path d="M10 16l6 6 12-12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              <h3 className="success-title">[ CONNECTION_ESTABLISHED ]</h3>
              <p className="success-desc">Accessing neural interface...</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}