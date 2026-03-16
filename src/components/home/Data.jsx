// Import styled components and React dependencies
import styled from "styled-components";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

// Import custom Firebase API functions and components
import {
  createFolder,
  deleteFolder,
  getDriveItems,
  getFolderPath,
  postTrashCollection,
  uploadFolder,
} from "../common/firebaseApi";
import RecentDataGrid from "./RecentDataGrid";
import MainData from "./MainData";
import PageHeader from "../common/PageHeader";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { selectUserId } from "../../store/UserSlice";
import { request } from "../../services/api";

// Main component for displaying user's data
const Data = () => {
  const userId = useSelector(selectUserId);
  const [searchParams, setSearchParams] = useSearchParams();
  const currentFolderId = searchParams.get("folder") || null;

  // State variables to manage user files and options visibility
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([]);
  const [optionsVisible, setOptionsVisible] = useState(null);
  const [folderUploading, setFolderUploading] = useState(false);

  // Fetch folder and file data for current folder
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const { folders: nextFolders, files: nextFiles } = await getDriveItems(
          userId,
          currentFolderId
        );
        if (mounted) {
          setFolders(nextFolders);
          setFiles(nextFiles);
        }
      } catch (_error) {}
    };

    load();

    return () => {
      mounted = false;
    };
  }, [userId, currentFolderId]);

  useEffect(() => {
    const loadPath = async () => {
      try {
        const path = await getFolderPath(userId, currentFolderId);
        setBreadcrumbs(path || []);
      } catch (_error) {}
    };

    if (currentFolderId) {
      loadPath();
    } else {
      setBreadcrumbs([]);
    }
  }, [userId, currentFolderId]);

  // Handle file deletion by moving it to the trash collection
  const handleDelete = async (id, data) => {
    try {
      // Confirm deletion with a window prompt
      const confirmed = window.confirm(
        "Are you sure you want to delete this file?"
      );

      if (confirmed) {
        // Add the file data to the "trash" collection before deleting the document
        await postTrashCollection(data);

        // Delete the document from the user's drive
        await request(`/api/files/${id}`, {
          method: "DELETE",
        });
        toast.warn("File moved to the trash");
      }
    } catch (error) {
      // Log any errors that occur during the deletion process
      console.error("Error deleting document: ", error);
    } finally {
      // Set options visibility after deletion attempt
      setOptionsVisible(id);
    }
  };

  // Handle click event for options button
  const handleOptionsClick = (id) => {
    // Toggle options visibility based on the previous state
    setOptionsVisible((prevVisible) => (prevVisible === id ? null : id));
  };

  const handleOpenFolder = (folderId) => {
    setSearchParams({ folder: folderId });
  };

  const handleBreadcrumbClick = (folderId = null) => {
    if (!folderId) {
      setSearchParams({});
    } else {
      setSearchParams({ folder: folderId });
    }
  };

  const handleCreateFolder = async () => {
    const name = window.prompt("Folder name");
    if (!name || !name.trim()) {
      return;
    }

    try {
      await createFolder(userId, name.trim(), currentFolderId);
      toast.success("Folder created");
    } catch (error) {
      toast.error(error.message || "Failed to create folder");
    }
  };

  const handleDeleteFolder = async (folder) => {
    const confirmed = window.confirm(
      `Delete folder "${folder.name}" and all files inside it?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteFolder(userId, folder.id);
      toast.warn("Folder moved to delete");

      const { folders: nextFolders, files: nextFiles } = await getDriveItems(
        userId,
        currentFolderId
      );
      setFolders(nextFolders);
      setFiles(nextFiles);
    } catch (error) {
      toast.error(error.message || "Failed to delete folder");
    }
  };

  const handleFolderUpload = async (event) => {
    const folderFiles = Array.from(event.target.files || []);
    if (folderFiles.length === 0) {
      return;
    }

    try {
      setFolderUploading(true);
      await uploadFolder(userId, folderFiles, currentFolderId);
      toast.success("Folder uploaded successfully");
    } catch (error) {
      toast.error(error.message || "Failed to upload folder");
    } finally {
      setFolderUploading(false);
      event.target.value = "";
    }
  };

  // JSX structure for rendering the component
  return (
    <DataContainer>
      {/* Display page header */}
      <PageHeader pageTitle={"My Drive"} />

      <ActionBar>
        <button onClick={handleCreateFolder}>New Folder</button>
        <label htmlFor="folderUpload">
          {folderUploading ? "Uploading..." : "Upload Folder"}
        </label>
        <input
          id="folderUpload"
          type="file"
          webkitdirectory="true"
          directory="true"
          multiple
          onChange={handleFolderUpload}
        />
      </ActionBar>

      <Breadcrumbs>
        <span onClick={() => handleBreadcrumbClick(null)}>My Drive</span>
        {breadcrumbs.map((crumb) => (
          <span key={crumb.id} onClick={() => handleBreadcrumbClick(crumb.id)}>
            / {crumb.name}
          </span>
        ))}
      </Breadcrumbs>

      {files.length > 0 && <h4>Recents</h4>}
      <div>
        {/* Display recent files in a grid */}
        <RecentDataGrid files={files} />
        <div>
          {/* Display main user data with options for each file */}
          <MainData
            folders={folders}
            files={files}
            userId={userId}
            onOpenFolder={handleOpenFolder}
            handleOptionsClick={handleOptionsClick}
            optionsVisible={optionsVisible}
            handleDelete={handleDelete}
            handleDeleteFolder={handleDeleteFolder}
          />
        </div>
      </div>
    </DataContainer>
  );
};

// Styled component for the main container
const DataContainer = styled.div`
  flex: 1;
  padding: 10px 0px 0px 20px;

  h4 {
    font-size: 14px;
    margin-top: 30px;
    margin-bottom: -20px;

    @media screen and (max-width: 768px) {
      display: none;
    }
  }
`;

const ActionBar = styled.div`
  display: flex;
  gap: 10px;
  margin: 8px 0 14px;

  button,
  label {
    border: 1px solid #d8d8d8;
    background: #fff;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 13px;
    cursor: pointer;
    font-weight: 600;
  }

  input {
    display: none;
  }
`;

const Breadcrumbs = styled.div`
  margin-bottom: 10px;
  color: #666;
  font-size: 13px;

  span {
    cursor: pointer;
    margin-right: 6px;
  }

  span:hover {
    text-decoration: underline;
  }
`;

// Export the Data component as the default export
export default Data;
