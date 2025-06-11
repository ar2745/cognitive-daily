import Layout from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useTasks, useUpdateTask } from "@/hooks/useTasks";
import { CheckCircle, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

const CompletedTasks = () => {
  // Fetch all tasks, filter for completed
  const { data: allTasks = [], isLoading } = useTasks();
  const updateTask = useUpdateTask();
  const tasks = useMemo(() => allTasks.filter(t => t.status === "completed"), [allTasks]);

  // Filtering/search state
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  // All tags for filter dropdown
  const allTags = useMemo(() => Array.from(new Set(tasks.flatMap(t => t.tags))), [tasks]);
  // All completion dates for filter dropdown
  const allDates = useMemo(() => Array.from(new Set(tasks.map(t => t.completed_at && t.completed_at.split("T")[0]).filter(Boolean))), [tasks]);

  // Filtering logic
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesTag = selectedTag ? task.tags.includes(selectedTag) : true;
      const matchesDate = selectedDate ? (task.completed_at && task.completed_at.startsWith(selectedDate)) : true;
      const matchesSearch = search ? task.title.toLowerCase().includes(search.toLowerCase()) : true;
      return matchesTag && matchesDate && matchesSearch;
    });
  }, [tasks, selectedTag, selectedDate, search]);

  // Stats
  const completedCount = tasks.length;
  // Completion streak: count max consecutive days with at least one completed task
  const days = Array.from(new Set(tasks.map(t => t.completed_at && t.completed_at.split("T")[0]).filter(Boolean))).sort();
  let streak = 0, maxStreak = 0, prevDay: string | null = null;
  for (const day of days) {
    if (!prevDay) { streak = 1; }
    else {
      const prev = new Date(prevDay);
      const curr = new Date(day);
      const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
      streak = diff === 1 ? streak + 1 : 1;
    }
    if (streak > maxStreak) maxStreak = streak;
    prevDay = day;
  }
  // Most productive day/time
  const dayCounts = tasks.reduce((acc, t) => {
    const d = t.completed_at && t.completed_at.split("T")[0];
    if (d) acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const mostProductiveDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  // Most common tag
  const tagCounts = tasks.flatMap(t => t.tags).reduce((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const mostCommonTag = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  return (
    <Layout>
      <div className="space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Completed Tasks</h1>
          <p className="text-muted-foreground">A summary of your completed tasks.</p>
        </div>
        {/* Stats */}
        <div className="flex flex-wrap gap-6 mb-4">
          <div>Total completed: <b>{completedCount}</b></div>
          <div>Longest streak: <b>{maxStreak}</b> day{maxStreak !== 1 ? "s" : ""}</div>
          {mostProductiveDay && <div>Most productive day: <b>{mostProductiveDay}</b></div>}
          {mostCommonTag && <div>Most common tag: <b>{mostCommonTag}</b></div>}
        </div>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-4 items-end">
          <div>
            <label className="block text-xs font-medium mb-1">Search</label>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} className="border rounded px-2 py-1 w-40" placeholder="Search title..." />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Tag</label>
            <select value={selectedTag} onChange={e => setSelectedTag(e.target.value)} className="border rounded px-2 py-1 w-32">
              <option value="">All</option>
              {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Date</label>
            <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="border rounded px-2 py-1 w-36">
              <option value="">All</option>
              {allDates.map(date => <option key={date} value={date}>{date}</option>)}
            </select>
          </div>
        </div>
        {/* Completed tasks list */}
        {isLoading ? (
          <div>Loading...</div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">No Completed Tasks</h3>
            <p className="text-muted-foreground mt-2">No tasks match your filters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTasks.map(task => (
              <Card key={task.id} className="border-l-4 border-l-green-500 opacity-80">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-medium line-through">{task.title}</h3>
                        <Badge variant={task.priority === "high" ? "destructive" : task.priority === "medium" ? "default" : "secondary"} className="text-xs">{task.priority}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {task.duration} minutes
                        {task.tags.length > 0 && ` · ${task.tags.join(", ")}`}
                      </p>
                      {task.completed_at && (
                        <div className="text-xs text-muted-foreground">Completed: {new Date(task.completed_at).toLocaleString()}</div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400"
                      title="Restore"
                      onClick={() => updateTask.mutate({ id: task.id, data: { status: "pending" } })}
                    >
                      <RotateCcw className="h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CompletedTasks;
