-- Row Level Security Policies for BuildMate Studio
-- These policies enforce multi-tenant security and proper access controls

-- ===== PROFILES POLICIES =====
-- Profiles are viewable by all authenticated users but only updatable by owner
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ===== ORGANIZATION POLICIES =====
-- Organization members can view their org, owners can update
CREATE POLICY "Users can view their organization" ON organizations
  FOR SELECT USING (
    id IN (
      SELECT organization_id FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "Organization owners can update" ON organizations
  FOR UPDATE USING (
    id IN (
      SELECT organization_id FROM profiles 
      WHERE profiles.id = auth.uid() AND role = 'owner'
    )
  );

-- ===== PROJECT POLICIES =====
-- Project access based on ownership or organization membership
CREATE POLICY "Users can view their own projects" ON projects
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view organization projects" ON projects
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE profiles.id = auth.uid()
    )
  );

CREATE POLICY "Users can view public projects" ON projects
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can insert their own projects" ON projects
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own projects" ON projects
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own projects" ON projects
  FOR DELETE USING (user_id = auth.uid());

-- ===== PROJECT FILES POLICIES =====
-- File access follows project access rules
CREATE POLICY "Users can view files in accessible projects" ON project_files
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE user_id = auth.uid() 
      OR is_public = true
      OR organization_id IN (
        SELECT organization_id FROM profiles 
        WHERE profiles.id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can modify files in their projects" ON project_files
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- ===== AI GENERATIONS POLICIES =====
-- AI generation access follows project access
CREATE POLICY "Users can view AI generations in accessible projects" ON ai_generations
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE user_id = auth.uid() 
      OR is_public = true
      OR organization_id IN (
        SELECT organization_id FROM profiles 
        WHERE profiles.id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create AI generations in their projects" ON ai_generations
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- ===== CHAT MESSAGES POLICIES =====
-- Chat access follows project access
CREATE POLICY "Users can view chat in accessible projects" ON chat_messages
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE user_id = auth.uid() 
      OR organization_id IN (
        SELECT organization_id FROM profiles 
        WHERE profiles.id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can add chat messages to their projects" ON chat_messages
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- ===== OAUTH CONNECTIONS POLICIES =====
-- Users can only access their own OAuth connections
CREATE POLICY "Users can view their own OAuth connections" ON oauth_connections
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own OAuth connections" ON oauth_connections
  FOR ALL USING (user_id = auth.uid());

-- ===== PASSKEYS POLICIES =====
-- Users can only access their own passkeys
CREATE POLICY "Users can view their own passkeys" ON passkeys
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own passkeys" ON passkeys
  FOR ALL USING (user_id = auth.uid());

-- ===== AUDIT LOGS POLICIES =====
-- Audit logs viewable by organization admins and owners
CREATE POLICY "Organization admins can view audit logs" ON audit_logs
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can view their own audit logs" ON audit_logs
  FOR SELECT USING (user_id = auth.uid());

-- ===== SHARED COMPONENTS POLICIES =====
-- Public components viewable by all, private by author only
CREATE POLICY "Anyone can view public components" ON shared_components
  FOR SELECT USING (is_public = true);

CREATE POLICY "Authors can view their own components" ON shared_components
  FOR SELECT USING (author_id = auth.uid());

CREATE POLICY "Authors can manage their own components" ON shared_components
  FOR ALL USING (author_id = auth.uid());

-- ===== COMPONENT USAGES POLICIES =====
-- Component usage tracking follows project access
CREATE POLICY "Users can view component usage in accessible projects" ON component_usages
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE user_id = auth.uid() 
      OR organization_id IN (
        SELECT organization_id FROM profiles 
        WHERE profiles.id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can track component usage in their projects" ON component_usages
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- ===== DESIGN TOKENS POLICIES =====
-- Design tokens follow project access rules
CREATE POLICY "Users can view design tokens in accessible projects" ON design_tokens
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE user_id = auth.uid() 
      OR is_public = true
      OR organization_id IN (
        SELECT organization_id FROM profiles 
        WHERE profiles.id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage design tokens in their projects" ON design_tokens
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

-- ===== GITHUB SYNC EVENTS POLICIES =====
-- GitHub sync events follow project access
CREATE POLICY "Users can view sync events in accessible projects" ON github_sync_events
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects 
      WHERE user_id = auth.uid() 
      OR organization_id IN (
        SELECT organization_id FROM profiles 
        WHERE profiles.id = auth.uid()
      )
    )
  );

-- ===== APP IDENTITIES POLICIES =====
-- Users can only access their own app identities
CREATE POLICY "Users can view their own app identities" ON app_identities
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own app identities" ON app_identities
  FOR ALL USING (user_id = auth.uid());