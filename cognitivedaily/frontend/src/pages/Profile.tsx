import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/use-toast";
import { useAuthContext } from "@/context/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/lib/supabase";
import { updateCurrentUser } from "@/services/api/users";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Add a list of common IANA timezones for the dropdown
const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
];

// Form validation schemas
const profileFormSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  default_working_hours: z.coerce.number().int().min(1, "Must be at least 1 hour."),
  preferences: z.string().optional(), // comma-separated for now
  timezone: z.string().min(1, "Timezone is required."),
});

const passwordFormSchema = z.object({
  currentPassword: z.string().min(6, "Password must be at least 6 characters."),
  newPassword: z.string().min(6, "Password must be at least 6 characters."),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters."),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export default function Profile() {
  const { user, updateProfile, updatePassword } = useAuthContext();
  const { toast } = useToast();
  const { data: userProfile, isLoading: userProfileLoading, error: userProfileError, refetch: refetchUserProfile } = useUserProfile();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [preferenceInput, setPreferenceInput] = useState("");
  const [preferenceTags, setPreferenceTags] = useState<string[]>([]);

  useEffect(() => {
    if (userProfile && userProfile.preferences && Array.isArray(userProfile.preferences.tags)) {
      setPreferenceTags(userProfile.preferences.tags);
    }
  }, [userProfile]);

  // Profile form
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      full_name: userProfile?.name || user?.user_metadata?.full_name || "",
      email: user?.email || "",
      default_working_hours: userProfile?.default_working_hours ?? (user as any)?.default_working_hours ?? 8,
      preferences: userProfile?.preferences && Array.isArray(userProfile.preferences.tags) ? userProfile.preferences.tags.join(", ") : "",
      timezone: userProfile?.timezone || "UTC",
    },
  });

  // Ensure form values always reflect latest userProfile (including timezone)
  useEffect(() => {
    if (userProfile) {
      profileForm.reset({
        full_name: userProfile.name || user?.user_metadata?.full_name || "",
        email: user?.email || "",
        default_working_hours: userProfile.default_working_hours ?? (user as any)?.default_working_hours ?? 8,
        preferences: userProfile.preferences && Array.isArray(userProfile.preferences.tags) ? userProfile.preferences.tags.join(", ") : "",
        timezone: userProfile.timezone || "UTC",
      });
    }
  }, [userProfile, user, profileForm]);

  // Password form
  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onProfileSubmit = async (data: ProfileFormValues) => {
    setIsUpdating(true);
    try {
      // 4. Update profile info as before
      await updateProfile({
        full_name: data.full_name,
        email: data.email,
      });
      // Parse preferences as comma-separated string to array or object
      let preferences: Record<string, any> = {};
      if (preferenceTags.length > 0) {
        preferences = { tags: preferenceTags };
      }
      await updateCurrentUser({
        name: data.full_name,
        default_working_hours: data.default_working_hours,
        preferences,
        timezone: data.timezone,
      });
      await refetchUserProfile();
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    setIsChangingPassword(true);
    try {
      await updatePassword(data.currentPassword, data.newPassword);
      toast({
        title: "Password updated",
        description: "Your password has been changed successfully.",
      });
      passwordForm.reset();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Avatar preview logic
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAvatarPreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setAvatarFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Avatar upload handler
  const handleSaveAvatar = async () => {
    if (!user) return;
    setIsUploadingAvatar(true);
    let avatarUrl = user.user_metadata?.avatar_url || null;
    try {
      // Upload new avatar
      if (avatarFile && user.id) {
        const fileExt = avatarFile.name.split('.').pop();
        const filePath = `${user.id}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, avatarFile, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
        avatarUrl = publicUrlData?.publicUrl;
      }
      // Remove avatar
      if (!avatarPreview && !avatarFile && user.user_metadata?.avatar_url) {
        avatarUrl = null;
      }
      // Update Supabase Auth user_metadata
      if (avatarUrl !== user.user_metadata?.avatar_url) {
        const { error: metaError } = await supabase.auth.updateUser({
          data: { ...user.user_metadata, avatar_url: avatarUrl },
        });
        if (metaError) throw metaError;
      }
      toast({
        title: "Profile picture updated",
        description: "Your avatar has been updated successfully.",
      });
      setAvatarFile(null);
      setAvatarPreview(null);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update avatar",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleAddPreference = () => {
    const value = preferenceInput.trim();
    if (value && !preferenceTags.includes(value)) {
      setPreferenceTags([...preferenceTags, value]);
      setPreferenceInput("");
    }
  };

  const handleRemovePreference = (tag: string) => {
    setPreferenceTags(preferenceTags.filter(t => t !== tag));
  };

  const handlePreferenceInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddPreference();
    }
  };

  if (userProfileLoading) {
    return <div className="flex justify-center items-center h-64">Loading profile...</div>;
  }
  if (userProfileError) {
    return <div className="flex justify-center items-center h-64 text-destructive">Failed to load profile: {userProfileError.message}</div>;
  }

  return (
    <div className="container max-w-2xl py-10 space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Profile</h2>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>
      
      <Separator />

      {/* Avatar Display and Upload */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
          <CardDescription>Upload or change your avatar.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarPreview || user?.user_metadata?.avatar_url} alt={user?.email || "User"} />
              <AvatarFallback>{user?.email?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2">
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                className="hidden"
                id="avatar-upload-input"
              />
              <div className="flex flex-col md:flex-row gap-2">
                <Button className="w-full md:w-auto"
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Choose Image"
                >
                  Choose Image
                </Button>
                <Button
                  type="button"
                  variant="default"
                  onClick={handleSaveAvatar}
                  disabled={isUploadingAvatar || (!avatarFile && !(!avatarPreview && user?.user_metadata?.avatar_url))}
                >
                  {isUploadingAvatar ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Save Image
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleRemoveAvatar}
                  disabled={!avatarPreview && !user?.user_metadata?.avatar_url}
                >
                  Remove
                </Button>
              </div>
              {avatarPreview && <span className="text-xs text-muted-foreground">Preview shown above. Click Save Image to upload.</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Update your profile details and email address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <FormField
                control={profileForm.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormDescription>
                      This will be your new login email.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="default_working_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default Working Hours</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" min={1} step={1} />
                    </FormControl>
                    <FormDescription>
                      How many hours do you typically work per day?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select timezone" />
                        </SelectTrigger>
                        <SelectContent>
                          {TIMEZONES.map(tz => (
                            <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription>
                      Your local timezone is used for all scheduling and reminders.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={profileForm.control}
                name="preferences"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferences / Hobbies</FormLabel>
                    <div className="flex gap-2 mb-2">
                      <Input
                        value={preferenceInput}
                        onChange={e => setPreferenceInput(e.target.value)}
                        onKeyDown={handlePreferenceInputKeyDown}
                        placeholder="Type a preference and press Enter or Add"
                        className="w-64"
                      />
                      <Button type="button" variant="outline" onClick={handleAddPreference} disabled={!preferenceInput.trim() || preferenceTags.includes(preferenceInput.trim())}>
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {preferenceTags.map(tag => (
                        <span key={tag} className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm">
                          {tag}
                          <button type="button" className="ml-2 text-primary hover:text-destructive" onClick={() => handleRemovePreference(tag)}>
                            <X className="w-4 h-4" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">Enter your preferences or hobbies as tags. Click Add or press Enter to add them.</p>
                    <FormDescription>Changes will be saved when you click 'Save Changes'</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isUpdating}>
                {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your password to keep your account secure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isChangingPassword}>
                {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Change Password
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 