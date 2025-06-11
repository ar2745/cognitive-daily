import { useDailyPlans, usePatchDailyPlanEnergyLevel } from "@/hooks/useDailyPlans";
import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

// Types
export type Priority = 'low' | 'medium' | 'high';
export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'any';

export interface Task {
  id: string;
  title: string;
  duration: number; // in minutes
  priority: Priority;
  preferred_time?: string; // 12-hour time string, e.g., "2:15 PM"
  tags: string[];
  completed: boolean;
  scheduledTime?: string; // HH:MM format
}

export interface DailySchedule {
  tasks: Task[];
  date: string;
}

interface TaskContextType {
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'completed'>) => void;
  updateTask: (task: Task) => void;
  deleteTask: (id: string) => void;
  toggleTaskCompletion: (id: string) => void;
  completedTasks: Task[];
  dailySchedule: DailySchedule | null;
  generateDailySchedule: () => void;
  energyLevel: number;
  setEnergyLevel: (level: number) => void;
  filteredTags: string[];
  toggleFilterTag: (tag: string) => void;
  resetFilterTags: () => void;
  availableTags: string[];
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

interface TaskProviderProps {
  children: ReactNode;
}

export const TaskProvider = ({ children }: TaskProviderProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [dailySchedule, setDailySchedule] = useState<DailySchedule | null>(null);
  const [filteredTags, setFilteredTags] = useState<string[]>([]);

  // Get today's plan
  const { data: plans = [] } = useDailyPlans();
  const today = new Date().toISOString().split("T")[0];
  const todayPlan = useMemo(() => plans.find(p => p.plan_date === today), [plans, today]);
  const { mutate: patchEnergyLevel } = usePatchDailyPlanEnergyLevel();

  // Energy level: persistent, 1-10 scale
  const getInitialEnergyLevel = () => {
    const stored = localStorage.getItem('energyLevel');
    const parsed = stored ? parseInt(stored, 10) : NaN;
    return !isNaN(parsed) && parsed >= 1 && parsed <= 10 ? parsed : 5;
  };
  const [energyLevel, _setEnergyLevel] = useState<number>(getInitialEnergyLevel());
  const setEnergyLevel = (level: number) => {
    _setEnergyLevel(level);
    localStorage.setItem('energyLevel', String(level));
    if (todayPlan) {
      patchEnergyLevel({ id: todayPlan.id, energy_level: level });
    }
  };

  // Extract all available tags from tasks
  const availableTags = Array.from(
    new Set(tasks.flatMap(task => task.tags))
  );

  // Get completed tasks
  const completedTasks = tasks.filter(task => task.completed);

  // Add a new task
  const addTask = (task: Omit<Task, 'id' | 'completed'>) => {
    const newTask: Task = {
      ...task,
      id: Date.now().toString(),
      completed: false
    };
    setTasks([...tasks, newTask]);
  };

  // Update a task
  const updateTask = (updatedTask: Task) => {
    setTasks(tasks.map(task => 
      task.id === updatedTask.id ? updatedTask : task
    ));
  };

  // Delete a task
  const deleteTask = (id: string) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  // Toggle task completion
  const toggleTaskCompletion = (id: string) => {
    setTasks(tasks.map(task => 
      task.id === id 
        ? { ...task, completed: !task.completed } 
        : task
    ));
  };

  // Filter tasks by tag
  const toggleFilterTag = (tag: string) => {
    setFilteredTags(prev => 
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  // Reset tag filters
  const resetFilterTags = () => {
    setFilteredTags([]);
  };

  // Generate a simple AI schedule based on tasks, energy level, and preferences
  const generateDailySchedule = () => {
    // Make a copy of incomplete tasks to schedule
    const tasksToSchedule = tasks
      .filter(task => !task.completed)
      .sort((a, b) => {
        // Prioritize high priority tasks
        if (a.priority !== b.priority) {
          const priorityValues = { high: 3, medium: 2, low: 1 };
          return priorityValues[b.priority] - priorityValues[a.priority];
        }
        
        // Then sort by duration (shorter tasks first if energy is low)
        if (energyLevel <= 2) {
          return a.duration - b.duration;
        } 
        
        // Longer tasks first if energy is high
        if (energyLevel >= 4) {
          return b.duration - a.duration;
        }
        
        return 0;
      });

    // Simple scheduling algorithm
    let scheduledTasks: Task[] = [];
    const today = new Date();
    let currentHour = 9; // Start at 9 AM

    // Morning tasks (9 AM - 12 PM)
    const morningTasks = tasksToSchedule.filter(t => 
      t.preferred_time && t.preferred_time.startsWith('2')
    );
    
    // Afternoon tasks (1 PM - 5 PM)
    const afternoonTasks = tasksToSchedule.filter(t => 
      t.preferred_time && t.preferred_time.startsWith('3')
    );
    
    // Evening tasks (6 PM - 9 PM)
    const eveningTasks = tasksToSchedule.filter(t => 
      t.preferred_time && t.preferred_time.startsWith('4')
    );

    // Schedule morning tasks
    for (const task of morningTasks) {
      if (currentHour >= 12) break;
      
      const durationHours = task.duration / 60;
      if (currentHour + durationHours <= 12) {
        const scheduledTime = `${currentHour.toString().padStart(2, '0')}:00`;
        scheduledTasks.push({
          ...task,
          scheduledTime
        });
        currentHour += durationHours;
      }
    }

    // Lunch break
    currentHour = 13; // 1 PM

    // Schedule afternoon tasks
    for (const task of afternoonTasks) {
      if (currentHour >= 17) break;
      
      const durationHours = task.duration / 60;
      if (currentHour + durationHours <= 17) {
        const scheduledTime = `${currentHour.toString().padStart(2, '0')}:00`;
        scheduledTasks.push({
          ...task,
          scheduledTime
        });
        currentHour += durationHours;
      }
    }

    // Break
    currentHour = 18; // 6 PM

    // Schedule evening tasks
    for (const task of eveningTasks) {
      if (currentHour >= 21) break;
      
      const durationHours = task.duration / 60;
      if (currentHour + durationHours <= 21) {
        const scheduledTime = `${currentHour.toString().padStart(2, '0')}:00`;
        scheduledTasks.push({
          ...task,
          scheduledTime
        });
        currentHour += durationHours;
      }
    }

    // Create schedule
    const newSchedule: DailySchedule = {
      tasks: scheduledTasks,
      date: today.toISOString().split('T')[0]
    };

    setDailySchedule(newSchedule);
  };

  const value = {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    completedTasks,
    dailySchedule,
    generateDailySchedule,
    energyLevel,
    setEnergyLevel,
    filteredTags,
    toggleFilterTag,
    resetFilterTags,
    availableTags,
  };

  return (
    <TaskContext.Provider value={value}>
      {children}
    </TaskContext.Provider>
  );
};

export const useTaskContext = () => {
  const context = useContext(TaskContext);
  if (context === undefined) {
    throw new Error('useTaskContext must be used within a TaskProvider');
  }
  return context;
};
