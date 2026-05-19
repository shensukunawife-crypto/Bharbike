import { Router } from "express";
import * as adminController from "../controllers/adminController.js";
import { adminLoginPage } from "../../controllers/adminAuthController.js";
import { requireAdminAuth, requirePermission } from "../middleware/adminAuth.js";

const router = Router();

router.get("/login", adminLoginPage);
/** Docs UI — registered before auth middleware so Express stack always matches this path */
router.get("/system-workflow", adminController.systemWorkflowPage);
router.use(requireAdminAuth);

router.get("/", adminController.dashboard);
router.get("/dashboard", adminController.dashboard);
router.get("/operations", adminController.operationsDashboard);
router.get("/backend", adminController.backendMonitor);
router.get("/activity-logs", adminController.activityLogsPage);
router.get("/users", adminController.users);
router.get("/users/:userId", adminController.userProfile);
router.get("/bikes", adminController.bikes);
router.get("/bikes/:bikeId", adminController.bikeDetails);
router.get("/orders", adminController.orders);
router.get("/bookings", adminController.bookingsPage);
router.get("/kyc-documents", adminController.kycDocumentsPage);
router.get("/orders/:orderId", adminController.orderDetails);
router.get("/delivery-partners", adminController.deliveryPartners);
router.get("/delivery-partners/:partnerId", adminController.deliveryPartnerProfile);
router.get("/earnings", adminController.earnings);
router.get("/analytics", adminController.analytics);
router.get("/maintenance", adminController.maintenance);
router.get("/support", adminController.supportPage);
router.get("/notifications", adminController.notificationsPage);
router.get("/payments", adminController.paymentsPage);
router.get("/settings", adminController.settingsPage);
router.get("/skipped-days", adminController.skippedDaysPage);

router.post("/users/add", adminController.addUser);
router.post("/users/:userId/edit", adminController.editUser);
router.post("/users/:userId/block", adminController.blockUser);
router.post("/bikes/add", adminController.addBike);
router.post("/bikes/:bikeId/assign", adminController.assignBike);
router.post("/bikes/:bikeId/maintenance", adminController.sendBikeToMaintenance);
router.post("/bikes/:bikeId/disable", adminController.disableBike);
router.post("/bikes/:bikeId/lock", adminController.adminLockBike);
router.post("/bikes/:bikeId/unlock", adminController.adminUnlockBike);
router.post("/orders/:orderId/accept", adminController.acceptOrder);
router.post("/orders/:orderId/reject", adminController.rejectOrder);
router.post("/orders/:orderId/assign", adminController.assignOrder);
router.post("/orders/:orderId/ongoing", adminController.markOrderOngoing);
router.post("/orders/:orderId/complete", adminController.markOrderCompleted);
router.post("/delivery/:userId/approve", adminController.approvePartner);
router.post("/delivery/:userId/reject", adminController.rejectPartner);
router.post("/delivery/:userId/toggle-online", adminController.togglePartnerOnline);
router.post("/delivery/:userId/assign", adminController.assignOrderToPartner);
router.post("/delivery/:userId/disable", adminController.disablePartner);
router.post("/maintenance/:bikeId/fixed", adminController.markBikeFixed);
router.post("/maintenance/add", adminController.addMaintenanceTicket);
router.post("/maintenance/:ticketId/status", adminController.updateMaintenanceStatus);
router.post("/maintenance/:ticketId/remove", adminController.removeMaintenanceTicket);
router.post("/support/:ticketId/convert", adminController.convertSupportToMaintenance);
router.post("/notifications/send", adminController.sendNotification);
router.post("/earnings/payout/:payoutId/release", adminController.releasePayout);
router.post("/settings/save", adminController.saveSettings);

// Booking actions
router.post("/bookings/:bookingId/complete", adminController.completeBooking);
router.post("/bookings/:bookingId/cancel", adminController.cancelBooking);

// Promo Code management
router.post("/promo/add", adminController.addPromoCode);
router.post("/promo/:promoId/toggle", adminController.togglePromoCode);
router.post("/promo/:promoId/delete", adminController.deletePromoCode);

// Sub-Admins Management
router.get("/admins", requirePermission("manage_admins"), adminController.adminsPage);
router.post("/admins/add", requirePermission("manage_admins"), adminController.addAdmin);
router.post("/admins/:id/edit", requirePermission("manage_admins"), adminController.editAdmin);
router.post("/admins/:id/toggle", requirePermission("manage_admins"), adminController.toggleAdmin);
export default router;
