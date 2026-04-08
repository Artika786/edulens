import React, { Component } from 'react';
import { withRouter } from "./utils";
import axios from 'axios';
import swal from 'sweetalert';
import './CourseDetail.css';

class CourseDetail extends Component {
  constructor(props) {
    super(props);
    this.state = {
      course: null,
      loading: true,
      token: localStorage.getItem("token"),
      userId: localStorage.getItem("userId"),
      recommendedVideos: [],
      loadingVideos: false,
      selectedTopic: null,
      videoFilter: 'free',
      selectedVideos: JSON.parse(localStorage.getItem('selectedVideos') || '[]'),
      subtopics: [],
      newTopicName: '',
      pasteUrlMode: false,
      pastedUrl: '',
      isSheetOpen: false,
      searchQuery: '',
      showClassCodeModal: false,
      generatedClassCode: '',
      paidVideos: [
        {
          id: 'udemy-1',
          videoId: 'udemy-1',
          platform: 'Udemy',
          platformLogo: 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Udemy_logo.svg',
          title: 'Complete Database Management Systems Course',
          instructor: 'Top Rated Instructor',
          isPaid: true,
          price: '$49.99'
        },
        {
          id: 'coursera-1',
          videoId: 'coursera-1',
          platform: 'Coursera',
          platformLogo: 'https://upload.wikimedia.org/wikipedia/commons/9/97/Coursera-Logo_600x600.svg',
          title: 'Database Design and Basic SQL in PostgreSQL',
          instructor: 'University of Michigan',
          isPaid: true,
          price: '$79.99'
        }
      ]
    };
  }

 componentDidMount() {
  const courseId = this.props.params?.id;
  
  if (!this.state.token) {
    this.props.navigate("/login");
  } else if (!courseId) {
    swal({ text: "Invalid course ID", icon: "error" });
    this.props.navigate("/dashboard");
  } else {
    this.getCourseDetail(courseId);
  }
}

  getCourseDetail = (id) => {
    this.setState({ loading: true });

    axios.get(`http://localhost:2000/get-course-by-id/${id}`, { 
      headers: { token: this.state.token }
    })
    .then((res) => {
      const courseData = res.data.course;
      this.setState({ loading: false, course: courseData });
      localStorage.setItem('currentCourseId', courseData._id);

      const defaultTopic = this.parseTopicsFromSyllabus(courseData.syllabus_text)[0];
      if (defaultTopic) {
        this.handleTopicSelect(defaultTopic);
      } else {
        this.getYouTubeRecommendations(`${courseData.subject_name} ${courseData.unit_title}`);
      }
    })
    .catch((err) => {
      swal({
        text: err.response?.data?.errorMessage || "Failed to load course details.",
        icon: "error",
      });
      this.setState({ loading: false });
      this.props.navigate("/dashboard");
    });
  };

  getYouTubeRecommendations = (topicQuery) => {
    this.setState({ loadingVideos: true, recommendedVideos: [] });
    
    axios.get(`http://localhost:2000/search-videos/${encodeURIComponent(topicQuery)}?maxResults=6`, {
      headers: { token: this.state.token }
    })
    .then(response => {
      const videosWithPricing = response.data.videos.map((video) => ({
        ...video,
        isPaid: false,
        price: 'Free'
      }));

      this.setState({
        recommendedVideos: videosWithPricing,
        loadingVideos: false
      });
    })
    .catch(error => {
      console.error('YouTube API error:', error.response?.data || error.message);
      this.setState({ loadingVideos: false });
    });
  };

  handleTopicSelect = (topic) => {
    this.setState({ selectedTopic: topic });
    this.getYouTubeRecommendations(topic);
  }

  handleVideoFilter = (filter) => {
    this.setState({ videoFilter: filter });
  }

  toggleVideoSelection = (video) => {
    const { selectedVideos, selectedTopic } = this.state;
    const isSelected = selectedVideos.some(v => v.videoId === video.videoId);
    
    let updatedVideos;
    if (isSelected) {
      updatedVideos = selectedVideos.filter(v => v.videoId !== video.videoId);
    } else {
      updatedVideos = [...selectedVideos, { ...video, topic: selectedTopic }];
    }
    
    this.setState({ selectedVideos: updatedVideos });
    localStorage.setItem('selectedVideos', JSON.stringify(updatedVideos));
  }

  handleAddTopic = () => {
    const { newTopicName, subtopics } = this.state;
    if (newTopicName.trim()) {
      const newTopic = newTopicName.trim();
      this.setState({
        subtopics: [...subtopics, newTopic],
        newTopicName: ''
      });
      this.handleTopicSelect(newTopic);
    }
  }

  handlePasteUrl = () => {
    const { pastedUrl } = this.state;
    if (pastedUrl.trim() && pastedUrl.includes('youtube.com')) {
      const videoId = this.extractVideoId(pastedUrl);
      if (videoId) {
        swal({ text: 'URL added successfully!', icon: 'success', timer: 1500 });
        this.setState({ pasteUrlMode: false, pastedUrl: '' });
      } else {
        swal({ text: 'Invalid YouTube URL', icon: 'error' });
      }
    } else {
      swal({ text: 'Please enter a valid YouTube URL', icon: 'warning' });
    }
  }

  extractVideoId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  }

  removeVideo = (videoId) => {
    const updated = this.state.selectedVideos.filter(v => v.videoId !== videoId);
    localStorage.setItem('selectedVideos', JSON.stringify(updated));
    this.setState({ selectedVideos: updated });
  };

  generateClassCode = () => {
    const { course } = this.state;
    if (!course || !course._id) {
      swal({
        text: "Course ID is missing. Please select a course first.",
        icon: "error"
      });
      return;
    }

    // AFTER — sends selectedVideos so they get saved to the DB
axios.post('http://localhost:2000/generate-class-code', 
  {
    courseId: course._id,
    selectedVideos: this.state.selectedVideos.map(v => ({
      videoId:      v.videoId,
      title:        v.title,
      thumbnail:    v.thumbnail || null,
      topic:        v.topic || null,
      isPaid:       v.isPaid || false,
      price:        v.price || null,
      platform:     v.platform || null,
      platformLogo: v.platformLogo || null,
      instructor:   v.instructor || null,
    }))
  },
  {
    headers: {
      'Content-Type': 'application/json',
      token: this.state.token
    }
  }
)
    .then((res) => {
      this.setState({
        showClassCodeModal: true,
        generatedClassCode: res.data.classCode,
        isSheetOpen: false
      });
    })
    .catch((err) => {
      swal({
        text: err.response?.data?.errorMessage || "Failed to generate code",
        icon: "error"
      });
    });
  };

  copyCodeToClipboard = () => {
    navigator.clipboard.writeText(this.state.generatedClassCode);
    swal({
      text: "Class code copied to clipboard!",
      icon: "success",
      timer: 2000
    });
  };

  parseTopicsFromSyllabus = (syllabusText) => {
    if (!syllabusText) return [];
    
    const topics = syllabusText
      .split(/[\n,]/)
      .map(topic => topic.trim())
      .filter(topic => topic.length > 3 && !topic.toLowerCase().startsWith('unit'))
      .slice(0, 20);
      
    return topics;
  };

  getFilteredVideos = () => {
    const { recommendedVideos, videoFilter, paidVideos } = this.state;
    
    switch(videoFilter) {
      case 'free':
        return recommendedVideos.filter(video => !video.isPaid);
      case 'paid':
        return paidVideos;
      default:
        return recommendedVideos;
    }
  }

  render() {
    const { 
      course, 
      loading, 
      loadingVideos, 
      selectedTopic, 
      videoFilter, 
      selectedVideos, 
      subtopics, 
      newTopicName, 
      pasteUrlMode, 
      pastedUrl,
      isSheetOpen,
      searchQuery,
      showClassCodeModal,
      generatedClassCode
    } = this.state;

    if (loading) {
      return (
        <div className="modern-loading">
          <div className="modern-spinner"></div>
          <p>Loading course...</p>
        </div>
      );
    }

    if (!course) {
      return <div className="error-state">Course not found</div>;
    }

    const topics = this.parseTopicsFromSyllabus(course.syllabus_text);
    const displayTopicTitle = selectedTopic || `${course.subject_name} Overview`;
    const filteredVideos = this.getFilteredVideos();

    const allVideos = [...this.state.recommendedVideos, ...this.state.paidVideos];
    const selectedVideoDetails = allVideos.filter((v) =>
      selectedVideos.some(sv => sv.videoId === v.videoId)
    );
    const filteredSelectedVideos = selectedVideoDetails.filter((video) =>
      video.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="modern-course-container">
        {/* Modern Header */}
        <header className="modern-header">
          <div className="modern-header-content">
            <div className="modern-brand">
              <div className="modern-logo">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div className="modern-brand-text">
                <h1>EduLens</h1>
                <span>Teacher Dashboard</span>
              </div>
            </div>

            <div className="modern-header-actions">
              <button 
                onClick={() => this.setState({ isSheetOpen: true })} 
                className="modern-btn-primary"
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>Create Classroom</span>
                {selectedVideos.length > 0 && (
                  <span className="modern-badge">{selectedVideos.length}</span>
                )}
              </button>
              
              <div className="modern-user-menu">
                <div className="modern-avatar">DS</div>
                <span>Ms. Disha Singh</span>
              </div>
            </div>
          </div>
        </header>

        {/* Course Info Banner */}
        <div className="modern-course-banner">
          <div className="course-banner-content">
            <div className="course-badge">{course.subject_name}</div>
            <h2 className="course-title">{course.unit_title}</h2>
            <p className="course-meta">
              <span>{topics.length} Topics</span>
              <span>•</span>
              <span>{selectedVideos.length} Videos Selected</span>
            </p>
          </div>
        </div>

        <div className="modern-layout">
          {/* Sidebar */}
          <aside className="modern-sidebar">
            <div className="sidebar-sticky">
              {/* Filter Tabs */}
              <div className="modern-filter-section">
                <h3>Resources</h3>
                <div className="modern-tabs">
                  <button 
                    className={`modern-tab ${videoFilter === 'free' ? 'active' : ''}`}
                    onClick={() => this.handleVideoFilter('free')}
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Free Videos
                  </button>
                  <button 
                    className={`modern-tab ${videoFilter === 'paid' ? 'active' : ''}`}
                    onClick={() => this.handleVideoFilter('paid')}
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Paid Courses
                  </button>
                </div>
              </div>

              {/* Topics List */}
              <div className="modern-topics-section">
                <h3>Course Topics</h3>
                <div className="modern-topics-list">
                  {topics.map((topic, index) => (
                    <button
                      key={index}
                      onClick={() => this.handleTopicSelect(topic)}
                      className={`modern-topic-btn ${selectedTopic === topic ? 'active' : ''}`}
                    >
                      <span className="topic-number">{String(index + 1).padStart(2, '0')}</span>
                      <span className="topic-text">{topic}</span>
                    </button>
                  ))}
                  
                  {subtopics.map((subtopic, index) => (
                    <button
                      key={`sub-${index}`}
                      onClick={() => this.handleTopicSelect(subtopic)}
                      className={`modern-topic-btn ${selectedTopic === subtopic ? 'active' : ''}`}
                    >
                      <span className="topic-number">+{index + 1}</span>
                      <span className="topic-text">{subtopic}</span>
                    </button>
                  ))}
                </div>

                {/* Add Topic */}
                <div className="modern-add-topic">
                  <input
                    type="text"
                    placeholder="Add new topic..."
                    value={newTopicName}
                    onChange={(e) => this.setState({ newTopicName: e.target.value })}
                    onKeyPress={(e) => e.key === 'Enter' && this.handleAddTopic()}
                    className="modern-input"
                  />
                  <button 
                    onClick={this.handleAddTopic}
                    className="modern-btn-icon"
                    disabled={!newTopicName.trim()}
                  >
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="modern-main">
            {/* Videos Section */}
            <section className="modern-videos-section">
              <div className="section-header">
                <div>
                  <h2>{displayTopicTitle}</h2>
                  <p>Select videos that best match your teaching style</p>
                </div>

                {videoFilter === 'free' && (
                  <button 
                    onClick={() => this.setState({ pasteUrlMode: !pasteUrlMode })}
                    className="modern-btn-secondary"
                  >
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Add Custom URL
                  </button>
                )}
              </div>

              {pasteUrlMode && (
                <div className="modern-paste-url">
                  <input
                    type="text"
                    placeholder="Paste YouTube video URL here..."
                    value={pastedUrl}
                    onChange={(e) => this.setState({ pastedUrl: e.target.value })}
                    className="modern-input-url"
                  />
                  <button onClick={this.handlePasteUrl} className="modern-btn-primary">
                    Add Video
                  </button>
                  <button 
                    onClick={() => this.setState({ pasteUrlMode: false, pastedUrl: '' })}
                    className="modern-btn-ghost"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {loadingVideos ? (
                <div className="modern-loading-videos">
                  <div className="modern-spinner"></div>
                  <p>Finding best videos for you...</p>
                </div>
              ) : (
                <div className="modern-videos-grid">
                  {filteredVideos.length > 0 ? (
                    filteredVideos.map((video) => {
                      const isSelected = selectedVideos.some(v => v.videoId === video.videoId);
                      const isPaidVideo = video.isPaid;
                      
                      return (
                        <div key={video.videoId} className={`modern-video-card ${isSelected ? 'selected' : ''}`}>
                          {isPaidVideo ? (
                            <>
                              <div className="modern-paid-badge">
                                <img src={video.platformLogo} alt={video.platform} />
                              </div>
                              <div className="modern-card-content">
                                <h3>{video.title}</h3>
                                <p className="instructor">{video.instructor}</p>
                                <div className="price-tag">{video.price}</div>
                              </div>
                              <div className="modern-card-actions">
                                <button className="modern-btn-watch-paid">
                                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                  </svg>
                                  View Course
                                </button>
                                <button 
                                  onClick={() => this.toggleVideoSelection(video)}
                                  className={`modern-btn-select ${isSelected ? 'selected' : ''}`}
                                >
                                  {isSelected ? (
                                    <>
                                      <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      Selected
                                    </>
                                  ) : (
                                    'Select'
                                  )}
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="modern-thumbnail">
                                <img src={video.thumbnail} alt={video.title} />
                                <div className="modern-play-overlay">
                                  <svg width="48" height="48" viewBox="0 0 68 48">
                                    <path d="M66.52,7.74c-0.78-2.93-2.49-5.41-5.42-6.19C55.79,.13,34,0,34,0S12.21,.13,6.9,1.55 C3.97,2.33,2.27,4.81,1.48,7.74C0.06,13.05,0,24,0,24s0.06,10.95,1.48,16.26c0.78,2.93,2.49,5.41,5.42,6.19 C12.21,47.87,34,48,34,48s21.79-0.13,27.1-1.55c2.93-0.78,4.64-3.26,5.42-6.19C67.94,34.95,68,24,68,24S67.94,13.05,66.52,7.74z" fill="#f00"/>
                                    <path d="M 45,24 27,14 27,34" fill="#fff"/>
                                  </svg>
                                </div>
                                {isSelected && (
                                  <div className="selection-badge">
                                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              
                              <div className="modern-card-content">
                                <h3>{video.title}</h3>
                              </div>

                              <div className="modern-card-actions">
                                <a 
                                  href={`https://www.youtube.com/watch?v=${video.videoId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="modern-btn-watch"
                                >
                                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                  </svg>
                                  Watch
                                </a>
                                
                                <button 
                                  onClick={() => this.toggleVideoSelection(video)}
                                  className={`modern-btn-select ${isSelected ? 'selected' : ''}`}
                                >
                                  {isSelected ? (
                                    <>
                                      <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                      Selected
                                    </>
                                  ) : (
                                    'Select'
                                  )}
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div className="modern-empty-state">
                      <svg width="64" height="64" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <p>No videos found for this filter</p>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Resources Section */}
            <section className="modern-resources-section">
              <h3>Additional Resources</h3>
              <div className="modern-resources-grid">
                <div className="modern-resource-card">
                  <div className="resource-icon">
                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4>Notes</h4>
                    <p>Upload study materials</p>
                  </div>
                  <button className="modern-btn-upload">
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload
                  </button>
                </div>

                <div className="modern-resource-card">
                  <div className="resource-icon">
                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h4>Questions</h4>
                    <p>Add practice questions</p>
                  </div>
                  <button className="modern-btn-upload">
                    <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload
                  </button>
                </div>
              </div>
            </section>
          </main>
        </div>

        {/* Selected Videos Sheet */}
        {isSheetOpen && (
          <div className="modern-overlay" onClick={() => this.setState({ isSheetOpen: false })}>
            <div className="modern-sheet" onClick={(e) => e.stopPropagation()}>
              <div className="modern-sheet-header">
                <div>
                  <h2>Selected Videos</h2>
                  <p>{selectedVideos.length} video{selectedVideos.length !== 1 ? 's' : ''} ready for classroom</p>
                </div>
                <button 
                  className="modern-btn-close"
                  onClick={() => this.setState({ isSheetOpen: false })}
                >
                  <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {selectedVideos.length > 0 && (
                <div className="modern-sheet-search">
                  <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search selected videos..."
                    value={searchQuery}
                    onChange={(e) => this.setState({ searchQuery: e.target.value })}
                  />
                </div>
              )}

              <div className="modern-sheet-body">
                {selectedVideos.length === 0 ? (
                  <div className="modern-empty-state">
                    <svg width="64" height="64" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p>No videos selected yet</p>
                    <span>Select videos to create your classroom</span>
                  </div>
                ) : filteredSelectedVideos.length === 0 ? (
                  <div className="modern-empty-state">
                    <svg width="64" height="64" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p>No matching videos</p>
                    <span>Try a different search term</span>
                  </div>
                ) : (
                  <div className="modern-selected-list">
                    {filteredSelectedVideos.map((video) => (
                      <div key={video.videoId} className="modern-selected-item">
                        <div className="selected-thumbnail">
                          {video.thumbnail ? (
                            <img src={video.thumbnail} alt={video.title} />
                          ) : (
                            <img src={video.platformLogo} alt={video.platform} className="platform-logo" />
                          )}
                        </div>
                        <div className="selected-info">
                          <h4>{video.title}</h4>
                          {video.topic && <span className="topic-tag">{video.topic}</span>}
                        </div>
                        <button 
                          className="modern-btn-remove"
                          onClick={() => this.removeVideo(video.videoId)}
                        >
                          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedVideos.length > 0 && (
                <div className="modern-sheet-footer">
                  <button 
                    className="modern-btn-generate"
                    onClick={this.generateClassCode}
                  >
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    Generate Class Code
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Class Code Modal */}
        {showClassCodeModal && (
          <div className="modern-modal-overlay" onClick={() => this.setState({ showClassCodeModal: false })}>
            <div className="modern-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modern-modal-header">
                <div className="success-icon">
                  <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2>Class Code Created!</h2>
                <p>Share this code with your students</p>
              </div>

              <div className="modern-modal-body">
                <div className="code-display" onClick={this.copyCodeToClipboard}>
                  <span className="code-text">{generatedClassCode}</span>
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="code-hint">Click to copy to clipboard</p>
              </div>

              <div className="modern-modal-footer">
                <button 
                  className="modern-btn-primary"
                  onClick={() => this.setState({ showClassCodeModal: false })}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default withRouter(CourseDetail);