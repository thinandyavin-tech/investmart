// Thin wrapper for import compatibility — backed by lucide-react.
import { Search } from "lucide-react";

interface SearchIconProps { size?: number; }

export function SearchIcon({ size = 20 }: SearchIconProps) {
  return <Search size={size} strokeWidth={1.8} aria-hidden="true" />;
}
