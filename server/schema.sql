CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE user_role AS ENUM('admin', 'project_manager', 'developer', 'tester');

CREATE TYPE project_status AS ENUM('active', 'archived', 'completed');

CREATE TYPE issue_type AS ENUM('bug', 'task', 'featre');

CREATE TYPE issue_priority AS ENUM('low', 'medium', 'high', 'critical');

CREATE TYPE issue_status AS ENUM('open', 'in_progress', 'resolved', 'closed');

CREATE TYPE notif_type AS ENUM('assigned', 'commented', 'status_changed');

CREATE TYPE action_type AS ENUM('created', 'updated', 'assigned', 'commented', 'status_changed');

CREATE TABLE users(

  user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  hashed_password TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'developer',
  created_at TIMESTAMP DEFAULT NOW()

);

CREATE TABLE projects(

  project_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  status project_status NOT NULL DEFAULT 'active',
  created_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()

);

CREATE TABLE project_members(

  project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  project_role TEXT,
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)

);

CREATE TABLE issues(

  issue_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE,
  reported_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES users(user_id) ON DELETE SET NULL,
  assigned_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  type issue_type NOT NULL default 'task',
  priority issue_priority NOT NULL DEFAULT 'medium',
  status issue_status NOT NULL DEFAULT 'open',
  created_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP

);

CREATE TABLE labels(
  label_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color_hex TEXT
);

CREATE TABLE issue_labels(
  issue_id UUID REFERENCES issues(issue_id) ON DELETE CASCADE,
  label_id UUID REFERENCES labels(label_id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (issue_id, label_id)
);

CREATE TABLE comments(
  comment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id UUID REFERENCES issues(issue_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notifications(
  notif_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  issue_id UUID REFERENCES issues(issue_id) ON DELETE CASCADE,
  triggered_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  message TEXT,
  type notif_type,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE issue_status_history(
  history_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  issue_id UUID REFERENCES issues(issue_id) ON DELETE CASCADE,
  changed_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  old_status issue_status,
  new_status issue_status,
  reason TEXT,
  changed_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE activity_log (
  log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  issue_id UUID REFERENCES issues(issue_id) ON DELETE SET NULL,
  action_performed action_type,
  details TEXT,
  performed_at TIMESTAMP DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_last_updated
BEFORE UPDATE ON issues
FOR EACH ROW
EXECUTE FUNCTION update_last_updated();



CREATE FUNCTION set_resolved_at()
RETURNS TRIGGER AS $$
BEGIN

  IF NEW.status = 'resolved' AND OLD.status != 'resolved' THEN
      NEW.resolved_at = NOW();
  END IF;

  IF NEW.status != 'resolved' AND OLD.status = 'resolved' THEN
      NEW.resolved_at = NULL;
  END IF;

  RETURN NEW;

END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER set_resolved_at
BEFORE UPDATE ON issues
FOR EACH ROW
EXECUTE FUNCTION set_resolved_at();



CREATE FUNCTION act_log_issue_created()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_log(project_id, user_id, issue_id, action_performed, details) 
  VALUES(NEW.project_id, NEW.reported_by, NEW.issue_id, 'created', 'Issue created: ' || NEW.title);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
 
CREATE TRIGGER act_log_issue_created
AFTER INSERT ON issues
FOR EACH ROW
EXECUTE FUNCTION act_log_issue_created();




CREATE FUNCTION log_issue_updated()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO activity_log(project_id, user_id, issue_id, action_performed, details) 
  VALUES(NEW.project_id, NEW.assigned_by, NEW.issue_id, 'updated', 'Issue updated: ' || NEW.title);
  RETURN NEW;

END;
$$ LANGUAGE plpgsql;
 
CREATE TRIGGER log_issue_updated
AFTER UPDATE ON issues
FOR EACH ROW
EXECUTE FUNCTION log_issue_updated();



CREATE FUNCTION log_issue_assigned()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    INSERT INTO activity_log(project_id, user_id, issue_id, action_performed, details) 
    VALUES(NEW.project_id, NEW.assigned_by, NEW.issue_id, 'assigned', 'Issue assigned to user');
 
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
 
CREATE TRIGGER log_issue_assigned
AFTER UPDATE ON issues
FOR EACH ROW
EXECUTE FUNCTION log_issue_assigned();



CREATE FUNCTION log_comment_created()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id UUID;
BEGIN
  SELECT project_id INTO v_project_id
  FROM issues
  WHERE issue_id = NEW.issue_id;
 
  INSERT INTO activity_log(project_id, user_id, issue_id, action_performed, details) 
  VALUES(v_project_id, NEW.user_id, NEW.issue_id, 'commented', 'Comment added on issue');
 
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
 
CREATE TRIGGER log_comment_created
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION log_comment_created();



