// Login.js

import { useState } from "react";
import styled from "styled-components";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { useDispatch } from "react-redux";
import { setUserLoginDetails } from "../../store/UserSlice";
import { motion } from "framer-motion";
import Lottie from "react-lottie-player";
import lottieJson from "../lottie/homePageLottie.json";
import { Link, useNavigate } from "react-router-dom";
import { login } from "../../services/auth";
import { toast } from "react-toastify";

/**
 * Login component handles user authentication using Google.
 * @returns {JSX.Element} - Login component.
 */
const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /**
   * Handles user authentication with Google.
   * On successful authentication, sets user details in Redux state.
   * @async
   */
  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (!email || !password) {
        toast.error("Email and password are required");
        return;
      }

      setSubmitting(true);
      const user = await login({
        email: email.trim(),
        password,
      });

      setUser(user);
      navigate("/home");
    } catch (error) {
      toast.error(error.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * Sets user details in Redux state.
   * @param {Object} user - User object from authentication result.
   */
  const setUser = (user) => {
    dispatch(
      setUserLoginDetails({
        id: String(user.id),
        name: user.name,
        email: user.email,
        photo: user.photo,
      })
    );
  };

  return (
    <Container>
      <Box
        initial={{ x: "-100%" }}
        animate={{ x: "0" }}
        transition={{ duration: 0.5 }}
      >
        {/* <img src="drive.svg" alt="Google Drive Logo" /> */}
        <Lottie
          loop
          animationData={lottieJson}
          play
          style={{ width: 120, height: 120 }}
        />
        <h3>Safe Drive</h3>
        <Form onSubmit={handleAuth}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" disabled={submitting}>
            {submitting ? "Logging in..." : "Login"}
          </Button>
        </Form>
        <AuthLink to="/signup">New here? Create an account</AuthLink>
        <div className="text">
          <p>
            A cloud-based storage service that enables users to store and access
            files online
          </p>
          <p>
            Developed with <FavoriteIcon /> by{" "}
            <a
              href="https://www.linkedin.com/in/vipinkushwaha01/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Vipin Kushwaha
            </a>{" "}
          </p>
        </div>
      </Box>
      <ImageContainer
        initial={{ x: "100%" }}
        animate={{ x: "0" }}
        transition={{ duration: 0.5 }}
      >
        <img src="/login.gif" alt="Login" />
      </ImageContainer>
    </Container>
  );
};

const Container = styled.div`
  width: 100%;
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 2rem;
  padding: 1rem;

  @media screen and (max-width: 850px) {
    flex-direction: column;
  }
`;

const Box = styled(motion.div)`
  flex: 1;
  width: 100%;
  height: 100%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 1rem 2rem;
  border-radius: 10px;

  img {
    width: 80px;
    margin-bottom: 0.5rem;
    margin-top: 2rem;
  }

  h3 {
    margin-bottom: 1rem;
    color: #646464;
  }

  .text {
    margin-top: 1rem;
    p {
      text-align: center;
      font-weight: 600;
      font-size: 12px;
      color: #646464;
      letter-spacing: 1px;
      margin-bottom: 1rem;

      svg {
        font-size: 14px;
      }
      a {
        font-weight: 600;
        font-size: 14px;
      }
    }
  }
`;

const Form = styled.form`
  width: 100%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  input {
    height: 48px;
    padding: 0 14px;
    border: 1px solid #d0d0d0;
    border-radius: 12px;
    font-size: 14px;
    outline: none;
  }

  input:focus {
    border-color: #3f86ed;
  }
`;

const AuthLink = styled(Link)`
  margin-top: 10px;
  font-size: 14px;
  color: #3f86ed;
  font-weight: 600;
`;

const ImageContainer = styled(motion.div)`
  flex: 1;
  min-width: 280px;
  max-width: 800px;
  height: 400px;

  img {
    width: 100%;
    height: 100%;
  }
`;

const Button = styled.button`
  appearance: button;
  width: 100%;
  max-width: 320px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  margin-bottom: 2rem;
  height: 55px;
  text-align: center;
  border: none;
  background-size: 300% 100%;
  border-radius: 50px;
  transition: all 0.4s ease-in-out;
  background-image: linear-gradient(
    to right,
    #25aae1,
    #4481eb,
    #04befe,
    #3f86ed
  );
  box-shadow: 0 4px 15px 0 rgba(65, 132, 234, 0.75);

  &:hover {
    background-position: 100% 0;
  }
  &:focus {
    outline: none;
  }
  &:active {
    border-width: 4px 0 0;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

export default Login;
