const FILTERS = [{ id: 'music', label: 'Música' }]

export function HomeContentFilters({ active, onChange }) {
  return (
    <div className="home-filters px-4 pb-5">
      <div className="home-filters__track scrollbar-hide">
        {FILTERS.map((f) => {
          const isActive = active === f.id
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onChange(f.id)}
              className={`home-filters__pill${isActive ? ' home-filters__pill--active' : ''}`}
            >
              {f.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
