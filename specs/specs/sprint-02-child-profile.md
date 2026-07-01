# Sprint 02 - Child Profile

## Goal

Allow parents to create and manage their children's profiles so WonderPath can personalize each learning experience.

---

## User Story

As a parent,

I want to register and manage my children,

So WonderPath can recommend the right learning content for each child.

---

## Acceptance Criteria

### Parent can

- Create child
- Edit child
- Delete child
- View all children

---

## Child Information

### Basic Information

- Full Name \*
- Nickname (optional)
- Date of Birth \*
- Gender \*
  - Boy
  - Girl

### Academic Information

- Grade \*
  - Grade 1
  - Grade 2
  - Grade 3
  - Grade 4
  - Grade 5
  - Grade 6

- Supported Curricula _(multiple selection)_
  - IB
  - Cambridge
  - Merdeka
  - Nasional

### Learning Preference

- Preferred Language \*
  - English
  - Bahasa Indonesia

### Optional

- School Name

---

## Dashboard

After login, the parent sees:

- My Children
- Add Child

Example

Emma

- Grade 5
- IB + Nasional

Button:

Start Learning

---

## Learning Session

Before every learning session, the parent chooses:

- Curriculum
- Subject

Example

Curriculum

- IB

Subject

- Mathematics

The selected curriculum is used only for that learning session.

---

## Security

- Parent can only access their own children.
- Parents cannot view, edit, or delete another parent's children.

---

## Validation

- Full Name is required.
- Date of Birth is required.
- Grade is required.
- At least one curriculum must be selected.
- Preferred Language is required.

---

## API

Parent can:

- Create Child
- Update Child
- Delete Child
- Get Child
- Get All Children

---

## Out of Scope

- AI
- Atlas Learning Engine
- Learning Progress
- Learning Recommendation
- Subscription
- Weekly Learning Plan

---

## Future

Atlas Learning Engine will use the child profile to recommend:

- Curriculum
- Subject
- Difficulty
- Weekly Learning Plan
- Personalized Learning Journey
