# Portal Roadmap

This document captures the recommended next phase after the current portal workspace is in place.

## Goal

Move from a single shared research portal into a production-ready system with:

- controlled user registration
- project or study level access
- environment-aware deployment
- traceable data ownership and permissions

## Recommended implementation order

## Phase 1: Project and membership model

Do this before full registration. It becomes the permission foundation for everything else.

### Add a project entity

Recommended fields:

- `id`
- `name`
- `code`
- `description`
- `status`
- `created_at`
- `updated_at`

### Attach data to projects

Recommended ownership chain:

- `project`
- `subject.project_id`
- `session.project_id`
- `experiment_plan.project_id`
- `session_file.project_id`
- `audit_log.project_id` where applicable

This makes it possible to scope all lists and detail views by project instead of only by global role.

### Add membership and project roles

Recommended tables:

- `project_membership`
- optional `project_invitation`

Recommended project-level roles:

- `project_admin`
- `researcher`
- `uploader`
- `viewer`

This is more flexible than using only one global role per user.

## Phase 2: Authorization rules

Once projects exist, lock access rules down in the backend first.

### Recommended visibility model

- `admin`
  Can see all users, projects, sessions, files, records, and audit logs.
- `project_admin`
  Can manage membership and all project data within assigned projects.
- `researcher`
  Can read and edit research data inside assigned projects.
- `uploader`
  Can upload or update assets inside assigned projects, but should not automatically see all portal data.
- `viewer`
  Read-only access where needed.

### Important implementation note

Frontend hiding is not enough.

The FastAPI backend should enforce:

- list filtering
- detail access checks
- upload permission checks
- update and delete permission checks

The frontend should then mirror that model by hiding navigation and actions that are not relevant to the current user.

## Phase 3: Registration and identity lifecycle

For a research portal, invite-based registration is usually safer than open public signup.

### Recommended approach

- admin creates a user or sends an invitation
- invited user completes initial password setup
- password reset is supported
- optional email verification if email delivery is available

### Recommended auth endpoints

- `POST /auth/invitations`
- `POST /auth/register`
- `POST /auth/accept-invitation`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /users`
- `POST /users`
- `PUT /users/:id`
- `PUT /users/:id/status`

### User fields to support

- `id`
- `username`
- `email`
- `display_name`
- `global_role`
- `status`
- `is_active`
- `last_login_at`

## Phase 4: Deployment and environments

After the access model is defined, make deployment predictable.

### Environments

Recommended environments:

- local
- staging
- production

### Frontend configuration

- `VITE_API_BASE`
- environment-specific origin and CORS pairing

### Backend and infrastructure

Recommended production pieces:

- FastAPI behind a reverse proxy
- HTTPS
- Postgres
- Alembic migrations
- object storage for uploaded files
- background jobs for processing if needed
- backups and restore plan
- structured logging

### File storage direction

Current model:

- `Session Files` for managed assets
- `External Records` for URL/path references

Next storage step:

- drag-and-drop upload to server storage
- backend returns canonical download URL
- that URL becomes the stable storage reference shown in the portal

## Phase 5: Data governance and auditability

As more people get access, audit quality matters more.

Recommended additions:

- user activity log for login and access-sensitive actions
- project membership change audit trail
- file upload, delete, and metadata change audit trail
- export log for sensitive datasets

## Suggested frontend follow-up

After backend rules are defined, update the frontend in this order:

1. Add project switcher and project-aware navigation.
2. Add role-aware sidebar and route entry visibility.
3. Add registration or invitation screens.
4. Add admin user management screens.
5. Add project membership management UI.
6. Add deployment environment notes to README and ops docs.

## Suggested FastAPI follow-up

Recommended backend work order:

1. add `project` and `project_membership`
2. attach project ownership to existing tables
3. enforce permission filtering in list and detail endpoints
4. add invitation or registration lifecycle
5. add storage-backed upload URLs
6. add stronger audit trails

## Summary

The most important next architectural step is not deployment by itself and not public registration by itself.

The most important next step is:

- define `project`
- define `membership`
- define backend authorization

Once that exists, registration, deployment, and multi-person data access all become much easier to implement cleanly.
