import { createContext, useContext, useState, ReactNode } from "react";

interface SidebarContextType {
  isOpen: boolean;
  isCollapsed: boolean;
  toggle: () => void;
  close: () => void;
  open: () => void;
  collapse: () => void;
  expand: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggle = () => {
    if (isOpen && !isCollapsed) {
      setIsCollapsed(true);
    } else if (isOpen && isCollapsed) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
      setIsCollapsed(false);
    }
  };
  
  const close = () => setIsOpen(false);
  const open = () => {
    setIsOpen(true);
    setIsCollapsed(false);
  };
  const collapse = () => setIsCollapsed(true);
  const expand = () => setIsCollapsed(false);

  return (
    <SidebarContext.Provider value={{ isOpen, isCollapsed, toggle, close, open, collapse, expand }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}