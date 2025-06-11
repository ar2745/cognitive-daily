import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { useCreateDailyPlan, useDailyPlans, useUpdateDailyPlan } from "@/hooks/useDailyPlans";
import { useCreateTask } from '@/hooks/useTasks';
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

// Schema for task form validation
const time12HourRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;
const formSchema = z.object({
  title: z.string().min(2, {
    message: "Title must be at least 2 characters.",
  }),
  duration: z.number().min(5, {
    message: "Duration must be at least 5 minutes.",
  }).max(480, {
    message: "Duration cannot exceed 8 hours (480 minutes)."
  }),
  priority: z.enum(["low", "medium", "high"]),
  preferred_time: z.string().regex(time12HourRegex, "Enter a valid time (e.g., 2:15 PM)"),
  tags: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

const TaskInput = () => {
  const { toast } = useToast();
  const [duration, setDuration] = useState(30);  // Default 30 minutes
  const createTask = useCreateTask();
  const { data: plans = [] } = useDailyPlans();
  const { mutate: createPlan } = useCreateDailyPlan();
  const { mutate: updatePlan } = useUpdateDailyPlan();
  const today = new Date().toISOString().split("T")[0];
  const todayPlan = plans.find(p => p.plan_date === today);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      duration: 30,
      priority: "medium",
      preferred_time: "",
      tags: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    const tagsList = values.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag !== "");

    createTask.mutate(
      {
        title: values.title,
        duration: values.duration,
        priority: values.priority as 'low' | 'medium' | 'high',
        tags: tagsList,
        preferred_time: values.preferred_time,
        status: 'pending',
      },
      {
        onSuccess: () => {
          toast({
            title: "Task added",
            description: "Your task has been successfully added.",
          });
          form.reset({
            title: "",
            duration: 30,
            priority: "medium",
            preferred_time: "",
            tags: "",
          });
          setDuration(30);
          // Trigger handleGenerate logic to refresh daily plan
          if (todayPlan) {
            updatePlan({
              id: todayPlan.id,
              data: {
                energy_level: todayPlan.energy_level,
                available_hours: todayPlan.available_hours,
              },
            });
          } else {
            createPlan({
              plan_date: today,
              energy_level: 5,
              available_hours: 8,
              schedule: {},
            });
          }
        },
        onError: (error: any) => {
          toast({
            title: "Error",
            description: error?.message || 'Failed to add task.',
            variant: 'destructive',
          });
        },
      }
    );
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Add New Task</h1>
          <p className="text-muted-foreground">
            Enter the details of your task to add it to your schedule.
          </p>
        </div>

        <div className="p-6 border rounded-lg shadow-sm bg-card">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Write project proposal" {...field} />
                    </FormControl>
                    <FormDescription>
                      Give your task a clear, descriptive title.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <div className="space-y-2">
                      <Slider
                        min={5}
                        max={480}
                        step={5}
                        value={[duration]}
                        onValueChange={(values) => {
                          setDuration(values[0]);
                          field.onChange(values[0]);
                        }}
                      />
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">5 min</span>
                        <span className="font-medium">{duration} minutes</span>
                        <span className="text-sm text-muted-foreground">8 hrs</span>
                      </div>
                    </div>
                    <FormDescription>
                      Estimate how long this task will take.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Set the importance level of your task.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="preferred_time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Time</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., 2:15 PM"
                          autoComplete="off"
                        />
                      </FormControl>
                      <FormDescription>
                        Enter the exact time you want to start this task (e.g., 2:15 PM).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tags</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., deep work, admin, creative (comma-separated)" {...field} />
                    </FormControl>
                    <FormDescription>
                      Add comma-separated tags to categorize your task.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end">
                <Button type="submit" size="lg" disabled={createTask.status === 'pending'}>
                  {createTask.status === 'pending' ? 'Adding...' : 'Add Task'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </Layout>
  );
};

export default TaskInput;
