const express = require('express');
const router = express.Router();
const Project = require('../models/Project');


// get post put delete


// GET tous les projets
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find().sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET un projet par ID
router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Projet non trouvé' });
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST créer un nouveau projet
router.post('/', async (req, res) => {
  try {
    const project = new Project(req.body);
    await project.save();
    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// PUT modifier un projet
router.put('/:id', async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!project) return res.status(404).json({ error: 'Projet non trouvé' });
    res.json(project);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// DELETE supprimer un projet
router.delete('/:id', async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ error: 'Projet non trouvé' });
    res.json({ message: 'Projet supprimé avec succès' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;