import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthContext } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();
  const { signIn } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password reset states
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');

  const [oauthLoading, setOauthLoading] = useState(false);
  const [oauthError, setOauthError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signIn(email, password);
      // After successful login, get the access token and call /users/me
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (accessToken) {
        localStorage.setItem('authToken', accessToken);
      }
      // On success, redirect to dashboard
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');
    setResetMessage('');
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail);
    if (error) {
      setResetError(error.message);
      setResetLoading(false);
      return;
    }
    setResetMessage('Password reset email sent! Please check your inbox.');
    setResetLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setOauthLoading(true);
    setOauthError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/oauth-callback`
      }
    });
    if (error) {
      setOauthError(error.message || 'Google sign-in failed');
      setOauthLoading(false);
    }
    // On success, Supabase will redirect automatically
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cognitive-blue to-white dark:from-primary dark:to-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full mx-auto">
        <Card className="w-full backdrop-blur-sm bg-white/90 dark:bg-black/30 border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Log In</CardTitle>
            <CardDescription>
              {showReset
                ? 'Enter your email to reset your password.'
                : 'Enter your email and password to access your account.'}
            </CardDescription>
          </CardHeader>
          {showReset ? (
            <form onSubmit={handleResetSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="Enter your email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                  />
                </div>
                {resetError && <div className="text-red-500 text-sm">{resetError}</div>}
                {resetMessage && <div className="text-green-600 text-sm">{resetMessage}</div>}
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button type="submit" className="w-full" disabled={resetLoading}>
                  {resetLoading ? 'Sending...' : 'Send Reset Email'}
                </Button>
                <Button variant="link" className="w-full p-0" type="button" onClick={() => setShowReset(false)}>
                  Back to login
                </Button>
              </CardFooter>
            </form>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
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
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                {error && <div className="text-red-500 text-sm">{error}</div>}
                <div className="flex justify-end">
                  <Button variant="link" className="p-0 text-sm" type="button" onClick={() => setShowReset(true)}>
                    Forgot Password?
                  </Button>
                </div>
                {/* Google OAuth Button */}
                <div className="flex flex-col gap-2 mt-4">
                  {false && (
                  <Button
                    type="button"
                    className="w-full bg-white text-black border border-gray-300 hover:bg-gray-100 flex items-center justify-center gap-2"
                    onClick={handleGoogleSignIn}
                    disabled={oauthLoading}
                  >
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                    {oauthLoading ? 'Signing in with Google...' : 'Sign in with Google'}
                  </Button>
                  )}
                  {oauthError && <div className="text-red-500 text-sm text-center">{oauthError}</div>}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Logging in...' : 'Log In'}
                </Button>
                <Button variant="link" className="w-full p-0" type="button" onClick={() => navigate('/welcome')}>
                  Don&apos;t have an account? Sign up
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Login; 