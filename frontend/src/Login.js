import React from "react";
import swal from "sweetalert";
import { withRouter } from "./utils";
import axios from "axios";
import "./Auth.css";

class Login extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      email: "",
      password: "",
      role: "teacher",
      emailError: ""
    };
  }

  validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  onChange = (e) => {
    const { name, value } = e.target;
    if (name === "email") {
      if (value && !this.validateEmail(value)) {
        this.setState({ [name]: value, emailError: "Please enter a valid email address" });
      } else {
        this.setState({ [name]: value, emailError: "" });
      }
    } else {
      this.setState({ [name]: value });
    }
  };

  handleRoleChange = (role) => {
    this.setState({ role });
  };

  login = () => {
    if (!this.validateEmail(this.state.email)) {
      return swal({ text: "Please enter a valid email address", icon: "error" });
    }
    axios.post("http://localhost:2000/login", {
      email: this.state.email,
      password: this.state.password,
      role: this.state.role
    }).then((res) => {
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", this.state.role);
      localStorage.setItem("userId", res.data.userId);
      swal({ text: "Login successful!", icon: "success", timer: 1500 });
      if (this.state.role === "teacher") {
        this.props.navigate("/dashboard");
      } else {
        this.props.navigate("/student-dashboard");
      }
    }).catch((err) => {
      swal({
        text: err.response?.data?.errorMessage || "Something went wrong!",
        icon: "error"
      });
    });
  };

  handleOutlookLogin = () => {
    swal({ text: "Outlook login integration coming soon!", icon: "info" });
  };

  render() {
    const { email, password, role, emailError } = this.state;
    const isFormValid = email && !emailError && password;

    return (
      <div className="auth-container">

        {/* ── LEFT PANEL ── */}
        <div className="auth-left">
          <div className="auth-left-inner">
            {/* Logo row — icon + title side by side */}
            <div className="logo-row">
              <div className="logo-container">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                  stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h1 className="logo-title">EduLens</h1>
            </div>
            <p className="logo-subtitle">Syllabus-aligned learning resources for modern classrooms</p>

            {/* Feature highlights */}
            <div className="auth-features">
              <div className="auth-feature-item">
                <div className="auth-feature-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div className="auth-feature-text">
                  <strong>Curriculum-aligned Content</strong>
                  Resources matched to your exact syllabus
                </div>
              </div>
              <div className="auth-feature-item">
                <div className="auth-feature-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z"/>
                  </svg>
                </div>
                <div className="auth-feature-text">
                  <strong>Smart Learning Paths</strong>
                  Adaptive tools for teachers and students
                </div>
              </div>
              <div className="auth-feature-item">
                <div className="auth-feature-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </div>
                <div className="auth-feature-text">
                  <strong>Collaborative Classrooms</strong>
                  Connect teachers, students and schools
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="auth-content">
          <div className="auth-content-inner">
          <div className="auth-card">

            {/* Welcome */}
            <div className="auth-welcome">
              <h2 className="auth-title">Welcome back.</h2>
              <p className="auth-description">Sign in to access your educational dashboard</p>
            </div>

            {/* Role toggle */}
            <div className="user-type-toggle">
              <button
                onClick={() => this.handleRoleChange("teacher")}
                className={`toggle-btn ${role === "teacher" ? "active" : ""}`}
              >
                Teacher
              </button>
              <button
                onClick={() => this.handleRoleChange("student")}
                className={`toggle-btn ${role === "student" ? "active" : ""}`}
              >
                Student
              </button>
            </div>

            {/* Form */}
            <form onSubmit={(e) => { e.preventDefault(); this.login(); }} className="auth-form">
              <div className="form-group">
                <label htmlFor="email" className="form-label">Email Address</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={email}
                  onChange={this.onChange}
                  placeholder="you@example.com"
                  className={`form-input ${emailError ? "error-input" : ""}`}
                  required
                />
                {emailError && <span className="error-text">{emailError}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">Password</label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={password}
                  onChange={this.onChange}
                  placeholder="Enter your password"
                  className="form-input"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={!isFormValid}
                className="submit-btn full"
              >
                Log In
              </button>
            </form>

            <div className="auth-footer">
              <p className="footer-text">
                Don't have an account?{" "}
                <button onClick={() => this.props.navigate("/register")} className="footer-link">
                  Register here
                </button>
              </p>
            </div>

            <div className="divider"><span className="divider-text">or</span></div>

            <button type="button" onClick={this.handleOutlookLogin} className="outlook-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="1" y="4" width="10" height="8" rx="1.5" fill="#0078D4"/>
                <rect x="13" y="4" width="10" height="8" rx="1.5" fill="#50D9FF"/>
                <rect x="1" y="14" width="10" height="8" rx="1.5" fill="#28A8E0"/>
                <rect x="13" y="14" width="10" height="8" rx="1.5" fill="#0078D4"/>
              </svg>
              Continue with Outlook
            </button>

          </div>

          <p className="terms-text">By continuing, you agree to EduLens Terms of Service and Privacy Policy</p>
          </div>
        </div>

      </div>
    );
  }
}

export default withRouter(Login);