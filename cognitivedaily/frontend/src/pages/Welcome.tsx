import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { useAuthContext } from "@/context/AuthContext";
import { supabase } from '@/lib/supabase';
import { BatteryCharging } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const Welcome = () => {
  const navigate = useNavigate();
  const { signUp } = useAuthContext();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showVerifyPrompt, setShowVerifyPrompt] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState('');

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (showVerifyPrompt) {
      interval = setInterval(async () => {
        const { data } = await import("@/services/api/auth").then(m => m.default.getUser());
        if (data?.user && (await import("@/services/api/auth")).default.isEmailVerified(data.user)) {
          toast({
            title: "Email verified!",
            description: "Your account is now active.",
          });
          navigate("/dashboard");
        }
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showVerifyPrompt, toast, navigate]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      await signUp(email, password);
      setShowVerifyPrompt(true);
    } catch (error: any) {
      let message = error.message || "Something went wrong. Please try again.";
      let action = null;
      if (message === "User already registered") {
        message = "This email is already registered. Please log in or use a different email.";
        action = (
          <span
            className="underline cursor-pointer text-primary ml-2"
            onClick={() => navigate("/login")}
          >
            Go to Login
          </span>
        );
      }
      setShowVerifyPrompt(false);
      toast({
        variant: "destructive",
        title: "Registration Error",
        description: (
          <span>
            {message}
            {action}
          </span>
        ),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setOauthLoading(true);
    setOauthError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/oauth-callback`
      }
    });
    if (error) {
      setOauthError(error.message || 'Google sign-up failed');
      setOauthLoading(false);
    }
    // On success, Supabase will redirect automatically
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cognitive-blue to-white dark:from-primary dark:to-background flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full mx-auto grid gap-8 lg:grid-cols-2 items-center">
        <div className="space-y-4 text-left">
          <div className="flex items-center space-x-2">
            <BatteryCharging className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Cognitive Daily</h1>
          </div>
          <h2 className="text-4xl font-bold leading-tight">
            Plan your day in harmony with your mental energy
          </h2>
          <p className="text-lg text-muted-foreground">
            Cognitive Daily helps you reduce mental overload by intelligently planning
            your schedule based on your tasks, energy levels, and deadlines.
          </p>
          <div className="pt-4 space-y-4">
            <div className="flex items-center space-x-2">
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white">1</div>
              <p className="text-lg">Add your tasks with duration and priority</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white">2</div>
              <p className="text-lg">Set your current energy level</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-white">3</div>
              <p className="text-lg">Get an AI-optimized daily schedule</p>
            </div>
          </div>
        </div>
        <div>
          <Card className="w-full backdrop-blur-sm bg-white/90 dark:bg-black/30 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Get Started</CardTitle>
              <CardDescription>
                {showVerifyPrompt
                  ? "Verify your email to activate your account."
                  : "Create your account to start planning smarter days."}
              </CardDescription>
            </CardHeader>
            {showVerifyPrompt ? (
              <CardContent>
                <div className="space-y-4 text-center">
                  <p>
                    🎉 Account created!<br />
                    Please check your email (<b>{email}</b>) for a verification link.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Didn't receive the email? Check your spam folder or {" "}
                    <span className="underline cursor-pointer text-primary" onClick={handleSubmit}>
                      resend verification email
                    </span>.
                  </p>
                  <Button className="w-full mt-4" onClick={() => navigate("/login")}>Go to Login</Button>
                </div>
              </CardContent>
            ) : (
              <>
                <form onSubmit={handleSubmit}>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        placeholder="Enter your name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="Create a password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-4">
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Creating Account..." : "Create Account"}
                    </Button>
                    {false && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full flex items-center justify-center gap-2"
                        onClick={handleGoogleSignUp}
                        disabled={oauthLoading}
                      >
                        <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                        {oauthLoading ? 'Signing up with Google...' : 'Sign up with Google'}
                      </Button>
                    )}
                    {oauthError && <div className="text-red-500 text-sm text-center">{oauthError}</div>}
                  </CardFooter>
                </form>
              </>
            )}
          </Card>
          <p className="text-center text-sm mt-4 text-muted-foreground">
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
