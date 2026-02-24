import { Router } from "express";
import { getUsers, getCurrentUser } from "../controllers/userController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

router.get("/me", getCurrentUser);
router.get("/", getUsers);

export default router;
