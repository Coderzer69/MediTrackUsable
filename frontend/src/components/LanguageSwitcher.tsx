import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Check } from 'lucide-react';

export interface LanguageOption {
  code: string;
  label: string;
  native: string;
  displayCode: string;
  flagType: 'uk' | 'in';
  badgeColor?: string;
}

export const LANGUAGES: LanguageOption[] = [
  {
    code: 'en',
    label: 'English',
    native: 'English',
    displayCode: 'ENG',
    flagType: 'uk',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    code: 'hi',
    label: 'Hindi',
    native: 'हिन्दी',
    displayCode: 'HIN',
    flagType: 'in',
    badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
  },
  {
    code: 'bn',
    label: 'Bengali',
    native: 'বাংলা',
    displayCode: 'BEN',
    flagType: 'in',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    code: 'mr',
    label: 'Marathi',
    native: 'मराठी',
    displayCode: 'MAR',
    flagType: 'in',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    code: 'te',
    label: 'Telugu',
    native: 'తెలుగు',
    displayCode: 'TEL',
    flagType: 'in',
    badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  {
    code: 'ta',
    label: 'Tamil',
    native: 'தமிழ்',
    displayCode: 'TAM',
    flagType: 'in',
    badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
  },
];

const FlagIcon: React.FC<{ type: 'uk' | 'in'; size?: number }> = ({ type, size = 18 }) => {
  if (type === 'uk') {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        className="rounded-full shadow-xs overflow-hidden shrink-0 border border-gray-100"
      >
        <clipPath id="circle-uk-flag">
          <circle cx="16" cy="16" r="16" />
        </clipPath>
        <g clipPath="url(#circle-uk-flag)">
          <path fill="#012169" d="M0 0h32v32H0z" />
          <path stroke="#fff" strokeWidth="5.5" d="M0 0l32 32M32 0L0 32" />
          <path stroke="#C8102E" strokeWidth="3" d="M0 0l32 32M32 0L0 32" />
          <path stroke="#fff" strokeWidth="9" d="M16 0v32M0 16h32" />
          <path stroke="#C8102E" strokeWidth="5.5" d="M16 0v32M0 16h32" />
        </g>
      </svg>
    );
  }

  // Indian Tricolor Flag
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className="rounded-full shadow-xs overflow-hidden shrink-0 border border-gray-100"
    >
      <clipPath id="circle-in-flag">
        <circle cx="16" cy="16" r="16" />
      </clipPath>
      <g clipPath="url(#circle-in-flag)">
        <rect fill="#FF9933" width="32" height="11" />
        <rect fill="#FFFFFF" y="10.5" width="32" height="11" />
        <rect fill="#138808" y="21" width="32" height="11" />
        <circle cx="16" cy="16" r="3.2" fill="none" stroke="#000080" strokeWidth="0.8" />
      </g>
    </svg>
  );
};

interface LanguageSwitcherProps {
  className?: string;
}

export default function LanguageSwitcher({ className = '' }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Normalize current language (e.g. 'en-US' -> 'en')
  const currentLangCode = (i18n.language || 'en').split('-')[0].toLowerCase();
  const currentLang =
    LANGUAGES.find((l) => l.code === currentLangCode) || LANGUAGES[0];

  const handleSelectLanguage = (lang: LanguageOption) => {
    i18n.changeLanguage(lang.code);
    localStorage.setItem('i18nextLng', lang.code);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Pill Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="group bg-white hover:bg-gray-50 border border-gray-200 hover:border-emerald-500 rounded-full px-3 py-1.5 shadow-sm text-xs font-bold text-gray-700 flex items-center gap-1.5 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Switch Language"
      >
        <FlagIcon type={currentLang.flagType} size={16} />
        <span className="tracking-wide text-gray-800 font-semibold">{currentLang.displayCode}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-600 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-emerald-600' : ''
          }`}
        />
      </button>

      {/* Floating Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 px-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="px-3 py-1 mb-1 border-b border-gray-100 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-gray-400">
              Select Language
            </span>
            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
              6 Languages
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            {LANGUAGES.map((lang) => {
              const isSelected = lang.code === currentLang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelectLanguage(lang)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50/80 text-emerald-900 font-bold shadow-xs'
                      : 'hover:bg-gray-50 text-gray-700 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <FlagIcon type={lang.flagType} size={18} />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold tracking-tight text-gray-900 leading-tight">
                        {lang.native}
                      </span>
                      <span className="text-[11px] text-gray-500 leading-tight">
                        {lang.label}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600">
                      {lang.displayCode}
                    </span>
                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
