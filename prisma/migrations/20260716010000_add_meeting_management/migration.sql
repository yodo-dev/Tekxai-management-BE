
\restrict lKiFvEBzPcWVyFXNgWqlU0UrcDdVWrbdwmisWulksLqyXhoOFmefvAatWnnV3E2

SELECT pg_catalog.set_config('search_path', '', false);

CREATE TABLE public.meeting_action_items (
    id text NOT NULL,
    meeting_id text NOT NULL,
    title text NOT NULL,
    assignee_id text NOT NULL,
    due_date timestamp(3) without time zone,
    priority text DEFAULT 'MEDIUM'::text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    notes text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);

CREATE TABLE public.meeting_agenda_items (
    id text NOT NULL,
    room_id text NOT NULL,
    meeting_id text,
    title text NOT NULL,
    description text,
    status text DEFAULT 'PENDING'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);

CREATE TABLE public.meeting_attachments (
    id text NOT NULL,
    attachable_type text NOT NULL,
    attachable_id text NOT NULL,
    file_url text NOT NULL,
    file_name text NOT NULL,
    uploaded_by text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.meeting_decisions (
    id text NOT NULL,
    meeting_id text NOT NULL,
    decision_text text NOT NULL,
    decided_by text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.meeting_notes (
    id text NOT NULL,
    meeting_id text NOT NULL,
    author_id text NOT NULL,
    content text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);

CREATE TABLE public.meeting_participants (
    id text NOT NULL,
    meeting_id text NOT NULL,
    user_id text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.meeting_room_members (
    id text NOT NULL,
    room_id text NOT NULL,
    user_id text NOT NULL,
    role text DEFAULT 'MEMBER'::text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.meeting_rooms (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    owner_id text NOT NULL,
    department_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);

CREATE TABLE public.meetings (
    id text NOT NULL,
    room_id text NOT NULL,
    title text NOT NULL,
    scheduled_at timestamp(3) without time zone NOT NULL,
    organizer_id text NOT NULL,
    status text DEFAULT 'SCHEDULED'::text NOT NULL,
    closed_at timestamp(3) without time zone,
    previous_meeting_id text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    deleted_at timestamp(3) without time zone
);

ALTER TABLE ONLY public.meeting_action_items
    ADD CONSTRAINT meeting_action_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.meeting_agenda_items
    ADD CONSTRAINT meeting_agenda_items_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.meeting_attachments
    ADD CONSTRAINT meeting_attachments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.meeting_decisions
    ADD CONSTRAINT meeting_decisions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.meeting_notes
    ADD CONSTRAINT meeting_notes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.meeting_participants
    ADD CONSTRAINT meeting_participants_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.meeting_room_members
    ADD CONSTRAINT meeting_room_members_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.meeting_rooms
    ADD CONSTRAINT meeting_rooms_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_pkey PRIMARY KEY (id);

CREATE INDEX meeting_action_items_assignee_id_idx ON public.meeting_action_items USING btree (assignee_id);

CREATE INDEX meeting_action_items_due_date_idx ON public.meeting_action_items USING btree (due_date);

CREATE INDEX meeting_action_items_meeting_id_idx ON public.meeting_action_items USING btree (meeting_id);

CREATE INDEX meeting_action_items_status_idx ON public.meeting_action_items USING btree (status);

CREATE INDEX meeting_agenda_items_meeting_id_idx ON public.meeting_agenda_items USING btree (meeting_id);

CREATE INDEX meeting_agenda_items_room_id_idx ON public.meeting_agenda_items USING btree (room_id);

CREATE INDEX meeting_agenda_items_status_idx ON public.meeting_agenda_items USING btree (status);

CREATE INDEX meeting_attachments_attachable_type_attachable_id_idx ON public.meeting_attachments USING btree (attachable_type, attachable_id);

CREATE INDEX meeting_attachments_uploaded_by_idx ON public.meeting_attachments USING btree (uploaded_by);

CREATE INDEX meeting_decisions_meeting_id_idx ON public.meeting_decisions USING btree (meeting_id);

CREATE INDEX meeting_notes_meeting_id_idx ON public.meeting_notes USING btree (meeting_id);

CREATE UNIQUE INDEX meeting_participants_meeting_id_user_id_key ON public.meeting_participants USING btree (meeting_id, user_id);

CREATE INDEX meeting_participants_user_id_idx ON public.meeting_participants USING btree (user_id);

CREATE UNIQUE INDEX meeting_room_members_room_id_user_id_key ON public.meeting_room_members USING btree (room_id, user_id);

CREATE INDEX meeting_room_members_user_id_idx ON public.meeting_room_members USING btree (user_id);

CREATE INDEX meeting_rooms_department_id_idx ON public.meeting_rooms USING btree (department_id);

CREATE INDEX meeting_rooms_owner_id_idx ON public.meeting_rooms USING btree (owner_id);

CREATE INDEX meeting_rooms_status_idx ON public.meeting_rooms USING btree (status);

CREATE INDEX meetings_organizer_id_idx ON public.meetings USING btree (organizer_id);

CREATE INDEX meetings_previous_meeting_id_idx ON public.meetings USING btree (previous_meeting_id);

CREATE INDEX meetings_room_id_idx ON public.meetings USING btree (room_id);

CREATE INDEX meetings_scheduled_at_idx ON public.meetings USING btree (scheduled_at);

CREATE INDEX meetings_status_idx ON public.meetings USING btree (status);

ALTER TABLE ONLY public.meeting_action_items
    ADD CONSTRAINT meeting_action_items_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public.meeting_action_items
    ADD CONSTRAINT meeting_action_items_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.meeting_agenda_items
    ADD CONSTRAINT meeting_agenda_items_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.meeting_agenda_items
    ADD CONSTRAINT meeting_agenda_items_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.meeting_rooms(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.meeting_attachments
    ADD CONSTRAINT meeting_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public.meeting_decisions
    ADD CONSTRAINT meeting_decisions_decided_by_fkey FOREIGN KEY (decided_by) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public.meeting_decisions
    ADD CONSTRAINT meeting_decisions_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.meeting_notes
    ADD CONSTRAINT meeting_notes_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public.meeting_notes
    ADD CONSTRAINT meeting_notes_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.meeting_participants
    ADD CONSTRAINT meeting_participants_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.meetings(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.meeting_participants
    ADD CONSTRAINT meeting_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.meeting_room_members
    ADD CONSTRAINT meeting_room_members_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.meeting_rooms(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.meeting_room_members
    ADD CONSTRAINT meeting_room_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.meeting_rooms
    ADD CONSTRAINT meeting_rooms_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.meeting_rooms
    ADD CONSTRAINT meeting_rooms_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_previous_meeting_id_fkey FOREIGN KEY (previous_meeting_id) REFERENCES public.meetings(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.meetings
    ADD CONSTRAINT meetings_room_id_fkey FOREIGN KEY (room_id) REFERENCES public.meeting_rooms(id) ON UPDATE CASCADE ON DELETE CASCADE;

\unrestrict lKiFvEBzPcWVyFXNgWqlU0UrcDdVWrbdwmisWulksLqyXhoOFmefvAatWnnV3E2
