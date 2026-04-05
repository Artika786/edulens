import React, { Component } from 'react';
import { withRouter } from "./utils";
import axios from 'axios';
import swal from 'sweetalert';
import './TeacherResources.css';

class TeacherResources extends Component {
  constructor(props) {
    super(props);
    this.state = {
      courses: [],
      loading: true,
      token: localStorage.getItem("token"),
      expandedCourse: null,
      courseDetails: {},
      loadingDetail: {},
      savingVideos: {},
      generatingCode: {},
      copiedCode: null,
      searchQuery: '',
    };
  }

  componentDidMount() {
    if (!this.state.token) {
      this.props.navigate('/login');
    } else {
      this.fetchCourses();
    }
  }

  fetchCourses = () => {
    axios.get('https://edulens-backend-nxmw.onrender.com/get-courses', {
      headers: { token: this.state.token }
    })
    .then(res => {
      this.setState({ courses: res.data.courses || [], loading: false });
    })
    .catch((err) => {
      console.error('Fetch courses error:', err);
      this.setState({ loading: false });
      swal({
        text: err.response?.data?.errorMessage || "Failed to load courses",
        icon: "error"
      });
    });
  };

  loadCourseDetail = (courseId) => {
    if (this.state.courseDetails[courseId]) return;
    
    this.setState(prev => ({ 
      loadingDetail: { ...prev.loadingDetail, [courseId]: true } 
    }));
    
    axios.get(`https://edulens-backend-nxmw.onrender.com/get-course-by-id/${courseId}`, {
      headers: { token: this.state.token }
    })
    .then(res => {
      const { selectedVideos, classCode } = res.data.course;
      this.setState(prev => ({
        courseDetails: {
          ...prev.courseDetails,
          [courseId]: { 
            selectedVideos: selectedVideos || [], 
            classCode: classCode || null 
          }
        },
        loadingDetail: { ...prev.loadingDetail, [courseId]: false }
      }));
    })
    .catch((err) => {
      console.error('Load course detail error:', err);
      this.setState(prev => ({ 
        loadingDetail: { ...prev.loadingDetail, [courseId]: false } 
      }));
    });
  };

  toggleExpand = (courseId) => {
    const isExpanding = this.state.expandedCourse !== courseId;
    this.setState({ expandedCourse: isExpanding ? courseId : null });
    if (isExpanding) this.loadCourseDetail(courseId);
  };

  publishLocalVideos = (courseId) => {
    const localVideos = JSON.parse(localStorage.getItem('selectedVideos') || '[]');
    const currentCourseId = localStorage.getItem('currentCourseId');

    if (currentCourseId !== courseId) {
      swal({
        title: 'Wrong course selected',
        text: `Your currently-selected videos are from a different course. Go to the correct course detail page, select videos there, then come back here to publish.`,
        icon: 'warning'
      });
      return;
    }

    if (localVideos.length === 0) {
      swal({ 
        text: 'No videos selected. Go to the course detail page and select videos first.', 
        icon: 'warning' 
      });
      return;
    }

    this.setState(prev => ({ 
      savingVideos: { ...prev.savingVideos, [courseId]: true } 
    }));

    axios.post('https://edulens-backend-nxmw.onrender.com/save-course-videos',
      {
        courseId,
        selectedVideos: localVideos.map(v => ({
          videoId: v.videoId,
          title: v.title,
          thumbnail: v.thumbnail || null,
          topic: v.topic || null,
          isPaid: v.isPaid || false,
          price: v.price || null,
          platform: v.platform || null,
          platformLogo: v.platformLogo || null,
          instructor: v.instructor || null,
        }))
      },
      { 
        headers: { 
          'Content-Type': 'application/json', 
          token: this.state.token 
        } 
      }
    )
    .then(() => {
      this.setState(prev => ({
        savingVideos: { ...prev.savingVideos, [courseId]: false },
        courseDetails: { ...prev.courseDetails, [courseId]: undefined }
      }), () => this.loadCourseDetail(courseId));
      
      swal({ 
        text: `${localVideos.length} video${localVideos.length !== 1 ? 's' : ''} published to this course!`, 
        icon: 'success', 
        timer: 2000 
      });
    })
    .catch(err => {
      console.error('Publish videos error:', err);
      this.setState(prev => ({ 
        savingVideos: { ...prev.savingVideos, [courseId]: false } 
      }));
      swal({ 
        text: err.response?.data?.errorMessage || 'Failed to save videos', 
        icon: 'error' 
      });
    });
  };

  generateOrFetchCode = (courseId) => {
    this.setState(prev => ({ 
      generatingCode: { ...prev.generatingCode, [courseId]: true } 
    }));
    
    axios.post('https://edulens-backend-nxmw.onrender.com/generate-class-code',
      { courseId, selectedVideos: [] },
      { 
        headers: { 
          'Content-Type': 'application/json', 
          token: this.state.token 
        } 
      }
    )
    .then(res => {
      this.setState(prev => ({
        generatingCode: { ...prev.generatingCode, [courseId]: false },
        courseDetails: {
          ...prev.courseDetails,
          [courseId]: {
            ...(prev.courseDetails[courseId] || {}),
            classCode: res.data.classCode
          }
        }
      }));
    })
    .catch(err => {
      console.error('Generate code error:', err);
      this.setState(prev => ({ 
        generatingCode: { ...prev.generatingCode, [courseId]: false } 
      }));
      swal({ 
        text: err.response?.data?.errorMessage || 'Failed to generate code', 
        icon: 'error' 
      });
    });
  };

  copyCode = (code, courseId) => {
    navigator.clipboard.writeText(code);
    this.setState({ copiedCode: courseId });
    setTimeout(() => this.setState({ copiedCode: null }), 2000);
  };

  removePublishedVideo = (courseId, videoId) => {
    const detail = this.state.courseDetails[courseId];
    if (!detail) return;
    
    const updated = detail.selectedVideos.filter(v => v.videoId !== videoId);

    axios.post('https://edulens-backend-nxmw.onrender.com/save-course-videos',
      { courseId, selectedVideos: updated },
      { 
        headers: { 
          'Content-Type': 'application/json', 
          token: this.state.token 
        } 
      }
    )
    .then(() => {
      this.setState(prev => ({
        courseDetails: {
          ...prev.courseDetails,
          [courseId]: { 
            ...prev.courseDetails[courseId], 
            selectedVideos: updated 
          }
        }
      }));
    })
    .catch((err) => {
      console.error('Remove video error:', err);
      swal({ text: 'Failed to remove video', icon: 'error' });
    });
  };

  goBack = () => this.props.navigate(-1);

  render() {
    const { 
      courses, 
      loading, 
      expandedCourse, 
      courseDetails, 
      loadingDetail,
      savingVideos, 
      generatingCode, 
      copiedCode, 
      searchQuery 
    } = this.state;

    const filtered = courses.filter(c =>
      c.subject_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.class_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const localVideos = JSON.parse(localStorage.getItem('selectedVideos') || '[]');
    const localCourseId = localStorage.getItem('currentCourseId');

    return (
      <div className="tr-root">
        {/* HEADER */}
        <header className="tr-header">
          <div className="tr-header-inner">
            <div className="tr-brand">
              <div className="tr-logo">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="tr-brand-name">EduLens</span>
              <span className="tr-divider"/>
              <span className="tr-page-name">Resources</span>
            </div>

            <div className="tr-header-right">
              <div className="tr-search-wrap">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35" strokeLinecap="round"/>
                </svg>
                <input
                  className="tr-search"
                  placeholder="Search courses..."
                  value={searchQuery}
                  onChange={e => this.setState({ searchQuery: e.target.value })}
                />
              </div>
              <button className="tr-back-btn" onClick={this.goBack}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Dashboard
              </button>
            </div>
          </div>
        </header>

        {/* HERO */}
        <div className="tr-hero">
          <div className="tr-hero-inner">
            <div>
              <p className="tr-hero-label">TEACHER PANEL</p>
              <h1 className="tr-hero-title">Course Resources</h1>
              <p className="tr-hero-sub">Publish curated videos to each course so students can access them after entering their class code.</p>
            </div>
            {localVideos.length > 0 && (
              <div className="tr-local-badge">
                <div className="tr-local-badge-dot"/>
                <div>
                  <p className="tr-local-badge-title">{localVideos.length} video{localVideos.length !== 1 ? 's' : ''} ready to publish</p>
                  <p className="tr-local-badge-sub">From your last selection in Course Detail</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* HOW IT WORKS */}
        <div className="tr-steps-bar">
          <div className="tr-steps-inner">
            {[
              { n:'1', text:'Go to a course and select videos' },
              { n:'2', text:'Come here and click "Publish Videos"' },
              { n:'3', text:'Generate a class code and share it' },
              { n:'4', text:'Students see the videos instantly' },
            ].map(({ n, text }) => (
              <div className="tr-step" key={n}>
                <div className="tr-step-num">{n}</div>
                <span className="tr-step-text">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* COURSE LIST */}
        <main className="tr-main">
          {loading ? (
            <div className="tr-loading">
              <div className="tr-spinner"/>
              <p>Loading courses…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="tr-empty">
              <p className="tr-empty-title">No courses found</p>
              <p className="tr-empty-sub">
                {searchQuery ? 'Try a different search term.' : 'Add a course from the dashboard first.'}
              </p>
            </div>
          ) : (
            <div className="tr-course-list">
              {filtered.map((course, idx) => {
                const isOpen = expandedCourse === course._id;
                const detail = courseDetails[course._id];
                const isLoadingDetail = loadingDetail[course._id];
                const isSaving = savingVideos[course._id];
                const isGenerating = generatingCode[course._id];
                const isCopied = copiedCode === course._id;
                const publishedVideos = detail?.selectedVideos || [];
                const classCode = detail?.classCode;
                const canPublish = localCourseId === course._id && localVideos.length > 0;

                return (
                  <div 
                    className={`tr-course-card ${isOpen ? 'open' : ''}`} 
                    key={course._id} 
                    style={{ animationDelay: `${idx * 0.05}s` }}
                  >
                    {/* Card Header */}
                    <div className="tr-course-header" onClick={() => this.toggleExpand(course._id)}>
                      <div className="tr-course-left">
                        <div className="tr-course-icon">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                        <div>
                          <h3 className="tr-course-title">{course.subject_name}</h3>
                          <div className="tr-course-meta">
                            <span>{course.class_name}</span>
                            <span className="tr-dot">·</span>
                            <span>Unit {course.unit_title}</span>
                            {detail && (
                              <>
                                <span className="tr-dot">·</span>
                                <span className={publishedVideos.length > 0 ? 'tr-meta-green' : 'tr-meta-gray'}>
                                  {publishedVideos.length} video{publishedVideos.length !== 1 ? 's' : ''} published
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="tr-course-right">
                        {classCode && (
                          <div className="tr-code-pill" onClick={e => { e.stopPropagation(); this.copyCode(classCode, course._id); }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round"/>
                            </svg>
                            <span>{classCode}</span>
                            {isCopied
                              ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
                            }
                          </div>
                        )}
                        <div className={`tr-chevron ${isOpen ? 'open' : ''}`}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Panel */}
                    {isOpen && (
                      <div className="tr-course-body">
                        {isLoadingDetail ? (
                          <div className="tr-detail-loading">
                            <div className="tr-spinner-sm"/>
                            <span>Loading course data…</span>
                          </div>
                        ) : (
                          <>
                            {/* Action Row */}
                            <div className="tr-action-row">
                              <div className="tr-action-info">
                                {canPublish ? (
                                  <div className="tr-info-banner tr-info-ready">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01" strokeLinecap="round"/></svg>
                                    <span>{localVideos.length} video{localVideos.length !== 1 ? 's' : ''} selected in Course Detail — ready to publish to this course</span>
                                  </div>
                                ) : localVideos.length > 0 && localCourseId !== course._id ? (
                                  <div className="tr-info-banner tr-info-warn">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                    <span>Your selected videos belong to a different course. <button className="tr-link-btn" onClick={() => this.props.navigate(`/course-detail/${course._id}`)}>Open this course</button> and select videos there.</span>
                                  </div>
                                ) : (
                                  <div className="tr-info-banner tr-info-neutral">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01" strokeLinecap="round"/></svg>
                                    <span>No videos selected yet. <button className="tr-link-btn" onClick={() => this.props.navigate(`/course-detail/${course._id}`)}>Open course</button> to select videos, then publish here.</span>
                                  </div>
                                )}
                              </div>

                              <div className="tr-action-btns">
                                <button
                                  className="tr-btn tr-btn-secondary"
                                  onClick={() => this.props.navigate(`/course-detail/${course._id}`)}
                                >
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  Open Course
                                </button>

                                <button
                                  className={`tr-btn tr-btn-primary ${!canPublish ? 'disabled' : ''}`}
                                  onClick={() => canPublish && this.publishLocalVideos(course._id)}
                                  disabled={!canPublish || isSaving}
                                >
                                  {isSaving ? (
                                    <><div className="tr-spinner-sm white"/><span>Publishing…</span></>
                                  ) : (
                                    <>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                      Publish Videos
                                    </>
                                  )}
                                </button>

                                <button
                                  className="tr-btn tr-btn-code"
                                  onClick={() => this.generateOrFetchCode(course._id)}
                                  disabled={isGenerating}
                                >
                                  {isGenerating ? (
                                    <><div className="tr-spinner-sm white"/><span>Generating…</span></>
                                  ) : (
                                    <>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round"/></svg>
                                      {classCode ? 'Show Code' : 'Generate Code'}
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Class Code Display */}
                            {classCode && (
                              <div className="tr-code-display">
                                <div className="tr-code-label">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round"/></svg>
                                  Class Code — share this with students
                                </div>
                                <div className="tr-code-box" onClick={() => this.copyCode(classCode, course._id)}>
                                  <span className="tr-code-value">{classCode}</span>
                                  <button className="tr-copy-btn">
                                    {isCopied ? (
                                      <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg> Copied!</>
                                    ) : (
                                      <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy</>
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Published Videos */}
                            <div className="tr-videos-section">
                              <div className="tr-videos-header">
                                <h4 className="tr-videos-title">
                                  Published Videos
                                  {publishedVideos.length > 0 && <span className="tr-videos-count">{publishedVideos.length}</span>}
                                </h4>
                                <p className="tr-videos-sub">These videos are visible to students who enter the class code</p>
                              </div>

                              {publishedVideos.length === 0 ? (
                                <div className="tr-no-videos">
                                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                                  <p>No videos published yet</p>
                                  <span>Select videos in the course detail page, then click "Publish Videos" above</span>
                                </div>
                              ) : (
                                <div className="tr-video-grid">
                                  {publishedVideos.map(video => (
                                    <div className="tr-video-card" key={video.videoId}>
                                      <div className="tr-video-thumb">
                                        {video.thumbnail ? (
                                          <img src={video.thumbnail} alt={video.title}/>
                                        ) : video.platformLogo ? (
                                          <div className="tr-platform-thumb">
                                            <img src={video.platformLogo} alt={video.platform}/>
                                          </div>
                                        ) : (
                                          <div className="tr-thumb-placeholder">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                                          </div>
                                        )}
                                        {video.topic && <div className="tr-topic-tag">{video.topic}</div>}
                                      </div>
                                      <div className="tr-video-info">
                                        <p className="tr-video-title">{video.title}</p>
                                        {video.isPaid
                                          ? <span className="tr-video-paid">{video.platform} · {video.price}</span>
                                          : <span className="tr-video-free">YouTube · Free</span>
                                        }
                                      </div>
                                      <div className="tr-video-actions">
                                        {!video.isPaid && (
                                          <a href={`https://www.youtube.com/watch?v=${video.videoId}`} target="_blank" rel="noopener noreferrer" className="tr-video-watch">
                                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                                          </a>
                                        )}
                                        <button className="tr-video-remove" onClick={() => this.removePublishedVideo(course._id, video.videoId)}>
                                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/></svg>
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    );
  }
}

export default withRouter(TeacherResources);