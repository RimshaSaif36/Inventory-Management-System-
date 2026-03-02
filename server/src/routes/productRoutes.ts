import { Router } from "express";
import multer from "multer";
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../controllers/productController";
import { uploadImage } from "../controllers/uploadController";

// Configure multer with file size and type validation
const upload = multer({
  dest: "./uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

const router = Router();

router.get("/", getProducts);
router.get("/:productId", getProductById);
router.post("/", createProduct);
router.post("/upload", upload.single("image"), uploadImage);
router.put("/:productId", updateProduct);
router.delete("/:productId", deleteProduct);

export default router;
