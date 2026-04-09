import { supabase } from './supabase';
import { logError } from '@/lib/error-handler';

/**
 * Initialize the checklists and sprints system
 * This creates all necessary tables, indexes, and RLS policies
 * This function is idempotent - safe to call multiple times
 */
export async function initializeChecklistsSystem() {
  try {
    // Try to call the database function first
    const { data, error } = await supabase.rpc('initialize_checklists_system');

    // If function doesn't exist, create tables directly
    if (error && (error.code === 'PGRST202' || error.code === '42883')) {
      console.log('RPC function not found, creating tables directly...');
      return await createTablesDirectly();
    }

    if (error) {
      logError('Error calling initialize_checklists_system function:', error, { component: 'initializeChecklists' });
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    logError('Error initializing checklists system:', error, { component: 'initializeChecklists' });
    return { success: false, error };
  }
}

/**
 * Fallback: Create tables directly using SQL queries
 * Used when the RPC function doesn't exist
 */
async function createTablesDirectly() {
  try {
    // Check if tables already exist
    const { data: existingTables } = await supabase
      .from('checklists')
      .select('id')
      .limit(1);
    
    // If we can query checklists, tables already exist
    if (existingTables !== null) {
      return { success: true, message: 'Tables already exist' };
    }
  } catch (error: any) {
    // Tables don't exist, continue with creation
    console.log('Tables do not exist, will create them');
  }

  // SQL to create all tables
  const createTablesSQL = `
    -- Create checklists table
    CREATE TABLE IF NOT EXISTS checklists (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      is_template BOOLEAN DEFAULT false,
      circle_ids UUID[] DEFAULT '{}',
      table_ids UUID[] DEFAULT '{}',
      build_ids UUID[] DEFAULT '{}',
      elevator_ids UUID[] DEFAULT '{}',
      standup_ids UUID[] DEFAULT '{}',
      meetup_ids UUID[] DEFAULT '{}',
      tags TEXT[] DEFAULT '{}',
      access_level TEXT DEFAULT 'public',
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Create checklist_items table
    CREATE TABLE IF NOT EXISTS checklist_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      is_complete BOOLEAN DEFAULT false,
      assignment TEXT,
      notes TEXT,
      priority INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Create sprints table
    CREATE TABLE IF NOT EXISTS sprints (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      description TEXT,
      slug TEXT NOT NULL UNIQUE,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      visibility TEXT NOT NULL DEFAULT 'public',
      cover_image TEXT,
      tags TEXT[] DEFAULT '{}',
      created_by UUID REFERENCES users(id) ON DELETE SET NULL,
      admin_ids TEXT[] DEFAULT '{}',
      member_ids TEXT[] DEFAULT '{}',
      sponsor_ids TEXT[] DEFAULT '{}',
      settings JSONB DEFAULT '{"access_level": "public"}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Create sprint_checklists junction table
    CREATE TABLE IF NOT EXISTS sprint_checklists (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
      checklist_id UUID NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,
      added_by UUID REFERENCES users(id) ON DELETE SET NULL,
      notes TEXT,
      added_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(sprint_id, checklist_id)
    );

    -- Create indexes
    CREATE INDEX IF NOT EXISTS idx_checklists_created_by ON checklists(created_by);
    CREATE INDEX IF NOT EXISTS idx_checklists_category ON checklists(category);
    CREATE INDEX IF NOT EXISTS idx_checklists_is_template ON checklists(is_template);
    CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist_id ON checklist_items(checklist_id);
    CREATE INDEX IF NOT EXISTS idx_checklist_items_priority ON checklist_items(priority);
    CREATE INDEX IF NOT EXISTS idx_sprints_slug ON sprints(slug);
    CREATE INDEX IF NOT EXISTS idx_sprints_created_by ON sprints(created_by);
    CREATE INDEX IF NOT EXISTS idx_sprints_dates ON sprints(start_date, end_date);
    CREATE INDEX IF NOT EXISTS idx_sprint_checklists_sprint_id ON sprint_checklists(sprint_id);
    CREATE INDEX IF NOT EXISTS idx_sprint_checklists_checklist_id ON sprint_checklists(checklist_id);

    -- Enable RLS
    ALTER TABLE checklists ENABLE ROW LEVEL SECURITY;
    ALTER TABLE checklist_items ENABLE ROW LEVEL SECURITY;
    ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
    ALTER TABLE sprint_checklists ENABLE ROW LEVEL SECURITY;

    -- RLS Policies for checklists
    CREATE POLICY IF NOT EXISTS "Checklists are viewable by everyone"
      ON checklists FOR SELECT
      USING (true);

    CREATE POLICY IF NOT EXISTS "Authenticated users can create checklists"
      ON checklists FOR INSERT
      TO authenticated
      WITH CHECK (true);

    CREATE POLICY IF NOT EXISTS "Users can update their own checklists"
      ON checklists FOR UPDATE
      TO authenticated
      USING (auth.uid() = created_by);

    CREATE POLICY IF NOT EXISTS "Users can delete their own checklists"
      ON checklists FOR DELETE
      TO authenticated
      USING (auth.uid() = created_by);

    -- RLS Policies for checklist_items
    CREATE POLICY IF NOT EXISTS "Checklist items are viewable by everyone"
      ON checklist_items FOR SELECT
      USING (true);

    CREATE POLICY IF NOT EXISTS "Authenticated users can create checklist items"
      ON checklist_items FOR INSERT
      TO authenticated
      WITH CHECK (true);

    CREATE POLICY IF NOT EXISTS "Authenticated users can update checklist items"
      ON checklist_items FOR UPDATE
      TO authenticated
      USING (true);

    CREATE POLICY IF NOT EXISTS "Authenticated users can delete checklist items"
      ON checklist_items FOR DELETE
      TO authenticated
      USING (true);

    -- RLS Policies for sprints
    CREATE POLICY IF NOT EXISTS "Public sprints are viewable by everyone"
      ON sprints FOR SELECT
      USING (visibility = 'public');

    CREATE POLICY IF NOT EXISTS "Members can view member sprints"
      ON sprints FOR SELECT
      USING (
        visibility = 'members-only' AND
        (auth.uid()::text = ANY(member_ids) OR auth.uid()::text = ANY(admin_ids))
      );

    CREATE POLICY IF NOT EXISTS "Private sprints viewable by members only"
      ON sprints FOR SELECT
      USING (
        visibility = 'private' AND
        (auth.uid()::text = ANY(member_ids) OR auth.uid()::text = ANY(admin_ids))
      );

    CREATE POLICY IF NOT EXISTS "Authenticated users can create sprints"
      ON sprints FOR INSERT
      TO authenticated
      WITH CHECK (true);

    CREATE POLICY IF NOT EXISTS "Sprint admins can update"
      ON sprints FOR UPDATE
      TO authenticated
      USING (auth.uid()::text = ANY(admin_ids) OR auth.uid() = created_by);

    CREATE POLICY IF NOT EXISTS "Sprint admins can delete"
      ON sprints FOR DELETE
      TO authenticated
      USING (auth.uid()::text = ANY(admin_ids) OR auth.uid() = created_by);

    -- RLS Policies for sprint_checklists
    CREATE POLICY IF NOT EXISTS "Sprint checklists viewable by sprint members"
      ON sprint_checklists FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM sprints
        WHERE sprints.id = sprint_checklists.sprint_id
        AND (
          sprints.visibility = 'public' OR
          (sprints.visibility = 'members-only' AND auth.uid()::text = ANY(sprints.member_ids)) OR
          (sprints.visibility = 'private' AND auth.uid()::text = ANY(sprints.member_ids))
        )
      ));

    CREATE POLICY IF NOT EXISTS "Sprint admins can add checklists"
      ON sprint_checklists FOR INSERT
      TO authenticated
      WITH CHECK (EXISTS (
        SELECT 1 FROM sprints
        WHERE sprints.id = sprint_checklists.sprint_id
        AND (auth.uid()::text = ANY(sprints.admin_ids) OR auth.uid() = sprints.created_by)
      ));

    CREATE POLICY IF NOT EXISTS "Sprint admins can remove checklists"
      ON sprint_checklists FOR DELETE
      TO authenticated
      USING (EXISTS (
        SELECT 1 FROM sprints
        WHERE sprints.id = sprint_checklists.sprint_id
        AND (auth.uid()::text = ANY(sprints.admin_ids) OR auth.uid() = sprints.created_by)
      ));
  `;

  try {
    // Execute the SQL - note: this requires admin privileges
    // If this fails, the user needs to run the migration manually
    const { error } = await supabase.rpc('exec_sql', { sql: createTablesSQL });
    
    if (error) {
      logError('Error creating tables:', error, { component: 'initializeChecklists' });
      return {
        success: false,
        error,
        message: 'Unable to create tables. Please contact your system administrator to run the SQL migration manually.'
      };
    }

    return { success: true, message: 'Tables created successfully' };
  } catch (error: any) {
    logError('Error in createTablesDirectly:', error, { component: 'initializeChecklists' });
    return {
      success: false,
      error,
      message: 'Unable to create tables. The database needs to be initialized by a Supabase administrator using the provided migration script.'
    };
  }
}