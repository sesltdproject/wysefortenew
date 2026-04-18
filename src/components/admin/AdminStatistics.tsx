import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Activity, DollarSign, AlertTriangle } from "lucide-react";
import { useOptimizedAdminStatistics } from "@/hooks/useOptimizedAdminStatistics";
import { formatAmount } from "@/lib/utils";

export const AdminStatistics = () => {
  const { totalUsers, userGrowth, transactionsToday, totalBalance, openTickets, isLoading } = useOptimizedAdminStatistics();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="shadow-banking hover-lift">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
      <Card className="shadow-banking hover-lift">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </CardHeader>
        <CardContent>
          <div className="text-xl sm:text-2xl font-bold text-primary">{totalUsers.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            {userGrowth} from yesterday
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-banking hover-lift">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Transactions Today</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </CardHeader>
        <CardContent>
          <div className="text-xl sm:text-2xl font-bold text-primary">{transactionsToday.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">
            Processing normally
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-banking hover-lift">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Total Bank Balance</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </CardHeader>
        <CardContent>
          <div className="text-xl sm:text-2xl font-bold text-primary">${formatAmount(totalBalance)}</div>
          <p className="text-xs text-muted-foreground">
            All account balances
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-banking hover-lift">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs sm:text-sm font-medium">Open Support Tickets</CardTitle>
          <AlertTriangle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        </CardHeader>
        <CardContent>
          <div className="text-xl sm:text-2xl font-bold text-primary">{openTickets}</div>
          <p className="text-xs text-muted-foreground">
            {openTickets === 0 ? 'No active issues' : 'Require attention'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};