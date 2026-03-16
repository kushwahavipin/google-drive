"use client";
import Link from "next/link";
import { useContext } from "react";
import { AuthContext } from "../Context/store"
import { useState, useEffect } from "react";
import axios from "axios";
export default function LoginPage() {
  const { user, setUser, loggedIn, setLoggedIn } = useContext(AuthContext);
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  }
  const handleSubmit = async () => {
    if (!loading) {
      setLoading(true);
      try {
        const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login`, form);
        if (response.status === 200) {

          console.log("Login successful:", response.data);
          localStorage.setItem("token", response.data.token);

        } else {
          console.error("Login failed:", response.data);

        }


      } catch (error) {

        console.error("Login error:", error);
      } finally {
        setLoading(false);
      }
    }

  }

  return (
    <div className="absolute  z-[-2] h-[94vh] w-screen bg-white bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] text-black flex flex-col justify-center items-center">
      <div className="Login-form w-full flex justify-center items-center">
        <div className="w-full p-8 lg:w-1/2 xl:w-1/3">
          <p className="text-xl text-gray-600 text-center">Welcome back!</p>
        {console.log("User from context:", user)}

          <div className="mt-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Email Address
            </label>
            <input
              className="text-gray-700 border border-gray-300 rounded py-2 px-4 block w-full focus:outline-2 focus:outline-blue-700"
              type="email"
              value={form.email}
              name="email"
              onChange={handleChange}
              required
            />
          </div>


          <div className="mt-4 flex flex-col justify-between">
            <div className="flex justify-between">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Password
              </label>
            </div>
            <input
              className="text-gray-700 border border-gray-300 rounded py-2 px-4 block w-full focus:outline-2 focus:outline-blue-700"
              type="password"
              onChange={handleChange}
              name="password"
              value={form.password}
              required
            />
            <Link
              href="/forgot-password"
              className="text-xs text-gray-500 hover:text-gray-900 text-end w-full mt-2"
            >
              Forget Password?
            </Link>
          </div>


          <div className="mt-8">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-blue-700 text-white font-bold py-2 px-4 w-full rounded 
             hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Wait..." : "Login"}
            </button>
          </div>




          <div className="mt-4 flex items-center w-full text-center">
            <Link
              href="/register"
              className="text-xs text-gray-500 capitalize text-center w-full"
            >
              Don&apos;t have any account yet?
              <span className="text-blue-700"> Sign Up</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}