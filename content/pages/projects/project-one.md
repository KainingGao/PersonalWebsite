---
type: ProjectLayout
title: Movie Search Web Application
colors: colors-a
date: '2024-09-15'
client: Personal Project
description: >-
  A full-stack movie search application built with React for the frontend and Node.js for the backend, integrating ChatGPT for search and OMDb for movie data.
featuredImage:
  type: ImageBlock
  url: /images/bg1.jpg
  altText: Movie Search App thumbnail
media:
  type: ImageBlock
  url: /images/bg1.jpg
  altText: Movie Search App screenshot
---

## Project Overview

I developed a full-stack movie search web application that allows users to find movies through a smart search interface. The application uses React for the frontend UI components and Node.js for the backend server.

### Key Technologies

- **Frontend**: React, JavaScript, CSS
- **Backend**: Node.js, Express
- **APIs**: ChatGPT for search enhancement, OMDb API for movie data
- **Deployment**: Vercel

### Features

- Smart search suggestions using ChatGPT integration
- Detailed movie information from OMDb API
- Responsive design that works on mobile and desktop
- User-friendly interface with interactive elements
- Search history tracking

## Development Process

The development of this project began with designing the overall architecture. I decided to separate the frontend and backend concerns to make the codebase more maintainable and scalable.

For the frontend, I created reusable React components for the search interface, movie cards, and detailed movie views. I implemented CSS for styling, focusing on a clean and intuitive user experience.

The backend handles API requests to OMDb and integrates with ChatGPT to enhance search capabilities. When a user types a query, the system can understand context and intent beyond simple keyword matching.

### Code Sample

```javascript
const handleAddToList = async (listType) => {
      if (!user.uKey) {
        alert("You must be logged in to add movies to your lists.");
        return;
      }

      const url = `http://127.0.0.1:8081/addToWatchList/${user.uKey}/${listType}`;
      const movieData = {
        imdbID: movie.imdbID,
        rating: movie.rating,
        rewatch: movie.rewatches,
        notes: movie.notes,
      };

      try {
        const response = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(movieData),
        });
        const data = await response.json();
        if (data) {
          alert(`Movie was added to your ${listType} list`);
        } else {
          alert("Failed to add movie to list.");
        }
      } catch (error) {
        console.error("Error adding movie to list:", error);
        alert("Error adding movie to list: " + error.message);
      }
    };
```

## Challenges and Solutions

One of the main challenges was optimizing the integration between the ChatGPT API and OMDb. Initially, the search process was slow due to multiple API calls. I resolved this by:

1. Implementing a caching system for frequent searches
2. Using debounce for search input to reduce unnecessary API calls
3. Creating a more efficient query enhancement algorithm that only uses ChatGPT when needed

Another challenge was creating a responsive design that worked well on all devices. I used CSS flexbox and grid layouts along with media queries to ensure the interface adapts to different screen sizes.

## Results and Learnings

This project significantly improved my skills in:

- Full-stack JavaScript development
- Working with third-party APIs
- Creating responsive and interactive user interfaces
- Optimizing application performance

The final application provides a seamless movie search experience with intelligent search capabilities beyond what traditional keyword search offers.

In the future, I plan to add features such as user accounts for saving favorite movies and personalized recommendations based on search history.