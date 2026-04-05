import React, { Component } from 'react';
import { withRouter } from "./utils";
import axios from 'axios';
import swal from 'sweetalert';
import './SelectedVideos.css';

class SelectedVideos extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedVideos: JSON.parse(localStorage.getItem('selectedVideos') || '[]'),
      showClassCodeDialog: false,
      generatedCode: '',
      token: localStorage.getItem("token"),
      loadingCode: false,
      courseId: props.location?.state?.courseId || localStorage.getItem('currentCourseId'),
      searchQuery: ''
    };
  }

  handleGenerateCode = () => {
    const { courseId, selectedVideos } = this.state;

    if (!courseId) {
      swal({ text: "Course ID is missing. Please select a course first.", icon: "error" });
      return;
    }

    this.setState({ loadingCode: true });

    axios.post('https://edulens-backend-nxmw.onrender.com/generate-class-code',
      {
        courseId,
        // ← Send the selected videos so they get saved to the DB
        selectedVideos: selectedVideos.map(v => ({
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
      { headers: { 'Content-Type': 'application/json', token: this.state.token } }
    )
    .then((res) => {
      this.setState({ showClassCodeDialog: true, generatedCode: res.data.classCode, loadingCode: false });
    })
    .catch((err) => {
      this.setState({ loadingCode: false });
      swal({ text: err.response?.data?.errorMessage || "Failed to generate code", icon: "error" });
    });
  };

  handleCloseCodeDialog = () => this.setState({ showClassCodeDialog: false });

  copyCodeToClipboard = () => {
    navigator.clipboard.writeText(this.state.generatedCode);
    swal({ text: "Class code copied to clipboard!", icon: "success", timer: 2000 });
  };

  groupVideosByTopic = () => {
    const grouped = {};
    this.state.selectedVideos.forEach(video => {
      const topic = video.topic || 'Uncategorized';
      if (!grouped[topic]) grouped[topic] = [];
      grouped[topic].push(video);
    });
    return grouped;
  };

  removeVideo = (videoId) => {
    const updated = this.state.selectedVideos.filter(v => v.videoId !== videoId);
    localStorage.setItem('selectedVideos', JSON.stringify(updated));
    this.setState({ selectedVideos: updated });
  };

  clearAll = () => {
    swal({ title: "Are you sure?", text: "This will clear all selected videos", icon: "warning", buttons: true, dangerMode: true })
    .then((willDelete) => {
      if (willDelete) {
        localStorage.removeItem('selectedVideos');
        this.setState({ selectedVideos: [] });
        swal("All videos cleared!", { icon: "success" });
      }
    });
  };

  goBack = () => this.props.navigate(-1);

  render() {
    const { selectedVideos, showClassCodeDialog, generatedCode, loadingCode, searchQuery } = this.state;
    const groupedVideos = this.groupVideosByTopic();
    const topicNames = Object.keys(groupedVideos);

    return (
      <div className="selected-videos-container">
        {/* Header */}
        <header className="selected-header">
          <div className="selected-header-content">
            <button className="btn-back" onClick={this.goBack}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Course
            </button>

            <div className="header-title">
              <h1>Selected Videos</h1>
              <span>{selectedVideos.length} video{selectedVideos.length !== 1 ? 's' : ''} selected</span>
            </div>

            <div className="header-actions">
              <button
                className="btn-generate"
                onClick={this.handleGenerateCode}
                disabled={loadingCode || selectedVideos.length === 0}
              >
                {loadingCode ? (
                  <><div className="spinner-small" />Generating...</>
                ) : (
                  <>
                    <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    Generate Class Code
                  </>
                )}
              </button>

              <button className="btn-clear" onClick={this.clearAll} disabled={selectedVideos.length === 0}>
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear All
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="selected-main">
          {selectedVideos.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <svg width="80" height="80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h2>No videos selected yet</h2>
              <p>Go back to the course page and select videos to build your classroom</p>
              <button className="btn-primary" onClick={this.goBack}>Browse Videos</button>
            </div>
          ) : (
            <>
              <div className="search-section">
                <div className="search-box">
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search selected videos..."
                    value={searchQuery}
                    onChange={(e) => this.setState({ searchQuery: e.target.value })}
                  />
                </div>
              </div>

              {topicNames.map(topic => (
                <section key={topic} className="topic-section">
                  <div className="topic-header">
                    <h2>{topic}</h2>
                    <span className="count-badge">{groupedVideos[topic].length} videos</span>
                  </div>

                  <div className="videos-grid">
                    {groupedVideos[topic]
                      .filter(video => video.title.toLowerCase().includes(searchQuery.toLowerCase()))
                      .map(video => (
                        <div key={video.videoId} className="video-card">
                          <div className="video-thumbnail">
                            {video.thumbnail ? (
                              <img src={video.thumbnail} alt={video.title} />
                            ) : video.platformLogo ? (
                              <div className="platform-placeholder">
                                <img src={video.platformLogo} alt={video.platform} />
                              </div>
                            ) : null}
                            <div className="play-overlay">
                              <svg width="48" height="48" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>

                          <div className="video-info">
                            <h3>{video.title}</h3>
                            {video.instructor && <p className="instructor">{video.instructor}</p>}
                            {video.price && <span className="price-tag">{video.price}</span>}
                          </div>

                          <div className="video-actions">
                            <a
                              href={video.thumbnail ? `https://www.youtube.com/watch?v=${video.videoId}` : '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-watch"
                            >
                              <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                              </svg>
                              Watch
                            </a>
                            <button className="btn-remove" onClick={() => this.removeVideo(video.videoId)}>
                              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                </section>
              ))}
            </>
          )}
        </main>

        {/* Class Code Modal */}
        {showClassCodeDialog && (
          <div className="modal-overlay" onClick={this.handleCloseCodeDialog}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="success-icon">
                  <svg width="48" height="48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h2>Class Code Created!</h2>
                <p>Share this code with your students</p>
              </div>
              <div className="modal-body">
                <div className="code-display" onClick={this.copyCodeToClipboard}>
                  <span className="code-text">{generatedCode}</span>
                  <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="code-hint">Click to copy to clipboard</p>
              </div>
              <div className="modal-footer">
                <button className="btn-primary" onClick={this.handleCloseCodeDialog}>Done</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default withRouter(SelectedVideos);