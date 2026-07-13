"use client";

import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Student {
  id: string;
  fullName: string;
  studentId: string;
}

interface SearchableStudentSelectProps {
  students: Student[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
}

export function SearchableStudentSelect({
  students,
  value,
  onValueChange,
  placeholder = "Select student",
  className,
  error,
}: SearchableStudentSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = students.find((s) => s.id === value);

  const filtered = query.trim() === ""
    ? students
    : students.filter((s) =>
        s.fullName.toLowerCase().includes(query.toLowerCase())
      );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSelect = (studentId: string) => {
    onValueChange(studentId);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center justify-between w-full rounded-md border px-3 py-2 text-sm transition-colors",
          "bg-background hover:bg-muted/30 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
          error ? "border-destructive" : "border-input",
          open && "ring-2 ring-ring ring-offset-1"
        )}
      >
        {selected ? (
          <span className="flex items-center gap-2 truncate">
            <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{selected.fullName}</span>
            <span className="text-muted-foreground text-xs shrink-0">— {selected.studentId}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown className={cn("w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200", open && "rotate-180")} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-md border border-border bg-popover shadow-lg overflow-hidden">
          {/* Search box */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border/50">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Student list */}
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No students found for &quot;{query}&quot;
              </div>
            ) : (
              filtered.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSelect(s.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left transition-colors hover:bg-muted/50",
                    s.id === value && "bg-primary/10 text-primary"
                  )}
                >
                  <div className="w-7 h-7 rounded-full bg-indigo-500/15 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{s.fullName}</p>
                    <p className="text-xs text-muted-foreground">{s.studentId}</p>
                  </div>
                  {s.id === value && (
                    <span className="text-xs bg-primary/15 text-primary px-1.5 py-0.5 rounded-full shrink-0">Selected</span>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer count */}
          {query && (
            <div className="px-3 py-1.5 border-t border-border/50 text-xs text-muted-foreground bg-muted/20">
              {filtered.length} of {students.length} students
            </div>
          )}
        </div>
      )}
    </div>
  );
}
