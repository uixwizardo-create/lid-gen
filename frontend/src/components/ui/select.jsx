import * as React from "react";
import { ChevronDown, Check } from "lucide-react";

export const Select = ({ value, onChange, options = [], className = "", position = "down", ...props }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const dropdownPosClass = position === "up" 
    ? "bottom-full mb-1" 
    : "top-full mt-1.5";

  return (
    <div ref={containerRef} className="relative inline-block text-left" {...props}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center justify-between gap-2 bg-zinc-900 border border-zinc-750 text-zinc-200 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition-all hover:border-zinc-650 hover:bg-zinc-850 focus:outline-none focus:ring-2 focus:ring-orange-500/20 ${className}`}
      >
        <span>{selectedOption ? selectedOption.label : value}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${isOpen ? "rotate-180 text-orange-400" : ""}`} />
      </button>

      {isOpen && (
        <div className={`absolute right-0 ${dropdownPosClass} z-50 min-w-[130px] rounded-xl border border-zinc-750 bg-[#131924]/98 backdrop-blur-xl p-1 shadow-2xl animate-in fade-in-80 zoom-in-95`}>
          {options.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                  isSelected ? "bg-orange-500/15 text-orange-400 font-bold" : "text-zinc-300 hover:bg-zinc-800/80 hover:text-white"
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-orange-400 ml-2" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
