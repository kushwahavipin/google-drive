import { useState } from "react";
import styled from "styled-components";
import { useDispatch } from "react-redux";
import { setUserLoginDetails } from "../../store/UserSlice";
import { Link, useNavigate } from "react-router-dom";
import { signup } from "../../services/auth";
import { toast } from "react-toastify";

const Signup = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name || !email || !password || !confirmPassword) {
      toast.error("All fields are required");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      setSubmitting(true);
      const user = await signup({
        name: name.trim(),
        email: email.trim(),
        password,
      });

      dispatch(
        setUserLoginDetails({
          id: String(user.id),
          name: user.name,
          email: user.email,
          photo: user.photo,
        })
      );

      navigate("/home");
    } catch (error) {
      toast.error(error.message || "Signup failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container>
      <Card>
        <h2>Create Account</h2>
        <p>Start using Safe Drive with your email and password.</p>

        <Form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
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
          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />

          <button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Sign up"}
          </button>
        </Form>

        <AuthLink to="/login">Already have an account? Login</AuthLink>
      </Card>
    </Container>
  );
};

const Container = styled.div`
  width: 100%;
  min-height: calc(100vh - 70px);
  display: grid;
  place-items: center;
  padding: 24px;
`;

const Card = styled.div`
  width: 100%;
  max-width: 420px;
  background: #fff;
  border: 1px solid #e9e9e9;
  border-radius: 16px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
  padding: 28px;

  h2 {
    margin: 0;
    color: #2f2f2f;
  }

  p {
    margin: 8px 0 18px;
    color: #666;
    font-size: 14px;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 12px;

  input {
    height: 46px;
    padding: 0 12px;
    border: 1px solid #d6d6d6;
    border-radius: 10px;
    outline: none;
  }

  input:focus {
    border-color: #3f86ed;
  }

  button {
    height: 46px;
    border: 0;
    border-radius: 10px;
    cursor: pointer;
    color: #fff;
    font-weight: 600;
    background: linear-gradient(90deg, #25aae1 0%, #3f86ed 100%);
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.75;
  }
`;

const AuthLink = styled(Link)`
  margin-top: 14px;
  display: inline-block;
  color: #3f86ed;
  font-weight: 600;
`;

export default Signup;
