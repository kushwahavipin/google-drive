import { toast } from "react-toastify";
import { request } from "../../services/api";

const isOfflineError = (error) =>
  error?.message?.includes("Backend is offline") ||
  error?.message?.includes("Failed to fetch");

const fetchFiles = async (userId, setFiles) => {
  const rows = await request(`/api/files?userId=${encodeURIComponent(userId)}`);
  setFiles(rows || []);
};

const fetchTrashFiles = async (userId, setFiles) => {
  const rows = await request(`/api/trash?userId=${encodeURIComponent(userId)}`);
  setFiles(rows || []);
};

export const getDriveItems = async (userId, parentId = null) => {
  if (!userId) {
    return { folders: [], files: [] };
  }

  const query = parentId
    ? `?userId=${encodeURIComponent(userId)}&parentId=${encodeURIComponent(parentId)}`
    : `?userId=${encodeURIComponent(userId)}`;
  const response = await request(`/api/drive${query}`);
  return {
    folders: response?.folders || [],
    files: response?.files || [],
  };
};

export const getFolderPath = async (userId, folderId) => {
  if (!userId || !folderId) {
    return [];
  }
  return request(
    `/api/folders/${encodeURIComponent(folderId)}/path?userId=${encodeURIComponent(userId)}`
  );
};

export const createFolder = async (userId, name, parentId = null) => {
  if (!userId || !name) {
    throw new Error("userId and folder name are required");
  }

  return request("/api/folders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      userId,
      parentId,
      name,
    }),
  });
};

export const deleteFolder = async (userId, folderId) => {
  if (!userId || !folderId) {
    throw new Error("userId and folderId are required");
  }

  return request(
    `/api/folders/${encodeURIComponent(folderId)}?userId=${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
    }
  );
};

export const uploadFolder = async (userId, files, parentId = null) => {
  if (!userId || !files || files.length === 0) {
    throw new Error("Please select a folder to upload");
  }

  const formData = new FormData();
  const relativePaths = [];

  files.forEach((file) => {
    formData.append("files", file);
    relativePaths.push(file.webkitRelativePath || file.name);
  });

  formData.append("userId", String(userId));
  if (parentId) {
    formData.append("parentId", String(parentId));
  }
  formData.append("relativePaths", JSON.stringify(relativePaths));

  return request("/api/files/folder", {
    method: "POST",
    body: formData,
  });
};

export const postTrashCollection = async (object) => {
  try {
    await request("/api/trash", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: object.userId,
        filename: object.filename,
        fileURL: object.fileURL,
        size: object.size || 0,
        contentType: object.contentType || null,
        starred: Boolean(object.starred),
      }),
    });
  } catch (err) {
    console.error(err);
  }
};

const getTrashFiles = (userId, setFiles) => {
  if (!userId) {
    setFiles([]);
    return () => {};
  }

  fetchTrashFiles(userId, setFiles).catch(() => {});
  return () => {};
};

const handleDeleteFromTrash = async (id) => {
  try {
    const confirmed = window.confirm(
      "Are you sure you want to delete this file?"
    );

    if (confirmed) {
      await request(`/api/trash/${id}`, {
        method: "DELETE",
      });
      toast.error("Permanently Deleted");
    }
  } catch (error) {
    console.error("Error deleting document: ", error);
  }
};

const getFilesForUser = (userId, setFiles) => {
  if (!userId) {
    setFiles([]);
    return () => {};
  }

  fetchFiles(userId, setFiles).catch(() => {});
  return () => {};
};

const handleStarred = async (id) => {
  try {
    const response = await request(`/api/files/${id}/star`, {
      method: "PATCH",
    });

    if (response?.starred) {
      toast.success("Added to starred");
    } else {
      toast.error("Removed from starred");
    }
  } catch (error) {
    if (!isOfflineError(error)) {
      console.error("Error updating starred status: ", error);
    }
  }
};

export { getFilesForUser, handleStarred, getTrashFiles, handleDeleteFromTrash };
