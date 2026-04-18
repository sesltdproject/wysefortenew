import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, Activity, Settings, Users, Database, Shield, FileText } from "lucide-react";
import { AdminStatistics } from "./AdminStatistics";
import { useAdminActivities } from "@/hooks/useAdminActivities";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettings";

interface AdminOverviewProps {
  onSectionChange: (section: string) => void;
}

export const AdminOverview = ({ onSectionChange }: AdminOverviewProps) => {
  const { activities, isLoading: activitiesLoading } = useAdminActivities();
  const { settings } = useWebsiteSettings();

  return (
    <div className="space-y-6">
      {/* System Status Alert */}
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-700">
          All {settings?.bankName || "Wyseforte Bank"} systems are operational. Last security scan completed 2 minutes
          ago.
        </AlertDescription>
      </Alert>

      {/* System Statistics */}
      <AdminStatistics />

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* System Activities */}
        <Card className="shadow-banking">
          <CardHeader>
            <CardTitle className="text-primary flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>Recent System Activities</span>
            </CardTitle>
            <CardDescription>Latest administrative actions and system events</CardDescription>
          </CardHeader>
          <CardContent>
            {activitiesLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-start justify-between p-3 bg-card rounded-lg border">
                    <div className="flex items-start space-x-3">
                      <div className="w-2 h-2 rounded-full mt-2 bg-gray-200 animate-pulse" />
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-40 animate-pulse"></div>
                        <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                      </div>
                    </div>
                    <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start justify-between p-3 bg-card rounded-lg border">
                    <div className="flex items-start space-x-3">
                      <div
                        className={`w-2 h-2 rounded-full mt-2 ${
                          activity.status === "success"
                            ? "bg-green-500"
                            : activity.status === "warning"
                              ? "bg-yellow-500"
                              : "bg-blue-500"
                        }`}
                      />
                      <div>
                        <p className="font-medium text-sm">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">{activity.user}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                ))}
              </div>
            )}
            <Separator className="my-4" />
            <Button variant="outline" className="w-full" onClick={() => onSectionChange("audit")}>
              View Full Activity Log
            </Button>
          </CardContent>
        </Card>

        {/* Admin Tools */}
        <Card className="shadow-banking">
          <CardHeader>
            <CardTitle className="text-primary flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Administrative Tools</span>
            </CardTitle>
            <CardDescription>Quick access to admin functions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-16 sm:h-20 flex-col hover-lift"
                onClick={() => onSectionChange("users")}
              >
                <Users className="h-5 w-5 sm:h-6 sm:w-6 mb-2" />
                <span className="text-sm">User Management</span>
              </Button>
              <Button
                variant="outline"
                className="h-16 sm:h-20 flex-col hover-lift"
                onClick={() => onSectionChange("database")}
              >
                <Database className="h-5 w-5 sm:h-6 sm:w-6 mb-2" />
                <span className="text-sm">Database Admin</span>
              </Button>
              <Button
                variant="outline"
                className="h-16 sm:h-20 flex-col hover-lift"
                onClick={() => onSectionChange("security")}
              >
                <Shield className="h-5 w-5 sm:h-6 sm:w-6 mb-2" />
                <span className="text-sm">Security Center</span>
              </Button>
              <Button
                variant="outline"
                className="h-16 sm:h-20 flex-col hover-lift"
                onClick={() => onSectionChange("reports")}
              >
                <FileText className="h-5 w-5 sm:h-6 sm:w-6 mb-2" />
                <span className="text-sm">Reports</span>
              </Button>
            </div>

            <Separator className="my-6" />

            {/* System Health */}
            <div className="space-y-3">
              <h4 className="font-medium text-primary">System Health</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Database Performance</span>
                  <Badge className="bg-green-100 text-green-800">Excellent</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">API Response Time</span>
                  <Badge className="bg-green-100 text-green-800">98ms avg</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Server Uptime</span>
                  <Badge className="bg-green-100 text-green-800">99.9%</Badge>
                </div>
              </div>
            </div>

            <Separator className="my-4" />

            <Button variant="gold" size="sm" className="w-full">
              System Diagnostics
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
