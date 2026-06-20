const express = require("express");
const router = express.Router();
const { upload, cloudinary, hasCloudinary } = require("../middleware/upload");
const { protect } = require("../middleware/authMiddleware");

router.post("/images", protect, (req, res) => {
  const uploadArray = upload.array("images", 5);

  uploadArray(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }

    try {
      const uploadResults = [];

      if (hasCloudinary) {
        for (const file of req.files) {
          const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              { folder: "asap_parking" },
              (error, result) => {
                if (error) return reject(error);
                resolve(result);
              }
            );
            uploadStream.end(file.buffer);
          });
          uploadResults.push({
            url: result.secure_url,
            public_id: result.public_id
          });
        }
      } else {
        const host = req.get("host");
        const protocol = req.protocol;
        for (const file of req.files) {
          const localUrl = `${protocol}://${host}/uploads/${file.filename}`;
          uploadResults.push({
            url: localUrl,
            public_id: `local_${file.filename}`
          });
        }
      }

      res.status(200).json(uploadResults);
    } catch (uploadError) {
      console.error(uploadError);
      res.status(500).json({ message: "Upload failed", error: uploadError.message });
    }
  });
});

module.exports = router;
