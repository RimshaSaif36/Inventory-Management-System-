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
      try {
        console.log("Uploading file from path:", req.file.path);
        
        // Check if file exists
        if (!fs.existsSync(req.file.path)) {
          console.error("File does not exist at path:", req.file.path);
          return res.status(400).json({ message: "File not found after upload" });
        }

        const result = await cloudinary.v2.uploader.upload(req.file.path, { 
          folder: "inventory_products",
          resource_type: "auto"
        });
        
        // Clean up the temporary file
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Error deleting temp file:", err);
        });
        
        console.log("Image uploaded successfully:", result.secure_url);
        return res.json({ url: result.secure_url });
      } catch (cloudinaryError) {
        console.error("Cloudinary upload error:", cloudinaryError);
        // Clean up the temporary file on error
        if (req.file?.path) {
          fs.unlink(req.file.path, (err) => {
            if (err) console.error("Error deleting temp file:", err);
          });
        }
        return res.status(500).json({ 
          message: "Image upload failed", 
          error: cloudinaryError instanceof Error ? cloudinaryError.message : "Unknown error"
        });
      }
    }

    // If sending base64 in body
    if (req.body.image) {
      try {
        console.log("Uploading base64 image");
        const base64 = req.body.image;
        const result = await cloudinary.v2.uploader.upload(base64, { 
          folder: "inventory_products",
          resource_type: "auto"
        });
        console.log("Base64 image uploaded successfully:", result.secure_url);
        return res.json({ url: result.secure_url });
      } catch (cloudinaryError) {
        console.error("Cloudinary base64 upload error:", cloudinaryError);
        return res.status(500).json({ 
          message: "Image upload failed", 
          error: cloudinaryError instanceof Error ? cloudinaryError.message : "Unknown error"
        });
      }
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

