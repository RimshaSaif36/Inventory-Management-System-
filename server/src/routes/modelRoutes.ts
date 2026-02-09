import { Router } from "express";
import { 
  createModel, 
  getModels, 
  getModelById, 
  updateModel, 
  deleteModel 
} from "../controllers/modelController";

const router = Router();

router.get("/", getModels);
router.get("/:modelId", getModelById);
router.post("/", createModel);
router.put("/:modelId", updateModel);
router.delete("/:modelId", deleteModel);

export default router;