import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Menu, Moon, Sun } from "lucide-react";
import { ReactNode, useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { useTheme } from "./theme-provider";

interface LayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
  handleEnergyLevelChange?: (level: number) => void;
}

const Layout = ({ children, showSidebar = true, handleEnergyLevelChange }: LayoutProps) => {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Hide sidebar on welcome page
  const isWelcomePage = location.pathname === '/';

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Hamburger for mobile */}
      {showSidebar && !isWelcomePage && (
        <div className="md:hidden flex items-center p-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md focus:outline-none focus:ring"
            aria-label="Open sidebar"
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
      )}

      {/* Desktop sidebar */}
      {showSidebar && !isWelcomePage && (
        <div className="hidden md:block">
          <Sidebar handleEnergyLevelChange={handleEnergyLevelChange} />
        </div>
      )}

      {/* Sidebar Drawer for mobile */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <Sidebar handleEnergyLevelChange={handleEnergyLevelChange} />
        </SheetContent>
      </Sheet>

      <main className="flex-1 p-4 md:p-8 animate-fade-in">
        <div className="absolute top-4 right-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="rounded-full"
          >
            {theme === "light" ? (
              <Moon className="h-5 w-5" />
            ) : (
              <Sun className="h-5 w-5" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
        {children}
      </main>
    </div>
  );
};

export default Layout;
