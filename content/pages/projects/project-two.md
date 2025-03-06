---
type: ProjectLayout
title: Event Finder Mobile App
colors: colors-a
date: '2024-08-10'
client: Academic Project
description: >-
  An Android application that enables users to discover, post, and schedule events, built with Java Spring Boot backend and MySQL database integration.
featuredImage:
  type: ImageBlock
  url: /images/bg2.jpg
  altText: Event Finder App thumbnail
media:
  type: ImageBlock
  url: /images/bg2.jpg
  altText: Event Finder App screenshot
---

## Project Overview

The Event Finder App is a mobile application that allows users to discover local events, create and post new events, and manage their event schedules. This project was developed as part of a team during my coursework at Iowa State University.

### Key Technologies

- **Frontend**: Android (Java)
- **Backend**: Java Spring Boot
- **Database**: MySQL
- **API**: RESTful API architecture
- **Development Methodology**: Agile

### Features

- User authentication and account management
- Event discovery with search and filtering options
- Event creation and posting
- Personal event schedule management
- Real-time notifications for upcoming events
- Location-based event recommendations

## Development Process

This project followed an Agile development methodology, with regular sprints and team meetings to ensure progress and address challenges. As a team member, I was primarily responsible for developing the Spring Boot backend and database integration.

### Backend Development

The backend was built using Spring Boot with a layered architecture:

1. **Controller Layer**: Handling HTTP requests and responses
2. **Service Layer**: Implementing business logic
3. **Repository Layer**: Interfacing with the MySQL database
4. **Model Layer**: Defining data entities

I implemented RESTful API endpoints that allowed the Android frontend to:
- Retrieve event listings
- Create new events
- Update event details
- Manage user accounts and authentication

### Database Design

The MySQL database was designed with the following main tables:

- Users (user accounts and profiles)
- Events (event details and metadata)
- EventAttendees (linking users to events)
- Categories (event categorization)
- Locations (venue information)

### Code Sample

```java
@RestController
@RequestMapping("/api/events")
public class EventController {
    @Autowired
    private EventService eventService;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private EventNotificationEmailService EventNotificationEmailService;

    @PostMapping 
    public ResponseEntity<?> createEvent(@RequestBody Event event) {
        Event createdEvent = eventService.createAndVerifyEvent(event);  //Will return the original json if it passes AI check, else null
        if (createdEvent != null) {
            return ResponseEntity.ok("Event successfully created");
        } else {
            return ResponseEntity.badRequest().body("Event verification failed. The event was not created.");
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Event> getEvent(@PathVariable Long id) {
        return eventService.getEvent(id)
                .map(ResponseEntity::ok) // if present, return 200 OK with the event
                .orElseGet(() -> ResponseEntity.notFound().build()); // otherwise, return 404 Not Found
    }

    @GetMapping
    public List<Event> getAllEvents() {
        return eventService.getAllEvents();
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateEvent(@PathVariable Long id, @RequestBody Event eventDetails) {

        if (eventService.verifyEventWithChatGPT(eventDetails)==false){
            return ResponseEntity.badRequest().body("Event not passed AI check");
        }

        Event updatedEvent = eventService.updateEvent(id, eventDetails);

        ResponseEntity<String> response = ResponseEntity.ok("update successful"+updatedEvent);

        return response;//return 200 OK with the updated event
    }

```

## Challenges and Solutions

### Challenge 1: Concurrent User Access

We faced issues with multiple users trying to register for the same event simultaneously, which sometimes led to data inconsistency.

**Solution**: Implemented transaction management in the service layer and added database constraints to maintain data integrity.

### Challenge 2: Team Coordination

Working in a team with different schedules and skill levels presented coordination challenges.

**Solution**: We established a clear communication protocol using Slack and GitHub issues, and held regular stand-up meetings to keep everyone aligned.

### Challenge 3: Performance Optimization

As the dataset grew, query performance for event searches degraded.

**Solution**: I added database indexes on frequently searched fields and implemented query optimization techniques to improve response times.

## Results and Lessons Learned

This project provided valuable experience in:

- Developing backend systems with Spring Boot
- Database design and optimization
- Team collaboration using Agile methodologies
- RESTful API development
- Handling authentication and authorization

The application successfully met all requirements and received positive feedback during user testing. Working on this project enhanced my understanding of full-stack development and the importance of clear communication in team settings.

In future iterations, we planned to add features like event recommendations using machine learning and social media integration for event sharing.