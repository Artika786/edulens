import React, { Component } from 'react';
import { withRouter } from "./utils";
import swal from 'sweetalert';
const BASE_URL = process.env.REACT_APP_BASE_URL;
class StudentCourseView extends Component {
  constructor(props) {
    super(props);
    this.state = {
      course: null,
      loading: true,
      activeTab: 'syllabus',
      token: localStorage.getItem("token")
    };
  }

  componentDidMount() {
    const courseFromNav = this.props.location?.state?.course;
    const courseFromStorage = JSON.parse(localStorage.getItem('accessedCourse') || 'null');
    const course = courseFromNav || courseFromStorage;

    if (!course) {
      swal({ text: "No course access. Please enter a class code first.", icon: "error" })
        .then(() => this.props.navigate('/student-dashboard'));
      return;
    }
    this.setState({ course, loading: false });
  }

  goBack = () => this.props.navigate('/student-dashboard');

  parseTopicsFromSyllabus = (syllabusText) => {
    if (!syllabusText) return [];
    return syllabusText
      .split(/[\n,]/)
      .map(t => t.trim())
      .filter(t => t.length > 3 && !t.toLowerCase().startsWith('unit'))
      .slice(0, 12);
  };

  render() {
    const { course, loading, activeTab } = this.state;

    if (loading) {
      return (
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'center',
          minHeight:'100vh', background:'#EFF3F8',
          fontFamily:"'Plus Jakarta Sans', sans-serif"
        }}>
          <div style={{
            width:36, height:36, borderRadius:'50%',
            border:'3px solid #E2E8F0', borderTopColor:'#3B82F6',
            animation:'spin 0.7s linear infinite'
          }}/>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      );
    }

    if (!course) {
      return (
        <div style={{ padding:'40px', textAlign:'center', fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
          <p style={{ color:'#475569' }}>Course not found</p>
        </div>
      );
    }

    const topics = this.parseTopicsFromSyllabus(course.syllabus_text);
    const selectedVideos = course.selectedVideos || [];

    const videosByTopic = {};
    selectedVideos.forEach(v => {
      const key = v.topic || 'General';
      if (!videosByTopic[key]) videosByTopic[key] = [];
      videosByTopic[key].push(v);
    });
    const topicGroups = Object.entries(videosByTopic);

    return (
      <div className="scv-root">
        {/* HEADER */}
        <header className="scv-header">
          <div className="scv-header-inner">
            <button className="scv-back-btn" onClick={this.goBack}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M19 12H5M12 5l-7 7 7 7" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>
            <div className="scv-brand">
              <div className="scv-logo-mark">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="scv-brand-name">EduLens</span>
            </div>
            <div style={{ width: 80 }} />
          </div>
        </header>

        {/* HERO */}
        <div className="scv-hero">
          <div className="scv-hero-inner">
            <div className="scv-hero-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="scv-hero-text">
              <div className="scv-hero-meta">
                <span className="scv-chip">{course.class_name}</span>
                <span className="scv-chip scv-chip-blue">{course.resource_type === 'File' ? 'Syllabus File' : 'Text Content'}</span>
                {selectedVideos.length > 0 && (
                  <span className="scv-chip scv-chip-green">{selectedVideos.length} Video{selectedVideos.length !== 1 ? 's' : ''}</span>
                )}
              </div>
              <h1 className="scv-hero-title">{course.subject_name}</h1>
              <p className="scv-hero-sub">{course.unit_title}</p>
            </div>
          </div>
        </div>

        {/* BODY */}
        <div className="scv-body">
          {/* SIDEBAR */}
          <aside className="scv-sidebar">
            <div className="scv-card">
              <h3 className="scv-card-heading">Course Info</h3>
              <div className="scv-info-list">
                {[
                  { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5" strokeLinecap="round" strokeLinejoin="round"/></svg>, label: 'Class', value: course.class_name },
                  { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13" strokeLinecap="round" strokeLinejoin="round"/></svg>, label: 'Subject', value: course.subject_name },
                  { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round"/><polyline points="14 2 14 8 20 8"/></svg>, label: 'Unit', value: course.unit_title },
                  { icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" strokeLinecap="round" strokeLinejoin="round"/></svg>, label: 'Teacher', value: course.user_id?.username || course.teacher || 'Unknown' },
                ].map(({ icon, label, value }) => (
                  <div className="scv-info-item" key={label}>
                    <div className="scv-info-icon">{icon}</div>
                    <div>
                      <div className="scv-info-label">{label}</div>
                      <div className="scv-info-value">{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {topics.length > 0 && (
              <div className="scv-card">
                <h3 className="scv-card-heading">Topics</h3>
                <div className="scv-topics">
                  {topics.map((topic, i) => (
                    <div className="scv-topic-item" key={i}>
                      <span className="scv-topic-num">{String(i+1).padStart(2,'0')}</span>
                      <span className="scv-topic-text">{topic.length > 48 ? topic.slice(0,48)+'…' : topic}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* MAIN CONTENT */}
          <main className="scv-content">
            {/* Tabs */}
            <div className="scv-tabs">
              {[
                { id: 'syllabus', label: 'Syllabus', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
                { id: 'videos', label: `Videos${selectedVideos.length > 0 ? ` (${selectedVideos.length})` : ''}`, icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg> },
                { id: 'materials', label: 'Materials', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/></svg> },
              ].map(tab => (
                <button key={tab.id} className={`scv-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => this.setState({ activeTab: tab.id })}>
                  {tab.icon}{tab.label}
                </button>
              ))}
            </div>

            {/* ── SYLLABUS TAB ── */}
            {activeTab === 'syllabus' && (
              <div className="scv-panel">
                {course.resource_type === 'File' ? (
                  <div className="scv-file-card">
                    <div className="scv-file-icon">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                    </div>
                    <h3 className="scv-file-title">Syllabus Document</h3>
                    <p className="scv-file-sub">Download the complete course syllabus provided by your teacher.</p>
                    <a href={`https://edulens-backend-nxmw.onrender.com/${course.syllabus_file_path}`} target="_blank" rel="noopener noreferrer" className="scv-download-btn">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Download Syllabus
                    </a>
                  </div>
                ) : (
                  <div className="scv-text-syllabus">
                    <div className="scv-text-header">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round" strokeLinejoin="round"/><polyline points="14 2 14 8 20 8"/></svg>
                      Syllabus Content
                    </div>
                    <div className="scv-text-content">{course.syllabus_text || 'No syllabus content available'}</div>
                  </div>
                )}
              </div>
            )}

            {/* ── VIDEOS TAB ── */}
            {activeTab === 'videos' && (
              <div className="scv-panel">
                {selectedVideos.length === 0 ? (
                  <div className="scv-coming-soon">
                    <div className="scv-cs-icon">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                    </div>
                    <h3 className="scv-cs-title">No videos yet</h3>
                    <p className="scv-cs-sub">Video resources will appear here once your teacher adds them.</p>
                    <div className="scv-cs-badge">Coming Soon</div>
                  </div>
                ) : (
                  <div className="scv-videos-wrap">
                    {topicGroups.map(([topic, videos]) => (
                      <div className="scv-topic-group" key={topic}>
                        <div className="scv-topic-group-header">
                          <div className="scv-topic-group-dot" />
                          <h3 className="scv-topic-group-title">{topic}</h3>
                          <span className="scv-topic-group-count">{videos.length} video{videos.length !== 1 ? 's' : ''}</span>
                        </div>

                        <div className="scv-video-grid">
                          {videos.map((video) => {
                            if (video.isPaid) {
                              return (
                                <div key={video.videoId} className="scv-video-card">
                                  {/* Thumbnail */}
                                  <div className="scv-video-thumb">
                                    {video.thumbnail ? (
                                      <img src={video.thumbnail} alt={video.title} />
                                    ) : video.platformLogo ? (
                                      <div className="scv-video-platform-thumb">
                                        <img src={video.platformLogo} alt={video.platform} />
                                      </div>
                                    ) : (
                                      <div className="scv-video-thumb-placeholder">
                                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                          <polygon points="23 7 16 12 23 17 23 7"/>
                                          <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                                        </svg>
                                      </div>
                                    )}
                                    {/* Paid badge */}
                                    <div className="scv-paid-badge">
                                      {video.platform}
                                    </div>
                                  </div>
                                  {/* Info */}
                                  <div className="scv-video-info">
                                    <p className="scv-video-title">{video.title}</p>
                                    {video.instructor && (
                                      <p className="scv-video-instructor">{video.instructor}</p>
                                    )}
                                    <div className="scv-video-meta-row">
                                      <span className="scv-video-price">{video.price}</span>
                                    </div>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <a
                                key={video.videoId}
                                href={`https://www.youtube.com/watch?v=${video.videoId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="scv-video-card"
                              >
                                {/* Thumbnail */}
                                <div className="scv-video-thumb">
                                  {video.thumbnail ? (
                                    <img src={video.thumbnail} alt={video.title} />
                                  ) : video.platformLogo ? (
                                    <div className="scv-video-platform-thumb">
                                      <img src={video.platformLogo} alt={video.platform} />
                                    </div>
                                  ) : (
                                    <div className="scv-video-thumb-placeholder">
                                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                        <polygon points="23 7 16 12 23 17 23 7"/>
                                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
                                      </svg>
                                    </div>
                                  )}
                                  {/* Play overlay */}
                                  <div className="scv-play-overlay">
                                    <div className="scv-play-btn">
                                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M8 5v14l11-7z"/>
                                      </svg>
                                    </div>
                                  </div>
                                </div>
                                {/* Info */}
                                <div className="scv-video-info">
                                  <p className="scv-video-title">{video.title}</p>
                                  {video.instructor && (
                                    <p className="scv-video-instructor">{video.instructor}</p>
                                  )}
                                  <div className="scv-video-meta-row">
                                    <span className="scv-video-free">
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.28 6.28 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z"/>
                                      </svg>
                                      YouTube · Free
                                    </span>
                                  </div>
                                </div>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── MATERIALS TAB ── */}
            {activeTab === 'materials' && (
              <div className="scv-panel">
                <div className="scv-materials-grid">
                  {[
                    { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round"/></svg>, title: 'Lecture Notes', desc: 'Written notes from your teacher' },
                    { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeLinecap="round" strokeLinejoin="round"/></svg>, title: 'Assignments', desc: 'Practice exercises and tasks' },
                    { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round"/></svg>, title: 'Quiz', desc: 'Test your knowledge' },
                    { icon: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round"/></svg>, title: 'Discussions', desc: 'Forum threads and Q&A' },
                  ].map(({ icon, title, desc }) => (
                    <div className="scv-material-card" key={title}>
                      <div className="scv-material-icon">{icon}</div>
                      <h4 className="scv-material-title">{title}</h4>
                      <p className="scv-material-desc">{desc}</p>
                      <span className="scv-cs-badge">Coming Soon</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </main>
        </div>

        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Fraunces:wght@400;700&display=swap');

          .scv-root { min-height:100vh; background-color:#EFF3F8; background-image: radial-gradient(circle, rgba(99,145,234,0.18) 1.5px, transparent 1.5px), radial-gradient(ellipse 65% 55% at 105% -5%, rgba(59,130,246,0.10) 0%, transparent 60%); background-size:24px 24px,100% 100%; font-family:'Plus Jakarta Sans',sans-serif; }

          /* HEADER */
          .scv-header { position:sticky; top:0; z-index:50; background:rgba(255,255,255,0.94); backdrop-filter:blur(12px); border-bottom:1px solid #E2E8F0; box-shadow:0 1px 3px rgba(15,23,42,0.05); }
          .scv-header-inner { max-width:1280px; margin:0 auto; padding:13px 28px; display:flex; align-items:center; justify-content:space-between; }
          .scv-back-btn { display:flex; align-items:center; gap:6px; padding:8px 14px; border-radius:8px; background:transparent; border:1.5px solid #E2E8F0; font-family:'Plus Jakarta Sans',sans-serif; font-size:13px; font-weight:600; color:#475569; cursor:pointer; transition:all 0.18s; }
          .scv-back-btn:hover { border-color:#3B82F6; color:#3B82F6; background:rgba(59,130,246,0.05); }
          .scv-brand { display:flex; align-items:center; gap:9px; }
          .scv-logo-mark { width:34px; height:34px; border-radius:9px; background:linear-gradient(135deg,#3B82F6,#06B6D4); display:flex; align-items:center; justify-content:center; color:white; box-shadow:0 3px 10px rgba(59,130,246,0.3); }
          .scv-brand-name { font-family:'Fraunces',serif; font-size:18px; font-weight:700; color:#0F172A; letter-spacing:-0.4px; }

          /* HERO */
          .scv-hero { background:linear-gradient(135deg,#0A1628 0%,#0F1E35 60%,#162440 100%); border-bottom:1px solid rgba(59,130,246,0.12); }
          .scv-hero-inner { max-width:1280px; margin:0 auto; padding:32px 28px; display:flex; align-items:center; gap:20px; }
          .scv-hero-icon { width:64px; height:64px; border-radius:16px; flex-shrink:0; background:rgba(255,255,255,0.07); border:1px solid rgba(255,255,255,0.12); display:flex; align-items:center; justify-content:center; color:#93C5FD; }
          .scv-hero-meta { display:flex; gap:8px; margin-bottom:10px; flex-wrap:wrap; }
          .scv-chip { font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px; background:rgba(255,255,255,0.1); color:rgba(255,255,255,0.7); letter-spacing:0.03em; }
          .scv-chip-blue { background:rgba(59,130,246,0.2); color:#93C5FD; }
          .scv-chip-green { background:rgba(16,185,129,0.2); color:#6EE7B7; }
          .scv-hero-title { font-family:'Fraunces',serif; font-size:26px; font-weight:700; color:#fff; letter-spacing:-0.5px; margin:0 0 5px; }
          .scv-hero-sub { font-size:13.5px; color:rgba(255,255,255,0.48); }

          /* BODY */
          .scv-body { max-width:1280px; margin:0 auto; padding:28px 28px 60px; display:grid; grid-template-columns:280px 1fr; gap:22px; align-items:start; }

          /* SIDEBAR */
          .scv-sidebar { display:flex; flex-direction:column; gap:16px; }
          .scv-card { background:white; border:1px solid #E2E8F0; border-radius:14px; padding:20px; box-shadow:0 1px 3px rgba(15,23,42,0.05); }
          .scv-card-heading { font-size:12px; font-weight:700; color:#94A3B8; letter-spacing:0.08em; text-transform:uppercase; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid #F1F5F9; }
          .scv-info-list { display:flex; flex-direction:column; gap:12px; }
          .scv-info-item { display:flex; gap:10px; align-items:flex-start; }
          .scv-info-icon { width:28px; height:28px; border-radius:7px; background:#F1F5F9; flex-shrink:0; display:flex; align-items:center; justify-content:center; color:#64748B; }
          .scv-info-label { font-size:10.5px; font-weight:700; color:#94A3B8; letter-spacing:0.06em; text-transform:uppercase; }
          .scv-info-value { font-size:13px; font-weight:600; color:#0F172A; margin-top:1px; }
          .scv-topics { display:flex; flex-direction:column; gap:2px; }
          .scv-topic-item { display:flex; gap:10px; align-items:flex-start; padding:8px 6px; border-radius:8px; transition:background 0.15s; }
          .scv-topic-item:hover { background:#F8FAFC; }
          .scv-topic-num { font-size:10.5px; font-weight:700; color:#3B82F6; font-family:'Fraunces',serif; flex-shrink:0; margin-top:1px; }
          .scv-topic-text { font-size:13px; color:#334155; line-height:1.4; }

          /* TABS */
          .scv-content { display:flex; flex-direction:column; }
          .scv-tabs { display:flex; gap:4px; padding:4px; background:white; border:1px solid #E2E8F0; border-radius:12px; margin-bottom:18px; box-shadow:0 1px 3px rgba(15,23,42,0.05); }
          .scv-tab { flex:1; display:flex; align-items:center; justify-content:center; gap:7px; padding:10px 16px; border-radius:9px; border:none; background:transparent; font-family:'Plus Jakarta Sans',sans-serif; font-size:13.5px; font-weight:600; color:#64748B; cursor:pointer; transition:all 0.18s; white-space:nowrap; }
          .scv-tab:hover { background:#F8FAFC; color:#334155; }
          .scv-tab.active { background:#0A1628; color:white; box-shadow:0 2px 8px rgba(10,22,40,0.22); }
          .scv-panel { animation:scvIn 0.3s ease both; }
          @keyframes scvIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }

          /* SYLLABUS */
          .scv-file-card { background:white; border:1px solid #E2E8F0; border-radius:14px; padding:48px 36px; text-align:center; box-shadow:0 1px 3px rgba(15,23,42,0.05); }
          .scv-file-icon { width:72px; height:72px; border-radius:18px; background:linear-gradient(135deg,rgba(59,130,246,0.1),rgba(6,182,212,0.1)); border:1px solid rgba(59,130,246,0.15); display:flex; align-items:center; justify-content:center; color:#3B82F6; margin:0 auto 20px; }
          .scv-file-title { font-size:20px; font-weight:700; color:#0F172A; margin-bottom:8px; }
          .scv-file-sub { font-size:14px; color:#94A3B8; margin-bottom:28px; }
          .scv-download-btn { display:inline-flex; align-items:center; gap:8px; padding:12px 28px; background:linear-gradient(135deg,#3B82F6,#2563EB); color:white; border-radius:10px; font-family:'Plus Jakarta Sans',sans-serif; font-size:14px; font-weight:700; text-decoration:none; transition:all 0.18s; box-shadow:0 4px 12px rgba(59,130,246,0.3); }
          .scv-download-btn:hover { background:linear-gradient(135deg,#2563EB,#1D4ED8); box-shadow:0 6px 18px rgba(59,130,246,0.4); transform:translateY(-1px); }
          .scv-text-syllabus { background:white; border:1px solid #E2E8F0; border-radius:14px; overflow:hidden; box-shadow:0 1px 3px rgba(15,23,42,0.05); }
          .scv-text-header { display:flex; align-items:center; gap:8px; padding:16px 24px; border-bottom:1px solid #F1F5F9; font-size:13px; font-weight:700; color:#64748B; letter-spacing:0.04em; text-transform:uppercase; background:#F8FAFC; }
          .scv-text-content { padding:28px 24px; font-size:14.5px; line-height:1.85; color:#334155; white-space:pre-wrap; }

          /* VIDEOS */
          .scv-videos-wrap { display:flex; flex-direction:column; gap:28px; }
          .scv-topic-group-header { display:flex; align-items:center; gap:10px; margin-bottom:14px; }
          .scv-topic-group-dot { width:8px; height:8px; border-radius:50%; background:linear-gradient(135deg,#3B82F6,#06B6D4); flex-shrink:0; }
          .scv-topic-group-title { font-family:'Fraunces',serif; font-size:17px; font-weight:700; color:#0F172A; flex:1; }
          .scv-topic-group-count { font-size:12px; color:#94A3B8; font-weight:500; }
          .scv-video-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(240px,1fr)); gap:14px; }

          .scv-video-card { background:white; border:1px solid #E2E8F0; border-radius:12px; overflow:hidden; text-decoration:none; color:inherit; display:flex; flex-direction:column; transition:transform 0.2s, box-shadow 0.2s; box-shadow:0 1px 3px rgba(15,23,42,0.06); }
          .scv-video-card:hover { transform:translateY(-3px); box-shadow:0 8px 20px rgba(15,23,42,0.12); }

          .scv-video-thumb { position:relative; aspect-ratio:16/9; overflow:hidden; background:#F1F5F9; }
          .scv-video-thumb img { width:100%; height:100%; object-fit:cover; display:block; }
          .scv-video-platform-thumb { width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#F8FAFC; padding:20px; }
          .scv-video-platform-thumb img { max-height:48px; max-width:80%; object-fit:contain; }
          .scv-video-thumb-placeholder { width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#CBD5E1; }

          .scv-play-overlay { position:absolute; inset:0; background:rgba(0,0,0,0); display:flex; align-items:center; justify-content:center; transition:background 0.2s; }
          .scv-video-card:hover .scv-play-overlay { background:rgba(0,0,0,0.35); }
          .scv-play-btn { width:44px; height:44px; border-radius:50%; background:rgba(255,255,255,0.95); display:flex; align-items:center; justify-content:center; color:#0F172A; opacity:0; transform:scale(0.8); transition:all 0.2s; box-shadow:0 4px 12px rgba(0,0,0,0.3); }
          .scv-video-card:hover .scv-play-btn { opacity:1; transform:scale(1); }
          .scv-play-btn svg { margin-left:2px; }

          .scv-paid-badge { position:absolute; top:8px; left:8px; padding:3px 8px; border-radius:6px; background:rgba(10,22,40,0.75); backdrop-filter:blur(4px); color:white; font-size:10.5px; font-weight:700; letter-spacing:0.03em; }

          .scv-video-info { padding:12px 14px 14px; flex:1; }
          .scv-video-title { font-size:13px; font-weight:600; color:#0F172A; line-height:1.4; margin-bottom:4px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
          .scv-video-instructor { font-size:12px; color:#64748B; margin-bottom:6px; }
          .scv-video-meta-row { display:flex; align-items:center; gap:6px; }
          .scv-video-free { display:flex; align-items:center; gap:4px; font-size:11.5px; font-weight:600; color:#10B981; }
          .scv-video-price { font-size:12px; font-weight:700; color:#3B82F6; }

          /* COMING SOON */
          .scv-coming-soon { background:white; border:1px solid #E2E8F0; border-radius:14px; padding:64px 36px; text-align:center; box-shadow:0 1px 3px rgba(15,23,42,0.05); }
          .scv-cs-icon { width:72px; height:72px; border-radius:18px; background:#F1F5F9; display:flex; align-items:center; justify-content:center; color:#94A3B8; margin:0 auto 20px; }
          .scv-cs-title { font-size:18px; font-weight:700; color:#334155; margin-bottom:8px; }
          .scv-cs-sub { font-size:14px; color:#94A3B8; margin-bottom:20px; }
          .scv-cs-badge { display:inline-block; padding:4px 12px; background:#FEF9C3; color:#92400E; border-radius:20px; font-size:12px; font-weight:700; }

          /* MATERIALS */
          .scv-materials-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:16px; }
          .scv-material-card { background:white; border:1px solid #E2E8F0; border-radius:14px; padding:28px 22px; text-align:center; box-shadow:0 1px 3px rgba(15,23,42,0.05); transition:all 0.22s; }
          .scv-material-card:hover { transform:translateY(-3px); box-shadow:0 8px 22px rgba(15,23,42,0.1); }
          .scv-material-icon { width:60px; height:60px; border-radius:14px; background:linear-gradient(135deg,rgba(59,130,246,0.08),rgba(6,182,212,0.08)); border:1px solid rgba(59,130,246,0.12); display:flex; align-items:center; justify-content:center; color:#3B82F6; margin:0 auto 14px; }
          .scv-material-title { font-size:15px; font-weight:700; color:#0F172A; margin-bottom:6px; }
          .scv-material-desc { font-size:12.5px; color:#94A3B8; margin-bottom:14px; line-height:1.4; }

          @media (max-width:900px) { .scv-body { grid-template-columns:1fr; } .scv-hero-inner { flex-direction:column; align-items:flex-start; } }
          @media (max-width:600px) { .scv-body { padding:20px 16px 40px; } .scv-header-inner, .scv-hero-inner { padding-left:16px; padding-right:16px; } .scv-video-grid { grid-template-columns:1fr; } }
        `}</style>
      </div>
    );
  }
}

export default withRouter(StudentCourseView);