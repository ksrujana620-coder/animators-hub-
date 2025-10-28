import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";

// middleware
app.use(cors());
app.use(express.json());

// ✅ Ensure uploads folder exists
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ✅ Configure multer (file upload)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const safeName = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
    cb(null, safeName);
  }
});
const upload = multer({ storage });

// ✅ Health check
app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Backend running fine!" });
});


 // 📤 File upload (with user info)
app.post("/api/upload", upload.single("file"), (req, res) => {
  const { userEmail } = req.body; // coming from frontend

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const fileUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;
  const newFile = {
    name: req.file.originalname,
    storedName: req.file.filename,
    size: req.file.size,
    type: req.file.mimetype,
    url: fileUrl,
    userEmail: userEmail || "unknown" // fallback
  };

  // Save info to a JSON file (temporary database)
  const dbPath = path.join(process.cwd(), "filedb.json");
  let db = [];
  if (fs.existsSync(dbPath)) db = JSON.parse(fs.readFileSync(dbPath));
  db.push(newFile);
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

  res.json({ message: "File uploaded successfully", file: newFile });
});



// ✅ List all uploaded files
app.get("/api/files", (req, res) => {
  try {
    const files = fs.readdirSync(UPLOAD_DIR).map(fileName => {
      const filePath = path.join(UPLOAD_DIR, fileName);
      const stats = fs.statSync(filePath);
      return {
        name: fileName,
        size: stats.size,
        type: getMimeType(fileName),
        url: `http://localhost:${PORT}/uploads/${fileName}`
      };
    });
    res.json(files);
  } catch (err) {
    console.error("Error reading files:", err);
    res.status(500).json({ error: "Unable to list files" });
  }
});

// ✅ Delete file route
app.delete("/api/delete/:name", (req, res) => {
  const fileName = req.params.name;
  const filePath = path.join(process.cwd(), UPLOAD_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "File not found" });
  }

  fs.unlinkSync(filePath);
  res.json({ message: "File deleted successfully" });
});

// ✅ Serve uploaded files
import path from "path";
import mime from "mime-types";

const __dirname = path.resolve();

// Serve uploaded files with correct MIME type
app.get("/uploads/:filename", (req, res) => {
  const filePath = path.join(__dirname, "uploads", req.params.filename);
  const mimeType = mime.lookup(filePath) || "application/octet-stream";
  res.setHeader("Content-Type", mimeType);
  res.sendFile(filePath);
});

// ✅ Serve uploaded files (supports video streaming)
app.get("/uploads/:fileName", (req, res) => {
  const filePath = path.join(UPLOAD_DIR, req.params.fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send("File not found");
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // 🎞️ Handle video range requests for streaming
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    const head = {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize,
      "Content-Type": getMimeType(filePath),
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      "Content-Length": fileSize,
      "Content-Type": getMimeType(filePath),
    };
    res.writeHead(200, head);
    fs.createReadStream(filePath).pipe(res);
  }
});

// ✅ Helper to detect file type
function getMimeType(fileName) {
  const ext = fileName.split(".").pop().toLowerCase();
  if (["mp4", "mov", "webm"].includes(ext)) return "video/" + ext;
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image/" + ext;
  if (["pdf"].includes(ext)) return "application/pdf";
  if (["zip", "rar"].includes(ext)) return "application/zip";
  return "application/octet-stream";
}


// ✅ Start server
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
// --- Simple in-memory user authentication (temporary for MVP) ---
const users = []; // store users in memory

// 📝 Signup route
app.post("/api/signup", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ error: "User already exists" });
  }

  const newUser = {
    id: users.length + 1,
    name,
    email,
    password // ⚠️ plain text (for MVP only)
  };
  users.push(newUser);

  console.log("✅ New user registered:", newUser);
  res.json({
    message: "Signup successful",
    user: { id: newUser.id, name: newUser.name, email: newUser.email }
  });
});

// 🔐 Login route
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  console.log("✅ User logged in:", user.email);
  res.json({
    message: "Login successful",
    user: { id: user.id, name: user.name, email: user.email }
  });
});
// 📂 Get files for logged-in user
app.get("/api/myfiles/:email", (req, res) => {
  const userEmail = req.params.email;
  const dbPath = path.join(process.cwd(), "filedb.json");

  if (!fs.existsSync(dbPath)) return res.json([]);
  const db = JSON.parse(fs.readFileSync(dbPath));

  const userFiles = db.filter(f => f.userEmail === userEmail);
  res.json(userFiles);
});
// 📝 Feedback route
app.post("/api/feedback/:name", (req, res) => {
  const { name } = req.params;
  const { user, rating, text } = req.body;

  if (!user || !rating || !text)
    return res.status(400).json({ error: "Missing fields" });

  const file = files.find(f => f.storedName === name || f.name === name);
  if (!file) return res.status(404).json({ error: "File not found" });

  file.feedback = file.feedback || [];
  file.feedback.push({ user, rating, text, date: new Date() });
  res.json({ message: "Feedback added", feedback: file.feedback });
});

