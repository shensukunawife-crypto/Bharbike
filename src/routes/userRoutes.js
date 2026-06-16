import { Router } from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  initializeUserData,
  getAssignedBike,
} from "../controllers/userController.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(getUsers));
router.get("/:id", asyncHandler(getUserById));
router.post("/", asyncHandler(createUser));
router.get("/:id/assigned-bike", asyncHandler(getAssignedBike));
router.post("/initialize", asyncHandler(initializeUserData));
router.put("/:id", asyncHandler(updateUser));

export default router;
