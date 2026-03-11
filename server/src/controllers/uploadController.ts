import { Request, Response } from "express";
import cloudinary from "cloudinary";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const shouldUseCloudinary =
  process.env.USE_LOCAL_UPLOADS !== "true" &&
  Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
  Boolean(process.env.CLOUDINARY_API_KEY) &&
  Boolean(process.env.CLOUDINARY_API_SECRET);

const getUploadsDir = () => path.resolve(__dirname, "../../uploads");

const ensureUploadsDir = () => {
  const uploadsDir = getUploadsDir();
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  return uploadsDir;
};

const buildLocalUrl = (req: Request, filename: string) => {
  const host = req.get("host") || "localhost:5000";
  const protocol = req.protocol || "http";
  return `${protocol}://${host}/uploads/${filename}`;
};

const moveToLocalUploads = (req: Request, file: Express.Multer.File) => {
  ensureUploadsDir();
  const extension = path.extname(file.originalname || "");
  const safeExt = /^\.[a-zA-Z0-9]+$/.test(extension) ? extension : "";
  const finalName = `${file.filename}${safeExt}`;
  const targetPath = path.join(getUploadsDir(), finalName);
  if (file.path !== targetPath) {
    fs.renameSync(file.path, targetPath);
  }
  return buildLocalUrl(req, finalName);
};

const saveBase64Locally = (req: Request, base64: string) => {
  ensureUploadsDir();
  let data = base64;
  let extension = "png";

  // Parse optional data URL prefix to capture mime type and payload.
  const match = base64.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (match) {
    const mime = match[1];
    data = match[2];
    extension = mime.split("/")[1] || "png";
  }

  const filename = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const filePath = path.join(getUploadsDir(), filename);
  fs.writeFileSync(filePath, Buffer.from(data, "base64"));
  return buildLocalUrl(req, filename);
};

export const uploadImage = async (req: Request, res: Response) => {
  try {
    console.log("Upload request received:", {
      hasFile: !!req.file,
      hasImage: !!req.body.image,
      fileName: req.file?.filename,
      filePath: req.file?.path,
    });

    if (!req.file && !req.body.image) {
      return res.status(400).json({ message: "No image provided" });
    }

    // If using multipart form (multer), file buffer is in req.file.buffer
    if (req.file && req.file.path) {
      // If file exists, prefer Cloudinary unless disabled or unavailable.
      if (!fs.existsSync(req.file.path)) {
        console.error("File does not exist at path:", req.file.path);
        return res.status(400).json({ message: "File not found after upload" });
      }

      if (shouldUseCloudinary) {
        try {
          console.log("Uploading file from path:", req.file.path);
          const result = await cloudinary.v2.uploader.upload(req.file.path, {
            folder: "inventory_products",
            resource_type: "auto",
          });

          // Clean up the temporary file
          fs.unlink(req.file.path, (err) => {
            if (err) console.error("Error deleting temp file:", err);
          });

          console.log("Image uploaded successfully:", result.secure_url);
          return res.json({ url: result.secure_url, storage: "cloudinary" });
        } catch (cloudinaryError) {
          console.error("Cloudinary upload error, falling back to local:", cloudinaryError);
          const localUrl = moveToLocalUploads(req, req.file);
          return res.json({ url: localUrl, storage: "local" });
        }
      }

      const localUrl = moveToLocalUploads(req, req.file);
      return res.json({ url: localUrl, storage: "local" });
    }

    // If sending base64 in body
    if (req.body.image) {
      if (shouldUseCloudinary) {
        try {
          console.log("Uploading base64 image");
          const base64 = req.body.image;
          const result = await cloudinary.v2.uploader.upload(base64, {
            folder: "inventory_products",
            resource_type: "auto",
          });
          console.log("Base64 image uploaded successfully:", result.secure_url);
          return res.json({ url: result.secure_url, storage: "cloudinary" });
        } catch (cloudinaryError) {
          console.error("Cloudinary base64 upload error, falling back to local:", cloudinaryError);
          const localUrl = saveBase64Locally(req, req.body.image);
          return res.json({ url: localUrl, storage: "local" });
        }
      }

      const localUrl = saveBase64Locally(req, req.body.image);
      return res.json({ url: localUrl, storage: "local" });
    }

    return res.status(400).json({ message: "Invalid image payload" });
  } catch (error) {
    console.error("uploadImage error:", error);
    return res.status(500).json({
      message: "Image upload failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
};

