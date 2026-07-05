# Sprint 04 - Question Bank

## Goal

Build the structured knowledge foundation that Atlas Learning Engine will use to generate and recommend learning content.

---

## User Story

As Atlas,

I need a structured question bank,

So I can select the right question for every learning session.

---

## Acceptance Criteria

### Subjects (MVP)

- Mathematics
- English

---

### Knowledge Structure

Each Subject contains:

- Topics

Each Topic contains:

- Subtopics

Each Subtopic contains:

- Learning Objectives

Each Learning Objective contains:

- Questions

---

### Question

Each question contains:

- Question Text
- Question Type
  - Multiple Choice
  - True / False
- Options
- Correct Answer
- Explanation

---

### Metadata

Every question must have:

- Subject
- Curriculum
- Grade
- Difficulty (1-5)
- Topic
- Subtopic
- Learning Objective

---

### Learning Objective

Each objective contains:

- Name
- Description
- Estimated Mastery Time

---

### Dashboard

API can:

- Create Question
- Update Question
- Delete Question
- Get Question
- Search Question

---

### Search Filters

- Subject
- Curriculum
- Grade
- Topic
- Difficulty

---

## Security

Only Admin can manage Question Bank.

Parents cannot access Question CRUD APIs.

---

## Out of Scope

- AI Generation
- Adaptive Learning
- Recommendations
- Analytics
- Student Answers
