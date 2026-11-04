import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { resolveComponentCategoryKind } from '../data/hardwareMedia';
import { isSocketCompatible } from '../utils/socketFilter';
import ProductCard from '../components/ProductCard';
import ActiveRigSidebar from '../components/ActiveRigSidebar';

const CATEGORY_KEYS = [
  { key: 'all', tKey: 'allParts' },
  { key: 'gpu', tKey: 'gpus' },
  { key: 'cpu', tKey: 'cpus' },
  { key: 'motherboard', tKey: 'motherboards' },
  { key: 'memory', tKey: 'memory' },
  { key: 'storage', tKey: 'storage' },
  { key: 'cooling', tKey: 'cooling' },
  { key: 'psu', tKey: 'psu' },
  { key: 'case', tKey: 'cases' },
];

const BRAND_OPTIONS = [
  'NVIDIA',
  'AMD',
  'Intel',
  'ASUS',
  'Corsair',
  'MSI',
  'Seasonic',
  'Samsung',
  'Lian Li',
  'NZXT',
  'G.Skill',
];

export default function MarketplaceAndBuilderPage() {
  const {
    listings,
    components,
    loadingCatalog,
    globalSearch,
    setGlobalSearch,
    isRigOpen,
    setIsRigOpen,
    compareItems,
    openModal,
  } = useApp();
  const { t } = useTheme();
  const navigate = useNavigate();

  const CATEGORY_PILLS = useMemo(
    () => CATEGORY_KEYS.map((k) => ({ key: k.key, label: t(k.tKey) })),
    [t]
  );

  // Filter Sidebar visibility: automatically hides when Active Rig Sidebar opens, and returns when closed
  const [isFilterOpen, setIsFilterOpen] = useState(() => !isRigOpen);
  const prevRigOpenRef = useRef(isRigOpen);

  useEffect(() => {
    if (prevRigOpenRef.current !== isRigOpen) {
      if (isRigOpen) {
        setIsFilterOpen(false);
      } else {
        setIsFilterOpen(true);
      }
      prevRigOpenRef.current = isRigOpen;
    }
  }, [isRigOpen]);

  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('featured');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target)) {
        setSortMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const SORT_OPTIONS = useMemo(
    () => [
      { value: 'featured', label: t('sortFeatured'), icon: 'verified' },
      { value: 'price-asc', label: t('sortPriceAsc'), icon: 'trending_up' },
      { value: 'price-desc', label: t('sortPriceDesc'), icon: 'trending_down' },
      { value: 'discount', label: t('sortDiscount'), icon: 'sell' },
    ],
    [t]
  );

  // Filter States
  const [activePill, setActivePill] = useState('all');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [socketCompatLock, setSocketCompatLock] = useState(true);
  const [socketFilter, setSocketFilter] = useState('ALL');
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(2500);
  const [conditionNew, setConditionNew] = useState(true);
  const [conditionUsed, setConditionUsed] = useState(true);
  const [minRating, setMinRating] = useState(4.0);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Combine active listings + any un-listed catalog components so the catalog is always rich
  const allCatalogItems = useMemo(() => {
    const listedCompIds = new Set(listings.map((l) => l.component?.id).filter(Boolean));
    const syntheticFromComponents = components
      .filter((c) => !listedCompIds.has(c.id))
      .map((c) => ({
        id: `comp-${c.id}`,
        component: c,
        price: c.price_avg || '199.00',
        condition: 'new',
        is_active: true,
        seller_username: 'RigForge Direct',
        description: c.description || `${c.brand} ${c.name}`,
      }));
    return [...listings, ...syntheticFromComponents];
  }, [listings, components]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: allCatalogItems.length };
    for (const pill of CATEGORY_PILLS) {
      if (pill.key !== 'all') counts[pill.key] = 0;
    }
    for (const item of allCatalogItems) {
      const kind = resolveComponentCategoryKind(item.component || item);
      if (counts[kind] !== undefined) counts[kind] += 1;
    }
    return counts;
  }, [allCatalogItems]);

  // Brand counts
  const brandCounts = useMemo(() => {
    const counts = {};
    for (const b of BRAND_OPTIONS) counts[b] = 0;
    for (const item of allCatalogItems) {
      const brand = (item.component?.brand || '').toLowerCase();
      for (const b of BRAND_OPTIONS) {
        if (brand.includes(b.toLowerCase())) {
          counts[b] = (counts[b] || 0) + 1;
        }
      }
    }
    return counts;
  }, [allCatalogItems]);

  // Filtered & Sorted Items
  const filteredItems = useMemo(() => {
    return allCatalogItems
      .filter((item) => {
        const comp = item.component || item;
        const kind = resolveComponentCategoryKind(comp);
        const price = parseFloat(item.price ?? comp.price_avg ?? 0);
        const fullTitle = `${comp.brand || ''} ${comp.name || ''} ${comp.socket || ''} ${comp.ram_type || ''} ${item.description || ''}`.toLowerCase();

        if (globalSearch.trim() !== '') {
          const q = globalSearch.trim().toLowerCase();
          if (!fullTitle.includes(q)) return false;
        }

        if (activePill !== 'all' && kind !== activePill) {
          return false;
        }

        if (selectedCategories.length > 0 && !selectedCategories.includes(kind)) {
          return false;
        }

        if (selectedBrands.length > 0) {
          const itemBrand = (comp.brand || '').toLowerCase();
          const matchesBrand = selectedBrands.some((b) => itemBrand.includes(b.toLowerCase()));
          if (!matchesBrand) return false;
        }

        if (!isSocketCompatible(comp, socketFilter)) {
          return false;
        }

        if (price < minPrice || price > maxPrice) {
          return false;
        }

        const cond = (item.condition || 'new').toLowerCase();
        if (!conditionNew && cond === 'new') return false;
        if (!conditionUsed && cond === 'used') return false;

        return true;
      })
      .sort((a, b) => {
        const priceA = parseFloat(a.price ?? a.component?.price_avg ?? 0);
        const priceB = parseFloat(b.price ?? b.component?.price_avg ?? 0);
        if (sortBy === 'price-asc') return priceA - priceB;
        if (sortBy === 'price-desc') return priceB - priceA;
        if (sortBy === 'discount') return priceB - priceA;
        return 0;
      });
  }, [
    allCatalogItems,
    globalSearch,
    activePill,
    selectedCategories,
    selectedBrands,
    socketFilter,
    minPrice,
    maxPrice,
    conditionNew,
    conditionUsed,
    sortBy,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedItems = filteredItems.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage
  );

  const activeFilterCount =
    (activePill !== 'all' ? 1 : 0) +
    selectedCategories.length +
    selectedBrands.length +
    (socketFilter !== 'ALL' ? 1 : 0) +
    (minPrice > 0 || maxPrice < 2500 ? 1 : 0) +
    (!conditionNew || !conditionUsed ? 1 : 0) +
    (globalSearch ? 1 : 0);

  const handleToggleCategoryCheckbox = (key) => {
    setCurrentPage(1);
    setSelectedCategories((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    );
  };

  const handleToggleBrandCheckbox = (brand) => {
    setCurrentPage(1);
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((x) => x !== brand) : [...prev, brand]
    );
  };

  const handleResetFilters = () => {
    setActivePill('all');
    setSelectedCategories([]);
    setSelectedBrands([]);
    setSocketCompatLock(true);
    setSocketFilter('ALL');
    setMinPrice(0);
    setMaxPrice(2500);
    setConditionNew(true);
    setConditionUsed(true);
    setMinRating(4.0);
    setGlobalSearch('');
    setCurrentPage(1);
  };

  const gridColumnsClass =
    viewMode === 'list'
      ? 'grid-cols-1'
      : isRigOpen && isFilterOpen
      ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3'
      : isRigOpen || isFilterOpen
      ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
      : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4';

  return (
    <main className="animate-page-enter w-full pt-4 sm:pt-6 pb-20 lg:pb-16 bg-background min-h-screen">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-margin">
        <div className="flex flex-col w-full">
          {/* Marketplace Utility & Header Navigation */}
          <section className="w-full mb-space-lg flex flex-col gap-space-md">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
              {/* Breadcrumbs & Filter Rail Toggle */}
              <div className="flex items-center flex-wrap gap-space-sm">
                <button
                  id="toggle-filter-btn"
                  type="button"
                  onClick={() => setIsFilterOpen((prev) => !prev)}
                  className="btn-interactive px-space-md py-space-sm rounded-lg bg-surface-container-lowest hover:bg-surface-container text-on-surface border border-outline-variant/20 shadow-sm flex items-center gap-space-xs font-body-md text-body-md font-semibold"
                >
                  <span className="material-symbols-outlined text-[18px] text-primary transition-transform duration-300">
                    {isFilterOpen ? 'tune' : 'filter_alt'}
                  </span>
                  <span>{isFilterOpen ? t('hideFilters') : t('showFilters')}</span>
                </button>

                <div className="flex items-center gap-space-xs font-body-sm text-body-sm text-on-surface-variant">
                  <span>{t('marketplace')}</span>
                  <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                  <span className="text-on-surface font-semibold">
                    {CATEGORY_PILLS.find((p) => p.key === activePill)?.label || t('allParts')}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container font-label-sm text-label-sm text-on-surface font-medium">
                    {filteredItems.length} {t('hardwareComponents')}
                  </span>
                </div>

                {activeFilterCount > 0 && (
                  <div className="animate-item-in hidden sm:flex items-center gap-space-xs px-2.5 py-1 rounded-full bg-secondary-fixed/30 text-on-secondary-fixed-variant font-label-sm text-label-sm font-semibold">
                    <span className="w-2 h-2 rounded-full bg-secondary"></span>
                    <span>
                      {t('filters')}: <span className="font-bold">{activeFilterCount}</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="ml-1 text-primary hover:underline"
                    >
                      {t('resetAll')}
                    </button>
                  </div>
                )}
              </div>

              {/* Controls: Sort, View Modes & Active Rig Toggle */}
              <div className="flex items-center flex-wrap gap-space-sm sm:gap-space-md">
                <div className="relative" ref={sortMenuRef}>
                  <button
                    id="sort-select"
                    type="button"
                    onClick={() => setSortMenuOpen((prev) => !prev)}
                    className="btn-interactive flex items-center gap-2 bg-surface-container-lowest hover:bg-surface-container border border-outline-variant/20 px-space-md py-space-xs rounded-lg shadow-sm"
                  >
                    <span className="font-label-sm text-label-sm text-on-surface-variant">
                      {t('sortBy')}
                    </span>
                    <span className="font-body-md text-body-md font-semibold text-on-surface">
                      {SORT_OPTIONS.find((o) => o.value === sortBy)?.label || 'Featured'}
                    </span>
                    <span
                      className={`material-symbols-outlined text-[18px] text-on-surface-variant transition-transform duration-200 ${
                        sortMenuOpen ? 'rotate-180 text-primary' : ''
                      }`}
                    >
                      expand_more
                    </span>
                  </button>

                  {/* Animated Sort Dropdown Menu */}
                  <div
                    aria-hidden={!sortMenuOpen}
                    className={`absolute right-0 mt-2 w-60 rounded-xl bg-surface-container-lowest border border-outline-variant/30 shadow-xl py-1.5 z-40 origin-top-right transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      sortMenuOpen
                        ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 scale-95 -translate-y-1.5 pointer-events-none'
                    }`}
                  >
                    {SORT_OPTIONS.map((opt) => {
                      const active = sortBy === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setSortBy(opt.value);
                            setSortMenuOpen(false);
                          }}
                          className={`w-full px-3.5 py-2 text-left flex items-center justify-between font-body-sm text-body-sm transition-colors ${
                            active
                              ? 'bg-primary/10 text-primary font-bold'
                              : 'text-on-surface hover:bg-surface-container-low font-medium'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[17px]">
                              {opt.icon}
                            </span>
                            <span>{opt.label}</span>
                          </span>
                          {active && (
                            <span className="material-symbols-outlined text-[16px] text-primary">
                              check
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center bg-surface-container-lowest border border-outline-variant/20 p-1 rounded-lg shadow-sm">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`btn-interactive p-1.5 rounded flex items-center justify-center ${
                      viewMode === 'grid'
                        ? 'bg-surface-container text-primary'
                        : 'hover:bg-surface-container text-on-surface-variant'
                    }`}
                    title="Grid View"
                  >
                    <span className="material-symbols-outlined text-[20px]">grid_view</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`btn-interactive p-1.5 rounded flex items-center justify-center ${
                      viewMode === 'list'
                        ? 'bg-surface-container text-primary'
                        : 'hover:bg-surface-container text-on-surface-variant'
                    }`}
                    title="Compact List View"
                  >
                    <span className="material-symbols-outlined text-[20px]">view_list</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Category Pill Carousel */}
            <div className="flex items-center gap-space-sm overflow-x-auto pb-1 scrollbar-none">
              {CATEGORY_PILLS.map((pill) => {
                const active = activePill === pill.key;
                const count = categoryCounts[pill.key] ?? 0;
                return (
                  <button
                    key={pill.key}
                    type="button"
                    onClick={() => {
                      setActivePill(pill.key);
                      setCurrentPage(1);
                    }}
                    className={`btn-interactive category-pill whitespace-nowrap px-space-md py-space-xs rounded-full font-label-md text-label-md shadow-sm ${
                      active
                        ? 'font-semibold bg-primary text-on-primary'
                        : 'font-medium bg-surface-container-lowest text-on-surface-variant hover:text-on-surface hover:bg-surface-container border border-outline-variant/15'
                    }`}
                  >
                    {pill.label} ({count})
                  </button>
                );
              })}
            </div>
          </section>

          {/* Main Marketplace Workspace: Smooth Animated Left Filter Sidebar + Expanding Catalog Grid + Animated Right Active Rig Split-Sidebar */}
          <div className="w-full flex flex-col lg:flex-row items-start relative">
            {/* Mobile / Tablet Filter Drawer Backdrop */}
            {isFilterOpen && (
              <div
                onClick={() => setIsFilterOpen(false)}
                className="lg:hidden fixed inset-0 z-40 bg-[#0b1c30]/50 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
                aria-hidden="true"
              />
            )}

            {/* Left Parametric Filter Sidebar: Drawer on Mobile/Tablet, Docked on Desktop */}
            <div
              aria-hidden={!isFilterOpen}
              className={`sidebar-slide-transition shrink-0 z-50 lg:z-auto ${
                isFilterOpen
                  ? 'fixed inset-y-0 left-0 w-[88vw] sm:w-80 max-w-80 opacity-100 translate-x-0 pointer-events-auto p-2 sm:p-4 lg:p-0 lg:static lg:w-80 lg:max-w-[320px] lg:mr-gutter'
                  : 'fixed lg:static inset-y-0 left-0 w-0 max-w-0 opacity-0 -translate-x-full lg:-translate-x-10 pointer-events-none m-0 p-0'
              }`}
            >
              <aside
                id="filter-sidebar"
                className="w-full h-full lg:h-auto max-h-[100vh] lg:max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar flex flex-col gap-space-md"
              >
                <div className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl lg:rounded-xl p-space-md sm:p-space-lg shadow-2xl lg:shadow-sm flex flex-col gap-space-lg">
                  {/* Sidebar Title & Quick Reset */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-xs">
                      <span className="material-symbols-outlined text-primary text-[20px]">
                        filter_list
                      </span>
                      <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                        Filters
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="btn-interactive font-label-sm text-label-sm text-primary hover:underline font-semibold cursor-pointer"
                      >
                        Reset All
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsFilterOpen(false)}
                        className="lg:hidden p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                        title="Close Filters"
                      >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                      </button>
                    </div>
                  </div>

                  {/* Socket Compatibility Assistant Toggle */}
                  <div className="p-space-md rounded-lg bg-surface-container-low flex flex-col gap-space-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-space-xs">
                        <span className="material-symbols-outlined text-secondary text-[18px]">
                          rule
                        </span>
                        <span className="font-body-sm text-body-sm font-bold text-on-surface">
                          {t('socketCompatibility')}
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={socketCompatLock}
                          onChange={(e) => setSocketCompatLock(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-outline-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-transparent after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-surface-container-lowest after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {t('socketDesc')}
                    </p>
                    <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                      {['ALL', 'AM5', 'LGA1700'].map((sock) => (
                        <button
                          key={sock}
                          type="button"
                          onClick={() => {
                            setSocketFilter(sock);
                            setCurrentPage(1);
                          }}
                          className={`btn-interactive py-1 rounded font-label-sm text-label-sm font-bold ${
                            socketFilter === sock
                              ? 'bg-primary text-on-primary'
                              : 'bg-surface-container-lowest text-on-surface-variant hover:text-on-surface'
                          }`}
                        >
                          {sock === 'ALL' ? t('allSockets') : sock}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Price Range Slider Section */}
                  <div className="flex flex-col gap-space-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-body-md text-body-md font-bold text-on-surface">
                        {t('priceRange')}
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                        ${minPrice} - ${maxPrice}
                      </span>
                    </div>

                    <div className="flex flex-col gap-2 py-1">
                      <input
                        type="range"
                        min="0"
                        max="2500"
                        step="25"
                        value={maxPrice}
                        onChange={(e) => {
                          const val = Math.max(Number(e.target.value), minPrice + 25);
                          setMaxPrice(val);
                          setCurrentPage(1);
                        }}
                        className="w-full accent-primary cursor-pointer"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-space-sm">
                      <div className="flex flex-col">
                        <span className="font-label-sm text-label-sm text-on-surface-variant mb-1">
                          Min ($)
                        </span>
                        <div className="flex items-center bg-surface-container-low px-space-sm py-1 rounded font-label-md text-label-md font-bold text-on-surface">
                          <span>$</span>
                          <input
                            type="number"
                            value={minPrice}
                            min="0"
                            max={maxPrice}
                            onChange={(e) => {
                              setMinPrice(Math.max(0, Number(e.target.value)));
                              setCurrentPage(1);
                            }}
                            className="w-full bg-transparent pl-1 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-label-sm text-label-sm text-on-surface-variant mb-1">
                          Max ($)
                        </span>
                        <div className="flex items-center bg-surface-container-low px-space-sm py-1 rounded font-label-md text-label-md font-bold text-on-surface">
                          <span>$</span>
                          <input
                            type="number"
                            value={maxPrice}
                            min={minPrice}
                            max="5000"
                            onChange={(e) => {
                              setMaxPrice(Math.max(minPrice, Number(e.target.value)));
                              setCurrentPage(1);
                            }}
                            className="w-full bg-transparent pl-1 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Price Presets */}
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {[
                        { label: '<$150', min: 0, max: 150 },
                        { label: '$150-$500', min: 150, max: 500 },
                        { label: '$500-$1000', min: 500, max: 1000 },
                        { label: '$1000+', min: 950, max: 2500 },
                      ].map((p) => (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => {
                            setMinPrice(p.min);
                            setMaxPrice(p.max);
                            setCurrentPage(1);
                          }}
                          className={`btn-interactive px-2 py-1 rounded font-label-sm text-label-sm ${
                            minPrice === p.min && maxPrice === p.max
                              ? 'bg-primary text-on-primary font-bold'
                              : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Component Category Checkboxes */}
                  <div className="flex flex-col gap-space-sm">
                    <span className="font-body-md text-body-md font-bold text-on-surface">
                      {t('componentCategory')}
                    </span>
                    <div className="flex flex-col gap-1">
                      {CATEGORY_PILLS.filter((p) => p.key !== 'all').map((cat) => (
                        <label
                          key={cat.key}
                          className="flex items-center justify-between p-1.5 rounded hover:bg-surface-container cursor-pointer transition-colors group"
                        >
                          <div className="flex items-center gap-space-sm">
                            <input
                              type="checkbox"
                              checked={selectedCategories.includes(cat.key)}
                              onChange={() => handleToggleCategoryCheckbox(cat.key)}
                              className="w-4 h-4 rounded text-primary focus:ring-0 cursor-pointer"
                            />
                            <span className="font-body-md text-body-md text-on-surface group-hover:text-primary transition-colors">
                              {cat.label}
                            </span>
                          </div>
                          <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                            {categoryCounts[cat.key] || 0}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Manufacturer / Brand Checkboxes */}
                  <div className="flex flex-col gap-space-sm">
                    <span className="font-body-md text-body-md font-bold text-on-surface">
                      {t('manufacturerBrand')}
                    </span>
                    <div className="flex flex-col gap-1 max-h-52 overflow-y-auto custom-scrollbar pr-1">
                      {BRAND_OPTIONS.map((brand) => (
                        <label
                          key={brand}
                          className="flex items-center justify-between p-1.5 rounded hover:bg-surface-container cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-space-sm">
                            <input
                              type="checkbox"
                              checked={selectedBrands.includes(brand)}
                              onChange={() => handleToggleBrandCheckbox(brand)}
                              className="w-4 h-4 rounded text-primary cursor-pointer"
                            />
                            <span className="font-body-md text-body-md text-on-surface">
                              {brand}
                            </span>
                          </div>
                          <span className="font-label-sm text-label-sm text-on-surface-variant">
                            {brandCounts[brand] || 0}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Stock & Condition */}
                  <div className="flex flex-col gap-space-sm">
                    <span className="font-body-md text-body-md font-bold text-on-surface">
                      {t('stockCondition')}
                    </span>
                    <div className="flex flex-col gap-1.5">
                      <label className="flex items-center gap-space-sm p-1.5 rounded hover:bg-surface-container cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={conditionNew}
                          onChange={(e) => setConditionNew(e.target.checked)}
                          className="w-4 h-4 rounded text-primary cursor-pointer"
                        />
                        <span className="font-body-md text-body-md text-on-surface">
                          {t('brandNew')}
                        </span>
                      </label>
                      <label className="flex items-center gap-space-sm p-1.5 rounded hover:bg-surface-container cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={conditionUsed}
                          onChange={(e) => setConditionUsed(e.target.checked)}
                          className="w-4 h-4 rounded text-primary cursor-pointer"
                        />
                        <span className="font-body-md text-body-md text-on-surface">
                          {t('certifiedUsed')}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Customer Rating Filter */}
                  <div className="flex flex-col gap-space-sm">
                    <span className="font-body-md text-body-md font-bold text-on-surface">
                      {t('ratingAndReviews')}
                    </span>
                    <div className="flex flex-col gap-1.5">
                      {[
                        { val: 4.5, label: t('ratingHigh'), count: allCatalogItems.length },
                        { val: 4.0, label: t('ratingAbove'), count: allCatalogItems.length },
                      ].map((r) => (
                        <label
                          key={r.val}
                          className="flex items-center justify-between p-1.5 rounded hover:bg-surface-container cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-space-sm">
                            <input
                              type="radio"
                              name="rating-filter"
                              checked={minRating === r.val}
                              onChange={() => setMinRating(r.val)}
                              className="w-4 h-4 text-primary cursor-pointer"
                            />
                            <div className="flex items-center gap-1 text-tertiary">
                              <span
                                className="material-symbols-outlined text-[16px] text-tertiary-container"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                              >
                                star
                              </span>
                              <span className="font-body-md text-body-md text-on-surface font-semibold">
                                {r.label}
                              </span>
                            </div>
                          </div>
                          <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                            {r.count}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Sidebar Actions */}
                  <div className="pt-space-sm flex flex-col gap-space-xs">
                    <button
                      type="button"
                      onClick={() => setCurrentPage(1)}
                      className="btn-interactive w-full py-space-sm rounded-lg bg-primary hover:bg-on-primary-fixed-variant text-on-primary font-body-md text-body-md font-bold shadow-md"
                    >
                      {t('applyFilters')} ({filteredItems.length})
                    </button>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="btn-interactive w-full py-space-xs rounded-lg text-on-surface-variant hover:text-on-surface font-body-sm text-body-sm text-center"
                    >
                      {t('clearAllParameters')}
                    </button>
                  </div>
                </div>
              </aside>
            </div>

            {/* Center Parts Catalog Matrix Grid */}
            <div className="flex-1 min-w-0 flex flex-col gap-space-lg w-full transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]">
              {loadingCatalog ? (
                <div className={`grid ${gridColumnsClass} gap-gutter`}>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div
                      key={n}
                      className="h-96 rounded-xl bg-surface-container-lowest border border-outline-variant/20 p-space-md animate-pulse flex flex-col justify-between"
                    >
                      <div className="h-44 rounded-lg bg-surface-container-low"></div>
                      <div className="h-5 w-2/3 rounded bg-surface-container"></div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="h-6 rounded bg-surface-container-low"></div>
                        <div className="h-6 rounded bg-surface-container-low"></div>
                      </div>
                      <div className="h-10 rounded-lg bg-surface-container"></div>
                    </div>
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="animate-item-in p-12 rounded-xl bg-surface-container-lowest border border-outline-variant/20 text-center flex flex-col items-center gap-3 shadow-sm">
                  <span className="material-symbols-outlined text-[42px] text-outline">
                    search_off
                  </span>
                  <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                    {t('noProductsFound')}
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
                    {t('noProductsDesc')}
                  </p>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="btn-interactive mt-2 px-space-lg py-space-sm rounded-lg bg-primary text-on-primary font-body-md text-body-md font-bold shadow-sm"
                  >
                    {t('resetAll')}
                  </button>
                </div>
              ) : (
                <div
                  id="catalog-grid"
                  className={`grid ${gridColumnsClass} gap-gutter transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]`}
                >
                  {paginatedItems.map((item) => (
                    <ProductCard key={item.id} item={item} viewMode={viewMode} />
                  ))}
                </div>
              )}

              {/* Pagination & Results Status Footer */}
              {filteredItems.length > 0 && (
                <section className="w-full mt-space-md p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/20 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-space-md">
                  <div className="font-body-sm text-body-sm text-on-surface-variant">
                    {t('showing')}{' '}
                    <span className="font-bold text-on-surface">
                      {(safePage - 1) * itemsPerPage + 1} –{' '}
                      {Math.min(safePage * itemsPerPage, filteredItems.length)}
                    </span>{' '}
                    {t('of')} <span className="font-bold text-on-surface">{filteredItems.length}</span>{' '}
                    {t('hardwareComponents')}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={safePage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="btn-interactive p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`btn-interactive px-3 py-1.5 rounded-lg font-label-md text-label-md font-bold ${
                          pageNum === safePage
                            ? 'bg-primary text-on-primary'
                            : 'hover:bg-surface-container text-on-surface'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}

                    <button
                      type="button"
                      disabled={safePage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="btn-interactive p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                  </div>
                </section>
              )}
            </div>

            {/* Right Split-Panel Active System Build ("RigForge Cart") */}
            <ActiveRigSidebar />
          </div>
        </div>
      </div>
    </main>
  );
}
