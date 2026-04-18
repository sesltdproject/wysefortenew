
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, CreditCard, DollarSign, Globe, Activity, Shield, MessageSquare, FileText } from "lucide-react";
import { AdminUsersTab } from "./AdminUsersTab";
import { AdminAccountsTab } from "./AdminAccountsTab";
import { AdminLoansTab } from "./AdminLoansTab";
import { AdminTransactionsTab } from "./AdminTransactionsTab";
import { AdminKYCTab } from "./AdminKYCTab";
import { AdminSupportTab } from "./AdminSupportTab";
import { AdminForeignRemittances } from "@/components/admin/AdminForeignRemittances";
import { AdminAOSTab } from "./AdminAOSTab";

export const RefactoredAdminUserManagement = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-8 w-8 text-primary" />
            <h1 className="text-xl sm:text-3xl font-bold">User Management</h1>
          </div>
          <p className="text-muted-foreground">
            Manage user accounts, permissions, and system access
          </p>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 sm:grid-cols-8 h-auto">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
          <TabsTrigger value="accounts" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Accounts</span>
          </TabsTrigger>
          <TabsTrigger value="loans" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Loans</span>
          </TabsTrigger>
          <TabsTrigger value="remittances" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Remittances</span>
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Transactions</span>
          </TabsTrigger>
          <TabsTrigger value="kyc" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">KYC</span>
          </TabsTrigger>
          <TabsTrigger value="support" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Support</span>
          </TabsTrigger>
          <TabsTrigger value="aos" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">AOS</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        <TabsContent value="users">
          <AdminUsersTab />
        </TabsContent>

        <TabsContent value="accounts">
          <AdminAccountsTab />
        </TabsContent>

        <TabsContent value="loans">
          <AdminLoansTab />
        </TabsContent>

        <TabsContent value="remittances">
          <AdminForeignRemittances />
        </TabsContent>

        <TabsContent value="transactions">
          <AdminTransactionsTab />
        </TabsContent>

        <TabsContent value="kyc">
          <AdminKYCTab />
        </TabsContent>

        <TabsContent value="support">
          <AdminSupportTab />
        </TabsContent>

        <TabsContent value="aos">
          <AdminAOSTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
