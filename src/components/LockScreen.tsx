import React, { useState, useEffect } from 'react';
import CryptoJS from 'crypto-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, Unlock, KeyRound, AlertCircle, RefreshCw } from 'lucide-react';

interface LockScreenProps {
  onUnlock: (token: string) => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const [isSetup, setIsSetup] = useState(true);
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [debouncedPassword, setDebouncedPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const encrypted = localStorage.getItem('figma_token_encrypted');
    if (encrypted) {
      setIsSetup(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPassword(password);
    }, 500);
    return () => clearTimeout(timer);
  }, [password]);

  const validatePassword = (pass: string) => {
    if (pass.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/.test(pass)) return 'Password must contain at least 1 uppercase letter.';
    if (!/[0-9]/.test(pass)) return 'Password must contain at least 1 number.';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(pass)) return 'Password must contain at least 1 special character.';
    return null;
  };

  const handleSetup = () => {
    setError('');
    if (!token.trim()) {
      setError('Please enter a valid Figma token.');
      return;
    }
    
    const passError = validatePassword(password);
    if (passError) {
      setError(passError);
      return;
    }

    try {
      // Encrypt the token using the password as the secret key
      const encrypted = CryptoJS.AES.encrypt(token.trim(), password).toString();
      localStorage.setItem('figma_token_encrypted', encrypted);
      onUnlock(token.trim());
    } catch (err) {
      setError('Failed to encrypt token. Please try again.');
    }
  };

  const handleUnlock = () => {
    setError('');
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    // Simulate slight delay to prevent brute-force feeling (purely UI)
    setTimeout(() => {
      try {
        const encrypted = localStorage.getItem('figma_token_encrypted');
        if (!encrypted) {
          setIsSetup(true);
          return;
        }

        const bytes = CryptoJS.AES.decrypt(encrypted, password);
        const originalToken = bytes.toString(CryptoJS.enc.Utf8);

        if (!originalToken) {
          throw new Error('Invalid Password');
        }

        onUnlock(originalToken);
      } catch (err) {
        setError('Incorrect password. Could not decrypt token.');
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset your token? This will delete the encrypted token from your browser.')) {
      localStorage.removeItem('figma_token_encrypted');
      setToken('');
      setPassword('');
      setError('');
      setIsSetup(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-2 mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center justify-center">
          <KeyRound className="w-10 h-10 mr-3 text-indigo-500" />
          Figma Explorer Vault
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Your personal access token is securely encrypted with AES on your device.
        </p>
      </div>

      <Card className="w-full max-w-md shadow-xl border-slate-200/60 dark:border-slate-800/60">
        <CardHeader>
          <CardTitle className="flex items-center">
            {isSetup ? <Lock className="w-5 h-5 mr-2 text-blue-500" /> : <Unlock className="w-5 h-5 mr-2 text-emerald-500" />}
            {isSetup ? 'Setup Vault' : 'Unlock Vault'}
          </CardTitle>
          <CardDescription>
            {isSetup 
              ? 'Enter your Figma Token and create a strong Master Password to securely encrypt it.' 
              : 'Enter your Master Password to decrypt your Figma Token.'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-center p-3 bg-red-50 text-red-600 rounded border border-red-100 text-sm">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {isSetup && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Figma Personal Access Token</label>
              <Input
                type="password"
                placeholder="figd_..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
              <p className="text-xs text-slate-500">Get this from Figma Settings {'->'} Personal Access Tokens.</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">{isSetup ? 'Create Master Password' : 'Enter Master Password'}</label>
            <Input
              type="password"
              placeholder="Min 8 chars, 1 uppercase, 1 number, 1 special"
              className="font-mono"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  isSetup ? handleSetup() : handleUnlock();
                }
              }}
            />
            {isSetup && debouncedPassword.length > 0 && validatePassword(debouncedPassword) && (
              <p className="text-xs text-amber-600 dark:text-amber-500 animate-in fade-in slide-in-from-top-1">
                {validatePassword(debouncedPassword)}
              </p>
            )}
            {isSetup && debouncedPassword.length > 0 && !validatePassword(debouncedPassword) && (
              <p className="text-xs text-emerald-600 dark:text-emerald-500 animate-in fade-in slide-in-from-top-1">
                ✓ Password is strong and meets all requirements.
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-3">
          <Button 
            className="w-full" 
            onClick={isSetup ? handleSetup : handleUnlock}
            disabled={loading || (isSetup ? !!validatePassword(password) || !token : !password)}
          >
            {isSetup ? 'Encrypt & Save Token' : 'Decrypt & Unlock'}
          </Button>

          {!isSetup && (
            <Button variant="ghost" className="w-full text-slate-500 hover:text-red-500" onClick={handleReset}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Forgot Password? Reset Vault
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};
