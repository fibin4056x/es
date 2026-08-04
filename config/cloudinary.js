import { v2 as cloudinary } from "cloudinary";

/* =========================================
   VALIDATE ENVIRONMENT VARIABLES
========================================= */

if (
  !process.env.cloud_name ||
  !process.env.cloudinary_api_key ||
  !process.env.cloudinary_api_secret
) {
  throw new Error(
    "Cloudinary environment variables are missing."
  );
}

/* =========================================
   CLOUDINARY CONFIGURATION
========================================= */

cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.cloudinary_api_key,
  api_secret: process.env.cloudinary_api_secret,
  secure: true,
});

export default cloudinary;