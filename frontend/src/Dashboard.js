import React, { Component } from 'react';
import axios from 'axios';
import swal from 'sweetalert';
import { withRouter } from "./utils";
import './ModernDashboard.css';
import semesterData from './Semester.json';

class Dashboard extends Component {
  constructor() {
    super();
    this.state = {
      token: '', userId: '', userSchool: '', userCourse: '',
      openCourseModal: false, openLockModal: false,
      selectedCourseForLock: null,
      collaboratorEmail: '', collaborators: [], loadingCollaborators: false,
      class_name: '', subject_name: '', unit_title: '',
      resource_type: 'File', syllabus_file: null, syllabus_text: '', fileName: '',
      page: 1, search: '', courses: [], pages: 0, loading: false,
      stats: { totalStudents: 83, activeCourses: 0, resourcesAdded: 27 },
      showCustomSchool: false, showCustomCourse: false,
      showCustomSemester: false, showCustomSubject: false,
      selectedSchool: '', selectedCourse: '', selectedSemester: '',
      availableCourses: [], availableSemesters: [], availableSubjects: [],
      usedSubjects: []
    };
  }

  componentDidMount() {
    let token = localStorage.getItem("token");
    let userId = localStorage.getItem("userId");
    if (!token) { this.props.navigate("/login"); }
    else { this.setState({ token, userId }, () => { this.getUserInfo(); this.getCourseData(); }); }
  }

  getUserInfo = () => {
    axios.get('http://localhost:2000/get-user-info', { headers: { token: this.state.token } })
      .then((res) => {
        const { school, course } = res.data.user;
        const schoolObj = semesterData.find(s => s.school === school);
        const courseObj = schoolObj?.courses.find(c => c.courseName === course);
        this.setState({ selectedSchool: school, selectedCourse: course, availableCourses: schoolObj ? schoolObj.courses : [], availableSemesters: courseObj ? courseObj.semesters : [], userSchool: school, userCourse: course });
      })
      .catch(err => console.error('Error fetching user info:', err));
  };

  getCourseData = () => {
    this.setState({ loading: true });
    let data = `?page=${this.state.page}`;
    if (this.state.search) data += `&search=${this.state.search}`;
    axios.get(`http://localhost:2000/get-courses${data}`, { headers: { token: this.state.token } })
      .then((res) => {
        this.setState({
          loading: false,
          courses: res.data.courses.map(c => ({ ...c, lockedBy: c.lockedBy ? String(c.lockedBy) : null, user_id: String(c.user_id), collaborators: c.collaborators || [] })),
          pages: res.data.pages,
          stats: { ...this.state.stats, activeCourses: res.data.courses.length }
        });
      })
      .catch(err => { swal({ text: err.response?.data?.errorMessage || "Something went wrong", icon: "error" }); this.setState({ loading: false, courses: [], pages: 0 }); });
  };

  checkUsedSubjects = (semester) => {
    axios.get(`http://localhost:2000/get-used-subjects/${encodeURIComponent(semester)}`, { headers: { token: this.state.token } })
      .then(res => this.setState({ usedSubjects: res.data.usedSubjects || [] }))
      .catch(err => { console.error("Error fetching used subjects:", err); this.setState({ usedSubjects: [] }); });
  };

  handleLockClick = (course) => {
    if (String(course.user_id) !== String(this.state.userId)) { swal({ text: "Only the course creator can manage lock settings.", icon: "warning" }); return; }
    if (course.isLocked) { this.setState({ selectedCourseForLock: course, openLockModal: true }, () => this.loadCollaborators(course._id)); }
    else { this.lockCourse(course._id); }
  };

  lockCourse = (courseId) => {
    swal({ title: "Lock Course for All Teachers?", text: "Only you and invited collaborators will be able to edit this course.", icon: "info", buttons: { cancel: "Cancel", confirm: "Lock Course" } })
      .then(willLock => {
        if (willLock) {
          axios.post("http://localhost:2000/toggle-course-lock", { courseId, action: 'lock' }, { headers: { "Content-Type": "application/json", token: this.state.token } })
            .then(res => { swal({ text: res.data.title, icon: "success", timer: 2000 }); this.getCourseData(); })
            .catch(err => swal({ text: err.response?.data?.errorMessage || "Failed to lock course", icon: "error" }));
        }
      });
  };

  unlockCourse = () => {
    const { selectedCourseForLock } = this.state;
    swal({ title: "Unlock Course?", text: "All teachers from your school will be able to edit this course.", icon: "warning", buttons: { cancel: "Cancel", confirm: "Unlock" }, dangerMode: true })
      .then(willUnlock => {
        if (willUnlock) {
          axios.post("http://localhost:2000/toggle-course-lock", { courseId: selectedCourseForLock._id, action: 'unlock' }, { headers: { "Content-Type": "application/json", token: this.state.token } })
            .then(res => { swal({ text: res.data.title, icon: "success", timer: 2000 }); this.setState({ openLockModal: false, selectedCourseForLock: null }); this.getCourseData(); })
            .catch(err => swal({ text: err.response?.data?.errorMessage || "Failed to unlock course", icon: "error" }));
        }
      });
  };

  loadCollaborators = (courseId) => {
    this.setState({ loadingCollaborators: true });
    axios.get(`http://localhost:2000/get-collaborators/${courseId}`, { headers: { token: this.state.token } })
      .then(res => this.setState({ collaborators: res.data.collaborators || [], loadingCollaborators: false }))
      .catch(err => { console.error("Load collaborators error:", err); this.setState({ loadingCollaborators: false }); });
  };

  addCollaborator = () => {
    const { selectedCourseForLock, collaboratorEmail } = this.state;
    if (!collaboratorEmail.trim()) { swal({ text: 'Please enter a teacher email', icon: 'warning' }); return; }
    axios.post("http://localhost:2000/add-collaborator", { courseId: selectedCourseForLock._id, collaboratorEmail: collaboratorEmail.trim() }, { headers: { "Content-Type": "application/json", token: this.state.token } })
      .then(res => { swal({ text: res.data.title, icon: "success", timer: 2000 }); this.setState({ collaboratorEmail: '' }); this.loadCollaborators(selectedCourseForLock._id); })
      .catch(err => swal({ text: err.response?.data?.errorMessage || "Failed to add collaborator", icon: "error" }));
  };

  removeCollaborator = (collaboratorId) => {
    const { selectedCourseForLock } = this.state;
    swal({ title: "Remove Collaborator?", text: "This teacher will no longer be able to edit the course.", icon: "warning", buttons: true, dangerMode: true })
      .then(willRemove => {
        if (willRemove) {
          axios.post("http://localhost:2000/remove-collaborator", { courseId: selectedCourseForLock._id, collaboratorId }, { headers: { "Content-Type": "application/json", token: this.state.token } })
            .then(res => { swal({ text: res.data.title, icon: "success", timer: 2000 }); this.loadCollaborators(selectedCourseForLock._id); })
            .catch(err => swal({ text: err.response?.data?.errorMessage || "Failed to remove collaborator", icon: "error" }));
        }
      });
  };

  deleteCourse = (id, courseCreatorId) => {
    if (String(courseCreatorId) !== String(this.state.userId)) { swal({ text: "Only the course creator can delete this course.", icon: "warning" }); return; }
    swal({ title: "Are you sure?", text: "Once deleted, you will not be able to recover this course!", icon: "warning", buttons: true, dangerMode: true })
      .then(willDelete => {
        if (willDelete) {
          axios.post("http://localhost:2000/delete-course", { id }, { headers: { "Content-Type": "application/json", token: this.state.token } })
            .then(res => { swal({ text: res.data.title, icon: "success" }); this.setState({ page: 1 }, () => this.getCourseData()); })
            .catch(err => swal({ text: err.response?.data?.errorMessage || "Something went wrong", icon: "error" }));
        }
      });
  };

  viewCourse = (courseId, isLocked, courseCreatorId, collaborators) => {
    const isCourseCreator = String(courseCreatorId) === String(this.state.userId);
    const isCollaborator = collaborators && collaborators.some(c => String(c) === String(this.state.userId));
    const canEdit = isCourseCreator || isCollaborator || !isLocked;
    localStorage.setItem('canEditCourse', canEdit);
    localStorage.setItem('isCourseCreator', isCourseCreator);
    this.props.navigate(`/course-detail/${courseId}`);
  };

  addCourse = () => {
    const { class_name, subject_name, unit_title, resource_type, syllabus_file, syllabus_text } = this.state;
    let requestData, contentType;
    if (resource_type === 'File') {
      if (!syllabus_file) return swal({ text: 'Please select a syllabus file!', icon: 'warning' });
      requestData = new FormData();
      requestData.append('class_name', class_name); requestData.append('subject_name', subject_name);
      requestData.append('unit_title', unit_title); requestData.append('resource_type', resource_type);
      requestData.append('syllabus_file', syllabus_file);
      contentType = 'multipart/form-data';
    } else {
      if (!syllabus_text.trim()) return swal({ text: 'Please enter syllabus content!', icon: 'warning' });
      requestData = { class_name, subject_name, unit_title, resource_type, syllabus_text: syllabus_text.trim() };
      contentType = 'application/json';
    }
    axios.post('http://localhost:2000/add-course', requestData, { headers: { 'Content-Type': contentType, 'token': this.state.token } })
      .then(res => { swal({ text: res.data.title, icon: 'success' }); this.resetModalState(); this.getCourseData(); })
      .catch(err => swal({ text: err.response?.data?.errorMessage || 'Something went wrong!', icon: 'error' }));
  };

  resetModalState = () => {
    this.setState({ openCourseModal: false, class_name: '', subject_name: '', unit_title: '', syllabus_file: null, syllabus_text: '', fileName: '', page: 1, showCustomSchool: false, showCustomCourse: false, showCustomSemester: false, showCustomSubject: false, selectedSemester: '', availableSubjects: [], usedSubjects: [] });
  };

  closeLockModal = () => {
    this.setState({ openLockModal: false, selectedCourseForLock: null, collaboratorEmail: '', collaborators: [] });
  };

  logOut = () => {
    localStorage.setItem('token', null);
    localStorage.setItem('userId', null);
    this.props.navigate("/");
  };

  handleSchoolChange = (e) => {
    const value = e.target.value;
    if (value === 'custom') { this.setState({ showCustomSchool: true, selectedSchool: '', availableCourses: [], availableSemesters: [], availableSubjects: [], selectedCourse: '', selectedSemester: '', class_name: '', subject_name: '', showCustomCourse: false, showCustomSemester: false, showCustomSubject: false, usedSubjects: [] }); }
    else { const schoolObj = semesterData.find(s => s.school === value); this.setState({ showCustomSchool: false, selectedSchool: value, availableCourses: schoolObj ? schoolObj.courses : [], availableSemesters: [], availableSubjects: [], selectedCourse: '', selectedSemester: '', class_name: '', subject_name: '', showCustomCourse: false, showCustomSemester: false, showCustomSubject: false, usedSubjects: [] }); }
  };

  handleCourseChange = (e) => {
    const value = e.target.value;
    if (value === 'custom') { this.setState({ showCustomCourse: true, selectedCourse: '', availableSemesters: [], availableSubjects: [], selectedSemester: '', class_name: '', subject_name: '', showCustomSemester: false, showCustomSubject: false, usedSubjects: [] }); }
    else { const courseObj = this.state.availableCourses.find(c => c.courseName === value); this.setState({ showCustomCourse: false, selectedCourse: value, availableSemesters: courseObj ? courseObj.semesters : [], availableSubjects: [], selectedSemester: '', class_name: '', subject_name: '', showCustomSemester: false, showCustomSubject: false, usedSubjects: [] }); }
  };

  handleSemesterChange = (e) => {
    const value = e.target.value;
    if (value === 'custom') { this.setState({ showCustomSemester: true, class_name: '', selectedSemester: '', availableSubjects: [], subject_name: '', showCustomSubject: false, usedSubjects: [] }); }
    else { const semesterObj = this.state.availableSemesters.find(s => s.semester === value); this.setState({ showCustomSemester: false, class_name: value, selectedSemester: value, availableSubjects: semesterObj ? semesterObj.subjects : [], subject_name: '', showCustomSubject: false }, () => this.checkUsedSubjects(value)); }
  };

  handleSubjectChange = (e) => {
    const value = e.target.value;
    if (value === 'custom') { this.setState({ showCustomSubject: true, subject_name: '' }); }
    else { this.setState({ showCustomSubject: false, subject_name: value }); }
  };

  onChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'syllabus_file' && files && files[0]) { this.setState({ syllabus_file: files[0], fileName: files[0].name }); return; }
    if (name === 'resource_type') { this.setState({ resource_type: value, syllabus_file: null, syllabus_text: '', fileName: '' }); return; }
    this.setState({ [name]: value }, () => { if (name === 'search') this.setState({ page: 1 }, () => this.getCourseData()); });
  };

  render() {
    const {
      courses, loading, openCourseModal, openLockModal, stats, search, userId,
      showCustomSchool, showCustomCourse, showCustomSemester, showCustomSubject,
      selectedSchool, selectedCourse, selectedSemester,
      availableCourses, availableSemesters, availableSubjects,
      selectedCourseForLock, collaboratorEmail, collaborators, loadingCollaborators,
      usedSubjects, userSchool, userCourse
    } = this.state;

    return (
      <div className="modern-dashboard">

        {/* ══════════════════════════════════════════════════
            SIDEBAR
        ══════════════════════════════════════════════════ */}
        <aside className="dashboard-sidebar">

          {/* Logo */}
          <div className="sidebar-logo">
            <div className="sidebar-logo-icon">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
            </div>
            <div>
              <p className="sidebar-brand-name">EduLens</p>
              <p className="sidebar-brand-sub">Teacher Platform</p>
            </div>
          </div>

          {/* User card */}
          <div className="sidebar-user">
            <div className="sidebar-avatar">T</div>
            <div>
              <p className="sidebar-user-name">Teacher</p>
              <p className="sidebar-user-role">Educator</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="sidebar-nav">
            <p className="sidebar-nav-label">Main Menu</p>

            <button className="sidebar-nav-item active">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/>
              </svg>
              <span>Dashboard</span>
            </button>

            <button className="sidebar-nav-item" onClick={() => this.setState({ openCourseModal: true })}>
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
              </svg>
              <span>My Courses</span>
              {courses.length > 0 && <span className="sidebar-badge">{courses.length}</span>}
            </button>

            {/* ✅ UPDATED: Resources now navigates to /resources */}
            <button className="sidebar-nav-item" onClick={() => this.props.navigate('/resources')}>
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
              </svg>
              <span>Resources</span>
            </button>

            <button className="sidebar-nav-item">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <span>Students</span>
            </button>

            <p className="sidebar-nav-label">Account</p>

            <button className="sidebar-nav-item">
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <span>Settings</span>
            </button>
          </nav>

          {/* Logout */}
          <div className="sidebar-footer">
            <button className="sidebar-logout" onClick={this.logOut}>
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
              <span>Log Out</span>
            </button>
          </div>

        </aside>

        {/* ══════════════════════════════════════════════════
            MAIN PANEL
        ══════════════════════════════════════════════════ */}
        <div className="dashboard-main-panel">

          {/* Top bar */}
          <header className="dashboard-topbar">
            <div className="topbar-left">
              <h1 className="topbar-page-title">Dashboard</h1>
              <p className="topbar-breadcrumb">EduLens · Teacher Portal</p>
            </div>
            <div className="topbar-right">
              <div className="topbar-search">
                <svg className="topbar-search-icon" width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                </svg>
                <input
                  type="search" name="search" value={search}
                  onChange={this.onChange}
                  placeholder="Search courses…"
                  className="topbar-search-input"
                />
              </div>
              <div className="topbar-divider"/>
              <div className="topbar-user">
                <div className="topbar-avatar">T</div>
                <span className="topbar-user-name">Teacher</span>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="dashboard-content">

            {/* Welcome */}
            <div className="welcome-row">
              <div>
                <p className="welcome-eyebrow">Good to see you</p>
                <h2 className="welcome-heading">Welcome Back, Teacher 👋</h2>
                <p className="welcome-sub">Manage your courses and help students access syllabus-aligned resources.</p>
              </div>
              <button onClick={() => this.setState({ openCourseModal: true })} className="add-course-btn" style={{flexShrink:0}}>
                <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
                </svg>
                Add Course
              </button>
            </div>

            {/* Stats */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon-wrap blue-icon">
                  <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </div>
                <div className="stat-body">
                  <span className="stat-label">Total Students</span>
                  <span className="stat-value">{stats.totalStudents}</span>
                  <p className="stat-trend">Across all courses</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon-wrap purple-icon">
                  <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
                  </svg>
                </div>
                <div className="stat-body">
                  <span className="stat-label">Active Courses</span>
                  <span className="stat-value">{stats.activeCourses}</span>
                  <p className="stat-trend">Currently published</p>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon-wrap cyan-icon">
                  <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                </div>
                <div className="stat-body">
                  <span className="stat-label">Resources Added</span>
                  <span className="stat-value">{stats.resourcesAdded}</span>
                  <p className="stat-trend">Syllabus files &amp; content</p>
                </div>
              </div>
            </div>

            {/* Courses table */}
            <div className="courses-card">
              <div className="courses-card-header">
                <div className="courses-header-left">
                  <h3 className="courses-title">My Courses</h3>
                  <p className="courses-subtitle">Manage your syllabus and course materials</p>
                </div>
                <div className="courses-header-right">
                  <div className="courses-search">
                    <svg className="courses-search-icon" width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                    <input type="search" name="search" value={search} onChange={this.onChange} placeholder="Search courses…" className="search-input"/>
                  </div>
                  <button onClick={() => this.setState({ openCourseModal: true })} className="add-course-btn">
                    <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
                    </svg>
                    Add Course
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="loading-container"><div className="spinner"></div></div>
              ) : (
                <div className="table-container">
                  <table className="courses-table">
                    <thead>
                      <tr>
                        <th>Semester</th>
                        <th>Subject</th>
                        <th>Unit</th>
                        <th>Syllabus</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{textAlign:'center', padding:'48px', color:'var(--text-4)', fontSize:'14px'}}>
                            No courses yet. Click <strong>Add Course</strong> to get started.
                          </td>
                        </tr>
                      ) : courses.map((row) => {
                        const isCourseCreator = String(row.user_id) === String(userId);
                        const isCollaborator = row.collaborators && row.collaborators.some(c => String(c) === String(userId));
                        const canEdit = isCourseCreator || isCollaborator || !row.isLocked;
                        return (
                          <tr key={row._id} className={row.isLocked && !canEdit ? 'locked-row' : ''}>
                            <td style={{fontWeight:600}}>{row.class_name}</td>
                            <td>{row.subject_name}</td>
                            <td style={{color:'var(--text-3)'}}>{row.unit_title}</td>
                            <td>
                              {row.resource_type === 'File' ? (
                                <a href={`http://localhost:2000/${row.syllabus_file_path}`} target="_blank" rel="noopener noreferrer" className="file-link">
                                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                                  View File
                                </a>
                              ) : (
                                <span className="text-preview">{row.syllabus_text?.substring(0, 32)}…</span>
                              )}
                            </td>
                            <td>
                              <div className="lock-status">
                                {isCourseCreator ? (
                                  <span className="lock-badge creator-badge">{row.isLocked ? '🔒 Locked' : '✓ Creator'}</span>
                                ) : isCollaborator ? (
                                  <span className="lock-badge collaborator-badge">Collaborator</span>
                                ) : row.isLocked ? (
                                  <span className="lock-badge locked-by-other">View Only</span>
                                ) : (
                                  <span className="lock-badge unlocked">Can Edit</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <div className="action-buttons">
                                <button onClick={() => this.viewCourse(row._id, row.isLocked, row.user_id, row.collaborators)} className="btn-view" title="View Course">
                                  View
                                </button>
                                {isCourseCreator && (
                                  <button onClick={() => this.handleLockClick(row)} className={`btn-lock ${row.isLocked ? 'locked' : ''}`} title={row.isLocked ? 'Manage Access' : 'Lock Course'}>
                                    <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20">
                                      {row.isLocked
                                        ? <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                                        : <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z"/>}
                                    </svg>
                                  </button>
                                )}
                                <button onClick={() => this.deleteCourse(row._id, row.user_id)} className="btn-delete" disabled={!isCourseCreator} title={!isCourseCreator ? 'Only creator can delete' : 'Delete'} style={{opacity: !isCourseCreator ? 0.35 : 1, cursor: !isCourseCreator ? 'not-allowed' : 'pointer'}}>
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </main>
        </div>

        {/* ══════════════════════════════════════════════════
            ADD COURSE MODAL
        ══════════════════════════════════════════════════ */}
        {openCourseModal && (
          <div className="modal-overlay" onClick={this.resetModalState}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <h3 className="modal-title">Add New Course</h3>
              <div className="modal-form">
                {userSchool && userCourse ? (
                  <>
                    <div className="form-group">
                      <label className="form-label">School</label>
                      <div className="readonly-field">
                        <input type="text" value={userSchool} className="form-input readonly-input" disabled readOnly/>
                        <span className="readonly-badge">Auto-filled</span>
                      </div>
                      <p className="field-hint">Set during registration</p>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Course</label>
                      <div className="readonly-field">
                        <input type="text" value={userCourse} className="form-input readonly-input" disabled readOnly/>
                        <span className="readonly-badge">Auto-filled</span>
                      </div>
                      <p className="field-hint">Set during registration</p>
                    </div>
                  </>
                ) : (
                  <>
                    <select name="school_dropdown" value={showCustomSchool ? 'custom' : selectedSchool} onChange={this.handleSchoolChange} className="form-select">
                      <option value="">Select School</option>
                      {semesterData.map((s, i) => <option key={i} value={s.school}>{s.school}</option>)}
                      <option value="custom">+ Add Custom School</option>
                    </select>
                    {showCustomSchool && <input type="text" name="custom_school" placeholder="Enter custom school name" className="form-input"/>}
                    {(selectedSchool || showCustomSchool) && (
                      <>
                        {!showCustomSchool && availableCourses.length > 0 && (
                          <select name="course_dropdown" value={showCustomCourse ? 'custom' : selectedCourse} onChange={this.handleCourseChange} className="form-select">
                            <option value="">Select Course</option>
                            {availableCourses.map((c, i) => <option key={i} value={c.courseName}>{c.courseName}</option>)}
                            <option value="custom">+ Add Custom Course</option>
                          </select>
                        )}
                        {(showCustomCourse || showCustomSchool) && <input type="text" name="custom_course" placeholder="Enter course name" className="form-input"/>}
                      </>
                    )}
                  </>
                )}
                {(selectedCourse || showCustomCourse || showCustomSchool || userCourse) && availableSemesters.length > 0 && (
                  <>
                    {!showCustomCourse && !showCustomSchool && (
                      <select name="semester_dropdown" value={showCustomSemester ? 'custom' : selectedSemester} onChange={this.handleSemesterChange} className="form-select">
                        <option value="">Select Semester</option>
                        {availableSemesters.map((s, i) => <option key={i} value={s.semester}>{s.semester}</option>)}
                        <option value="custom">+ Add Custom Semester</option>
                      </select>
                    )}
                    {(showCustomSemester || showCustomCourse || showCustomSchool) && <input type="text" name="class_name" value={this.state.class_name} onChange={this.onChange} placeholder="Enter semester name" className="form-input"/>}
                  </>
                )}
                {(selectedSemester || showCustomSemester || showCustomCourse || showCustomSchool) && (
                  <>
                    {!showCustomSemester && !showCustomCourse && !showCustomSchool && availableSubjects.length > 0 && (
                      <select name="subject_dropdown" value={showCustomSubject ? 'custom' : this.state.subject_name} onChange={this.handleSubjectChange} className="form-select">
                        <option value="">Select Subject</option>
                        {availableSubjects.map((s, i) => { const isUsed = usedSubjects.includes(s); return <option key={i} value={s} disabled={isUsed} style={{color: isUsed ? '#999' : 'inherit'}}>{s}{isUsed ? ' (Already Added)' : ''}</option>; })}
                        <option value="custom">+ Add Custom Subject</option>
                      </select>
                    )}
                    {(showCustomSubject || showCustomSemester || showCustomCourse || showCustomSchool) && <input type="text" name="subject_name" value={this.state.subject_name} onChange={this.onChange} placeholder="Enter subject name" className="form-input"/>}
                  </>
                )}
                <input type="text" name="unit_title" value={this.state.unit_title} onChange={this.onChange} placeholder="Unit Title" className="form-input"/>
                <select name="resource_type" value={this.state.resource_type} onChange={this.onChange} className="form-select">
                  <option value="File">Upload Syllabus File</option>
                  <option value="Text">Type Syllabus Content</option>
                </select>
                {this.state.resource_type === 'File' ? (
                  <label className="file-label">
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                    <span>{this.state.fileName || 'Choose file (PDF, DOC, DOCX)'}</span>
                    <input type="file" accept=".pdf,.doc,.docx" name="syllabus_file" onChange={this.onChange} className="file-input"/>
                  </label>
                ) : (
                  <textarea name="syllabus_text" value={this.state.syllabus_text} onChange={this.onChange} placeholder="Type syllabus content…" rows={4} className="form-textarea"/>
                )}
              </div>
              <div className="modal-actions">
                <button onClick={this.resetModalState} className="btn-cancel">Cancel</button>
                <button onClick={this.addCourse} disabled={!this.state.class_name || !this.state.subject_name || !this.state.unit_title} className="btn-submit">Add Course</button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            LOCK MODAL
        ══════════════════════════════════════════════════ */}
        {openLockModal && selectedCourseForLock && (
          <div className="modal-overlay" onClick={this.closeLockModal}>
            <div className="modal-content lock-modal" onClick={e => e.stopPropagation()}>
              <h3 className="modal-title">Manage Course Access</h3>
              <p className="modal-subtitle">{selectedCourseForLock.subject_name} — {selectedCourseForLock.unit_title}</p>
              <div className="lock-modal-body">
                <div className="unlock-section">
                  <h4 className="section-heading">Course Status</h4>
                  <div className="status-card locked">
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/></svg>
                    <div>
                      <p className="status-text">This course is currently locked</p>
                      <p className="status-subtext">Only you and invited collaborators can edit</p>
                    </div>
                  </div>
                  <button onClick={this.unlockCourse} className="btn-unlock">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2H7V7a3 3 0 015.905-.75 1 1 0 001.937-.5A5.002 5.002 0 0010 2z"/></svg>
                    Unlock for Everyone
                  </button>
                </div>
                <div className="collaborators-section">
                  <h4 className="section-heading">Invite Collaborators</h4>
                  <p className="section-description">Add teachers who can edit this course</p>
                  <div className="add-collaborator-form">
                    <input type="email" placeholder="Enter teacher email" value={collaboratorEmail} onChange={e => this.setState({ collaboratorEmail: e.target.value })} className="form-input"/>
                    <button onClick={this.addCollaborator} className="btn-add-collab">
                      <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd"/></svg>
                      Add
                    </button>
                  </div>
                  <div className="collaborators-list">
                    {loadingCollaborators ? (
                      <div className="loading-collaborators"><div className="spinner-small"></div></div>
                    ) : collaborators.length > 0 ? (
                      <>
                        <p className="list-heading">Current Collaborators ({collaborators.length})</p>
                        {collaborators.map(collab => (
                          <div key={collab._id} className="collaborator-item">
                            <div className="collab-info">
                              <div className="collab-avatar">{collab.username.charAt(0).toUpperCase()}</div>
                              <span className="collab-name">{collab.username}</span>
                            </div>
                            <button onClick={() => this.removeCollaborator(collab._id)} className="btn-remove-collab">
                              <svg width="14" height="14" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
                            </button>
                          </div>
                        ))}
                      </>
                    ) : (
                      <p className="no-collaborators">No collaborators added yet</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button onClick={this.closeLockModal} className="btn-cancel">Close</button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }
}

export default withRouter(Dashboard);