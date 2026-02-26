import { Router } from "express";
import { 
  createAutonomousTask,
  getAutonomousTaskById,
  getAutonomousTasksByUserId,
  updateAutonomousTask,
  deleteAutonomousTask
} from "../db/autonomous-helpers";

const router = Router();

// POST /autonomous/tasks - Create a new autonomous task
router.post("/tasks", async (req, res) => {
  try {
    const { userId, title, description, objective, priority, tags } = req.body;
    
    // Validate required fields
    if (!userId || !title || !objective) {
      return res.status(400).json({
        error: "Missing required fields: userId, title, objective"
      });
    }

    const task = await createAutonomousTask({
      userId,
      title,
      description: description || null,
      objective,
      priority: priority || "medium",
      tags: tags || []
    });

    res.status(201).json(task);
  } catch (error) {
    console.error("Error creating autonomous task:", error);
    res.status(500).json({ error: "Failed to create autonomous task" });
  }
});

// GET /autonomous/tasks/:id - Get a specific task
router.get("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const task = await getAutonomousTaskById(parseInt(id));
    
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    res.json(task);
  } catch (error) {
    console.error("Error fetching task:", error);
    res.status(500).json({ error: "Failed to fetch task" });
  }
});

// GET /autonomous/tasks/user/:userId - Get tasks for a user
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const tasks = await getAutonomousTasksByUserId(userId);
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching user tasks:", error);
    res.status(500).json({ error: "Failed to fetch user tasks" });
  }
});

// PUT /autonomous/tasks/:id - Update a task
router.put("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const updated = await updateAutonomousTask(parseInt(id), updates);
    
    if (!updated) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    res.json(updated);
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({ error: "Failed to update task" });
  }
});

// DELETE /autonomous/tasks/:id - Delete a task
router.delete("/tasks/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const success = await deleteAutonomousTask(parseInt(id));
    
    if (!success) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

export default router;