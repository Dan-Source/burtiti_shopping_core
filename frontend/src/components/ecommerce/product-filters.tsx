"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import type { ProductFilterState } from "@/types/api";
import type { ProductSort } from "@/store/catalogStore";
import { AlertCircle, ArrowUpDown, Check, ChevronDown, Filter, Star, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";

type FacetOption = {
  label: string;
  value: string;
  count: number;
};

type CategoryOption = FacetOption & {
  children?: FacetOption[];
};

type ProductFiltersProps = {
  variant?: "toolbar" | "sidebar";
  filters: ProductFilterState;
  sort: ProductSort;
  activeFilterLabels: Array<{ key: string; label: string }>;
  isMobileOpen: boolean;
  categories: CategoryOption[];
  brands: FacetOption[];
  hasBrandFacets: boolean;
  onPatchFilters: (patch: Partial<ProductFilterState>) => void;
  onToggleCategory: (value: string) => void;
  onToggleBrand: (value: string) => void;
  onSetSort: (sort: ProductSort) => void;
  onRemoveFilterByKey: (key: string) => void;
  onResetAll: () => void;
  onOpenMobile: () => void;
  onCloseMobile: () => void;
};

const SORT_OPTIONS: Array<{ value: ProductSort; label: string }> = [
  { value: "popular", label: "Mais relevantes" },
  { value: "price-asc", label: "Menor preço" },
  { value: "price-desc", label: "Maior preço" },
  { value: "newest", label: "Mais recentes" },
  { value: "rating", label: "Mais avaliados" },
];

const SORT_BUTTON_LABELS: Record<ProductSort, string> = {
  popular: "Mais relevantes",
  "price-asc": "Menor para maior",
  "price-desc": "Maior para menor",
  newest: "Mais recentes",
  rating: "Mais avaliados",
};

function RatingButton({
  value,
  selected,
  onClick,
}: {
  value: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition",
        selected
          ? "border-zinc-900 bg-zinc-900 text-white"
          : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50",
      )}
      aria-pressed={selected}
      aria-label={`Filtrar por ${value} estrelas ou mais`}
    >
      <span className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={`${value}-star-${index}`}
            className={cn(
              "h-4 w-4",
              index < value
                ? selected
                  ? "fill-amber-300 text-amber-300"
                  : "fill-amber-400 text-amber-400"
                : "text-zinc-400",
            )}
          />
        ))}
      </span>
      <span>{value}+</span>
    </button>
  );
}

function FacetCheckbox({
  checked,
  label,
  count,
  onClick,
}: {
  checked: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-sm text-zinc-700 transition hover:bg-zinc-100"
      aria-pressed={checked}
      aria-label={`Alternar filtro ${label}`}
    >
      <span className="inline-flex items-center gap-2">
        <span
          className={cn(
            "inline-flex h-4 w-4 items-center justify-center rounded border",
            checked
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-400 bg-white text-transparent",
          )}
          aria-hidden
        >
          <Check className="h-3 w-3" />
        </span>
        <span>{label}</span>
      </span>
      <span className="text-xs text-zinc-500">{count}</span>
    </button>
  );
}

function DebouncedSearchInput({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
}) {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setLocal(value);
  }, [value]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function handleChange(next: string) {
    setLocal(next);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      onChange(next);
    }, 300);
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <Input
      value={local}
      onChange={(event) => handleChange(event.target.value)}
      placeholder={placeholder}
      aria-label={ariaLabel}
    />
  );
}

function FilterBody({
  filters,
  categories,
  brands,
  hasBrandFacets,
  onPatchFilters,
  onToggleCategory,
  onToggleBrand,
}: {
  filters: ProductFilterState;
  categories: CategoryOption[];
  brands: FacetOption[];
  hasBrandFacets: boolean;
  onPatchFilters: (patch: Partial<ProductFilterState>) => void;
  onToggleCategory: (value: string) => void;
  onToggleBrand: (value: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold tracking-wide text-zinc-700 uppercase">Busca</h3>
        <DebouncedSearchInput
          value={filters.search}
          onChange={(value) => onPatchFilters({ search: value })}
          placeholder="Buscar produto"
          ariaLabel="Buscar produtos"
        />
        {filters.search ? (
          <Button variant="ghost" size="sm" onClick={() => onPatchFilters({ search: "" })}>
            Limpar busca
          </Button>
        ) : null}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold tracking-wide text-zinc-700 uppercase">Categorias</h3>
        {categories.length ? (
          <div className="space-y-2">
            {categories.map((category) => (
              <div key={category.value} className="space-y-1">
                <FacetCheckbox
                  checked={filters.categories.includes(category.value)}
                  label={category.label}
                  count={category.count}
                  onClick={() => onToggleCategory(category.value)}
                />
                {category.children?.length ? (
                  <div className="ml-6 space-y-1 border-l border-zinc-200 pl-2">
                    {category.children.map((child) => (
                      <FacetCheckbox
                        key={child.value}
                        checked={filters.categories.includes(child.value)}
                        label={child.label}
                        count={child.count}
                        onClick={() => onToggleCategory(child.value)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
            Faceta de categorias indisponivel.
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold tracking-wide text-zinc-700 uppercase">
          Faixa de preco
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            min={0}
            value={filters.minPrice ?? ""}
            onChange={(event) =>
              onPatchFilters({ minPrice: event.target.value ? Number(event.target.value) : null })
            }
            placeholder="Min"
            aria-label="Preco minimo"
          />
          <Input
            type="number"
            min={0}
            value={filters.maxPrice ?? ""}
            onChange={(event) =>
              onPatchFilters({ maxPrice: event.target.value ? Number(event.target.value) : null })
            }
            placeholder="Max"
            aria-label="Preco maximo"
          />
        </div>
        <div className="space-y-2">
          <input
            type="range"
            min={0}
            max={5000}
            step={50}
            value={filters.minPrice ?? 0}
            onChange={(event) => onPatchFilters({ minPrice: Number(event.target.value) })}
            className="h-2 w-full cursor-pointer accent-zinc-900"
            aria-label="Slider preco minimo"
          />
          <input
            type="range"
            min={0}
            max={5000}
            step={50}
            value={filters.maxPrice ?? 5000}
            onChange={(event) => onPatchFilters({ maxPrice: Number(event.target.value) })}
            className="h-2 w-full cursor-pointer accent-zinc-900"
            aria-label="Slider preco maximo"
          />
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold tracking-wide text-zinc-700 uppercase">Avaliacao</h3>
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((value) => (
            <RatingButton
              key={`rating-${value}`}
              value={value}
              selected={filters.rating === value}
              onClick={() => onPatchFilters({ rating: filters.rating === value ? null : value })}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold tracking-wide text-zinc-700 uppercase">Marcas</h3>
        {hasBrandFacets ? (
          <div className="max-h-44 space-y-1 overflow-auto pr-1">
            {brands.map((brand) => (
              <FacetCheckbox
                key={brand.value}
                checked={filters.brands.includes(brand.value)}
                label={brand.label}
                count={brand.count}
                onClick={() => onToggleBrand(brand.value)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
            <span className="inline-flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              Faceta de marcas ainda nao disponivel.
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold tracking-wide text-zinc-700 uppercase">
          Disponibilidade
        </h3>
        <button
          type="button"
          onClick={() => onPatchFilters({ inStock: !filters.inStock })}
          className={cn(
            "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm",
            filters.inStock
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-300 bg-white text-zinc-700",
          )}
          aria-pressed={filters.inStock}
        >
          <span>Apenas produtos em estoque</span>
          <span
            className={cn(
              "relative inline-flex h-5 w-10 rounded-full transition",
              filters.inStock ? "bg-emerald-500" : "bg-zinc-300",
            )}
            aria-hidden
          >
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-white transition",
                filters.inStock ? "left-5" : "left-0.5",
              )}
            />
          </span>
        </button>

        <button
          type="button"
          onClick={() => onPatchFilters({ onSale: !filters.onSale })}
          className={cn(
            "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm",
            filters.onSale
              ? "border-zinc-900 bg-zinc-900 text-white"
              : "border-zinc-300 bg-white text-zinc-700",
          )}
          aria-pressed={filters.onSale}
        >
          <span>Apenas em oferta</span>
          <span
            className={cn(
              "relative inline-flex h-5 w-10 rounded-full transition",
              filters.onSale ? "bg-emerald-500" : "bg-zinc-300",
            )}
            aria-hidden
          >
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-white transition",
                filters.onSale ? "left-5" : "left-0.5",
              )}
            />
          </span>
        </button>
      </div>
    </div>
  );
}

export function ProductFilters({
  variant = "toolbar",
  filters,
  sort,
  activeFilterLabels,
  isMobileOpen,
  categories,
  brands,
  hasBrandFacets,
  onPatchFilters,
  onToggleCategory,
  onToggleBrand,
  onSetSort,
  onRemoveFilterByKey,
  onResetAll,
  onOpenMobile,
  onCloseMobile,
}: ProductFiltersProps) {
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [sortMenuAnchorEl, setSortMenuAnchorEl] = useState<HTMLButtonElement | null>(null);
  const sortMenuRef = useRef<HTMLDivElement | null>(null);

  function closeSortMenu() {
    setSortMenuOpen(false);
    setSortMenuAnchorEl(null);
  }

  function handleSortMenuClick(event: React.MouseEvent<HTMLButtonElement>) {
    setSortMenuAnchorEl(event.currentTarget);
    setSortMenuOpen((currentOpen) => !currentOpen);
  }

  function handleSortOptionClick(nextSort: ProductSort) {
    onSetSort(nextSort);
    closeSortMenu();
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (
        sortMenuAnchorEl &&
        !sortMenuAnchorEl.contains(target) &&
        !sortMenuRef.current?.contains(target)
      ) {
        closeSortMenu();
      }
    }

    function handleEscapeKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeSortMenu();
      }
    }

    if (sortMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [sortMenuAnchorEl, sortMenuOpen]);

  if (variant === "sidebar") {
    return (
      <aside className="hidden lg:block">
        <Card className="sticky top-20 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900">Filtros</h2>
            <Button variant="ghost" size="sm" onClick={onResetAll}>
              Limpar
            </Button>
          </div>
          <FilterBody
            filters={filters}
            categories={categories}
            brands={brands}
            hasBrandFacets={hasBrandFacets}
            onPatchFilters={onPatchFilters}
            onToggleCategory={onToggleCategory}
            onToggleBrand={onToggleBrand}
          />
        </Card>
      </aside>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-zinc-500" aria-hidden />
          <label className="text-sm font-medium text-zinc-700" htmlFor="sort-products">
            Ordenar por
          </label>
          <div className="relative">
            <Button
              id="sort-products"
              variant="secondary"
              type="button"
              onClick={handleSortMenuClick}
              aria-haspopup="menu"
              aria-expanded={sortMenuOpen}
              aria-label="Ordenar por"
              className="min-w-[190px] justify-between gap-2 px-4 text-[15px] leading-5 font-medium tracking-tight"
            >
              <span className="inline-flex items-center gap-2">
                <span>{SORT_BUTTON_LABELS[sort]}</span>
              </span>
              <ChevronDown
                className={cn("h-4 w-4 text-zinc-500 transition", sortMenuOpen ? "rotate-180" : "")}
              />
            </Button>

            {sortMenuOpen ? (
              <div
                ref={sortMenuRef}
                role="menu"
                aria-label="Opcoes de ordenacao"
                className="navbar-dropdown absolute left-0 z-50 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-2 shadow-xl"
                style={{ top: sortMenuAnchorEl ? sortMenuAnchorEl.offsetHeight + 8 : 48 }}
              >
                <div className="space-y-1">
                  {SORT_OPTIONS.map((option) => {
                    const isActive = sort === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="menuitemradio"
                        aria-checked={isActive}
                        onClick={() => handleSortOptionClick(option.value)}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition",
                          isActive ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100",
                        )}
                      >
                        <span className="font-medium">{option.label}</span>
                        {isActive ? <Check className="h-4 w-4" aria-hidden /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <Button
          variant="secondary"
          className="lg:hidden"
          onClick={onOpenMobile}
          aria-label="Abrir filtros"
        >
          <Filter className="mr-2 h-4 w-4" /> Filtros
        </Button>
      </div>

      {activeFilterLabels.length ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white p-3">
          {activeFilterLabels.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onRemoveFilterByKey(item.key)}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
              aria-label={`Remover filtro ${item.label}`}
            >
              <span>{item.label}</span>
              <X className="h-3 w-3" />
            </button>
          ))}
          <Button variant="ghost" size="sm" onClick={onResetAll}>
            Limpar tudo
          </Button>
        </div>
      ) : null}

      {isMobileOpen ? (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Filtros de produto"
        >
          <button
            type="button"
            className="absolute inset-0 bg-zinc-950/45"
            onClick={onCloseMobile}
            aria-label="Fechar filtros"
          />
          <div className="absolute right-0 h-full w-[92%] max-w-sm overflow-auto bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900">Filtros</h2>
              <button
                type="button"
                onClick={onCloseMobile}
                className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100"
                aria-label="Fechar drawer de filtros"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <FilterBody
              filters={filters}
              categories={categories}
              brands={brands}
              hasBrandFacets={hasBrandFacets}
              onPatchFilters={onPatchFilters}
              onToggleCategory={onToggleCategory}
              onToggleBrand={onToggleBrand}
            />

            <div className="mt-6 flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={onResetAll}>
                Limpar
              </Button>
              <Button className="flex-1" onClick={onCloseMobile}>
                Ver resultados
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
