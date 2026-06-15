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

// User Governance
router.get("/users", requirePermission("manage_users"), adminController.users);
router.get("/users/:userId", requirePermission("manage_users"), adminController.userProfile);
router.get("/kyc-documents", requirePermission("manage_users"), adminController.kycDocumentsPage);
router.post("/kyc-documents/:docId/status", requirePermission("manage_users"), adminController.kycUpdateStatus);

router.post("/users/add", requirePermission("manage_users"), adminController.addUser);
router.post("/users/:userId/edit", requirePermission("manage_users"), adminController.editUser);
router.post("/users/:userId/block", requirePermission("manage_users"), adminController.blockUser);

// Vehicle & Fleet Control
router.get("/bikes", requirePermission("manage_bikes"), adminController.bikes);
router.get("/hubs", requirePermission("manage_bikes"), adminController.hubsPage);
router.get("/bikes/export/excel", requirePermission("manage_bikes"), adminController.exportBikesExcel);
router.get("/bikes/export/pdf", requirePermission("manage_bikes"), adminController.exportBikesPDF);
router.get("/bikes/:bikeId", requirePermission("manage_bikes"), adminController.bikeDetails);
router.get("/maintenance", requirePermission("manage_bikes"), adminController.maintenance);
router.post("/bikes/add", requirePermission("manage_bikes"), adminController.addBike);
router.post("/bikes/:bikeId/assign", requirePermission("manage_bikes"), adminController.assignBike);
router.post("/bikes/:bikeId/maintenance", requirePermission("manage_bikes"), adminController.sendBikeToMaintenance);
router.post("/bikes/:bikeId/disable", requirePermission("manage_bikes"), adminController.disableBike);
router.post("/bikes/:bikeId/lock", requirePermission("manage_bikes"), adminController.adminLockBike);
router.post("/bikes/:bikeId/unlock", requirePermission("manage_bikes"), adminController.adminUnlockBike);
router.post("/bikes/:bikeId/link-gps", requirePermission("manage_bikes"), adminController.linkGpsTracker);
router.post("/maintenance/:bikeId/fixed", requirePermission("manage_bikes"), adminController.markBikeFixed);
router.post("/maintenance/add", requirePermission("manage_bikes"), adminController.addMaintenanceTicket);
router.post("/maintenance/:ticketId/status", requirePermission("manage_bikes"), adminController.updateMaintenanceStatus);
router.post("/maintenance/:ticketId/remove", requirePermission("manage_bikes"), adminController.removeMaintenanceTicket);

// Operations & Orders
router.get("/orders", requirePermission("manage_orders"), adminController.orders);
router.get("/bookings", requirePermission("manage_orders"), adminController.bookingsPage);
router.get("/orders/:orderId", requirePermission("manage_orders"), adminController.orderDetails);
router.get("/delivery-partners", requirePermission("manage_orders"), adminController.deliveryPartners);
router.get("/delivery-partners/:partnerId", requirePermission("manage_orders"), adminController.deliveryPartnerProfile);
router.get("/skipped-days", requirePermission("manage_orders"), adminController.skippedDaysPage);
router.post("/orders/:orderId/accept", requirePermission("manage_orders"), adminController.acceptOrder);
router.post("/orders/:orderId/reject", requirePermission("manage_orders"), adminController.rejectOrder);
router.post("/orders/:orderId/assign", requirePermission("manage_orders"), adminController.assignOrder);
router.post("/orders/:orderId/ongoing", requirePermission("manage_orders"), adminController.markOrderOngoing);
router.post("/orders/:orderId/complete", requirePermission("manage_orders"), adminController.markOrderCompleted);
router.post("/delivery/:userId/approve", requirePermission("manage_orders"), adminController.approvePartner);
router.post("/delivery/:userId/reject", requirePermission("manage_orders"), adminController.rejectPartner);
router.post("/delivery/:userId/toggle-online", requirePermission("manage_orders"), adminController.togglePartnerOnline);
router.post("/delivery/:userId/assign", requirePermission("manage_orders"), adminController.assignOrderToPartner);
router.post("/delivery/:userId/disable", requirePermission("manage_orders"), adminController.disablePartner);
router.post("/bookings/:bookingId/complete", requirePermission("manage_orders"), adminController.completeBooking);
router.post("/bookings/:bookingId/cancel", requirePermission("manage_orders"), adminController.cancelBooking);

// Finance & Analytics
router.get("/earnings", requirePermission("manage_finance"), adminController.earnings);
router.get("/earnings/export/excel", requirePermission("manage_finance"), adminController.exportEarningsExcel);
router.get("/earnings/export/pdf", requirePermission("manage_finance"), adminController.exportEarningsPDF);
router.get("/analytics", requirePermission("manage_finance"), adminController.analytics);
router.get("/payments", requirePermission("manage_finance"), adminController.paymentsPage);
router.post("/earnings/payout/:payoutId/release", requirePermission("manage_finance"), adminController.releasePayout);
router.post("/promo/add", requirePermission("manage_finance"), adminController.addPromoCode);
router.post("/promo/:promoId/toggle", requirePermission("manage_finance"), adminController.togglePromoCode);
router.post("/promo/:promoId/delete", requirePermission("manage_finance"), adminController.deletePromoCode);

// Engagement & Support
router.get("/support", requirePermission("manage_support"), adminController.supportPage);
router.get("/notifications", requirePermission("manage_support"), adminController.notificationsPage);
router.post("/notifications/send", requirePermission("manage_support"), adminController.sendNotification);
router.post("/support/:ticketId/convert", requirePermission("manage_support"), adminController.convertSupportToMaintenance);
router.get("/support/ticket/:ticketId/messages", requirePermission("manage_support"), adminController.getSupportMessages);
router.post("/support/ticket/:ticketId/messages", requirePermission("manage_support"), adminController.sendSupportMessage);

// Ads & Banners Management
router.get("/ads", requirePermission("manage_support"), adminController.adsPage);
router.post("/ads/add", requirePermission("manage_support"), adminController.addAd);
router.post("/ads/save-socials", requirePermission("manage_support"), adminController.saveSocials);
router.post("/ads/:id/toggle", requirePermission("manage_support"), adminController.toggleAd);
router.post("/ads/:id/delete", requirePermission("manage_support"), adminController.deleteAd);

// System Settings
router.get("/settings", requirePermission("manage_settings"), adminController.settingsPage);
router.post("/settings/save", requirePermission("manage_settings"), adminController.saveSettings);
router.get("/sql-editor", requirePermission("manage_settings"), adminController.sqlEditorPage);
router.post("/sql-editor/run", requirePermission("manage_settings"), adminController.runSqlQuery);

// Sub-Admins Management
router.get("/admins", requirePermission("manage_admins"), adminController.adminsPage);
router.post("/admins/add", requirePermission("manage_admins"), adminController.addAdmin);
router.post("/admins/:id/edit", requirePermission("manage_admins"), adminController.editAdmin);
router.post("/admins/:id/toggle", requirePermission("manage_admins"), adminController.toggleAdmin);
export default router;
