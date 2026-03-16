import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import archiver from "archiver";
import pool from "./db.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "-");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const upload = multer({ storage });

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

const mapFileRow = (row) => ({
  id: String(row.id),
  data: {
    userId: String(row.user_id),
    folderId: row.folder_id ? String(row.folder_id) : null,
    filename: row.filename,
    fileURL: row.file_url,
    relativePath: row.relative_path || null,
    size: Number(row.size || 0),
    contentType: row.content_type,
    starred: Boolean(row.starred),
    timestamp: {
      seconds: Math.floor(new Date(row.created_at).getTime() / 1000),
    },
  },
});

const mapFolderRow = (row) => ({
  id: String(row.id),
  userId: String(row.user_id),
  parentId: row.parent_id ? String(row.parent_id) : null,
  name: row.name,
  totalSize: Number(row.total_size || 0),
  lastModified: row.last_modified || row.created_at,
  createdAt: row.created_at,
});

const initializeDatabase = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        photo TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_users_email (email)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS folders (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT NOT NULL,
        parent_id BIGINT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_folders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_folders_parent FOREIGN KEY (parent_id) REFERENCES folders(id) ON DELETE CASCADE,
        UNIQUE KEY uq_folder_name_per_parent (user_id, parent_id, name)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS files (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT NOT NULL,
        folder_id BIGINT NULL,
        filename VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        relative_path TEXT NULL,
        size BIGINT NOT NULL DEFAULT 0,
        content_type VARCHAR(255) NULL,
        starred TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_files_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_files_folder FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS trash (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT NOT NULL,
        filename VARCHAR(255) NOT NULL,
        file_url TEXT NOT NULL,
        size BIGINT NOT NULL DEFAULT 0,
        content_type VARCHAR(255) NULL,
        starred TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_trash_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    const [passwordColumn] = await pool.query("SHOW COLUMNS FROM users LIKE 'password_hash'");
    if (passwordColumn.length === 0) {
      await pool.query("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL AFTER email");
      await pool.query("UPDATE users SET password_hash = '' WHERE password_hash IS NULL");
      await pool.query("ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NOT NULL");
    }

    const [emailColumn] = await pool.query("SHOW COLUMNS FROM users LIKE 'email'");
    if (emailColumn.length > 0 && emailColumn[0].Null === "YES") {
      await pool.query("UPDATE users SET email = CONCAT('legacy-', id, '@local.dev') WHERE email IS NULL OR email = ''");
      await pool.query("ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NOT NULL");
    }

    const [folderIdColumn] = await pool.query("SHOW COLUMNS FROM files LIKE 'folder_id'");
    if (folderIdColumn.length === 0) {
      await pool.query("ALTER TABLE files ADD COLUMN folder_id BIGINT NULL AFTER user_id");
      await pool.query(
        "ALTER TABLE files ADD CONSTRAINT fk_files_folder FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE SET NULL"
      );
    }

    const [relativePathColumn] = await pool.query("SHOW COLUMNS FROM files LIKE 'relative_path'");
    if (relativePathColumn.length === 0) {
      await pool.query("ALTER TABLE files ADD COLUMN relative_path TEXT NULL AFTER file_url");
    }

    console.log("Database initialized.");
  } catch (error) {
    console.error("Database initialization failed:", error.message);
  }
};

const findOrCreateFolder = async (userId, parentId, name) => {
  const [existing] = await pool.query(
    `SELECT id FROM folders
     WHERE user_id = ? AND name = ? AND ((parent_id IS NULL AND ? IS NULL) OR parent_id = ?)
     LIMIT 1`,
    [userId, name, parentId || null, parentId || null]
  );

  if (existing.length > 0) {
    return existing[0].id;
  }

  const [result] = await pool.query(
    "INSERT INTO folders (user_id, parent_id, name) VALUES (?, ?, ?)",
    [userId, parentId || null, name]
  );
  return result.insertId;
};

const parseRelativePaths = (rawValue) => {
  if (!rawValue) {
    return [];
  }

  if (Array.isArray(rawValue)) {
    return rawValue;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    try {
      const normalized = String(rawValue).replace(/\\"/g, '"');
      return JSON.parse(normalized);
    } catch {
      return [];
    }
  }
};

const sanitizeZipName = (name) =>
  String(name || "folder")
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim();

const getUploadPathFromUrl = (fileUrl) => {
  const uploadToken = "/uploads/";
  const index = String(fileUrl || "").indexOf(uploadToken);
  if (index < 0) {
    return null;
  }
  const fileName = decodeURIComponent(String(fileUrl).slice(index + uploadToken.length));
  return path.join(uploadsDir, fileName);
};

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/signup", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "name, email and password are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  try {
    const [existing] = await pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    if (existing.length > 0) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const photo = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;

    const [insertResult] = await pool.query(
      "INSERT INTO users (name, email, password_hash, photo) VALUES (?, ?, ?, ?)",
      [name, email, passwordHash, photo]
    );

    return res.status(201).json({
      id: String(insertResult.insertId),
      name,
      email,
      photo,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to create account" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "email and password are required" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, photo, password_hash FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const user = rows[0];
    const isValid = await bcrypt.compare(password, user.password_hash || "");
    if (!isValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    return res.json({
      id: String(user.id),
      name: user.name,
      email: user.email,
      photo: user.photo,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to login" });
  }
});

app.get("/api/files", async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: "userId is required" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT * FROM files WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );

    return res.json(rows.map(mapFileRow));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch files" });
  }
});

app.get("/api/drive", async (req, res) => {
  const { userId, parentId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: "userId is required" });
  }

  try {
    let folderRows;
    let fileRows;

    if (!parentId) {
      [folderRows] = await pool.query(
        `SELECT f.*, COALESCE(SUM(fi.size), 0) AS total_size, MAX(fi.created_at) AS last_modified
         FROM folders f
         LEFT JOIN files fi ON fi.folder_id = f.id
         WHERE f.user_id = ? AND f.parent_id IS NULL
         GROUP BY f.id
         ORDER BY f.name ASC`,
        [userId]
      );
      [fileRows] = await pool.query(
        "SELECT * FROM files WHERE user_id = ? AND folder_id IS NULL ORDER BY created_at DESC",
        [userId]
      );
    } else {
      [folderRows] = await pool.query(
        `SELECT f.*, COALESCE(SUM(fi.size), 0) AS total_size, MAX(fi.created_at) AS last_modified
         FROM folders f
         LEFT JOIN files fi ON fi.folder_id = f.id
         WHERE f.user_id = ? AND f.parent_id = ?
         GROUP BY f.id
         ORDER BY f.name ASC`,
        [userId, parentId]
      );
      [fileRows] = await pool.query(
        "SELECT * FROM files WHERE user_id = ? AND folder_id = ? ORDER BY created_at DESC",
        [userId, parentId]
      );
    }

    return res.json({
      folders: folderRows.map(mapFolderRow),
      files: fileRows.map(mapFileRow),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch drive items" });
  }
});

app.get("/api/folders/:id/path", async (req, res) => {
  const { userId } = req.query;
  const folderId = req.params.id;

  if (!userId) {
    return res.status(400).json({ message: "userId is required" });
  }

  try {
    const breadcrumbs = [];
    let currentId = folderId;

    while (currentId) {
      const [rows] = await pool.query(
        "SELECT id, name, parent_id FROM folders WHERE id = ? AND user_id = ? LIMIT 1",
        [currentId, userId]
      );
      if (rows.length === 0) {
        break;
      }
      breadcrumbs.unshift({ id: String(rows[0].id), name: rows[0].name });
      currentId = rows[0].parent_id;
    }

    return res.json(breadcrumbs);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch folder path" });
  }
});

app.post("/api/folders", async (req, res) => {
  const { userId, parentId, name } = req.body;

  if (!userId || !name) {
    return res.status(400).json({ message: "userId and name are required" });
  }

  try {
    const folderId = await findOrCreateFolder(userId, parentId || null, name);
    const [rows] = await pool.query("SELECT * FROM folders WHERE id = ? LIMIT 1", [folderId]);
    return res.status(201).json(mapFolderRow(rows[0]));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to create folder" });
  }
});

app.post("/api/files", upload.single("file"), async (req, res) => {
  const { userId, folderId, relativePath } = req.body;

  if (!req.file) {
    return res.status(400).json({ message: "File is required" });
  }

  if (!userId) {
    return res.status(400).json({ message: "userId is required" });
  }

  try {
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    const [result] = await pool.query(
      "INSERT INTO files (user_id, folder_id, filename, file_url, relative_path, size, content_type, starred) VALUES (?, ?, ?, ?, ?, ?, ?, 0)",
      [
        userId,
        folderId || null,
        req.file.originalname,
        fileUrl,
        relativePath || null,
        req.file.size || 0,
        req.file.mimetype || null,
      ]
    );

    const [rows] = await pool.query("SELECT * FROM files WHERE id = ? LIMIT 1", [result.insertId]);

    return res.status(201).json(mapFileRow(rows[0]));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to upload file" });
  }
});

app.post("/api/files/folder", upload.array("files"), async (req, res) => {
  const { userId, parentId } = req.body;

  if (!userId) {
    return res.status(400).json({ message: "userId is required" });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "At least one file is required" });
  }

  try {
    const relativePaths = parseRelativePaths(req.body.relativePaths);
    const folderCache = new Map();

    for (let i = 0; i < req.files.length; i += 1) {
      const file = req.files[i];
      const relativePath = relativePaths[i] || file.originalname;
      const parts = relativePath.split("/").filter(Boolean);
      const fileName = parts[parts.length - 1];
      const dirs = parts.slice(0, -1);

      let currentParentId = parentId || null;
      let cacheKey = String(currentParentId || "root");

      for (const dir of dirs) {
        const key = `${cacheKey}/${dir}`;
        if (!folderCache.has(key)) {
          const id = await findOrCreateFolder(userId, currentParentId, dir);
          folderCache.set(key, id);
        }
        currentParentId = folderCache.get(key);
        cacheKey = key;
      }

      const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${file.filename}`;
      await pool.query(
        "INSERT INTO files (user_id, folder_id, filename, file_url, relative_path, size, content_type, starred) VALUES (?, ?, ?, ?, ?, ?, ?, 0)",
        [
          userId,
          currentParentId,
          fileName,
          fileUrl,
          relativePath,
          file.size || 0,
          file.mimetype || null,
        ]
      );
    }

    return res.status(201).json({ message: "Folder uploaded successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to upload folder" });
  }
});

app.get("/api/folders/:id/download", async (req, res) => {
  const folderId = req.params.id;
  const { userId } = req.query;

  if (!folderId || !userId) {
    return res.status(400).json({ message: "folderId and userId are required" });
  }

  try {
    const [folderRows] = await pool.query(
      "SELECT id, name FROM folders WHERE id = ? AND user_id = ? LIMIT 1",
      [folderId, userId]
    );

    if (folderRows.length === 0) {
      return res.status(404).json({ message: "Folder not found" });
    }

    const rootFolderName = sanitizeZipName(folderRows[0].name) || "folder";
    const [treeRows] = await pool.query(
      `WITH RECURSIVE folder_tree AS (
        SELECT id, parent_id, name, CAST('' AS CHAR(2000)) AS relative_folder_path
        FROM folders
        WHERE id = ? AND user_id = ?
        UNION ALL
        SELECT f.id,
               f.parent_id,
               f.name,
               CASE
                 WHEN ft.relative_folder_path = '' THEN f.name
                 ELSE CONCAT(ft.relative_folder_path, '/', f.name)
               END AS relative_folder_path
        FROM folders f
        INNER JOIN folder_tree ft ON f.parent_id = ft.id
        WHERE f.user_id = ?
      )
      SELECT id, relative_folder_path FROM folder_tree`,
      [folderId, userId, userId]
    );

    const folderPathMap = new Map(treeRows.map((row) => [String(row.id), row.relative_folder_path || ""]));
    const folderIds = treeRows.map((row) => row.id);

    const [fileRows] = await pool.query(
      "SELECT folder_id, filename, file_url FROM files WHERE user_id = ? AND folder_id IN (?)",
      [userId, folderIds]
    );

    const archiveName = `${rootFolderName}.zip`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${archiveName}"`);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (error) => {
      console.error(error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to create folder zip" });
      } else {
        res.end();
      }
    });

    archive.pipe(res);
    archive.append("", { name: `${rootFolderName}/` });

    for (const row of fileRows) {
      const diskPath = getUploadPathFromUrl(row.file_url);
      if (!diskPath || !fs.existsSync(diskPath)) {
        continue;
      }

      const folderPath = folderPathMap.get(String(row.folder_id)) || "";
      const relativeFilePath = folderPath
        ? `${rootFolderName}/${folderPath}/${row.filename}`
        : `${rootFolderName}/${row.filename}`;
      archive.file(diskPath, { name: relativeFilePath });
    }

    await archive.finalize();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to download folder" });
  }
});

app.delete("/api/folders/:id", async (req, res) => {
  const folderId = req.params.id;
  const { userId } = req.query;

  if (!folderId || !userId) {
    return res.status(400).json({ message: "folderId and userId are required" });
  }

  try {
    const [existing] = await pool.query(
      "SELECT id FROM folders WHERE id = ? AND user_id = ? LIMIT 1",
      [folderId, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: "Folder not found" });
    }

    const [treeRows] = await pool.query(
      `WITH RECURSIVE folder_tree AS (
        SELECT id
        FROM folders
        WHERE id = ? AND user_id = ?
        UNION ALL
        SELECT f.id
        FROM folders f
        INNER JOIN folder_tree ft ON f.parent_id = ft.id
        WHERE f.user_id = ?
      )
      SELECT id FROM folder_tree`,
      [folderId, userId, userId]
    );

    const folderIds = treeRows.map((row) => row.id);

    if (folderIds.length > 0) {
      const [fileRows] = await pool.query(
        "SELECT file_url FROM files WHERE user_id = ? AND folder_id IN (?)",
        [userId, folderIds]
      );

      await pool.query("DELETE FROM files WHERE user_id = ? AND folder_id IN (?)", [
        userId,
        folderIds,
      ]);

      await pool.query("DELETE FROM folders WHERE user_id = ? AND id IN (?)", [
        userId,
        folderIds,
      ]);

      for (const row of fileRows) {
        const filePath = getUploadPathFromUrl(row.file_url);
        if (filePath && fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    }

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to delete folder" });
  }
});

app.delete("/api/files/:id", async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM files WHERE id = ?", [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "File not found" });
    }

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to delete file" });
  }
});

app.patch("/api/files/:id/star", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT starred FROM files WHERE id = ? LIMIT 1", [req.params.id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "File not found" });
    }

    const nextStar = rows[0].starred ? 0 : 1;
    await pool.query("UPDATE files SET starred = ? WHERE id = ?", [nextStar, req.params.id]);

    return res.json({ starred: Boolean(nextStar) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to update starred status" });
  }
});

app.get("/api/trash", async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ message: "userId is required" });
  }

  try {
    const [rows] = await pool.query(
      "SELECT * FROM trash WHERE user_id = ? ORDER BY created_at DESC",
      [userId]
    );

    return res.json(rows.map(mapFileRow));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to fetch trash files" });
  }
});

app.post("/api/trash", async (req, res) => {
  const { userId, filename, fileURL, size, contentType, starred } = req.body;

  if (!userId || !filename || !fileURL) {
    return res.status(400).json({ message: "userId, filename and fileURL are required" });
  }

  try {
    const [result] = await pool.query(
      "INSERT INTO trash (user_id, filename, file_url, size, content_type, starred) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, filename, fileURL, size || 0, contentType || null, starred ? 1 : 0]
    );

    const [rows] = await pool.query("SELECT * FROM trash WHERE id = ? LIMIT 1", [result.insertId]);

    return res.status(201).json(mapFileRow(rows[0]));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to add file to trash" });
  }
});

app.delete("/api/trash/:id", async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM trash WHERE id = ?", [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Trash file not found" });
    }

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Failed to delete trash file" });
  }
});

initializeDatabase().finally(() => {
  app.listen(port, () => {
    console.log(`Safe Drive API running on http://localhost:${port}`);
  });
});
