import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const OAuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        navigate('/dashboard');
      } else {
        navigate('/login');
      }
    };
    checkAuth();
  }, [navigate]);

  return <div className="flex items-center justify-center min-h-screen text-lg">Signing you in...</div>;
};

export default OAuthCallback; 