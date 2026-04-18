import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Users, UserX, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatAmount } from "@/lib/utils";

interface AdminUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  account_count: number;
  total_balance: number;
  status: string;
  account_locked?: boolean;
  phone?: string;
  address?: string;
  date_of_birth?: string;
}

interface PaginatedUserData {
  users: AdminUser[];
  total_count: number;
}

export const OptimizedUserManagement = () => {
  const { toast } = useToast();
  const [userData, setUserData] = useState<PaginatedUserData>({ users: [], total_count: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const PAGE_SIZE = 25;

  // Debounced search function
  const debouncedSearch = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (term: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setCurrentPage(0);
        fetchUsers(0, term);
      }, 300);
    };
  }, []);

  const fetchUsers = useCallback(async (page: number = 0, search: string = "") => {
    try {
      setLoading(true);
      
      // Use optimized database function with pagination
      const { data, error } = await supabase.rpc('get_admin_users_paginated', {
        page_number: page + 1, // SQL pages start at 1
        page_size: PAGE_SIZE,
        search_term: search || null
      });

      if (error) throw error;

      setUserData((data as unknown as PaginatedUserData) || { users: [], total_count: 0 });
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, PAGE_SIZE]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  const handleUserStatusToggle = async (userId: string, currentlyLocked: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ account_locked: !currentlyLocked })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `User account ${!currentlyLocked ? 'frozen' : 'unfrozen'} successfully`,
      });

      fetchUsers(currentPage, searchTerm);
    } catch (error) {
      console.error('Error updating user status:', error);
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'frozen': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalPages = Math.ceil(userData.total_count / PAGE_SIZE);

  if (loading && userData.users.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Add User */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold">User Management</h2>
          <Badge variant="secondary">{userData.total_count} total users</Badge>
        </div>
        
        <div className="flex gap-3 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid gap-4">
        {userData.users.map((user) => (
          <Card key={user.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">{user.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {user.account_count} accounts • ${formatAmount(user.total_balance)} total
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <Badge className={getStatusColor(user.status)}>
                    {user.status}
                  </Badge>
                  
                  <Button
                    variant={user.account_locked ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => handleUserStatusToggle(user.id, user.account_locked || false)}
                  >
                    {user.account_locked ? (
                      <>
                        <UserX className="h-4 w-4 mr-1" />
                        Unfreeze
                      </>
                    ) : (
                      <>
                        <UserX className="h-4 w-4 mr-1" />
                        Freeze
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newPage = currentPage - 1;
              setCurrentPage(newPage);
              fetchUsers(newPage, searchTerm);
            }}
            disabled={currentPage === 0}
          >
            Previous
          </Button>
          
          <span className="text-sm text-muted-foreground">
            Page {currentPage + 1} of {totalPages}
          </span>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newPage = currentPage + 1;
              setCurrentPage(newPage);
              fetchUsers(newPage, searchTerm);
            }}
            disabled={currentPage >= totalPages - 1}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};