import React, { Suspense, lazy, useEffect, useState } from "react";
import styled from "styled-components";
import PageHeader from "../common/PageHeader";
import { getFilesForUser } from "../common/firebaseApi";
import LoaderContainer from "../loaders/LoaderContainer";
import { delayInRender } from "../common/common";
import { useSelector } from "react-redux";
import { selectUserId } from "../../store/UserSlice";
const FilesList = lazy(() => delayInRender(import("../common/FilesList")));

// Starred component displays files marked as starred for quick access
const Starred = () => {
  const userId = useSelector(selectUserId);
  const [starredFiles, setStarredFiles] = useState([]);
  const [files, setFiles] = useState([]);

  useEffect(() => {
    const unsubscribeFiles = getFilesForUser(userId, (newFiles) => {
      setFiles(newFiles);
    });

    return () => unsubscribeFiles();
  }, [userId]);

  useEffect(() => {
    // Filter and set files that are marked as starred
    const starred = files.filter((file) => file.data.starred);
    setStarredFiles(starred);
  }, [files]);

  return (
    <StarredContainer>
      {/* Page header for the "Starred" section */}
      <PageHeader pageTitle={"Starred"} />
      {/* Display the list of starred files using FilesList component */}
      <Suspense fallback={ <LoaderContainer /> }>
        <FilesList
          data={starredFiles}
          page="starred"
          imagePath={"/starred.svg"}
          text1={"No starred files"}
          text2={"Add stars to things that you want to easily find later"}
        />
      </Suspense>
    </StarredContainer>
  );
};

// Styled component for the Starred container
const StarredContainer = styled.div`
  flex: 1;
  padding: 10px 10px 0px 20px;
`;

export default Starred;
