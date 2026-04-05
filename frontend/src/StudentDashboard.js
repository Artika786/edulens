import React, { Component } from 'react';
import { withRouter } from "./utils";
import axios from 'axios';
import swal from 'sweetalert';

class StudentDashboard extends Component {
  constructor(props) {
    super(props);
    this.state = {
      courses: [],
      filteredCourses: [],
      loading: true,
      token: localStorage.getItem("token"),
      showCodeDialog: false,
      selectedCourseId: null,
      selectedCourseName: '',
      classCode: '',
      verifyingCode: false,
      searchQuery: '',
      activeSemester: null,
      availableSemesters: [],
      userInfo: null,
    };
  }

  componentDidMount() {
    if (!this.state.token) {
      this.props.navigate("/login");
    } else {
      this.getUserInfo();
    }
  }

  getUserInfo = () => {
    axios.get('https://edulens-backend-nxmw.onrender.com/get-user-info', {
      headers: { token: this.state.token }
    })
    .then((res) => {
      this.setState({ userInfo: res.data.user }, () => {
        this.getAvailableCourses();
      });
    })
    .catch(() => {
      this.getAvailableCourses();
    });
  };

  getAvailableCourses = () => {
    this.setState({ loading: true });
    axios.get('https://edulens-backend-nxmw.onrender.com/student/available-courses', {
      headers: { token: this.state.token }
    })
    .then((res) => {
      const courses = res.data.courses || [];
      const semesterSet = [...new Set(courses.map(c => c.class_name).filter(Boolean))].sort();

      const { userInfo } = this.state;
      let defaultSem = semesterSet[0] || null;
      if (userInfo?.course && semesterSet.includes(userInfo.course)) {
        defaultSem = userInfo.course;
      }

      this.setState({
        loading: false,
        courses,
        availableSemesters: semesterSet,
        activeSemester: defaultSem,
      }, () => this.applyFilter());
    })
    .catch((err) => {
      this.setState({ loading: false });
      swal({ text: err.response?.data?.errorMessage || "Failed to load courses", icon: "error" });
    });
  };

  applyFilter = () => {
    const { courses, activeSemester, searchQuery } = this.state;
    let result = courses;
    if (activeSemester) result = result.filter(c => c.class_name === activeSemester);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.subject_name?.toLowerCase().includes(q) ||
        c.unit_title?.toLowerCase().includes(q) ||
        c.user_id?.username?.toLowerCase().includes(q)
      );
    }
    this.setState({ filteredCourses: result });
  };

  handleSemesterChange = (sem) => {
    this.setState({ activeSemester: sem, searchQuery: '' }, this.applyFilter);
  };

  handleSearch = (query) => {
    this.setState({ searchQuery: query }, this.applyFilter);
  };

  handleAccessCourse = (courseId, courseName) => {
    this.setState({ showCodeDialog: true, selectedCourseId: courseId, selectedCourseName: courseName, classCode: '' });
  };

  handleCloseDialog = () => {
    this.setState({ showCodeDialog: false, selectedCourseId: null, selectedCourseName: '', classCode: '', verifyingCode: false });
  };

  verifyClassCode = () => {
    const { classCode, selectedCourseId } = this.state;
    if (!classCode.trim()) {
      swal({ text: "Please enter a class code", icon: "warning" });
      return;
    }
    this.setState({ verifyingCode: true });
    axios.post('https://edulens-backend-nxmw.onrender.com/student/verify-class-code',
      { courseId: selectedCourseId, classCode: classCode.trim() },
      { headers: { 'Content-Type': 'application/json', token: this.state.token } }
    )
    .then((res) => {
      this.setState({ verifyingCode: false });
      localStorage.setItem('accessedCourse', JSON.stringify(res.data.course));
      this.handleCloseDialog();
      swal({ text: "Access granted! Redirecting to course...", icon: "success" }).then(() => {
        this.props.navigate('/student-course-view', { state: { course: res.data.course } });
      });
    })
    .catch((err) => {
      this.setState({ verifyingCode: false });
      swal({ text: err.response?.data?.errorMessage || "Failed to verify class code", icon: "error" });
    });
  };

  handleLogout = () => {
    ['token','currentCourseId','selectedVideos','accessedCourse','userRole'].forEach(k => localStorage.removeItem(k));
    this.props.navigate('/login');
  };

  getInitials = (name) => {
    if (!name) return 'ST';
    return name.split('@')[0].slice(0, 2).toUpperCase();
  };

  render() {
    const {
      filteredCourses, loading, showCodeDialog, selectedCourseName,
      classCode, verifyingCode, searchQuery, availableSemesters,
      activeSemester, courses, userInfo
    } = this.state;

    const semCourseCount = activeSemester ? courses.filter(c => c.class_name === activeSemester).length : courses.length;

    return (
      <div className="sd-root">
        {/* HEADER */}
        <header className="sd-header">
          <div className="sd-header-inner">
            <div className="sd-brand">
              <div className="sd-logo-mark">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="sd-brand-name">EduLens</span>
              <span className="sd-brand-divider" />
              <span className="sd-brand-role">Student Portal</span>
            </div>

            <div className="sd-header-right">
              <div className="sd-user-pill">
                <div className="sd-avatar">{this.getInitials(userInfo?.username)}</div>
                <div className="sd-user-info">
                  <span className="sd-user-name">{userInfo?.username?.split('@')[0] || 'Student'}</span>
                  {userInfo?.school && <span className="sd-user-school">{userInfo.school}</span>}
                </div>
              </div>
              <button className="sd-logout-btn" onClick={this.handleLogout}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* HERO */}
        <div className="sd-hero">
          <div className="sd-hero-inner">
            <div className="sd-hero-text">
              <h1 className="sd-hero-title">
                Welcome back{userInfo?.username ? `, ${userInfo.username.split('@')[0]}` : ''}!
              </h1>
              <p className="sd-hero-sub">
                {userInfo?.course
                  ? `Enrolled in ${userInfo.course}${userInfo.school ? ` · ${userInfo.school}` : ''}`
                  : 'Browse and access your courses below'}
              </p>
            </div>
            <div className="sd-hero-stats">
              <div className="sd-stat">
                <span className="sd-stat-num">{courses.length}</span>
                <span className="sd-stat-label">Total</span>
              </div>
              <div className="sd-stat-divider" />
              <div className="sd-stat">
                <span className="sd-stat-num">{availableSemesters.length}</span>
                <span className="sd-stat-label">Semesters</span>
              </div>
              <div className="sd-stat-divider" />
              <div className="sd-stat">
                <span className="sd-stat-num">{semCourseCount}</span>
                <span className="sd-stat-label">In View</span>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN */}
        <main className="sd-main">
          {/* Toolbar */}
          <div className="sd-toolbar">
            <div className="sd-sem-scroll">
              {availableSemesters.map(sem => (
                <button
                  key={sem}
                  className={`sd-sem-btn ${activeSemester === sem ? 'active' : ''}`}
                  onClick={() => this.handleSemesterChange(sem)}
                >
                  {sem}
                  <span className="sd-sem-count">{courses.filter(c => c.class_name === sem).length}</span>
                </button>
              ))}
            </div>

            <div className="sd-search-wrap">
              <svg className="sd-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
              </svg>
              <input
                className="sd-search"
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => this.handleSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Section header */}
          <div className="sd-section-header">
            <h2 className="sd-section-title">{activeSemester || 'All Courses'}</h2>
            <span className="sd-section-count">{filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Content */}
          {loading ? (
            <div className="sd-loading">
              <div className="sd-spinner" />
              <p>Loading courses…</p>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="sd-empty">
              <div className="sd-empty-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className="sd-empty-title">{searchQuery ? 'No matching courses' : 'No courses yet'}</p>
              <p className="sd-empty-sub">{searchQuery ? 'Try a different search term' : 'Check back later or try another semester'}</p>
            </div>
          ) : (
            <div className="sd-grid">
              {filteredCourses.map((course, idx) => (
                <div className="sd-card" key={course._id} style={{ animationDelay: `${idx * 0.06}s` }}>
                  <div className="sd-card-accent" />
                  <div className="sd-card-body">
                    <div className="sd-card-badges">
                      <span className="sd-badge sd-badge-sem">{course.class_name}</span>
                      <span className="sd-badge sd-badge-avail">Available</span>
                    </div>
                    <h3 className="sd-card-title">{course.subject_name}</h3>
                    <p className="sd-card-unit">{course.unit_title}</p>
                  </div>

                  <div className="sd-card-meta">
                    <div className="sd-meta-row">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>{course.user_id?.username || 'Unknown'}</span>
                    </div>
                    <div className="sd-meta-row">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <span>{course.resource_type === 'File' ? 'Syllabus File' : 'Text Content'}</span>
                    </div>
                  </div>

                  <div className="sd-card-footer">
                    <button
                      className="sd-access-btn"
                      onClick={() => this.handleAccessCourse(course._id, `${course.class_name} · ${course.subject_name}`)}
                    >
                      Access Course
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* CLASS CODE MODAL */}
        {showCodeDialog && (
          <div className="sd-overlay" onClick={this.handleCloseDialog}>
            <div className="sd-modal" onClick={e => e.stopPropagation()}>
              <div className="sd-modal-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className="sd-modal-title">Enter Class Code</h2>
              <p className="sd-modal-course">{selectedCourseName}</p>
              <p className="sd-modal-hint">Your teacher has shared a code to unlock this course.</p>

              <input
                className="sd-code-input"
                type="text"
                placeholder="ABC123"
                value={classCode}
                onChange={e => this.setState({ classCode: e.target.value.toUpperCase() })}
                onKeyPress={e => e.key === 'Enter' && this.verifyClassCode()}
                disabled={verifyingCode}
                maxLength={8}
                autoFocus
              />

              <div className="sd-modal-actions">
                <button className="sd-modal-cancel" onClick={this.handleCloseDialog} disabled={verifyingCode}>Cancel</button>
                <button
                  className="sd-modal-submit"
                  onClick={this.verifyClassCode}
                  disabled={verifyingCode || !classCode.trim()}
                >
                  {verifyingCode ? <><div className="sd-btn-spinner" /> Verifying…</> : 'Verify & Enter'}
                </button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Fraunces:wght@400;700&display=swap');

          .sd-root {
            min-height: 100vh;
            background-color: #EFF3F8;
            background-image:
              radial-gradient(circle, rgba(99,145,234,0.22) 1.5px, transparent 1.5px),
              radial-gradient(ellipse 65% 55% at 105% -5%, rgba(59,130,246,0.14) 0%, transparent 60%);
            background-size: 24px 24px, 100% 100%;
            font-family: 'Plus Jakarta Sans', sans-serif;
          }

          /* HEADER */
          .sd-header {
            position: sticky; top: 0; z-index: 50;
            background: rgba(255,255,255,0.94);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid #E2E8F0;
            box-shadow: 0 1px 3px rgba(15,23,42,0.05);
          }
          .sd-header-inner {
            max-width: 1280px; margin: 0 auto;
            padding: 13px 28px;
            display: flex; align-items: center; justify-content: space-between;
          }
          .sd-brand { display: flex; align-items: center; gap: 10px; }
          .sd-logo-mark {
            width: 36px; height: 36px; border-radius: 10px;
            background: linear-gradient(135deg, #3B82F6, #06B6D4);
            display: flex; align-items: center; justify-content: center; color: white;
            box-shadow: 0 4px 12px rgba(59,130,246,0.35);
          }
          .sd-brand-name {
            font-family: 'Fraunces', serif;
            font-size: 20px; font-weight: 700; color: #0F172A; letter-spacing: -0.5px;
          }
          .sd-brand-divider { width: 1px; height: 16px; background: #CBD5E1; }
          .sd-brand-role { font-size: 13px; font-weight: 600; color: #64748B; }
          .sd-header-right { display: flex; align-items: center; gap: 10px; }
          .sd-user-pill {
            display: flex; align-items: center; gap: 9px;
            background: #F8FAFC; border: 1px solid #E2E8F0;
            border-radius: 40px; padding: 5px 14px 5px 5px;
          }
          .sd-avatar {
            width: 28px; height: 28px; border-radius: 50%;
            background: linear-gradient(135deg, #3B82F6, #06B6D4);
            display: flex; align-items: center; justify-content: center;
            color: white; font-size: 11px; font-weight: 700;
          }
          .sd-user-info { display: flex; flex-direction: column; }
          .sd-user-name { font-size: 12.5px; font-weight: 600; color: #0F172A; line-height: 1.2; }
          .sd-user-school { font-size: 11px; color: #94A3B8; line-height: 1.2; }
          .sd-logout-btn {
            display: flex; align-items: center; gap: 6px;
            padding: 8px 14px; border-radius: 8px;
            background: transparent; border: 1.5px solid #E2E8F0;
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 13px; font-weight: 600; color: #475569;
            cursor: pointer; transition: all 0.18s;
          }
          .sd-logout-btn:hover { border-color: #EF4444; color: #EF4444; background: #FFF5F5; }

          /* HERO */
          .sd-hero {
            background: linear-gradient(135deg, #0A1628 0%, #0F1E35 60%, #162440 100%);
            border-bottom: 1px solid rgba(59,130,246,0.12);
            position: relative; overflow: hidden;
          }
          .sd-hero::before {
            content: ''; position: absolute;
            top: -80px; right: -80px;
            width: 300px; height: 300px; border-radius: 50%;
            border: 1px solid rgba(59,130,246,0.1);
            pointer-events: none;
          }
          .sd-hero-inner {
            max-width: 1280px; margin: 0 auto;
            padding: 32px 28px;
            display: flex; align-items: center; justify-content: space-between;
            gap: 24px; flex-wrap: wrap; position: relative; z-index: 1;
          }
          .sd-hero-title {
            font-family: 'Fraunces', serif;
            font-size: 26px; font-weight: 700; color: #fff;
            letter-spacing: -0.5px; margin: 0 0 6px;
          }
          .sd-hero-sub { font-size: 13.5px; color: rgba(255,255,255,0.48); }
          .sd-hero-stats {
            display: flex; align-items: center; gap: 24px;
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.10);
            border-radius: 14px; padding: 16px 28px;
          }
          .sd-stat { text-align: center; }
          .sd-stat-num {
            display: block; font-family: 'Fraunces', serif;
            font-size: 26px; font-weight: 700; color: #fff; line-height: 1;
          }
          .sd-stat-label { font-size: 10.5px; color: rgba(255,255,255,0.4); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
          .sd-stat-divider { width: 1px; height: 32px; background: rgba(255,255,255,0.12); }

          /* MAIN */
          .sd-main { max-width: 1280px; margin: 0 auto; padding: 30px 28px 60px; }

          /* TOOLBAR */
          .sd-toolbar {
            display: flex; align-items: center; justify-content: space-between;
            gap: 14px; margin-bottom: 24px; flex-wrap: wrap;
          }
          .sd-sem-scroll { display: flex; gap: 8px; flex-wrap: wrap; }
          .sd-sem-btn {
            display: flex; align-items: center; gap: 6px;
            padding: 8px 16px; border-radius: 40px;
            border: 1.5px solid #E2E8F0; background: white;
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 13px; font-weight: 600; color: #475569;
            cursor: pointer; transition: all 0.18s; white-space: nowrap;
          }
          .sd-sem-btn:hover { border-color: #3B82F6; color: #3B82F6; }
          .sd-sem-btn.active {
            background: #0A1628; color: white; border-color: #0A1628;
            box-shadow: 0 3px 10px rgba(10,22,40,0.22);
          }
          .sd-sem-count {
            font-size: 11px; font-weight: 700; padding: 1px 7px; border-radius: 20px;
            background: rgba(255,255,255,0.18);
          }
          .sd-sem-btn:not(.active) .sd-sem-count { background: #F1F5F9; color: #94A3B8; }

          .sd-search-wrap { position: relative; display: flex; align-items: center; }
          .sd-search-icon { position: absolute; left: 11px; color: #94A3B8; pointer-events: none; }
          .sd-search {
            padding: 9px 14px 9px 34px;
            border: 1.5px solid #E2E8F0; border-radius: 10px; background: white;
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 13.5px; color: #0F172A; outline: none;
            transition: border-color 0.18s, box-shadow 0.18s; width: 220px;
          }
          .sd-search:focus { border-color: #3B82F6; box-shadow: 0 0 0 3px rgba(59,130,246,0.14); }
          .sd-search::placeholder { color: #94A3B8; }

          /* SECTION HEADER */
          .sd-section-header {
            display: flex; align-items: baseline; gap: 12px; margin-bottom: 18px;
          }
          .sd-section-title {
            font-family: 'Fraunces', serif;
            font-size: 21px; font-weight: 700; color: #0F172A;
          }
          .sd-section-count { font-size: 13px; color: #94A3B8; font-weight: 500; }

          /* GRID */
          .sd-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
            gap: 18px;
          }

          /* CARD */
          .sd-card {
            background: white; border: 1px solid #E2E8F0;
            border-radius: 16px; overflow: hidden;
            display: flex; flex-direction: column;
            transition: transform 0.22s, box-shadow 0.22s;
            animation: sdCardIn 0.4s cubic-bezier(.4,0,.2,1) both;
            box-shadow: 0 1px 3px rgba(15,23,42,0.06);
            position: relative;
          }
          @keyframes sdCardIn {
            from { opacity: 0; transform: translateY(14px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .sd-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 10px 28px rgba(15,23,42,0.11);
          }
          .sd-card-accent {
            height: 3px;
            background: linear-gradient(90deg, #3B82F6, #06B6D4);
          }
          .sd-card-body { padding: 20px 20px 12px; flex: 1; }
          .sd-card-badges { display: flex; gap: 6px; margin-bottom: 11px; flex-wrap: wrap; }
          .sd-badge {
            font-size: 11px; font-weight: 700; padding: 3px 9px;
            border-radius: 20px; letter-spacing: 0.03em;
          }
          .sd-badge-sem { background: #F1F5F9; color: #475569; }
          .sd-badge-avail { background: rgba(59,130,246,0.1); color: #2563EB; }
          .sd-card-title {
            font-size: 16px; font-weight: 700; color: #0F172A;
            line-height: 1.35; margin-bottom: 4px;
          }
          .sd-card-unit { font-size: 12.5px; color: #64748B; line-height: 1.4; }

          .sd-card-meta {
            padding: 10px 20px;
            border-top: 1px solid #F1F5F9;
            display: flex; flex-direction: column; gap: 5px;
          }
          .sd-meta-row {
            display: flex; align-items: center; gap: 6px;
            font-size: 12px; color: #94A3B8;
          }
          .sd-meta-row svg { flex-shrink: 0; color: #CBD5E1; }

          .sd-card-footer { padding: 14px 20px 18px; }
          .sd-access-btn {
            width: 100%; display: flex; align-items: center;
            justify-content: center; gap: 7px;
            padding: 10px 18px;
            background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
            color: white; border: none; border-radius: 10px;
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 13.5px; font-weight: 700;
            cursor: pointer; transition: all 0.18s;
            box-shadow: 0 3px 10px rgba(59,130,246,0.28);
          }
          .sd-access-btn:hover {
            background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
            box-shadow: 0 6px 18px rgba(59,130,246,0.38);
            transform: translateY(-1px);
          }

          /* EMPTY / LOADING */
          .sd-loading {
            display: flex; flex-direction: column; align-items: center;
            gap: 14px; padding: 80px 40px; color: #94A3B8;
            font-size: 14px;
          }
          .sd-spinner {
            width: 34px; height: 34px; border-radius: 50%;
            border: 3px solid #E2E8F0; border-top-color: #3B82F6;
            animation: sdSpin 0.7s linear infinite;
          }
          @keyframes sdSpin { to { transform: rotate(360deg); } }
          .sd-empty {
            display: flex; flex-direction: column; align-items: center;
            gap: 8px; padding: 80px 40px; text-align: center;
          }
          .sd-empty-icon {
            width: 60px; height: 60px; border-radius: 14px;
            background: white; border: 1px solid #E2E8F0;
            display: flex; align-items: center; justify-content: center;
            color: #94A3B8; margin-bottom: 8px;
          }
          .sd-empty-title { font-size: 16px; font-weight: 600; color: #334155; }
          .sd-empty-sub { font-size: 13.5px; color: #94A3B8; }

          /* MODAL */
          .sd-overlay {
            position: fixed; inset: 0; z-index: 100;
            background: rgba(10,22,40,0.55); backdrop-filter: blur(4px);
            display: flex; align-items: center; justify-content: center; padding: 24px;
          }
          .sd-modal {
            background: white; border-radius: 20px; padding: 36px 32px 28px;
            width: 100%; max-width: 390px;
            box-shadow: 0 24px 60px rgba(10,22,40,0.25);
            animation: sdCardIn 0.3s cubic-bezier(.4,0,.2,1) both;
            display: flex; flex-direction: column; align-items: center; text-align: center;
          }
          .sd-modal-icon {
            width: 58px; height: 58px; border-radius: 16px;
            background: linear-gradient(135deg, rgba(59,130,246,0.1), rgba(6,182,212,0.1));
            border: 1px solid rgba(59,130,246,0.18);
            display: flex; align-items: center; justify-content: center;
            color: #3B82F6; margin-bottom: 16px;
          }
          .sd-modal-title {
            font-family: 'Fraunces', serif;
            font-size: 21px; font-weight: 700; color: #0F172A; margin-bottom: 4px;
          }
          .sd-modal-course {
            font-size: 13px; font-weight: 600; color: #3B82F6; margin-bottom: 8px;
          }
          .sd-modal-hint { font-size: 13px; color: #94A3B8; margin-bottom: 22px; line-height: 1.55; }
          .sd-code-input {
            width: 100%; padding: 14px 16px;
            border: 1.5px solid #E2E8F0; border-radius: 12px;
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 24px; font-weight: 700;
            text-align: center; letter-spacing: 10px;
            color: #0F172A; outline: none;
            background: #F8FAFC; margin-bottom: 22px;
            transition: border-color 0.18s, box-shadow 0.18s;
          }
          .sd-code-input:focus {
            border-color: #3B82F6;
            box-shadow: 0 0 0 3px rgba(59,130,246,0.14);
            background: white;
          }
          .sd-modal-actions { display: flex; gap: 10px; width: 100%; }
          .sd-modal-cancel {
            flex: 1; padding: 11px; background: transparent;
            border: 1.5px solid #E2E8F0; border-radius: 10px;
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 13.5px; font-weight: 600; color: #475569;
            cursor: pointer; transition: all 0.18s;
          }
          .sd-modal-cancel:hover { border-color: #CBD5E1; background: #F8FAFC; }
          .sd-modal-submit {
            flex: 2; padding: 11px;
            background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
            color: white; border: none; border-radius: 10px;
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 13.5px; font-weight: 700;
            cursor: pointer; transition: all 0.18s;
            box-shadow: 0 3px 10px rgba(59,130,246,0.28);
            display: flex; align-items: center; justify-content: center; gap: 8px;
          }
          .sd-modal-submit:hover:not(:disabled) {
            background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
          }
          .sd-modal-submit:disabled { opacity: 0.42; cursor: not-allowed; box-shadow: none; }
          .sd-btn-spinner {
            width: 15px; height: 15px; border-radius: 50%;
            border: 2px solid rgba(255,255,255,0.35);
            border-top-color: white;
            animation: sdSpin 0.7s linear infinite;
          }

          @media (max-width: 640px) {
            .sd-hero-inner { flex-direction: column; align-items: flex-start; }
            .sd-hero-stats { width: 100%; justify-content: space-around; }
            .sd-toolbar { flex-direction: column; align-items: stretch; }
            .sd-search, .sd-search-wrap { width: 100%; }
          }
        `}</style>
      </div>
    );
  }
}

export default withRouter(StudentDashboard);