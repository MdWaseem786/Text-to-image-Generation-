import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import axios from "axios";

dotenv.config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Create uploads folder if not exists
const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer storage config
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueName = Date.now() + "-" + file.originalname;
        cb(null, uniqueName);
    }
});

const upload = multer({ storage: storage });

// Test route
app.get("/", (req, res) => {
    res.send("Renovation AI Backend is running (Stable Diffusion)");
});

// Stable Diffusion generation route (text to image for now)
app.post("/generate", upload.single("image"), async (req, res) => {
    try {
        const prompt = req.body.prompt;

        if (!prompt) {
            return res.status(400).json({ error: "Prompt is required" });
        }

        const apiKey = process.env.STABILITY_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: "Stability API key not found in .env" });
        }

        const response = await axios.post(
            "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
            {
                text_prompts: [
                    { text: prompt }
                ],
                cfg_scale: 7,
                height: 1024,
                width: 1024,
                samples: 1,
                steps: 30
            },
            {
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                }
            }
        );

        const base64Image = response.data.artifacts[0].base64;

// Convert base64 to buffer and save as image file
const imageBuffer = Buffer.from(base64Image, "base64");
const outputPath = "output.png";
fs.writeFileSync(outputPath, imageBuffer);

res.json({
    success: true,
    message: "Image generated and saved successfully",
    file: outputPath
});

    } catch (error) {
        console.error("Error generating image:", error.response?.data || error.message);
        res.status(500).json({ error: "Stable Diffusion generation failed" });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
