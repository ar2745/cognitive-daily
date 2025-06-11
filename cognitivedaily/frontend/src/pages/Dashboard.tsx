import CheckInModal from "@/components/CheckInModal";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useAuthContext } from "@/context/AuthContext";
import { useDailyPlans } from "@/hooks/useDailyPlans";
import { useTasks, useUpdateTask } from "@/hooks/useTasks";
import api from "@/services/api/axios";
import { bootstrapUser } from "@/services/api/users";
import { Calendar, CheckCircle, Plus } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { toast } = useToast();

  // React Query hooks for tasks and daily plan
  const { data: tasks = [], isLoading: tasksLoading, isError: tasksError } = useTasks();
  const { data: dailyPlan, isLoading: planLoading, isError: planError } = useDailyPlans();
  const updateTask = useUpdateTask();

  // Compute completed tasks from fetched tasks
  const completedTasks = tasks.filter((t: any) => t.status === "completed");

  useEffect(() => {
    const ensureBackendUser = async () => {
      if (!user) return;
      try {
        await api.get('/users/me');
        // User exists, do nothing
      } catch (err: any) {
        if (err.response?.status === 404) {
          // User not found, bootstrap
          try {
            await bootstrapUser({
              user_id: user.id,
              email: user.email,
              name: user.user_metadata?.name || user.email || "",
            });
          } catch (e: any) {
            toast({
              variant: "destructive",
              title: "Profile Error",
              description: e?.message || "Failed to create user profile. Please refresh."
            });
          }
        } else if (err.response?.status === 401) {
          toast({
            variant: "destructive",
            title: "Authentication Error",
            description: "You are not authenticated. Please log in again."
          });
        } else {
          toast({
            variant: "destructive",
            title: "Profile Error",
            description: err?.message || "Failed to fetch user profile."
          });
        }
      }
    };
    ensureBackendUser();
  }, [user, toast]);

  // Get time of day for check-in modal
  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 18) return "afternoon";
    return "evening";
  };

  // Generate daily schedule on first visit if none exists (optional, if AI plan gen is triggered here)
  // useEffect(() => {
  //   if (!dailyPlan && tasks.length > 0) {
  //     // Optionally trigger AI plan generation here
  //   }
  // }, [dailyPlan, tasks]);

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

  // Add a helper to get minutes from time string
  function getMinutesFromTime(timeStr?: string) {
    if (!timeStr) return Infinity; // No time = sort last
    // Accepts 'HH:MM:SS', 'HH:MM', or 'H:MM AM/PM'
    if (/am|pm/i.test(timeStr)) {
      // 12-hour format
      const [time, ampm] = timeStr.replace(/\s+/g, '').toUpperCase().split(/(AM|PM)/);
      let [hour, minute] = time.split(':').map(Number);
      if (ampm === 'PM' && hour !== 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;
      return hour * 60 + minute;
    }
    // 24-hour format
    const [hour, minute] = timeStr.split(':').map(Number);
    return hour * 60 + minute;
  }

  // Find the latest daily plan by plan_date
  const latestPlan = dailyPlan && dailyPlan.length > 0
    ? [...dailyPlan].sort((a, b) => new Date(b.plan_date).getTime() - new Date(a.plan_date).getTime())[0]
    : null;

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your tasks and daily schedule.
          </p>
        </div>

        {/* Loading/Error States */}
        {(tasksLoading || planLoading) && (
          <div className="text-center py-8">Loading...</div>
        )}
        {(tasksError || planError) && (
          <div className="text-center py-8 text-red-500">Error loading data. Please refresh.</div>
        )}

        {/* Main Content */}
        {!tasksLoading && !planLoading && !tasksError && !planError && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tasks.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {tasks.filter((t: any) => t.status !== "completed").length} remaining
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={() => navigate("/task-input")}
                  >
                    Add New Task
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{completedTasks.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {Math.round((completedTasks.length / (tasks.length || 1)) * 100)}% completion rate
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={() => navigate("/completed")}
                  >
                    View Completed
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Daily Schedule</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {latestPlan && latestPlan.schedule ? Object.keys(latestPlan.schedule).length : 0} Scheduled Slots
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {latestPlan ? `Plan for ${latestPlan.plan_date}` : "No plan found"}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-4"
                    onClick={() => navigate("/daily-plan")}
                  >
                    {latestPlan ? "View Schedule" : "Create Schedule"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="upcoming">
              <TabsList>
                <TabsTrigger value="upcoming">Upcoming Tasks</TabsTrigger>
                <TabsTrigger value="recent">Recently Completed</TabsTrigger>
              </TabsList>
              <TabsContent value="upcoming" className="space-y-4 mt-2">
                {tasks.filter((t: any) => t.status !== "completed" && t.status !== "missed").length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No upcoming tasks. Add some!</p>
                    <Button 
                      className="mt-4" 
                      onClick={() => navigate("/task-input")}
                    >
                      Add Task
                    </Button>
                  </div>
                ) : (
                  tasks
                    .filter((t: any) => t.status !== "completed" && t.status !== "missed")
                    .sort((a: any, b: any) => getMinutesFromTime(a.preferred_time) - getMinutesFromTime(b.preferred_time))
                    .slice(0, 5)
                    .map((task: any) => (
                    <div 
                      key={task.id}
                      className={`p-4 rounded-lg mb-2 ${
                        task.priority === "high" 
                          ? "priority-high" 
                          : task.priority === "medium" 
                            ? "priority-medium" 
                            : "priority-low"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{task.title}</h3>
                          <p className="text-sm">
                            {task.duration} min · {formatTime12Hour(task.preferred_time)} · {(task.tags || []).join(", ")}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateTask.mutate({ id: task.id, data: { status: "completed" } })}
                          disabled={updateTask.isPending}
                        >
                          Mark as Completed
                        </Button>
                      </div>
                    </div>
                  ))
                )}
                {tasks.filter((t: any) => t.status !== "completed" && t.status !== "missed").length > 5 && (
                  <Button 
                    variant="outline" 
                    onClick={() => navigate("/daily-plan")}
                    className="w-full mt-2"
                  >
                    View All Tasks
                  </Button>
                )}
              </TabsContent>
              <TabsContent value="recent" className="mt-2">
                {completedTasks.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No completed tasks yet.</p>
                  </div>
                ) : (
                  completedTasks.slice(0, 5).map((task: any) => (
                    <div 
                      key={task.id}
                      className="p-4 bg-secondary/50 rounded-lg mb-2 line-through opacity-70"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{task.title}</h3>
                          <p className="text-sm">
                            {task.duration} min · {formatTime12Hour(task.preferred_time)} · {(task.tags || []).join(", ")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
      <CheckInModal time={getTimeOfDay()} />
    </Layout>
  );
};

export default Dashboard;
