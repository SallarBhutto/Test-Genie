import { TableHead } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { SortDirection } from "@/hooks/useSorting";
import { cn } from "@/lib/utils";

interface SortableTableHeadProps {
  children: React.ReactNode;
  sortKey: string;
  currentSortKey: string;
  sortDirection: SortDirection;
  onSort: (key: string) => void;
  className?: string;
}

export function SortableTableHead({
  children,
  sortKey,
  currentSortKey,
  sortDirection,
  onSort,
  className
}: SortableTableHeadProps) {
  const isActive = currentSortKey === sortKey;
  
  const getSortIcon = () => {
    if (!isActive || !sortDirection) {
      return <ArrowUpDown className="w-4 h-4" />;
    }
    
    return sortDirection === "asc" ? 
      <ArrowUp className="w-4 h-4" /> : 
      <ArrowDown className="w-4 h-4" />;
  };

  return (
    <TableHead className={className}>
      <Button
        variant="ghost"
        onClick={() => onSort(sortKey)}
        className={cn(
          "h-auto p-0 font-medium hover:bg-transparent flex items-center gap-2",
          isActive && "text-primary"
        )}
      >
        {children}
        {getSortIcon()}
      </Button>
    </TableHead>
  );
}