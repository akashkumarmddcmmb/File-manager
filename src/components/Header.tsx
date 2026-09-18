import React, { useState } from 'react';
import { 
  Menu,
  Search, 
  X, 
  Grid, 
  List, 
  ArrowUpDown, 
  Languages, 
  HardDrive,
  MoreVertical,
  User,
  ShieldCheck
} from 'lucide-react';
import { ViewMode, SortOption, Language, UserAccount } from '../types';
import { translations } from '../utils/translations';
import { GoogleFilesLogo } from './GoogleFilesLogo';
import { GoogleLogoIcon, MicrosoftLogoIcon } from './AccountModal';

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
  userAccount?: UserAccount | null;
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
  onOpenStorageBreakdown,
  onOpenDrawer,
  onOpenAccount,
  userAccount,
}) => {
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const t = translations[language];

  return (
    <header className="sticky top-0 z-30 bg-[#f8fafd]/95 backdrop-blur-md px-3 sm:px-6 pt-[max(0.625rem,env(safe-area-inset-top))] pb-2 transition-colors">
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
                onClick={() => {
                  setShowSortMenu(!showSortMenu);
                  setShowMoreMenu(false);
                }}
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

            {/* Three Dots More Menu (Account section relocated inside here) */}
            <div className="relative">
              <button
                id="btn-three-dots-menu"
                onClick={() => {
                  setShowMoreMenu(!showMoreMenu);
                  setShowSortMenu(false);
                }}
                title={t.moreOptions}
                className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer shrink-0 ml-0.5"
              >
                <MoreVertical size={19} />
              </button>

              {/* Three Dots Overflow Menu */}
              {showMoreMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMoreMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-neutral-200/90 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    {/* Account Section inside Three Dots */}
                    <div className="px-2.5 pb-2">
                      <div className="px-1 pb-1.5 text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                        {t.account}
                      </div>

                      {userAccount ? (
                        <button
                          id="btn-three-dots-account"
                          onClick={() => {
                            setShowMoreMenu(false);
                            onOpenAccount();
                          }}
                          className="w-full p-2.5 bg-neutral-50 hover:bg-blue-50/70 rounded-xl transition-colors flex items-center gap-2.5 text-left group cursor-pointer border border-neutral-200/80"
                        >
                          <div className="relative shrink-0">
                            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                              {userAccount.name ? userAccount.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div className="absolute -bottom-0.5 -right-0.5 bg-white p-0.5 rounded-full shadow-xs border border-neutral-200">
                              {userAccount.provider === 'google' ? (
                                <GoogleLogoIcon size={10} />
                              ) : (
                                <MicrosoftLogoIcon size={10} />
                              )}
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-neutral-900 group-hover:text-blue-600 truncate">
                              {userAccount.name}
                            </p>
                            <p className="text-[11px] text-neutral-500 truncate">
                              {userAccount.email}
                            </p>
                          </div>
                        </button>
                      ) : (
                        <button
                          id="btn-three-dots-sign-in"
                          onClick={() => {
                            setShowMoreMenu(false);
                            onOpenAccount();
                          }}
                          className="w-full p-2.5 bg-blue-50/70 hover:bg-blue-100/70 rounded-xl transition-colors flex items-center gap-2.5 text-left group cursor-pointer border border-blue-200/80"
                        >
                          <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                            <User size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-blue-700 group-hover:text-blue-800">
                              {t.signIn}
                            </p>
                            <p className="text-[11px] text-blue-600/80 truncate">
                              Google / Microsoft
                            </p>
                          </div>
                        </button>
                      )}
                    </div>

                    <div className="my-1 border-t border-neutral-100" />

                    {/* Storage Breakdown */}
                    <button
                      id="btn-three-dots-storage"
                      onClick={() => {
                        setShowMoreMenu(false);
                        onOpenStorageBreakdown();
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center gap-2.5 cursor-pointer"
                    >
                      <HardDrive size={16} className="text-neutral-500" />
                      <span>{t.storageBreakdown}</span>
                    </button>

                    {/* Language Switch */}
                    <button
                      id="btn-three-dots-lang"
                      onClick={() => {
                        setShowMoreMenu(false);
                        onToggleLanguage();
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center gap-2.5 cursor-pointer"
                    >
                      <Languages size={16} className="text-purple-600" />
                      <span>{language === 'en' ? 'हिंदी (Hindi)' : 'English'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
