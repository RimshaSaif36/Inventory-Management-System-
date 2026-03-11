import { Router } from "express";
import { getUsers, getCurrentUser, createUser, updateCurrentUser } from "../controllers/userController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

router.get("/me", getCurrentUser);
router.put("/me", updateCurrentUser);
router.get("/", getUsers);
router.post("/", createUser);

export default router;
