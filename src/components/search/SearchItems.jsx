import React, { useEffect, useState } from "react";
import styled from "styled-components";
import PageHeader from "../common/PageHeader";
import { getFilesForUser } from "../common/firebaseApi";
import FilesList from "../common/FilesList";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectUserId } from "../../store/UserSlice";

// SearchItems component displays files matching the search query
const SearchItems = () => {
  const userId = useSelector(selectUserId);
  const [files, setFiles] = useState([]); // State to store all user files
  const [data, setData] = useState([]); // State to store files matching the search query

  const params = useParams(); // Access parameters from the URL
  const query = params.query; // Extract the search query from parameters

  useEffect(() => {
    const unsubscribeFiles = getFilesForUser(userId, (newFiles) => {
      setFiles(newFiles);
    });

    return () => unsubscribeFiles();
  }, [query, userId]);

  useEffect(() => {
    // Filter and set files that match the search query
    const searchArr = files.filter((file) =>
      file.data.filename.toLowerCase().includes(query.toLowerCase())
    );
    setData(searchArr);
  }, [files, query]);

  return (
    <RecentContainer>
      {/* Page header for the "SearchItems" section with the search query */}
      <PageHeader pageTitle={`Searched Files for '${query}'`} />
      {/* Display the list of matching files using FilesList component */}
      <FilesList
        data={data}
        imagePath={"/search.svg"}
        text1={"No matching results"}
        text2={"Adjust your query or try searching all of Drive"}
      />
    </RecentContainer>
  );
};

// Styled component for the SearchItems container
const RecentContainer = styled.div`
  flex: 1;
  padding: 10px 10px 0px 20px;
`;

export default SearchItems;
