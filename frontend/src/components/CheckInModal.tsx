import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { useTaskContext } from "@/context/TaskContext";
import { useEffect, useState } from "react";

type CheckInTime = "morning" | "afternoon" | "evening" | "night";

interface CheckInModalProps {
  time: CheckInTime;
}

const checkInMessages = {
  morning: {
    title: "Good Morning!",
    description: "Ready to plan your day?",
    action: "Plan my day"
  },
  afternoon: {
    title: "Afternoon Check-in",
    description: "How's your energy level doing? Need to adjust your schedule?",
    action: "Update my plan"
  },
  evening: {
    title: "Evening Reflection",
    description: "Here's a summary of what you've accomplished today.",
    action: "See summary"
  },
  night: {
    title: "Night Reflection",
    description: "How's your energy level doing? Need to adjust your schedule?",
    action: "Update my plan"
  }
};

const PERIODS = ["morning", "afternoon", "evening", "night"];

const getToday = () => new Date().toISOString().split("T")[0];

const getCurrentPeriod = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
};

const CheckInModal = ({ time }: CheckInModalProps) => {
  const [open, setOpen] = useState(false);
  const { energyLevel, setEnergyLevel, generateDailySchedule } = useTaskContext();
  
  useEffect(() => {
    const today = getToday();
    const key = `checkin_shown_periods_${today}`;
    let shownPeriods: string[] = [];
    try {
      shownPeriods = JSON.parse(localStorage.getItem(key) || "[]");
    } catch {
      shownPeriods = [];
    }

    let periodToShow = time;
    // If all periods have been shown, but less than 5 total, pick a random period (allow a repeat)
    if (shownPeriods.length >= PERIODS.length && shownPeriods.length < 5) {
      periodToShow = PERIODS[Math.floor(Math.random() * PERIODS.length)] as CheckInTime;
    }

    if (!shownPeriods.includes(periodToShow) && shownPeriods.length < 5) {
      const timer = setTimeout(() => {
        setOpen(true);
        shownPeriods.push(periodToShow);
        localStorage.setItem(key, JSON.stringify(shownPeriods));
      }, 1000);

      return () => clearTimeout(timer);
    }
    // If already shown for this period or 5 times today, do nothing
  }, [time]);

  const handleAction = () => {
    generateDailySchedule();
    setOpen(false);
  };

  const message = checkInMessages[time];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl">{message.title}</DialogTitle>
          <DialogDescription className="text-lg pt-2">
            {message.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-6">
          {time !== "evening" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Energy Level</span>
                  <span className="font-semibold">{energyLevel}/10</span>
                </div>
                <Slider
                  value={[energyLevel]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={(val) => setEnergyLevel(val[0])}
                />
              </div>
            </div>
          )}
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Dismiss
          </Button>
          <Button onClick={handleAction}>
            {message.action}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckInModal;
