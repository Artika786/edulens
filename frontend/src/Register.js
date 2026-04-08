import React from "react";
import swal from "sweetalert";
import { withRouter } from "./utils";
import axios from "axios";
import "./Auth.css";
import semesterData from './Semester.json';
const BASE_URL = process.env.REACT_APP_BASE_URL;
class Register extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      email: '',
      password: '',
      confirm_password: '',
      role: 'teacher',
      school: '',
      course: '',
      emailError: '',
      otp: '',
      isOtpSent: false,
      isOtpVerified: false,
      otpTimer: 0,
      canResendOtp: true
    };
    this.timerInterval = null;
  }

  componentWillUnmount() {
    if (this.timerInterval) clearInterval(this.timerInterval);
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
    this.setState({ role, school: '', course: '' });
  };

  handleSchoolChange = (e) => {
    this.setState({ school: e.target.value, course: '' });
  };

  getSchools = () => semesterData.map(item => item.school);

  getCourses = () => {
    if (!this.state.school) return [];
    const selected = semesterData.find(item => item.school === this.state.school);
    return selected ? selected.courses.map(c => c.courseName) : [];
  };

  sendOtp = async () => {
    if (!this.validateEmail(this.state.email)) {
      return swal({ text: "Please enter a valid email address", icon: "error" });
    }
    try {
      // http://localhost:2000
      await axios.post(`${BASE_URL}/send-otp`, {
      email: this.state.email,
      role: this.state.role
    });
      this.setState({ isOtpSent: true, canResendOtp: false, otpTimer: 60 });
      this.timerInterval = setInterval(() => {
        this.setState(prev => {
          if (prev.otpTimer <= 1) {
            clearInterval(this.timerInterval);
            return { otpTimer: 0, canResendOtp: true };
          }
          return { otpTimer: prev.otpTimer - 1 };
        });
      }, 1000);
      swal({ text: "OTP sent to your email! Please check your inbox.", icon: "success", timer: 3000 });
    } catch (err) {
      swal({ text: err.response?.data?.errorMessage || "Failed to send OTP", icon: "error" });
    }
  };

  verifyOtp = async () => {
    if (!this.state.otp || this.state.otp.length !== 6) {
      return swal({ text: "Please enter a valid 6-digit OTP", icon: "warning" });
    }
    try {
      // http://localhost:2000
      await axios.post(`${BASE_URL}/verify-otp`, {
      email: this.state.email,
      otp: this.state.otp
    });
      this.setState({ isOtpVerified: true });
      swal({ text: "Email verified successfully!", icon: "success", timer: 2000 });
    } catch (err) {
      swal({ text: err.response?.data?.errorMessage || "Invalid OTP", icon: "error" });
    }
  };

  register = async () => {
    if (!this.validateEmail(this.state.email)) {
      return swal({ text: "Please enter a valid email address", icon: "error" });
    }
    if (!this.state.isOtpVerified) {
      return swal({ text: "Please verify your email with OTP first", icon: "warning" });
    }
    if (this.state.password !== this.state.confirm_password) {
      return swal({ text: "Passwords do not match!", icon: "error" });
    }
    if (!this.state.school || !this.state.course) {
      return swal({ text: "Please select your school and course!", icon: "warning" });
    }
    try {
      // http://localhost:2000
      // http://localhost:2000
      const response = await axios.post(`${BASE_URL}/register`, {
      email: this.state.email,
      password: this.state.password,
      role: this.state.role,
      school: this.state.school,
      course: this.state.course
    });
      swal({ text: response.data.message || "Registration successful!", icon: "success", timer: 2000 });
      this.props.navigate("/");
    } catch (err) {
      swal({ text: err.response?.data?.errorMessage || "Registration failed!", icon: "error" });
    }
  };

  handleOutlookLogin = () => {
    swal({ text: "Outlook login integration coming soon!", icon: "info" });
  };

  render() {
    const schools = this.getSchools();
    const courses = this.getCourses();
    const {
      email, password, confirm_password, emailError,
      isOtpSent, isOtpVerified, otp, otpTimer, canResendOtp
    } = this.state;

    const isFormValid = email && !emailError && password && confirm_password &&
                        this.state.school && this.state.course && isOtpVerified;

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
              <h2 className="auth-title">Create account.</h2>
              <p className="auth-description">Join EduLens to start your learning journey</p>
            </div>

            {/* Role toggle */}
            <div className="user-type-toggle">
              <button
                onClick={() => this.handleRoleChange('teacher')}
                className={`toggle-btn ${this.state.role === 'teacher' ? 'active' : ''}`}
              >
                Teacher
              </button>
              <button
                onClick={() => this.handleRoleChange('student')}
                className={`toggle-btn ${this.state.role === 'student' ? 'active' : ''}`}
              >
                Student
              </button>
            </div>

            {/* Form */}
            <form onSubmit={(e) => { e.preventDefault(); this.register(); }} className="auth-form">

              {/* Email + Send OTP */}
              <div className="form-group">
                <label htmlFor="email" className="form-label">Email Address</label>
                <div className="otp-row">
                  <input
                    id="email"
                    type="email"
                    name="email"
                    value={email}
                    onChange={this.onChange}
                    placeholder="you@example.com"
                    className={`form-input ${emailError ? 'error-input' : ''}`}
                    required
                    disabled={isOtpVerified}
                  />
                  {!isOtpVerified && (
                    <button
                      type="button"
                      onClick={this.sendOtp}
                      disabled={!email || !!emailError || !canResendOtp}
                      className="submit-btn"
                      style={{ fontSize: '12.5px', padding: '11px 14px' }}
                    >
                      {otpTimer > 0 ? `${otpTimer}s` : isOtpSent ? 'Resend' : 'Send OTP'}
                    </button>
                  )}
                  {isOtpVerified && (
                    <span className="verified-badge">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                      Verified
                    </span>
                  )}
                </div>
                {emailError && <span className="error-text">{emailError}</span>}
              </div>

              {/* OTP Entry */}
              {isOtpSent && !isOtpVerified && (
                <div className="form-group">
                  <label htmlFor="otp" className="form-label">Enter OTP</label>
                  <div className="otp-row">
                    <input
                      id="otp"
                      type="text"
                      name="otp"
                      value={otp}
                      onChange={this.onChange}
                      placeholder="······"
                      className="form-input"
                      maxLength="6"
                      required
                    />
                    <button
                      type="button"
                      onClick={this.verifyOtp}
                      disabled={!otp || otp.length !== 6}
                      className="submit-btn"
                      style={{ fontSize: '12.5px', padding: '11px 14px' }}
                    >
                      Verify
                    </button>
                  </div>
                  <span className="otp-hint">Check your inbox for the 6-digit code</span>
                </div>
              )}

              {/* Password */}
              <div className="form-group">
                <label htmlFor="password" className="form-label">Password</label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={password}
                  onChange={this.onChange}
                  placeholder="Create a strong password"
                  className="form-input"
                  required
                />
              </div>

              {/* Confirm Password */}
              <div className="form-group">
                <label htmlFor="confirm_password" className="form-label">Confirm Password</label>
                <input
                  id="confirm_password"
                  type="password"
                  name="confirm_password"
                  value={confirm_password}
                  onChange={this.onChange}
                  placeholder="Repeat your password"
                  className="form-input"
                  required
                />
              </div>

              {/* School */}
              <div className="form-group">
                <label htmlFor="school" className="form-label">School</label>
                <select
                  id="school"
                  name="school"
                  value={this.state.school}
                  onChange={this.handleSchoolChange}
                  className="form-select"
                  required
                >
                  <option value="">Select your school</option>
                  {schools.map((school, i) => (
                    <option key={i} value={school}>{school}</option>
                  ))}
                </select>
              </div>

              {/* Course */}
              <div className="form-group">
                <label htmlFor="course" className="form-label">Course</label>
                <select
                  id="course"
                  name="course"
                  value={this.state.course}
                  onChange={this.onChange}
                  className="form-select"
                  required
                  disabled={!this.state.school}
                >
                  <option value="">Select your course</option>
                  {courses.map((course, i) => (
                    <option key={i} value={course}>{course}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={!isFormValid}
                className="submit-btn full"
              >
                Create Account
              </button>
            </form>

            <div className="auth-footer">
              <p className="footer-text">
                Already have an account?{' '}
                <button onClick={() => this.props.navigate("/")} className="footer-link">
                  Log in here
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

export default withRouter(Register);