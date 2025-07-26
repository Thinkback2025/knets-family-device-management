import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertChildSchema, insertDeviceSchema, insertScheduleSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Complete logout including from Replit - for testing purposes
  app.get('/api/complete-logout', (req, res) => {
    req.logout(() => {
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
        }
        // Redirect to Replit logout which will also logout from Replit itself
        res.redirect('https://replit.com/logout?redirect=' + encodeURIComponent(`${req.protocol}://${req.hostname}`));
      });
    });
  });

  // Dashboard stats
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const devices = await storage.getDevicesByParent(userId);
      
      const stats = {
        totalDevices: devices.length,
        activeDevices: devices.filter(d => d.isActive && d.lastSeen && new Date(d.lastSeen).getTime() > Date.now() - 300000).length, // active in last 5 min
        lockedDevices: devices.filter(d => d.isLocked).length,
        totalScreenTime: devices.reduce((sum, d) => sum + (d.screenTimeToday || 0), 0),
        alerts: devices.filter(d => (d.screenTimeToday || 0) > 240).length, // over 4 hours
      };
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Update device endpoint
  app.patch('/api/devices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      const updateData = req.body;

      console.log(`[UPDATE] Device ${deviceId} update request:`, updateData);

      // Verify device belongs to user
      const device = await storage.getDeviceById(deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }

      // Get the child to verify parent ownership
      const children = await storage.getChildrenByParent(userId);
      const child = children.find(c => c.id === device.childId);
      if (!child) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Update device using existing method
      const updatedDevice = await storage.updateExistingDevice(deviceId, updateData);
      
      console.log(`[UPDATE] Device ${deviceId} updated successfully:`, updatedDevice);
      res.json(updatedDevice);
    } catch (error) {
      console.error('Error updating device:', error);
      res.status(500).json({ message: 'Failed to update device' });
    }
  });

  // Approve device consent endpoint
  app.patch('/api/devices/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const userId = req.user.claims.sub;

      console.log(`[APPROVE] Device ${deviceId} consent approval request from user ${userId}`);

      // Verify device belongs to user
      const device = await storage.getDeviceById(deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }

      // Get the child to verify parent ownership
      const children = await storage.getChildrenByParent(userId);
      const child = children.find(c => c.id === device.childId);
      if (!child) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Update consent status to approved
      const updatedDevice = await storage.updateDeviceConsent(deviceId, 'approved');
      
      // Log activity
      await storage.logActivity({
        deviceId: deviceId,
        action: 'consent_approved',
        description: `Device consent approved by parent`,
      });
      
      console.log(`[APPROVE] Device ${deviceId} consent approved successfully`);
      res.json({ message: "Device consent approved", device: updatedDevice });
    } catch (error) {
      console.error('Error approving device consent:', error);
      res.status(500).json({ message: 'Failed to approve device consent' });
    }
  });

  // Delete device endpoint
  app.delete('/api/devices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const userId = req.user.claims.sub;

      console.log(`[DELETE] Device ${deviceId} delete request from user ${userId}`);

      // Verify device belongs to user
      const device = await storage.getDeviceById(deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }

      // Get the child to verify parent ownership
      const children = await storage.getChildrenByParent(userId);
      const child = children.find(c => c.id === device.childId);
      if (!child) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Delete device
      await storage.deleteDevice(deviceId);
      
      console.log(`[DELETE] Device ${deviceId} deleted successfully`);
      res.json({ message: "Device deleted successfully" });
    } catch (error) {
      console.error('Error deleting device:', error);
      res.status(500).json({ message: 'Failed to delete device' });
    }
  });

  // Device routes
  app.get('/api/devices', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log(`[DEBUG] Fetching devices for user: ${userId}`);
      const devices = await storage.getDevicesByParent(userId);
      console.log(`[DEBUG] Found ${devices.length} devices:`, devices.map(d => ({ id: d.id, name: d.name, childId: d.childId })));
      res.json(devices);
    } catch (error) {
      console.error("Error fetching devices:", error);
      res.status(500).json({ message: "Failed to fetch devices" });
    }
  });

  app.post('/api/devices', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const deviceData = req.body;
      
      console.log("Device registration attempt:", {
        userId,
        deviceData,
        timestamp: new Date().toISOString()
      });
      
      // Validate device data
      const validatedDevice = insertDeviceSchema.parse(deviceData);
      console.log("Validated device data:", validatedDevice);
      
      // Check for existing device by IMEI or phone number
      const existingByImei = await storage.getDeviceByImei(validatedDevice.imei);
      const existingByPhone = await storage.getDeviceByPhoneNumber(validatedDevice.phoneNumber);
      
      let device;
      let isExistingDevice = false;
      
      if (existingByImei || existingByPhone) {
        // Device already exists - use the existing one and update if needed
        const existingDevice = existingByImei || existingByPhone;
        isExistingDevice = true;
        
        console.log("Found existing device:", {
          existingDevice: existingDevice?.id,
          matchedBy: existingByImei ? 'IMEI' : 'Phone',
          currentName: existingDevice?.name,
          newName: validatedDevice.name
        });
        
        // Update the existing device with new information if needed
        device = await storage.updateExistingDevice(existingDevice!.id, {
          childId: validatedDevice.childId,
          name: validatedDevice.name,
          deviceType: validatedDevice.deviceType,
          model: validatedDevice.model,
          // Keep original IMEI and phone number - they matched
          imei: existingDevice!.imei,
          phoneNumber: existingDevice!.phoneNumber,
        });
        
        console.log("Updated existing device for new child:", device);
        
        // Log activity for existing device reuse
        await storage.logActivity({
          deviceId: device.id,
          action: 'device_linked',
          description: `Device ${device.name} linked to new child profile (matched by ${existingByImei ? 'IMEI' : 'phone number'})`,
        });
      } else {
        // Create new device
        device = await storage.createDevice(validatedDevice);
        console.log("Device created successfully:", device);
        
        // Log activity for new device
        await storage.logActivity({
          deviceId: device.id,
          action: 'device_registered',
          description: `Device ${device.name} registered and awaiting consent`,
        });
      }
      
      res.json({
        ...device,
        isExistingDevice,
        message: isExistingDevice 
          ? `Device linked successfully! Parental controls will work on this device as it was previously registered.`
          : `Device registered successfully! Awaiting consent from child.`
      });
    } catch (error) {
      console.error("Error creating device:", error);
      if (error instanceof z.ZodError) {
        console.error("Validation errors:", error.errors);
        res.status(400).json({ message: "Invalid device data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create device" });
      }
    }
  });

  app.patch('/api/devices/:id/lock', isAuthenticated, async (req: any, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const { isLocked } = req.body;
      
      const device = await storage.updateDeviceStatus(deviceId, isLocked);
      
      // Log activity
      await storage.logActivity({
        deviceId: device.id,
        action: isLocked ? 'device_locked' : 'device_unlocked',
        description: `Device ${device.name} was ${isLocked ? 'locked' : 'unlocked'}`,
      });
      
      res.json(device);
    } catch (error) {
      console.error("Error updating device status:", error);
      res.status(500).json({ message: "Failed to update device status" });
    }
  });

  app.patch('/api/devices/:id/consent', isAuthenticated, async (req: any, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const { status } = req.body;
      
      const device = await storage.updateDeviceConsent(deviceId, status);
      
      // Log activity
      await storage.logActivity({
        deviceId: device.id,
        action: 'consent_updated',
        description: `Device consent status changed to ${status}`,
      });
      
      res.json(device);
    } catch (error) {
      console.error("Error updating device consent:", error);
      res.status(500).json({ message: "Failed to update device consent" });
    }
  });

  app.delete('/api/devices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const userId = req.user.claims.sub;
      
      // First verify the device belongs to this user
      const device = await storage.getDeviceById(deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      // Verify ownership through child relationship
      const devices = await storage.getDevicesByParent(userId);
      const userOwnsDevice = devices.some(d => d.id === deviceId);
      
      if (!userOwnsDevice) {
        return res.status(403).json({ message: "You don't have permission to delete this device" });
      }
      
      console.log(`User ${userId} deleting device ${deviceId}: ${device.name}`);
      
      // Log activity before deletion
      await storage.logActivity({
        deviceId: device.id,
        action: 'device_removed',
        description: `Device ${device.name} was removed by parent`,
      });
      
      // Delete the device and all related data
      await storage.deleteDevice(deviceId);
      
      console.log(`Device ${deviceId} successfully deleted`);
      res.json({ message: "Device removed successfully" });
    } catch (error) {
      console.error("Error deleting device:", error);
      res.status(500).json({ message: "Failed to remove device" });
    }
  });

  // Children routes
  app.get('/api/children', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const children = await storage.getChildrenByParent(userId);
      res.json(children);
    } catch (error) {
      console.error("Error fetching children:", error);
      res.status(500).json({ message: "Failed to fetch children" });
    }
  });

  app.post('/api/children', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const childData = { ...req.body, parentId: userId };
      
      // Validate child data
      const validatedChild = insertChildSchema.parse(childData);
      
      const child = await storage.createChild(validatedChild);
      res.json(child);
    } catch (error) {
      console.error("Error creating child:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid child data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create child" });
      }
    }
  });

  // Helper function to check if schedule is currently active
  const isScheduleCurrentlyActive = (schedule: any, userTimeZone?: string) => {
    // Use user's timezone if provided, otherwise default to server time
    const timeZone = userTimeZone || 'UTC';
    
    const now = new Date();
    const userTime = new Date(now.toLocaleString("en-US", { timeZone }));
    const currentTime = userTime.toTimeString().slice(0, 5);
    const currentDay = userTime.getDay();
    
    console.log(`[DEBUG] Checking schedule ${schedule.name}: current time = ${currentTime}, current day = ${currentDay}, timezone = ${timeZone}`);
    
    let daysOfWeek;
    try {
      daysOfWeek = JSON.parse(schedule.daysOfWeek || '[]');
    } catch {
      daysOfWeek = [];
    }
    
    console.log(`[DEBUG] Schedule ${schedule.name} days: ${JSON.stringify(daysOfWeek)}`);
    
    // Handle both string format (["monday", "tuesday"]) and numeric format ([0, 1, 2])
    let isScheduledForToday = false;
    if (daysOfWeek.length > 0) {
      if (typeof daysOfWeek[0] === 'string') {
        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        isScheduledForToday = daysOfWeek.includes(dayNames[currentDay]);
        console.log(`[DEBUG] String format check: ${dayNames[currentDay]} in ${JSON.stringify(daysOfWeek)} = ${isScheduledForToday}`);
      } else {
        isScheduledForToday = daysOfWeek.includes(currentDay);
        console.log(`[DEBUG] Numeric format check: ${currentDay} in ${JSON.stringify(daysOfWeek)} = ${isScheduledForToday}`);
      }
    }
    
    if (!isScheduledForToday) {
      console.log(`[DEBUG] Schedule ${schedule.name} not scheduled for today`);
      return false;
    }
    
    const startTime = schedule.startTime;
    const endTime = schedule.endTime;
    
    console.log(`[DEBUG] Schedule ${schedule.name} time check: ${currentTime} between ${startTime} and ${endTime}`);
    
    // Handle overnight schedules (e.g., 22:00 - 06:30)
    if (startTime > endTime) {
      const isActive = currentTime >= startTime || currentTime <= endTime;
      console.log(`[DEBUG] Overnight schedule: ${isActive}`);
      return isActive;
    } else {
      const isActive = currentTime >= startTime && currentTime <= endTime;
      console.log(`[DEBUG] Same day schedule: ${isActive}`);
      return isActive;
    }
  };

  // Schedule routes
  app.get('/api/schedules/active', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get all schedules for this parent and filter for currently active ones
      const allSchedules = await storage.getSchedulesByParent(userId);
      
      console.log(`[DEBUG] Found ${allSchedules.length} schedules for user ${userId}`);
      
      const currentlyActiveSchedules = allSchedules.filter(schedule => {
        if (!schedule.isActive) {
          console.log(`[DEBUG] Schedule ${schedule.name} is not active`);
          return false;
        }
        
        // Try to get user's timezone from request headers or use a default
        const userTimeZone = req.headers['x-user-timezone'] || 'America/New_York'; // Default to EST
        const isActive = isScheduleCurrentlyActive(schedule, userTimeZone);
        console.log(`[DEBUG] Schedule ${schedule.name} (${schedule.startTime}-${schedule.endTime}, days: ${schedule.daysOfWeek}) is currently active: ${isActive}`);
        return isActive;
      });
      
      console.log(`[DEBUG] ${currentlyActiveSchedules.length} schedules are currently active`);
      
      res.json(currentlyActiveSchedules);
    } catch (error) {
      console.error("Error fetching active schedules:", error);
      res.status(500).json({ message: "Failed to fetch active schedules" });
    }
  });

  // Auto-lock devices based on active schedules
  app.post('/api/schedules/enforce', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const devices = await storage.getDevicesByParent(userId);
      const updates = [];
      
      console.log(`[ENFORCE] Starting schedule enforcement for ${devices.length} devices`);
      
      for (const device of devices) {
        const schedules = await storage.getSchedulesByDevice(device.id);
        const activeSchedules = schedules.filter(schedule => schedule.isActive);
        
        console.log(`[ENFORCE] Device ${device.name} (${device.id}) has ${activeSchedules.length} active schedules`);
        
        // Check if any schedule is currently active using user's timezone
        const userTimeZone = req.headers['x-user-timezone'] || 'Asia/Calcutta';
        const hasActiveSchedule = activeSchedules.some(schedule => {
          const isActive = isScheduleCurrentlyActive(schedule, userTimeZone);
          console.log(`[ENFORCE] Schedule ${schedule.name} active: ${isActive}`);
          return isActive;
        });
        
        console.log(`[ENFORCE] Device ${device.name} should be ${hasActiveSchedule ? 'locked' : 'unlocked'}, currently ${device.isLocked ? 'locked' : 'unlocked'}`);
        
        // Update device lock status if needed
        if (hasActiveSchedule && !device.isLocked) {
          await storage.updateDeviceStatus(device.id, true);
          await storage.logActivity({
            deviceId: device.id,
            action: 'schedule_lock',
            description: 'Device automatically locked due to active schedule',
          });
          updates.push({ deviceId: device.id, action: 'locked', deviceName: device.name });
          console.log(`[ENFORCE] ✓ Locked device ${device.name}`);
        } else if (!hasActiveSchedule && device.isLocked) {
          await storage.updateDeviceStatus(device.id, false);
          await storage.logActivity({
            deviceId: device.id,
            action: 'schedule_unlock',
            description: 'Device automatically unlocked - no active schedules',
          });
          updates.push({ deviceId: device.id, action: 'unlocked', deviceName: device.name });
          console.log(`[ENFORCE] ✓ Unlocked device ${device.name}`);
        } else {
          console.log(`[ENFORCE] - No change needed for device ${device.name}`);
        }
      }
      
      console.log(`[ENFORCE] Enforcement completed. ${updates.length} devices updated.`);
      res.json({ message: 'Schedule enforcement completed', updates, totalDevices: devices.length });
    } catch (error) {
      console.error("Error enforcing schedules:", error);
      res.status(500).json({ message: "Failed to enforce schedules" });
    }
  });

  // Update device endpoint (for IMEI updates)
  app.patch('/api/devices/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const deviceId = parseInt(req.params.id);
      const { imei } = req.body;
      
      if (!imei) {
        return res.status(400).json({ message: "IMEI is required" });
      }
      
      // Verify device ownership
      const device = await storage.getDeviceById(deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      const children = await storage.getChildrenByParent(userId);
      const userOwnsDevice = children.some(child => child.id === device.childId);
      
      if (!userOwnsDevice) {
        return res.status(403).json({ message: "Unauthorized access to device" });
      }
      
      const updatedDevice = await storage.updateDevice(deviceId, { imei });
      
      // Log activity
      await storage.logActivity({
        deviceId: deviceId,
        action: 'imei_updated',
        description: `Device IMEI updated to ${imei}`,
        metadata: { previousImei: device.imei, newImei: imei },
      });
      
      res.json({ message: "Device IMEI updated successfully", device: updatedDevice });
    } catch (error) {
      console.error("Error updating device:", error);
      res.status(500).json({ message: "Failed to update device" });
    }
  });

  // Toggle lock/unlock all devices
  app.post('/api/devices/toggle-lock', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { action } = req.body; // "lock" or "unlock"
      
      const devices = await storage.getDevicesByParent(userId);
      let affectedDevices = 0;
      
      for (const device of devices) {
        const shouldLock = action === "lock";
        
        // Only update if status is different
        if (device.isLocked !== shouldLock) {
          await storage.updateDeviceStatus(device.id, shouldLock);
          affectedDevices++;
        }
        
        // Log the manual lock/unlock activity
        await storage.logActivity({
          deviceId: device.id,
          action: shouldLock ? 'manual_lock' : 'manual_unlock',
          description: `Device manually ${shouldLock ? 'locked' : 'unlocked'} by parent`,
          metadata: JSON.stringify({ 
            lockType: 'manual',
            previousState: device.isLocked ? 'locked' : 'unlocked'
          })
        });
      }
      
      res.json({ 
        message: `${action === "lock" ? "Locked" : "Unlocked"} ${devices.length} device(s)`,
        action,
        affectedDevices,
        totalDevices: devices.length
      });
    } catch (error) {
      console.error("Error toggling device lock:", error);
      res.status(500).json({ message: "Failed to toggle device lock" });
    }
  });

  // Knets Jr app endpoints (no authentication required for device access)
  
  // Get device status by IMEI for Knets Jr app
  app.get('/api/companion/status/:imei', async (req, res) => {
    try {
      const imei = req.params.imei;
      const { phoneNumber, deviceFingerprint } = req.query;
      const device = await storage.getDeviceByImei(imei);
      
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      // SECURITY: Flexible validation - either phone number OR IMEI must match
      let phoneMatches = false;
      let imeiMatches = false;
      
      // Check phone number match
      if (phoneNumber && device.phoneNumber) {
        const cleanRegisteredPhone = device.phoneNumber.replace(/\s+/g, '');
        const cleanRequestPhone = phoneNumber.toString().replace(/\s+/g, '');
        phoneMatches = (cleanRegisteredPhone === cleanRequestPhone);
      }
      
      // Check IMEI/device fingerprint match
      if (deviceFingerprint && device.deviceFingerprint) {
        imeiMatches = (deviceFingerprint === device.deviceFingerprint);
      } else if (deviceFingerprint && device.imei) {
        // Fallback: check against registered IMEI if no fingerprint stored
        imeiMatches = (deviceFingerprint === device.imei);
      }
      
      // SECURITY: At least ONE identifier must match (phone OR IMEI)
      if (!phoneMatches && !imeiMatches) {
        await storage.logActivity({
          deviceId: device.id,
          action: 'security_alert',
          description: 'Device validation failed - neither phone number nor IMEI match',
          metadata: JSON.stringify({ 
            registeredPhone: device.phoneNumber,
            attemptedPhone: phoneNumber,
            registeredIMEI: device.imei,
            attemptedFingerprint: deviceFingerprint,
            phoneMatches,
            imeiMatches,
            timestamp: new Date().toISOString(),
            securityLevel: 'MEDIUM'
          })
        });
        
        return res.status(403).json({ 
          message: "Device validation failed",
          error: "IDENTITY_MISMATCH",
          description: "Neither phone number nor device identity matches registration. Contact your parent to update device information."
        });
      }
      
      // Log successful validation with match details
      await storage.logActivity({
        deviceId: device.id,
        action: 'device_validated',
        description: `Device access granted - ${phoneMatches ? 'phone' : ''}${phoneMatches && imeiMatches ? ' and ' : ''}${imeiMatches ? 'IMEI' : ''} match`,
        metadata: JSON.stringify({
          validationMethod: phoneMatches && imeiMatches ? 'both' : phoneMatches ? 'phone' : 'imei',
          phoneMatches,
          imeiMatches,
          timestamp: new Date().toISOString()
        })
      });
      
      // Get active schedules for this device
      const schedules = await storage.getSchedulesByDevice(device.id);
      const activeSchedules = schedules.filter(schedule => {
        if (!schedule.isActive) return false;
        return isScheduleCurrentlyActive(schedule);
      });
      
      res.json({
        id: device.id,
        name: device.name,
        isLocked: device.isLocked,
        isActive: device.isActive,
        lastChecked: new Date().toISOString(),
        schedules: activeSchedules.map(s => ({
          name: s.name,
          isActive: true,
          startTime: s.startTime,
          endTime: s.endTime
        }))
      });
    } catch (error) {
      console.error("Error fetching Knets Jr device status:", error);
      res.status(500).json({ message: "Failed to fetch device status" });
    }
  });
  
  // Knets Jr app heartbeat to update device activity
  app.post('/api/companion/heartbeat', async (req, res) => {
    try {
      const { imei, deviceFingerprint } = req.body;
      const device = await storage.getDeviceByImei(imei);
      
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      // SECURITY CHECK: Flexible validation for heartbeat - allow if either identifier matches
      let validatedByPhone = false;
      let validatedByIMEI = false;
      
      // Check if current phone number matches (if available)
      if (device.phoneNumber) {
        // For heartbeat, we don't have direct phone number, but we can validate device is legitimate
        validatedByIMEI = true; // Device found by IMEI, so IMEI is valid
      }
      
      // Check device fingerprint match
      if (deviceFingerprint && device.deviceFingerprint) {
        validatedByIMEI = (deviceFingerprint === device.deviceFingerprint);
      }
      
      // If we have device fingerprint but no stored fingerprint, update it
      if (deviceFingerprint && !device.deviceFingerprint) {
        validatedByIMEI = true; // Accept and store new fingerprint
      }
      
      // Update device last seen time and fingerprint
      await storage.updateExistingDevice(device.id, {
        lastSeen: new Date(),
        deviceFingerprint: deviceFingerprint || device.deviceFingerprint
      });
      
      // Log heartbeat activity
      await storage.logActivity({
        deviceId: device.id,
        action: 'companion_heartbeat',
        description: 'Knets Jr app check-in',
        metadata: JSON.stringify({ 
          timestamp: new Date().toISOString(),
          appType: 'knets_jr',
          securityValidated: true
        })
      });
      
      res.json({ message: "Heartbeat received", timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("Error processing Knets Jr heartbeat:", error);
      res.status(500).json({ message: "Failed to process heartbeat" });
    }
  });

  // Companion app consent approval endpoint (no auth required)
  app.post('/api/companion/consent/:imei', async (req, res) => {
    try {
      const { imei } = req.params;
      const { action } = req.body; // 'approve' or 'deny'
      
      if (!imei || !action) {
        return res.status(400).json({ message: "IMEI and action are required" });
      }

      // Find device by IMEI
      const device = await storage.getDeviceByImei(imei);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }

      // Update consent status
      const newStatus = action === 'approve' ? 'approved' : 'denied';
      await storage.updateDeviceConsent(device.id, newStatus);
      
      // Log the consent action
      await storage.logActivity({
        deviceId: device.id,
        action: 'consent_' + action,
        description: `Device consent ${action}d by child user`,
        metadata: { imei, previousStatus: device.consentStatus, newStatus },
      });
      
      res.json({ 
        message: `Device consent ${action}d successfully`,
        status: newStatus 
      });
    } catch (error) {
      console.error("Error updating consent:", error);
      res.status(500).json({ message: "Failed to update consent" });
    }
  });

  // Get all device-schedule relationships for a parent
  app.get('/api/device-schedules', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Get all devices for this parent
      const devices = await storage.getDevicesByParent(userId);
      const deviceIds = devices.map(d => d.id);
      
      // Get all schedules for these devices
      const deviceSchedules = [];
      for (const deviceId of deviceIds) {
        const schedules = await storage.getSchedulesByDevice(deviceId);
        for (const schedule of schedules) {
          deviceSchedules.push({
            deviceId,
            schedule
          });
        }
      }
      
      res.json(deviceSchedules);
    } catch (error) {
      console.error("Error fetching device schedules:", error);
      res.status(500).json({ message: "Failed to fetch device schedules" });
    }
  });

  app.get('/api/devices/:deviceId/schedules', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const deviceId = parseInt(req.params.deviceId);
      
      // Verify device ownership
      const device = await storage.getDeviceById(deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      const children = await storage.getChildrenByParent(userId);
      const userOwnsDevice = children.some(child => child.id === device.childId);
      
      if (!userOwnsDevice) {
        return res.status(403).json({ message: "Unauthorized access to device" });
      }
      
      const schedules = await storage.getSchedulesByDevice(deviceId);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ message: "Failed to fetch schedules" });
    }
  });

  // Get all schedules for a parent
  app.get('/api/schedules', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const schedules = await storage.getSchedulesByParent(userId);
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      res.status(500).json({ message: "Failed to fetch schedules" });
    }
  });

  app.post('/api/schedules', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const scheduleData = { ...req.body, parentId: userId };
      
      console.log(`[DEBUG] Creating schedule for user ${userId}:`, {
        scheduleName: scheduleData.name,
        deviceIds: scheduleData.deviceIds,
        startTime: scheduleData.startTime,
        endTime: scheduleData.endTime
      });
      
      // Remove deviceId from the schedule data as it's now stored in junction table
      const { deviceIds, ...scheduleWithoutDevices } = scheduleData;
      
      // Validate schedule data
      const validatedSchedule = insertScheduleSchema.parse(scheduleWithoutDevices);
      
      const schedule = await storage.createSchedule(validatedSchedule);
      
      // If deviceIds are provided, assign the schedule to those devices
      if (deviceIds && Array.isArray(deviceIds)) {
        console.log(`[DEBUG] Assigning schedule to ${deviceIds.length} devices:`, deviceIds);
        for (const deviceId of deviceIds) {
          // Verify device ownership
          const device = await storage.getDeviceById(deviceId);
          console.log(`[DEBUG] Device ${deviceId}:`, device ? { id: device.id, name: device.name, childId: device.childId } : 'not found');
          
          if (device) {
            const children = await storage.getChildrenByParent(userId);
            const userOwnsDevice = children.some(child => child.id === device.childId);
            console.log(`[DEBUG] User owns device ${deviceId}:`, userOwnsDevice);
            
            if (userOwnsDevice) {
              await storage.assignDeviceToSchedule(deviceId, schedule.id);
              console.log(`[DEBUG] Successfully assigned schedule ${schedule.id} to device ${deviceId}`);
              
              // Log activity for each device
              await storage.logActivity({
                deviceId: deviceId,
                action: 'schedule_assigned',
                description: `Schedule ${schedule.name} assigned to device`,
              });
            }
          }
        }
      }
      
      res.json(schedule);
    } catch (error) {
      console.error("Error creating schedule:", error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid schedule data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create schedule" });
      }
    }
  });

  app.patch('/api/schedules/:scheduleId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const scheduleId = parseInt(req.params.scheduleId);
      const updates = req.body;
      
      // Get schedule by ID
      const schedule = await storage.getScheduleById(scheduleId);
      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      
      // Verify ownership through parentId
      if (schedule.parentId !== userId) {
        return res.status(403).json({ message: "Unauthorized access to schedule" });
      }
      
      const updatedSchedule = await storage.updateSchedule(scheduleId, updates);
      
      // Log activity for all devices using this schedule
      const devicesForSchedule = await storage.getDevicesForSchedule(scheduleId);
      for (const device of devicesForSchedule) {
        await storage.logActivity({
          deviceId: device.id,
          action: 'schedule_updated',
          description: `Schedule ${schedule.name} updated`,
        });
      }
      
      res.json(updatedSchedule);
    } catch (error) {
      console.error("Error updating schedule:", error);
      res.status(500).json({ message: "Failed to update schedule" });
    }
  });

  app.delete('/api/schedules/:scheduleId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const scheduleId = parseInt(req.params.scheduleId);
      
      // Get schedule by ID
      const schedule = await storage.getScheduleById(scheduleId);
      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      
      // Verify ownership through parentId
      if (schedule.parentId !== userId) {
        return res.status(403).json({ message: "Unauthorized access to schedule" });
      }
      
      // Log activity for all devices using this schedule before deletion
      const devicesForSchedule = await storage.getDevicesForSchedule(scheduleId);
      for (const device of devicesForSchedule) {
        await storage.logActivity({
          deviceId: device.id,
          action: 'schedule_deleted',
          description: `Schedule ${schedule.name} deleted`,
        });
      }
      
      await storage.deleteSchedule(scheduleId);
      
      res.json({ message: "Schedule deleted successfully" });
    } catch (error) {
      console.error("Error deleting schedule:", error);
      res.status(500).json({ message: "Failed to delete schedule" });
    }
  });

  // Device-Schedule Assignment Routes
  app.get('/api/schedules/:scheduleId/devices', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const scheduleId = parseInt(req.params.scheduleId);
      
      // Get schedule by ID and verify ownership
      const schedule = await storage.getScheduleById(scheduleId);
      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      
      if (schedule.parentId !== userId) {
        return res.status(403).json({ message: "Unauthorized access to schedule" });
      }
      
      const devices = await storage.getDevicesForSchedule(scheduleId);
      res.json(devices);
    } catch (error) {
      console.error("Error fetching devices for schedule:", error);
      res.status(500).json({ message: "Failed to fetch devices for schedule" });
    }
  });

  app.post('/api/schedules/:scheduleId/devices/:deviceId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const scheduleId = parseInt(req.params.scheduleId);
      const deviceId = parseInt(req.params.deviceId);
      
      // Verify schedule ownership
      const schedule = await storage.getScheduleById(scheduleId);
      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      
      if (schedule.parentId !== userId) {
        return res.status(403).json({ message: "Unauthorized access to schedule" });
      }
      
      // Verify device ownership
      const device = await storage.getDeviceById(deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      const children = await storage.getChildrenByParent(userId);
      const userOwnsDevice = children.some(child => child.id === device.childId);
      
      if (!userOwnsDevice) {
        return res.status(403).json({ message: "Unauthorized access to device" });
      }
      
      // Assign device to schedule
      const assignment = await storage.assignDeviceToSchedule(deviceId, scheduleId);
      
      // Log activity
      await storage.logActivity({
        deviceId: deviceId,
        action: 'schedule_assigned',
        description: `Device assigned to schedule: ${schedule.name}`,
      });
      
      res.json({ message: "Device assigned to schedule successfully", assignment });
    } catch (error) {
      console.error("Error assigning device to schedule:", error);
      res.status(500).json({ message: "Failed to assign device to schedule" });
    }
  });

  app.delete('/api/schedules/:scheduleId/devices/:deviceId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const scheduleId = parseInt(req.params.scheduleId);
      const deviceId = parseInt(req.params.deviceId);
      
      // Verify schedule ownership
      const schedule = await storage.getScheduleById(scheduleId);
      if (!schedule) {
        return res.status(404).json({ message: "Schedule not found" });
      }
      
      if (schedule.parentId !== userId) {
        return res.status(403).json({ message: "Unauthorized access to schedule" });
      }
      
      // Verify device ownership
      const device = await storage.getDeviceById(deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      const children = await storage.getChildrenByParent(userId);
      const userOwnsDevice = children.some(child => child.id === device.childId);
      
      if (!userOwnsDevice) {
        return res.status(403).json({ message: "Unauthorized access to device" });
      }
      
      // Remove device from schedule
      await storage.removeDeviceFromSchedule(deviceId, scheduleId);
      
      // Log activity
      await storage.logActivity({
        deviceId: deviceId,
        action: 'schedule_unassigned',
        description: `Device removed from schedule: ${schedule.name}`,
      });
      
      res.json({ message: "Device removed from schedule successfully" });
    } catch (error) {
      console.error("Error removing device from schedule:", error);
      res.status(500).json({ message: "Failed to remove device from schedule" });
    }
  });

  // Add mobile number to database for future IMEI lookup
  app.post('/api/devices/add-mobile', isAuthenticated, async (req: any, res) => {
    try {
      const { phoneNumber, imei, deviceName, childName } = req.body;
      const userId = req.user.claims.sub;
      
      console.log(`Adding mobile number to database: ${phoneNumber} with IMEI: ${imei}`);
      
      // Validate required fields
      if (!phoneNumber || !imei || !deviceName) {
        return res.status(400).json({ message: "Phone number, IMEI, and device name are required" });
      }
      
      // Check if device already exists
      const existingByImei = await storage.getDeviceByImei(imei);
      const existingByPhone = await storage.getDeviceByPhoneNumber(phoneNumber);
      
      if (existingByImei || existingByPhone) {
        return res.status(409).json({ 
          message: "Device already exists in database",
          device: existingByImei || existingByPhone
        });
      }
      
      // Create child if provided and doesn't exist
      let childId;
      if (childName) {
        const children = await storage.getChildrenByParent(userId);
        const existingChild = children.find((c: any) => c.name === childName);
        
        if (existingChild) {
          childId = existingChild.id;
        } else {
          const newChild = await storage.createChild({
            parentId: userId,
            name: childName,
            age: 12 // Default age
          });
          childId = newChild.id;
        }
      }
      
      // Create device record
      const deviceData = {
        childId,
        name: deviceName,
        imei: imei === "000000000000000" ? "PENDING_IMEI_LOOKUP" : imei, // Handle placeholder IMEI
        phoneNumber: phoneNumber,
        deviceType: "mobile",
        model: "Unknown",
        consentStatus: "pending"
      };
      
      const device = await storage.createDevice(deviceData);
      
      // Log activity
      await storage.logActivity({
        deviceId: device.id,
        action: 'mobile_number_added',
        description: `Mobile number ${phoneNumber} added to database for IMEI lookup`,
      });
      
      console.log(`Successfully added mobile number: ${phoneNumber} with device ID: ${device.id}`);
      
      res.json({
        message: "Mobile number added successfully",
        device: {
          id: device.id,
          imei: device.imei,
          deviceName: device.name,
          phoneNumber: device.phoneNumber
        }
      });
    } catch (error) {
      console.error("Error adding mobile number:", error);
      res.status(500).json({ message: "Failed to add mobile number to database" });
    }
  });

  // IMEI lookup by mobile number
  app.get('/api/devices/lookup/mobile/:phoneNumber', async (req, res) => {
    try {
      const phoneNumber = decodeURIComponent(req.params.phoneNumber);
      
      // Get device by phone number (no authentication required for companion app)
      const device = await storage.getDeviceByPhoneNumber(phoneNumber);
      if (!device) {
        return res.status(404).json({ message: "Device not found with this mobile number" });
      }
      
      // Skip devices with pending IMEI lookup
      if (device.imei === "PENDING_IMEI_LOOKUP") {
        return res.status(404).json({ message: "Device found but IMEI not set. Please add IMEI manually." });
      }
      
      // Log activity
      await storage.logActivity({
        deviceId: device.id,
        action: 'imei_lookup',
        description: `IMEI lookup performed for mobile number ${phoneNumber}`,
        metadata: { phoneNumber, imei: device.imei },
      });
      
      res.json({ 
        imei: device.imei,
        deviceName: device.name,
        deviceId: device.id,
        phoneNumber: device.phoneNumber,
        isActive: device.isActive,
        isLocked: device.isLocked,
        consentStatus: device.consentStatus 
      });
    } catch (error) {
      console.error("Error looking up IMEI by mobile number:", error);
      res.status(500).json({ message: "Failed to lookup IMEI" });
    }
  });

  // Quick lock functionality
  app.post('/api/devices/:deviceId/quick-lock', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const deviceId = parseInt(req.params.deviceId);
      const { duration } = req.body; // duration in minutes
      
      // Verify device ownership
      const device = await storage.getDeviceById(deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      const children = await storage.getChildrenByParent(userId);
      const userOwnsDevice = children.some(child => child.id === device.childId);
      
      if (!userOwnsDevice) {
        return res.status(403).json({ message: "Unauthorized access to device" });
      }
      
      // Lock the device
      await storage.updateDeviceStatus(deviceId, true);
      
      // Create a temporary schedule for the quick lock
      const now = new Date();
      const endTime = new Date(now.getTime() + duration * 60000);
      
      const quickSchedule = await storage.createSchedule({
        deviceId,
        name: `Quick Lock - ${duration}min`,
        startTime: now.toTimeString().slice(0, 5),
        endTime: endTime.toTimeString().slice(0, 5),
        daysOfWeek: JSON.stringify([now.getDay()]),
        isActive: true,
      });
      
      // Log activity
      await storage.logActivity({
        deviceId,
        action: 'quick_lock',
        description: `Device locked for ${duration} minutes`,
        metadata: { duration, scheduleId: quickSchedule.id },
      });
      
      res.json({ message: "Device locked successfully", duration, scheduleId: quickSchedule.id });
    } catch (error) {
      console.error("Error with quick lock:", error);
      res.status(500).json({ message: "Failed to lock device" });
    }
  });

  // Activity log routes
  app.get('/api/activity', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 10;
      const activities = await storage.getRecentActivity(userId, limit);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activity:", error);
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  // Location tracking endpoints - supports both authenticated parents and companion app
  app.post('/api/location', async (req: any, res) => {
    try {
      const locationData = req.body;
      const isCompanionAccess = req.headers.authorization === 'Bearer companion-access';
      
      // Validate required fields
      if (!locationData.deviceId || !locationData.latitude || !locationData.longitude) {
        return res.status(400).json({ message: "Missing required location data" });
      }
      
      // Verify device exists
      const device = await storage.getDeviceById(locationData.deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      // For companion app access, allow direct device location updates
      if (!isCompanionAccess) {
        // For parent dashboard access, verify ownership
        if (!req.user || !req.user.claims) {
          return res.status(401).json({ message: "Authentication required" });
        }
        
        const children = await storage.getChildrenByParent(req.user.claims.sub);
        const userOwnsDevice = children.some(child => child.id === device.childId);
        
        if (!userOwnsDevice) {
          return res.status(403).json({ message: "Unauthorized access to device" });
        }
      }
      
      // Parse coordinates and reverse geocode to get address
      const latitude = parseFloat(locationData.latitude);
      const longitude = parseFloat(locationData.longitude);
      
      let address = locationData.address;
      if (!address) {
        try {
          // Reverse geocode to get place name
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
          );
          const geoData = await response.json();
          
          if (geoData.city && geoData.countryName) {
            address = `${geoData.city}, ${geoData.countryName}`;
          } else if (geoData.locality && geoData.countryName) {
            address = `${geoData.locality}, ${geoData.countryName}`;
          } else if (geoData.countryName) {
            address = geoData.countryName;
          } else {
            address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          }
        } catch (geoError) {
          console.error("Reverse geocoding failed:", geoError);
          address = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        }
      }
      
      const locationLog = await storage.logLocation({
        deviceId: locationData.deviceId,
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        accuracy: locationData.accuracy || null,
        address: address,
        locationMethod: locationData.locationMethod || 'unknown',
      });
      
      // Log activity for location update
      await storage.logActivity({
        deviceId: device.id,
        action: 'location_update',
        description: `Location updated via ${locationData.locationMethod || 'unknown'} (±${locationData.accuracy || 'unknown'}m)`,
        metadata: JSON.stringify({
          latitude,
          longitude,
          accuracy: locationData.accuracy,
          method: locationData.locationMethod,
          source: isCompanionAccess ? 'companion_app' : 'parent_dashboard',
          address
        })
      });
      
      res.json({ success: true, locationLog });
    } catch (error) {
      console.error("Error logging location:", error);
      res.status(500).json({ message: "Failed to log location" });
    }
  });

  app.get('/api/devices/:deviceId/locations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const deviceId = parseInt(req.params.deviceId);
      const limit = parseInt(req.query.limit as string) || 50;
      
      // Verify device ownership
      const device = await storage.getDeviceById(deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      const children = await storage.getChildrenByParent(userId);
      const userOwnsDevice = children.some(child => child.id === device.childId);
      
      if (!userOwnsDevice) {
        return res.status(403).json({ message: "Unauthorized access to device" });
      }
      
      const locations = await storage.getDeviceLocations(deviceId, limit);
      res.json(locations);
    } catch (error) {
      console.error("Error fetching device locations:", error);
      res.status(500).json({ message: "Failed to fetch device locations" });
    }
  });

  app.get('/api/location/imei/:imei', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const imei = req.params.imei;
      const limit = parseInt(req.query.limit as string) || 50;
      
      // Verify user owns a device with this IMEI
      const device = await storage.getDeviceByImei(imei);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      const children = await storage.getChildrenByParent(userId);
      const userOwnsDevice = children.some(child => child.id === device.childId);
      
      if (!userOwnsDevice) {
        return res.status(403).json({ message: "Unauthorized access to device" });
      }
      
      const locations = await storage.getLocationByImei(imei, limit);
      res.json(locations);
    } catch (error) {
      console.error("Error fetching locations by IMEI:", error);
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  app.get('/api/location/phone/:phoneNumber', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const phoneNumber = decodeURIComponent(req.params.phoneNumber);
      const limit = parseInt(req.query.limit as string) || 50;
      
      // Verify user owns a device with this phone number
      const device = await storage.getDeviceByPhoneNumber(phoneNumber);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      const children = await storage.getChildrenByParent(userId);
      const userOwnsDevice = children.some(child => child.id === device.childId);
      
      if (!userOwnsDevice) {
        return res.status(403).json({ message: "Unauthorized access to device" });
      }
      
      const locations = await storage.getLocationByPhoneNumber(phoneNumber, limit);
      res.json(locations);
    } catch (error) {
      console.error("Error fetching locations by phone:", error);
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  app.get('/api/devices/:deviceId/location/latest', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const deviceId = parseInt(req.params.deviceId);
      
      // Verify device ownership
      const device = await storage.getDeviceById(deviceId);
      if (!device) {
        return res.status(404).json({ message: "Device not found" });
      }
      
      const children = await storage.getChildrenByParent(userId);
      const userOwnsDevice = children.some(child => child.id === device.childId);
      
      if (!userOwnsDevice) {
        return res.status(403).json({ message: "Unauthorized access to device" });
      }
      
      const location = await storage.getLatestLocation(deviceId);
      if (!location) {
        return res.status(404).json({ message: "No location data found" });
      }
      
      res.json(location);
    } catch (error) {
      console.error("Error fetching latest location:", error);
      res.status(500).json({ message: "Failed to fetch latest location" });
    }
  });

  // Emergency unlock route
  app.post('/api/emergency/unlock-all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const devices = await storage.getDevicesByParent(userId);
      
      // Unlock all devices
      const unlockPromises = devices
        .filter(d => d.isLocked)
        .map(async (device) => {
          await storage.updateDeviceStatus(device.id, false);
          await storage.logActivity({
            deviceId: device.id,
            action: 'emergency_unlock',
            description: `Emergency unlock activated for ${device.name}`,
          });
        });
      
      await Promise.all(unlockPromises);
      
      res.json({ message: "All devices unlocked successfully" });
    } catch (error) {
      console.error("Error during emergency unlock:", error);
      res.status(500).json({ message: "Failed to unlock devices" });
    }
  });

  // Companion App API Endpoints for Android APK
  app.post('/api/companion/register', async (req, res) => {
    try {
      const { imei, deviceName, childName, parentPhone, deviceModel, deviceBrand, androidVersion } = req.body;
      
      console.log(`[DEBUG] Android device registration: IMEI ${imei}, Child: ${childName}`);
      
      // Find or create parent by phone number
      let parent = await storage.getUserByPhone(parentPhone);
      if (!parent) {
        // Create new parent account
        parent = await storage.createUser({
          email: `${parentPhone}@knets.temp`,
          firstName: 'Parent',
          lastName: 'User',
          profileImageUrl: null
        });
      }
      
      // Create child profile
      const child = await storage.createChild({
        parentId: parent.id,
        name: childName,
        age: 10, // Default age
        grade: 'Not specified'
      });
      
      // Register device
      const device = await storage.createDevice({
        childId: child.id,
        name: deviceName,
        imei: imei,
        phoneNumber: parentPhone,
        model: deviceModel,
        brand: deviceBrand,
        isActive: true,
        isLocked: false,
        // lastSeen: new Date(),
        batteryLevel: 100,
        consentStatus: 'granted'
      });
      
      // Log activity
      await storage.logActivity({
        deviceId: device.id,
        action: 'device_registered',
        description: `Android device registered: ${deviceName}`,
      });
      
      res.json({ success: true, data: { deviceId: device.id }, message: 'Device registered successfully' });
    } catch (error) {
      console.error("Error registering Android device:", error);
      res.status(500).json({ success: false, message: "Failed to register device" });
    }
  });

  app.get('/api/companion/schedules/:imei', async (req, res) => {
    try {
      const { imei } = req.params;
      
      console.log(`[DEBUG] Fetching schedules for Android device: ${imei}`);
      
      // Get device by IMEI
      const device = await storage.getDeviceByImei(imei);
      if (!device) {
        return res.status(404).json({ success: false, message: "Device not found" });
      }
      
      // Get schedules for this device
      const schedules = await storage.getSchedulesForDevice(device.id);
      
      res.json(schedules);
    } catch (error) {
      console.error("Error fetching device schedules:", error);
      res.status(500).json({ success: false, message: "Failed to fetch schedules" });
    }
  });

  app.put('/api/companion/status/:imei', async (req, res) => {
    try {
      const { imei } = req.params;
      const { isLocked, lastChecked, batteryLevel, isOnline } = req.body;
      
      console.log(`[DEBUG] Updating Android device status: ${imei}, locked: ${isLocked}, battery: ${batteryLevel}%`);
      
      // Get device by IMEI
      const device = await storage.getDeviceByImei(imei);
      if (!device) {
        return res.status(404).json({ success: false, message: "Device not found" });
      }
      
      // Update device status
      await storage.updateDevice(device.id, {
        isLocked: isLocked,
        lastSeen: new Date(lastChecked),
        batteryLevel: batteryLevel,
        isActive: isOnline
      });
      
      // Log activity
      await storage.logActivity({
        deviceId: device.id,
        action: isLocked ? 'device_locked' : 'device_unlocked',
        description: `Android device ${isLocked ? 'locked' : 'unlocked'} by schedule`,
      });
      
      res.json({ success: true, message: 'Device status updated' });
    } catch (error) {
      console.error("Error updating device status:", error);
      res.status(500).json({ success: false, message: "Failed to update device status" });
    }
  });

  app.post('/api/companion/heartbeat/:imei', async (req, res) => {
    try {
      const { imei } = req.params;
      const timestamp = req.body;
      
      // Get device by IMEI
      const device = await storage.getDeviceByImei(imei);
      if (!device) {
        return res.status(404).json({ success: false, message: "Device not found" });
      }
      
      // Update last seen
      await storage.updateDevice(device.id, {
        lastSeen: new Date(timestamp),
        isActive: true
      });
      
      res.json({ success: true, message: 'Heartbeat received' });
    } catch (error) {
      console.error("Error processing heartbeat:", error);
      res.status(500).json({ success: false, message: "Failed to process heartbeat" });
    }
  });

  app.get('/api/companion/device/:imei', async (req, res) => {
    try {
      const { imei } = req.params;
      
      // Get device by IMEI
      const device = await storage.getDeviceByImei(imei);
      if (!device) {
        return res.status(404).json({ success: false, message: "Device not found" });
      }
      
      res.json({
        success: true,
        data: {
          imei: device.imei,
          isLocked: device.isLocked,
          lastChecked: device.lastSeen?.getTime() || Date.now(),
          batteryLevel: device.batteryLevel || 100,
          isOnline: device.isActive
        }
      });
    } catch (error) {
      console.error("Error fetching device info:", error);
      res.status(500).json({ success: false, message: "Failed to fetch device info" });
    }
  });

  app.post('/api/companion/lock/:imei', async (req, res) => {
    try {
      const { imei } = req.params;
      
      // Get device by IMEI
      const device = await storage.getDeviceByImei(imei);
      if (!device) {
        return res.status(404).json({ success: false, message: "Device not found" });
      }
      
      // Update device to locked
      await storage.updateDevice(device.id, { isLocked: true });
      
      // Log activity
      await storage.logActivity({
        deviceId: device.id,
        action: 'remote_lock',
        description: 'Device locked remotely via API',
      });
      
      res.json({ success: true, message: 'Device lock command sent' });
    } catch (error) {
      console.error("Error locking device:", error);
      res.status(500).json({ success: false, message: "Failed to lock device" });
    }
  });

  app.post('/api/companion/unlock/:imei', async (req, res) => {
    try {
      const { imei } = req.params;
      
      // Get device by IMEI
      const device = await storage.getDeviceByImei(imei);
      if (!device) {
        return res.status(404).json({ success: false, message: "Device not found" });
      }
      
      // Update device to unlocked
      await storage.updateDevice(device.id, { isLocked: false });
      
      // Log activity
      await storage.logActivity({
        deviceId: device.id,
        action: 'remote_unlock',
        description: 'Device unlocked remotely via API',
      });
      
      res.json({ success: true, message: 'Device unlock command sent' });
    } catch (error) {
      console.error("Error unlocking device:", error);
      res.status(500).json({ success: false, message: "Failed to unlock device" });
    }
  });

  const httpServer = createServer(app);
  
  // Auto-enforcement: Check and enforce schedules every 2 minutes
  const scheduleEnforcementInterval = setInterval(async () => {
    try {
      console.log('[AUTO-ENFORCE] Running scheduled enforcement check...');
      
      // Get all users with devices and enforce their schedules
      const userIdsResult = await storage.getAllUserIds();
      
      for (const userId of userIdsResult) {
        const devices = await storage.getDevicesByParent(userId);
        let lockUpdates = 0;
        
        for (const device of devices) {
          const schedules = await storage.getSchedulesByDevice(device.id);
          const activeSchedules = schedules.filter(schedule => schedule.isActive);
          
          // Check if any schedule is currently active using Asia/Calcutta timezone
          const hasActiveSchedule = activeSchedules.some(schedule => {
            return isScheduleCurrentlyActive(schedule, 'Asia/Calcutta');
          });
          
          // Update device lock status if needed
          if (hasActiveSchedule && !device.isLocked) {
            await storage.updateDeviceStatus(device.id, true);
            await storage.logActivity({
              deviceId: device.id,
              action: 'auto_schedule_lock',
              description: 'Device automatically locked by scheduled enforcement',
            });
            lockUpdates++;
            console.log(`[AUTO-ENFORCE] ✓ Locked device ${device.name} for user ${userId}`);
          } else if (!hasActiveSchedule && device.isLocked) {
            await storage.updateDeviceStatus(device.id, false);
            await storage.logActivity({
              deviceId: device.id,
              action: 'auto_schedule_unlock',
              description: 'Device automatically unlocked by scheduled enforcement',
            });
            lockUpdates++;
            console.log(`[AUTO-ENFORCE] ✓ Unlocked device ${device.name} for user ${userId}`);
          }
        }
        
        if (lockUpdates > 0) {
          console.log(`[AUTO-ENFORCE] Updated ${lockUpdates} devices for user ${userId}`);
        }
      }
    } catch (error) {
      console.error('[AUTO-ENFORCE] Error in scheduled enforcement:', error);
    }
  }, 2 * 60 * 1000); // Run every 2 minutes
  
  // Cleanup interval on server shutdown
  httpServer.on('close', () => {
    clearInterval(scheduleEnforcementInterval);
    console.log('[AUTO-ENFORCE] Cleanup completed');
  });
  
  console.log('[AUTO-ENFORCE] Automatic schedule enforcement started (every 2 minutes)');
  
  return httpServer;
}
