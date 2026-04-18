import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Activity {
  id: string;
  action: string;
  user: string;
  time: string;
  status: 'success' | 'warning' | 'info';
}

export const useAdminActivities = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        // Provide fallback activities while database is being set up
        const fallbackActivities: Activity[] = [
          {
            id: '1',
            action: 'System initialization',
            user: 'System',
            time: '2 min ago',
            status: 'success'
          },
          {
            id: '2',
            action: 'Database connection established',
            user: 'System',
            time: '5 min ago',
            status: 'success'
          },
          {
            id: '3',
            action: 'Admin dashboard loaded',
            user: 'System',
            time: '10 min ago',
            status: 'info'
          }
        ];

        setActivities(fallbackActivities);
        setIsLoading(false);

      } catch (error) {
        console.error('Error fetching admin activities:', error);
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, []);

  return { activities, isLoading };
};

function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
}

function parseTimeAgo(timeString: string): number {
  if (timeString === "Just now") return 0;
  
  const match = timeString.match(/(\d+)\s+(minute|hour|day)/);
  if (!match) return 0;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 'minute': return value;
    case 'hour': return value * 60;
    case 'day': return value * 60 * 24;
    default: return 0;
  }
}