import { Router } from "express";
import { 
  createBrand, 
  getBrands, 
  getBrandById, 
  updateBrand, 
  deleteBrand 
} from "../controllers/brandController";

const router = Router();

router.get("/", getBrands);
router.get("/:brandId", getBrandById);
router.post("/", createBrand);
router.put("/:brandId", updateBrand);
router.delete("/:brandId", deleteBrand);

export default router;