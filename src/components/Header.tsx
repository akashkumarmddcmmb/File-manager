import React, { useState } from 'react';
import { 
  Menu,
  Search, 
  X, 
  Grid, 
  List, 
  ArrowUpDown, 
  Upload, 
  FolderPlus, 
  Languages, 
  HardDrive 
} from 'lucide-react';
import { ViewMode, SortOption, Language } from '../types';
import { translations } from '../utils/translations';
import { GoogleFilesLogo } from './GoogleFilesLogo';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  viewMode: ViewMode;
  onToggleViewMode: () => void;
  sortOption: SortOption;
  onSelectSortOption: (opt: SortOption) => void;
  language: Language;
  onToggleLanguage: () => void;
  onUploadClick: () => void;
  onNewFolderClick: () => void;
  onOpenStorageBreakdown: () => void;
  onOpenDrawer: () => void;
  onOpenAccount: () => void;
  userName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  viewMode,
  onToggleViewMode,
  sortOption,
  onSelectSortOption,
  language,
  onToggleLanguage,
  onUploadClick,
  onNewFolderClick,
  onOpenStorageBreakdown,
  onOpenDrawer,
  onOpenAccount,
  userName = 'Akash Kumar',
}) => {
  const [showSortMenu, setShowSortMenu] = useState(false);
  const t = translations[language];

  return (
    <header className="sticky top-0 z-30 bg-[#f8fafd]/95 backdrop-blur-md px-3 sm:px-6 pt-2.5 pb-2 transition-colors">
      <div className="max-w-4xl mx-auto">
        {/* Google Files Signature Material 3 Floating Search Bar */}
        <div className="bg-white rounded-full border border-neutral-200/90 shadow-xs hover:shadow-md transition-shadow px-2.5 sm:px-4 py-1.5 flex items-center gap-2 sm:gap-3">
          {/* Hamburger Menu Button */}
          <button
            id="btn-hamburger-menu"
            onClick={onOpenDrawer}
            title="Open navigation menu"
            className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer shrink-0"
          >
            <Menu size={22} />
          </button>

          {/* Google Files Logo */}
          <div className="hidden xs:flex items-center shrink-0 cursor-pointer" onClick={onOpenDrawer}>
            <GoogleFilesLogo size={26} />
          </div>

          {/* Search Input Container */}
          <div className="flex-1 flex items-center relative min-w-0">
            <Search size={18} className="text-neutral-400 shrink-0 mr-2" />
            <input
              id="files-global-search"
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-transparent text-sm text-neutral-800 placeholder-neutral-500 focus:outline-none border-none py-1"
            />
            {searchQuery && (
              <button
                id="btn-clear-search"
                onClick={() => onSearchChange('')}
                className="p-1 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors shrink-0"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Right Action Icons in Search Bar */}
          <div className="flex items-center gap-1 shrink-0">
            {/* View Mode Toggle (Grid/List) */}
            <button
              id="btn-view-mode-toggle"
              onClick={onToggleViewMode}
              title={viewMode === 'grid' ? 'Switch to List view' : 'Switch to Grid view'}
              className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
            >
              {viewMode === 'grid' ? <List size={19} /> : <Grid size={19} />}
            </button>

            {/* Sort Menu Toggle */}
            <div className="relative">
              <button
                id="btn-sort-toggle"
                onClick={() => setShowSortMenu(!showSortMenu)}
                title="Sort options"
                className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer"
              >
                <ArrowUpDown size={18} />
              </button>

              {/* Sort Menu Dropdown */}
              {showSortMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowSortMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-neutral-200/90 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3.5 py-2 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                      Sort files by
                    </div>
                    <button
                      onClick={() => {
                        onSelectSortOption('date-desc');
                        setShowSortMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                        sortOption === 'date-desc' ? 'text-blue-600 font-semibold bg-blue-50' : 'text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      <span>Newest first</span>
                      {sortOption === 'date-desc' && <span className="text-blue-600">✓</span>}
                    </button>
                    <button
                      onClick={() => {
                        onSelectSortOption('date-asc');
                        setShowSortMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                        sortOption === 'date-asc' ? 'text-blue-600 font-semibold bg-blue-50' : 'text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      <span>Oldest first</span>
                      {sortOption === 'date-asc' && <span className="text-blue-600">✓</span>}
                    </button>
                    <button
                      onClick={() => {
                        onSelectSortOption('name-asc');
                        setShowSortMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                        sortOption === 'name-asc' ? 'text-blue-600 font-semibold bg-blue-50' : 'text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      <span>Name (A to Z)</span>
                      {sortOption === 'name-asc' && <span className="text-blue-600">✓</span>}
                    </button>
                    <button
                      onClick={() => {
                        onSelectSortOption('size-desc');
                        setShowSortMenu(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs transition-colors flex items-center justify-between cursor-pointer ${
                        sortOption === 'size-desc' ? 'text-blue-600 font-semibold bg-blue-50' : 'text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      <span>Size (Largest first)</span>
                      {sortOption === 'size-desc' && <span className="text-blue-600">✓</span>}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Language Switcher */}
            <button
              id="btn-lang-toggle"
              onClick={onToggleLanguage}
              title={t.switchLang}
              className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer flex items-center text-xs font-semibold"
            >
              <Languages size={17} className="text-purple-600 mr-0.5" />
              <span className="text-[11px] hidden sm:inline">{language === 'en' ? 'HI' : 'EN'}</span>
            </button>

            {/* Google Account Profile Avatar Bubble */}
            <button
              id="btn-google-account-avatar"
              onClick={onOpenAccount}
              title="Google Account"
              className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center font-bold text-xs shadow-xs ring-2 ring-white hover:ring-blue-200 transition-all cursor-pointer shrink-0 ml-0.5"
            >
              {userName.charAt(0)}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
