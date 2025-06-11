import { Button } from "@/components/ui/button";
import { BatteryCharging } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Splash = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-cognitive-blue to-white dark:from-primary dark:to-background p-4">
      <div className="max-w-xl w-full text-center space-y-8">
        <div className="flex flex-col items-center space-y-2">
          <BatteryCharging className="h-12 w-12 text-primary mb-2" />
          <h1 className="text-4xl font-bold">Cognitive Daily</h1>
          <h2 className="text-2xl font-semibold text-muted-foreground">
            Plan your day in harmony with your mental energy
          </h2>
        </div>
        <p className="text-lg text-muted-foreground">
          Smart Daily Planner helps you reduce mental overload by intelligently planning your schedule based on your tasks, energy levels, and deadlines.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button className="w-full sm:w-auto" size="lg" onClick={() => navigate("/welcome")}>Sign Up</Button>
          <Button className="w-full sm:w-auto" size="lg" variant="outline" onClick={() => navigate("/login")}>Log In</Button>
        </div>
        {/* Optional: <a href="/privacy" className="text-xs text-muted-foreground underline">Privacy Policy</a> */}
      </div>
    </div>
  );
};

export default Splash; 