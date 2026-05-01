import { Router } from "express";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
} from "../controllers/userController.js";

const router = Router();

router.get("/", getUsers);
router.get("/:id", getUserById);
router.post("/", createUser);
router.put("/:id", updateUser);

export default router;
