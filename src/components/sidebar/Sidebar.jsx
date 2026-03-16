// Sidebar.js

import React, { useState } from "react";
import styled from "styled-components";
import { useSelector } from "react-redux";
import { selectSidebarBool } from "../../store/BoolSlice";
import { selectUserId } from "../../store/UserSlice";
import FileUploadModal from "./FileUploadModal";
import AddFile from "./AddFile";
import SidebarTabs from "./SidebarTabs";
import { toast } from "react-toastify";
import { request } from "../../services/api";
import { useSearchParams } from "react-router-dom";

/**
 * Sidebar component for managing file uploads and displaying tabs.
 * @returns {JSX.Element} - Sidebar component.
 */
const Sidebar = () => {
  const [searchParams] = useSearchParams();
  const currentFolderId = searchParams.get("folder") || null;
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const sidebarBool = useSelector(selectSidebarBool);
  const userId = useSelector(selectUserId);
  const [selectedFile, setSelectedFile] = useState(null);
  /**
   * Handles the selection of a file for upload.
   * @param {Object} e - File input change event.
   */
  const handleFile = (e) => {
    if (e.target.files[0]) {
      setSelectedFile(e.target.files[0].name)
      setFile(e.target.files[0]);
    }
  };

  /**
   * Handles the file upload process.
   * Uploads the selected file to Firebase Storage and adds file details to Firestore.
   * Displays a success toast upon successful upload.
   * @param {Object} e - Form submit event.
   */
  const handleUpload = async (e) => {
    e.preventDefault();
    setSelectedFile("");
    setUploading(true);

    try {
      if (!file || !userId) {
        throw new Error("Please login and select a file first.");
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", String(userId));
      if (currentFolderId) {
        formData.append("folderId", String(currentFolderId));
      }

      await request("/api/files", {
        method: "POST",
        body: formData,
      });

      toast.success("File Uploaded Successfully");

      // Reset state and close modal
      setUploading(false);
      setFile(null);
      setOpen(false);
    } catch (error) {
      console.error("Error uploading file:", error);
      setUploading(false);
      toast.error("Error uploading file. Please try again.");
    }
  };

  return (
    <>
      <FileUploadModal
        open={open}
        setOpen={setOpen}
        handleUpload={handleUpload}
        uploading={uploading}
        handleFile={handleFile}
        selectedFile={selectedFile}
      />

      <SidebarContainer sidebarbool={sidebarBool ? "true" : "false"}>
        <AddFile
          onClick={() => {
            setOpen(true);
          }}
        />

        <SidebarTabs />
      </SidebarContainer>
    </>
  );
};

const SidebarContainer = styled.div`
  width: 180px;
  padding-top: 10px;
  border-right: 1px solid lightgray;
  transition: all 0.1s linear;
  position: ${(props) =>
    props.sidebarbool === "true" ? `relative` : "absolute"};
  left: ${(props) => (props.sidebarbool === "true" ? `0` : "-100%")};

  @media screen and (max-width: 768px) {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 65px;
  }
`;

export default Sidebar;
