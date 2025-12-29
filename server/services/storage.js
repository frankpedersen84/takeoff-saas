const { supabase, isSupabaseConfigured } = require('../utils/supabase');
const logger = require('../utils/logger');

// Local in-memory fallback
const localProjects = new Map();

/**
 * Storage Service
 * Abstraction layer handling data persistence.
 * Switches between In-Memory (Dev) and Supabase (Prod) automatically.
 */
const StorageService = {

    // ==========================================================================
    // PROJECTS
    // ==========================================================================

    async getAllProjects(userId = null) {
        if (isSupabaseConfigured()) {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .order('updated_at', { ascending: false });

            if (error) throw error;
            return data;
        } else {
            // Return local array
            return Array.from(localProjects.values())
                .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        }
    },

    async getProject(id) {
        if (isSupabaseConfigured()) {
            // Get project
            const { data: project, error } = await supabase
                .from('projects')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            if (!project) return null;

            // Get related data (files, outputs)
            const { data: documents } = await supabase.from('documents').select('*').eq('project_id', id);
            const { data: outputs } = await supabase.from('project_outputs').select('*').eq('project_id', id);

            // reconstruct the shape the frontend expects
            return {
                ...project,
                documents: documents || [],
                outputs: outputs || [],
                // Parse JSON fields if they are stored as strings in DB, 
                // though Supabase returns JSONB as objects automatically.
                systems: safeParse(project.systems, []),
                analysis: safeParse(project.analysis, null)
            };

        } else {
            return localProjects.get(id);
        }
    },

    // ... (rest of file)

    // Helper (add this to the object or top level)
    // Actually simpler to just inline or add helper function outside

    return localProjects.get(id);
}
    },

    async createProject(projectData) {
    if (isSupabaseConfigured()) {
        const { data, error } = await supabase
            .from('projects')
            .insert([{
                id: projectData.id,
                // user_id: '...', // We need to handle auth context eventually
                name: projectData.name,
                customer: projectData.customer,
                address: projectData.address,
                city: projectData.city,
                created_at: projectData.createdAt,
                updated_at: projectData.updatedAt,
                status: projectData.status,
                systems: projectData.systems // Supabase handles array->jsonb
            }])
            .select()
            .single();

        if (error) throw error;
        return data;
    } else {
        // Clone to ensure safety
        const safeProject = { ...projectData };
        localProjects.set(safeProject.id, safeProject);
        return safeProject;
    }
},

    async updateProject(id, updates) {
    if (isSupabaseConfigured()) {
        // Separate top-level fields from relations
        const { documents, outputs, estimates, ...fields } = updates;

        const { data, error } = await supabase
            .from('projects')
            .update({
                ...fields,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    } else {
        const existing = localProjects.get(id);
        if (!existing) return null;

        const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
        localProjects.set(id, updated);
        return updated;
    }
},

    async deleteProject(id) {
    if (isSupabaseConfigured()) {
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    } else {
        return localProjects.delete(id);
    }
},

    // ==========================================================================
    // DOCUMENTS
    // ==========================================================================

    async addDocuments(projectId, newDocs) {
    if (isSupabaseConfigured()) {
        const dbDocs = newDocs.map(doc => ({
            project_id: projectId,
            filename: doc.filename,
            storage_path: doc.path, // Assuming we saved to R2/Storage earlier
            file_type: doc.mimetype,
            size_bytes: doc.size,
            vision_data: doc.visionData
        }));

        const { data, error } = await supabase
            .from('documents')
            .insert(dbDocs)
            .select();

        if (error) throw error;
        return data;
    } else {
        const project = localProjects.get(projectId);
        if (!project) throw new Error('Project not found');

        project.documents = [...(project.documents || []), ...newDocs];
        project.updatedAt = new Date().toISOString();
        localProjects.set(projectId, project);
        return project;
    }
}
};

module.exports = StorageService;

function safeParse(val, fallback) {
    if (typeof val !== 'string') return val;
    try {
        return JSON.parse(val || String(fallback));
    } catch (e) {
        return val; // Return original string if parse fails (e.g. Markdown)
    }
}
