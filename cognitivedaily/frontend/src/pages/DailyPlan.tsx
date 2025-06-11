import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTaskContext } from "@/context/TaskContext";
import {
  useAIGenerateDailyPlan,
  useCreateDailyPlan,
  useDailyPlans,
  useDailyPlansRealtimeSync,
  usePatchDailyPlanEnergyLevel,
  useUpdateDailyPlan,
} from "@/hooks/useDailyPlans";
import { useBatchCreateTasks, useDeleteTask, useTasks, useTasksRealtimeSync, useUpdateTask } from "@/hooks/useTasks";
import { useUserProfile } from "@/hooks/useUserProfile";
import { AlertTriangle, Calendar, Check, Info, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const getToday = () => new Date().toISOString().split("T")[0];

// Add a helper to format time as 12-hour AM/PM
function formatTime12Hour(timeStr?: string) {
  if (!timeStr) return '';
  // Accepts 'HH:MM:SS' or 'HH:MM' or 'H:MM AM/PM'
  let hour: number, minute: number;
  let ampm = '';
  if (/am|pm/i.test(timeStr)) {
    // Already in 12-hour format
    return timeStr.replace(/^0/, '').toUpperCase();
  }
  const parts = timeStr.split(":");
  if (parts.length < 2) return timeStr;
  hour = parseInt(parts[0], 10);
  minute = parseInt(parts[1], 10);
  ampm = hour >= 12 ? 'PM' : 'AM';
  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;
  return `${hour}:${parts[1].padStart(2, '0')} ${ampm}`;
}

const DailyPlan = () => {
  useTasksRealtimeSync();
  useDailyPlansRealtimeSync();

  // Fetch all tasks
  const { data: tasks = [], isLoading: tasksLoading, error: tasksError } = useTasks();
  const { energyLevel, setEnergyLevel } = useTaskContext();
  const { data: userProfile, isLoading: userLoading } = useUserProfile();

  // Fetch all daily plans and select today's
  const { data: plans = [], isLoading: plansLoading, error: plansError, refetch } = useDailyPlans();
  const { mutate: createPlan, isPending: isCreating } = useCreateDailyPlan();
  const { mutate: updatePlan, isPending: isUpdating } = useUpdateDailyPlan();
  const aiGenerate = useAIGenerateDailyPlan();
  const [aiPlan, setAIPlan] = useState<any>(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const today = getToday();
  const todayPlan = useMemo(() => plans.find(p => p.plan_date === today), [plans, today]);

  // Tag filtering (local state)
  const availableTags = useMemo(() => Array.from(new Set(tasks.flatMap(t => t.tags))), [tasks]);
  const [filteredTags, setFilteredTags] = useState<string[]>([]);
  const toggleFilterTag = (tag: string) => {
    setFilteredTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };
  const resetFilterTags = () => setFilteredTags([]);

  // Timeline hours
  const hours = Array.from({ length: 14 }, (_, i) => i + 8); // 8 AM to 9 PM

  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  // Get tasks for a specific hour (from plan.schedule)
  const getTasksForHour = (hour: number) => {
    if (!todayPlan || !todayPlan.schedule) return [];
    const hourStr = hour.toString().padStart(2, "0") + ":00";
    const taskIds = todayPlan.schedule[hourStr] || [];
    return tasks.filter(t => taskIds.includes(t.id) && t.status !== "completed");
  };

  // Filtered tasks for timeline
  const filteredScheduleTasks = useMemo(() => {
    if (!todayPlan || !todayPlan.schedule) return [];
    let allTaskIds = Object.values(todayPlan.schedule).flat();
    let allTasks = tasks.filter(t => allTaskIds.includes(t.id));
    if (filteredTags.length === 0) return allTasks;
    return allTasks.filter(task => task.tags.some(tag => filteredTags.includes(tag)));
  }, [todayPlan, tasks, filteredTags]);

  // Completed tasks for today (in today's plan)
  const completedTasks = useMemo(() => {
    if (!todayPlan || !todayPlan.schedule) return [];
    let allTaskIds = Object.values(todayPlan.schedule).flat();
    return tasks.filter(t => allTaskIds.includes(t.id) && t.status === "completed");
  }, [todayPlan, tasks]);

  // Debounce and dirty flag for energy level changes
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastUpdatedByUser = useRef(false);

  const { mutate: patchEnergyLevel } = usePatchDailyPlanEnergyLevel();

  // Handler for energy level slider
  const handleEnergyLevelChange = (newLevel: number) => {
    setEnergyLevel(newLevel);
    if (todayPlan) {
      patchEnergyLevel({ id: todayPlan.id, energy_level: newLevel });
    }
  };

  const batchCreateTasks = useBatchCreateTasks();

  const [acceptingPlan, setAcceptingPlan] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState<string | null>(null);
  const [rescheduleTime, setRescheduleTime] = useState<string>("");
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleSuccess, setRescheduleSuccess] = useState(false);

  const handleAIGenerate = () => {
    aiGenerate.mutate(
      {
        plan_date: today,
        energy_level: energyLevel,
        available_hours: userProfile?.default_working_hours ?? 8,
        // Add other params as needed
      },
      {
        onSuccess: (data) => {
          setAIPlan(data);
          setShowAIModal(true);
        },
      }
    );
  };

  const handleAcceptAIPlan = async () => {
    if (todayPlan && aiPlan) {
      setAcceptingPlan(true);
      // 1. Parse the AI plan schedule into a list of tasks to create
      const tasksToCreate: any[] = [];
      Object.entries(aiPlan.schedule || {}).forEach(([time, value]) => {
        if (Array.isArray(value)) {
          value.forEach((title) => {
            tasksToCreate.push({ title, preferred_time: time, status: "pending", duration: 30, priority: "medium", tags: [] });
          });
        } else if (typeof value === "string") {
          tasksToCreate.push({ title: value, preferred_time: time, status: "pending", duration: 30, priority: "medium", tags: [] });
        }
      });
      // 2. Call batch create API
      try {
        const createdTasks = await batchCreateTasks.mutateAsync(tasksToCreate);
        // 3. Build new schedule: { time: [taskId, ...] }
        const newSchedule: Record<string, string[]> = {};
        createdTasks.forEach(task => {
          const time = task.preferred_time?.slice(0, 5) || "unscheduled";
          if (!newSchedule[time]) newSchedule[time] = [];
          newSchedule[time].push(task.id);
        });
        // 4. Update daily plan with new schedule
        await updatePlan(
          { id: todayPlan.id, data: { schedule: newSchedule } },
          {
            onSuccess: () => {
              // Immediately update plan with energy level and available hours (like Generate button)
              updatePlan(
                {
                  id: todayPlan.id,
                  data: {
                    energy_level: energyLevel,
                    available_hours: userProfile?.default_working_hours ?? 8,
                  },
                },
                { onSuccess: () => { refetch(); } }
              );
            }
          }
        );
        // 5. Mark old tasks as completed
        const newTaskIds = new Set(createdTasks.map(t => t.id));
        const oldTasks = tasks.filter(
          t => !newTaskIds.has(t.id) && t.status !== "completed"
        );
        await Promise.all(
          oldTasks.map(t => updateTask.mutateAsync({ id: t.id, data: { status: "completed" } }))
        );
      } catch (error) {
        // Optionally show error toast
        console.error("Batch create tasks failed", error);
      } finally {
        setAcceptingPlan(false);
        setAIPlan(null);
        setShowAIModal(false);
      }
    }
  };

  // Add this function to handle manual plan creation
  const handleGenerate = () => {
    if (todayPlan) {
      // Update the existing plan (refresh)
      updatePlan(
        {
          id: todayPlan.id,
          data: {
            energy_level: energyLevel,
            available_hours: userProfile?.default_working_hours ?? 8,
            // Optionally, you could reset the schedule or keep as is
          },
        },
        { onSuccess: () => refetch() }
      );
    } else {
      // Create a new plan
      createPlan(
        {
          plan_date: today,
          energy_level: energyLevel,
          available_hours: userProfile?.default_working_hours ?? 8,
          schedule: {},
        },
        { onSuccess: () => refetch() }
      );
    }
  };

  // Handler to remove a suggested task from the AI plan
  const handleRemoveSuggestedTask = (time: string, taskToRemove: string) => {
    setAIPlan((prev: any) => {
      if (!prev || !prev.schedule) return prev;
      const updated = { ...prev, schedule: { ...prev.schedule } };
      const tasks = Array.isArray(updated.schedule[time]) ? [...updated.schedule[time]] : [updated.schedule[time]];
      const filtered = tasks.filter((t: string) => t !== taskToRemove);
      if (filtered.length === 0) {
        delete updated.schedule[time];
      } else {
        updated.schedule[time] = filtered.length === 1 ? filtered[0] : filtered;
      }
      return updated;
    });
  };

  // Helper to remove a task title from all time slots in the schedule
  const removeTaskTitleFromSchedule = (schedule: Record<string, any>, taskTitle: string) => {
    const updatedSchedule: Record<string, any> = {};
    for (const [time, tasks] of Object.entries(schedule)) {
      const taskList = Array.isArray(tasks) ? tasks : [tasks];
      const filtered = taskList.filter((t) => t !== taskTitle);
      if (filtered.length > 0) {
        updatedSchedule[time] = filtered.length === 1 ? filtered[0] : filtered;
      }
    }
    return updatedSchedule;
  };

  // Helper to determine if a task is missed (for UI highlighting)
  const isMissedTask = (hourStr: string, task: any) => {
    if (task.status === "missed") return true;
    if (["completed", "cancelled"].includes(task.status)) return false;
    const now = new Date();
    const [h, m] = hourStr.split(":").map(Number);
    const taskTime = new Date(now);
    taskTime.setHours(h, m, 0, 0);
    return taskTime < now;
  };

  // Helper: is this task for today?
  const isTaskForToday = (task: any) => {
    if (!task.preferred_time) return true; // unscheduled
    // If task has a plan_date, check it matches today
    if (task.plan_date && task.plan_date !== today) return false;
    // If task has a created_at or preferred_time, check date
    // (Assume all tasks in todayPlan.schedule are for today unless otherwise specified)
    return true;
  };

  // Missed tasks: all with status === "missed"
  const missedTasks = useMemo(() => tasks.filter(t => t.status === "missed"), [tasks]);

  // Remove missed tasks from daily plan schedule automatically
  useEffect(() => {
    if (!todayPlan || !todayPlan.schedule) return;
    let updatedSchedule = { ...todayPlan.schedule };
    let changed = false;
    missedTasks.forEach(task => {
      const before = JSON.stringify(updatedSchedule);
      updatedSchedule = removeTaskTitleFromSchedule(updatedSchedule, task.title);
      if (JSON.stringify(updatedSchedule) !== before) changed = true;
    });
    if (changed) {
      updatePlan({ id: todayPlan.id, data: { schedule: updatedSchedule } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missedTasks, todayPlan && todayPlan.schedule]);

  const [showMissedTasksModal, setShowMissedTasksModal] = useState(false);

  function renderTimeline(todayPlan, tasks, updateTask, updatePlan, removeTaskTitleFromSchedule, isTaskForToday) {
    if (!todayPlan || !todayPlan.schedule || Object.keys(todayPlan.schedule).length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">No tasks</div>
      );
    }
    // Get all unique times and sort them chronologically
    const times = Object.keys(todayPlan.schedule).sort((a, b) => a.localeCompare(b));
    return times.map(time => {
      const taskKeys = todayPlan.schedule[time] || [];
      const tasksAtTime = tasks.filter(t => {
        const keys = Array.isArray(taskKeys) ? taskKeys : [taskKeys];
        return (
          keys.includes(t.id) || keys.includes(t.title)
        ) && t.status !== "completed" && t.status !== "missed" && isTaskForToday(t);
      });
      if (tasksAtTime.length === 0) return null;
      // Format time as h:mm AM/PM
      const [h, m] = time.split(":");
      let hour = parseInt(h, 10);
      const minute = m;
      const amPm = hour >= 12 ? "PM" : "AM";
      if (hour === 0) hour = 12;
      else if (hour > 12) hour -= 12;
      const timeLabel = `${hour}:${minute} ${amPm}`;
      return (
        <div
          key={time}
          className="grid grid-cols-[80px_1fr] gap-2 items-start sm:flex sm:items-start sm:gap-4 sm:mb-4"
        >
          {/* Time column: only visible on mobile, right-aligned on desktop */}
          <div className="text-left font-medium pt-3 sm:pt-0 sm:text-right sm:w-24 sm:shrink-0 sm:flex sm:items-center">
            <span className="sm:block sm:text-right sm:font-medium sm:text-base">
              {timeLabel}
            </span>
          </div>
          {/* Task card */}
          <div className="w-full">
            {tasksAtTime.map(task => (
              <Card
                key={task.id}
                className={`mb-2 border-l-4 ${
                  task.priority === "high"
                    ? "border-l-priority-high"
                    : task.priority === "medium"
                    ? "border-l-priority-medium"
                    : "border-l-priority-low"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium">{task.title}</h3>
                        <Badge
                          variant={
                            task.priority === "high"
                              ? "destructive"
                              : task.priority === "medium"
                              ? "default"
                              : "secondary"
                          }
                          className="text-xs"
                        >
                          {task.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {task.duration} minutes
                        {task.tags.length > 0 && ` · ${task.tags.join(", ")}`}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        await updateTask.mutateAsync({ id: task.id, data: { status: "completed" } });
                        if (todayPlan && todayPlan.schedule) {
                          const updatedSchedule = removeTaskTitleFromSchedule(todayPlan.schedule, task.title);
                          updatePlan({ id: todayPlan.id, data: { schedule: updatedSchedule } });
                        }
                      }}
                      disabled={updateTask.isPending}
                    >
                      Mark as Completed
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      );
    });
  }

  // Loading and error states
  if (tasksLoading || plansLoading) return <Layout><div>Loading...</div></Layout>;
  if (tasksError) return <Layout><div>Error loading tasks: {tasksError.message}</div></Layout>;
  if (plansError) return <Layout><div>Error loading plans: {plansError.message}</div></Layout>;

  return (
    <Layout handleEnergyLevelChange={handleEnergyLevelChange}>
      {/* Missed Tasks Button for Mobile */}
      <div className="block sm:hidden mb-4">
        <Button
          variant="destructive"
          className="flex items-center gap-2 w-full justify-center"
          onClick={() => setShowMissedTasksModal(true)}
          disabled={missedTasks.length === 0}
        >
          <AlertTriangle className="w-5 h-5" />
          Missed Tasks
          {missedTasks.length > 0 && (
            <span className="ml-2 bg-white text-red-600 text-xs font-bold rounded-full px-2 py-0.5">
              {missedTasks.length}
            </span>
          )}
        </Button>
      </div>
      {/* Main timeline and content, center on mobile */}
      <div className="space-y-8 animate-fade-in md:mr-96">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Daily Plan</h1>
            <p className="text-muted-foreground">
              Your AI-generated schedule for today.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleGenerate}
              variant="default"
              disabled={isCreating || isUpdating || userLoading}
            >
              Generate
            </Button>
            <Button
              onClick={handleAIGenerate}
              variant="outline"
              disabled={aiGenerate.isPending || isUpdating || isCreating || userLoading}
            >
              <Sparkles className="mr-2 h-4 w-4" /> AI Generate
            </Button>
          </div>
        </div>

        {/* Tag filters */}
        {availableTags.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium">Filter by Tags:</h2>
              {filteredTags.length > 0 && (
                <Button variant="ghost" size="sm" onClick={resetFilterTags}>
                  Clear Filters
                </Button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {availableTags.map(tag => (
                <Badge
                  key={tag}
                  variant={filteredTags.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleFilterTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {tasks.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No Tasks Added Yet</h3>
            <p className="text-muted-foreground mt-2">
              Add tasks to generate your daily schedule.
            </p>
          </div>
        ) : !todayPlan ? (
          <div className="text-center py-12">
            {/* The daily plan is now updated automatically on page load. Regenerate button removed. */}
          </div>
        ) : (
          <>
            {/* Timeline view */}
            <div className="space-y-4">
              {renderTimeline(todayPlan, tasks, updateTask, updatePlan, removeTaskTitleFromSchedule, isTaskForToday)}
            </div>
            {/* Completed Tasks Section */}
            {completedTasks.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold mb-2">Completed Tasks</h2>
                <div className="space-y-2">
                  {completedTasks.map(task => (
                    <Card
                      key={task.id}
                      className="bg-secondary/50 rounded-lg mb-2 line-through opacity-70"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium">{task.title}</h3>
                              <Badge
                                variant={
                                  task.priority === "high"
                                    ? "destructive"
                                    : task.priority === "medium"
                                    ? "default"
                                    : "secondary"
                                }
                                className="text-xs"
                              >
                                {task.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {task.duration} minutes
                              {task.tags.length > 0 && ` · ${task.tags.join(", ")}`}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
        {showAIModal && aiPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-background p-6 rounded shadow-lg max-w-lg w-full">
              <h2 className="text-xl font-bold mb-4">AI-Generated Plan</h2>
              {/* AI Plan Notes Section */}
              {aiPlan?.notes && (
                <div className="mb-4 flex items-start gap-3 bg-muted dark:bg-gray-800 border-l-4 border-primary rounded-lg p-4 shadow-sm">
                  <Info className="w-6 h-6 text-primary mt-0.5 shrink-0" />
                  <div className="text-gray-800 dark:text-gray-100 text-base leading-relaxed">
                    <span className="font-bold text-lg mr-2">Notes:</span>
                    <span className="align-middle">{aiPlan.notes}</span>
                  </div>
                </div>
              )}
              {/* Modern Timeline for AI Plan */}
              <div className="max-h-96 overflow-y-auto mb-4 px-2">
                <div className="relative border-l-2 border-primary/30 pl-6">
                  {Object.entries(aiPlan.schedule || {}).map(([time, tasks], idx, arr) => {
                    const taskList = Array.isArray(tasks) ? tasks as string[] : [tasks as string];
                    return (
                      <div key={time} className="mb-6 last:mb-0 flex items-start group">
                        {/* Timeline Dot */}
                        <span className="absolute -left-3 top-2 w-4 h-4 rounded-full bg-primary shadow-lg border-2 border-background group-hover:scale-110 transition-transform" />
                        {/* Time Label */}
                        <div className="min-w-[60px] text-primary font-bold text-lg pt-0.5 select-none">
                          {time}
                        </div>
                        {/* Task(s) */}
                        <div className="flex-1 space-y-1 ml-4">
                          {taskList.map((task, tIdx) => (
                            <div
                              key={tIdx}
                              className="bg-background/80 border border-primary/10 rounded-lg px-4 py-2 shadow-sm flex items-center gap-2 hover:bg-primary/10 transition-colors group/task"
                            >
                              <svg className="w-4 h-4 text-primary shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l2 2" /></svg>
                              <span className="text-base text-foreground font-medium">{task}</span>
                              <button
                                type="button"
                                className="ml-auto p-1 rounded hover:bg-destructive/10 transition-colors"
                                title="Remove suggestion"
                                onClick={() => handleRemoveSuggestedTask(time, task)}
                              >
                                <Trash2 className="w-4 h-4 text-destructive opacity-70 group-hover/task:opacity-100 transition-opacity" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button onClick={handleAcceptAIPlan} disabled={isUpdating || acceptingPlan}>Accept Plan</Button>
                <Button variant="outline" onClick={() => setShowAIModal(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Missed Tasks Modal for Mobile */}
      {showMissedTasksModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 sm:hidden">
          <div className="bg-white dark:bg-background p-4 rounded shadow-lg max-w-sm w-full relative">
            <button
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
              onClick={() => setShowMissedTasksModal(false)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span className="text-lg font-semibold text-red-700">Missed Tasks</span>
              {missedTasks.length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
                  {missedTasks.length}
                </span>
              )}
            </div>
            {missedTasks.length === 0 ? (
              <div className="text-muted-foreground text-center mt-8">No missed tasks 🎉</div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {missedTasks.map(task => (
                  <Card key={task.id} className="border-l-4 border-red-500 bg-red-50">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-red-700">{task.title}</h3>
                          <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-semibold">
                            <AlertTriangle className="w-4 h-4 mr-1 text-red-500" /> Missed
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {task.duration} minutes
                          {task.tags.length > 0 && ` · ${task.tags.join(", ")}`}
                          {task.preferred_time && (
                            <span className="ml-2 text-xs text-red-600">Scheduled: {formatTime12Hour(task.preferred_time)}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex flex-col space-y-3 mt-2">
                        <Button
                          size="default"
                          variant="outline"
                          className="flex items-center gap-2 px-3 py-2"
                          title="Reschedule"
                          onClick={() => {
                            setShowMissedTasksModal(false);
                            setShowRescheduleModal(task.id);
                          }}
                        >
                          <Calendar className="w-5 h-5" /> <span>Reschedule</span>
                        </Button>
                        <Button size="default" variant="destructive" className="flex items-center gap-2 px-3 py-2" title="Delete" onClick={async () => {
                          await deleteTask.mutateAsync(task.id);
                          if (todayPlan && todayPlan.schedule) {
                            const updatedSchedule = removeTaskTitleFromSchedule(todayPlan.schedule, task.title);
                            updatePlan({ id: todayPlan.id, data: { schedule: updatedSchedule } });
                          }
                        }} disabled={deleteTask.isPending}>
                          <Trash2 className="w-5 h-5" /> <span>Delete</span>
                        </Button>
                        <Button size="default" variant="default" className="flex items-center gap-2 px-3 py-2 text-green-700" title="Mark as Completed" onClick={async () => {
                          await updateTask.mutateAsync({ id: task.id, data: { status: "completed" } });
                          if (todayPlan && todayPlan.schedule) {
                            const updatedSchedule = removeTaskTitleFromSchedule(todayPlan.schedule, task.title);
                            updatePlan({ id: todayPlan.id, data: { schedule: updatedSchedule } });
                          }
                        }} disabled={updateTask.isPending}>
                          <Check className="w-5 h-5 text-green-600" /> <span>Complete</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Fixed Missed Tasks Sidebar (desktop only) */}
      <aside className="hidden sm:block fixed top-20 right-0 w-96 h-[calc(100vh-5rem)] bg-white dark:bg-background shadow-lg border-l z-40 overflow-y-auto p-4">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <span className="text-lg font-semibold text-red-700">Missed Tasks</span>
          {missedTasks.length > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5">
              {missedTasks.length}
            </span>
          )}
        </div>
        {missedTasks.length === 0 ? (
          <div className="text-muted-foreground text-center mt-8">No missed tasks 🎉</div>
        ) : (
          <div className="space-y-2">
            {missedTasks.map(task => (
              <Card key={task.id} className="border-l-4 border-red-500 bg-red-50">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-red-700">{task.title}</h3>
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-semibold">
                        <AlertTriangle className="w-4 h-4 mr-1 text-red-500" /> Missed
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {task.duration} minutes
                      {task.tags.length > 0 && ` · ${task.tags.join(", ")}`}
                      {task.preferred_time && (
                        <span className="ml-2 text-xs text-red-600">Scheduled: {formatTime12Hour(task.preferred_time)}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col space-y-3 mt-2">
                    <Button size="default" variant="outline" className="flex items-center gap-2 px-3 py-2" title="Reschedule" onClick={() => setShowRescheduleModal(task.id)}>
                      <Calendar className="w-5 h-5" /> <span>Reschedule</span>
                    </Button>
                    <Button size="default" variant="destructive" className="flex items-center gap-2 px-3 py-2" title="Delete" onClick={async () => {
                      await deleteTask.mutateAsync(task.id);
                      if (todayPlan && todayPlan.schedule) {
                        const updatedSchedule = removeTaskTitleFromSchedule(todayPlan.schedule, task.title);
                        updatePlan({ id: todayPlan.id, data: { schedule: updatedSchedule } });
                      }
                    }} disabled={deleteTask.isPending}>
                      <Trash2 className="w-5 h-5" /> <span>Delete</span>
                    </Button>
                    <Button size="default" variant="default" className="flex items-center gap-2 px-3 py-2 text-green-700" title="Mark as Completed" onClick={async () => {
                      await updateTask.mutateAsync({ id: task.id, data: { status: "completed" } });
                      if (todayPlan && todayPlan.schedule) {
                        const updatedSchedule = removeTaskTitleFromSchedule(todayPlan.schedule, task.title);
                        updatePlan({ id: todayPlan.id, data: { schedule: updatedSchedule } });
                      }
                    }} disabled={updateTask.isPending}>
                      <Check className="w-5 h-5 text-green-600" /> <span>Complete</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </aside>
        {showRescheduleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-background p-6 rounded shadow-lg max-w-sm w-full">
              <h3 className="text-lg font-bold mb-4">Reschedule Task</h3>
              {(() => {
                const task = missedTasks.find(t => t.id === showRescheduleModal);
                if (!task) return null;
                return (
                  <form
                    onSubmit={async e => {
                      e.preventDefault();
                      setRescheduleLoading(true);
                      await updateTask.mutateAsync({
                        id: task.id,
                        data: { preferred_time: rescheduleTime, status: "pending" },
                      });
                      setRescheduleLoading(false);
                      setShowRescheduleModal(null);
                      setRescheduleTime("");
                      setRescheduleSuccess(true);
                      setShowMissedTasksModal(true);
                      setTimeout(() => setRescheduleSuccess(false), 2000);
                      handleGenerate();
                    }}
                  >
                    <div className="mb-4">
                      <div className="font-semibold mb-2">{task.title}</div>
                      <label className="block mb-1 text-sm font-medium">New Time</label>
                      <input
                        type="time"
                        className="border rounded px-3 py-2 w-full"
                        value={rescheduleTime}
                        onChange={e => setRescheduleTime(e.target.value)}
                        required
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => { setShowRescheduleModal(null); setRescheduleTime(""); setShowMissedTasksModal(true); }}>
                        Cancel
                      </Button>
                      <Button type="submit" disabled={rescheduleLoading || !rescheduleTime}>
                        {rescheduleLoading ? "Rescheduling..." : "Reschedule"}
                      </Button>
                    </div>
                  </form>
                );
              })()}
            </div>
          </div>
        )}
        {rescheduleSuccess && (
          <div className="fixed top-8 right-8 z-50 bg-green-600 text-white px-4 py-2 rounded shadow-lg">
            Task rescheduled!
          </div>
        )}
    </Layout>
  );
};

export default DailyPlan;
