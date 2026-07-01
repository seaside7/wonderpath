# Sprint 01 - Parent Authentication

## Goal

Build the first end-to-end feature of WonderPath.

A parent can:

- Register
- Login
- View an authenticated dashboard

---

## User Story

As a parent,

I want to create an account,

So I can start using WonderPath.

---

## Acceptance Criteria

### Registration

- Parent can register with:
  - Email
  - Password
- Email must be unique.
- Password must be hashed.
- Return JWT after successful registration.

### Login

- Parent can login.
- Invalid credentials return Unauthorized.
- Successful login returns JWT.

### Dashboard

Authenticated parent can access:

GET /me

Returns:

- id
- email
- createdAt

---

## Non Functional

- NestJS
- Prisma
- JWT
- bcrypt
- Validation
- REST API

---

## Out of Scope

- Child
- Subscription
- Atlas
- AI
- Email verification
- Forgot password
