import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface PasswordStrengthMeterProps {
  password: string;
}

export const PasswordStrengthMeter = ({ password }: PasswordStrengthMeterProps) => {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '' };

    let score = 0;
    
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[@$!%*?&]/.test(password)) score++;

    if (score <= 2) return { score, label: 'Weak', color: 'bg-destructive' };
    if (score <= 4) return { score, label: 'Medium', color: 'bg-warning' };
    return { score, label: 'Strong', color: 'bg-success' };
  }, [password]);

  const requirements = [
    { met: password.length >= 8, text: 'At least 8 characters' },
    { met: /[A-Z]/.test(password), text: 'One uppercase letter' },
    { met: /[a-z]/.test(password), text: 'One lowercase letter' },
    { met: /\d/.test(password), text: 'One number' },
    { met: /[@$!%*?&]/.test(password), text: 'One special character (@$!%*?&)' },
  ];

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full transition-all duration-300',
              strength.color
            )}
            style={{ width: `${(strength.score / 6) * 100}%` }}
          />
        </div>
        <span className={cn(
          'text-sm font-medium',
          strength.score <= 2 && 'text-destructive',
          strength.score > 2 && strength.score <= 4 && 'text-warning',
          strength.score > 4 && 'text-success'
        )}>
          {strength.label}
        </span>
      </div>
      
      <ul className="space-y-1">
        {requirements.map((req, index) => (
          <li
            key={index}
            className={cn(
              'text-xs flex items-center gap-1',
              req.met ? 'text-success' : 'text-muted-foreground'
            )}
          >
            <span>{req.met ? '✓' : '○'}</span>
            {req.text}
          </li>
        ))}
      </ul>
    </div>
  );
};
