import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { QuickStats } from "@/components/quick-stats";
import { DeviceCard } from "@/components/device-card";
import { ScheduleCard } from "@/components/schedule-card";
import { ScheduleManagement } from "@/components/schedule-management";
import { SharedScheduleManagement } from "@/components/shared-schedule-management";
import { ActivityLog } from "@/components/activity-log";
import { DeviceRegistrationModal } from "@/components/device-registration-modal";
import { KnetsJrShareModal } from "@/components/knets-jr-share-modal";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Bell, Plus, Lock, Unlock, Calendar, TriangleAlert, MapPin, Smartphone, Users, LogOut } from "lucide-react";
import { useState } from "react";

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [selectedDeviceForSchedule, setSelectedDeviceForSchedule] = useState<any>(null);
  const [showKnetsJrModal, setShowKnetsJrModal] = useState(false);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  const { data: devices } = useQuery({
    queryKey: ["/api/devices"],
    retry: false,
  });

  const { data: activities } = useQuery({
    queryKey: ["/api/activity"],
    retry: false,
  });

  // Get currently active schedules for the "Active Now" count
  const { data: activeSchedules = [] } = useQuery({
    queryKey: ["/api/schedules/active"],
    retry: false,
  });

  // Check if any devices are currently locked
  const hasLockedDevices = devices?.some((device: any) => device.isLocked) || false;
  const allDevicesLocked = devices?.every((device: any) => device.isLocked) || false;

  // Toggle lock mutation - locks or unlocks all devices
  const toggleLockMutation = useMutation({
    mutationFn: async () => {
      const action = hasLockedDevices ? "unlock" : "lock";
      const response = await apiRequest("POST", "/api/devices/toggle-lock", { action });
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/activity"] });
      
      const action = data.action;
      const deviceCount = data.affectedDevices || 0;
      toast({
        title: action === "lock" ? "Devices Locked" : "Devices Unlocked",
        description: `${deviceCount} device(s) ${action === "lock" ? "locked" : "unlocked"}`,
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to toggle device lock. Please try again.",
        variant: "destructive",
      });
    },
  });


  // Auto-select first device for schedule management if none selected
  useEffect(() => {
    if (devices && devices.length > 0 && !selectedDeviceForSchedule) {
      setSelectedDeviceForSchedule(devices[0]);
    }
  }, [devices, selectedDeviceForSchedule]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-light flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-trust-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-trust-blue animate-pulse" />
          </div>
          <p className="text-neutral-dark">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modern Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Knets</h1>
                <p className="text-xs text-gray-500 truncate max-w-[80px]">{(user?.firstName || user?.email || 'User').substring(0, 10)} Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 lg:space-x-4">
              <Link href="/location" className="hidden md:block">
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-green-600">
                  <MapPin className="w-4 h-4 mr-2" />
                  Location
                </Button>
              </Link>
              
              <button className="relative p-2 text-gray-600 hover:text-green-600 transition-colors">
                <Bell className="w-5 h-5" />
                {stats?.alerts > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
                )}
              </button>
              
              <div className="flex items-center space-x-2">
                <img 
                  src={user?.profileImageUrl || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&w=40&h=40&fit=crop&crop=face"} 
                  alt="Profile" 
                  className="w-8 h-8 rounded-full object-cover border-2 border-gray-200"
                />
                <div className="hidden lg:block max-w-[70px]">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {((user?.firstName || '') + ' ' + (user?.lastName || '')).trim().substring(0, 10)}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{(user?.firstName || user?.email || 'User').substring(0, 10)}</p>
                </div>
                
                <div className="flex items-center space-x-1">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => window.location.href = '/api/switch-user'}
                    className="text-blue-600 hover:text-blue-700 border border-blue-200 hover:bg-blue-50 px-2"
                  >
                    <Users className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Switch</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => window.location.href = '/api/logout'}
                    className="text-gray-600 hover:text-red-600 px-2"
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-8 mb-8 text-white">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <h2 className="text-3xl font-bold mb-2">
                Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, <span className="inline-block max-w-[80px] truncate align-bottom">{(user?.firstName || user?.email || 'User').substring(0, 10)}</span>!
              </h2>
              <p className="text-green-100 text-lg">
                {devices?.length || 0} device{devices?.length !== 1 ? 's' : ''} connected • {stats?.activeDevices || 0} active
              </p>
            </div>
            <Button
              onClick={() => setShowDeviceModal(true)}
              className="mt-4 md:mt-0 bg-white text-green-600 hover:bg-green-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Device
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Devices</p>
                  <p className="text-2xl font-bold text-gray-900">{stats?.totalDevices || 0}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Now</p>
                  <p className="text-2xl font-bold text-green-600">{activeSchedules?.length || 0}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Locked</p>
                  <p className="text-2xl font-bold text-orange-600">{stats?.lockedDevices || 0}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                  <Lock className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Alerts</p>
                  <p className="text-2xl font-bold text-red-600">{stats?.alerts || 0}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <TriangleAlert className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions & Schedules */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Quick Actions */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-gray-900">Quick Actions</CardTitle>
              <CardDescription className="text-gray-600">
                Instant device controls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className={`w-full h-12 ${
                  hasLockedDevices 
                    ? "border-green-200 text-green-600 hover:bg-green-50" 
                    : "border-red-200 text-red-600 hover:bg-red-50"
                }`}
                onClick={() => toggleLockMutation.mutate()}
                disabled={toggleLockMutation.isPending}
              >
                {hasLockedDevices ? (
                  <Unlock className="w-4 h-4 mr-2" />
                ) : (
                  <Lock className="w-4 h-4 mr-2" />
                )}
                {toggleLockMutation.isPending 
                  ? (hasLockedDevices ? "Unlocking..." : "Locking...")
                  : (hasLockedDevices ? "Unlock All" : "Lock All")
                }
              </Button>
              
              <Link href="/location" className="block">
                <Button variant="outline" className="w-full h-12">
                  <MapPin className="w-4 h-4 mr-2" />
                  Track Location
                </Button>
              </Link>
              
              <Button 
                variant="outline" 
                className="w-full h-16 border-blue-200 text-blue-600 hover:bg-blue-50 flex-col py-2"
                onClick={() => setShowKnetsJrModal(true)}
              >
                <div className="flex items-center">
                  <Smartphone className="w-4 h-4 mr-2" />
                  Share Knets Jr
                </div>
                <span className="text-xs text-gray-500 mt-1">
                  (Send link to child device)
                </span>
              </Button>
            </CardContent>
          </Card>

          {/* Active Schedules */}
          <ScheduleCard />
        </div>

        {/* Connected Devices */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-gray-900">Connected Devices</h3>
            {devices && devices.length > 0 && (
              <Button
                onClick={() => setShowDeviceModal(true)}
                variant="outline"
                className="text-green-600 border-green-200 hover:bg-green-50"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add More
              </Button>
            )}
          </div>
          
          {devices && devices.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {devices.map((device: any) => (
                <DeviceCard 
                  key={device.id} 
                  device={device}
                />
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-2 border-gray-200 bg-gray-50">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                  <Smartphone className="w-10 h-10 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No devices yet</h3>
                <p className="text-gray-600 text-center mb-8 max-w-md">
                  Get started by adding your child's device to monitor activity, set schedules, and ensure digital safety.
                </p>
                <Button
                  onClick={() => setShowDeviceModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Add Your First Device
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Shared Schedule Management */}
        <div id="schedule-management-section" className="mb-8">
          <SharedScheduleManagement />
        </div>

        {/* Schedule Management & Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Device-Specific Schedule Management */}
          {devices && devices.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Device-Specific Schedules</h3>
                <div className="flex items-center space-x-2">
                  <label htmlFor="device-select" className="text-sm text-gray-600">Device:</label>
                  <select
                    id="device-select"
                    value={selectedDeviceForSchedule?.id || ""}
                    onChange={(e) => {
                      const deviceId = parseInt(e.target.value);
                      const device = devices.find((d: any) => d.id === deviceId);
                      setSelectedDeviceForSchedule(device);
                    }}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    {devices.map((device: any) => (
                      <option key={device.id} value={device.id}>
                        {device.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <ScheduleManagement selectedDevice={selectedDeviceForSchedule} />
            </div>
          )}

          {/* Recent Activity */}
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Recent Activity</h3>
            <ActivityLog activities={activities} />
          </div>
        </div>
      </div>

      {/* Device Registration Modal */}
      <DeviceRegistrationModal 
        open={showDeviceModal} 
        onOpenChange={setShowDeviceModal} 
      />

      {/* Knets Jr Share Modal */}
      <KnetsJrShareModal
        open={showKnetsJrModal}
        onOpenChange={setShowKnetsJrModal}
        deviceName="Chintu mobile"
        phoneNumber="+91 8870929411"
      />
    </div>
  );
}
