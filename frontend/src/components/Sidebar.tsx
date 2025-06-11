import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useAuthContext } from "@/context/AuthContext";
import { useTaskContext } from "@/context/TaskContext";
import {
  Battery,
  BatteryCharging,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  Calendar,
  CheckCircle,
  Home,
  LogOut,
  Plus
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { ProfileDropdown } from "./ProfileDropdown";

const Sidebar = ({ handleEnergyLevelChange }: { handleEnergyLevelChange?: (level: number) => void }) => {
  const navigate = useNavigate();
  const { energyLevel, setEnergyLevel } = useTaskContext();
  const { signOut } = useAuthContext();

  const getEnergyIcon = () => {
    if (energyLevel <= 2) {
      return <BatteryLow className="mr-2 h-5 w-5 text-red-500" />;
    } else if (energyLevel <= 5) {
      return <BatteryMedium className="mr-2 h-5 w-5 text-yellow-500" />;
    } else if (energyLevel <= 8) {
      return <BatteryFull className="mr-2 h-5 w-5 text-green-500" />;
    } else if (energyLevel <= 10) {
      return <BatteryCharging className="mr-2 h-5 w-5 text-primary animate-pulse" />;
    } else {
      return <Battery className="mr-2 h-5 w-5" />;
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Failed to sign out:', error);
      // Optionally show error to user via toast/alert
    }
  };

  return (
    <aside className="w-64 h-screen border-r shrink-0 bg-secondary/30 dark:bg-secondary/10">
      <div className="p-6 flex flex-col h-full">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            <BatteryCharging className="h-6 w-6 text-primary mr-2" />
            <h1 className="text-xl font-semibold">Cognitive Daily</h1>
          </div>
          <ProfileDropdown />
        </div>
        
        <nav className="space-y-1">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center px-4 py-2.5 rounded-lg transition-colors ${
                isActive 
                ? "bg-primary text-white" 
                : "hover:bg-secondary"
              }`
            }
          >
            <Home className="mr-2 h-5 w-5" />
            Dashboard
          </NavLink>
          
          <NavLink
            to="/task-input"
            className={({ isActive }) =>
              `flex items-center px-4 py-2.5 rounded-lg transition-colors ${
                isActive 
                ? "bg-primary text-white" 
                : "hover:bg-secondary"
              }`
            }
          >
            <Plus className="mr-2 h-5 w-5" />
            Add Task
          </NavLink>
          
          <NavLink
            to="/daily-plan"
            className={({ isActive }) =>
              `flex items-center px-4 py-2.5 rounded-lg transition-colors ${
                isActive 
                ? "bg-primary text-white" 
                : "hover:bg-secondary"
              }`
            }
          >
            <Calendar className="mr-2 h-5 w-5" />
            Daily Plan
          </NavLink>
          
          <NavLink
            to="/completed"
            className={({ isActive }) =>
              `flex items-center px-4 py-2.5 rounded-lg transition-colors ${
                isActive 
                ? "bg-primary text-white" 
                : "hover:bg-secondary"
              }`
            }
          >
            <CheckCircle className="mr-2 h-5 w-5" />
            Completed
          </NavLink>
        </nav>

        <div className="mt-auto space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                {getEnergyIcon()}
                <span className="text-sm font-medium">Energy Level</span>
              </div>
              <span className="text-sm font-semibold">{energyLevel}/10</span>
            </div>
            <Slider 
              value={[energyLevel]}
              min={1}
              max={10}
              step={1}
              onValueChange={(val) => handleEnergyLevelChange ? handleEnergyLevelChange(val[0]) : setEnergyLevel(val[0])}
              className="py-2"
            />
          </div>

          <Button 
            variant="outline" 
            className="w-full flex items-center justify-center gap-2" 
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
