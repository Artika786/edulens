import React from "react";
import ReactDOM from "react-dom";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./Login";
import Register from "./Register";
import Dashboard from "./Dashboard";
import CourseDetail from './CourseDetail';
import SelectedVideos from './SelectedVideos';
import StudentDashboard from './StudentDashboard';
import StudentCourseView from './StudentCourseView';
import TeacherResources from './TeacherResources';
import "./Auth.css";

ReactDOM.render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/course-detail/:id" element={<CourseDetail />} />
      <Route path="/selected-videos" element={<SelectedVideos />} />
      <Route path="/student-dashboard" element={<StudentDashboard />} />
      <Route path="/student-course-view" element={<StudentCourseView />} />
      <Route path="/resources" element={<TeacherResources />} />
    </Routes>
  </BrowserRouter>,
  document.getElementById("root")
);